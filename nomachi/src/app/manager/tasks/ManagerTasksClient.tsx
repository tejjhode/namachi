"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  Clock3,
  CheckCircle2,
  ClipboardList,
  Filter,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  PencilLine,
  Phone,
  MessageSquare,
  FileText,
  BookMarked,
  Mail,
  CalendarCheck2,
  Trash2,
  User2,
} from "lucide-react";
import { taskService, type DBTask, type TaskSubtask } from "@/services/task.service";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type TaskStatus = "to do" | "in progress" | "waiting" | "completed" | "overdue" | "cancelled";
type TaskPriority = "Low" | "Medium" | "High";
type TaskType = "follow-up" | "vibe check" | "operations" | "document" | "payment" | "communication" | "booking";
type EntityKind = "Lead" | "Trip" | "Traveler" | "Departure" | "Booking";
type TaskSourceKind = "lead" | "trip" | "departure";
type SortMode = "dueDate" | "priority" | "status";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  relatedTo: string;
  relatedId: string;
  sourceKind: TaskSourceKind;
  sourceId: string;
  entityKind: EntityKind;
  type: TaskType;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  assignee: {
    name: string;
    role: string;
    avatar?: string | null;
  };
  createdBy: {
    name: string;
    avatar?: string | null;
    date: string;
  };
  details: string;
  subtasks: string[];
  subtaskCompletedStates: boolean[];
  step: number;
  tripTitle?: string | null;
  tripCode?: string | null;
};

type ManagerTasksClientProps = {
  tasks: TaskItem[];
  leads: any[];
  trips: any[];
  departures: any[];
  team: any[];
};

const taskStatusMeta: Record<TaskStatus, { label: string; className: string }> = {
  "to do": { label: "To Do", className: "bg-[#FFF1EA] text-[#FF5B26] border border-[#FFEFEA]" },
  "in progress": { label: "In Progress", className: "bg-blue-50 text-blue-700 border border-blue-100" },
  waiting: { label: "Waiting", className: "bg-purple-50 text-purple-700 border border-purple-100" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700 border border-red-100" },
  cancelled: { label: "Cancelled", className: "bg-gray-50 text-gray-500 border border-gray-100" },
};

const typeMeta: Record<TaskType, { label: string; className: string }> = {
  "follow-up": { label: "Follow-up", className: "bg-[#EBF3FF] text-[#1E6BFF] border border-[#D0E2FF]" },
  "vibe check": { label: "Vibe Check", className: "bg-purple-50 text-purple-700 border border-purple-100" },
  operations: { label: "Operations", className: "bg-amber-50 text-amber-700 border border-amber-100" },
  document: { label: "Document", className: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  payment: { label: "Payment", className: "bg-indigo-50 text-indigo-700 border border-indigo-100" },
  communication: { label: "Communication", className: "bg-blue-50 text-blue-700 border border-blue-100" },
  booking: { label: "Booking", className: "bg-amber-100 text-amber-900 border border-amber-200" },
};

const taskTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "follow-up", label: "Follow-up" },
  { value: "vibe check", label: "Vibe Check" },
  { value: "operations", label: "Operations" },
  { value: "document", label: "Document" },
  { value: "payment", label: "Payment" },
  { value: "communication", label: "Communication" },
  { value: "booking", label: "Booking" },
];

const taskStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "to do", label: "To Do" },
  { value: "in progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const priorityOptions = [
  { value: "all", label: "All Priority" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const statusTabs = [
  { id: "all", label: "All Tasks" },
  { id: "my", label: "My Tasks" },
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

const iconByType: Record<TaskType, any> = {
  "follow-up": Phone,
  "vibe check": MessageSquare,
  operations: ClipboardList,
  document: FileText,
  payment: BookMarked,
  communication: Mail,
  booking: CalendarCheck2,
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Recently";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const daysAwayLabel = (value?: string | null, status?: TaskStatus) => {
  if (!value) return "Due soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Due soon";
  const diffTime = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffTime / 86400000);
  
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  
  if (diffDays < 0) {
    return "Overdue";
  }
  if (diffDays === 0) {
    return "Today, 04:00 PM";
  }
  if (diffDays === 1) {
    return "Tomorrow, 11:00 AM";
  }
  return `${diffDays} days left`;
};

const priorityRank = { High: 0, Medium: 1, Low: 2 };
const statusRank = {
  overdue: 0,
  "to do": 1,
  "in progress": 2,
  waiting: 3,
  completed: 4,
  cancelled: 5,
};

const workflowMilestones = [
  { label: "Intake", hint: "Initial review" },
  { label: "Follow-up", hint: "Outreach in progress" },
  { label: "Vibe Check", hint: "Fit confirmed" },
  { label: "Docs", hint: "Documents validated" },
  { label: "Booking", hint: "Ready to close" },
];

const getWorkflowStageIndex = (step: number) => {
  if (step <= 3) return 0;
  if (step <= 6) return 1;
  if (step <= 8) return 2;
  if (step <= 10) return 3;
  return 4;
};

export function ManagerTasksClient({ tasks: initialTasks, leads, trips, departures, team }: ManagerTasksClientProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<typeof statusTabs[number]["id"]>("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");
  const [sortBy, setSortBy] = useState<SortMode>("dueDate");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[0]?.id || "");
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [subtaskCheckedStates, setSubtaskCheckedStates] = useState<Record<string, boolean[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [meetingDate, setMeetingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(16, 0, 0, 0);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const pageSize = 8;

  // Resolve current user session to set default assignee/creator
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Sync subtask states from database initial tasks
  useEffect(() => {
    const nextStates: Record<string, boolean[]> = {};
    tasks.forEach((task) => {
      nextStates[task.id] = task.subtaskCompletedStates || task.subtasks.map(() => false);
    });
    setSubtaskCheckedStates(nextStates);
  }, [tasks]);

  const counts = useMemo(() => {
    return {
      total: tasks.length,
      dueToday: tasks.filter((task) => new Date(task.dueDate).toDateString() === new Date().toDateString()).length,
      overdue: tasks.filter((task) => task.status === "overdue").length,
      completed: tasks.filter((task) => task.status === "completed").length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const today = new Date().toDateString();

    return [...tasks]
      .filter((task) => {
        if (selectedTab === "my" && task.assignee.name === "Unassigned") return false;
        if (selectedTab === "today" && new Date(task.dueDate).toDateString() !== today) return false;
        if (selectedTab === "overdue" && task.status !== "overdue") return false;
        if (selectedTab === "completed" && task.status !== "completed") return false;
        if (selectedTab === "cancelled" && task.status !== "cancelled") return false;
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if (typeFilter !== "all" && task.type !== typeFilter) return false;
        if (query) {
          const searchable = `${task.title} ${task.description} ${task.relatedTo} ${task.relatedId} ${task.assignee.name} ${task.type}`.toLowerCase();
          if (!searchable.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
        if (sortBy === "status") return statusRank[a.status] - statusRank[b.status];
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, searchQuery, selectedTab, statusFilter, priorityFilter, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const currentPageStart = filteredTasks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const currentPageEnd = filteredTasks.length === 0 ? 0 : Math.min(currentPage * pageSize, filteredTasks.length);
  
  const activeTask = useMemo(() => {
    return filteredTasks.find((t) => t.id === selectedTaskId) || paginatedTasks[0] || filteredTasks[0] || tasks[0];
  }, [filteredTasks, paginatedTasks, selectedTaskId, tasks]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!filteredTasks.length) {
      setSelectedTaskId("");
      setCurrentPage(1);
      return;
    }
    if (selectedTaskId && !filteredTasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedTaskId]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTab("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
    setSortBy("dueDate");
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus, options?: { meetingDate?: string }) => {
    try {
      const updated = await taskService.updateTaskStatus(taskId, newStatus, options);
      
      // Re-fetch all tasks from the database and map them back to TaskItem schema to support live workflow updates
      const dbTasks = await taskService.getTasks();
      const mapped = dbTasks.map((t: any) => {
        let entityKind: EntityKind = "Lead";
        if (t.source_kind === "trip") entityKind = "Trip";
        else if (t.source_kind === "departure") entityKind = "Departure";
        else if (t.related_id?.startsWith("TRAV")) entityKind = "Traveler";
        
        const assigneeUser = team.find(tm => tm.id === t.assigned_to);
        const creatorUser = team.find(tm => tm.id === t.created_by);

        return {
          id: t.id,
          title: t.title,
          description: t.description || "",
          relatedTo: t.related_to || "General",
          relatedId: t.related_id || "TASK",
          sourceKind: t.source_kind as TaskSourceKind,
          sourceId: t.source_id || "",
          entityKind,
          type: t.type as TaskType,
          priority: t.priority as TaskPriority,
          dueDate: t.due_date || new Date().toISOString(),
          status: t.status as TaskStatus,
          assignee: {
            name: assigneeUser?.full_name || "Unassigned",
            role: assigneeUser?.role || "Manager",
            avatar: assigneeUser?.avatar_url || null
          },
          createdBy: {
            name: creatorUser?.full_name || "Admin",
            avatar: creatorUser?.avatar_url || null,
            date: t.created_at || new Date().toISOString()
          },
          details: t.details || "",
          subtasks: (t.subtasks || []).map((st: any) => st.title),
          subtaskCompletedStates: (t.subtasks || []).map((st: any) => st.completed),
          step: t.step || 5,
          tripTitle: t.related_to,
          tripCode: t.related_id
        };
      });

      setTasks(mapped);
    } catch (err: any) {
      alert(err.message || "Failed to update task status.");
    }
  };

  const handleToggleSubtask = async (taskId: string, index: number) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const currentStates = subtaskCheckedStates[taskId] || [];
      const nextStates = [...currentStates];
      nextStates[index] = !nextStates[index];

      // Update state immediately for optimal UX
      setSubtaskCheckedStates((prev) => ({ ...prev, [taskId]: nextStates }));

      // Format payload for JSONB update
      const payload: TaskSubtask[] = task.subtasks.map((st, i) => ({
        title: st,
        completed: nextStates[i],
      }));

      await taskService.updateTaskSubtasks(taskId, payload);
    } catch (err: any) {
      alert(err.message || "Failed to toggle subtask.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await taskService.deleteTask(taskId);
      setTasks((current) => current.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId("");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete task.");
    }
  };

  // Form State for creating task
  const [formData, setFormData] = useState({
    title: "",
    sourceKind: "lead" as TaskSourceKind,
    sourceId: "",
    type: "follow-up" as TaskType,
    priority: "Medium" as TaskPriority,
    dueDate: "",
    description: "",
    assignedTo: "",
  });

  // Dynamic lists depending on source type selected
  const availableEntities = useMemo(() => {
    if (formData.sourceKind === "lead") {
      return leads.map((l) => ({ id: l.id, label: `${l.name} (${l.enquiry_id || 'Lead'})`, relatedTo: l.name, relatedId: l.enquiry_id || 'Lead' }));
    }
    if (formData.sourceKind === "trip") {
      return trips.map((t) => ({ id: t.id, label: t.title, relatedTo: t.title, relatedId: `TRP-${t.id.slice(0, 6).toUpperCase()}` }));
    }
    if (formData.sourceKind === "departure") {
      return departures.map((d) => {
        const matchedTrip = trips.find((t) => t.id === d.trip_id);
        const label = `Departure: ${matchedTrip?.title || 'Unknown Trip'} (${d.start_date ? new Date(d.start_date).toLocaleDateString() : 'Unscheduled'})`;
        return { id: d.id, label, relatedTo: `Departure #${d.id.slice(0, 6).toUpperCase()}`, relatedId: `DEP-${d.id.slice(0, 6).toUpperCase()}` };
      });
    }
    return [];
  }, [formData.sourceKind, leads, trips, departures]);

  // Handle sourceKind change to reset sourceId
  useEffect(() => {
    if (availableEntities.length > 0) {
      setFormData((prev) => ({ ...prev, sourceId: availableEntities[0].id }));
    } else {
      setFormData((prev) => ({ ...prev, sourceId: "" }));
    }
  }, [formData.sourceKind, availableEntities]);

  // Set default assigned to current user
  useEffect(() => {
    if (currentUserId && team.length > 0) {
      setFormData((prev) => ({ ...prev, assignedTo: currentUserId }));
    }
  }, [currentUserId, team]);

  const handleCreateTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const selectedEntity = availableEntities.find((e) => e.id === formData.sourceId);
      const assigneeUser = team.find((t) => t.id === formData.assignedTo);

      // Define default subtasks based on workflow steps
      let subtasks: TaskSubtask[] = [];
      if (formData.type === "follow-up") {
        subtasks = [
          { title: "Call traveler", completed: false },
          { title: "Discuss itinerary", completed: false },
          { title: "Share next steps", completed: false },
          { title: "Update lead notes", completed: false }
        ];
      } else if (formData.type === "vibe check") {
        subtasks = [
          { title: "Review lead notes", completed: false },
          { title: "Confirm fit", completed: false },
          { title: "Schedule vibe check", completed: false }
        ];
      } else {
        subtasks = [
          { title: "Review task requirements", completed: false },
          { title: "Execute task actions", completed: false },
          { title: "Confirm completion", completed: false }
        ];
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        related_to: selectedEntity?.relatedTo || "General",
        related_id: selectedEntity?.relatedId || "TASK",
        source_kind: formData.sourceKind,
        source_id: formData.sourceId || null,
        type: formData.type,
        priority: formData.priority,
        due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : new Date().toISOString(),
        status: "to do",
        assigned_to: formData.assignedTo || null,
        created_by: currentUserId || null,
        details: formData.description,
        subtasks,
        step: formData.sourceKind === "lead" ? 5 : 2,
      };

      const created = await taskService.createTask(payload);

      // Auto-trigger notifications if it's a communication/call task for a lead
      if (formData.sourceKind === "lead" && (formData.type === "communication" || formData.title.toLowerCase().includes("call"))) {
        const lead = leads.find((l) => l.id === formData.sourceId);
        if (lead) {
          const phoneDigits = (lead.phone || "").replace(/[^0-9]/g, "");
          const travelerName = lead.name || "there";
          const managerName = team.find((t) => t.id === currentUserId)?.full_name || "Manager";
          const tripTitle = lead.trips?.title || "your trip";
          const enquiryId = lead.enquiry_id || "";
          const formattedCallTime = formData.dueDate ? new Date(formData.dueDate).toLocaleString("en-IN", {
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
          const gmailLink = lead.email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${lead.email}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}` : "";

          if (waLink) {
            window.open(waLink, "_blank");
          }
          if (gmailLink) {
            window.open(gmailLink, "_blank");
          }
        }
      }

      // Map created DBTask back to TaskItem type
      const createdItem: TaskItem = {
        id: created.id,
        title: created.title,
        description: created.description || "",
        relatedTo: created.related_to || "General",
        relatedId: created.related_id || "TASK",
        sourceKind: created.source_kind as TaskSourceKind,
        sourceId: created.source_id || "",
        entityKind: created.source_kind === "trip" ? "Trip" : created.source_kind === "departure" ? "Departure" : "Lead",
        type: created.type as TaskType,
        priority: created.priority as TaskPriority,
        dueDate: created.due_date || new Date().toISOString(),
        status: created.status as TaskStatus,
        assignee: {
          name: assigneeUser?.full_name || "Unassigned",
          role: assigneeUser?.role || "Manager",
          avatar: assigneeUser?.avatar_url || null
        },
        createdBy: {
          name: team.find((t) => t.id === currentUserId)?.full_name || "Admin",
          avatar: team.find((t) => t.id === currentUserId)?.avatar_url || null,
          date: created.created_at || new Date().toISOString()
        },
        details: created.details || "",
        subtasks: created.subtasks.map((st) => st.title),
        subtaskCompletedStates: created.subtasks.map((st) => st.completed),
        step: created.step || 5,
      };

      setTasks((current) => [createdItem, ...current]);
      setSelectedTaskId(createdItem.id);
      setTaskCreateOpen(false);
      setFormData((prev) => ({
        ...prev,
        title: "",
        description: "",
        dueDate: "",
      }));
      setCurrentPage(1);
    } catch (err: any) {
      alert(err.message || "Failed to create task.");
    }
  };

  const pageWindow = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  const activeTaskSubtasks = activeTask ? subtaskCheckedStates[activeTask.id] || [] : [];
  const ActiveIcon = activeTask ? iconByType[activeTask.type] : ClipboardList;
  const activeWorkflowStageIndex = activeTask ? getWorkflowStageIndex(activeTask.step || 1) : 0;
  const activeWorkflowProgress = activeTask ? Math.min(100, Math.max(8, Math.round(((activeTask.step || 1) / 12) * 100))) : 0;
  const completedSubtasksCount = activeTaskSubtasks.filter(Boolean).length;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Header area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight flex items-center gap-2">
            Tasks
          </h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
            Manage follow-ups and operational work.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/80 font-bold text-xs rounded-xl flex items-center gap-2 bg-white cursor-pointer transition-all shadow-sm"
          >
            <Filter className="w-4 h-4 text-nomichi-ink/45" />
            Filters
          </button>
          <button
            onClick={() => setTaskCreateOpen(true)}
            className="px-4 py-2.5 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Tasks", value: counts.total, icon: ClipboardList, color: "text-[#3B82F6] bg-[#EBF0FF]", sub: "All pending & completed" },
          { label: "Due Today", value: counts.dueToday, icon: Calendar, color: "text-[#10B981] bg-[#ECFDF5]", sub: "Tasks due today" },
          { label: "Overdue", value: counts.overdue, icon: Clock3, color: "text-[#FF5B26] bg-[#FFF1EA]", sub: "Tasks past due date" },
          { label: "Completed", value: counts.completed, icon: CheckCircle2, color: "text-[#7C3AED] bg-[#F4EDFF]", sub: "Tasks completed" },
        ].map((item) => (
          <div key={item.label} className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex items-center gap-4 text-left h-[110px]">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide block">{item.label}</span>
              <h3 className="text-xl font-display font-black text-nomichi-ink mt-0.5">{item.value}</h3>
              <span className="text-[9px] font-bold text-nomichi-ink/30 block mt-1">{item.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Filter bar */}
      <div className="bg-white rounded-2xl border border-[#e7e1d5]/40 shadow-sm px-5 py-3.5 flex items-center gap-8 overflow-x-auto scrollbar-none">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedTab(tab.id);
              setCurrentPage(1);
            }}
            className={`pb-1 text-xs font-extrabold tracking-wide uppercase transition-all bg-transparent border-0 border-b-2 cursor-pointer shrink-0 ${
              selectedTab === tab.id
                ? "border-[#FF5B26] text-[#FF5B26]"
                : "border-transparent text-nomichi-ink/40 hover:text-nomichi-ink/75"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid View */}
      <div className={`grid grid-cols-1 gap-6 items-start transition-all duration-300 ${selectedTaskId ? "xl:grid-cols-[minmax(0,1fr)_372px]" : "xl:grid-cols-1"}`}>
        {/* Left Side: Search + Dropdowns + Table card */}
        <div className="space-y-5">
          {/* Table Search & Dropdowns card */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-11 pl-4 pr-10 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold text-nomichi-ink placeholder-nomichi-ink/30"
                />
                <Search className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Status */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as TaskStatus | "all");
                    setCurrentPage(1);
                  }}
                  className="w-full h-11 pl-4 pr-9 border border-[#e7e1d5] rounded-xl bg-white focus:outline-none focus:border-[#FF5B26] text-xs font-semibold text-nomichi-ink/80 cursor-pointer appearance-none"
                >
                  {taskStatusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Priority */}
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value as TaskPriority | "all");
                    setCurrentPage(1);
                  }}
                  className="w-full h-11 pl-4 pr-9 border border-[#e7e1d5] rounded-xl bg-white focus:outline-none focus:border-[#FF5B26] text-xs font-semibold text-nomichi-ink/80 cursor-pointer appearance-none"
                >
                  {priorityOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Type */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as TaskType | "all");
                    setCurrentPage(1);
                  }}
                  className="w-full h-11 pl-4 pr-9 border border-[#e7e1d5] rounded-xl bg-white focus:outline-none focus:border-[#FF5B26] text-xs font-semibold text-nomichi-ink/80 cursor-pointer appearance-none"
                >
                  {taskTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort By */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMode)}
                  className="w-full h-11 pl-4 pr-9 border border-[#e7e1d5] rounded-xl bg-white focus:outline-none focus:border-[#FF5B26] text-xs font-semibold text-nomichi-ink/80 cursor-pointer appearance-none"
                >
                  <option value="dueDate">Sort: Due Date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="status">Sort: Status</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30 text-nomichi-ink/40 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4">Task</th>
                    <th className="px-6 py-4">Related To</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Assignee</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e1d5]/10 text-nomichi-ink">
                  {paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                        No tasks match your filter parameters.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((t) => {
                      const TaskIcon = iconByType[t.type] || ClipboardList;
                      const isSelected = selectedTaskId === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTaskId((prev) => (prev === t.id ? "" : t.id))}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-[#FFF8F4]/80" : "hover:bg-[#FAF8F4]/50"}`}
                        >
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedTaskId((prev) => (prev === t.id ? "" : t.id));
                              }}
                              className="h-4 w-4 rounded border-[#e7e1d5] text-[#FF5B26] focus:ring-[#FF5B26]"
                            />
                          </td>
                          <td className="px-6 py-4 font-semibold text-nomichi-ink max-w-[200px]">
                            <div className="flex items-start gap-3 text-left">
                              <div className="w-9 h-9 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center shrink-0 mt-0.5">
                                <TaskIcon className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-[12px] block truncate">{t.title}</span>
                                <span className="text-[10px] text-nomichi-ink/40 font-semibold truncate block mt-0.5">{t.description}</span>
                              </div>
                            </div>
                          </td>                           <td className="px-6 py-4 font-bold text-nomichi-ink whitespace-nowrap">
                            <span>{t.relatedTo}</span>
                            <span className="text-[9px] block text-[#FF5B26] uppercase mt-1 font-black tracking-wide">
                              {t.relatedId}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${typeMeta[t.type]?.className || ''}`}>
                              {typeMeta[t.type]?.label || t.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                              t.priority === "High" ? "bg-red-50 text-red-700" :
                              t.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                            }`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-left font-semibold text-nomichi-ink/80 whitespace-nowrap">
                            <span>{formatDate(t.dueDate)}</span>
                            <span className={`text-[10px] block mt-0.5 font-bold ${t.status === 'overdue' ? 'text-rose-600' : 'text-nomichi-ink/45'}`}>
                              {daysAwayLabel(t.dueDate, t.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${taskStatusMeta[t.status]?.className || ''}`}>
                              {taskStatusMeta[t.status]?.label || t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5 text-left whitespace-nowrap">
                              <div className="w-8 h-8 rounded-full border border-[#e7e1d5]/50 bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-xs shrink-0 overflow-hidden">
                                {t.assignee.avatar ? (
                                  <img src={t.assignee.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  t.assignee.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <span className="font-extrabold text-[11px] block">{t.assignee.name}</span>
                                <span className="text-[9px] text-nomichi-ink/40 font-bold block">{t.assignee.role}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(t.id);
                              }}
                              title="Delete Task"
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between border-t border-[#e7e1d5]/20 px-6 py-4 text-xs font-bold text-nomichi-ink/50 bg-[#FAF8F4]/20">
              <div>
                Showing {currentPageStart} to {currentPageEnd} of {filteredTasks.length} tasks
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-xl border border-[#e7e1d5] bg-white flex items-center justify-center text-nomichi-ink/50 cursor-pointer hover:bg-[#FAF8F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pageWindow.map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl border text-xs font-black transition-colors cursor-pointer ${
                      currentPage === p
                        ? "border-[#FF5B26] bg-[#FFEFEA] text-[#FF5B26]"
                        : "border-[#e7e1d5] bg-white text-nomichi-ink/50 hover:bg-[#FAF8F4]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-xl border border-[#e7e1d5] bg-white flex items-center justify-center text-nomichi-ink/50 cursor-pointer hover:bg-[#FAF8F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Task detail panel */}
        <aside className={`bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden xl:sticky xl:top-6 transition-all duration-300 ${
          selectedTaskId ? "block opacity-100" : "hidden opacity-0"
        }`}>
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-[#e7e1d5]/30 flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
                <ActiveIcon className="w-5 h-5 text-[#FF5B26]" />
              </div>
              <div className="overflow-hidden max-w-[200px]">
                <h3 className="font-extrabold text-xs text-nomichi-ink truncate leading-tight">
                  {activeTask?.title || "Select a task"}
                </h3>
                <span className="text-[10px] text-nomichi-ink/40 font-bold block mt-1">
                  {activeTask ? taskStatusMeta[activeTask.status]?.label : "No task selected"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedTaskId("")}
              className="text-nomichi-ink/30 border-0 bg-transparent cursor-pointer hover:text-nomichi-ink/50"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Details body */}
          {activeTask ? (
            <div className="p-5 space-y-5 text-xs text-left">
              {/* Task Details */}
              <div>
                <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-widest mb-3">Task Details</h4>
                <div className="space-y-3.5 font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="text-nomichi-ink/45">Related To</span>
                    <div className="text-right">
                      <span className="font-extrabold block text-nomichi-ink">{activeTask.relatedTo}</span>
                      <span className="text-[#FF5B26] font-black block text-[10px] tracking-wide mt-0.5">{activeTask.relatedId}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-nomichi-ink/45">Trip</span>
                    <div className="text-right">
                      <span className="font-extrabold block text-nomichi-ink">{activeTask.tripTitle || activeTask.relatedTo}</span>
                      <span className="text-[#2563EB] font-black block text-[10px] mt-0.5">{activeTask.tripCode || "TRP-00128"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-nomichi-ink/45">Type</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${typeMeta[activeTask.type]?.className || ''}`}>
                      {typeMeta[activeTask.type]?.label || activeTask.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-nomichi-ink/45">Priority</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      activeTask.priority === "High" ? "bg-red-50 text-red-700 border border-red-100" :
                      activeTask.priority === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {activeTask.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-nomichi-ink/45">Due Date</span>
                    <div className="text-right">
                      <span className="font-extrabold block text-nomichi-ink">{formatDate(activeTask.dueDate)}</span>
                      <span className="text-[#FF5B26] font-bold block text-[10px] mt-0.5">{daysAwayLabel(activeTask.dueDate, activeTask.status)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-nomichi-ink/45">Assignee</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border border-[#e7e1d5]/50 bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-[10px] shrink-0 overflow-hidden">
                        {activeTask.assignee.avatar ? (
                          <img src={activeTask.assignee.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          activeTask.assignee.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="text-right leading-none">
                        <span className="font-extrabold block text-nomichi-ink">{activeTask.assignee.name}</span>
                        <span className="text-[9px] text-nomichi-ink/40 font-bold block mt-0.5">{activeTask.assignee.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-nomichi-ink/45">Created By</span>
                    <div className="text-right">
                      <span className="font-extrabold block text-nomichi-ink">{activeTask.createdBy.name}</span>
                      <span className="text-[9px] text-nomichi-ink/40 font-bold block mt-0.5">{formatDateTime(activeTask.createdBy.date)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4 border-t border-[#e7e1d5]/20">
                <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-widest mb-2">Description</h4>
                <p className="text-xs text-nomichi-ink/75 leading-relaxed font-semibold">{activeTask.details || activeTask.description}</p>
              </div>

              {/* Workflow Tracker */}
              <div className="pt-4 border-t border-[#e7e1d5]/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-widest">Workflow Tracker</h4>
                  <span className="text-[10px] font-black text-[#FF5B26] uppercase tracking-wider">
                    Step {activeTask.step || 1}
                  </span>
                </div>

                <div className="rounded-2xl border border-[#e7e1d5]/40 bg-[#FAF8F4]/50 p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-nomichi-ink/45">
                      <span>{workflowMilestones[activeWorkflowStageIndex].label}</span>
                      <span>{completedSubtasksCount}/{activeTask.subtasks.length} subtasks done</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#e7e1d5]/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FF5B26] to-[#F97316] transition-all duration-300"
                        style={{ width: `${activeWorkflowProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {workflowMilestones.map((milestone, index) => {
                      const isDone = index < activeWorkflowStageIndex;
                      const isCurrent = index === activeWorkflowStageIndex;
                      return (
                        <div key={milestone.label} className="text-center">
                          <div
                            className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-black transition-all ${
                              isDone
                                ? "border-[#16A34A] bg-[#16A34A] text-white"
                                : isCurrent
                                  ? "border-[#FF5B26] bg-[#FFEFEA] text-[#FF5B26]"
                                  : "border-[#e7e1d5] bg-white text-nomichi-ink/30"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <p className={`text-[9px] font-black uppercase leading-tight ${isDone || isCurrent ? "text-nomichi-ink" : "text-nomichi-ink/35"}`}>
                            {milestone.label}
                          </p>
                          <p className="text-[8px] font-semibold text-nomichi-ink/35 leading-tight mt-0.5">
                            {milestone.hint}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sub Tasks checklist */}
              <div className="pt-4 border-t border-[#e7e1d5]/20">
                <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-widest mb-2.5">Sub Tasks</h4>
                <div className="space-y-2">
                  {activeTask.subtasks.map((st, i) => (
                    <label key={st} className="flex items-center gap-3 font-semibold text-nomichi-ink cursor-pointer hover:text-nomichi-ink/85">
                      <input
                        type="checkbox"
                        checked={activeTaskSubtasks[i] || false}
                        onChange={() => handleToggleSubtask(activeTask.id, i)}
                        className="h-4 w-4 rounded border-[#e7e1d5] text-[#FF5B26] focus:ring-[#FF5B26]"
                      />
                      <span className={activeTaskSubtasks[i] ? "line-through text-nomichi-ink/40" : ""}>{st}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#e7e1d5]/20 space-y-2.5">
                {activeTask.step === 4 && (
                  <div className="mb-2.5 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider block">Meeting Date & Time</label>
                    <input
                      type="datetime-local"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full h-11 px-3.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs font-semibold bg-white"
                    />
                  </div>
                )}
                <button
                  onClick={() => handleUpdateStatus(activeTask.id, "completed", activeTask.step === 4 ? { meetingDate } : undefined)}
                  className="w-full py-3 bg-[#16A34A] hover:bg-[#16A34A]/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm border-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {(() => {
                    switch (activeTask.step) {
                      case 1: return "✓ Mark as Contacted";
                      case 2: return "✓ Brochure Sent";
                      case 3: return "✓ Follow Up Complete";
                      case 4: return "Schedule Call";
                      case 5: return "✓ Vibe Check Passed";
                      case 6: return "✓ Payment Received";
                      case 7: return "✓ Passport Collected";
                      case 8: return "✓ Emergency Contact Collected";
                      case 9: return "✓ Assign Departure";
                      case 10: return "✓ Itinerary Sent";
                      case 11: return "✓ Reminder Sent";
                      case 12: return "✓ Readiness Checked";
                      default: return "Mark as Complete";
                    }
                  })()}
                </button>
                <button
                  onClick={() => handleUpdateStatus(activeTask.id, "in progress")}
                  className="w-full py-3 bg-white hover:bg-[#FAF8F4] text-nomichi-ink/80 border border-[#e7e1d5] font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <PencilLine className="w-4 h-4 text-nomichi-ink/50" />
                  Mark as In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus(activeTask.id, "cancelled")}
                  className="w-full py-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <XCircle className="w-4 h-4 text-rose-500" />
                  Mark as Cancelled
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-nomichi-ink/30 font-semibold text-xs">
              No task currently selected.
            </div>
          )}
        </aside>
      </div>

      {/* New Task Dialog Modal */}
      {taskCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-[#e7e1d5]/60 overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e1d5]/30 text-left">
              <div>
                <h2 className="text-base font-extrabold text-nomichi-ink">Create New Task</h2>
                <p className="text-[10px] text-nomichi-ink/40 font-bold mt-0.5">Assign follow-up work on the live pipeline.</p>
              </div>
              <button
                onClick={() => setTaskCreateOpen(false)}
                className="text-nomichi-ink/30 hover:text-nomichi-ink/60 border-0 bg-transparent cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTaskSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-semibold">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Call Rahul Sharma"
                  className="w-full h-11 px-3.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs"
                />
              </div>

              {/* Source Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Source Entity</label>
                <select
                  value={formData.sourceKind}
                  onChange={(e) => setFormData({ ...formData, sourceKind: e.target.value as TaskSourceKind })}
                  className="w-full h-11 px-3 border border-[#e7e1d5] rounded-xl bg-white text-xs"
                >
                  <option value="lead">Lead / Traveler</option>
                  <option value="trip">Trip template</option>
                  <option value="departure">Active departure</option>
                </select>
              </div>

              {/* Select Entity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Related To Record</label>
                <select
                  value={formData.sourceId}
                  onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                  className="w-full h-11 px-3 border border-[#e7e1d5] rounded-xl bg-white text-xs"
                  required
                >
                  {availableEntities.map((e) => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Task Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                  className="w-full h-11 px-3 border border-[#e7e1d5] rounded-xl bg-white text-xs"
                >
                  {taskTypeOptions
                    .filter((o) => o.value !== "all")
                    .map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="w-full h-11 px-3 border border-[#e7e1d5] rounded-xl bg-white text-xs"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Due Date</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full h-11 px-3.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs"
                />
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Assignee</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full h-11 px-3 border border-[#e7e1d5] rounded-xl bg-white text-xs"
                  required
                >
                  <option value="">Unassigned</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.role || 'Staff'})</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-nomichi-ink/40 tracking-wider">Task Description / Notes</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details of what needs to be discussed/completed..."
                  className="w-full p-3.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] text-xs resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskCreateOpen(false)}
                  className="px-5 py-2.5 border border-[#e7e1d5] bg-white rounded-xl font-bold cursor-pointer text-nomichi-ink/70 hover:bg-[#FAF8F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white rounded-xl font-bold cursor-pointer shadow-md border-0"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
