"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  Filter,
  Clock3,
  Mail,
  MessageSquare,
  MessageCircle,
  MoreVertical,
  Plane,
  Search,
  Users,
  MapPin,
  Loader2,
  Phone,
} from "lucide-react";

type ActivityCategory = "system" | "leads" | "trips" | "payments" | "messages" | "documents" | "team";

type ActivityItem = {
  id: string;
  label: string;
  details: string;
  entity: string;
  entityType: string;
  category: ActivityCategory;
  userId?: string | null;
  userName: string;
  userAvatar?: string | null;
  time: string;
  sortTime: number;
  action: string;
  status: string;
  entityId?: string | null;
};

type ManagerActivityClientProps = {
  user: {
    full_name: string;
    avatar_url?: string | null;
    email: string;
  };
  activities: ActivityItem[];
  leads: any[];
  trips: any[];
  departures: any[];
  team: any[];
};

const categoryMeta: Record<ActivityCategory, { label: string; className: string; icon: any }> = {
  system: { label: "System", className: "bg-slate-100 text-slate-600", icon: Activity },
  leads: { label: "Leads & Enquiries", className: "bg-[#FFF1EA] text-[#FF5B26]", icon: MessageSquare },
  trips: { label: "Trips & Bookings", className: "bg-[#EBF3FF] text-[#1E6BFF]", icon: Plane },
  payments: { label: "Payments", className: "bg-[#ECFDF5] text-[#16A34A]", icon: CreditCard },
  messages: { label: "Messages", className: "bg-[#F4EDFF] text-[#7C3AED]", icon: Mail },
  documents: { label: "Documents", className: "bg-[#FFF6E5] text-[#D97706]", icon: FileText },
  team: { label: "Team", className: "bg-[#EEF2FF] text-[#2563EB]", icon: Users },
};

const formatTime12Hour = (isoString?: string | null) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatTimelineDate = (isoString?: string | null) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCompactDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const inDateWindow = (value: string, range: string) => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  const now = Date.now();
  const day = 86400000;
  switch (range) {
    case "today":
      return timestamp >= now - day;
    case "yesterday":
      return timestamp < now - day && timestamp >= now - day * 2;
    case "this_week":
      return timestamp >= now - day * 7;
    case "last_week":
      return timestamp < now - day * 7 && timestamp >= now - day * 14;
    case "this_month":
      return timestamp >= now - day * 30;
    case "last_month":
      return timestamp < now - day * 30 && timestamp >= now - day * 60;
    default:
      return true;
  }
};

