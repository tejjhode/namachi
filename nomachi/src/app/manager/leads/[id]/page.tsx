"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLead } from "@/hooks/useLead";
import { useUsers } from "@/hooks/useUsers";
import { createClient } from "@/lib/supabase/client";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import { getLeadNoteAuthorLabel, getLeadNoteDisplay, getLeadNoteVisual } from "@/lib/lead-notes";
import { taskService } from "@/services/task.service";
import { notificationService } from "@/services/notification.service";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Users,
  ChevronDown,
  Loader2,
  CalendarDays,
  FileText,
  MessageSquare,
  AlertCircle,
  MoreVertical,
  CalendarCheck,
  Video,
  Link2,
  CheckSquare
} from "lucide-react";

const statusMeta: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-[#FAF8F5] text-[#625E5A] border-[#e7e1d5]/60" },
  contacted: { label: "Contacted", className: "bg-[#EBF5FF] text-[#2563EB] border-[#D0E2FF]/40" },
  negotiating: { label: "Vibe Check Done", className: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]/40" },
  "vibe check sent": { label: "Vibe Check Sent", className: "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]/40" },
  qualified: { label: "Itinerary Shared", className: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]/40" },
  converted: { label: "Payment Received", className: "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40" },
  confirmed: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40" },
  lost: { label: "Not a Fit", className: "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]/40" },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

interface ManagerLeadDetailPageProps {
  params: { id: string };
}

export default function ManagerLeadDetailPage({ params }: ManagerLeadDetailPageProps) {
  const router = useRouter();
  const { lead, loading, error, changeStatus, addNote, refresh } = useLead(params.id);
  const { users } = useUsers();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Note form
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Action dropdown
  const [actionsOpen, setActionsOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Reschedule modal
  const [rescheduleTask, setRescheduleTask] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // ── Step 1: Contact Traveller ──
  const [callResult, setCallResult] = useState<string>("");
  const [completingStep1, setCompletingStep1] = useState(false);

  // ── Step 2: Schedule Vibe Check ──
  const [vibeCheckDate, setVibeCheckDate] = useState("");
  const [vibeCheckTime, setVibeCheckTime] = useState("");
  const [meetingType, setMeetingType] = useState("Video Call");
  const [meetingLink, setMeetingLink] = useState("");
  const [schedulingVibeCheck, setSchedulingVibeCheck] = useState(false);

  // ── Step 3: Share Brochure ──
  const [brochureFiles, setBrochureFiles] = useState<File[]>([]);
  const [brochureMsg, setBrochureMsg] = useState(
    `I'm excited to share the curated brochure for your upcoming adventure. It contains the detailed day-by-day itinerary, stay details, package inclusions, and cost breakdown.\n\nPlease take your time reviewing it before our upcoming call. Looking forward to an amazing conversation!`
  );
  const [uploadingBrochure, setUploadingBrochure] = useState(false);

  // ── Step 4: Conduct Vibe Check ──
  const [vibeResult, setVibeResult] = useState<string>("");
  const [vibeNotes, setVibeNotes] = useState("");
  const [completingVibeCheck, setCompletingVibeCheck] = useState(false);

  // ── Step 5: Payment Follow-up ──
  const [paymentLinkUrl, setPaymentLinkUrl] = useState("");
  const [paymentResult, setPaymentResult] = useState<string>("");
  const [receiptAmt, setReceiptAmt] = useState("");
  const [refId, setRefId] = useState("");
  const [completingPayment, setCompletingPayment] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);


  // ── Step 7: Confirm Booking ──
  const [confirmingBooking, setConfirmingBooking] = useState(false);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, role, full_name, avatar_url")
            .eq("id", data.user.id)
            .single();

          const role = normalizeRole(profile?.role || data.user.user_metadata?.role);
          if (!isManagerOrAdminRole(role)) {
            router.push("/");
          } else if (role === "ADMIN") {
            router.push(`/admin/leads/${params.id}`);
          } else {
            setCurrentUser({ ...data.user, profile, role });
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth verification failed:", err);
        router.push("/");
      } finally {
        setCheckingAuth(false);
      }
    };
    fetchUserAndProfile();
  }, [params.id, router]);

  const leadData = lead as any;
  const assignedProfile = leadData?.profiles || (leadData?.assigned_to ? usersById.get(leadData.assigned_to) : null) || (currentUser && currentUser.profile);

  useEffect(() => {
    if (leadData && currentUser && leadData.assigned_to !== currentUser.id) {
      router.push("/manager/leads");
    }
  }, [leadData, currentUser, router]);

  const fetchLeadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("source_id", params.id)
        .order("step", { ascending: true });
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to fetch lead tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (lead) fetchLeadTasks();
  }, [lead, fetchLeadTasks]);

  // Real-time listener for tasks & leads updates
  useEffect(() => {
    if (!params.id) return;
    const channel = supabase
      .channel(`manager-lead-sync-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `source_id=eq.${params.id}`,
        },
        () => {
          fetchLeadTasks();
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `id=eq.${params.id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id, fetchLeadTasks, refresh]);

  // The current active (first non-completed) task
  const nextActionTask = useMemo(() => {
    return tasks
      .filter(t => t.status !== "completed" && t.status !== "cancelled")
      .sort((a, b) => (a.step || 0) - (b.step || 0))[0];
  }, [tasks]);

  const handleUpdateStatusDirect = async (status: string) => {
    try {
      setUpdatingStatus(true);
      await changeStatus(status);
      await fetchLeadTasks();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentUser) return;
    try {
      setAddingNote(true);
      await addNote(newNoteText.trim(), currentUser.id);
      setNewNoteText("");
    } catch (err) {
      console.error("Failed to log note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleRescheduleClick = (task: any) => {
    setRescheduleTask(task);
    if (task?.due_date) {
      const d = new Date(task.due_date);
      const pad = (num: number) => String(num).padStart(2, "0");
      setRescheduleDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTask || !rescheduleDate) return;
    try {
      setRescheduling(true);
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: new Date(rescheduleDate).toISOString() })
        .eq("id", rescheduleTask.id);
      if (error) throw error;
      setRescheduleTask(null);
      setRescheduleDate("");
      await fetchLeadTasks();
    } catch (err) {
      console.error("Failed to reschedule task:", err);
    } finally {
      setRescheduling(false);
    }
  };

  // ── Step 1 handler: Contact Traveller ──
  const handleCompleteContactTraveller = async () => {
    if (!callResult) { alert("Please select a call result."); return; }
    if (!nextActionTask) return;
    setCompletingStep1(true);
    try {
      if (callResult === "not_interested") {
        await taskService.updateTaskStatus(nextActionTask.id, "completed", { callResult });
        await handleUpdateStatusDirect("lost");
      } else {
        await taskService.updateTaskStatus(nextActionTask.id, "completed", { callResult });
      }
      setCallResult("");
      await fetchLeadTasks();
      await refresh();
    } catch (err) {
      console.error("Step 1 completion failed:", err);
    } finally {
      setCompletingStep1(false);
    }
  };

  // ── Step 2 handler: Schedule Vibe Check — sends email + WhatsApp ──
  const handleScheduleVibeCheck = async () => {
    if (!vibeCheckDate || !vibeCheckTime) { alert("Please select a date and time for the Vibe Check."); return; }
    if (!nextActionTask) return;
    setSchedulingVibeCheck(true);
    try {
      const meetingDateTimeISO = new Date(`${vibeCheckDate}T${vibeCheckTime}`).toISOString();
      const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
      const tripTitle = leadData?.trips?.title || "your trip";
      const managerName = currentUser?.profile?.full_name || "your Trip Expert";
      const formattedTime = new Date(meetingDateTimeISO).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
      const linkLine = meetingLink ? `\nMeeting Link: ${meetingLink}` : "";

      // WhatsApp
      const waText = `Hello ${leadData?.name || "there"}, your Vibe Check for "${tripTitle}" is scheduled on ${formattedTime}${linkLine ? ` — ${meetingLink}` : ""}. Looking forward to speaking with you!`;
      if (phoneDigits) window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waText)}`, "_blank");

      // Gmail — always open, with link if provided
      if (leadData?.email) {
        const emailSubject = `Vibe Check Scheduled — ${tripTitle}`;
        const emailBody = `Hi ${leadData?.name || "there"},\n\nYour Vibe Check for "${tripTitle}" has been scheduled!\n\nDate & Time: ${formattedTime}\nMeeting Type: ${meetingType}${linkLine}\nTrip Expert: ${managerName}\n\nWe will share your personalised brochure and itinerary after our call.\n\nLooking forward to speaking with you!\n\nWarm regards,\n${managerName}`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${leadData.email}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(gmailUrl, "_blank");
      }

      await taskService.updateTaskStatus(nextActionTask.id, "completed", {
        meetingDate: meetingDateTimeISO,
        meetingLink,
        meetingType,
      });

      setVibeCheckDate("");
      setVibeCheckTime("");
      setMeetingLink("");
      await fetchLeadTasks();
      await refresh();
    } catch (err) {
      console.error("Step 2 scheduling failed:", err);
    } finally {
      setSchedulingVibeCheck(false);
    }
  };

  // ── Step 3 handler: Conduct Vibe Check ──
  const handleCompleteVibeCheck = async () => {
    if (!vibeResult) { alert("Please select a Vibe Check result."); return; }
    if (!nextActionTask) return;
    setCompletingVibeCheck(true);
    try {
      await taskService.updateTaskStatus(nextActionTask.id, "completed", { vibeResult, vibeNotes });
      setVibeResult("");
      setVibeNotes("");
      await fetchLeadTasks();
      await refresh();
    } catch (err) {
      console.error("Step 3 vibe check failed:", err);
    } finally {
      setCompletingVibeCheck(false);
    }
  };

  // ── Step 4 handler: Share Brochure ──
  const handleUploadAndShareBrochure = async () => {
    if (!leadData?.trip_id) { alert("No trip is associated with this lead."); return; }
    let existingBrochureUrl = leadData?.trips?.brochure_url;
    if (brochureFiles.length === 0 && !existingBrochureUrl) {
      alert("Please select at least one brochure PDF to upload.");
      return;
    }
    setUploadingBrochure(true);
    try {
      // Store files as base64 in trips table
      if (brochureFiles.length > 0) {
        const uploaded: { name: string; url: string }[] = [];
        for (const file of brochureFiles) {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          uploaded.push({ name: file.name, url: base64Data });
        }
        const serialized = JSON.stringify(uploaded);
        const { error: updateError } = await supabase.from("trips").update({ brochure_url: serialized }).eq("id", leadData.trip_id);
        if (updateError) throw updateError;
        existingBrochureUrl = serialized;
      }

      // Get signed brochure links via the token API
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || "";
      const origin = window.location.origin;
      let brochureLinks = "";

      const buildSignedLinks = async (brochureUrlStr: string): Promise<string> => {
        if (brochureUrlStr.startsWith("[")) {
          try {
            const parsed = JSON.parse(brochureUrlStr);
            const lines: string[] = [];
            for (let idx = 0; idx < parsed.length; idx++) {
              const res = await fetch("/api/brochure-token", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ tripId: leadData.trip_id, index: idx }),
              });
              if (res.ok) {
                const { url } = await res.json();
                lines.push(`${parsed[idx].name || `Brochure ${idx + 1}`}: ${url}`);
              } else {
                lines.push(`${parsed[idx].name || `Brochure ${idx + 1}`}: ${origin}/api/trips/${leadData.trip_id}/brochure?index=${idx}`);
              }
            }
            return lines.join("\n");
          } catch {
            return `${origin}/api/trips/${leadData.trip_id}/brochure`;
          }
        }
        // Single brochure
        const res = await fetch("/api/brochure-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ tripId: leadData.trip_id, index: 0 }),
        });
        if (res.ok) { const { url } = await res.json(); return url; }
        return `${origin}/api/trips/${leadData.trip_id}/brochure`;
      };

      brochureLinks = await buildSignedLinks(existingBrochureUrl || "");

      // WhatsApp
      const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
      const tripTitle = leadData?.trips?.title || "your trip";
      const waText = `Hello ${leadData?.name || "there"}, here is your personalised itinerary and brochure for "${tripTitle}":\n\n${brochureLinks}\n\n${brochureMsg.trim()}`;
      if (phoneDigits) window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waText)}`, "_blank");

      // Gmail — open email with download links embedded
      if (leadData?.email) {
        const emailSubject = `Your Personalised Itinerary — ${tripTitle}`;
        const emailBody = `Hi ${leadData?.name || "there"},\n\n${brochureMsg.trim()}\n\nYour personalised brochure and itinerary links:\n${brochureLinks}\n\nLooking forward to our Vibe Check call!`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${leadData.email}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(gmailUrl, "_blank");
      }

      // Complete step 4
      if (nextActionTask && nextActionTask.step === 4) {
        await taskService.updateTaskStatus(nextActionTask.id, "completed", { brochureMsg });
      }

      setBrochureFiles([]);
      await fetchLeadTasks();
      await refresh();
      alert("Brochure sent via WhatsApp & Gmail successfully!");
    } catch (err: any) {
      console.error("Failed to share brochure:", err);
      alert("Failed to share brochure: " + (err.message || err));
    } finally {
      setUploadingBrochure(false);
    }
  };

  // ── Step 5 handler: Payment Follow-up ──
  const handleSendPaymentReminder = async () => {
    if (!leadData?.email) {
      alert("No email address available for this traveler.");
      return;
    }
    setSendingReminder(true);
    try {
      const tripTitle = leadData?.trips?.title || "your trip";
      const origin = window.location.origin;
      const portalLink = `${origin}/?view=bookings`;
      const customLink = paymentLinkUrl || portalLink;

      // Send formal payment reminder email via background deliver API
      const response = await fetch("/api/notifications/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadData.email,
          title: `⚠️ Payment Due Reminder — ${tripTitle}`,
          body: `This is a formal reminder that the payment balance for your upcoming journey to ${tripTitle} is currently due. Please complete it to secure your slots.`,
          type: "Payment Reminder",
          priority: "High",
          source_id: leadData.id,
          paymentContext: {
            travelerName: leadData.name,
            tripTitle,
            tripDestination: leadData?.trips?.destination || "",
            totalFormatted: `₹${Number(leadData?.trips?.price || 0).toLocaleString("en-IN")}`,
            bookingRef: `LEAD-${leadData.id.slice(0, 6).toUpperCase()}`,
            dueDateStr: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric"
            })
          }
        }),
      });

      if (!response.ok) {
        throw new Error("Payment reminder API call failed.");
      }

      if (currentUser) {
        await addNote(`Payment Reminder: Formal payment due email sent to traveler (${leadData.email}).`, currentUser.id);
      }

      // WhatsApp link opens
      const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
      if (phoneDigits) {
        const waText = `Hello ${leadData?.name || "there"}, this is a formal reminder that the payment balance for your trip to "${tripTitle}" is currently due. Please login to your dashboard to complete the payment: ${customLink}`;
        window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waText)}`, "_blank");
      }

      alert("Formal payment reminder email sent successfully!");
      refresh();
    } catch (err: any) {
      console.error("Failed to send payment reminder:", err);
      alert("Failed to send payment reminder: " + (err.message || err));
    } finally {
      setSendingReminder(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!paymentResult) { alert("Please select payment status."); return; }
    if (!nextActionTask) return;
    setCompletingPayment(true);
    try {
      await taskService.updateTaskStatus(nextActionTask.id, "completed", {
        paymentStatus: paymentResult,
        receiptAmt,
        refId,
      });
      setPaymentResult("");
      setReceiptAmt("");
      setRefId("");
      await fetchLeadTasks();
      await refresh();
    } catch (err) {
      console.error("Step 5 completion failed:", err);
    } finally {
      setCompletingPayment(false);
    }
  };


  // ── Step 7 handler: Confirm Booking ──
  const handleConfirmBooking = async () => {
    if (!nextActionTask) return;
    if (!window.confirm("Are you sure you want to confirm this booking? This action is final.")) return;
    setConfirmingBooking(true);
    try {
      await taskService.updateTaskStatus(nextActionTask.id, "completed", {});
      await fetchLeadTasks();
      await refresh();
    } catch (err) {
      console.error("Step 7 confirmation failed:", err);
    } finally {
      setConfirmingBooking(false);
    }
  };

  const logInteraction = async (type: "call" | "whatsapp" | "email") => {
    if (!currentUser) return;
    let noteText = "";
    if (type === "call") noteText = `Called: Initiated phone call to ${leadData?.phone || "traveler"}`;
    else if (type === "whatsapp") noteText = `Called: Initiated WhatsApp chat`;
    else if (type === "email") noteText = `Called: Opened email client for ${leadData?.email}`;
    if (noteText) {
      try { await addNote(noteText, currentUser.id); } catch (err) { console.error(err); }
    }
  };

  const handleAddNoteClick = () => {
    setActiveTab("Notes");
    setTimeout(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) textarea.focus();
    }, 100);
  };

  const formatLeadId = (lead: any) =>
    lead?.enquiry_id?.replace("ENQ", "LD-") || `LD-${lead?.id?.slice(0, 4).toUpperCase()}`;

  const leadLocation = leadData?.trips?.destination || "India";

  const lastContactDateText = useMemo(() => {
    if (leadData?.lead_notes && leadData.lead_notes.length > 0) {
      return formatDateTime(leadData.lead_notes[leadData.lead_notes.length - 1].created_at);
    }
    return formatDateTime(leadData?.updated_at || leadData?.created_at);
  }, [leadData]);

  // Pipeline stages shown at the top — VIBE CHECK DONE before ITINERARY SHARED
  const pipelineStages = [
    { key: "new", label: "NEW" },
    { key: "contacted", label: "CONTACTED" },
    { key: "negotiating", label: "VIBE CHECK DONE" },
    { key: "qualified", label: "ITINERARY SHARED" },
    { key: "converted", label: "PAYMENT RECEIVED" },
    { key: "confirmed", label: "CONFIRMED" },
  ];

  const currentStatusKey = (leadData?.status || "new").toLowerCase();
  const activeStageIndex = pipelineStages.findIndex(
    (s) =>
      s.key === currentStatusKey ||
      (s.key === "confirmed" && currentStatusKey === "confirmed") ||
      (s.key === "converted" && currentStatusKey === "converted")
  );

  // Workflow progress (7 steps)
  const workflowSteps = useMemo(() => {
    const isTaskDone = (stepNum: number) => tasks.some((t) => t.step === stepNum && t.status === "completed");
    const isTaskPending = (stepNum: number) => tasks.some((t) => t.step === stepNum && t.status !== "completed");

    const steps = [1, 2, 3, 4, 5, 6];
    return steps.map((s) => ({
      step: s,
      state: isTaskDone(s) ? "completed" : isTaskPending(s) ? "in-progress" : "pending",
    }));
  }, [tasks]);

  const WORKFLOW_LABELS = [
    "Contact Traveller",
    "Schedule Vibe Check",
    "Conduct Vibe Check",
    "Share Brochure",
    "Payment Received",
    "Confirm Booking",
  ];

  // Activity timeline
  const timelineEvents = useMemo(() => {
    if (!leadData) return [];
    const events: any[] = [];
    events.push({
      date: formatDateTime(leadData.created_at),
      title: "Lead Assigned",
      subtitle: `Assigned to ${assignedProfile?.full_name || "Manager"}`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-[#10B981] border-emerald-100",
      timestamp: new Date(leadData.created_at).getTime()
    });

    if (leadData.lead_notes) {
      leadData.lead_notes.forEach((note: any) => {
        const { title: noteTitle, description: noteDesc } = getLeadNoteDisplay(note.note_text);
        const { iconColor, Icon } = getLeadNoteVisual(note.note_text);
        let customBg = iconColor;
        if (noteTitle.startsWith("Called") || noteTitle.startsWith("Spoke") || noteTitle.startsWith("Contact")) {
          customBg = "bg-blue-50 text-blue-600 border-blue-100";
        } else if (noteTitle.startsWith("Share") || noteTitle.startsWith("Brochure")) {
          customBg = "bg-orange-50 text-[#FF5B26] border-orange-100";
        } else if (noteTitle.startsWith("Vibe") || noteTitle.startsWith("Schedule") || noteTitle.startsWith("Scheduled")) {
          customBg = "bg-purple-50 text-purple-600 border-purple-100";
        } else if (noteTitle.startsWith("Payment")) {
          customBg = "bg-emerald-50 text-emerald-600 border-emerald-100";
        }
        events.push({
          date: formatDateTime(note.created_at),
          title: noteTitle,
          subtitle: noteDesc,
          icon: Icon,
          iconBg: customBg,
          timestamp: new Date(note.created_at).getTime()
        });
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [leadData, assignedProfile]);

  // Quick action hrefs
  const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
  const managerNameForLead = currentUser?.profile?.full_name || "Manager";
  const travelerNameForLead = leadData?.name || "there";
  const tripTitleForLead = leadData?.trips?.title || "your trip";
  const leadWaText = encodeURIComponent(`Hello ${travelerNameForLead}, this is ${managerNameForLead} from Nomichi. Thank you for your enquiry for the trip "${tripTitleForLead}".`);
  const whatsAppHref = phoneDigits ? `https://wa.me/${phoneDigits}?text=${leadWaText}` : "#";
  const callHref = leadData?.phone ? `tel:${leadData.phone}` : "#";
  const leadEmailSubject = encodeURIComponent(`Nomichi Enquiry — ${tripTitleForLead}`);
  const leadEmailBody = encodeURIComponent(`Hello ${travelerNameForLead},\n\nThis is ${managerNameForLead} from Nomichi. Thank you for your enquiry for the trip "${tripTitleForLead}".`);
  const gmailHref = leadData?.email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${leadData.email}&su=${leadEmailSubject}&body=${leadEmailBody}` : "#";

  if (checkingAuth || (loading && !lead)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF8F5]/20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF5B26]" />
          <p className="text-xs font-semibold text-slate-500">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#FAF8F5]/20 px-4 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <AlertCircle className="h-12 w-12 text-rose-500" />
          <h2 className="text-lg font-bold text-slate-900 font-display">Lead Not Found</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            {error || "We couldn't retrieve the details for this lead."}
          </p>
          <Link href="/manager/leads" className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all no-underline border-0">
            <ArrowLeft className="w-4 h-4 text-white" />
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  // ── Render the step-specific "Next Action" content ──
  const renderNextActionContent = () => {
    if (!nextActionTask) {
      const isConfirmed = currentStatusKey === "confirmed";
      const isLost = currentStatusKey === "lost";
      return (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <CheckCircle2 className={`w-10 h-10 ${isLost ? "text-rose-400" : "text-emerald-500"}`} />
          <p className="text-sm font-bold text-slate-700">
            {isLost ? "Lead marked as Not a Fit" : isConfirmed ? "Booking Confirmed!" : "All tasks complete"}
          </p>
          <p className="text-xs text-slate-400 font-semibold text-center">
            {isLost ? "The workflow has ended for this lead." : "This lead has completed the full workflow."}
          </p>
        </div>
      );
    }

    const step = nextActionTask.step;

    // ── Step 1: Contact Traveller ──
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Call the traveler to introduce Nomichi, understand their travel requirements, and qualify their interest.
          </p>
          <div className="flex gap-2 mb-2">
            <a href={callHref} onClick={() => logInteraction("call")} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 no-underline border-0 cursor-pointer">
              <Phone className="w-3.5 h-3.5" /> Call Now
            </a>
            <a href={whatsAppHref} target="_blank" rel="noopener noreferrer" onClick={() => logInteraction("whatsapp")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 no-underline border-0 cursor-pointer">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Call Result</label>
            {[
              { value: "completed", label: "✅ Call Completed" },
              { value: "no_answer", label: "📵 No Answer" },
              { value: "reschedule", label: "📅 Reschedule" },
              { value: "not_interested", label: "❌ Not Interested" },
            ].map((opt) => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${callResult === opt.value ? "bg-[#FFEFEA] border-[#FF5B26]/40 text-[#FF5B26]" : "border-[#e7e1d5]/55 hover:bg-slate-50 text-slate-700"}`}>
                <input
                  type="radio"
                  name="callResult"
                  value={opt.value}
                  checked={callResult === opt.value}
                  onChange={(e) => setCallResult(e.target.value)}
                  className="accent-[#FF5B26]"
                />
                <span className="text-xs font-bold">{opt.label}</span>
              </label>
            ))}
          </div>
          <button
            disabled={completingStep1}
            onClick={handleCompleteContactTraveller}
            className="w-full py-2.5 bg-[#FF5B26] hover:bg-[#e04b1c] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0 flex items-center justify-center gap-1.5"
          >
            {completingStep1 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {completingStep1 ? "Completing..." : "Complete Task"}
          </button>
        </div>
      );
    }

    // ── Step 2: Schedule Vibe Check ──
    if (step === 2) {
      return (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Schedule a Vibe Check consultation call. The traveler will receive an email and WhatsApp reminder.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date</label>
              <input
                type="date"
                value={vibeCheckDate}
                onChange={(e) => setVibeCheckDate(e.target.value)}
                className="w-full h-9 px-3 border border-[#e7e1d5]/70 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/40 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Time</label>
              <input
                type="time"
                value={vibeCheckTime}
                onChange={(e) => setVibeCheckTime(e.target.value)}
                className="w-full h-9 px-3 border border-[#e7e1d5]/70 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/40 bg-white"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Meeting Type</label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="w-full h-9 px-3 border border-[#e7e1d5]/70 rounded-xl text-xs font-semibold bg-white focus:outline-none"
            >
              <option>Video Call</option>
              <option>Phone Call</option>
              <option>In-Person Meeting</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Meeting Link (optional)</label>
            <input
              type="url"
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="w-full h-9 px-3 border border-[#e7e1d5]/70 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/40 bg-white"
            />
          </div>
          <button
            disabled={schedulingVibeCheck}
            onClick={handleScheduleVibeCheck}
            className="w-full py-2.5 bg-[#FF5B26] hover:bg-[#e04b1c] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0 flex items-center justify-center gap-1.5"
          >
            {schedulingVibeCheck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarCheck className="w-3.5 h-3.5" />}
            {schedulingVibeCheck ? "Scheduling..." : "Schedule & Notify Traveler"}
          </button>
        </div>
      );
    }

    // ── Step 3: Conduct Vibe Check ──
    if (step === 3) {
      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Conduct the scheduled Vibe Check call and record the outcome to advance the lead.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Vibe Check Result</label>
            {[
              { value: "qualified", label: "✅ Qualified — Proceed to Booking" },
              { value: "not_qualified", label: "❌ Not Qualified — End Workflow" },
              { value: "need_follow_up", label: "🔄 Need Follow-up — Reschedule" },
            ].map((opt) => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${vibeResult === opt.value ? "bg-[#FFEFEA] border-[#FF5B26]/40 text-[#FF5B26]" : "border-[#e7e1d5]/55 hover:bg-slate-50 text-slate-700"}`}>
                <input
                  type="radio"
                  name="vibeResult"
                  value={opt.value}
                  checked={vibeResult === opt.value}
                  onChange={(e) => setVibeResult(e.target.value)}
                  className="accent-[#FF5B26]"
                />
                <span className="text-xs font-bold">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Key discussion points, concerns, or feedback..."
              value={vibeNotes}
              onChange={(e) => setVibeNotes(e.target.value)}
              className="w-full rounded-xl border border-[#e7e1d5]/70 p-3 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
            />
          </div>
          <button
            disabled={completingVibeCheck}
            onClick={handleCompleteVibeCheck}
            className="w-full py-2.5 bg-[#FF5B26] hover:bg-[#e04b1c] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0 flex items-center justify-center gap-1.5"
          >
            {completingVibeCheck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {completingVibeCheck ? "Submitting..." : "Submit Vibe Check Result"}
          </button>
        </div>
      );
    }

    // ── Step 4: Share Brochure ──
    if (step === 4) {
      return (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Share the curated trip brochure, itinerary, and pricing with the traveler following your Vibe Check discussion.
          </p>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Upload Brochure PDFs</label>
            <input
              type="file"
              accept="application/pdf"
              id="brochure-pdf-upload"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).filter((file) => {
                  if (file.type !== "application/pdf") { alert(`"${file.name}" is not a PDF.`); return false; }
                  if (file.size > 20 * 1024 * 1024) { alert(`"${file.name}" exceeds 20MB.`); return false; }
                  return true;
                });
                setBrochureFiles((prev) => [...prev, ...files]);
              }}
            />
            <label htmlFor="brochure-pdf-upload" className="px-4 py-2 border border-dashed border-[#e7e1d5] hover:border-[#FF5B26]/30 bg-white hover:bg-[#FAF8F5] text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF5B26]" />
              {brochureFiles.length > 0 ? "Add More PDFs" : "Choose PDF Files"}
            </label>
            {brochureFiles.length > 0 && (
              <div className="space-y-1 pt-1">
                {brochureFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2 text-xs font-semibold text-slate-700">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => setBrochureFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer text-[10px] font-black">Remove</button>
                  </div>
                ))}
              </div>
            )}
            {brochureFiles.length === 0 && leadData?.trips?.brochure_url && (
              <span className="text-xs font-bold text-emerald-600">✓ Brochure(s) already attached</span>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Custom Message</label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-[#e7e1d5]/70 focus:border-[#FF5B26]/30 focus:ring-0 focus:outline-none p-3 text-xs font-semibold text-slate-700 bg-white"
              value={brochureMsg}
              onChange={(e) => setBrochureMsg(e.target.value)}
              placeholder="Enter a message to the traveler..."
            />
          </div>
          <button
            disabled={uploadingBrochure || (brochureFiles.length === 0 && !leadData?.trips?.brochure_url)}
            onClick={handleUploadAndShareBrochure}
            className="w-full py-2.5 bg-[#FF5B26] hover:bg-[#e04b1c] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0 flex items-center justify-center gap-1.5"
          >
            {uploadingBrochure ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {uploadingBrochure ? "Sending..." : "Send via WhatsApp & Gmail"}
          </button>
        </div>
      );
    }

    // ── Step 5: Payment Follow-up ──
    if (step === 5) {
      return (
        <div className="space-y-4">
          <button
            disabled={sendingReminder}
            onClick={handleSendPaymentReminder}
            className="w-full py-2.5 bg-[#FF5B26] hover:bg-[#e04b1c] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0 flex items-center justify-center gap-1.5"
          >
            {sendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            {sendingReminder ? "Sending Reminder..." : "Send Payment Reminder"}
          </button>
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="bg-[#FAF8F4] border border-[#e7e1d5]/70 rounded-xl p-4 text-center">
              <Clock3 className="w-5 h-5 text-amber-500 mx-auto mb-2 animate-pulse" />
              <p className="text-xs font-bold text-slate-700">Awaiting Online Payment</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                The traveler must complete the payment from their personal dashboard bookings portal. Once paid, the system will automatically confirm the receipt and advance this workflow to Document Collection.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // ── Step 6: Confirm Booking ──
    if (step === 6) {
      const completedSteps = tasks.filter((t) => t.status === "completed").map((t) => t.step);
      const SUMMARY_STEPS = [
        { step: 1, label: "Call Completed" },
        { step: 2, label: "Vibe Check Scheduled" },
        { step: 3, label: "Brochure Shared" },
        { step: 4, label: "Vibe Check Conducted" },
        { step: 5, label: "Payment Received" },
      ];
      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            All tasks are complete. Click below to officially confirm the booking.
          </p>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2">
            {SUMMARY_STEPS.map((s) => (
              <div key={s.step} className={`flex items-center gap-2 text-xs font-bold ${completedSteps.includes(s.step) ? "text-emerald-700" : "text-slate-400"}`}>
                {completedSteps.includes(s.step) ? "✓" : "○"} {s.label}
              </div>
            ))}
          </div>
          <button
            disabled={confirmingBooking}
            onClick={handleConfirmBooking}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-black rounded-xl transition-all shadow-sm cursor-pointer border-0 flex items-center justify-center gap-2"
          >
            {confirmingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {confirmingBooking ? "Confirming..." : "Confirm Booking 🎉"}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="px-5 md:px-8 py-6 space-y-6 text-left text-nomichi-ink bg-[#FAF8F5]/30 min-h-screen">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link href="/manager/leads" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors no-underline">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setActionsOpen(!actionsOpen)} className="px-4 py-2 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 bg-white cursor-pointer transition-all shadow-xs">
              Actions <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-[#e7e1d5]/55 shadow-lg py-2 z-20 font-bold text-xs text-left">
                  <button onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("lost"); }} className="w-full px-4 py-2.5 text-rose-600 hover:bg-rose-50 text-left border-0 bg-transparent cursor-pointer">
                    Mark Not a Fit
                  </button>
                  <button onClick={() => { setActionsOpen(false); handleAddNoteClick(); }} className="w-full px-4 py-2.5 text-slate-700 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer">
                    Add Note
                  </button>
                </div>
              </>
            )}
          </div>
          <button className="p-2 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-slate-400 hover:text-slate-600 rounded-xl bg-white cursor-pointer transition-all shadow-xs flex items-center justify-center">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left column */}
        <div className="xl:col-span-8 space-y-6">

          {/* Header card */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6">
            <div className="flex flex-col md:flex-row md:items-stretch justify-between gap-6 md:divide-x md:divide-[#e7e1d5]/50">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 rounded-full border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
                  <img
                    src={leadData.travelerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leadData.name || "default")}`}
                    alt={leadData.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">{leadData.name}</h1>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${statusMeta[currentStatusKey]?.className || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {statusMeta[currentStatusKey]?.label || leadData.status || "New"}
                    </span>
                  </div>
                  <div className="pt-1.5 space-y-1 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><span>{leadData.phone || "No phone"}</span></div>
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><span>{leadData.email}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>{leadLocation}</span></div>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center rounded-lg bg-[#EBF5FF] px-2.5 py-1 text-[10px] font-bold text-[#2563EB]">Lead ID: {formatLeadId(leadData)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-left w-full md:w-auto md:min-w-[340px] md:pl-6">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Lead Source</div>
                  <div className="mt-1 text-xs font-extrabold text-slate-800">{leadData.source || "Website"}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Enquiry Date</div>
                  <div className="mt-1 text-xs font-extrabold text-slate-800">{formatDate(leadData.created_at)}</div>
                </div>
                <div className="border-t border-[#e7e1d5]/40 pt-3.5 col-span-2 grid grid-cols-2 gap-x-6">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Assigned To</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[9px] font-black flex items-center justify-center uppercase shrink-0">
                        {assignedProfile?.full_name?.charAt(0) || "M"}
                      </span>
                      <span className="truncate">{assignedProfile?.full_name || "Manager"}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Last Contact</div>
                    <div className="mt-1.5 text-xs font-extrabold text-slate-800">{lastContactDateText}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline tracker */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 space-y-4 text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
              <div className="flex flex-nowrap items-center gap-2 flex-1 overflow-x-auto scrollbar-none py-1.5">
                {pipelineStages.map((stage, idx) => {
                  const isDone = idx < activeStageIndex && currentStatusKey !== "lost";
                  const isCurrent = idx === activeStageIndex && currentStatusKey !== "lost";
                  let pillStyle = "bg-slate-50 text-slate-400 border-slate-200";
                  if (isDone) pillStyle = "bg-[#E8F5E9]/50 text-emerald-700 border-emerald-200/80";
                  else if (isCurrent) pillStyle = "bg-[#FFF5F2] text-[#FF5B26] border-[#FFD3C4]/80 ring-2 ring-[#FF5B26]/5";
                  return (
                    <div key={stage.key} className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${pillStyle}`}>
                        {(isDone || isCurrent) && <span className="font-black">{isDone ? "✓" : "●"}</span>}
                        {stage.label}
                      </div>
                      {idx < pipelineStages.length - 1 && <span className="text-slate-300 font-extrabold text-xs shrink-0">›</span>}
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0">
                <button onClick={() => handleUpdateStatusDirect("lost")} disabled={currentStatusKey === "lost" || updatingStatus} className="px-4 py-1.5 border border-[#FF5B26] hover:bg-[#FFEFEA] text-[#FF5B26] font-bold text-[10px] rounded-lg transition-all cursor-pointer bg-white w-full text-center">
                  Mark Not Fit
                </button>
              </div>
            </div>
          </div>

          {/* Conversion Roadmap */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 space-y-4 text-left">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-700">Conversion Roadmap</span>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">7-step lead journey progress</p>
              </div>
              {nextActionTask && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#FFEFEA] text-[#FF5B26]">
                  Step {nextActionTask.step} Active
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
              {workflowSteps.map(({ step, state }) => {
                const label = WORKFLOW_LABELS[step - 1];
                let circleClass = "bg-slate-50 text-slate-400 border-slate-200";
                let icon: any = <span className="text-[9px] font-black text-slate-300">{step}</span>;
                if (state === "completed") {
                  circleClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
                  icon = <span className="font-extrabold text-[10px]">✓</span>;
                } else if (state === "in-progress") {
                  circleClass = "bg-[#FFEFEA] text-[#FF5B26] border-[#FFD3C4] ring-2 ring-[#FF5B26]/10";
                  icon = <span className="text-[9px] font-black">{step}</span>;
                }
                return (
                  <div key={step} className="flex flex-col items-center gap-1.5 text-center">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all ${circleClass}`}>{icon}</div>
                    <div className={`text-[8px] font-bold leading-tight ${state === "in-progress" ? "text-[#FF5B26]" : state === "completed" ? "text-slate-600" : "text-slate-300"}`}>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-transparent border-0 space-y-6">
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {["Overview", "Tasks", "Notes", "Activity"].map((tab) => {
                  let badgeVal = 0;
                  if (tab === "Tasks") badgeVal = tasks.filter((t) => t.status !== "completed").length;
                  else if (tab === "Notes") badgeVal = leadData?.lead_notes?.length || 0;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 flex items-center gap-1.5 ${activeTab === tab ? "bg-[#FFEFEA] text-[#FF5B26]" : "text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700 bg-transparent"}`}
                    >
                      <span>{tab}</span>
                      {badgeVal > 0 && (
                        <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${activeTab === tab ? "bg-[#FF5B26] text-white" : "bg-slate-100 text-slate-500"}`}>{badgeVal}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Tab content */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6">

                {/* Overview */}
                {activeTab === "Overview" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Trip Interest</h2>
                      <div className="flex flex-col gap-4 border border-[#e7e1d5]/55 rounded-2xl overflow-hidden p-3.5 bg-[#FAF8F5]/20">
                        <div className="relative w-full h-36 rounded-xl overflow-hidden">
                          <img src={leadData.trips?.image_url || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80"} alt={leadData.trips?.title} className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-2 text-white text-[8px] font-black bg-black/60 px-2 py-0.5 rounded-md">{leadData.trips?.destination || "Destination"}</div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase text-slate-800">{leadData.trips?.title || "General Enquiry"}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[9px] font-bold text-slate-500">
                            <div><span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Seats Left</span><span className="text-slate-700 font-extrabold">{leadData.trips?.seats_left ?? "—"} / {leadData.trips?.total_seats ?? "—"}</span></div>
                            <div><span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Group Size</span><span className="text-slate-700 font-extrabold">{leadData.group_size || "—"}</span></div>
                            <div><span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Group Type</span><span className="text-slate-700 font-extrabold capitalize">{leadData.group_type || "—"}</span></div>
                          </div>
                          <Link href={`/manager/trips/${leadData.trips?.id || ""}`} className="inline-block px-3 py-1.5 bg-white hover:bg-slate-50 text-[#FF5B26] text-[10px] font-bold border border-[#FF5B26] rounded-xl no-underline shadow-2xs">View Trip</Link>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-5">
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Requirements</h2>
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                        <div><div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Group Type</div><div className="mt-1 text-slate-800 font-bold">{leadData.group_type || "N/A"}</div></div>
                        <div><div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Preferred Month</div><div className="mt-1 text-slate-800 font-bold">{leadData.preferred_month || "N/A"}</div></div>
                        <div><div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Wants Trip to Feel</div><div className="mt-1 text-slate-800 font-bold">{leadData.hope_trip_feels_like || "N/A"}</div></div>
                        <div><div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Special Requests</div><div className="mt-1 text-slate-800 font-bold text-rose-600">{leadData.dietary_and_accessibility || "None"}</div></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks — read-only list */}
                {activeTab === "Tasks" && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Workflow Tasks</h2>
                      <span className="text-[10px] text-slate-400 font-bold">Complete via Next Action panel →</span>
                    </div>
                    <div className="divide-y divide-slate-100 bg-[#FAF8F5]/30 border border-[#e7e1d5]/55 rounded-2xl p-4 space-y-1 max-h-[400px] overflow-y-auto">
                      {tasks.length === 0 ? (
                        <p className="py-6 text-center text-[11px] font-bold text-slate-400">No tasks yet. Tasks are auto-generated as the workflow progresses.</p>
                      ) : (
                        tasks.sort((a, b) => (a.step || 0) - (b.step || 0)).map((t) => (
                          <div key={t.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-black ${t.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : nextActionTask?.id === t.id ? "bg-[#FFEFEA] text-[#FF5B26] border-[#FFD3C4]" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                                {t.status === "completed" ? "✓" : t.step || "·"}
                              </div>
                              <div>
                                <span className={`text-xs font-bold ${t.status === "completed" ? "line-through text-slate-400" : "text-slate-800"}`}>{t.title}</span>
                                {t.due_date && <div className="text-[9px] text-slate-400 font-semibold mt-0.5">Due: {formatDate(t.due_date)}</div>}
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${t.status === "completed" ? "bg-emerald-50 text-emerald-700" : nextActionTask?.id === t.id ? "bg-[#FFEFEA] text-[#FF5B26]" : "bg-slate-100 text-slate-500"}`}>
                              {t.status === "completed" ? "Done" : nextActionTask?.id === t.id ? "Active" : "Pending"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {activeTab === "Notes" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Log Note</h2>
                    </div>
                    <form onSubmit={handleAddNoteSubmit} className="space-y-3">
                      <textarea required rows={3} placeholder="Log a client interaction or note requirements..." value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} className="w-full px-4 py-3 bg-[#FAF8F4]/30 border border-[#e7e1d5]/55 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#FF5B26]/30 transition-all resize-none text-slate-800 placeholder-slate-400" />
                      <div className="flex justify-end">
                        <button type="submit" disabled={addingNote || !newNoteText.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-xs border-0 cursor-pointer">
                          {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Log Note
                        </button>
                      </div>
                    </form>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto scrollbar-none">
                      {!leadData.lead_notes || leadData.lead_notes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e7e1d5]/50 bg-slate-50/50 px-4 py-6 text-xs text-slate-400 text-center font-semibold">No notes logged yet.</div>
                      ) : (
                        [...leadData.lead_notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((note) => {
                          const noteText = note.note_text || "";
                          const { title: noteTitle, description: noteDesc } = getLeadNoteDisplay(noteText);
                          const { iconColor, Icon } = getLeadNoteVisual(noteText);
                          const authorLabel = getLeadNoteAuthorLabel(note, usersById);
                          return (
                            <div key={note.id} className="rounded-2xl border border-[#e7e1d5]/55 bg-[#FAF8F5]/20 p-4 space-y-2 text-left text-xs">
                              <div className="flex items-center justify-between text-slate-500 font-bold text-[10px]">
                                <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3 text-slate-400" />{formatDateTime(note.created_at)}</span>
                                <span className="uppercase tracking-wider">{authorLabel}</span>
                              </div>
                              <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${iconColor}`}>
                                <Icon className="w-3.5 h-3.5" />{noteTitle}
                              </div>
                              <p className="text-slate-700 font-semibold leading-relaxed break-all">{noteDesc}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Activity */}
                {activeTab === "Activity" && (
                  <div className="space-y-4 text-left">
                    <div className="border-b border-slate-100 pb-2"><h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Activity History</h2></div>
                    <div className="bg-[#FAF8F5]/30 border border-[#e7e1d5]/55 rounded-2xl p-4 max-h-[360px] overflow-y-auto">
                      <div className="space-y-4">
                        {timelineEvents.map((event, idx) => (
                          <div key={idx} className="flex gap-3 text-xs">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border border-white ${event.iconBg}`}>
                              <event.icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-800">{event.title}</div>
                              <div className="text-[10px] text-slate-400 font-bold mt-0.5">{event.date} · {event.subtitle}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Timeline Card */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Activity Timeline</h2>
                  <Link href={`/manager/activity?search=${encodeURIComponent(leadData.name)}`} className="text-xs font-bold text-[#FF5B26] hover:underline no-underline">View All</Link>
                </div>
                <div className="space-y-5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100 pl-1 max-h-[380px] overflow-y-auto scrollbar-none">
                  {timelineEvents.slice(0, 6).map((event, idx) => (
                    <div key={idx} className="flex gap-3.5 relative z-10 text-xs items-start">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border border-white shadow-xs ${event.iconBg}`}>
                        <event.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="pt-0.5 space-y-0.5 min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-800">{event.title}</div>
                        <div className="text-[10px] text-slate-400 font-bold leading-normal break-all">{event.subtitle}</div>
                        <div className="text-[8px] text-slate-400 font-medium">{event.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="xl:col-span-4 space-y-6">

          {/* Contact Info */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Contact</h2>
            <div className="mt-5 space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between gap-3 text-slate-700">
                <div className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-slate-400" /><span>{leadData.phone || "No phone"}</span></div>
                <div className="flex items-center gap-1.5">
                  <a href={callHref} onClick={() => logInteraction("call")} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border-0 flex items-center justify-center shrink-0 shadow-2xs" title="Call">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a href={whatsAppHref} onClick={() => logInteraction("whatsapp")} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border-0 flex items-center justify-center shrink-0 shadow-2xs" title="WhatsApp">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-slate-700 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2.5 truncate max-w-[200px]"><Mail className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{leadData.email}</span></div>
                <a href={gmailHref} onClick={() => logInteraction("email")} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border-0 flex items-center justify-center shrink-0 shadow-2xs">
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 border-t border-slate-100 pt-4">
                <MapPin className="w-4 h-4 text-slate-400" /><span>{leadLocation}</span>
              </div>
            </div>
          </div>

          {/* Next Action */}
          <div className="bg-[#FFF9F6] rounded-3xl border border-[#FF5B26]/15 shadow-xs p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-orange-100/50 pb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Next Action</h2>
                {nextActionTask && (
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Step {nextActionTask.step} of 7 — {nextActionTask.title}
                  </p>
                )}
              </div>
              {nextActionTask && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 border ${nextActionTask.priority === "High" ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                  {nextActionTask.priority || "Medium"}
                </span>
              )}
            </div>
            {renderNextActionContent()}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <a href={callHref} onClick={() => logInteraction("call")} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center gap-2.5 no-underline">
                <Phone className="w-4 h-4 text-blue-600 shrink-0" />Call Traveller
              </a>
              <a href={whatsAppHref} onClick={() => logInteraction("whatsapp")} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center gap-2.5 no-underline">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />WhatsApp
              </a>
              <a href={gmailHref} onClick={() => logInteraction("email")} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center gap-2.5 no-underline">
                <Mail className="w-4 h-4 text-red-500 shrink-0" />Send Email
              </a>
              <button onClick={handleAddNoteClick} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center gap-2.5 bg-white text-left">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />Add Note
              </button>
              <Link href={`/manager/trips/${leadData.trips?.id || ""}`} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center gap-2.5 no-underline col-span-2">
                <CalendarDays className="w-4 h-4 text-purple-600 shrink-0" />View Trip Details
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleTask && (
        <div className="fixed inset-0 z-50 bg-[#FAF8F5]/10 backdrop-blur-xs flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-150 overflow-hidden text-xs">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 text-left">
              <div><h2 className="text-sm font-extrabold text-slate-900">Reschedule Task</h2><p className="text-[10px] text-slate-400 mt-0.5">Select a new date/time.</p></div>
              <button onClick={() => setRescheduleTask(null)} className="text-slate-300 hover:text-slate-500 font-bold border-0 bg-transparent cursor-pointer text-sm">✕</button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4 text-left font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">New Date & Time</label>
                <input type="datetime-local" required value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs bg-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setRescheduleTask(null)} className="px-4 py-2 border border-slate-200 bg-white rounded-xl font-bold cursor-pointer hover:bg-slate-50 text-slate-600">Cancel</button>
                <button type="submit" disabled={rescheduling} className="px-4 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white rounded-xl font-bold cursor-pointer shadow-xs border-0 disabled:opacity-50">
                  {rescheduling ? "Saving..." : "Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
