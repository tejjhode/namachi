import { createClient } from "@/lib/supabase/client";

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

/** Configuration for a task to be auto-generated */
export type AutoTaskConfig = {
  title: string;
  description: string;
  type: string;
  priority: string;
  dueDaysFromNow: number; // 0 = today, 1 = tomorrow, etc.
  subtasks: string[];
  step: number;
};

/**
 * Returns the tasks to auto-generate when a lead is assigned to a manager,
 * based on the lead's current status.
 */
export function getLeadAssignmentTasks(
  leadName: string,
  tripName: string,
  leadStatus: string
): AutoTaskConfig[] {
  const status = leadStatus.toLowerCase();

  if (status === "new") {
    return [
      {
        title: `Initial Contact - ${leadName}`,
        description: `Reach out to ${leadName} for the first time regarding ${tripName || "their enquiry"}.`,
        type: "communication",
        priority: "High",
        dueDaysFromNow: 1,
        subtasks: [
          `Call ${leadName}`,
          "Introduce yourself and Nomichi",
          "Understand their travel requirements",
          "Note preferences in lead notes",
        ],
        step: 1,
      },
      {
        title: `Send Trip Details - ${tripName || leadName}`,
        description: `Share brochure, itinerary, and pricing for ${tripName || "the trip"} with ${leadName}.`,
        type: "follow-up",
        priority: "Medium",
        dueDaysFromNow: 2,
        subtasks: [
          "Attach brochure / trip PDF",
          "Highlight key inclusions",
          "Share pricing & availability",
          "Ask for feedback and questions",
        ],
        step: 3,
      },
      {
        title: `Qualify & Schedule Vibe Check - ${leadName}`,
        description: `Review ${leadName}'s fit, budget, and travel dates, then schedule a vibe check call.`,
        type: "vibe check",
        priority: "Medium",
        dueDaysFromNow: 4,
        subtasks: [
          "Review budget fit and group size",
          "Check travel dates alignment",
          "Confirm fit for the trip",
          "Schedule vibe check call",
        ],
        step: 5,
      },
    ];
  }

  if (status === "contacted") {
    return [
      {
        title: `Follow-up with ${leadName}`,
        description: `Follow up with ${leadName} regarding ${tripName || "their enquiry"} — address open questions.`,
        type: "follow-up",
        priority: "High",
        dueDaysFromNow: 1,
        subtasks: [
          `Review previous interaction with ${leadName}`,
          "Address any open questions",
          "Share itinerary draft if not done",
          "Confirm next steps",
        ],
        step: 2,
      },
      {
        title: `Qualify Lead - ${leadName}`,
        description: `Qualify ${leadName} and schedule a vibe check call.`,
        type: "vibe check",
        priority: "Medium",
        dueDaysFromNow: 3,
        subtasks: [
          "Confirm lead fit for the trip",
          "Schedule vibe check call",
          "Review requirements",
        ],
        step: 5,
      },
      {
        title: `Prepare Quotation - ${leadName}`,
        description: `Prepare and share a quotation for ${tripName || "the trip"} with ${leadName}.`,
        type: "payment",
        priority: "Medium",
        dueDaysFromNow: 5,
        subtasks: [
          "Calculate trip cost",
          "Add discounts if applicable",
          "Share quotation with traveler",
          "Follow up on quotation",
        ],
        step: 7,
      },
    ];
  }

  if (status === "qualified") {
    return [
      {
        title: `Vibe Check Call - ${leadName}`,
        description: `Conduct vibe check call with ${leadName} to confirm fit for ${tripName || "the trip"}.`,
        type: "vibe check",
        priority: "High",
        dueDaysFromNow: 1,
        subtasks: [
          `Review ${leadName}'s lead notes`,
          "Confirm fit and readiness",
          "Schedule vibe check call",
        ],
        step: 6,
      },
      {
        title: `Send Detailed Itinerary - ${leadName}`,
        description: `Prepare and share a detailed day-wise itinerary for ${tripName || "the trip"}.`,
        type: "document",
        priority: "High",
        dueDaysFromNow: 2,
        subtasks: [
          "Prepare day-wise itinerary",
          "Include accommodation details",
          "Add activity highlights",
          "Share with traveler",
        ],
        step: 9,
      },
      {
        title: `Discuss Payment Terms - ${leadName}`,
        description: `Share payment schedule, cancellation policy, and collect advance from ${leadName}.`,
        type: "payment",
        priority: "Medium",
        dueDaysFromNow: 4,
        subtasks: [
          "Share payment schedule",
          "Explain cancellation policy",
          "Collect advance payment",
        ],
        step: 11,
      },
    ];
  }

  if (["negotiating", "vibe check sent", "vibe check"].includes(status)) {
    return [
      {
        title: `Complete Booking Process - ${leadName}`,
        description: `Finalize booking details for ${leadName} on ${tripName || "the trip"}.`,
        type: "booking",
        priority: "High",
        dueDaysFromNow: 1,
        subtasks: [
          `Confirm ${leadName}'s traveler details`,
          "Check seat availability",
          "Prepare booking form",
          "Send confirmation",
        ],
        step: 10,
      },
      {
        title: `Collect Payment - ${leadName}`,
        description: `Send payment link and confirm receipt for ${leadName}'s booking.`,
        type: "payment",
        priority: "High",
        dueDaysFromNow: 2,
        subtasks: [
          "Send payment link",
          "Confirm payment receipt",
          "Update booking status",
        ],
        step: 12,
      },
    ];
  }

  // For "converted", "confirmed", "lost" — no auto-generated tasks
  return [];
}

