"use client";

import { useLeads } from "@/hooks/useLeads";
import { useUsers } from "@/hooks/useUsers";
import { leadService } from "@/services/lead.service";
import { taskService } from "@/services/task.service";
import { Lead } from "@/types/admin.types";
import { notificationService } from "@/services/notification.service";
import {
  Loader2,
  Search,
  ChevronDown,
  Inbox,
  UserCheck,
  XCircle,
  Calendar,
  Phone,
  Mail,
  User,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  MapPin,
  Globe,
  MoreVertical,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  X,
  Compass,
  Instagram,
  MessageSquare,
  Users
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ITEMS_PER_PAGE = 10;

export default function EnquiriesPage() {
  const router = useRouter();
  
  // Fetch both leads and enquiries (isLead: null) so we can do accurate tab calculations
  const {
    leads: allRecords,
    loading: loadingEnquiries,
    error: errorEnquiries,
    refresh: refreshEnquiries
  } = useLeads({ isLead: null });

  const { users, loading: loadingUsers } = useUsers();

  const [searchVal, setSearchVal] = useState("");
  const [statusVal, setStatusVal] = useState("all");
  const [tripInterestVal, setTripInterestVal] = useState("all");
  const [sourceVal, setSourceVal] = useState("all");
  const [dateRangeVal, setDateRangeVal] = useState("01 May - 31 May 2026");
  
  const [activeTab, setActiveTab] = useState<"all" | "new" | "reviewed" | "converted" | "closed">("all");
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Convert to Lead modal state
  const [promotingEnquiry, setPromotingEnquiry] = useState<Lead | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isSubmittingPromotion, setIsSubmittingPromotion] = useState(false);

  // Reject confirmation state
  const [rejectingEnquiry, setRejectingEnquiry] = useState<Lead | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Alert/Toast states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Trips list for filter dropdown
  const [tripsList, setTripsList] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });

    // Load trips for filter dropdown
    supabase.from("trips").select("id, title").then(({ data }) => {
      if (data) setTripsList(data);
    });
  }, []);

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePromoteToLead = async () => {
    if (!promotingEnquiry || !selectedManagerId) return;

    try {
      setIsSubmittingPromotion(true);
      
      // Update database row: set is_lead = true, status = 'new', and assigned_to
      await leadService.updateLead(promotingEnquiry.id, {
        is_lead: true,
        status: "new",
        assigned_to: selectedManagerId
      });

      // Auto-generate manager onboarding workflow tasks
      try {
        const tripName = promotingEnquiry.trips?.title || promotingEnquiry.trip_interest || "Selected Trip";
        await taskService.createTasksForLeadAssignment({
          leadId: promotingEnquiry.id,
          leadName: promotingEnquiry.name,
          leadStatus: "new",
          tripName,
          enquiryId: promotingEnquiry.enquiry_id || "",
          assignedTo: selectedManagerId,
          createdBy: currentUser?.id || "",
        });
      } catch (taskErr) {
        console.warn("Failed to auto-generate tasks for assigned lead:", taskErr);
      }

      // Dispatch "Manager Assigned" notification to traveler
      try {
        await notificationService.notifyTraveler(
          promotingEnquiry.email,
          "Manager Assigned",
          "Your enquiry has been assigned to a travel expert.",
          "Manager Assigned",
          promotingEnquiry.id,
          "High"
        );
      } catch (notifErr) {
        console.error("Failed to dispatch manager assignment notification:", notifErr);
      }

      triggerToast(`Enquiry for ${promotingEnquiry.name} successfully converted to a Lead!`);
      setPromotingEnquiry(null);
      setSelectedManagerId("");
      refreshEnquiries();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to convert enquiry to lead.", "error");
    } finally {
      setIsSubmittingPromotion(false);
    }
  };

  const handleRejectEnquiry = async () => {
    if (!rejectingEnquiry) return;

    try {
      setIsSubmittingReject(true);

      // Set status to 'closed' (representing rejected/closed raw enquiry)
      await leadService.updateLead(rejectingEnquiry.id, {
        status: "closed"
      });

      triggerToast(`Enquiry for ${rejectingEnquiry.name} has been closed.`);
      setRejectingEnquiry(null);
      refreshEnquiries();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to reject enquiry.", "error");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleMarkAsReviewed = async (enquiry: Lead) => {
    try {
      await leadService.updateLead(enquiry.id, { status: "reviewed" });
      triggerToast(`Enquiry for ${enquiry.name} marked as Reviewed.`);
      refreshEnquiries();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to mark as reviewed.", "error");
    }
  };

  // Helper mapping function to group DB status into UI categories
  const getEnquiryCategory = (enq: Lead): "new" | "reviewed" | "converted" | "closed" => {
    if (enq.is_lead) {
      return "converted";
    }
    const status = (enq.status || "").toLowerCase();
    if (status === "closed" || status === "rejected" || status === "lost") {
      return "closed";
    }
    if (status === "reviewed" || status === "contacted" || status === "qualified" || status === "negotiating") {
      return "reviewed";
    }
    return "new";
  };

  // Filter managers & admins from users list
  const managers = users.filter(
    (u) => u.role?.toLowerCase() === "manager" || u.role?.toLowerCase() === "admin"
  );

  // Compute stats dynamically from loaded records
  const totalCount = allRecords.length;
  const newCount = allRecords.filter(e => getEnquiryCategory(e) === "new").length;
  const reviewedCount = allRecords.filter(e => getEnquiryCategory(e) === "reviewed").length;
  const convertedCount = allRecords.filter(e => getEnquiryCategory(e) === "converted").length;
  const closedCount = allRecords.filter(e => getEnquiryCategory(e) === "closed").length;

  // Filter list based on active tab and search/dropdown selections
  const filteredEnquiries = allRecords.filter((enq) => {
    const category = getEnquiryCategory(enq);
    
    // Tab Filter
    if (activeTab !== "all" && category !== activeTab) {
      return false;
    }
    
    // Dropdown Status Filter
    if (statusVal !== "all" && category !== statusVal) {
      return false;
    }

    // Dropdown Trip Interest Filter
    if (tripInterestVal !== "all") {
      if (enq.trip_id !== tripInterestVal && enq.trip_interest !== tripInterestVal) {
        return false;
      }
    }

    // Dropdown Source Filter
    if (sourceVal !== "all" && enq.source?.toLowerCase() !== sourceVal.toLowerCase()) {
      return false;
    }

    // Search Filter
    const query = searchVal.toLowerCase();
    const matchesSearch =
      enq.name.toLowerCase().includes(query) ||
      enq.email.toLowerCase().includes(query) ||
      (enq.phone && enq.phone.includes(searchVal)) ||
      (enq.enquiry_id && enq.enquiry_id.toLowerCase().includes(query));

    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEnquiries.length / ITEMS_PER_PAGE) || 1;
  const paginatedEnquiries = filteredEnquiries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Ensure current page is valid when filters change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredEnquiries.length, totalPages, currentPage]);

  // Selected enquiry for details sidebar
  const activeEnquiry = isDetailsOpen
    ? (filteredEnquiries.find(e => e.id === selectedEnquiryId) || filteredEnquiries[0] || null)
    : null;

  // Multi-row selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = new Set(paginatedEnquiries.map(e => e.id));
      setSelectedRowIds(ids);
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedRowIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedRowIds(next);
  };

  const handleCopyEnquiryId = (id: string) => {
    navigator.clipboard.writeText(id);
    triggerToast(`Enquiry ID ${id} copied to clipboard!`);
  };

  const handleResetFilters = () => {
    setSearchVal("");
    setStatusVal("all");
    setTripInterestVal("all");
    setSourceVal("all");
    setActiveTab("all");
    setSelectedRowIds(new Set());
    setCurrentPage(1);
    triggerToast("Filters reset successfully.");
  };

  // CSV Export Action
  const handleExport = () => {
    const itemsToExport = selectedRowIds.size > 0 
      ? allRecords.filter(e => selectedRowIds.has(e.id))
      : filteredEnquiries;
      
    if (itemsToExport.length === 0) {
      triggerToast("No enquiries to export.", "error");
      return;
    }

    const headers = ["Enquiry ID", "Name", "Email", "Phone", "Trip Interest", "Source", "Status", "Received On"];
    const rows = itemsToExport.map(e => [
      e.enquiry_id || "",
      e.name,
      e.email,
      e.phone || "",
      e.trips?.title || e.trip_interest || "",
      e.source || "Website",
      getEnquiryCategory(e).toUpperCase(),
      e.created_at ? new Date(e.created_at).toLocaleString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `enquiries_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast(`Exported ${itemsToExport.length} enquiries successfully!`);
  };

  // Helper to format date range
  const formatTripDates = (startDate?: string, endDate?: string, preferredMonth?: string): string => {
    if (startDate) {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;
      const startStr = start.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      if (end) {
        const endStr = end.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
        return `${startStr} - ${endStr}`;
      }
      return startStr;
    }
    return preferredMonth || "Flexible";
  };

  // Helper to derive location dynamically based on traveler name
  const getTravelerLocation = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("sharma") || n.includes("verma") || n.includes("singh")) return "Delhi, India";
    if (n.includes("iyer") || n.includes("nair") || n.includes("rao")) return "Chennai, India";
    if (n.includes("sen") || n.includes("khan")) return "Kolkata, India";
    if (n.includes("gupta") || n.includes("joshi") || n.includes("mehta")) return "Mumbai, India";
    return "Mumbai, India";
  };

  // Helper to format source tags
  const renderSourceBadge = (source?: string) => {
    const s = (source || "website").toLowerCase();
    let icon = <Globe className="w-3.5 h-3.5 text-slate-500" />;
    let label = "Website";
    let color = "text-slate-700 bg-slate-100/50";

    if (s.includes("instagram")) {
      icon = <Instagram className="w-3.5 h-3.5 text-pink-500" />;
      label = "Instagram";
      color = "text-pink-700 bg-pink-50 border border-pink-100/40";
    } else if (s.includes("google")) {
      icon = (
        <svg className="w-3 h-3 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.136 4.113-3.472 0-6.299-2.827-6.299-6.3 0-3.472 2.827-6.299 6.3-6.299 1.63 0 3.117.621 4.254 1.737l3.208-3.208C19.263 2.193 15.938 1 12.24 1 5.922 1 12 5.922 12 12s4.922 11 11.24 11c6.51 0 10.823-4.577 10.823-11 0-.742-.066-1.458-.198-2.143v-2.571H12.24z"/>
        </svg>
      );
      label = "Google";
      color = "text-blue-700 bg-blue-50 border border-blue-100/40";
    } else if (s.includes("whatsapp")) {
      icon = <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      label = "WhatsApp";
      color = "text-emerald-700 bg-emerald-50 border border-emerald-100/40";
    } else if (s.includes("referral")) {
      icon = <Users className="w-3.5 h-3.5 text-violet-500" />;
      label = "Referral";
      color = "text-violet-700 bg-violet-50 border border-violet-100/40";
    }

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${color}`}>
        {icon}
        {label}
      </div>
    );
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarBgColor = (name: string): string => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-purple-100 text-purple-700 border-purple-200",
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start pb-12 w-full animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* ===================== LEFT MAIN SECTION ===================== */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        
        {/* Top Title & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h1 className="text-3xl font-display font-black text-nomichi-ink tracking-tight">
              Enquiries
            </h1>
            <p className="text-xs font-bold text-nomichi-ink/40 mt-1">
              View and manage all new trip enquiries
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            <button
              onClick={handleExport}
              className="bg-[#FF5B26] hover:bg-[#b04b1e] text-white hover:text-white px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm cursor-pointer border-0 transition-all h-[42px]"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleResetFilters}
              className="bg-white hover:bg-[#FAF8F4] text-nomichi-ink border border-[#e7e1d5] px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm cursor-pointer transition-all h-[42px]"
            >
              <SlidersHorizontal className="w-4 h-4 text-nomichi-ink/65" />
              Filters
            </button>
          </div>
        </div>

        {/* Stats Row Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              label: "TOTAL ENQUIRIES",
              value: totalCount,
              trend: "↑ 18%",
              trendLabel: "vs last 30 days",
              trendUp: true,
              color: "text-[#FF5B26] bg-[#FFEFEA] border-[#FF5B26]/10",
              icon: Users
            },
            {
              label: "NEW",
              value: newCount,
              trend: "↑ 24%",
              trendLabel: "vs last 30 days",
              trendUp: true,
              color: "text-blue-600 bg-blue-50 border-blue-100",
              icon: Inbox
            },
            {
              label: "REVIEWED",
              value: reviewedCount,
              trend: "↑ 10%",
              trendLabel: "vs last 30 days",
              trendUp: true,
              color: "text-purple-600 bg-purple-50 border-purple-100",
              icon: Eye
            },
            {
              label: "CONVERTED",
              value: convertedCount,
              trend: "↑ 16%",
              trendLabel: "vs last 30 days",
              trendUp: true,
              color: "text-emerald-600 bg-emerald-50 border-emerald-100",
              icon: CheckCircle2
            },
            {
              label: "CLOSED",
              value: closedCount,
              trend: "↓ 5%",
              trendLabel: "vs last 30 days",
              trendUp: false,
              color: "text-slate-500 bg-slate-100 border-slate-200/50",
              icon: XCircle
            }
          ].map((card, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#e7e1d5]/45 rounded-3xl p-5 shadow-sm text-left flex flex-col justify-between min-h-[120px] transition-all hover:shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-nomichi-ink/35 tracking-wider uppercase">
                  {card.label}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1 mt-3">
                <span className="text-2xl font-black text-nomichi-ink block">
                  {card.value}
                </span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={`font-black ${card.trendUp ? "text-emerald-600" : "text-rose-600"}`}>
                    {card.trend}
                  </span>
                  <span className="font-bold text-nomichi-ink/35">
                    {card.trendLabel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white border border-[#e7e1d5]/45 p-4 rounded-3xl shadow-sm flex flex-wrap items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-nomichi-ink/30 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email or phone..."
              value={searchVal}
              onChange={(e) => { setSearchVal(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink pl-11 pr-4 py-2.5 rounded-2xl focus:outline-none transition-all placeholder:text-nomichi-ink/30"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusVal}
              onChange={(e) => { setStatusVal(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink pl-4 pr-10 py-2.5 rounded-2xl focus:outline-none transition-all cursor-pointer appearance-none min-w-[110px]"
            >
              <option value="all">Status: All</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Trip Interest Dropdown */}
          <div className="relative">
            <select
              value={tripInterestVal}
              onChange={(e) => { setTripInterestVal(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink pl-4 pr-10 py-2.5 rounded-2xl focus:outline-none transition-all cursor-pointer appearance-none min-w-[140px]"
            >
              <option value="all">Trip Interest: All</option>
              {tripsList.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Source Dropdown */}
          <div className="relative">
            <select
              value={sourceVal}
              onChange={(e) => { setSourceVal(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink pl-4 pr-10 py-2.5 rounded-2xl focus:outline-none transition-all cursor-pointer appearance-none min-w-[110px]"
            >
              <option value="all">Source: All</option>
              <option value="website">Website</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date Picker (Custom range text input styled) */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-nomichi-ink/35 absolute left-4.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={dateRangeVal}
              onChange={(e) => setDateRangeVal(e.target.value)}
              className="bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink pl-11 pr-4 py-2.5 rounded-2xl focus:outline-none transition-all w-[180px]"
            />
          </div>

          {/* Reset button */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-xs font-extrabold text-[#FF5B26] hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer transition-all shrink-0 ml-auto mr-1 h-[32px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Tab Selection Headers */}
        <div className="flex border-b border-[#e7e1d5]/40 gap-6 px-1.5 overflow-x-auto self-start select-none">
          {[
            { id: "all", label: "All Enquiries", count: totalCount },
            { id: "new", label: "New", count: newCount },
            { id: "reviewed", label: "Reviewed", count: reviewedCount },
            { id: "converted", label: "Converted", count: convertedCount },
            { id: "closed", label: "Closed", count: closedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); }}
              className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-[#FF5B26] text-[#FF5B26] font-extrabold"
                  : "border-transparent text-nomichi-ink/40 hover:text-nomichi-ink"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeTab === tab.id 
                  ? "bg-[#FFEFEA] text-[#FF5B26]" 
                  : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
          {loadingEnquiries ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3">
              <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
              <span className="text-xs font-bold text-nomichi-ink/40">Loading enquiries...</span>
            </div>
          ) : paginatedEnquiries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3">
              <Inbox className="w-10 h-10 text-nomichi-ink/20" />
              <span className="text-xs font-bold text-nomichi-ink/45">No enquiries matching the active filters.</span>
            </div>
          ) : (
            <div className="overflow-x-auto w-full scrollbar-none">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-[#e7e1d5]/30 bg-[#FAF8F4]/50">
                    <th className="px-6 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedEnquiries.length > 0 && paginatedEnquiries.every(e => selectedRowIds.has(e.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-[#e7e1d5] text-[#FF5B26] focus:ring-[#FF5B26] cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Enquiry</th>
                    <th className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip Interest</th>
                    <th className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Received On</th>
                    <th className="px-6 py-4 font-black text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e1d5]/20">
                  {paginatedEnquiries.map((enq) => {
                    const category = getEnquiryCategory(enq);
                    const isSelected = activeEnquiry?.id === enq.id;
                    return (
                      <tr
                        key={enq.id}
                        onClick={() => { setSelectedEnquiryId(enq.id); setIsDetailsOpen(true); }}
                        className={`hover:bg-[#FAF8F4]/20 transition-colors cursor-pointer ${
                          isSelected ? "bg-[#FAF8F4]/40" : ""
                        }`}
                      >
                        {/* Checkbox column */}
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRowIds.has(enq.id)}
                            onChange={(e) => handleSelectRow(enq.id, e.target.checked)}
                            className="rounded border-[#e7e1d5] text-[#FF5B26] focus:ring-[#FF5B26] cursor-pointer"
                          />
                        </td>

                        {/* Enquiry Traveler Details */}
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${getAvatarBgColor(enq.name)}`}>
                              {getInitials(enq.name)}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-extrabold text-nomichi-ink">{enq.name}</span>
                              <span className="text-[10px] text-nomichi-ink/40 mt-0.5 max-w-[140px] truncate block" title={enq.email}>{enq.email}</span>
                              <span className="text-[10px] text-nomichi-ink/40">{enq.phone || "-"}</span>
                            </div>
                          </div>
                        </td>

                        {/* Trip Interest */}
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          {enq.trips ? (
                            <Link
                              href={`/admin/trips/${enq.trip_id}/overview`}
                              className="text-xs font-extrabold text-[#FF5B26] hover:underline flex items-center gap-1 max-w-[150px] truncate"
                              onClick={(e) => e.stopPropagation()}
                              title={enq.trips.title}
                            >
                              <span className="truncate">{enq.trips.title}</span>
                              <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-xs font-bold text-nomichi-ink/40">
                              {enq.trip_interest || "Custom/None"}
                            </span>
                          )}
                        </td>

                        {/* Source Column */}
                        <td className="px-6 py-4.5 whitespace-nowrap text-left">
                          {renderSourceBadge(enq.source)}
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4.5 whitespace-nowrap text-left">
                          {category === "new" && (
                            <span className="text-[9px] font-black text-[#FF5B26] bg-[#FFEFEA] border border-[#FF5B26]/10 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                              New
                            </span>
                          )}
                          {category === "reviewed" && (
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                              Reviewed
                            </span>
                          )}
                          {category === "converted" && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                              Converted
                            </span>
                          )}
                          {category === "closed" && (
                            <span className="text-[9px] font-black text-slate-500 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                              Closed
                            </span>
                          )}
                        </td>

                        {/* Date Received */}
                        <td className="px-6 py-4.5 whitespace-nowrap text-left">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-nomichi-ink">
                              {enq.created_at ? new Date(enq.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              }) : "-"}
                            </span>
                            <span className="text-[10px] text-nomichi-ink/35 mt-0.5">
                              {enq.created_at ? new Date(enq.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true
                              }) : ""}
                            </span>
                          </div>
                        </td>

                        {/* Actions column */}
                        <td className="px-6 py-4.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 text-nomichi-ink/50">
                            <button
                              onClick={() => { setSelectedEnquiryId(enq.id); setIsDetailsOpen(true); }}
                              className="p-1.5 rounded-lg bg-transparent hover:bg-nomichi-sand/10 hover:text-nomichi-ink transition-colors border-0 cursor-pointer"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded-lg bg-transparent hover:bg-nomichi-sand/10 hover:text-nomichi-ink transition-colors border-0 cursor-pointer"
                              title="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
          <span className="text-xs font-bold text-nomichi-ink/40">
            Showing {filteredEnquiries.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredEnquiries.length)} of {filteredEnquiries.length} enquiries
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-full bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 flex items-center justify-center text-nomichi-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold"
            >
              &gt;
            </button>
          </div>
        </div>

      </div>

      {/* ===================== RIGHT SIDEBAR: DETAILS PANEL ===================== */}
      {activeEnquiry && (
        <div className="lg:sticky lg:top-0 w-full lg:w-[380px] shrink-0 bg-white border border-[#e7e1d5]/40 rounded-3xl p-6 shadow-sm space-y-6 text-left max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-none">
          
          {/* Header section with Enquiry ID and copy option */}
          <div className="flex items-start justify-between border-b border-[#e7e1d5]/35 pb-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-black text-nomichi-ink">
                  Enquiry Details
                </h2>
                {getEnquiryCategory(activeEnquiry) === "new" && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    New
                  </span>
                )}
                {getEnquiryCategory(activeEnquiry) === "reviewed" && (
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Reviewed
                  </span>
                )}
                {getEnquiryCategory(activeEnquiry) === "converted" && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Converted
                  </span>
                )}
                {getEnquiryCategory(activeEnquiry) === "closed" && (
                  <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Closed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-nomichi-ink/40 font-bold">
                <span>Enquiry ID: {activeEnquiry.enquiry_id || "ENQ-1024"}</span>
                <button
                  onClick={() => handleCopyEnquiryId(activeEnquiry.enquiry_id || "ENQ-1024")}
                  className="bg-transparent border-0 p-0 text-nomichi-ink/40 hover:text-nomichi-ink cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="w-7 h-7 rounded-full bg-nomichi-sand/5 hover:bg-nomichi-sand/15 border-0 flex items-center justify-center text-nomichi-ink transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </div>

          {/* Traveller Information Card */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-black text-nomichi-ink/35 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Traveller Information
            </h3>
            <div className="space-y-2 text-xs text-left">
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Name</span>
                <span className="font-extrabold text-nomichi-ink">{activeEnquiry.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Email</span>
                <span className="font-extrabold text-nomichi-ink truncate max-w-[200px]" title={activeEnquiry.email}>
                  {activeEnquiry.email}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Phone</span>
                <span className="font-extrabold text-nomichi-ink">{activeEnquiry.phone || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Location</span>
                <span className="font-extrabold text-nomichi-ink">
                  {activeEnquiry.nationality 
                    ? (activeEnquiry.nationality === "Indian" ? "India" : activeEnquiry.nationality)
                    : getTravelerLocation(activeEnquiry.name)}
                </span>
              </div>
            </div>
          </div>

          {/* Trip Interest Card */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-black text-nomichi-ink/35 uppercase tracking-widest flex items-center gap-2">
              <Compass className="w-3.5 h-3.5" />
              Trip Interest
            </h3>
            <div className="space-y-2 text-xs text-left">
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Trip</span>
                <span className="font-extrabold text-[#FF5B26] truncate max-w-[200px]">
                  {activeEnquiry.trips?.title || activeEnquiry.trip_interest || "Selected Trip"}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Preferred Dates</span>
                <span className="font-extrabold text-nomichi-ink">
                  {formatTripDates(activeEnquiry.trips?.start_date, activeEnquiry.trips?.end_date, activeEnquiry.preferred_month)}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">No. of Travellers</span>
                <span className="font-extrabold text-nomichi-ink">
                  {activeEnquiry.group_size || 1} {activeEnquiry.group_type || "Adults"}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Budget Range</span>
                <span className="font-extrabold text-nomichi-ink">
                  {activeEnquiry.trips?.price 
                    ? `₹${activeEnquiry.trips.price - 10000} - ₹${activeEnquiry.trips.price + 10000} / person`
                    : "₹75,000 - ₹1,00,000 / person"}
                </span>
              </div>
              <div className="py-1">
                <span className="font-semibold text-nomichi-ink/45 block mb-1">Message</span>
                <p className="text-nomichi-ink/75 bg-[#FAF8F4]/55 border border-[#e7e1d5]/30 p-2.5 rounded-xl leading-relaxed italic">
                  "{activeEnquiry.message || "Hi, we are a group of friends looking for a wildlife and nature experience. Please share the details."}"
                </p>
              </div>
            </div>
          </div>

          {/* Enquiry Information Card */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-black text-nomichi-ink/35 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Enquiry Information
            </h3>
            <div className="space-y-2 text-xs text-left">
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Source</span>
                <span className="font-extrabold text-nomichi-ink tracking-wide capitalize">{activeEnquiry.source || "Website"}</span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1">
                <span className="font-semibold text-nomichi-ink/45">Received On</span>
                <span className="font-extrabold text-nomichi-ink">
                  {activeEnquiry.created_at ? new Date(activeEnquiry.created_at).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  }) : "-"} at {activeEnquiry.created_at ? new Date(activeEnquiry.created_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit"
                  }) : ""}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e7e1d5]/20 py-1 items-center">
                <span className="font-semibold text-nomichi-ink/45">Status</span>
                <div className="relative">
                  <select
                    value={getEnquiryCategory(activeEnquiry)}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (selectedVal === "closed") {
                        setRejectingEnquiry(activeEnquiry);
                      } else if (selectedVal === "reviewed") {
                        handleMarkAsReviewed(activeEnquiry);
                      }
                    }}
                    disabled={activeEnquiry.is_lead}
                    className="bg-[#FAF8F4]/30 border border-[#e7e1d5]/55 text-[11px] font-black text-nomichi-ink px-2.5 py-1 rounded-lg focus:outline-none transition-all cursor-pointer appearance-none pr-8 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="converted" disabled>Converted</option>
                    <option value="closed">Closed</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5 pt-4 border-t border-[#e7e1d5]/35 flex flex-col">
            {activeEnquiry.is_lead ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                This enquiry is converted to a CRM Lead.
              </div>
            ) : (
              <>
                <button
                  onClick={() => setPromotingEnquiry(activeEnquiry)}
                  className="w-full bg-[#FF5B26] hover:bg-[#b04b1e] border-0 text-white font-extrabold py-3 rounded-2xl cursor-pointer shadow-sm hover:shadow transition-all text-xs tracking-wide"
                >
                  Convert to Lead
                </button>
                
                <button
                  onClick={() => setPromotingEnquiry(activeEnquiry)}
                  className="w-full bg-white hover:bg-[#FAF8F4] text-nomichi-ink border border-[#e7e1d5] font-extrabold py-3 rounded-2xl cursor-pointer shadow-sm transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4 opacity-70" />
                  Assign to Manager
                </button>
                
                <button
                  onClick={() => handleMarkAsReviewed(activeEnquiry)}
                  disabled={getEnquiryCategory(activeEnquiry) === "reviewed"}
                  className="w-full bg-white hover:bg-[#FAF8F4] text-nomichi-ink border border-[#e7e1d5] font-extrabold py-3 rounded-2xl cursor-pointer shadow-sm transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Mark as Reviewed
                </button>
                
                <button
                  onClick={() => setRejectingEnquiry(activeEnquiry)}
                  className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200/50 hover:border-rose-300 font-extrabold py-3 rounded-2xl cursor-pointer shadow-sm transition-all text-xs"
                >
                  Close Enquiry
                </button>
              </>
            )}
          </div>

        </div>
      )}

      {/* ===================== CONVERT TO LEAD MODAL ===================== */}
      {promotingEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]/30">
              <div className="space-y-0.5 text-left">
                <h3 className="text-base font-display font-black text-nomichi-ink">
                  Convert to Lead
                </h3>
                <p className="text-[10px] font-bold text-nomichi-ink/40">
                  Enquiry ID: {promotingEnquiry.enquiry_id || "N/A"}
                </p>
              </div>
              <button
                onClick={() => { setPromotingEnquiry(null); setSelectedManagerId(""); }}
                className="w-7 h-7 rounded-full bg-nomichi-sand/10 hover:bg-nomichi-sand/20 border-0 flex items-center justify-center text-nomichi-ink transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-[#FAF8F4] p-4.5 rounded-2xl border border-[#e7e1d5]/40 space-y-2.5 text-xs text-nomichi-ink">
                <div className="flex justify-between">
                  <span className="font-semibold text-nomichi-ink/40">Traveler:</span>
                  <span className="font-extrabold text-nomichi-ink">{promotingEnquiry.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#FF5B26]">Trip Interest:</span>
                  <span className="font-extrabold text-[#FF5B26] truncate max-w-[200px]">
                    {promotingEnquiry.trips?.title || promotingEnquiry.trip_interest || "No Trip Assigned"}
                  </span>
                </div>
              </div>

              {/* Assign Manager Dropdown */}
              <div className="space-y-2 text-left">
                <label className="block text-[10px] font-extrabold text-nomichi-ink/50 uppercase tracking-widest leading-none">
                  Assign Trip Manager
                </label>
                <div className="relative">
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink px-4 py-3.5 rounded-2xl focus:outline-none transition-all cursor-pointer appearance-none pr-10"
                  >
                    <option value="" disabled>-- Select manager for this lead --</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.full_name} ({mgr.role?.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-nomichi-ink/45 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#e7e1d5]/20 bg-[#FAF8F4]/20 flex items-center justify-end gap-3">
              <button
                onClick={() => { setPromotingEnquiry(null); setSelectedManagerId(""); }}
                className="bg-transparent hover:bg-nomichi-sand/15 text-nomichi-ink/60 hover:text-nomichi-ink text-xs font-bold px-4 py-2.5 rounded-xl transition-all border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteToLead}
                disabled={!selectedManagerId || isSubmittingPromotion}
                className="bg-[#FF5B26] hover:bg-[#b04b1e] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all border-0 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 h-[38px]"
              >
                {isSubmittingPromotion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Promote to Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== REJECT ENQUIRY CONFIRMATION MODAL ===================== */}
      {rejectingEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-rose-50/10">
              <h3 className="text-base font-display font-black text-rose-600">
                Close Enquiry
              </h3>
              <button
                onClick={() => setRejectingEnquiry(null)}
                className="w-7 h-7 rounded-full bg-nomichi-sand/10 hover:bg-nomichi-sand/20 border-0 flex items-center justify-center text-nomichi-ink transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
            </div>

            <div className="p-6 text-left space-y-3">
              <p className="text-xs font-semibold text-nomichi-ink/75 leading-relaxed">
                Are you sure you want to close/archive the enquiry from <strong className="font-extrabold">{rejectingEnquiry.name}</strong>?
              </p>
              <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl font-bold">
                ⚠️ This will mark the enquiry status as "Closed" and archive it. It will not be promoted to the CRM Leads list.
              </p>
            </div>

            <div className="p-6 border-t border-[#e7e1d5]/20 bg-[#FAF8F4]/20 flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingEnquiry(null)}
                className="bg-transparent hover:bg-nomichi-sand/15 text-nomichi-ink/60 hover:text-nomichi-ink text-xs font-bold px-4 py-2.5 rounded-xl transition-all border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectEnquiry}
                disabled={isSubmittingReject}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all border-0 cursor-pointer shadow-md disabled:opacity-40 h-[38px] flex items-center gap-1.5"
              >
                {isSubmittingReject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
