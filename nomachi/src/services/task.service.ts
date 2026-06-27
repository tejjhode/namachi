import { createClient } from "@/lib/supabase/client";
import { notificationService } from "./notification.service";
import { bookingService } from "./booking.service";
import { travelerService } from "./traveler.service";

const supabase = createClient();

export type TaskSubtask = {
  title: string;
  completed: boolean;
};

export type DBTask = {
  id: string;
  title: string;
  description?: string | null;
  related_to?: string | null;
  related_id?: string | null;
  source_kind: string;
  source_id?: string | null;
  type: string;
  priority: string;
  due_date?: string | null;
  status: string;
  assigned_to?: string | null;
  created_by?: string | null;
  details?: string | null;
  subtasks: TaskSubtask[];
  step?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AutoTaskConfig = {
  title: string;
  description: string;
  type: string;
  priority: string;
  dueDaysFromNow: number;
  subtasks: string[];
  step: number;
};

export function getLeadAssignmentTasks(
  leadName: string,
  tripName: string,
  leadStatus: string
): AutoTaskConfig[] {
  return [
    {
      title: `Contact Traveller`,
      description: `Reach out to ${leadName} to introduce Nomichi and understand their travel requirements for ${tripName || "their enquiry"}.`,
      type: "communication",
      priority: "High",
      dueDaysFromNow: 0,
      subtasks: [
        `Call ${leadName}`,
        "Introduce yourself and Nomichi",
        "Understand travel requirements",
        "Update lead notes",
      ],
      step: 1,
    },
  ];
}

export const taskService = {
  /**
   * Sequential 7-step workflow engine.
   *
   * Step 1: Contact Traveller          → auto-created on assignment
   * Step 2: Schedule Vibe Check        → after Step 1
   * Step 3: Conduct Vibe Check         → after Step 2 (replaces brochure — meeting happens first)
   * Step 4: Share Brochure             → after Step 3 (qualified) — curated itinerary post-discussion
   * Step 5: Payment Follow-up          → after Step 4
   * Step 6: Collect Documents          → after Step 5 (paid)
   * Step 7: Confirm Booking            → after Step 6
   *
   * Internal status flow:
   *   new → contacted → negotiating (vibe done) → qualified (itinerary shared) → converted → confirmed
   *
   * User-visible stages:
   *   Enquiry Submitted → Trip Expert Assigned → Vibe Check Completed → Itinerary Shared → Booking Confirmed
   */
  async evaluateLeadWorkflow(leadId: string, options?: { meetingDate?: string }): Promise<void> {
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) return;

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("source_kind", "lead")
      .eq("source_id", leadId);

    const existingTasks: DBTask[] = tasks || [];
    const getTaskByStep = (step: number) => existingTasks.find((t) => t.step === step);
    const isStepComplete = (step: number) => {
      const t = getTaskByStep(step);
      return t !== undefined && t.status === "completed";
    };
    const doesStepExist = (step: number) => getTaskByStep(step) !== undefined;

    const createWorkflowTask = async (
      step: number,
      title: string,
      description: string,
      type: string,
      priority: string,
      dueDaysFromNow: number,
      subtasks: string[],
      customDueDate?: string
    ) => {
      if (doesStepExist(step)) return;
      let dueDateStr = customDueDate;
      if (!dueDateStr) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dueDaysFromNow);
        dueDateStr = dueDate.toISOString();
      }
      await supabase.from("tasks").insert([{
        title, description,
        related_to: lead.name,
        related_id: lead.enquiry_id || `LEAD-${lead.id.slice(0, 6).toUpperCase()}`,
        source_kind: "lead", source_id: lead.id,
        type, priority, due_date: dueDateStr,
        status: "to do",
        assigned_to: lead.assigned_to,
        created_by: lead.assigned_to,
        details: description,
        subtasks: subtasks.map((st) => ({ title: st, completed: false })),
        step,
      }]);
    };

    const leadStatus = (lead.status || "new").toLowerCase();

    // ── Step 1: Contact Traveller — created on assignment ──
    await createWorkflowTask(1,
      "Contact Traveller",
      `Call ${lead.name} to introduce Nomichi and understand their travel requirements.`,
      "communication", "High", 0,
      ["Call traveler", "Introduce yourself and Nomichi", "Understand requirements and preferences", "Update lead notes"]
    );

    // ── Step 2: Schedule Vibe Check — after Step 1 ──
    if (isStepComplete(1)) {
      await createWorkflowTask(2,
        "Schedule Vibe Check",
        `Coordinate and schedule the Vibe Check consultation call with ${lead.name}.`,
        "vibe check", "High", 1,
        ["Propose time slots", "Confirm meeting date/time", "Send calendar invite and meeting link", "Send WhatsApp reminder"]
      );
    }

    // ── Step 3: Conduct Vibe Check — after Step 2 ──
    if (isStepComplete(2)) {
      let meetingDateStr = options?.meetingDate;
      if (!meetingDateStr) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(16, 0, 0, 0);
        meetingDateStr = tomorrow.toISOString();
      }
      await createWorkflowTask(3,
        "Conduct Vibe Check",
        `Conduct the scheduled Vibe Check call with ${lead.name} to assess travel fit.`,
        "vibe check", "High", 1,
        ["Discuss trip requirements and budget", "Assess fit for the group trip", "Answer all traveler questions", "Log qualification outcome"],
        meetingDateStr
      );
    }

    // ── Step 4: Share Brochure — after Step 3 (qualified) ──
    // Only created if vibe check was qualified (status = negotiating)
    if (isStepComplete(3) && ["negotiating", "qualified", "converted", "confirmed"].includes(leadStatus)) {
      await createWorkflowTask(4,
        "Share Brochure",
        `Share the curated trip brochure, itinerary PDF, and pricing with ${lead.name} following the Vibe Check.`,
        "follow-up", "Medium", 0,
        ["Select relevant brochure and itinerary PDFs", "Upload and send via email and WhatsApp", "Log activity in system"]
      );
    }

    // ── Step 5: Payment Follow-up — after Step 4 ──
    if (isStepComplete(4) && ["negotiating", "qualified", "converted", "confirmed"].includes(leadStatus)) {
      await createWorkflowTask(5,
        "Payment Follow-up",
        `Follow up with ${lead.name} on payment. Share payment link and confirm deposit received.`,
        "payment", "High", 1,
        ["Share payment schedule and terms", "Send secure payment link", "Confirm payment receipt", "Update booking status"]
      );
    }

    // ── Step 6: Confirm Booking — after Step 5 (paid) ──
    if (isStepComplete(5) && ["converted", "confirmed"].includes(leadStatus)) {
      await createWorkflowTask(6,
        "Confirm Booking",
        `All tasks complete. Confirm the booking for ${lead.name} to finalize their trip registration.`,
        "booking", "High", 0,
        ["Verify all tasks completed", "Confirm payment received", "Click Confirm Booking to finalize"]
      );
    }
  },

  async createTasksForLeadAssignment(params: {
    leadId: string; leadName: string; leadStatus: string;
    tripName: string; enquiryId?: string | null;
    assignedTo: string; createdBy: string;
  }): Promise<DBTask[]> {
    await this.evaluateLeadWorkflow(params.leadId);
    return this.getTasks();
  },

  async getTasks(assigneeId?: string): Promise<DBTask[]> {
    let query = supabase.from("tasks").select("*");
    if (assigneeId) query = query.eq("assigned_to", assigneeId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as DBTask[];
  },

  async createTask(task: Omit<DBTask, "id" | "created_at" | "updated_at">): Promise<DBTask> {
    const { data, error } = await supabase.from("tasks").insert([task]).select().single();
    if (error) throw error;
    try {
      if (data?.assigned_to) {
        await notificationService.notifyManager(
          data.assigned_to, "Follow-up Due", `Follow-up due: ${data.title}`,
          "Follow-up Due", data.id, data.priority === "High" ? "High" : "Medium"
        );
      }
    } catch (err) { console.error("Failed to notify manager:", err); }
    return data as DBTask;
  },

  async updateTaskStatus(
    id: string,
    status: string,
    options?: {
      meetingDate?: string; meetingLink?: string; meetingType?: string;
      callResult?: string; vibeResult?: string; vibeNotes?: string;
      paymentStatus?: string; refId?: string; receiptAmt?: string;
      idDocRef?: string; departureId?: string;
      brochureMsg?: string;
    }
  ): Promise<DBTask> {
    const { data, error } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    const task = data as DBTask;

    try {
      if (task.source_kind === "lead" && task.source_id) {
        if (status === "completed") {

          // ── Step 1: Contact Traveller ──
          if (task.step === 1) {
            await supabase.from("leads").update({ status: "contacted" }).eq("id", task.source_id);
            if (options?.callResult) {
              await supabase.from("lead_notes").insert({
                lead_id: task.source_id,
                content: `Contact Traveller: Call result — ${options.callResult}`,
                created_by: task.assigned_to
              });
            }
          }

          // ── Step 2: Schedule Vibe Check ──
          else if (task.step === 2) {
            // No status change — send scheduling email and WhatsApp info
            try {
              const { data: leadData } = await supabase
                .from("leads")
                .select("name, email, trip_id")
                .eq("id", task.source_id)
                .single();

              if (leadData) {
                let tripTitle = "your trip";
                if (leadData.trip_id) {
                  const { data: tripData } = await supabase.from("trips").select("title").eq("id", leadData.trip_id).single();
                  if (tripData?.title) tripTitle = tripData.title;
                }
                const meetingDateRaw = options?.meetingDate || new Date().toISOString();
                const formattedTime = new Date(meetingDateRaw).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                });
                const meetingLink = options?.meetingLink ? `\nMeeting Link: ${options.meetingLink}` : "";
                const meetingType = options?.meetingType || "Video Call";
                const emailBody = `Hi ${leadData.name},\n\nYour Vibe Check call for "${tripTitle}" has been scheduled!\n\nDate & Time: ${formattedTime}\nMeeting Type: ${meetingType}${meetingLink}\n\nWe will share your personalised trip brochure and itinerary shortly before our call. Looking forward to speaking with you!`;

                await notificationService.notifyTraveler(
                  leadData.email, "Vibe Check Scheduled", emailBody,
                  "Scheduled Call", task.source_id, "High"
                );
                await supabase.from("lead_notes").insert({
                  lead_id: task.source_id,
                  content: `Schedule Vibe Check: Scheduled on ${formattedTime}${options?.meetingLink ? ` — Link: ${options.meetingLink}` : ""}`,
                  created_by: task.assigned_to
                });
              }
            } catch (err) {
              console.error("Failed to send vibe check scheduling email:", err);
            }
          }

          // ── Step 3: Conduct Vibe Check ──
          else if (task.step === 3) {
            const vibeResult = options?.vibeResult || "qualified";

            if (vibeResult === "qualified") {
              // Status: negotiating = "Vibe Check Done" — user sees "Vibe Check Completed"
              await supabase.from("leads").update({ status: "negotiating" }).eq("id", task.source_id);

              await supabase.from("lead_notes").insert({
                lead_id: task.source_id,
                content: `Vibe Check Completed: Result — Qualified${options?.vibeNotes ? `\nNotes: ${options.vibeNotes}` : ""}`,
                created_by: task.assigned_to
              });

              try {
                const { data: leadData } = await supabase.from("leads").select("name, email, trip_id").eq("id", task.source_id).single();
                if (leadData) {
                  let tripTitle = "your selected trip";
                  if (leadData.trip_id) {
                    const { data: tripData } = await supabase.from("trips").select("title").eq("id", leadData.trip_id).single();
                    if (tripData?.title) tripTitle = tripData.title;
                  }
                  await notificationService.notifyTraveler(
                    leadData.email, "Great News!",
                    `Hi ${leadData.name},\n\nThank you for the wonderful conversation! Based on our Vibe Check, we believe you are a fantastic fit for "${tripTitle}".\n\nWe will share your personalised itinerary and brochure shortly. Stay excited! 🎒`,
                    "Vibe Check Completed", task.source_id, "High"
                  );
                }
              } catch (err) {
                console.error("Failed to send qualified email:", err);
              }

            } else if (vibeResult === "not_qualified") {
              await supabase.from("leads").update({ status: "lost" }).eq("id", task.source_id);
              await supabase.from("lead_notes").insert({
                lead_id: task.source_id,
                content: `Vibe Check Completed: Result — Not Qualified${options?.vibeNotes ? `\nNotes: ${options.vibeNotes}` : ""}`,
                created_by: task.assigned_to
              });
              try {
                const { data: leadData } = await supabase.from("leads").select("name, email, trip_id").eq("id", task.source_id).single();
                if (leadData) {
                  let tripTitle = "this trip";
                  if (leadData.trip_id) {
                    const { data: tripData } = await supabase.from("trips").select("title").eq("id", leadData.trip_id).single();
                    if (tripData?.title) tripTitle = tripData.title;
                  }
                  await notificationService.notifyTraveler(
                    leadData.email, "Thank You for Your Interest",
                    `Dear ${leadData.name},\n\nThank you for your interest in "${tripTitle}". After our consultation, we feel this particular trip may not be the perfect fit at this time.\n\nWe will keep your preferences on file and reach out when a better-matched trip becomes available.\n\nWarm regards,\nTeam Nomichi`,
                    "Not a Fit", task.source_id, "Medium"
                  );
                }
              } catch (err) {
                console.error("Failed to send not qualified email:", err);
              }
              // Workflow ends for not_qualified
              return data as DBTask;
            }
          }

          // ── Step 4: Share Brochure ──
          // Status: qualified = "Itinerary Shared" — user sees "Itinerary Shared"
          else if (task.step === 4) {
            await supabase.from("leads").update({ status: "qualified" }).eq("id", task.source_id);
            await supabase.from("lead_notes").insert({
              lead_id: task.source_id,
              content: `Share Brochure: Trip brochure and itinerary shared with traveler via email and WhatsApp.`,
              created_by: task.assigned_to
            });

            // Create booking and traveler records immediately so traveler can view/pay balance
            try {
              const { data: leadData } = await supabase.from("leads")
                .select("name, email, assigned_to, user_id, trip_id, phone")
                .eq("id", task.source_id).single();

              if (leadData) {
                let price = 0;
                let departureId: string | null = null;
                if (leadData.trip_id) {
                  const { data: trip } = await supabase.from("trips").select("price").eq("id", leadData.trip_id).single();
                  if (trip?.price) price = Number(trip.price);
                  const { data: departures } = await supabase.from("trip_departures").select("id, price, status").eq("trip_id", leadData.trip_id);
                  if (departures?.length) {
                    const activeDep = departures.find((d: any) => {
                      try { return typeof d.status === "string" && d.status.startsWith("{") ? JSON.parse(d.status).status === "active" : d.status === "active"; } catch { return false; }
                    });
                    const targetDep = activeDep || departures[0];
                    if (targetDep) { departureId = targetDep.id; if (targetDep.price) price = Number(targetDep.price); }
                  }
                }
                const booking = await bookingService.createBooking({
                  lead_id: task.source_id, user_id: leadData.user_id,
                  trip_id: leadData.trip_id, departure_id: departureId,
                  price, payment_status: "pending",
                });
                // Decrement seats
                if (departureId) {
                  const { data: depData } = await supabase.from("trip_departures").select("seats_left").eq("id", departureId).maybeSingle();
                  if (depData?.seats_left != null) await supabase.from("trip_departures").update({ seats_left: Math.max(0, depData.seats_left - 1) }).eq("id", departureId);
                }
                if (leadData.trip_id) {
                  const { data: tripData } = await supabase.from("trips").select("seats_left").eq("id", leadData.trip_id).maybeSingle();
                  if (tripData?.seats_left != null) await supabase.from("trips").update({ seats_left: Math.max(0, tripData.seats_left - 1) }).eq("id", leadData.trip_id);
                }
                await travelerService.createTraveler({
                  booking_id: booking.id, user_id: leadData.user_id,
                  full_name: leadData.name, email: leadData.email,
                  phone: leadData.phone, visa_status: "not_required",
                });
              }
            } catch (err) {
              console.error("Failed to pre-create booking on sharing brochure:", err);
            }

            try {
              const { data: leadData } = await supabase
                .from("leads")
                .select("name, email")
                .eq("id", task.source_id)
                .single();

              if (leadData?.email) {
                const customMsg = options?.brochureMsg || `I'm excited to share the curated brochure for your upcoming adventure. It contains the detailed day-by-day itinerary, stay details, package inclusions, and cost breakdown.`;
                await notificationService.notifyTraveler(
                  leadData.email,
                  "Your Personalised Itinerary Brochure",
                  customMsg,
                  "Brochure Shared",
                  task.source_id,
                  "High"
                );
              }
            } catch (err) {
              console.error("Failed to send brochure notification email:", err);
            }
          }

          // ── Step 5: Payment Follow-up ──
          else if (task.step === 5) {
            const paymentStatus = options?.paymentStatus || "paid";
            if (paymentStatus === "paid") {
              await supabase.from("leads").update({ status: "converted" }).eq("id", task.source_id);
              if (options?.receiptAmt || options?.refId) {
                await supabase.from("lead_notes").insert({
                  lead_id: task.source_id,
                  content: `Payment Deposit Confirmed:\n- Amount: ₹${options.receiptAmt}\n- Transaction Ref: ${options.refId}`,
                  created_by: task.assigned_to
                });
              }
              try {
                const { data: leadData } = await supabase.from("leads")
                  .select("name, email, assigned_to")
                  .eq("id", task.source_id).single();

                if (leadData) {
                  await notificationService.notifyTraveler(leadData.email, "Booking Confirmed",
                    "Your deposit payment has been received! Your booking is being processed.", "Booking Confirmed", task.source_id, "High");
                  if (leadData.assigned_to) {
                    await notificationService.notifyManager(leadData.assigned_to, "Booking Confirmed",
                      `Payment received for "${leadData.name}". Proceed to document collection.`, "Booking Confirmed", task.source_id, "High");
                  }
                }
              } catch (err) {
                console.error("Failed to run booking confirmation notification:", err);
              }
            } else if (paymentStatus === "declined") {
              await supabase.from("lead_notes").insert({
                lead_id: task.source_id, content: `Payment Follow-up: Payment declined by traveler.`, created_by: task.assigned_to
              });
              return data as DBTask;
            }
          }

          // ── Step 6: Confirm Booking ──
          else if (task.step === 6) {
            await supabase.from("leads").update({ status: "confirmed" }).eq("id", task.source_id);
            await supabase.from("lead_notes").insert({
              lead_id: task.source_id, content: `Booking Confirmed: All tasks completed. Booking officially confirmed.`, created_by: task.assigned_to
            });
            try {
              const { data: leadData } = await supabase.from("leads").select("name, email, trip_id").eq("id", task.source_id).single();
              if (leadData) {
                let tripTitle = "your trip";
                if (leadData.trip_id) {
                  const { data: tripData } = await supabase.from("trips").select("title").eq("id", leadData.trip_id).single();
                  if (tripData?.title) tripTitle = tripData.title;
                }
                await notificationService.notifyTraveler(leadData.email, "Booking Confirmed",
                  `Congratulations, ${leadData.name}! Your booking for "${tripTitle}" is officially confirmed. Get ready for an incredible adventure! 🎉`,
                  "Booking Confirmed", task.source_id, "High");
              }
            } catch (err) { console.error("Failed to send booking confirmation email:", err); }
          }

          // Trigger workflow to auto-generate next task
          await this.evaluateLeadWorkflow(task.source_id, options);
        }
      } else if (task.source_kind === "trip" && task.source_id) {
        if (status === "completed") {
          const titleLower = task.title.toLowerCase();
          let nextTripStatus = "";
          if (titleLower.includes("archive") || titleLower.includes("complete")) nextTripStatus = "completed";
          else if (titleLower.includes("open") || titleLower.includes("enquiries")) nextTripStatus = "active";
          if (nextTripStatus) await supabase.from("trips").update({ status: nextTripStatus }).eq("id", task.source_id);
        }
      }
    } catch (e) {
      console.warn("Failed to auto-advance workflow status:", e);
    }

    return data as DBTask;
  },

  async updateTaskSubtasks(id: string, subtasks: TaskSubtask[]): Promise<DBTask> {
    const { data, error } = await supabase.from("tasks")
      .update({ subtasks, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    return data as DBTask;
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  }
};
