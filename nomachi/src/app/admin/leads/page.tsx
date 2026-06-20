"use client";

import { useLeads } from "@/hooks/useLeads";
import { useUsers } from "@/hooks/useUsers";
import { tripService } from "@/services/trip.service";
import { leadService } from "@/services/lead.service";
import { taskService } from "@/services/task.service";
import { Trip, Lead, LeadNote } from "@/types/admin.types";
import {
  Loader2,
  Search,
  Plus,
  ChevronDown,
  Globe,
  Instagram,
  Phone,
  Mail,
  Send,
  Calendar,
  MoreVertical,
  X,
  MessageCircle,
  FolderPlus,
  CheckCircle2,
  SlidersHorizontal,
  Users,
  UserPlus,
  FileText,
  RotateCcw,
  Filter
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getLeadNoteAuthorLabel, getLeadNoteDisplay, getLeadNoteVisual } from "@/lib/lead-notes";

export default function LeadsPage() {
  const router = useRouter();
  const { leads, loading: loadingLeads, error: errorLeads, filters, updateFilters, changeStatus, refresh: refreshLeads } = useLeads();
  const { users, loading: loadingUsers } = useUsers();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [loadingLeadDetail, setLoadingLeadDetail] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".custom-dropdown-status")) {
        setStatusDropdownOpen(false);
      }
      if (!target.closest(".custom-dropdown-assign")) {
        setAssignDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pagination and local filtering states
  const [searchVal, setSearchVal] = useState("");
  const [statusVal, setStatusVal] = useState("all");
  const [sourceVal, setSourceVal] = useState("all");
  const [tripVal, setTripVal] = useState("all");
  const [assignedVal, setAssignedVal] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const noteInputRef = useRef<HTMLInputElement>(null);
  const usersById = new Map(users.map((user) => [user.id, user]));

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });

    tripService.getTrips().then((data) => {
      setTrips(data);
    }).catch(console.error);
  }, []);

  // Fetch lead details when selectedLeadId changes
  const fetchLeadDetail = async (id: string) => {
    try {
      setLoadingLeadDetail(true);
      const detail = await leadService.getLeadById(id);
      setSelectedLead(detail);
    } catch (err) {
      console.error("Failed to load lead details:", err);
    } finally {
      setLoadingLeadDetail(false);
    }
  };

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadDetail(selectedLeadId);
    } else {
      setSelectedLead(null);
    }
  }, [selectedLeadId]);

  // Handle status update from drawer dropdown or quick action
  const handleDrawerStatusChange = async (status: string, customNoteText?: string) => {
    if (!selectedLead || !currentUser) return;
    try {
      await leadService.updateLeadStatus(selectedLead.id, status);
      
      // Auto-log note for status change
      const defaultNoteText = `Status updated to ${getStatusLabel(status)}.`;
      await leadService.addLeadNote(selectedLead.id, customNoteText || defaultNoteText, currentUser.id);
      
      fetchLeadDetail(selectedLead.id);
      refreshLeads();
    } catch (err) {
      console.error(err);
    }
  };

  // Assign lead
  const handleDrawerAssignChange = async (profileId: string) => {
    if (!selectedLead || !currentUser) return;
    try {
      await leadService.updateLead(selectedLead.id, { assigned_to: profileId || null });
      const assignedUser = users.find(u => u.id === profileId);
      const assigneeName = assignedUser ? assignedUser.full_name : "Unassigned";
      
      // Auto-log assignment in timeline
      await leadService.addLeadNote(selectedLead.id, `Lead assigned to ${assigneeName}.`, currentUser.id);

      // Auto-generate tasks for the manager when assigned (not when unassigning)
      if (profileId) {
        try {
          const tripName = selectedLead.trips?.title || selectedLead.trip_interest || "";
          await taskService.createTasksForLeadAssignment({
            leadId: selectedLead.id,
            leadName: selectedLead.name,
            leadStatus: selectedLead.status,
            tripName,
            enquiryId: selectedLead.enquiry_id,
            assignedTo: profileId,
            createdBy: currentUser.id,
          });
        } catch (taskErr) {
          console.warn("Failed to auto-generate tasks for assigned lead:", taskErr);
        }
      }
      
      fetchLeadDetail(selectedLead.id);
      refreshLeads();
    } catch (err) {
      console.error(err);
    }
  };

  // Add notes
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedLead || !currentUser) return;
    try {
      setAddingNote(true);
      const newNote = await leadService.addLeadNote(selectedLead.id, newNoteText.trim(), currentUser.id);
      setSelectedLead((prev: any) => ({
        ...prev,
        lead_notes: [...(prev.lead_notes || []), { ...newNote, note_text: newNote.note_text || newNoteText.trim() }]
      }));
      setNewNoteText("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleResetFilters = () => {
    setSearchVal("");
    setStatusVal("all");
    setSourceVal("all");
    setTripVal("all");
    setAssignedVal("all");
    setActiveTab("all");
    setCurrentPage(1);
  };

  // Convert status to display labels
  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "Vibe Check";
    if (s === "converted" || s === "confirmed") return "Confirmed";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Status badge styling
  const getStatusColorClass = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "new") return "bg-[#FAF8F5] text-[#625E5A] border-[#E7E1D5]/60";
    if (s === "contacted") return "bg-[#EBF5FF] text-[#2563EB] border-[#D0E2FF]/40";
    if (s === "qualified") return "bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]/40";
    if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]/40";
    if (s === "converted" || s === "confirmed") return "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40";
    if (s === "lost") return "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]/40";
    return "bg-[#FAF8F5] text-[#625E5A] border-[#E7E1D5]/60";
  };

  // Source icons
  const getSourceIcon = (source: string) => {
    const s = source?.toLowerCase();
    if (s === "website") return <Globe className="w-3.5 h-3.5 text-blue-500" />;
    if (s === "instagram") return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
    if (s === "whatsapp") return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
    return <Mail className="w-3.5 h-3.5 text-gray-500" />;
  };

  // Format relative created at dates
  const getRelativeTimeString = (dateString?: string): string => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      if (diffMins <= 0) return "Just now";
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }
  };

  // Client side filtering
  const filteredLeads = leads.filter((lead) => {
    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      const nameMatch = lead.name?.toLowerCase().includes(q);
      const emailMatch = lead.email?.toLowerCase().includes(q);
      const phoneMatch = lead.phone?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !phoneMatch) return false;
    }
    
    // Status filters
    if (statusVal !== "all" && lead.status !== statusVal) return false;
    if (activeTab !== "all") {
      if (activeTab === "vibe check" && !["negotiating", "vibe check sent"].includes(lead.status)) return false;
      if (activeTab === "confirmed" && lead.status !== "converted") return false;
      if (activeTab !== "vibe check" && activeTab !== "confirmed" && lead.status !== activeTab) return false;
    }

    if (sourceVal !== "all" && lead.source?.toLowerCase() !== sourceVal) return false;
    if (tripVal !== "all" && lead.trip_id !== tripVal) return false;
    if (assignedVal !== "all" && lead.assigned_to !== assignedVal) return false;

    return true;
  });

  // Paginated chunk
  const totalLeadsCount = filteredLeads.length;
  const totalPages = Math.ceil(totalLeadsCount / itemsPerPage) || 1;
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Pagination array builder
  const getPaginationRange = () => {
    const range: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      if (currentPage <= 3) {
        range.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        range.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        range.push(1, "...", currentPage, "...", totalPages);
      }
    }
    return range;
  };

  // Dashboard Stats (Calculated on current leads)
  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.status === "new").length;
  const qualifiedCount = leads.filter((l) => l.status === "qualified").length;
  const confirmedCount = leads.filter((l) => l.status === "converted").length;

  return (
    <div className="flex w-full h-full gap-6 text-left relative overflow-hidden">
      {/* ===================== MIDDLE COLUMN (LEADS LIST) ===================== */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-6">
        {/* Top Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Leads</h1>
            <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
              Manage and track all traveler enquiries
            </p>
          </div>
          <Link
            href="/admin/leads/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-sm no-underline"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Lead
          </Link>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: "Total Leads", count: totalCount, trend: "↑ 18% vs last 30 days", icon: Users, color: "text-[#FF5B26] bg-[#FFEFEA]" },
            { label: "New Leads", count: newCount, trend: "↑ 12% vs last 30 days", icon: UserPlus, color: "text-[#2563EB] bg-[#EBF5FF]" },
            { label: "Qualified", count: qualifiedCount, trend: "↑ 20% vs last 30 days", icon: Filter, color: "text-[#7C3AED] bg-[#F5F3FF]" },
            { label: "Confirmed", count: confirmedCount, trend: "↑ 16% vs last 30 days", icon: CheckCircle2, color: "text-[#10B981] bg-[#ECFDF5]" }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${stat.color}`}>
                <stat.icon className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">{stat.label}</span>
                <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stat.count}</h3>
                <span className="text-[9px] font-bold text-emerald-600 block mt-1">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Controls Row */}
        <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search name, email or phone..."
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 border border-[#e7e1d5] bg-[#FAF8F4]/30 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35"
              />
              <Search className="w-4 h-4 text-nomichi-ink/35 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Status Select */}
            <div className="relative min-w-[110px]">
              <select
                value={statusVal}
                onChange={(e) => {
                  setStatusVal(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
              >
                <option value="all">Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="negotiating">Vibe Check</option>
                <option value="converted">Confirmed</option>
                <option value="lost">Lost</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Source Select */}
            <div className="relative min-w-[110px]">
              <select
                value={sourceVal}
                onChange={(e) => {
                  setSourceVal(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
              >
                <option value="all">Source</option>
                <option value="website">Website</option>
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Trip Select */}
            <div className="relative min-w-[130px] max-w-[200px] flex-1">
              <select
                value={tripVal}
                onChange={(e) => {
                  setTripVal(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer truncate"
              >
                <option value="all">Trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Assigned To Select */}
            <div className="relative min-w-[130px] max-w-[200px] flex-1">
              <select
                value={assignedVal}
                onChange={(e) => {
                  setAssignedVal(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer truncate"
              >
                <option value="all">Assigned To</option>
                {users.filter(u => u.role === "MANAGER").map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset Filters */}
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/75 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all bg-white cursor-pointer shadow-sm ml-auto shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-nomichi-ink/40" />
              Reset Filters
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#e7e1d5]/20 pt-3 text-xs">
            {[
              { id: "all", label: "All Leads", count: leads.length, bg: "bg-gray-100 text-gray-500", activeBg: "border-b-2 border-[#FF5B26] text-[#FF5B26] font-extrabold" },
              { id: "new", label: "New", count: leads.filter(l => l.status === "new").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#EBF5FF] text-[#2563EB] font-bold border border-[#EBF5FF]" },
              { id: "contacted", label: "Contacted", count: leads.filter(l => l.status === "contacted").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#EBF0FF] text-[#3B82F6] font-bold border border-[#EBF0FF]" },
              { id: "qualified", label: "Qualified", count: leads.filter(l => l.status === "qualified").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#F5F3FF] text-[#7C3AED] font-bold border border-[#F5F3FF]" },
              { id: "vibe check", label: "Vibe Check", count: leads.filter(l => ["negotiating", "vibe check sent"].includes(l.status)).length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#FFF8E6] text-[#D97706] font-bold border border-[#FFF8E6]" },
              { id: "confirmed", label: "Confirmed", count: leads.filter(l => l.status === "converted").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#ECFDF5] text-[#10B981] font-bold border border-[#ECFDF5]" },
              { id: "lost", label: "Lost", count: leads.filter(l => l.status === "lost").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#FEF2F2] text-[#EF4444] font-bold border border-[#FEF2F2]" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? tab.id === "all"
                        ? "text-[#FF5B26] font-black border-b-2 border-[#FF5B26] rounded-none px-1 py-1.5"
                        : tab.activeBg
                      : "bg-transparent text-nomichi-ink/50 hover:text-nomichi-ink"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                    isActive ? "bg-white/40" : "bg-gray-100 text-gray-400"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-2xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
          {loadingLeads ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                    <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip Interest</th>
                    <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e1d5]/20">
                  {paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                        No leads matched the search filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead) => {
                      const assignee = users.find((u) => u.id === lead.assigned_to);
                      const tripName = lead.trips?.title || lead.trip_interest || "General Inquiry";
                      const dateStr = lead.trips?.start_date
                        ? `${new Date(lead.trips.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${new Date(lead.trips.end_date || "").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                        : "Flexible Dates";

                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`hover:bg-[#FAF8F4]/30 transition-colors cursor-pointer ${
                            selectedLeadId === lead.id ? "bg-[#FAF8F4]/60" : ""
                          }`}
                        >
                          {/* Name + Contact */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#e7e1d5]/40 bg-white">
                                <img 
                                  src={(() => {
                                    const travelerProfile = users.find(u => u.id === lead.user_id);
                                    return travelerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(lead.name || "default")}`;
                                  })()} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="space-y-0.5 text-left">
                                <p className="font-extrabold text-nomichi-ink text-xs">{lead.name}</p>
                                <p className="text-[10px] text-nomichi-ink/40 font-semibold">{lead.email}</p>
                                <p className="text-[9px] text-nomichi-ink/30 font-bold">{lead.phone || "—"}</p>
                              </div>
                            </div>
                          </td>

                          {/* Trip interest */}
                          <td className="px-6 py-4 text-left">
                            <p className="font-extrabold text-nomichi-ink text-xs">{tripName}</p>
                            <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">{dateStr}</p>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusColorClass(lead.status)}`}>
                              {lead.status?.toLowerCase() === "new" && (
                                <span className="w-1 h-1 rounded-full bg-[#625E5A] shrink-0" />
                              )}
                              {getStatusLabel(lead.status)}
                            </span>
                          </td>

                          {/* Source */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-nomichi-ink/75 font-semibold text-xs capitalize">
                              {getSourceIcon(lead.source || "")}
                              <span>{lead.source || "Website"}</span>
                            </div>
                          </td>

                          {/* Assigned To */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-nomichi-sand/20 text-[#FF5B26] font-bold text-[9px] flex items-center justify-center uppercase shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                {assignee?.avatar_url ? (
                                  <img src={assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  assignee?.full_name?.charAt(0) || "—"
                                )}
                              </div>
                              <span className="font-bold text-nomichi-ink/70 text-xs">{assignee?.full_name || "Unassigned"}</span>
                            </div>
                          </td>

                          {/* Created date */}
                          <td className="px-6 py-4 text-nomichi-ink/60 font-semibold">
                            {getRelativeTimeString(lead.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <button className="p-1 hover:bg-[#FAF8F4] rounded-lg transition-colors border-0 bg-transparent text-nomichi-ink/40 hover:text-nomichi-ink cursor-pointer">
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
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center text-xs font-semibold text-nomichi-ink/40 px-2">
            <span>
              Showing {Math.min(totalLeadsCount, (currentPage - 1) * itemsPerPage + 1)} to{" "}
              {Math.min(totalLeadsCount, currentPage * itemsPerPage)} of {totalLeadsCount} leads
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-[#e7e1d5]/50 flex items-center justify-center bg-white cursor-pointer disabled:opacity-40"
              >
                &lt;
              </button>
              {getPaginationRange().map((page, index) => {
                if (page === "...") {
                  return (
                    <span key={`dots-${index}`} className="w-8 h-8 flex items-center justify-center text-nomichi-ink/40 font-bold">
                      ...
                    </span>
                  );
                }
                const pageNum = page as number;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold border cursor-pointer transition-all ${
                      currentPage === pageNum
                        ? "border-[#FF5B26] text-[#FF5B26] bg-[#FFEFEA]/20"
                        : "border-[#e7e1d5]/50 bg-white text-nomichi-ink/60 hover:bg-[#FAF8F4]"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-[#e7e1d5]/50 flex items-center justify-center bg-white cursor-pointer disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================== RIGHT SIDE DETAILS PANEL ===================== */}
      {selectedLeadId && (
        <div
          className="w-[380px] bg-white border border-[#e7e1d5]/50 rounded-2xl shadow-sm flex flex-col justify-between shrink-0 overflow-hidden animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]/30">
            <h3 className="text-xs font-display font-extrabold text-nomichi-ink uppercase tracking-wider">Lead Details</h3>
            <button
              onClick={() => setSelectedLeadId(null)}
              className="w-6 h-6 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Details Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loadingLeadDetail || !selectedLead ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-7 h-7 text-[#FF5B26] animate-spin" />
              </div>
            ) : (
              <>
                {/* Contact Header */}
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-[#e7e1d5]/40 bg-white">
                    <img 
                      src={(() => {
                        const travelerProfile = users.find(u => u.id === selectedLead.user_id);
                        return travelerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedLead.name || "default")}`;
                      })()} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-nomichi-ink text-sm leading-tight">{selectedLead.name}</h4>
                      <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 border border-gray-200 text-[8px] font-black uppercase tracking-wider">
                        {selectedLead.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-nomichi-ink/55 font-semibold leading-none">{selectedLead.email}</p>
                    <p className="text-[10px] text-nomichi-ink/40 font-bold leading-none">{selectedLead.phone || "No Phone Number"}</p>
                  </div>
                </div>

                {/* Contact Methods */}
                {(() => {
                  const adminProfile = currentUser ? usersById.get(currentUser.id) : null;
                  const adminName = adminProfile?.full_name || currentUser?.user_metadata?.full_name || "Admin";
                  const travelerName = selectedLead.name || "there";
                  const tripTitle = selectedLead.trips?.title || selectedLead.trip_interest || "your trip";
                  const waText = encodeURIComponent(`Hello ${travelerName}, this is ${adminName} from Nomichi. Thank you for your enquiry for the trip ${tripTitle}.`);
                  const waHref = selectedLead.phone
                    ? `https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, "")}?text=${waText}`
                    : "#";
                  
                  const emailSubject = encodeURIComponent(`Nomichi Enquiry - ${tripTitle}`);
                  const emailBody = encodeURIComponent(`Hello ${travelerName},\n\nThis is ${adminName} from Nomichi. Thank you for your enquiry for the trip ${tripTitle}.`);
                  const mailHref = selectedLead.email
                    ? `mailto:${selectedLead.email}?subject=${emailSubject}&body=${emailBody}`
                    : "#";
                  const gmailHref = selectedLead.email
                    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${selectedLead.email}&su=${emailSubject}&body=${emailBody}`
                    : "#";
                  
                  return (
                    <div className="grid grid-cols-4 gap-2">
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 border border-emerald-200 hover:bg-emerald-50/50 text-emerald-600 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        WhatsApp
                      </a>
                      <a
                        href={`tel:${selectedLead.phone || ""}`}
                        className="flex items-center justify-center gap-1.5 py-2 border border-blue-200 hover:bg-blue-50/50 text-blue-600 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </a>
                      <a
                        href={mailHref}
                        className="flex items-center justify-center gap-1.5 py-2 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </a>
                      <a
                        href={gmailHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 border border-red-200 hover:bg-red-50/50 text-red-600 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-red-500" />
                        Gmail
                      </a>
                    </div>
                  );
                })()}

                {/* Details Fields list */}
                {/* Section: Trip Information */}
                <div className="border-t border-[#e7e1d5]/30 pt-5 space-y-4">
                  <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-nomichi-ink/40" />
                    Trip Information
                  </h5>
                  <div className="space-y-3 pl-1 text-xs font-semibold text-nomichi-ink">
                    <div className="flex justify-between items-start">
                      <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold mt-0.5">Interested Trip</span>
                      <span className="font-extrabold text-xs text-nomichi-ink text-right max-w-[200px]">
                        {selectedLead.trips?.title || selectedLead.trip_interest || "General Enquiry"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Travel Dates</span>
                      <span className="text-nomichi-ink text-right text-[11px]">
                        {selectedLead.trips?.start_date
                          ? `${new Date(selectedLead.trips.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${new Date(selectedLead.trips.end_date || "").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                          : "Flexible Dates"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">No. of Travelers</span>
                      <span className="text-nomichi-ink">
                        {selectedLead.group_size || 1} Traveller{(selectedLead.group_size || 1) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Lead Information */}
                <div className="border-t border-[#e7e1d5]/30 pt-5 space-y-4">
                  <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-nomichi-ink/40" />
                    Lead Information
                  </h5>
                  <div className="space-y-3.5 pl-1 text-xs font-semibold text-nomichi-ink">
                    <div className="flex justify-between items-center">
                      <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Source</span>
                      <span className="capitalize text-nomichi-ink">{selectedLead.source || "Website"}</span>
                    </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center justify-between relative custom-dropdown-status">
                    <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Status</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F4]/30 border border-[#e7e1d5] rounded-xl text-[11px] font-bold text-nomichi-ink/75 cursor-pointer hover:bg-[#FAF8F4] transition-all"
                      >
                        <span>{getStatusLabel(selectedLead.status || "new")}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-nomichi-ink/40 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {statusDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-32 bg-white border border-[#e7e1d5] rounded-xl shadow-lg z-30 py-1 text-left">
                          {[
                            { value: "new", label: "New" },
                            { value: "contacted", label: "Contacted" },
                            { value: "qualified", label: "Qualified" },
                            { value: "negotiating", label: "Vibe Check" },
                            { value: "converted", label: "Confirmed" },
                            { value: "lost", label: "Lost" }
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                handleDrawerStatusChange(opt.value);
                                setStatusDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-1.5 text-[11px] font-bold transition-colors border-0 cursor-pointer ${
                                (selectedLead.status || "new") === opt.value
                                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                                  : "bg-white text-nomichi-ink/75 hover:bg-[#FAF8F4]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned To Dropdown */}
                  <div className="flex items-center justify-between relative custom-dropdown-assign">
                    <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Assigned To</span>
                    <div className="relative">
                      {(() => {
                        const currentAssignee = users.find(u => u.id === selectedLead.assigned_to);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => setAssignDropdownOpen(!assignDropdownOpen)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F4]/30 border border-[#e7e1d5] rounded-xl text-[11px] font-bold text-nomichi-ink/75 cursor-pointer hover:bg-[#FAF8F4] transition-all"
                            >
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-nomichi-sand/20 text-[#FF5B26] font-bold text-[9px] flex items-center justify-center uppercase shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                {currentAssignee?.avatar_url ? (
                                  <img src={currentAssignee.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  currentAssignee?.full_name?.charAt(0) || "—"
                                )}
                              </div>
                              <span className="truncate max-w-[120px]">{currentAssignee?.full_name || "Unassigned"}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-nomichi-ink/40 transition-transform ${assignDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {assignDropdownOpen && (
                              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-[#e7e1d5] rounded-xl shadow-lg z-30 py-1 text-left max-h-48 overflow-y-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDrawerAssignChange("");
                                    setAssignDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 text-[11px] font-bold transition-colors border-0 cursor-pointer flex items-center gap-2 ${
                                    !selectedLead.assigned_to
                                      ? "bg-[#FFEFEA] text-[#FF5B26]"
                                      : "bg-white text-nomichi-ink/75 hover:bg-[#FAF8F4]"
                                  }`}
                                >
                                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                    —
                                  </div>
                                  <span>Unassigned</span>
                                </button>

                                {users.filter(u => u.role === "MANAGER").map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      handleDrawerAssignChange(u.id);
                                      setAssignDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2 text-[11px] font-bold transition-colors border-0 cursor-pointer flex items-center gap-2 ${
                                      selectedLead.assigned_to === u.id
                                        ? "bg-[#FFEFEA] text-[#FF5B26]"
                                        : "bg-white text-nomichi-ink/75 hover:bg-[#FAF8F4]"
                                    }`}
                                  >
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-nomichi-sand/20 text-[#FF5B26] font-bold text-[9px] flex items-center justify-center uppercase shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                      {u.avatar_url ? (
                                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                   u.full_name?.charAt(0) || "—"
                                      )}
                                    </div>
                                    <span className="truncate">{u.full_name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

                {/* Quick Actions */}
                <div className="border-t border-[#e7e1d5]/30 pt-6 space-y-2.5">
                  <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider mb-2">Quick Actions</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (noteInputRef.current) noteInputRef.current.focus();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 rounded-xl text-[10px] font-bold cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-nomichi-ink/40" />
                      Add Note
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDrawerStatusChange("negotiating", "Vibe Check Scheduled: Vibe check call scheduled.")}
                      className="flex items-center justify-center gap-1.5 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 rounded-xl text-[10px] font-bold cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-nomichi-ink/40" />
                      Schedule Vibe Check
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDrawerStatusChange("converted", "Converted to Confirmed: Lead converted to Confirmed.")}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-emerald-300 bg-[#ECFDF5]/10 hover:bg-[#ECFDF5]/50 text-emerald-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Convert to Confirmed
                  </button>
                </div>

                {/* Notes Timeline */}
                <div className="border-t border-[#e7e1d5]/30 pt-6 space-y-4">
                  <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider mb-1">Notes Timeline</h5>
                  
                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e7e1d5]/30 text-[11px] font-semibold text-nomichi-ink">
                    {!selectedLead.lead_notes || selectedLead.lead_notes.length === 0 ? (
                      <div className="text-nomichi-ink/40 italic py-2 pl-8">No notes logged. Add one below.</div>
                    ) : (
                      selectedLead.lead_notes.map((note: any) => {
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
                          <div key={note.id} className="relative pl-8 space-y-1 pb-1 text-left">
                            {/* Circle wrapper for timeline icon */}
                            <div className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${iconColor}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            
                            <div className="space-y-0.5 pl-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-extrabold text-xs text-nomichi-ink">{noteTitle}</p>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${authorTone}`}>
                                  {authorLabel}
                                </span>
                              </div>
                              <p className="text-[10px] text-nomichi-ink/60 font-semibold leading-relaxed">{noteDesc}</p>
                              <span className="text-[9px] text-nomichi-ink/35 font-bold block pt-0.5">
                                {new Date(note.created_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Note Input Box */}
          <div className="p-4 border-t border-[#e7e1d5]/30 bg-[#FAF8F4]/30">
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                ref={noteInputRef}
                type="text"
                placeholder="Write a note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="flex-grow px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35"
              />
              <button
                type="submit"
                disabled={addingNote || !newNoteText.trim()}
                className="w-9 h-9 rounded-xl bg-[#FF5B26] text-white flex items-center justify-center border-0 cursor-pointer hover:bg-[#FF5B26]/90 transition-colors disabled:opacity-50 shrink-0"
              >
                {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
