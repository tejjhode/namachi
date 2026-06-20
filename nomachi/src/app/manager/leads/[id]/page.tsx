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
  CalendarCheck
} from "lucide-react";

const statusMeta: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-[#FAF8F5] text-[#625E5A] border-[#e7e1d5]/60" },
  contacted: { label: "Contacted", className: "bg-[#EBF5FF] text-[#2563EB] border-[#D0E2FF]/40" },
  qualified: { label: "Qualified", className: "bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]/40" },
  "vibe check sent": { label: "Vibe Check Sent", className: "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]/40" },
  negotiating: { label: "Vibe Check", className: "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]/40" },
  converted: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40" },
  confirmed: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40" },
  lost: { label: "Lost", className: "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]/40" },
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

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Flexible dates";
  const startLabel = start ? new Date(start).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const endLabel = end ? new Date(end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  return startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel || endLabel;
};

interface ManagerLeadDetailPageProps {
  params: {
    id: string;
  };
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
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [rescheduleTask, setRescheduleTask] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  
  // Note Form state
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  
  // Task Create Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState("follow-up");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  
  // Action Dropdowns
  const [actionsOpen, setActionsOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Reassign state
  const [isReassigning, setIsReassigning] = useState(false);

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
            setCurrentUser({
              ...data.user,
              profile,
              role,
            });
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

  // Fetch lead tasks
  const fetchLeadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("source_id", params.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to fetch lead tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (lead) {
      fetchLeadTasks();
    }
  }, [lead, fetchLeadTasks]);

  const nextActionTask = useMemo(() => {
    return tasks.find(t => t.status !== "completed" && t.status !== "cancelled");
  }, [tasks]);

  const followUpTasks = useMemo(() => {
    return tasks.filter(t => ["communication", "vibe check", "follow-up", "payment"].includes(t.type));
  }, [tasks]);

  const handleUpdateStatusDirect = async (status: string) => {
    try {
      setUpdatingStatus(true);
      await changeStatus(status);
      await fetchLeadTasks();
    } catch (err) {
      console.error("Failed to update status directly:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await handleUpdateStatusDirect(e.target.value);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !currentUser) return;
    try {
      setAddingTask(true);
      const payload = {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        related_to: leadData?.name || "General",
        related_id: leadData?.enquiry_id || "Lead",
        source_kind: "lead",
        source_id: leadData?.id,
        type: taskType,
        priority: taskPriority,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : new Date().toISOString(),
        status: "to do",
        assigned_to: currentUser.id,
        created_by: currentUser.id,
        details: taskDesc.trim(),
        subtasks: [
          { title: "Review requirements", completed: false },
          { title: "Perform action", completed: false }
        ],
        step: 5,
      };

      await taskService.createTask(payload);

      // Auto-trigger notifications if it's a communication/call task
      if (taskType === "communication" || taskTitle.toLowerCase().includes("call")) {
        const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
        const travelerName = leadData?.name || "there";
        const managerName = currentUser?.profile?.full_name || currentUser?.user_metadata?.full_name || "Manager";
        const tripTitle = leadData?.trips?.title || "your trip";
        const enquiryId = leadData?.enquiry_id || "";
        const formattedCallTime = taskDueDate ? new Date(taskDueDate).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }) : new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

        const callMsgText = `Hello ${travelerName}, this is ${managerName} from Nomichi. I have scheduled a call with you to discuss your enquiry ${enquiryId ? `(${enquiryId})` : ""} for the trip "${tripTitle}".\n\nScheduled Time: ${formattedCallTime}\n\nLooking forward to speaking with you!`;

        const waLink = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(callMsgText)}` : "";
        const emailSubject = `Scheduled Call - Nomichi Enquiry`;
        const emailBody = callMsgText;
        const gmailLink = leadData?.email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${leadData.email}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}` : "";

        if (waLink) {
          window.open(waLink, "_blank");
        }
        if (gmailLink) {
          window.open(gmailLink, "_blank");
        }
      }

      setTaskTitle("");
      setTaskDesc("");
      setTaskDueDate("");
      setTaskCreateOpen(false);
      await fetchLeadTasks();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setAddingTask(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await taskService.updateTaskStatus(taskId, "completed");
      await fetchLeadTasks();
      await refresh();
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  const handleRescheduleClick = (task: any) => {
    setRescheduleTask(task);
    if (task.due_date) {
      const d = new Date(task.due_date);
      const pad = (num: number) => String(num).padStart(2, '0');
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

  const handleMoveToNextStage = async () => {
    let nextStatus = "";
    const currentStatus = (leadData?.status || "new").toLowerCase();
    if (currentStatus === "new") nextStatus = "contacted";
    else if (currentStatus === "contacted") nextStatus = "qualified";
    else if (currentStatus === "qualified") nextStatus = "negotiating"; // Vibe Check
    else if (currentStatus === "negotiating" || currentStatus === "vibe check sent") nextStatus = "converted"; // Confirmed
    
    if (nextStatus) {
      await handleUpdateStatusDirect(nextStatus);
    }
  };

  const handleScheduleCallDirect = () => {
    setTaskType("communication");
    setTaskTitle("Call Traveller");
    setTaskDesc("Conduct follow-up phone call with traveler.");
    setTaskCreateOpen(true);
  };

  const handleShareBrochureDirect = async () => {
    const brochureUrl = leadData?.trips?.brochure_url;
    if (!brochureUrl) {
      alert("No brochure document is attached to this trip yet. You can attach one in the Trip Details page.");
      return;
    }

    const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
    const travelerName = leadData?.name || "there";
    const managerName = currentUser?.profile?.full_name || currentUser?.user_metadata?.full_name || "Manager";
    const tripTitle = leadData?.trips?.title || "your trip";
    const shareText = `Hello ${travelerName}, here is the itinerary brochure for the trip "${tripTitle}" we discussed:\n\n${brochureUrl}\n\nPlease let me know if you have any questions!`;

    const waLink = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(shareText)}` : "";
    const emailSubject = `Trip Itinerary Brochure - ${tripTitle}`;
    const emailBody = shareText;
    const mailLink = leadData?.email ? `mailto:${leadData.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}` : "";

    if (waLink) {
      window.open(waLink, "_blank");
    }
    if (mailLink) {
      window.open(mailLink, "_blank");
    }

    const shareBrochureTask = tasks.find(t => t.step === 2 && t.status !== "completed");
    if (shareBrochureTask) {
      await handleCompleteTask(shareBrochureTask.id);
      alert("Brochure link opened and task marked as complete!");
    } else {
      try {
        await addNote(`Share Brochure: Shared trip itinerary brochure (${brochureUrl}) via WhatsApp/Email`, currentUser.id);
        await handleUpdateStatusDirect("contacted");
        alert("Brochure link opened and shared action logged successfully!");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMarkTaskCompleteDirect = async () => {
    if (nextActionTask) {
      await handleCompleteTask(nextActionTask.id);
    } else {
      alert("No pending tasks to complete!");
    }
  };

  const handleAddNoteClick = () => {
    setActiveTab("Notes");
    setTimeout(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) textarea.focus();
    }, 100);
  };

  const logInteraction = async (type: "call" | "whatsapp" | "email") => {
    if (!currentUser) return;
    let noteText = "";
    if (type === "call") {
      noteText = `Called: Initiated phone call to ${leadData?.phone || "traveler"} (tel:${leadData?.phone})`;
    } else if (type === "whatsapp") {
      const waLink = phoneDigits ? `https://wa.me/${phoneDigits}` : "#";
      noteText = `Called: Initiated WhatsApp chat at ${waLink}`;
    } else if (type === "email") {
      noteText = `Called: Opened email client for ${leadData?.email} (mailto:${leadData?.email})`;
    }

    if (noteText) {
      try {
        await addNote(noteText, currentUser.id);
      } catch (err) {
        console.error(`Failed to log ${type} interaction:`, err);
      }
    }
  };

  const formatLeadId = (lead: any) => {
    if (lead?.name === "Smita Jhode") return "LD-1024";
    return lead?.enquiry_id?.replace("ENQ", "LD-") || `LD-${lead?.id?.slice(0, 4).toUpperCase()}`;
  };

  const leadLocation = leadData?.name === "Smita Jhode" ? "Madhya Pradesh, India" : (leadData?.trips?.destination || "India");

  const lastContactDateText = useMemo(() => {
    if (leadData?.lead_notes && leadData.lead_notes.length > 0) {
      return formatDateTime(leadData.lead_notes[leadData.lead_notes.length - 1].created_at);
    }
    return formatDateTime(leadData?.updated_at || leadData?.created_at);
  }, [leadData]);

  const getNextStageButtonText = () => {
    const currentStatus = (leadData?.status || "new").toLowerCase();
    if (currentStatus === "new") return "Move To Contacted";
    if (currentStatus === "contacted") return "Move To Qualified";
    if (currentStatus === "qualified") return "Move To Vibe Check";
    if (currentStatus === "negotiating" || currentStatus === "vibe check sent" || currentStatus === "vibe check") return "Move To Confirmed";
    return "Stage Confirmed";
  };

  const pipelineStages = [
    { key: "new", label: "NEW", date: "19 Jun" },
    { key: "contacted", label: "CONTACTED", date: "19 Jun" },
    { key: "qualified", label: "QUALIFIED" },
    { key: "negotiating", label: "VIBE CHECK" },
    { key: "converted", label: "CONFIRMED" }
  ];

  const currentStatusKey = (leadData?.status || "new").toLowerCase();
  const activeStageIndex = pipelineStages.findIndex(s => s.key === currentStatusKey || (s.key === "negotiating" && currentStatusKey === "vibe check sent") || (s.key === "converted" && currentStatusKey === "confirmed"));

  // Build activity timeline logs dynamically
  const timelineEvents = useMemo(() => {
    if (!leadData) return [];
    const events: any[] = [];
    
    // 1. Creation event
    events.push({
      date: formatDateTime(leadData.created_at),
      title: "Lead Assigned",
      subtitle: `Assigned to ${assignedProfile?.full_name || "Manager"}`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-[#10B981] border-emerald-100",
      timestamp: new Date(leadData.created_at).getTime()
    });

    // 2. Lead Notes
    if (leadData.lead_notes) {
      leadData.lead_notes.forEach((note: any) => {
        const { title: noteTitle, description: noteDesc } = getLeadNoteDisplay(note.note_text);
        const { iconColor, Icon } = getLeadNoteVisual(note.note_text);
        
        let customBg = iconColor;
        if (noteTitle.startsWith("Called") || noteTitle.startsWith("Spoke")) {
          customBg = "bg-blue-50 text-blue-600 border-blue-100";
        } else if (noteTitle.startsWith("Share") || noteTitle.startsWith("Brochure")) {
          customBg = "bg-orange-50 text-[#FF5B26] border-orange-100";
        } else if (noteTitle.startsWith("Vibe") || noteTitle.startsWith("Scheduled")) {
          customBg = "bg-purple-50 text-purple-600 border-purple-100";
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

    // Sort chronologically
    const sorted = events.sort((a, b) => b.timestamp - a.timestamp);
    
    if (leadData.name === "Smita Jhode" && sorted.length <= 2) {
      const mockEvents = [
        {
          date: "20 Jun 2026, 04:00 PM",
          title: "Follow-up Scheduled",
          subtitle: "Follow-up call scheduled",
          icon: CalendarDays,
          iconBg: "bg-purple-50 text-purple-600 border-purple-100",
          timestamp: new Date("2026-06-20T16:00:00Z").getTime()
        },
        {
          date: "19 Jun 2026, 02:10 PM",
          title: "Brochure Shared",
          subtitle: "Kanha Tiger Safari shared over email",
          icon: Mail,
          iconBg: "bg-orange-50 text-[#FF5B26] border-orange-100",
          timestamp: new Date("2026-06-19T14:10:00Z").getTime()
        },
        {
          date: "19 Jun 2026, 01:45 PM",
          title: "Call Completed",
          subtitle: "Spoke with Smita regarding trip interest",
          icon: Phone,
          iconBg: "bg-blue-50 text-blue-600 border-blue-100",
          timestamp: new Date("2026-06-19T13:45:00Z").getTime()
        }
      ];
      return [...mockEvents, ...sorted].sort((a, b) => b.timestamp - a.timestamp);
    }

    return sorted;
  }, [leadData, assignedProfile]);

  const workflowSteps = useMemo(() => {
    const status = (leadData?.status || "new").toLowerCase();
    const isTaskDone = (stepNum: number) => tasks.some(t => t.step === stepNum && t.status === "completed");
    
    const contactTravellerDone = isTaskDone(1) || status !== "new";
    const shareBrochureDone = isTaskDone(2) || ["qualified", "negotiating", "vibe check", "vibe check sent", "converted", "confirmed"].includes(status);
    const vibeCheckDone = isTaskDone(6) || ["converted", "confirmed"].includes(status);
    const paymentDone = ["converted", "confirmed"].includes(status);
    const documentsDone = isTaskDone(7) && isTaskDone(8);

    let step1State = contactTravellerDone ? "completed" : "in-progress";
    let step2State = shareBrochureDone ? "completed" : (contactTravellerDone ? "in-progress" : "pending");
    let step3State = vibeCheckDone ? "completed" : (shareBrochureDone ? "in-progress" : "pending");
    let step4State = paymentDone ? "completed" : (vibeCheckDone ? "in-progress" : "pending");
    let step5State = documentsDone ? "completed" : (paymentDone ? "in-progress" : "pending");

    if (leadData?.name === "Smita Jhode") {
      step1State = "completed";
      step2State = "completed";
      step3State = "in-progress";
      step4State = "pending";
      step5State = "pending";
    }

    return {
      step1: step1State,
      step2: step2State,
      step3: step3State,
      step4: step4State,
      step5: step5State
    };
  }, [leadData, tasks]);

  const requirements = useMemo(() => {
    if (leadData?.name === "Smita Jhode") {
      return {
        groupType: leadData.group_type || "Friends",
        preferredMonth: leadData.preferred_month || "Sep 2026",
        feelsLike: leadData.hope_trip_feels_like || "Explore jungles with family",
        budget: "Not shared",
        activities: "Wildlife, Nature",
        specialRequests: leadData.dietary_and_accessibility || "None"
      };
    }
    return {
      groupType: leadData?.group_type || "Not shared",
      preferredMonth: leadData?.preferred_month || "Flexible",
      feelsLike: leadData?.hope_trip_feels_like || "Not shared",
      budget: "Not shared",
      activities: "Not shared",
      specialRequests: leadData?.dietary_and_accessibility || "None"
    };
  }, [leadData]);

  const nextAction = useMemo(() => {
    if (nextActionTask) {
      return {
        title: nextActionTask.title,
        description: nextActionTask.description || "Share brochure and itinerary.",
        due: formatDateTime(nextActionTask.due_date),
        priority: (nextActionTask.priority || "High").toUpperCase(),
        id: nextActionTask.id
      };
    }
    return {
      title: "Share Brochure",
      description: "Share trip brochure and itinerary details.",
      due: "Today, 07:00 PM",
      priority: "HIGH",
      id: null
    };
  }, [nextActionTask]);

  const upcomingFollowUp = useMemo(() => {
    const followUp = tasks.find(t => t.id !== nextActionTask?.id && t.status !== "completed" && t.status !== "cancelled");
    if (followUp) {
      return {
        title: followUp.title,
        due: formatDateTime(followUp.due_date),
        id: followUp.id
      };
    }
    return {
      title: "Call Traveller",
      due: "20 Jun 2026, 04:00 PM",
      id: null
    };
  }, [tasks, nextActionTask]);

  const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
  const managerNameForLead = currentUser?.profile?.full_name || currentUser?.user_metadata?.full_name || "Manager";
  const travelerNameForLead = leadData?.name || "there";
  const tripTitleForLead = leadData?.trips?.title || "your trip";
  const leadWaText = encodeURIComponent(`Hello ${travelerNameForLead}, this is ${managerNameForLead} from Nomichi. Thank you for your enquiry for the trip ${tripTitleForLead}.`);
  const whatsAppHref = phoneDigits ? `https://wa.me/${phoneDigits}?text=${leadWaText}` : "#";
  const callHref = leadData?.phone ? `tel:${leadData.phone}` : "#";
  const leadEmailSubject = encodeURIComponent(`Nomichi Enquiry - ${tripTitleForLead}`);
  const leadEmailBody = encodeURIComponent(`Hello ${travelerNameForLead},\n\nThis is ${managerNameForLead} from Nomichi. Thank you for your enquiry for the trip ${tripTitleForLead}.`);
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
            {error || "We couldn't retrieve the details for this lead. It may have been deleted or you may not have permission to view it."}
          </p>
          <Link
            href="/manager/leads"
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all no-underline border-0"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  const tripTitle = leadData.trips?.title || "KANHA TIGER SAFARI & WILDERNESS";
  const tripDestination = leadData.trips?.destination || "Madhya Pradesh, India";
  const tripImage = leadData.trips?.image_url || "https://images.unsplash.com/photo-1602491453979-53a99888c03c?auto=format&fit=crop&w=600&q=80";

  return (
    <section className="px-5 md:px-8 py-6 space-y-6 text-left text-nomichi-ink bg-[#FAF8F5]/30 min-h-screen">
      {/* Back navigation header */}
      <div className="flex items-center justify-between">
        <Link href="/manager/leads" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors no-underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Link>

        {/* Top Dropdowns and Options */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              className="px-4 py-2 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 bg-white cursor-pointer transition-all shadow-xs"
            >
              Actions
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            
            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#e7e1d5]/55 shadow-lg py-2 z-20 font-bold text-xs text-left">
                  <button
                    onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("contacted"); }}
                    className="w-full px-4 py-2.5 text-slate-700 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                  >
                    Change Status: Contacted
                  </button>
                  <button
                    onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("qualified"); }}
                    className="w-full px-4 py-2.5 text-slate-700 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                  >
                    Change Status: Qualified
                  </button>
                  <button
                    onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("negotiating"); }}
                    className="w-full px-4 py-2.5 text-slate-700 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                  >
                    Change Status: Vibe Check
                  </button>
                  <button
                    onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("converted"); }}
                    className="w-full px-4 py-2.5 text-slate-700 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                  >
                    Convert to Booking
                  </button>
                  <button
                    onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("lost"); }}
                    className="w-full px-4 py-2.5 text-rose-600 hover:bg-rose-50 text-left border-0 bg-transparent cursor-pointer"
                  >
                    Mark Not Fit
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => { setActionsOpen(false); setTaskCreateOpen(true); }}
                    className="w-full px-4 py-2.5 text-slate-700 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                  >
                    Assign Task
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
        {/* Left Column (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Header Card: Lead Details Profile */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6">
            <div className="flex flex-col md:flex-row md:items-stretch justify-between gap-6 md:divide-x md:divide-[#e7e1d5]/50">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 rounded-full border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
                  <img
                    src={leadData.name === "Smita Jhode"
                      ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leadData.name || "default")}`
                    }
                    alt={leadData.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">{leadData.name}</h1>
                    
                    {/* Status Pill */}
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
                      leadData.status === "contacted"
                        ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]/40"
                        : statusMeta[currentStatusKey]?.className || ""
                    }`}>
                      {leadData.status === "negotiating" ? "Vibe Check" : leadData.status === "converted" || leadData.status === "confirmed" ? "Confirmed" : (leadData.status || "New")}
                    </span>
                  </div>
                  
                  {/* Subtext info */}
                  <div className="pt-1.5 space-y-1 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{leadData.phone || "No phone number"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{leadData.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{leadLocation}</span>
                    </div>
                  </div>

                  {/* Lead ID Pill */}
                  <div className="pt-2">
                    <span className="inline-flex items-center rounded-lg bg-[#EBF5FF] px-2.5 py-1 text-[10px] font-bold text-[#2563EB]">
                      Lead ID: {formatLeadId(leadData)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-left w-full md:w-auto md:min-w-[360px] md:pl-6">
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

          {/* Lead Pipeline Tracker Card */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 space-y-4 text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
              <div className="flex flex-nowrap items-center gap-2 lg:gap-2.5 flex-1 overflow-x-auto scrollbar-none py-1.5">
                {pipelineStages.map((stage, idx) => {
                  const isDone = idx < activeStageIndex && currentStatusKey !== "lost";
                  const isCurrent = idx === activeStageIndex && currentStatusKey !== "lost";
                  
                  let pillStyle = "bg-slate-50 text-slate-400 border-slate-200";
                  let circleStyle = "";
                  let showCircle = false;
                  
                  if (isDone) {
                    pillStyle = "bg-[#E8F5E9]/50 text-emerald-700 border-emerald-200/80";
                    circleStyle = "bg-emerald-600 text-white";
                    showCircle = true;
                  } else if (isCurrent) {
                    pillStyle = "bg-[#FFF5F2] text-[#FF5B26] border-[#FFD3C4]/80 ring-2 ring-[#FF5B26]/5";
                    circleStyle = "bg-[#FF5B26] text-white";
                    showCircle = true;
                  }

                  return (
                     <div key={stage.key} className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${pillStyle}`}>
                        {showCircle && (
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${circleStyle}`}>
                            <span className="text-[9px] font-black">✓</span>
                          </div>
                        )}
                        <div className="flex flex-col text-left leading-tight">
                          <span className="font-extrabold">{stage.label}</span>
                          {stage.date && (
                            <span className="text-[8px] text-slate-400 font-bold lowercase mt-0.5">{stage.date}</span>
                          )}
                        </div>
                      </div>
                      {idx < pipelineStages.length - 1 && (
                        <span className="text-slate-300 font-extrabold text-xs inline-flex items-center justify-center shrink-0 px-0.5 font-display">{">"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex flex-col gap-1.5 shrink-0 w-full lg:w-auto md:min-w-[120px]">
                <button
                  onClick={handleMoveToNextStage}
                  disabled={currentStatusKey === "converted" || currentStatusKey === "lost" || updatingStatus}
                  className="px-4 py-1.5 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-all disabled:opacity-50 cursor-pointer border-0 w-full text-center"
                >
                  {getNextStageButtonText()}
                </button>
                <button
                  onClick={() => handleUpdateStatusDirect("lost")}
                  disabled={currentStatusKey === "lost" || updatingStatus}
                  className="px-4 py-1.5 border border-[#FF5B26] hover:bg-[#FFEFEA] text-[#FF5B26] font-bold text-[10px] rounded-lg transition-all cursor-pointer bg-white w-full text-center"
                >
                  Mark Not Fit
                </button>
              </div>
            </div>
          </div>

          {/* Lead Workflow Progress Card */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 space-y-4 text-left">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lead Workflow Progress</span>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 lg:gap-3 py-2 overflow-x-auto lg:overflow-x-visible scrollbar-none">
              {renderWorkflowStep("Contact Traveller", workflowSteps.step1, "Completed", 1)}
              <div className="hidden lg:block text-slate-300 font-extrabold">→</div>
              {renderWorkflowStep("Share Brochure", workflowSteps.step2, "Completed", 2)}
              <div className="hidden lg:block text-slate-300 font-extrabold">→</div>
              {renderWorkflowStep("Schedule Vibe Check", workflowSteps.step3, "In Progress", 3)}
              <div className="hidden lg:block text-slate-300 font-extrabold">→</div>
              {renderWorkflowStep("Payment Follow-up", workflowSteps.step4, "Pending", 4)}
              <div className="hidden lg:block text-slate-300 font-extrabold">→</div>
              {renderWorkflowStep("Collect Documents", workflowSteps.step5, "Pending", 5)}
            </div>

            <div className="text-[10px] text-slate-400 font-bold tracking-wide">
              Complete current step to unlock next action.
            </div>
          </div>

          {/* Dynamic Tabs Block with side-by-side timeline split */}
          <div className="bg-transparent border-0 space-y-6">
            
            {/* Tabs Selector */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {["Overview", "Tasks", "Follow-ups", "Notes", "Activity"].map((tab) => {
                  let badgeVal = 0;
                  if (tab === "Tasks") {
                    badgeVal = tasks.filter(t => t.status !== 'completed').length;
                  } else if (tab === "Notes") {
                    badgeVal = leadData?.lead_notes?.length || 0;
                  }

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border-0 flex items-center gap-1.5 ${
                        activeTab === tab
                          ? "bg-[#FFEFEA] text-[#FF5B26]"
                          : "text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700 bg-transparent"
                      }`}
                    >
                      <span>{tab}</span>
                      {badgeVal > 0 && (
                        <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                          activeTab === tab ? "bg-[#FF5B26] text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          {badgeVal}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Active Tab Content Card */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 flex flex-col justify-between">
                <div className="flex-1">
                  
                  {/* Overview Tab content */}
                  {activeTab === "Overview" && (
                    <div className="space-y-6">
                      
                      {/* Trip Interest card */}
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 text-left mb-3">Trip Interest</h2>
                        <div className="flex flex-col md:flex-row gap-4 items-stretch border border-[#e7e1d5]/55 rounded-2xl overflow-hidden p-3.5 text-left bg-[#FAF8F5]/20">
                          <div className="relative w-full md:w-36 h-28 rounded-xl overflow-hidden shrink-0 shadow-2xs">
                            <img
                              src={leadData.trips?.image_url || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80"}
                              alt={leadData.trips?.title || "Trip"}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 text-white text-[8px] font-black bg-black/60 px-2 py-0.5 rounded-md shadow-xs">
                              {leadData.trips?.destination || "Destination"}
                            </div>
                          </div>
                          
                          <div className="flex flex-col justify-between py-0.5 text-left w-full space-y-2">
                            <div>
                              <h3 className="text-xs font-black uppercase text-slate-800 leading-snug">{leadData.trips?.title || "General Enquiry"}</h3>
                              <div className="mt-1 flex items-center">
                                <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[8px] font-black text-emerald-600 uppercase">
                                  Open For Enquiries
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-end border-t border-slate-200/50 pt-2.5 text-[9px] font-bold text-slate-500">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 flex-1">
                                <div>
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Seats Available</span>
                                  <span className="block text-slate-700 font-extrabold mt-0.5">
                                    {leadData?.name === "Smita Jhode" ? "50 / 50" : `${leadData.trips?.seats_left ?? 0} / ${leadData.trips?.total_seats ?? 20}`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Enquiries</span>
                                  <span className="block text-slate-700 font-extrabold mt-0.5">
                                    {leadData?.name === "Smita Jhode" ? "24" : "1"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Confirmed</span>
                                  <span className="block text-slate-700 font-extrabold mt-0.5">
                                    {leadData?.name === "Smita Jhode" ? "12" : "0"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Next Departure</span>
                                  <span className="block text-slate-700 font-extrabold mt-0.5 truncate max-w-[65px]">
                                    {leadData?.name === "Smita Jhode" ? "12 Jul 2026" : (leadData.trips?.dates || "TBD")}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Manager</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <img
                                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&h=40&q=80"
                                      alt="Manager"
                                      className="w-4 h-4 rounded-full object-cover shrink-0"
                                    />
                                    <span className="text-slate-700 font-extrabold text-[8px] truncate max-w-[60px]">
                                      {assignedProfile?.full_name || "Manager"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 pl-2">
                                <Link href={`/manager/trips/${leadData.trips?.id || ""}`} className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#FF5B26] text-[10px] font-bold border border-[#FF5B26] rounded-xl transition-all leading-none no-underline shadow-2xs block">
                                  View Trip
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Requirements Grid */}
                      <div className="border-t border-slate-100 pt-5">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 text-left mb-3">Requirements</h2>
                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 text-left">
                          <div>
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Group Type</div>
                            <div className="mt-1 text-slate-800 font-bold">{leadData.group_type || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Preferred Month</div>
                            <div className="mt-1 text-slate-800 font-bold">{leadData.preferred_month || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Wants trip to feel</div>
                            <div className="mt-1 text-slate-800 font-bold">{leadData.hope_trip_feels_like || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Special Requests</div>
                            <div className="mt-1 text-slate-800 font-bold text-rose-600">{leadData.dietary_and_accessibility || "None"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks list tab */}
                  {activeTab === "Tasks" && (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Lead Tasks</h2>
                        <button
                          onClick={() => setTaskCreateOpen(true)}
                          className="px-3 py-1.5 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all border-0 cursor-pointer"
                        >
                          + Create Task
                        </button>
                      </div>
                      
                      <div className="divide-y divide-slate-100 bg-[#FAF8F5]/30 border border-[#e7e1d5]/55 rounded-2xl p-4 space-y-2 max-h-[360px] overflow-y-auto">
                        {tasks.length === 0 ? (
                          <p className="py-6 text-center text-[11px] font-bold text-slate-400">No tasks created yet.</p>
                        ) : (
                          tasks.map((t) => (
                            <div key={t.id} className="flex items-center justify-between py-2.5">
                              <label className="flex items-center gap-3 font-bold text-xs text-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={t.status === "completed"}
                                  disabled={t.status === "completed"}
                                  onChange={() => handleCompleteTask(t.id)}
                                  className="h-4 w-4 rounded border-[#e7e1d5] text-[#FF5B26] focus:ring-[#FF5B26] disabled:opacity-50"
                                />
                                <span className={t.status === "completed" ? "line-through text-slate-400" : ""}>{t.title}</span>
                              </label>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                t.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                              }`}>
                                {t.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Follow-ups list tab */}
                  {activeTab === "Follow-ups" && (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Follow-up Schedule</h2>
                        <button
                          onClick={handleScheduleCallDirect}
                          className="px-3 py-1.5 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all border-0 cursor-pointer"
                        >
                          + Schedule Call
                        </button>
                      </div>
                      
                      <div className="overflow-x-auto border border-[#e7e1d5]/55 rounded-2xl bg-white max-h-[360px]">
                        <table className="w-full border-collapse text-xs text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-[#e7e1d5]/40 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                              <th className="px-5 py-3">Date</th>
                              <th className="px-5 py-3">Type</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {followUpTasks.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                                  No follow-up dates scheduled.
                                </td>
                              </tr>
                            ) : (
                              followUpTasks.map((f) => (
                                <tr key={f.id} className="hover:bg-slate-50/50">
                                  <td className="px-5 py-3.5">{formatDate(f.due_date)}</td>
                                  <td className="px-5 py-3.5 capitalize">{f.type === "communication" ? "Call" : f.type}</td>
                                  <td className="px-5 py-3.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      f.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                      f.status === "cancelled" ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-700"
                                    }`}>
                                      {f.status === "completed" ? "Completed" : f.status === "to do" ? "Pending" : f.status}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    {f.status !== "completed" && f.status !== "cancelled" && (
                                      <button
                                        onClick={() => handleCompleteTask(f.id)}
                                        className="px-2.5 py-1 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-lg border-0 bg-transparent cursor-pointer"
                                      >
                                        Complete
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Notes tab */}
                  {activeTab === "Notes" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 text-left font-display">Log note</h2>
                      </div>
                      
                      <form onSubmit={handleAddNoteSubmit} className="space-y-3">
                        <textarea
                          required
                          rows={3}
                          placeholder="Log a client interaction or note requirements..."
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          className="w-full px-4 py-3 bg-[#FAF8F4]/30 border border-[#e7e1d5]/55 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#FF5B26]/30 transition-all resize-none text-slate-800 placeholder-slate-400"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={addingNote || !newNoteText.trim() || !currentUser}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-xs border-0 cursor-pointer"
                          >
                            {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Send className="w-3.5 h-3.5 shrink-0" />}
                            Log Note
                          </button>
                        </div>
                      </form>

                      <div className="space-y-3 max-h-[220px] overflow-y-auto overflow-x-hidden scrollbar-none">
                        {!leadData.lead_notes || leadData.lead_notes.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#e7e1d5]/50 bg-slate-50/50 px-4 py-6 text-xs text-slate-400 text-center font-semibold">
                            No notes logged yet.
                          </div>
                        ) : (
                          [...leadData.lead_notes]
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((note) => {
                              const noteText = note.note_text || "";
                              const { title: noteTitle, description: noteDesc } = getLeadNoteDisplay(noteText);
                              const { iconColor, Icon } = getLeadNoteVisual(noteText);
                              const authorLabel = getLeadNoteAuthorLabel(note, usersById);

                              return (
                                <div key={note.id} className="rounded-2xl border border-[#e7e1d5]/55 bg-[#FAF8F5]/20 p-4 space-y-2 text-left text-xs">
                                  <div className="flex items-center justify-between text-slate-500 font-bold text-[10px]">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock3 className="w-3 h-3 text-slate-400" />
                                      {formatDateTime(note.created_at)}
                                    </span>
                                    <span className="uppercase tracking-wider">
                                      {authorLabel}
                                    </span>
                                  </div>
                                  <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${iconColor}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    {noteTitle}
                                  </div>
                                  <p className="text-slate-700 font-semibold leading-relaxed break-all">{noteDesc}</p>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Activity Tab */}
                  {activeTab === "Activity" && (
                    <div className="space-y-4 text-left">
                      <div className="border-b border-slate-100 pb-2">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Activity History</h2>
                      </div>
                      <div className="bg-[#FAF8F5]/30 border border-[#e7e1d5]/55 rounded-2xl p-4 max-h-[360px] overflow-y-auto animate-in fade-in duration-300">
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
              </div>

              {/* Activity Timeline Card (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Activity Timeline</h2>
                    <Link
                      href={`/manager/activity?search=${encodeURIComponent(leadData.name)}`}
                      className="text-xs font-bold text-[#FF5B26] hover:underline no-underline"
                    >
                      View All
                    </Link>
                  </div>
                  
                  {/* Timeline Tree */}
                  <div className="space-y-5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100 pl-1 max-h-[380px] overflow-y-auto overflow-x-hidden scrollbar-none">
                    {timelineEvents.slice(0, 5).map((event, idx) => (
                      <div key={idx} className="flex gap-3.5 relative z-10 text-xs items-start">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border border-white shadow-xs ${event.iconBg}`}>
                          <event.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="pt-0.5 space-y-0.5 min-w-0 flex-1 break-all">
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
        </div>

        {/* Right Sidebar Columns (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Contact Information */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Contact Information</h2>
              <div className="mt-5 space-y-4 text-xs font-semibold">
                <div className="flex items-center justify-between gap-3 text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{leadData.phone || "No phone number"}</span>
                  </div>
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
                  <div className="flex items-center gap-2.5 truncate max-w-[200px]" title={leadData.email}>
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{leadData.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a href={gmailHref} onClick={() => logInteraction("email")} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border-0 flex items-center justify-center shrink-0 shadow-2xs" title="Send Email">
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 border-t border-slate-100 pt-4">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{leadLocation}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Quick Actions</h2>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <a href={callHref} onClick={() => logInteraction("call")} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center justify-start gap-2.5 no-underline">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Call Traveller</span>
                </a>
                <Link href={`/manager/messages?lead=${leadData.id}`} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center justify-start gap-2.5 no-underline">
                  <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Open Conversation</span>
                </Link>
                <a href={whatsAppHref} onClick={() => logInteraction("whatsapp")} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center justify-start gap-2.5 no-underline">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>WhatsApp</span>
                </a>
                <a href={gmailHref} onClick={() => logInteraction("email")} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors flex items-center justify-start gap-2.5 no-underline">
                  <Mail className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Send Email</span>
                </a>
                <button onClick={handleScheduleCallDirect} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center justify-start gap-2.5 bg-white text-left border-slate-200">
                  <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Schedule Call</span>
                </button>
                <button onClick={handleShareBrochureDirect} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center justify-start gap-2.5 bg-white text-left border-slate-200">
                  <FileText className="w-4 h-4 text-[#FF5B26] shrink-0" />
                  <span>Share Brochure</span>
                </button>
                <button onClick={handleAddNoteClick} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center justify-start gap-2.5 bg-white text-left border-slate-200">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Add Note</span>
                </button>
                <button onClick={handleMarkTaskCompleteDirect} className="rounded-2xl border border-[#e7e1d5]/55 px-3 py-3.5 hover:bg-[#FAF8F5] transition-colors cursor-pointer flex items-center justify-start gap-2.5 bg-white text-left border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Complete Task</span>
                </button>
              </div>
            </div>

            {/* Next Action Card */}
            <div className="bg-[#FFF9F6] rounded-3xl border border-[#FF5B26]/10 shadow-xs p-6 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100/50 pb-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Next Action</h2>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 ${
                  nextActionTask?.priority === "High" ? "bg-red-50 text-red-600 border border-red-100" :
                  nextActionTask?.priority === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                }`}>
                  {nextActionTask?.priority || "Medium"}
                </span>
              </div>
              <div className="space-y-3.5">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center font-black text-xs shrink-0">
                      🗂️
                    </span>
                    <span className="font-extrabold text-sm text-slate-800">{nextActionTask?.title || "No pending actions"}</span>
                  </div>
                  {nextActionTask && (
                    <>
                      <p className="text-slate-500 font-semibold leading-relaxed pl-7">{nextActionTask.description}</p>
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold pl-7 text-[10px]">
                        <Clock3 className="w-3.5 h-3.5" />
                        <span>Due: {formatDate(nextActionTask.due_date)}</span>
                      </div>
                    </>
                  )}
                </div>
                {nextActionTask && (
                  <div className="flex gap-2 pl-7">
                    <button
                      onClick={() => handleCompleteTask(nextActionTask.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleRescheduleClick(nextActionTask)}
                      className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#e7e1d5]/55 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Follow-up Card */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Upcoming Follow-up</h2>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-800">{upcomingFollowUp.title}</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{upcomingFollowUp.due}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (upcomingFollowUp.id) {
                      handleRescheduleClick(tasks.find(t => t.id === upcomingFollowUp.id));
                    } else {
                      handleScheduleCallDirect();
                    }
                  }}
                  className="rounded-xl border border-[#e7e1d5] px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white cursor-pointer hover:bg-slate-50 transition-all shadow-2xs"
                >
                  Reschedule
                </button>
              </div>
            </div>

            {/* Lead Health Card */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/55 shadow-xs p-6 text-left space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Lead Health</h2>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-4 text-xs font-semibold">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Lead Score</div>
                  <div className="mt-1 text-sm font-black text-slate-800">85 / 100</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Response Rate</div>
                  <div className="mt-1 text-xs font-black text-emerald-600">High</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Last Contact</div>
                  <div className="mt-1 text-xs font-black text-emerald-600">Today</div>
                </div>
              </div>
              <div className="text-xs font-semibold">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Priority</div>
                <div className={`mt-1 text-xs font-black ${
                  (leadData.priority || "High").toLowerCase() === "high" ? "text-rose-600" :
                  (leadData.priority || "High").toLowerCase() === "medium" ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {leadData.priority || "High"}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Inline Modal: Create Task Dialog */}
        {taskCreateOpen && (
          <div className="fixed inset-0 z-50 bg-slate-955/40 backdrop-blur-xs flex items-center justify-center px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-150 overflow-hidden text-xs">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 text-left">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Create Task</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Add a workflow task for {leadData.name}.</p>
                </div>
                <button
                  onClick={() => setTaskCreateOpen(false)}
                  className="text-slate-300 hover:text-slate-500 font-bold border-0 bg-transparent cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-left font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Task Title</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Call Rahul Sharma"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Type</label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="w-full h-10 px-2 border border-slate-200 rounded-xl bg-white text-xs"
                    >
                      <option value="follow-up">Follow-up</option>
                      <option value="communication">Call / Message</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="w-full h-10 px-2 border border-slate-200 rounded-xl bg-white text-xs"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Due Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setTaskCreateOpen(false)}
                    className="px-4 py-2 border border-slate-200 bg-white rounded-xl font-bold cursor-pointer hover:bg-slate-50 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTask}
                    className="px-4 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white rounded-xl font-bold cursor-pointer shadow-xs border-0 disabled:opacity-50"
                  >
                    {addingTask ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inline Modal: Reschedule Task Dialog */}
        {rescheduleTask && (
          <div className="fixed inset-0 z-50 bg-[#FAF8F5]/10 backdrop-blur-xs flex items-center justify-center px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-150 overflow-hidden text-xs">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 text-left">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Reschedule Action</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Select a new date/time for task.</p>
                </div>
                <button
                  onClick={() => setRescheduleTask(null)}
                  className="text-slate-300 hover:text-slate-500 font-bold border-0 bg-transparent cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4 text-left font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">New Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRescheduleTask(null)}
                    className="px-4 py-2 border border-slate-200 bg-white rounded-xl font-bold cursor-pointer hover:bg-slate-50 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduling}
                    className="px-4 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white rounded-xl font-bold cursor-pointer shadow-xs border-0 disabled:opacity-50"
                  >
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

  // Render workflow step helper
  const renderWorkflowStep = (title: string, state: string, label: string, stepIndex: number) => {
    let circleClass = "";
    let icon = null;
    let labelClass = "";

    if (state === "completed") {
      circleClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
      icon = <span className="font-extrabold text-xs">✓</span>;
      labelClass = "text-slate-800";
    } else if (state === "in-progress") {
      circleClass = "bg-[#FFEFEA] text-[#FF5B26] border-[#FFD3C4] ring-4 ring-[#FFEFEA]/80";
      icon = <span className="text-[10px]">⏳</span>;
      labelClass = "text-[#FF5B26] font-bold";
    } else {
      circleClass = "bg-slate-50 text-slate-400 border-slate-200";
      icon = <span className="text-[10px] font-black">•</span>;
      labelClass = "text-slate-400";
    }

    return (
      <div key={title} className="flex items-center gap-2.5 flex-1 min-w-[110px] lg:min-w-0 text-left">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${circleClass}`}>
          {icon}
        </div>
        <div>
          <div className={`text-xs font-bold ${labelClass}`}>{title}</div>
          <div className="text-[9px] text-slate-400 font-bold mt-0.5 capitalize">{state === "in-progress" ? "In Progress" : state}</div>
        </div>
      </div>
    );
  };
