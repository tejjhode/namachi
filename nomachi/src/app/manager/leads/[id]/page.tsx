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
  Utensils,
  Smile,
  Compass,
  AlertCircle,
  Play,
  FileText,
  MessageSquare,
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
    const shareBrochureTask = tasks.find(t => t.step === 2 && t.status !== "completed");
    if (shareBrochureTask) {
      await handleCompleteTask(shareBrochureTask.id);
      alert("Brochure marked as shared, proceeding to next stage!");
    } else {
      try {
        await addNote("Share Brochure: Shared trip itinerary brochure via WhatsApp/Email", currentUser.id);
        await handleUpdateStatusDirect("contacted");
        alert("Brochure shared logged successfully!");
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

  const pipelineStages = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "qualified", label: "Qualified" },
    { key: "negotiating", label: "Vibe Check" },
    { key: "converted", label: "Confirmed" }
  ];

  const currentStatusKey = (leadData?.status || "new").toLowerCase();
  const activeStageIndex = pipelineStages.findIndex(s => s.key === currentStatusKey || (s.key === "negotiating" && currentStatusKey === "vibe check sent"));

  // Build activity timeline logs dynamically
  const timelineEvents = useMemo(() => {
    if (!leadData) return [];
    const events: any[] = [];
    
    // 1. Creation event
    events.push({
      date: formatDate(leadData.created_at),
      title: "Lead Created",
      subtitle: "By System",
      icon: Users,
      iconBg: "bg-[#FFF1EA] text-[#FF5B26]",
      timestamp: new Date(leadData.created_at).getTime()
    });

    // 2. Status change logs mapping
    if (leadData.updated_at && leadData.updated_at !== leadData.created_at) {
      events.push({
        date: formatDate(leadData.updated_at),
        title: `Status Updated to ${statusMeta[currentStatusKey]?.label || leadData.status}`,
        subtitle: "By Manager",
        icon: CheckCircle2,
        iconBg: "bg-[#ECFDF5] text-[#16A34A]",
        timestamp: new Date(leadData.updated_at).getTime()
      });
    }

    // 3. Lead Notes
    if (leadData.lead_notes) {
      leadData.lead_notes.forEach((note: any) => {
        const { title: noteTitle, description: noteDesc } = getLeadNoteDisplay(note.note_text);
        const { iconColor, Icon } = getLeadNoteVisual(note.note_text);
        events.push({
          date: formatDate(note.created_at),
          title: noteTitle,
          subtitle: noteDesc,
          icon: Icon,
          iconBg: iconColor,
          timestamp: new Date(note.created_at).getTime()
        });
      });
    }

    // Sort chronologically (newest first for CRM timeline feel)
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [leadData, currentStatusKey]);

  const phoneDigits = (leadData?.phone || "").replace(/[^0-9]/g, "");
  const whatsAppHref = phoneDigits ? `https://wa.me/${phoneDigits}` : "#";
  const callHref = leadData?.phone ? `tel:${leadData.phone}` : "#";
  const emailHref = leadData?.email ? `mailto:${leadData.email}` : "#";

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
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all no-underline"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="px-5 md:px-8 py-6 space-y-6 text-left text-nomichi-ink bg-[#FAF8F5]/20 min-h-screen">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/manager/leads" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-nomichi-ink/50 hover:text-nomichi-ink transition-colors">
          <ArrowLeft className="w-4 h-4 text-nomichi-ink/40" />
          Back to Leads
        </Link>

        {/* Lead Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActionsOpen(!actionsOpen)}
            className="px-4 py-2 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/80 font-bold text-xs rounded-xl flex items-center gap-2 bg-white cursor-pointer transition-all shadow-xs"
          >
            Actions
            <ChevronDown className="w-4 h-4 text-nomichi-ink/45" />
          </button>
          
          {actionsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#e7e1d5]/50 shadow-lg py-2 z-20 font-semibold text-xs text-left">
                <button
                  onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("contacted"); }}
                  className="w-full px-4 py-2 text-nomichi-ink hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                >
                  Change Status: Contacted
                </button>
                <button
                  onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("qualified"); }}
                  className="w-full px-4 py-2 text-nomichi-ink hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                >
                  Change Status: Qualified
                </button>
                <button
                  onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("negotiating"); }}
                  className="w-full px-4 py-2 text-nomichi-ink hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                >
                  Change Status: Vibe Check
                </button>
                <button
                  onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("converted"); }}
                  className="w-full px-4 py-2 text-nomichi-ink hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                >
                  Convert to Booking
                </button>
                <button
                  onClick={() => { setActionsOpen(false); handleUpdateStatusDirect("lost"); }}
                  className="w-full px-4 py-2 text-rose-600 hover:bg-rose-50 text-left border-0 bg-transparent cursor-pointer"
                >
                  Mark Not Fit
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => { setActionsOpen(false); setTaskCreateOpen(true); }}
                  className="w-full px-4 py-2 text-nomichi-ink hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                >
                  Assign Task
                </button>
                <button
                  onClick={() => { setActionsOpen(false); handleScheduleCallDirect(); }}
                  className="w-full px-4 py-2 text-nomichi-ink hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                >
                  Schedule Call
                </button>
                <button
                  onClick={() => { setActionsOpen(false); handleShareBrochureDirect(); }}
                  className="w-full px-4 py-2 text-nomichi-ink hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer"
                >
                  Share Brochure
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left main area */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Header Card: Lead Details Profile */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full border border-slate-200/80 bg-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leadData.name || "default")}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900">{leadData.name}</h1>
                    
                    {/* Status selection pill */}
                    <div className="relative inline-block">
                      <select
                        value={leadData.status || "new"}
                        onChange={handleStatusChange}
                        disabled={updatingStatus}
                        className={`appearance-none rounded-lg px-2.5 py-1 pr-8 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-[#FF5B26] cursor-pointer transition-all disabled:opacity-60 bg-white ${
                          statusMeta[currentStatusKey]?.className || ""
                        }`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="vibe check sent">Vibe Check Sent</option>
                        <option value="negotiating">Negotiating</option>
                        <option value="converted">Confirmed</option>
                        <option value="lost">Lost</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{leadData.phone || "No phone number"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{leadData.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 font-semibold">Interested Destination: <strong className="text-slate-700 font-bold">{leadData.trips?.destination || "Travel enquiry"}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Cards info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Lead Source</div>
                  <div className="mt-2 font-semibold text-slate-900">{leadData.source || "Website"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Enquiry Date</div>
                  <div className="mt-2 font-semibold text-slate-900">{formatDateTime(leadData.created_at)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Assigned To</div>
                  <div className="mt-2 font-semibold text-slate-900">{assignedProfile?.full_name || "Manager"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Last Updated</div>
                  <div className="mt-2 font-semibold text-slate-900">{formatDateTime(leadData.updated_at || leadData.created_at)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Pipeline Tracker Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Lead Pipeline</span>
              <button
                onClick={handleMoveToNextStage}
                disabled={currentStatusKey === "converted" || currentStatusKey === "lost" || updatingStatus}
                className="px-4 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer border-0"
              >
                Move To Next Stage
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-2 md:gap-4 flex-1">
                {pipelineStages.map((stage, idx) => {
                  const isDone = idx < activeStageIndex && currentStatusKey !== "lost";
                  const isCurrent = idx === activeStageIndex && currentStatusKey !== "lost";
                  return (
                    <div key={stage.key} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                        isDone
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isCurrent
                            ? "bg-[#FFEFEA] text-[#FF5B26] border-[#FFD3C4] ring-2 ring-[#FF5B26]/10"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}>
                        <span>{stage.label}</span>
                        {isDone && <span className="text-[10px]">✓</span>}
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B26] animate-pulse" />}
                      </div>
                      {idx < pipelineStages.length - 1 && (
                        <span className="text-slate-300 font-bold hidden md:inline">→</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4 flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase">Or</span>
                <button
                  onClick={() => handleUpdateStatusDirect("lost")}
                  disabled={currentStatusKey === "lost" || updatingStatus}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    currentStatusKey === "lost"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-slate-200"
                  }`}
                >
                  Not A Fit
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic tabs area */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 mb-6">
              {["Overview", "Tasks", "Follow-ups", "Notes", "Documents", "Messages"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer bg-transparent border-0 shrink-0 ${
                    activeTab === tab
                      ? "border-[#FF5B26] text-[#FF5B26]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div>
              {activeTab === "Overview" && (
                <div className="space-y-6">
                  {/* Trip Interest Card */}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 text-left mb-4">Trip Interest</h2>
                    <div className="flex flex-col md:flex-row gap-5 items-stretch bg-[#FAF8F4]/20 border border-slate-200/60 rounded-2xl overflow-hidden p-4 text-left">
                      <div className="relative w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0 shadow-2xs">
                        <img
                          src={leadData.trips?.image_url || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80"}
                          alt={leadData.trips?.title || "Trip"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 text-white text-[10px] font-bold bg-black/55 px-2 py-0.5 rounded-lg shadow-sm">
                          {leadData.trips?.destination || "Kanha National Park, MP"}
                        </div>
                      </div>
                      <div className="flex flex-col justify-between py-1 text-left space-y-2 w-full">
                        <div>
                          <h3 className="text-lg font-display font-extrabold text-nomichi-ink">{leadData.trips?.title || "General Enquiry"}</h3>
                          <p className="text-xs text-nomichi-ink/50 font-semibold mt-1">
                            Departure Status: <span className="text-[#10B981] font-bold">Open For Enquiries</span>
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 border-t border-slate-200/40 pt-3 text-[10px] font-bold text-nomichi-ink/65">
                          <div>
                            <span className="text-[9px] font-extrabold text-nomichi-ink/40 uppercase block tracking-wider leading-none">Seats Available</span>
                            <span className="mt-1 block text-nomichi-ink font-extrabold">12 / 20</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-nomichi-ink/40 uppercase block tracking-wider leading-none">Duration</span>
                            <span className="mt-1 block text-nomichi-ink font-extrabold">3 Days 2 Nights</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold text-nomichi-ink/40 uppercase block tracking-wider leading-none">Price</span>
                            <span className="mt-1 block text-nomichi-ink font-black text-[#FF5B26]">₹20,000</span>
                          </div>
                          <div className="flex items-end justify-end">
                            <Link href={`/manager/trips/${leadData.trips?.id || ""}`} className="px-3 py-1.5 bg-white hover:bg-slate-50 text-nomichi-ink text-[10px] font-bold border border-[#e7e1d5] rounded-lg transition-colors leading-none shadow-2xs">
                              View Trip
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-lg font-bold text-slate-900 text-left">Requirements</h2>
                    <div className="mt-4 space-y-3 text-sm text-slate-700 text-left">
                      {[
                        leadData.notes,
                        leadData.group_type && `Group type: ${leadData.group_type}`,
                        leadData.preferred_month && `Preferred month: ${leadData.preferred_month}`,
                        leadData.hope_trip_feels_like && `Wants the trip to feel: ${leadData.hope_trip_feels_like}`,
                        leadData.dietary_and_accessibility && `Dietary / accessibility: ${leadData.dietary_and_accessibility}`,
                      ].filter(Boolean).length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2">
                          {[
                            leadData.notes,
                            leadData.group_type && `Group type: ${leadData.group_type}`,
                            leadData.preferred_month && `Preferred month: ${leadData.preferred_month}`,
                            leadData.hope_trip_feels_like && `Wants the trip to feel: ${leadData.hope_trip_feels_like}`,
                            leadData.dietary_and_accessibility && `Dietary / accessibility: ${leadData.dietary_and_accessibility}`,
                          ]
                            .filter(Boolean)
                            .map((item: any) => <li key={item}>{item}</li>)}
                        </ul>
                      ) : (
                        <p className="text-slate-500">No additional requirements were added.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === "Tasks" && (
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Enquiry Tasks</h2>
                    <button
                      onClick={() => setTaskCreateOpen(true)}
                      className="px-3.5 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all border-0 cursor-pointer"
                    >
                      + Create Task
                    </button>
                  </div>
                  
                  <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-2xl bg-slate-50/20 p-4 space-y-3">
                    {tasks.length === 0 ? (
                      <p className="py-6 text-center text-xs font-semibold text-slate-400">No tasks created yet for this lead.</p>
                    ) : (
                      tasks.map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-3">
                          <label className="flex items-center gap-3 font-semibold text-xs text-nomichi-ink cursor-pointer">
                            <input
                              type="checkbox"
                              checked={t.status === "completed"}
                              disabled={t.status === "completed"}
                              onChange={() => handleCompleteTask(t.id)}
                              className="h-4 w-4 rounded border-[#e7e1d5] text-[#FF5B26] focus:ring-[#FF5B26] disabled:opacity-50"
                            />
                            <span className={t.status === "completed" ? "line-through text-slate-400" : ""}>{t.title}</span>
                          </label>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
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

              {/* Follow-ups Tab */}
              {activeTab === "Follow-ups" && (
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Follow-up Schedule</h2>
                    <button
                      onClick={handleScheduleCallDirect}
                      className="px-3.5 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all border-0 cursor-pointer"
                    >
                      + Schedule Follow-up
                    </button>
                  </div>
                  
                  <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white">
                    <table className="w-full border-collapse text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="px-6 py-3.5">Date</th>
                          <th className="px-6 py-3.5">Type</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {followUpTasks.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                              No follow-up dates scheduled.
                            </td>
                          </tr>
                        ) : (
                          followUpTasks.map((f) => (
                            <tr key={f.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4">{formatDate(f.due_date)}</td>
                              <td className="px-6 py-4 capitalize">{f.type === "communication" ? "Call" : f.type}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  f.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                  f.status === "cancelled" ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-700"
                                }`}>
                                  {f.status === "completed" ? "Completed" : f.status === "to do" ? "Pending" : f.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
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

              {/* Notes Tab */}
              {activeTab === "Notes" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900 text-left">Notes & Logs</h2>
                  </div>
                  
                  <form onSubmit={handleAddNoteSubmit} className="space-y-3">
                    <textarea
                      required
                      rows={3}
                      placeholder="Log a client interaction, note requirements, or add next steps..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors resize-none text-nomichi-ink placeholder-nomichi-ink/30"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addingNote || !newNoteText.trim() || !currentUser}
                        className="flex items-center gap-2 px-5 py-2 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-md disabled:opacity-50 border-0 cursor-pointer"
                      >
                        {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Send className="w-3.5 h-3.5 shrink-0" />}
                        Log Note
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {!leadData.lead_notes || leadData.lead_notes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500 text-center">
                        No activity notes logged yet. Use the field above to log details.
                      </div>
                    ) : (
                      [...leadData.lead_notes]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((note) => {
                          const noteText = note.note_text || "";
                          const { title: noteTitle, description: noteDesc } = getLeadNoteDisplay(noteText);
                          const { iconColor, Icon } = getLeadNoteVisual(noteText);
                          const authorLabel = getLeadNoteAuthorLabel(note, usersById);
                          const authorTone = authorLabel.startsWith("Admin")
                            ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                            : authorLabel.startsWith("Manager")
                              ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
                              : authorLabel.startsWith("Staff")
                                ? "bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]"
                                : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]";

                          return (
                            <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-left">
                              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                                  {formatDateTime(note.created_at)}
                                </span>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${authorTone}`}>
                                  {authorLabel}
                                </span>
                              </div>
                              <div className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${iconColor}`}>
                                <Icon className="w-3 h-3" />
                                {noteTitle}
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{noteDesc}</p>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "Messages" && (
                <div className="rounded-2xl border border-dashed border-[#e7e1d5] bg-[#FAF8F4]/20 py-12 text-xs text-slate-500 text-center font-semibold space-y-4">
                  <p className="text-nomichi-ink/60">Direct chat messages with travelers are managed in the Messages module.</p>
                  <Link
                    href={`/manager/messages?lead=${leadData?.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold rounded-xl transition-all shadow-md no-underline"
                  >
                    Open Messages Chat
                  </Link>
                </div>
              )}

              {activeTab === "Documents" && (
                <div className="rounded-2xl border border-dashed border-[#e7e1d5] bg-[#FAF8F4]/20 py-12 text-xs text-slate-500 text-center font-semibold space-y-4">
                  <p className="text-nomichi-ink/60">Upload or view documents for this traveler.</p>
                  <button
                    onClick={() => alert("Document upload function coming soon! In a production deployment, this links with your secure cloud bucket.")}
                    className="px-5 py-2.5 border border-[#FF5B26] hover:bg-[#FFEFEA] text-[#FF5B26] font-bold rounded-xl transition-all shadow-sm bg-white cursor-pointer"
                  >
                    Upload Document
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline (Large timeline card showing events chronologically) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Activity Timeline</h2>
              {timelineEvents.length > 4 && (
                <Link
                  href={`/manager/activity?search=${encodeURIComponent(leadData.name)}`}
                  className="text-xs font-bold text-[#FF5B26] hover:underline"
                >
                  View All
                </Link>
              )}
            </div>
            <div className="space-y-5 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 z-0 pl-1">
              {timelineEvents.slice(0, 4).map((event, idx) => (
                <div key={idx} className="flex gap-3 relative z-10 text-xs">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${event.iconBg}`}>
                    <event.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{event.title}</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{event.date} · {event.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar cards */}
        <div className="xl:col-span-4 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 text-left">
            <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3 font-semibold text-slate-700">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{leadData.phone || "No phone number"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a href={whatsAppHref} onClick={() => logInteraction("whatsapp")} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-[#ECFDF5] text-[#16A34A] hover:bg-[#D1FAE5] transition-colors border-0 flex items-center justify-center" title="WhatsApp">
                    <MessageCircle className="w-4.5 h-4.5" />
                  </a>
                  <a href={callHref} onClick={() => logInteraction("call")} className="p-2 rounded-xl bg-[#EEF2FF] text-[#2563EB] hover:bg-[#E0E7FF] transition-colors border-0 flex items-center justify-center" title="Call">
                    <Phone className="w-4.5 h-4.5" />
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 font-semibold text-slate-700 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="break-all">{leadData.email}</span>
                </div>
                <a href={emailHref} onClick={() => logInteraction("email")} className="p-2 rounded-xl bg-[#FFF7ED] text-[#F97316] hover:bg-[#FFEDD5] transition-colors border-0 flex items-center justify-center" title="Email">
                  <Mail className="w-4.5 h-4.5" />
                </a>
              </div>
              <div className="flex items-center gap-3 font-semibold text-slate-700 border-t border-slate-100 pt-4">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Destination: {leadData.trips?.destination || "Trip destination not set"}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Replaced layout matching request) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 text-left">
            <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center text-xs font-bold text-slate-700">
              <a href={callHref} onClick={() => logInteraction("call")} className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#2563EB]" />
                Call Traveller
              </a>
              <Link href={`/manager/messages?lead=${leadData.id}`} className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#FF5B26]" />
                Open Chat
              </Link>
              <a href={whatsAppHref} onClick={() => logInteraction("whatsapp")} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                WhatsApp
              </a>
              <a href={emailHref} onClick={() => logInteraction("email")} className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#F97316]" />
                Email
              </a>
              <button onClick={handleScheduleCallDirect} className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-2 bg-white border-slate-200">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                Schedule Call
              </button>
              <button onClick={handleShareBrochureDirect} className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-2 bg-white border-slate-200">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Share Brochure
              </button>
              <button onClick={handleAddNoteClick} className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-2 bg-white border-slate-200">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Add Note
              </button>
              <button onClick={handleMarkTaskCompleteDirect} className="rounded-2xl border border-slate-200 px-3 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-2 bg-white border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Complete Task
              </button>
            </div>
          </div>

          {/* Next Action Card (Real state generated from Tasks) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 text-left space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 leading-none">Next Action</h2>
            {nextActionTask ? (
              <div className="space-y-3.5">
                <div className="bg-[#FAF8F4]/50 border border-[#e7e1d5]/30 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-3 font-semibold">
                    <span className="font-extrabold text-sm text-nomichi-ink">{nextActionTask.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                      nextActionTask.priority === "High" ? "bg-red-50 text-red-700 border border-red-100" :
                      nextActionTask.priority === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {nextActionTask.priority}
                    </span>
                  </div>
                  <p className="text-slate-500 font-semibold leading-relaxed">{nextActionTask.description}</p>
                  <div className="flex items-center gap-1.5 text-nomichi-ink/50 font-bold pt-1">
                    <Clock3 className="w-3.5 h-3.5" />
                    <span>Due: {formatDate(nextActionTask.due_date)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCompleteTask(nextActionTask.id)}
                    className="flex-1 py-2.5 bg-[#16A34A] hover:bg-[#16A34A]/90 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border-0"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleRescheduleClick(nextActionTask)}
                    className="flex-1 py-2.5 bg-white hover:bg-[#FAF8F4] text-nomichi-ink/80 border border-[#e7e1d5] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-3">
                <p className="text-xs font-semibold text-slate-400">No pending actions.</p>
                <button
                  onClick={() => setTaskCreateOpen(true)}
                  className="px-4 py-2 border border-[#FF5B26] hover:bg-[#FFEFEA] text-[#FF5B26] font-bold text-xs rounded-xl cursor-pointer bg-white transition-all shadow-xs"
                >
                  + Add Task
                </button>
              </div>
            )}
          </div>


          {/* Assignment */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 text-left">Assignment</h2>
            <div className="mt-5 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                {assignedProfile?.avatar_url ? (
                  <img src={assignedProfile.avatar_url} alt={assignedProfile.full_name || "Manager"} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center font-bold">
                    {(assignedProfile?.full_name || "M").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-500">Assigned To</div>
                  <div className="font-semibold text-slate-900">{assignedProfile?.full_name || "Manager"}</div>
                  <div className="text-xs text-slate-500">Manager</div>
                </div>
              </div>
              {isReassigning ? (
                <select
                  value={leadData.assigned_to || ""}
                  onChange={async (e) => {
                    const newAssignedId = e.target.value;
                    if (!newAssignedId) return;
                    try {
                      const { error } = await supabase
                        .from("leads")
                        .update({ assigned_to: newAssignedId })
                        .eq("id", leadData.id);
                      if (error) throw error;
                      await refresh();
                      setIsReassigning(false);
                    } catch (err) {
                      console.error("Failed to reassign:", err);
                    }
                  }}
                  onBlur={() => setIsReassigning(false)}
                  className="rounded-xl border border-[#FF5B26] px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF5B26] cursor-pointer bg-white"
                >
                  <option value="">Select Manager</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setIsReassigning(true)}
                  className="rounded-xl border border-[#FF5B26] px-4 py-2 text-sm font-medium text-[#FF5B26] bg-transparent cursor-pointer hover:bg-[#FFEFEA] transition-colors"
                >
                  Reassign
                </button>
              )}
            </div>
            <div className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-4 text-left">
              <div className="text-xs text-slate-500">Assigned On</div>
              <div className="font-medium text-slate-900">{formatDateTime(leadData.created_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Modal: Create Task Dialog */}
      {taskCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center px-4 animate-in fade-in duration-200">
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
                    <option value="vibe check">Vibe Check</option>
                    <option value="payment">Payment</option>
                    <option value="document">Documents</option>
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task details..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs resize-none"
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
        <div className="fixed inset-0 z-50 bg-slate-955/40 backdrop-blur-xs flex items-center justify-center px-4 animate-in fade-in duration-200">
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
