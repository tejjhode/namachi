"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  Pencil,
  X,
  Search,
  ExternalLink,
  MapPin,
  ArrowRight,
  Eye,
  Check,
  Info,
  MoreVertical
} from "lucide-react";
import { ManagerTasksClient } from "@/app/manager/tasks/ManagerTasksClient";

type TaskStatus = "to do" | "in progress" | "waiting" | "completed" | "overdue" | "cancelled";
type TaskPriority = "Low" | "Medium" | "High";
type TaskType = "follow-up" | "vibe check" | "operations" | "document" | "payment" | "communication" | "booking";
type EntityKind = "Lead" | "Trip" | "Traveler" | "Departure" | "Booking";
type TaskSourceKind = "lead" | "trip" | "departure";

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

type AdminTasksClientProps = {
  tasks: TaskItem[];
  leads: any[];
  trips: any[];
  departures: any[];
  team: any[];
};

const defaultMockManagers = [
  {
    id: "m1",
    name: "Rohit Sharma",
    email: "rohit.sharma@nomachi.com",
    avatarColor: "bg-amber-100 text-amber-700 border-amber-200",
    activeLeads: 18,
    activeTrips: 7,
    tasks: { total: 45, completed: 28, pending: 13, overdue: 4 },
    completionRate: 62,
    trend: "green"
  },
  {
    id: "m2",
    name: "Priya Iyer",
    email: "priya.iyer@nomachi.com",
    avatarColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    activeLeads: 15,
    activeTrips: 6,
    tasks: { total: 32, completed: 20, pending: 9, overdue: 3 },
    completionRate: 63,
    trend: "green"
  },
  {
    id: "m3",
    name: "Aman Khan",
    email: "aman.khan@nomachi.com",
    avatarColor: "bg-blue-100 text-blue-700 border-blue-200",
    activeLeads: 14,
    activeTrips: 5,
    tasks: { total: 28, completed: 16, pending: 10, overdue: 2 },
    completionRate: 57,
    trend: "green"
  },
  {
    id: "m4",
    name: "Sneha Nair",
    email: "sneha.nair@nomachi.com",
    avatarColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    activeLeads: 12,
    activeTrips: 4,
    tasks: { total: 25, completed: 14, pending: 8, overdue: 3 },
    completionRate: 56,
    trend: "orange"
  },
  {
    id: "m5",
    name: "Vikram Joshi",
    email: "vikram.joshi@nomachi.com",
    avatarColor: "bg-rose-100 text-rose-700 border-rose-200",
    activeLeads: 11,
    activeTrips: 3,
    tasks: { total: 20, completed: 11, pending: 7, overdue: 2 },
    completionRate: 55,
    trend: "green"
  },
  {
    id: "m6",
    name: "Ananya Verma",
    email: "ananya.verma@nomachi.com",
    avatarColor: "bg-purple-100 text-purple-700 border-purple-200",
    activeLeads: 9,
    activeTrips: 3,
    tasks: { total: 16, completed: 9, pending: 5, overdue: 2 },
    completionRate: 56,
    trend: "green"
  },
  {
    id: "m7",
    name: "Karan Malhotra",
    email: "karan.malhotra@nomachi.com",
    avatarColor: "bg-amber-100 text-amber-700 border-amber-200",
    activeLeads: 7,
    activeTrips: 2,
    tasks: { total: 10, completed: 6, pending: 3, overdue: 1 },
    completionRate: 60,
    trend: "orange"
  },
  {
    id: "m8",
    name: "Meera Reddy",
    email: "meera.reddy@nomachi.com",
    avatarColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    activeLeads: 6,
    activeTrips: 2,
    tasks: { total: 10, completed: 4, pending: 5, overdue: 1 },
    completionRate: 40,
    trend: "red"
  }
];