export function ManagerActivityClient({
  user,
  activities,
  leads,
  trips,
  departures,
  team,
}: ManagerActivityClientProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams ? searchParams.get("search") || "" : "";

  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [tripSelectOpen, setTripSelectOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("all");
  const [leadSelectOpen, setLeadSelectOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedTab, setSelectedTab] = useState<"all" | ActivityCategory>("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [dateWindow, setDateWindow] = useState("all");

  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);
  
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [activitiesLimit, setActivitiesLimit] = useState(10);

  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);

  const selectedTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const applyTab = (tab: "all" | ActivityCategory) => {
    setCurrentPage(1);
    setSelectedTab(tab);
  };

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach((item) => {
      if (item.userId) map.set(item.userId, item.userName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // Sort and filter raw list
    let list = [...activities];

    // Filter by selected trip
    if (selectedTripId !== "all" && selectedTrip) {
      list = list.filter((item) => {
        if (item.entityId === selectedTripId) return true;
        const isTripEvent = item.entityType === "Trip" && item.entity === selectedTrip.title;
        const matchingLead = leads.find((l) => l.name === item.entity || l.id === item.entityId);
        const isLeadEvent = matchingLead && (matchingLead.trips?.id === selectedTripId || matchingLead.trip_id === selectedTripId);
        const matchingDep = departures.find((d) => d.id === item.id || d.trip_id === selectedTripId);
        const isDepEvent = matchingDep && matchingDep.trip_id === selectedTripId;
        return isTripEvent || isLeadEvent || isDepEvent;
      });
    }

    // Filter by selected lead
    if (selectedLeadId !== "all" && selectedLead) {
      list = list.filter((item) => {
        if (item.entityId === selectedLeadId) return true;
        const isLeadEvent = item.entityType === "Lead" && item.entity === selectedLead.name;
        const isMessageEvent = item.category === "messages" && item.entity === selectedLead.name;
        return isLeadEvent || isMessageEvent;
      });
    }

    // Filter by activity type
    if (selectedTab !== "all") {
      list = list.filter((item) => item.category === selectedTab);
    }

    // Filter by user
    if (selectedUser !== "all") {
      list = list.filter((item) => item.userId === selectedUser);
    }

    // Filter by date window
    if (dateWindow !== "all") {
      list = list.filter((item) => inDateWindow(item.time, dateWindow));
    }

    // Search filter
    if (query) {
      list = list.filter((item) => {
        const searchable = `${item.label} ${item.details} ${item.entity} ${item.userName} ${item.entityType}`.toLowerCase();
        return searchable.includes(query);
      });
    }

    // Apply sorting
    if (sortBy === "oldest") {
      list.sort((a, b) => a.sortTime - b.sortTime);
    } else {
      list.sort((a, b) => b.sortTime - a.sortTime);
    }

    return list;
  }, [activities, selectedTripId, selectedTrip, selectedLeadId, selectedLead, leads, departures, selectedTab, selectedUser, dateWindow, searchQuery, sortBy]);

  const paginatedActivities = useMemo(() => {
    if (viewMode === "timeline") {
      return filteredActivities.slice(0, activitiesLimit);
    } else {
      return filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }
  }, [filteredActivities, viewMode, currentPage, activitiesLimit]);

  const paginationCount = Math.max(1, Math.ceil(filteredActivities.length / itemsPerPage));

  const tripSummaryData = useMemo(() => {
    if (!selectedTrip) return null;

    const tripDeparture = departures.find((d) => d.trip_id === selectedTrip.id);
    const departureDate = tripDeparture?.start_date
      ? new Date(tripDeparture.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : selectedTrip.start_date
        ? new Date(selectedTrip.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "12 Jul 2026";

    const confirmedCount = selectedTrip.total_seats - selectedTrip.seats_left || 18;
    const totalSeats = selectedTrip.total_seats || 20;
    const duration = selectedTrip.difficulty ? `${selectedTrip.difficulty} Trip` : "6 Nights / 7 Days";
    const tripManager = team.find((u) => u.id === selectedTrip.created_by) || team[0];

    return {
      departureDate,
      duration,
      destination: selectedTrip.destination || "Tokyo, Hakone, Mt Fuji",
      confirmedCount,
      totalSeats,
      managerName: tripManager?.full_name || "Tejaswa Jhode",
      managerAvatar: tripManager?.avatar_url || null,
    };
  }, [selectedTrip, departures, team]);

  // Activity Overview Counts
  const overviewCounts = useMemo(() => {
    // Get counts for current trip context (or in general)
    const contextList = selectedTripId === "all" ? activities : filteredActivities;
    return {
      all: contextList.length,
      leads: contextList.filter((a) => a.category === "leads").length,
      bookings: contextList.filter((a) => a.category === "trips").length,
      travellers: contextList.filter((a) => a.category === "team").length,
      tasks: contextList.filter((a) => a.category === "documents").length,
      system: contextList.filter((a) => a.category === "system").length,
    };
  }, [activities, filteredActivities, selectedTripId]);

  const dateRangeLabel = useMemo(() => {
    if (dateWindow === "all") return "All Time";
    const opt: Record<string, string> = {
      today: "Today",
      yesterday: "Yesterday",
      this_week: "This Week",
      last_week: "Last Week",
      this_month: "This Month",
      last_month: "Last Month",
    };
    return opt[dateWindow] || "All Time";
  }, [dateWindow]);

  const resetFilters = () => {
    setSelectedTripId("all");
    setSelectedLeadId("all");
    setSearchQuery("");
    setSelectedTab("all");
    setSelectedUser("all");
    setDateWindow("all");
    setSortBy("newest");
    setCurrentPage(1);
    setActivitiesLimit(10);
  };

  const getActivityDetails = (item: ActivityItem) => {
    const label = item.label.toLowerCase();
    const action = item.action.toLowerCase();
    const cat = item.category;

    let Icon = Activity;
    let iconBg = "bg-slate-100 text-slate-600";
    let title = item.label;

    if (label.includes("call")) {
      Icon = Phone;
      iconBg = "bg-[#ECFDF5] text-[#16A34A]";
      title = "Call Completed";
    } else if (label.includes("whatsapp")) {
      Icon = MessageCircle;
      iconBg = "bg-[#ECFDF5] text-[#16A34A]";
      title = "WhatsApp Message Sent";
    } else if (label.includes("vibe check") || label.includes("negotiating")) {
      Icon = Calendar;
      iconBg = "bg-[#F4EDFF] text-[#7C3AED]";
      title = "Vibe Check Scheduled";
    } else if (label.includes("assigned")) {
      Icon = Users;
      iconBg = "bg-[#EEF2FF] text-[#2563EB]";
      title = "Lead Assigned";
    } else if (cat === "payments") {
      Icon = CreditCard;
      iconBg = "bg-[#FDF2F8] text-[#EC4899]";
      title = "Payment Received";
    } else if (cat === "documents" || label.includes("document") || label.includes("brochure")) {
      Icon = FileText;
      iconBg = "bg-[#FFF6E5] text-[#D97706]";
      title = "Document Uploaded";
    } else if (label.includes("task") || action === "completed") {
      Icon = CheckCircle2;
      iconBg = "bg-[#FFF6E5] text-[#D97706]";
      title = "Task Completed";
    } else if (label.includes("enquiry") || label.includes("created")) {
      Icon = MessageSquare;
      iconBg = "bg-[#EEF2FF] text-[#2563EB]";
      title = "New Enquiry Received";
    }

    return { Icon, iconBg, title };
  };

  return (
    <section className="px-5 md:px-8 py-6 space-y-6 text-left text-nomichi-ink min-h-screen bg-[#FAF8F5]/20">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight flex items-center gap-2">
            Activity
          </h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
            Track all activities across trips. Select a trip to view detailed activity timeline.
          </p>
        </div>
        <button
          onClick={() => alert("Activity log exported successfully!")}
          className="px-4 py-2.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/80 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs"
        >
          <ArrowRight className="w-4 h-4 rotate-[-45deg] text-nomichi-ink/45" />
          Export Activity
        </button>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Select Trip dropdown */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 text-left">Select Trip</label>
            <button
              onClick={() => setTripSelectOpen(!tripSelectOpen)}
              className="h-12 w-60 rounded-2xl border border-slate-200 bg-white px-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:border-[#FF5B26] transition-all cursor-pointer shadow-xs text-left"
            >
              <div className="flex items-center gap-2.5 truncate">
                {selectedTrip ? (
                  <>
                    <img
                      src={selectedTrip.image_url || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=80&q=80"}
                      alt=""
                      className="w-7 h-7 rounded-lg object-cover border border-[#e7e1d5]/40 shrink-0"
                    />
                    <div className="truncate">
                      <div className="font-extrabold text-slate-900 truncate leading-tight">{selectedTrip.title}</div>
                      <div className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">TRP-{selectedTrip.id?.slice(0, 5).toUpperCase()}</div>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-500 font-bold">All Trips</span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
            {tripSelectOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setTripSelectOpen(false)} />
                <div className="absolute left-0 mt-2 w-72 max-h-60 overflow-y-auto rounded-2xl bg-white border border-[#e7e1d5]/50 shadow-lg py-2 z-20 font-semibold text-xs text-left">
                  <button
                    onClick={() => { setSelectedTripId("all"); setTripSelectOpen(false); }}
                    className={`w-full px-4 py-2 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer font-bold ${selectedTripId === "all" ? "text-[#FF5B26] bg-[#FFEFEA]/40" : "text-slate-700"}`}
                  >
                    All Trips
                  </button>
                  {trips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => { setSelectedTripId(trip.id); setTripSelectOpen(false); }}
                      className={`w-full px-4 py-2 hover:bg-[#FAF8F4] flex items-center gap-3 border-0 bg-transparent cursor-pointer ${selectedTripId === trip.id ? "bg-[#FFEFEA]/40 text-[#FF5B26]" : "text-slate-700"}`}
                    >
                      <img
                        src={trip.image_url || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=80&q=80"}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-[#e7e1d5]/40 shrink-0"
                      />
                      <div className="truncate">
                        <div className="font-extrabold text-slate-900 truncate">{trip.title}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">TRP-{trip.id.slice(0, 5).toUpperCase()}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Select Lead dropdown */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 text-left">Select Lead</label>
            <button
              onClick={() => setLeadSelectOpen(!leadSelectOpen)}
              className="h-12 w-60 rounded-2xl border border-slate-200 bg-white px-4 flex items-center justify-between text-xs font-semibold text-slate-700 hover:border-[#FF5B26] transition-all cursor-pointer shadow-xs text-left"
            >
              <div className="truncate">
                {selectedLead ? (
                  <>
                    <div className="font-extrabold text-slate-900 truncate leading-tight">{selectedLead.name}</div>
                    <div className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">{selectedLead.trips?.title || "General Lead"}</div>
                  </>
                ) : (
                  <span className="text-slate-500 font-bold">All Leads</span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
            {leadSelectOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLeadSelectOpen(false)} />
                <div className="absolute left-0 mt-2 w-72 max-h-60 overflow-y-auto rounded-2xl bg-white border border-[#e7e1d5]/50 shadow-lg py-2 z-20 font-semibold text-xs text-left">
                  <button
                    onClick={() => { setSelectedLeadId("all"); setLeadSelectOpen(false); }}
                    className={`w-full px-4 py-2 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer font-bold ${selectedLeadId === "all" ? "text-[#FF5B26] bg-[#FFEFEA]/40" : "text-slate-700"}`}
                  >
                    All Leads
                  </button>
                  {leads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => { setSelectedLeadId(lead.id); setLeadSelectOpen(false); }}
                      className={`w-full px-4 py-2 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer ${selectedLeadId === lead.id ? "bg-[#FFEFEA]/40 text-[#FF5B26]" : "text-slate-700"}`}
                    >
                      <div className="truncate">
                        <div className="font-extrabold text-slate-900 truncate">{lead.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{lead.trips?.title || "General Enquiry"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Date Range dropdown */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 text-left">Date Range</label>
            <button
              onClick={() => setDateRangeOpen(!dateRangeOpen)}
              className="h-12 w-52 rounded-2xl border border-slate-200 bg-white px-4 flex items-center justify-between text-xs font-semibold text-slate-700 hover:border-[#FF5B26] transition-all cursor-pointer shadow-xs text-left"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{dateRangeLabel}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {dateRangeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDateRangeOpen(false)} />
                <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-white border border-[#e7e1d5]/50 shadow-lg py-2 z-20 font-semibold text-xs text-left">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "this_week", label: "This Week" },
                    { id: "last_week", label: "Last Week" },
                    { id: "this_month", label: "This Month" },
                    { id: "last_month", label: "Last Month" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setDateWindow(opt.id); setDateRangeOpen(false); }}
                      className={`w-full px-4 py-2 hover:bg-[#FAF8F4] text-left border-0 bg-transparent cursor-pointer ${dateWindow === opt.id ? "text-[#FF5B26] bg-[#FFEFEA]/40" : "text-slate-700"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Activity Type Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 text-left">Activity Type</label>
            <select
              value={selectedTab}
              onChange={(e) => applyTab(e.target.value as any)}
              className="appearance-none h-12 w-48 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-xs font-semibold text-slate-700 outline-none focus:border-[#FF5B26] cursor-pointer shadow-xs"
            >
              <option value="all">All Types</option>
              <option value="system">System</option>
              <option value="leads">Leads & Enquiries</option>
              <option value="trips">Trips & Bookings</option>
              <option value="payments">Payments</option>
              <option value="messages">Messages</option>
              <option value="documents">Documents</option>
              <option value="team">Team</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-[38px] pointer-events-none" />
          </div>

          {/* Performed By Dropdown */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5 text-left">Performed By</label>
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setCurrentPage(1); }}
              className="appearance-none h-12 w-48 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-xs font-semibold text-slate-700 outline-none focus:border-[#FF5B26] cursor-pointer shadow-xs"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-[38px] pointer-events-none" />
          </div>

          {/* Reset Filters button */}
          <button
            onClick={resetFilters}
            className="h-12 border border-slate-200 hover:bg-[#FAF8F4] text-slate-700 font-extrabold text-xs rounded-2xl px-4 flex items-center justify-center gap-2 bg-white cursor-pointer transition-all shadow-xs ml-auto"
          >
            <Activity className="w-4 h-4 text-slate-400 shrink-0" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left column sidebar summary cards */}
        <div className="xl:col-span-4 space-y-6">
          {/* Trip Summary Card */}
          {tripSummaryData && selectedTripId !== "all" && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 text-left space-y-5">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 leading-none">Trip Summary</h2>
              
              <div className="flex gap-4 items-stretch border-b border-slate-100 pb-5">
                <img
                  src={selectedTrip?.image_url || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=120&q=80"}
                  alt=""
                  className="w-20 h-16 rounded-xl object-cover border border-[#e7e1d5]/40 shrink-0"
                />
                <div className="flex flex-col justify-between py-0.5">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{selectedTrip?.title}</h3>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">TRP-{selectedTrip?.id?.slice(0, 5).toUpperCase()}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[9px] font-black uppercase tracking-wider w-fit">
                    Active
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>Departure</span>
                  </div>
                  <span className="text-slate-900 font-extrabold">{tripSummaryData.departureDate}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Clock3 className="w-4 h-4" />
                    <span>Duration</span>
                  </div>
                  <span className="text-slate-900 font-extrabold">{tripSummaryData.duration}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>Destination</span>
                  </div>
                  <span className="text-slate-900 font-extrabold truncate max-w-[150px]" title={tripSummaryData.destination}>{tripSummaryData.destination}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>Group Size</span>
                  </div>
                  <span className="text-slate-900 font-extrabold">{tripSummaryData.confirmedCount} / {tripSummaryData.totalSeats} Confirmed</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>Trip Manager</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {tripSummaryData.managerAvatar ? (
                      <img src={tripSummaryData.managerAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center font-bold text-[9px]">
                        {tripSummaryData.managerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-slate-900 font-extrabold">{tripSummaryData.managerName}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Overview Counts Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 text-left space-y-5">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 leading-none">Activity Overview</h2>
            
            <div className="space-y-2 text-xs font-bold">
              {[
                { label: "All Activities", count: overviewCounts.all, bg: "bg-[#EEF4FF] text-[#2563EB]" },
                { label: "Lead Activities", count: overviewCounts.leads, bg: "bg-[#FFF1EA] text-[#FF5B26]" },
                { label: "Booking Activities", count: overviewCounts.bookings, bg: "bg-[#EBF3FF] text-[#1E6BFF]" },
                { label: "Traveller Activities", count: overviewCounts.travellers, bg: "bg-[#F4EDFF] text-[#7C3AED]" },
                { label: "Task Activities", count: overviewCounts.tasks, bg: "bg-[#FFF6E5] text-[#D97706]" },
                { label: "System Activities", count: overviewCounts.system, bg: "bg-slate-100 text-slate-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#FAF8F4]/30 transition-all">
                  <span className="text-slate-700 font-semibold">{item.label}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${item.bg}`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right main timeline area */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            
            {/* Header Tabs inside Main Card */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <div className="flex gap-6">
                {[
                  { id: "timeline", label: "Timeline View" },
                  { id: "list", label: "List View" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setViewMode(t.id as any)}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer bg-transparent border-0 shrink-0 ${
                      viewMode === t.id
                        ? "border-[#FF5B26] text-[#FF5B26]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Sorting and Search */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search feed..."
                    className="h-9 w-44 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-[11px] font-semibold outline-none focus:border-[#FF5B26]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none h-9 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-[11px] font-bold text-slate-700 outline-none focus:border-[#FF5B26] cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* View Mode Contents */}
            <div>
              {viewMode === "timeline" ? (
                /* Timeline view redesign */
                <div className="relative space-y-6">
                  {/* Vertical line running down the center of the icon columns */}
                  <div className="absolute left-[124px] top-4 bottom-4 w-0.5 bg-slate-100 z-0" />

                  {paginatedActivities.length === 0 ? (
                    <div className="py-12 text-center text-xs font-semibold text-slate-400">
                      No activities match your filter settings.
                    </div>
                  ) : (
                    paginatedActivities.map((item) => {
                      const { Icon, iconBg, title } = getActivityDetails(item);
                      const isSystem = item.userName === "System";

                      // Find matching lead for routing
                      const matchingLead = leads.find((l) => l.name === item.entity || l.id === item.entityType);

                      return (
                        <div key={item.id} className="flex items-stretch gap-0 relative z-10 text-xs">
                          {/* Date and Time column */}
                          <div className="w-28 text-right font-semibold text-slate-500 pr-4 flex flex-col justify-center shrink-0">
                            <span className="font-extrabold text-[11px] text-slate-900">{formatTimelineDate(item.time)}</span>
                            <span className="text-[10px] text-slate-400 font-bold mt-0.5">{formatTime12Hour(item.time)}</span>
                          </div>

                          {/* Icon Circle node column */}
                          <div className="w-8 flex items-center justify-center shrink-0">
                            <div className={`h-8 w-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 shadow-sm ${iconBg}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Content column details */}
                          <div className="flex-1 pl-4 flex flex-col justify-center text-left">
                            <span className="font-extrabold text-[13px] text-slate-900 leading-none">{title}</span>
                            <p className="text-[11px] text-slate-500 font-semibold mt-1.5 leading-relaxed">{item.details}</p>
                            {matchingLead && (
                              <Link
                                href={`/manager/leads/${matchingLead.id}`}
                                className="text-[10px] text-[#FF5B26] hover:underline font-bold mt-1.5 flex items-center gap-1"
                              >
                                Lead: {matchingLead.name} (LD-{matchingLead.id.slice(0, 5).toUpperCase()})
                              </Link>
                            )}
                          </div>

                          {/* Performed By column */}
                          <div className="w-40 flex items-center gap-2 shrink-0 justify-end">
                            {isSystem ? (
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <Activity className="w-3 h-3 text-slate-400" />
                              </div>
                            ) : item.userAvatar ? (
                              <img src={item.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-[#e7e1d5]/40" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center font-bold text-[9px] shrink-0 border border-[#FFEFEA]">
                                {item.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="text-right leading-tight">
                              <span className="font-extrabold text-slate-900 block text-[11px]">{item.userName}</span>
                              <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">{isSystem ? "Automation" : "Manager"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Load More Pagination */}
                  {filteredActivities.length > activitiesLimit && (
                    <div className="flex justify-center pt-6 border-t border-slate-100">
                      <button
                        onClick={() => setActivitiesLimit((l) => l + 10)}
                        className="h-10 border border-slate-200 hover:bg-[#FAF8F4] text-slate-700 font-extrabold text-xs rounded-xl px-5 flex items-center justify-center gap-2 bg-white cursor-pointer transition-all shadow-xs"
                      >
                        Load More Activities
                        <ChevronDown className="w-4 h-4 text-slate-400 animate-bounce" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* List view (Original table view) */
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200/60 rounded-2xl bg-[#FAF8F4]/10">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-[#FAF8F4]/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-5 py-4">Activity</th>
                          <th className="px-5 py-4">Details</th>
                          <th className="px-5 py-4">Entity</th>
                          <th className="px-5 py-4">User</th>
                          <th className="px-5 py-4">Time</th>
                          <th className="px-5 py-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 text-slate-700">
                        {paginatedActivities.length === 0 ? (
                          <tr>
                            <td className="px-5 py-12 text-center text-slate-400 font-semibold" colSpan={6}>
                              No activities found.
                            </td>
                          </tr>
                        ) : (
                          paginatedActivities.map((item) => {
                            const meta = categoryMeta[item.category] || categoryMeta.system;
                            const Icon = meta.icon;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-4 font-semibold">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${meta.className} shrink-0`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-extrabold text-slate-900">{item.label}</div>
                                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">{meta.label}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 font-semibold text-slate-600 max-w-[200px] truncate" title={item.details}>
                                  {item.details}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="font-extrabold text-slate-900">{item.entity}</div>
                                  <span className="mt-1 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                    {item.entityType}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    {item.userAvatar ? (
                                      <img src={item.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-[#e7e1d5]/40" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center font-bold text-[9px] shrink-0 border border-[#FFEFEA]">
                                        {item.userName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="font-extrabold text-slate-900">{item.userName}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 font-semibold text-slate-600">
                                  {formatCompactDate(item.time)}
                                  <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{formatTime12Hour(item.time)}</span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <button className="p-2 border border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg bg-transparent cursor-pointer">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination Controls */}
                  {paginationCount > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200/40 pt-4 text-xs font-bold text-slate-500">
                      <div>
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length} activities
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 cursor-pointer hover:bg-[#FAF8F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-4 h-4 rotate-180" />
                        </button>
                        {Array.from({ length: paginationCount }, (_, idx) => idx + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-xl border text-xs font-black transition-colors cursor-pointer ${
                              currentPage === page
                                ? "border-[#FF5B26] bg-[#FFEFEA] text-[#FF5B26]"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-[#FAF8F4]"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(paginationCount, p + 1))}
                          disabled={currentPage === paginationCount}
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 cursor-pointer hover:bg-[#FAF8F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