export const taskService = {
  /**
   * Idempotent workflow-driven task engine evaluating Lead status, task completions,
   * booking, and departure status to generate the next meaningful tasks.
   */
  async evaluateLeadWorkflow(leadId: string, options?: { meetingDate?: string }): Promise<void> {
    // 1. Fetch the lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      console.warn("evaluateLeadWorkflow: Lead not found or error", leadErr);
      return;
    }

    // 2. Fetch all tasks associated with this lead
    const { data: tasks, error: tasksErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("source_kind", "lead")
      .eq("source_id", leadId);

    if (tasksErr) {
      console.error("evaluateLeadWorkflow: Error fetching tasks", tasksErr);
      return;
    }

    const existingTasks: DBTask[] = tasks || [];

    // Helper functions
    const getTaskByStep = (step: number) => existingTasks.find((t) => t.step === step);
    const isStepComplete = (step: number) => {
      const t = getTaskByStep(step);
      return t !== undefined && t.status === "completed";
    };
    const doesStepExist = (step: number) => getTaskByStep(step) !== undefined;

    // Retrieve active departure start date if exists
    let departureStartDate: Date | null = null;
    if (lead.trip_id) {
      const { data: departures } = await supabase
        .from("trip_departures")
        .select("start_date, status")
        .eq("trip_id", lead.trip_id);
      
      if (departures && departures.length > 0) {
        // Look for active departure
        const activeDep = departures.find(d => {
          try {
            if (typeof d.status === "string" && d.status.startsWith("{")) {
              const parsed = JSON.parse(d.status);
              return parsed.status === "active";
            }
            return d.status === "active";
          } catch {
            return false;
          }
        });
        const targetDep = activeDep || departures[0];
        if (targetDep?.start_date) {
          departureStartDate = new Date(targetDep.start_date);
        }
      }
    }

    // Function to insert task safely if it doesn't exist
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

      const payload = {
        title,
        description,
        related_to: lead.name,
        related_id: lead.enquiry_id || `LEAD-${lead.id.slice(0, 6).toUpperCase()}`,
        source_kind: "lead" as const,
        source_id: lead.id,
        type,
        priority,
        due_date: dueDateStr,
        status: "to do",
        assigned_to: lead.assigned_to,
        created_by: lead.assigned_to,
        details: description,
        subtasks: subtasks.map((st) => ({ title: st, completed: false })),
        step,
      };

      await supabase.from("tasks").insert([payload]);
    };

    const leadStatus = (lead.status || "new").toLowerCase();

    // 1. Lead Assigned -> Contact Traveller
    if (lead.assigned_to) {
      await createWorkflowTask(
        1,
        "Contact Traveller",
        `Reach out to ${lead.name} to introduce Nomichi and understand travel requirements.`,
        "follow-up",
        "High",
        0, // Today
        [
          "Call traveler",
          "Introduce yourself and Nomichi",
          "Understand travel requirements",
          "Update lead status/notes"
        ]
      );
    }

    // 2. Contact Complete -> Share Brochure
    if (isStepComplete(1)) {
      if (leadStatus === "new") {
        await supabase.from("leads").update({ status: "contacted" }).eq("id", lead.id);
      }
      await createWorkflowTask(
        2,
        "Share Brochure",
        `Share brochure, itinerary, and pricing for their interested trip with ${lead.name}.`,
        "follow-up",
        "Medium",
        0, // Today
        [
          "Verify brochure PDF is ready",
          "Share brochure via email / WhatsApp",
          "Ask traveler for feedback"
        ]
      );
    }

    // 3. Brochure Shared -> Follow Up Traveller
    if (isStepComplete(2)) {
      await createWorkflowTask(
        3,
        "Follow Up Traveller",
        `Follow up with ${lead.name} regarding the brochure and answer any queries.`,
        "follow-up",
        "Medium",
        2, // 2 Days
        [
          "Follow up on shared brochure",
          "Address any questions or concerns",
          "Check traveler interest level"
        ]
      );
    }

    // 4. Traveller Interested -> Schedule Vibe Check
    if (["qualified", "vibe check sent", "negotiating", "converted", "confirmed"].includes(leadStatus)) {
      await createWorkflowTask(
        4,
        "Schedule Vibe Check",
        `Coordinate and schedule a vibe check call with ${lead.name}.`,
        "vibe check",
        "High",
        1, // 1 Day
        [
          "Propose slots for vibe check call",
          "Coordinate with traveler",
          "Confirm scheduled time and send link"
        ]
      );
    }

    // 5. Vibe Check Scheduled -> Conduct Vibe Check
    if (isStepComplete(4)) {
      let meetingDateStr = options?.meetingDate;
      if (!meetingDateStr) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(16, 0, 0, 0); // Default to 4 PM tomorrow
        meetingDateStr = tomorrow.toISOString();
      }
      await createWorkflowTask(
        5,
        "Conduct Vibe Check",
        `Conduct vibe check call to verify fit and group alignment.`,
        "vibe check",
        "High",
        1,
        [
          "Review traveler budget and requirements",
          "Call traveler at the scheduled meeting time",
          "Assess fit for group trip and mark vibe check score"
        ],
        meetingDateStr
      );
    }

    // 6. Vibe Check Complete -> Payment Follow-up
    if (isStepComplete(5)) {
      await createWorkflowTask(
        6,
        "Payment Follow-up",
        `Polite follow-up for advance payment and payment schedule confirmation.`,
        "payment",
        "High",
        1, // 1 Day
        [
          "Share payment schedule & terms",
          "Send payment link",
          "Polite reminder to make payment"
        ]
      );
    }

    // 7 & 8. Payment Received -> Collect Documents
    if (["converted", "confirmed"].includes(leadStatus)) {
      await createWorkflowTask(
        7,
        "Collect Passport",
        `Request and collect high-quality scanned copy of bio page.`,
        "document",
        "High",
        2, // 2 Days
        [
          "Request passport bio page scan",
          "Verify passport validity is > 6 months",
          "Upload copy to traveler profile"
        ]
      );
      await createWorkflowTask(
        8,
        "Collect Emergency Contact",
        `Request emergency contact details (Name, Relationship, Phone).`,
        "document",
        "High",
        2, // 2 Days
        [
          "Request emergency contact details",
          "Verify phone and email contact info",
          "Save details in traveler profile"
        ]
      );
    }

    // 9. Documents Complete -> Assign Departure
    if (isStepComplete(7) && isStepComplete(8)) {
      await createWorkflowTask(
        9,
        "Assign Departure",
        `Assign the traveler to a specific active departure in the system.`,
        "operations",
        "High",
        3, // 3 Days
        [
          "Review available departures for trip",
          "Verify seat capacity and availability",
          "Assign traveler to specific departure date"
        ]
      );
    }

    // 10. Departure Assigned -> Send Final Itinerary
    if (isStepComplete(9)) {
      await createWorkflowTask(
        10,
        "Send Final Itinerary",
        `Generate and email the final departure-specific itinerary PDF.`,
        "communication",
        "High",
        3, // 3 Days
        [
          "Verify departure itinerary details",
          "Generate final travel document PDF",
          "Email final itinerary to traveler"
        ]
      );
    }

    // 11. 7 Days Before Departure -> Departure Reminder
    if (doesStepExist(10)) {
      let reminderDueDateStr = "";
      if (departureStartDate) {
        const reminderDate = new Date(departureStartDate);
        reminderDate.setDate(reminderDate.getDate() - 7);
        reminderDueDateStr = reminderDate.toISOString();
      }
      await createWorkflowTask(
        11,
        "Departure Reminder",
        `Send departure briefing reminder call and packing guidelines.`,
        "communication",
        "Medium",
        7, // Default 7 days
        [
          "Prepare departure briefing details",
          "Send reminder email/message to traveler",
          "Verify packing guidelines are shared"
        ],
        reminderDueDateStr
      );
    }

    // 12. 2 Days Before Departure -> Travel Readiness Check
    if (doesStepExist(11)) {
      let readinessDueDateStr = "";
      if (departureStartDate) {
        const readinessDate = new Date(departureStartDate);
        readinessDate.setDate(readinessDate.getDate() - 2);
        readinessDueDateStr = readinessDate.toISOString();
      }
      await createWorkflowTask(
        12,
        "Travel Readiness Check",
        `Final travel readiness verification, insurance, and health check.`,
        "operations",
        "High",
        2, // Default 2 days
        [
          "Perform health and safety briefing check",
          "Confirm travel insurance details",
          "Final check on document uploads"
        ],
        readinessDueDateStr
      );
    }
  },

  /**
   * Auto-generate tasks when a lead is assigned to a manager.
   * Runs the workflow engine to set up initial tasks.
   */
  async createTasksForLeadAssignment(params: {
    leadId: string;
    leadName: string;
    leadStatus: string;
    tripName: string;
    enquiryId?: string | null;
    assignedTo: string;
    createdBy: string;
  }): Promise<DBTask[]> {
    await this.evaluateLeadWorkflow(params.leadId);
    return this.getTasks();
  },

  async getTasks(): Promise<DBTask[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as DBTask[];
  },

  async createTask(task: Omit<DBTask, "id" | "created_at" | "updated_at">): Promise<DBTask> {
    const { data, error } = await supabase
      .from("tasks")
      .insert([task])
      .select()
      .single();

    if (error) throw error;
    return data as DBTask;
  },

  async updateTaskStatus(id: string, status: string, options?: { meetingDate?: string }): Promise<DBTask> {
    const { data, error } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const task = data as DBTask;

    // Automatically advance the workflow of the underlying lead/trip if task status changes
    try {
      if (task.source_kind === "lead" && task.source_id) {
        if (status === "completed") {
          if (task.step === 1) {
            await supabase
              .from("leads")
              .update({ status: "contacted" })
              .eq("id", task.source_id);
          } else if (task.step === 6) {
            await supabase
              .from("leads")
              .update({ status: "converted" })
              .eq("id", task.source_id);
          }
        }

        // Trigger workflow evaluation to build subsequent tasks
        await this.evaluateLeadWorkflow(task.source_id, options);
      } else if (task.source_kind === "trip" && task.source_id) {
        let nextTripStatus = "";
        if (status === "completed") {
          const titleLower = task.title.toLowerCase();
          if (titleLower.includes("archive") || titleLower.includes("complete")) {
            nextTripStatus = "completed";
          } else if (titleLower.includes("open") || titleLower.includes("enquiries")) {
            nextTripStatus = "active";
          }
        }
        if (nextTripStatus) {
          await supabase
            .from("trips")
            .update({ status: nextTripStatus })
            .eq("id", task.source_id);
        }
      }
    } catch (e) {
      console.warn("Failed to auto-advance workflow status:", e);
    }

    return data as DBTask;
  },

  async updateTaskSubtasks(id: string, subtasks: TaskSubtask[]): Promise<DBTask> {
    const { data, error } = await supabase
      .from("tasks")
      .update({ subtasks, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as DBTask;
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
};