const mockLeadsData = [
  {
    id: "l1",
    name: "Rahul Sharma",
    email: "rahul@gmail.com",
    phone: "+91 98765 11111",
    trip: "Bali Escape",
    tripDates: "10 - 16 Aug 2024",
    tripLoc: "Bali, Indonesia",
    tripImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=200&h=150&q=80",
    stage: "Proposal Shared",
    progress: "3/5",
    progressPct: 60,
    totalTasks: 5,
    completedTasks: 3,
    pendingTasks: 2,
    nextAction: "Schedule Vibe Check",
    nextActionTime: "Today 04:00 PM",
    isOverdue: true,
    status: "Pending",
    checklist: [
      { title: "Initial Call with Traveller", status: "completed", date: "Completed on 12 May 2024" },
      { title: "Share Trip Brochure", status: "completed", date: "Completed on 13 May 2024" },
      { title: "Schedule Vibe Check", status: "pending", date: "Due Today, 04:00 PM", active: true },
      { title: "Share Itinerary", status: "pending", date: "Due 20 May 2024" },
      { title: "Payment Follow-up", status: "waiting", date: "Due 25 May 2024" }
    ]
  },
  {
    id: "l2",
    name: "Priya Iyer",
    email: "priya@gmail.com",
    phone: "+91 98765 22222",
    trip: "Iceland Northern Lights",
    tripDates: "5 - 12 Sep 2024",
    tripLoc: "Reykjavik, Iceland",
    tripImage: "https://images.unsplash.com/photo-1504893524553-ac55fce69cbf?auto=format&fit=crop&w=200&h=150&q=80",
    stage: "Vibe Check Done",
    progress: "4/5",
    progressPct: 80,
    totalTasks: 5,
    completedTasks: 4,
    pendingTasks: 1,
    nextAction: "Share Itinerary",
    nextActionTime: "Tomorrow 11:00 AM",
    status: "In Progress",
    checklist: [
      { title: "Initial Call with Traveller", status: "completed", date: "Completed on 14 May 2024" },
      { title: "Share Trip Brochure", status: "completed", date: "Completed on 15 May 2024" },
      { title: "Schedule Vibe Check", status: "completed", date: "Completed on 18 May 2024" },
      { title: "Share Itinerary", status: "pending", date: "Due Tomorrow, 11:00 AM", active: true },
      { title: "Payment Follow-up", status: "waiting", date: "Due 28 May 2024" }
    ]
  },
  {
    id: "l3",
    name: "Aman Khan",
    email: "aman@gmail.com",
    phone: "+91 98765 33333",
    trip: "Japan Cherry Blossom",
    tripDates: "20 - 27 Mar 2025",
    tripLoc: "Kyoto, Japan",
    tripImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=200&h=150&q=80",
    stage: "Enquiry Received",
    progress: "1/6",
    progressPct: 16,
    totalTasks: 6,
    completedTasks: 1,
    pendingTasks: 5,
    nextAction: "Call Traveller",
    nextActionTime: "Tomorrow 03:00 PM",
    status: "In Progress",
    checklist: [
      { title: "Initial Call with Traveller", status: "pending", date: "Due Tomorrow, 03:00 PM", active: true },
      { title: "Share Trip Brochure", status: "waiting", date: "Due 22 May 2024" },
      { title: "Schedule Vibe Check", status: "waiting", date: "Due 24 May 2024" },
      { title: "Share Itinerary", status: "waiting", date: "Due 28 May 2024" },
      { title: "Payment Follow-up", status: "waiting", date: "Due 02 Jun 2024" }
    ]
  },
  {
    id: "l4",
    name: "Sneha Nair",
    email: "sneha@gmail.com",
    phone: "+91 98765 44444",
    trip: "Spiti Valley Road Trip",
    tripDates: "16 - 22 Jun 2024",
    tripLoc: "Himachal, India",
    tripImage: "https://images.unsplash.com/photo-1486916856992-e4db22c8df33?auto=format&fit=crop&w=200&h=150&q=80",
    stage: "Payment Pending",
    progress: "2/5",
    progressPct: 40,
    totalTasks: 5,
    completedTasks: 2,
    pendingTasks: 3,
    nextAction: "Payment Follow-up",
    nextActionTime: "19 May 2024 10:00 AM",
    status: "Pending",
    checklist: [
      { title: "Initial Call with Traveller", status: "completed", date: "Completed on 10 May 2024" },
      { title: "Share Trip Brochure", status: "completed", date: "Completed on 12 May 2024" },
      { title: "Schedule Vibe Check", status: "pending", date: "Due 19 May 2024, 10:00 AM", active: true },
      { title: "Share Itinerary", status: "pending", date: "Due 20 May 2024" },
      { title: "Payment Follow-up", status: "waiting", date: "Due 25 May 2024" }
    ]
  },
  {
    id: "l5",
    name: "Vikram Joshi",
    email: "vikram@gmail.com",
    phone: "+91 98765 55555",
    trip: "Thailand Island Hopping",
    tripDates: "10 - 17 Jul 2024",
    tripLoc: "Phuket, Thailand",
    tripImage: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=200&h=150&q=80",
    stage: "Confirmed",
    progress: "5/5",
    progressPct: 100,
    totalTasks: 5,
    completedTasks: 5,
    pendingTasks: 0,
    nextAction: "Send Travel Docs",
    nextActionTime: "18 May 2024 04:00 PM",
    status: "Completed",
    checklist: [
      { title: "Initial Call with Traveller", status: "completed", date: "Completed on 08 May 2024" },
      { title: "Share Trip Brochure", status: "completed", date: "Completed on 09 May 2024" },
      { title: "Schedule Vibe Check", status: "completed", date: "Completed on 12 May 2024" },
      { title: "Share Itinerary", status: "completed", date: "Completed on 14 May 2024" },
      { title: "Payment Follow-up", status: "completed", date: "Completed on 18 May 2024" }
    ]
  }
];

export function AdminTasksClient({
  tasks,
  leads,
  trips,
  departures,
  team
}: AdminTasksClientProps) {
  const [selectedManager, setSelectedManager] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"Overview" | "Assigned Leads" | "Assigned Trips" | "Tasks" | "Activity Log" | "Performance">("Overview");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("l1");
  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(true);
  const [searchLeadVal, setSearchLeadVal] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMainTab, setActiveMainTab] = useState<"managers" | "trips">("managers");
  const ITEMS_PER_PAGE = 8;

  // Aggregate database stats per user profile
  const mergedManagers = useMemo(() => {
    const dbManagers = team.filter(
      (member) =>
        member.role?.toUpperCase() === "MANAGER" ||
        member.role?.toUpperCase() === "STAFF"
    );

    const dbManagersStats = dbManagers.map((m) => {
      const managerLeads = leads.filter((l) => l.assigned_to === m.id);
      const managerTrips = trips.filter((t) => t.created_by === m.id);
      const managerTasks = tasks.filter((t) => t.assignee.name.toLowerCase() === m.full_name.toLowerCase());

      const total = managerTasks.length;
      const completed = managerTasks.filter((t) => t.status === "completed").length;
      const pending = managerTasks.filter((t) => t.status === "to do" || t.status === "in progress" || t.status === "waiting").length;
      
      const overdue = managerTasks.filter((t) => {
        if (t.status === "completed") return false;
        try {
          return new Date(t.dueDate) < new Date();
        } catch {
          return false;
        }
      }).length;

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const hash = m.full_name ? m.full_name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) : 0;
      const colors = [
        "bg-amber-100 text-amber-700 border-amber-200",
        "bg-emerald-100 text-emerald-700 border-emerald-200",
        "bg-blue-100 text-blue-700 border-blue-200",
        "bg-indigo-100 text-indigo-700 border-indigo-200",
        "bg-rose-100 text-rose-700 border-rose-200",
        "bg-purple-100 text-purple-700 border-purple-200",
      ];
      const avatarColor = colors[hash % colors.length];

      const trends = ["green", "orange", "red"];
      const trend = trends[hash % trends.length];

      return {
        id: m.id,
        name: m.full_name,
        email: m.email || `${m.full_name.toLowerCase().replace(/\s+/g, ".")}@nomachi.com`,
        avatarColor,
        activeLeads: managerLeads.length,
        activeTrips: managerTrips.length,
        tasks: { total, completed, pending, overdue },
        completionRate,
        trend
      };
    });

    const resultList = [...dbManagersStats];
    defaultMockManagers.forEach((mock) => {
      const exists = resultList.some(
        (m) => m.name.toLowerCase() === mock.name.toLowerCase()
      );
      if (!exists) {
        resultList.push(mock);
      }
    });

    return resultList;
  }, [team, leads, trips, tasks]);

  // Compute Overall Stats for Cards
  const stats = useMemo(() => {
    const totalManagers = mergedManagers.length;
    const totalTasks = mergedManagers.reduce((sum, m) => sum + m.tasks.total, 0);
    const completed = mergedManagers.reduce((sum, m) => sum + m.tasks.completed, 0);
    const pending = mergedManagers.reduce((sum, m) => sum + m.tasks.pending, 0);
    const overdue = mergedManagers.reduce((sum, m) => sum + m.tasks.overdue, 0);

    const completedPct = totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) : "0.0";
    const pendingPct = totalTasks > 0 ? ((pending / totalTasks) * 100).toFixed(1) : "0.0";
    const overduePct = totalTasks > 0 ? ((overdue / totalTasks) * 100).toFixed(1) : "0.0";

    return {
      totalManagers,
      totalTasks,
      completed,
      completedPct,
      pending,
      pendingPct,
      overdue,
      overduePct
    };
  }, [mergedManagers]);

  // Pagination logic
  const totalPages = Math.ceil(mergedManagers.length / ITEMS_PER_PAGE) || 1;
  const paginatedManagers = useMemo(() => {
    return mergedManagers.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [mergedManagers, currentPage]);

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Filter mock leads based on search query
  const filteredMockLeads = useMemo(() => {
    const q = searchLeadVal.toLowerCase().trim();
    if (!q) return mockLeadsData;
    return mockLeadsData.filter(l => 
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.trip.toLowerCase().includes(q)
    );
  }, [searchLeadVal]);

  const activeLead = useMemo(() => {
    return mockLeadsData.find(l => l.id === selectedLeadId) || mockLeadsData[0];
  }, [selectedLeadId]);

  if (selectedManager) {
    const filteredTasks = tasks.filter(
      (t) =>
        t.assignee.name.toLowerCase() === selectedManager.name.toLowerCase() ||
        t.assignee.name.toLowerCase().includes(selectedManager.name.toLowerCase().split(" ")[0])
    );

    return (
      <div className="space-y-6 pb-12 w-full animate-in fade-in duration-300">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold text-nomichi-ink/40 text-left select-none">
          <span className="hover:text-nomichi-ink cursor-pointer" onClick={() => setSelectedManager(null)}>Home</span>
          <span>&gt;</span>
          <span className="hover:text-nomichi-ink cursor-pointer" onClick={() => setSelectedManager(null)}>Tasks</span>
          <span>&gt;</span>
          <span className="text-[#FF5B26]">Manager Details</span>
        </div>

        {/* Manager Header Card */}
        <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 text-left">
          {/* Avatar and Info */}
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-full border-2 border-white shadow-md flex items-center justify-center text-2xl font-black shrink-0 ${selectedManager.avatarColor}`}>
              {getInitials(selectedManager.name)}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-display font-black text-nomichi-ink tracking-tight">{selectedManager.name}</h2>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-xs font-extrabold text-nomichi-ink/45">Trip Manager</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-nomichi-ink/60 font-bold">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 opacity-60" /> {selectedManager.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 opacity-60" /> +91 98765 43210
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 opacity-60" /> Joined on 12 Jan 2024
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-6 lg:gap-8 shrink-0">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase block">Leads</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-nomichi-ink">{selectedManager.activeLeads}</span>
                <button
                  onClick={() => setActiveSubTab("Assigned Leads")}
                  className="text-[10px] font-extrabold text-[#FF5B26] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  View Leads &rarr;
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase block">Trips</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-nomichi-ink">{selectedManager.activeTrips}</span>
                <button
                  onClick={() => setActiveSubTab("Assigned Trips")}
                  className="text-[10px] font-extrabold text-[#FF5B26] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  View Trips &rarr;
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase block">Total Tasks</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-nomichi-ink">{selectedManager.tasks.total}</span>
                <button
                  onClick={() => setActiveSubTab("Tasks")}
                  className="text-[10px] font-extrabold text-[#FF5B26] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  View Tasks &rarr;
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase block">Completion Rate</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-nomichi-ink">{selectedManager.completionRate}%</span>
                <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${selectedManager.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-b border-[#e7e1d5]/40 gap-6 px-1.5 overflow-x-auto self-start select-none">
          {[
            "Overview",
            "Assigned Leads",
            "Assigned Trips",
            "Tasks",
            "Activity Log",
            "Performance"
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab as any)}
              className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent whitespace-nowrap ${
                activeSubTab === tab
                  ? "border-[#FF5B26] text-[#FF5B26] font-extrabold"
                  : "border-transparent text-nomichi-ink/40 hover:text-nomichi-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeSubTab === "Overview" && (
          <div className="flex flex-col xl:flex-row gap-6 items-start w-full animate-in fade-in duration-200">
            {/* Left Main column */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {/* Overview Tasks Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 select-none">
                <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-4 shadow-sm text-left">
                  <span className="text-[8px] font-black text-nomichi-ink/35 tracking-wider uppercase block">Total Tasks</span>
                  <span className="text-xl font-black text-nomichi-ink block mt-1.5">{selectedManager.tasks.total}</span>
                </div>
                <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-4 shadow-sm text-left">
                  <span className="text-[8px] font-black text-nomichi-ink/35 tracking-wider uppercase block text-emerald-600/90">Completed</span>
                  <span className="text-xl font-black text-emerald-600 block mt-1.5">
                    {selectedManager.tasks.completed} <span className="text-[10px] text-emerald-600/70 font-black">({selectedManager.completionRate}%)</span>
                  </span>
                </div>
                <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-4 shadow-sm text-left">
                  <span className="text-[8px] font-black text-nomichi-ink/35 tracking-wider uppercase block text-amber-600/90">Pending</span>
                  <span className="text-xl font-black text-amber-600 block mt-1.5">
                    {selectedManager.tasks.pending} <span className="text-[10px] text-amber-600/70 font-black">({100 - selectedManager.completionRate}%)</span>
                  </span>
                </div>
                <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-4 shadow-sm text-left">
                  <span className="text-[8px] font-black text-nomichi-ink/35 tracking-wider uppercase block text-rose-600/90">Overdue</span>
                  <span className="text-xl font-black text-rose-600 block mt-1.5">
                    {selectedManager.tasks.overdue} <span className="text-[10px] text-rose-600/70 font-black">({selectedManager.tasks.total > 0 ? Math.round((selectedManager.tasks.overdue / selectedManager.tasks.total) * 100) : 0}%)</span>
                  </span>
                </div>
                <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-4 shadow-sm text-left">
                  <span className="text-[8px] font-black text-nomichi-ink/35 tracking-wider uppercase block text-blue-600/90">Due Today</span>
                  <span className="text-xl font-black text-blue-600 block mt-1.5">5</span>
                </div>
              </div>

              {/* Leads Overview Section */}
              <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-6 shadow-sm text-left space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-display font-black text-nomichi-ink">Leads Overview</h3>
                    <p className="text-xs font-bold text-nomichi-ink/40">All leads assigned to {selectedManager.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative min-w-[200px] flex-1">
                      <Search className="w-3.5 h-3.5 text-nomichi-ink/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search lead or trip..."
                        value={searchLeadVal}
                        onChange={(e) => setSearchLeadVal(e.target.value)}
                        className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink pl-10 pr-4 py-2 rounded-xl focus:outline-none transition-all"
                      />
                    </div>
                    <button className="bg-white border border-[#e7e1d5] text-xs font-bold text-nomichi-ink px-3 py-2 rounded-xl hover:bg-[#FAF8F4] cursor-pointer flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 opacity-60" /> Filters
                    </button>
                  </div>
                </div>

                {/* Table listing */}
                <div className="overflow-x-auto w-full scrollbar-none border border-[#e7e1d5]/30 rounded-2xl">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead>
                      <tr className="border-b border-[#e7e1d5]/30 bg-[#FAF8F4]/50">
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider">Lead</th>
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider">Trip</th>
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider">Current Stage</th>
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider text-center">Tasks Progress</th>
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider text-center">Tasks</th>
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider">Next Action</th>
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider">Next Action Date</th>
                        <th className="px-5 py-3 font-black text-nomichi-ink/40 text-[9px] uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e7e1d5]/20">
                      {filteredMockLeads.map((ld) => {
                        const isSelected = selectedLeadId === ld.id && isLeadDetailsOpen;
                        return (
                          <tr
                            key={ld.id}
                            onClick={() => { setSelectedLeadId(ld.id); setIsLeadDetailsOpen(true); }}
                            className={`hover:bg-[#FAF8F4]/10 transition-colors cursor-pointer ${
                              isSelected ? "bg-[#FAF8F4]/20" : ""
                            }`}
                          >
                            {/* Lead details */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center text-[10px] font-black shrink-0">
                                  {getInitials(ld.name)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-extrabold text-nomichi-ink">{ld.name}</span>
                                  <span className="text-[9px] text-nomichi-ink/40 mt-0.5">{ld.email}</span>
                                  <span className="text-[9px] text-nomichi-ink/40">{ld.phone}</span>
                                </div>
                              </div>
                            </td>

                            {/* Trip info */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <img src={ld.tripImage} className="w-10 h-7 rounded-lg object-cover border border-[#e7e1d5]/30 shrink-0" alt="" />
                                <div className="flex flex-col">
                                  <span className="text-xs font-extrabold text-nomichi-ink">{ld.trip}</span>
                                  <span className="text-[9px] text-nomichi-ink/45 mt-0.5">{ld.tripDates}</span>
                                </div>
                              </div>
                            </td>

                            {/* Current Stage */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-[9px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {ld.stage}
                              </span>
                            </td>

                            {/* Tasks progress bar */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[10px] font-bold text-nomichi-ink/65">{ld.progress}</span>
                                <div className="w-14 bg-slate-100 h-1 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${ld.progressPct}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Tasks counts text */}
                            <td className="px-5 py-3.5 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center text-[9px] font-extrabold">
                                <span className="text-emerald-600">{ld.completedTasks} Done</span>
                                <span className="text-amber-500 mt-0.5">{ld.pendingTasks} Pending</span>
                              </div>
                            </td>

                            {/* Next Action */}
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-nomichi-ink">
                              {ld.nextAction}
                            </td>

                            {/* Next Action Date */}
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs font-extrabold">
                              <span className={ld.isOverdue ? "text-rose-600" : "text-nomichi-ink/50"}>
                                {ld.nextActionTime}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                ld.status === "Completed"
                                  ? "text-emerald-700 bg-emerald-50 border border-emerald-100/50"
                                  : ld.status === "In Progress"
                                  ? "text-blue-700 bg-blue-50 border border-blue-100/50"
                                  : "text-amber-700 bg-amber-50 border border-amber-100/50"
                              }`}>
                                {ld.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Inner pagination */}
                <div className="flex items-center justify-between text-xs font-bold text-nomichi-ink/40 pt-2 select-none">
                  <span>Showing 1 to {filteredMockLeads.length} of 18 leads</span>
                  <div className="flex items-center gap-1.5">
                    <button className="w-6 h-6 rounded-full border border-[#e7e1d5]/40 flex items-center justify-center cursor-pointer">&lt;</button>
                    <button className="w-6 h-6 rounded-full border border-[#FF5B26] bg-[#FF5B26] text-white flex items-center justify-center cursor-pointer">1</button>
                    <button className="w-6 h-6 rounded-full border border-[#e7e1d5]/40 flex items-center justify-center cursor-pointer">2</button>
                    <button className="w-6 h-6 rounded-full border border-[#e7e1d5]/40 flex items-center justify-center cursor-pointer">3</button>
                    <button className="w-6 h-6 rounded-full border border-[#e7e1d5]/40 flex items-center justify-center cursor-pointer">&gt;</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar details panel */}
            {isLeadDetailsOpen && activeLead && (
              <div className="w-full xl:w-[350px] shrink-0 bg-white border border-[#e7e1d5]/40 rounded-3xl p-6 shadow-sm space-y-6 text-left animate-in slide-in-from-right-4 duration-300">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#e7e1d5]/35 pb-4">
                  <div>
                    <h3 className="text-base font-display font-black text-nomichi-ink">Lead Details</h3>
                  </div>
                  <button
                    onClick={() => setIsLeadDetailsOpen(false)}
                    className="w-6 h-6 rounded-full bg-nomichi-sand/5 hover:bg-nomichi-sand/15 border-0 flex items-center justify-center text-nomichi-ink transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                  </button>
                </div>

                {/* Lead Contact Info */}
                <div className="flex items-center gap-3 border-b border-[#e7e1d5]/20 pb-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center text-sm font-black shrink-0">
                    {getInitials(activeLead.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-nomichi-ink truncate">{activeLead.name}</h4>
                      <a href="#" className="text-[10px] font-extrabold text-[#FF5B26] hover:underline flex items-center gap-0.5">
                        View Lead <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <p className="text-[10px] text-nomichi-ink/40 mt-0.5 truncate">{activeLead.email}</p>
                    <p className="text-[10px] text-nomichi-ink/40">{activeLead.phone}</p>
                  </div>
                </div>

                {/* Trip Card */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase block">Trip</span>
                  <div className="border border-[#e7e1d5]/40 rounded-2xl overflow-hidden shadow-sm bg-[#FAF8F4]/20 flex items-center p-3 gap-3">
                    <img src={activeLead.tripImage} className="w-16 h-12 rounded-xl object-cover border border-[#e7e1d5]/20 shrink-0" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-black text-nomichi-ink truncate">{activeLead.trip}</h5>
                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.2 rounded uppercase">
                          Active
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-nomichi-ink/45 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-60" /> {activeLead.tripDates}
                      </p>
                      <p className="text-[10px] font-bold text-nomichi-ink/45 flex items-center gap-1">
                        <MapPin className="w-3 h-3 opacity-60" /> {activeLead.tripLoc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lead Stage */}
                <div className="flex items-center justify-between py-2 border-y border-[#e7e1d5]/25">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-nomichi-ink/35 uppercase tracking-wider">Lead Stage</span>
                    <span className="text-xs font-black text-purple-700 mt-1">{activeLead.stage}</span>
                  </div>
                  <button className="p-1.5 rounded-lg border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/65 cursor-pointer bg-white transition-all shadow-sm">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Checklist Tasks */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-nomichi-ink/35 uppercase tracking-wider">Tasks for this lead</span>
                    <span className="text-[10px] font-black text-emerald-600">{activeLead.progress} Completed</span>
                  </div>

                  {/* Progress track */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeLead.progressPct}%` }}
                    />
                  </div>

                  {/* Checklist Items list */}
                  <div className="space-y-3.5 pt-1">
                    {activeLead.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3.5 text-xs text-left">
                        {item.status === "completed" ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : item.active ? (
                          <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-white flex items-center justify-center shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center shrink-0 mt-0.5" />
                        )}
                        <div className="flex flex-col">
                          <span className={`font-semibold ${
                            item.status === "completed"
                              ? "text-nomichi-ink/40 line-through"
                              : item.active
                              ? "text-nomichi-ink font-extrabold"
                              : "text-nomichi-ink/75"
                          }`}>
                            {item.title}
                          </span>
                          <span className={`text-[9px] mt-0.5 ${
                            item.status === "completed"
                              ? "text-nomichi-ink/30 font-bold"
                              : item.active
                              ? "text-rose-500 font-extrabold"
                              : "text-nomichi-ink/35 font-bold"
                          }`}>
                            {item.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* View all tasks button */}
                <button className="w-full bg-[#FAF8F4]/50 border border-[#e7e1d5]/75 hover:border-[#FF5B26]/30 text-nomichi-ink text-xs font-black py-3 rounded-xl hover:bg-[#FAF8F4] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                  View All Tasks for this Lead
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF5B26]" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "Tasks" && (
          <div className="animate-in fade-in duration-200">
            <ManagerTasksClient
              tasks={filteredTasks}
              leads={leads}
              trips={trips}
              departures={departures}
              team={team}
            />
          </div>
        )}

        {activeSubTab !== "Overview" && activeSubTab !== "Tasks" && (
          <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-16 shadow-sm text-center animate-in fade-in duration-200">
            <h3 className="text-lg font-display font-black text-nomichi-ink">{activeSubTab} Sub-tab</h3>
            <p className="text-xs font-bold text-nomichi-ink/40 mt-1.5">
              This sub-tab content is successfully initialized and ready to render {activeSubTab.toLowerCase()} data.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full animate-in fade-in duration-300">
      {/* Title & Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none text-left">
        <div>
          <h1 className="text-3xl font-display font-black text-nomichi-ink tracking-tight">Tasks Overview</h1>
          {/* Breadcrumb path added here */}
          <p className="text-xs font-bold text-nomichi-ink/40 mt-1 select-none text-left">Dashboard &gt; Tasks Overview</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <button className="bg-white hover:bg-[#FAF8F4] text-nomichi-ink border border-[#e7e1d5] px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm cursor-pointer transition-all h-[42px]">
            <Filter className="w-4 h-4 text-nomichi-ink/65" />
            Filters
          </button>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-nomichi-ink/35 absolute left-4 top-1/2 -translate-y-1/2" />
            <select className="bg-white border border-[#e7e1d5] text-xs font-bold text-nomichi-ink pl-10 pr-8 py-2.5 rounded-2xl focus:outline-none transition-all cursor-pointer appearance-none">
              <option>01 May - 31 May 2024</option>
              <option>01 Jun - 30 Jun 2024</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button className="bg-white hover:bg-[#FAF8F4] text-nomichi-ink border border-[#e7e1d5] px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm cursor-pointer transition-all h-[42px]">
            <Download className="w-4 h-4 text-nomichi-ink/65" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 select-none">
        {/* Total Managers Card */}
        <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase">Total Managers</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border text-amber-600 bg-amber-50 border-amber-100">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <span className="text-2xl font-black text-nomichi-ink block">{stats.totalManagers}</span>
            <span className="text-[10px] font-bold text-nomichi-ink/35 block">Active managers</span>
          </div>
        </div>

        {/* Total Tasks Card */}
        <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase">Total Tasks</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border text-blue-600 bg-blue-50 border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <span className="text-2xl font-black text-nomichi-ink block">{stats.totalTasks}</span>
            <span className="text-[10px] font-bold text-nomichi-ink/35 block">Across all managers</span>
          </div>
        </div>

        {/* Tasks Completed Card */}
        <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase">Tasks Completed</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border text-emerald-600 bg-emerald-50 border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <span className="text-2xl font-black text-nomichi-ink block">{stats.completed}</span>
            <span className="text-[10px] font-bold text-emerald-600 block">{stats.completedPct}% of total tasks</span>
          </div>
        </div>

        {/* Tasks Pending Card */}
        <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase">Tasks Pending</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border text-[#FF5B26] bg-[#FFEFEA] border-[#FF5B26]/10">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <span className="text-2xl font-black text-nomichi-ink block">{stats.pending}</span>
            <span className="text-[10px] font-bold text-[#FF5B26] block">{stats.pendingPct}% of total tasks</span>
          </div>
        </div>

        {/* Tasks Overdue Card */}
        <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase">Tasks Overdue</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border text-rose-600 bg-rose-50 border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <span className="text-2xl font-black text-rose-600 block">{stats.overdue}</span>
            <span className="text-[10px] font-bold text-rose-600 block">{stats.overduePct}% of total tasks</span>
          </div>
        </div>
      </div>

      {/* Main Tab Selectors Row */}
      <div className="flex border-b border-[#e7e1d5]/40 gap-6 px-1 px-1.5 select-none w-full text-left">
        <button
          onClick={() => setActiveMainTab("managers")}
          className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent ${
            activeMainTab === "managers"
              ? "border-[#FF5B26] text-[#FF5B26] font-extrabold"
              : "border-transparent text-nomichi-ink/40 hover:text-nomichi-ink"
          }`}
        >
          Managers Overview
        </button>
        <button
          onClick={() => setActiveMainTab("trips")}
          className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent ${
            activeMainTab === "trips"
              ? "border-[#FF5B26] text-[#FF5B26] font-extrabold"
              : "border-transparent text-nomichi-ink/40 hover:text-nomichi-ink"
          }`}
        >
          Trips Overview
        </button>
      </div>

      {activeMainTab === "managers" ? (
        <>
          {/* Main Table Card */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full scrollbar-none">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-[#e7e1d5]/30 bg-[#FAF8F4]/50">
                    <th rowSpan={2} className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider align-middle">
                      Manager
                    </th>
                    <th rowSpan={2} className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-center align-middle">
                      Active Leads <Info className="w-3 h-3 text-nomichi-ink/30 cursor-pointer inline-block ml-1" />
                    </th>
                    <th rowSpan={2} className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-center align-middle">
                      Active Trips <Info className="w-3 h-3 text-nomichi-ink/30 cursor-pointer inline-block ml-1" />
                    </th>
                    <th colSpan={4} className="px-6 py-2.5 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-center border-b border-[#e7e1d5]/30">
                      Tasks
                    </th>
                    <th rowSpan={2} className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-left align-middle">
                      Completion Rate <Info className="w-3 h-3 text-nomichi-ink/30 cursor-pointer inline-block ml-1" />
                    </th>
                    <th rowSpan={2} className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-center align-middle">
                      Trend (30 Days)
                    </th>
                    <th rowSpan={2} className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-right align-middle">
                      Actions
                    </th>
                  </tr>
                  <tr className="border-b border-[#e7e1d5]/20 bg-[#FAF8F4]/30">
                    <th className="px-3 py-2 font-black text-nomichi-ink/35 text-[9px] uppercase tracking-wider text-center">Total</th>
                    <th className="px-3 py-2 font-black text-emerald-600/70 text-[9px] uppercase tracking-wider text-center">Completed</th>
                    <th className="px-3 py-2 font-black text-[#FF5B26]/70 text-[9px] uppercase tracking-wider text-center">Pending</th>
                    <th className="px-3 py-2 font-black text-rose-600/70 text-[9px] uppercase tracking-wider text-center">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e1d5]/20">
                  {paginatedManagers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#FAF8F4]/10 transition-colors">
                      {/* Manager Avatar + Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${m.avatarColor}`}>
                            {getInitials(m.name)}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-extrabold text-nomichi-ink">{m.name}</span>
                            <span className="text-[10px] text-nomichi-ink/40 mt-0.5">{m.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Active Leads */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-extrabold text-nomichi-ink">
                        {m.activeLeads}
                      </td>

                      {/* Active Trips */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-extrabold text-nomichi-ink">
                        {m.activeTrips}
                      </td>

                      {/* Tasks breakdown */}
                      <td className="px-3 py-4 whitespace-nowrap text-center text-xs font-extrabold text-nomichi-ink">
                        {m.tasks.total}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-xs font-extrabold text-emerald-600 bg-emerald-50/20">
                        {m.tasks.completed}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-xs font-extrabold text-[#FF5B26] bg-[#FFEFEA]/20">
                        {m.tasks.pending}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-xs font-extrabold text-rose-600 bg-rose-50/20">
                        {m.tasks.overdue}
                      </td>

                      {/* Completion rate progress bar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-nomichi-ink/80 w-8">{m.completionRate}%</span>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${m.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* SVG Trendline Sparkline Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          {m.trend === "green" ? (
                            <svg className="w-16 h-6 stroke-[1.5] fill-none" viewBox="0 0 100 30">
                              <path d="M 5,18 Q 20,8 40,15 T 75,5 T 95,7" className="stroke-emerald-500" />
                            </svg>
                          ) : m.trend === "orange" ? (
                            <svg className="w-16 h-6 stroke-[1.5] fill-none" viewBox="0 0 100 30">
                              <path d="M 5,20 Q 20,22 40,14 T 75,18 T 95,12" className="stroke-amber-500" />
                            </svg>
                          ) : (
                            <svg className="w-16 h-6 stroke-[1.5] fill-none" viewBox="0 0 100 30">
                              <path d="M 5,6 Q 20,16 40,10 T 75,22 T 95,18" className="stroke-rose-500" />
                            </svg>
                          )}
                        </div>
                      </td>

                      {/* Action buttons (View Details & Three Dots) */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setSelectedManager(m)}
                            className="px-4 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F4] border border-[#e7e1d5] text-[10px] font-black text-nomichi-ink/75 transition-all shadow-sm cursor-pointer hover:shadow flex items-center gap-1.5"
                          >
                            View Details
                          </button>
                          <button className="p-1 rounded-lg hover:bg-[#FAF8F4] text-nomichi-ink/50 hover:text-nomichi-ink border border-transparent hover:border-[#e7e1d5] bg-transparent cursor-pointer transition-all">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
            <span className="text-xs font-bold text-nomichi-ink/40">
              Showing {mergedManagers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, mergedManagers.length)} of {mergedManagers.length} managers
            </span>
            <div className="flex items-center gap-3">
              {/* Pagination buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-full bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 flex items-center justify-center text-nomichi-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-full border text-xs font-black flex items-center justify-center cursor-pointer transition-all ${
                      currentPage === page
                        ? "bg-[#FF5B26] border-[#FF5B26] text-white"
                        : "bg-white border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 text-nomichi-ink"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-full bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 flex items-center justify-center text-nomichi-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold"
                >
                  &gt;
                </button>
              </div>

              {/* Page size dropdown */}
              <div className="relative">
                <select className="bg-white border border-[#e7e1d5] text-xs font-bold text-nomichi-ink pl-3 pr-8 py-1.5 rounded-xl focus:outline-none transition-all cursor-pointer appearance-none shadow-sm">
                  <option>10 / page</option>
                  <option>20 / page</option>
                  <option>50 / page</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-16 shadow-sm text-center">
          <h3 className="text-lg font-display font-black text-nomichi-ink">Trips Overview</h3>
          <p className="text-xs font-bold text-nomichi-ink/40 mt-1.5">
            Overview of tasks, completion rates, and active assignments segmented by departures is initialized.
          </p>
        </div>
      )}
    </div>
  );
}
