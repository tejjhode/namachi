"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Users,
} from "lucide-react";

type LeadItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  status: string;
  created_at?: string | null;
  trip_title: string;
  trip_destination?: string | null;
  trip_image_url?: string | null;
  avatar_url?: string | null;
};

type ManagerProfile = {
  full_name: string;
  avatar_url?: string | null;
};

type ManagerLeadsClientProps = {
  user: ManagerProfile;
  leads: LeadItem[];
};

const sourceBadge: Record<string, string> = {
  website: "Website",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  referral: "Referral",
  facebook: "Facebook",
};

const formatRelative = (value?: string | null) => {
  if (!value) return "Recently";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Recently";
  const diffHours = Math.max(0, Math.floor((Date.now() - time) / 36e5));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const formatDateRange = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getStatusColorClass = (status: string) => {
  const s = status?.toLowerCase();
  if (s === "new") return "bg-[#FAF8F5] text-[#625E5A] border-[#e7e1d5]/60";
  if (s === "contacted") return "bg-[#EBF5FF] text-[#2563EB] border-[#D0E2FF]/40";
  if (s === "qualified") return "bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]/40";
  if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]/40";
  if (s === "converted" || s === "confirmed") return "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40";
  if (s === "lost") return "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]/40";
  return "bg-[#FAF8F5] text-[#625E5A] border-[#e7e1d5]/60";
};

const getStatusLabel = (status: string) => {
  const s = status?.toLowerCase();
  if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "Vibe Check";
  if (s === "converted" || s === "confirmed") return "Confirmed";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export function ManagerLeadsClient({ user, leads }: ManagerLeadsClientProps) {
  const [searchVal, setSearchVal] = useState("");
  const [statusVal, setStatusVal] = useState("all");
  const [sourceVal, setSourceVal] = useState("all");
  const [tripVal, setTripVal] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const tripOptions = useMemo(() => {
    const seen = new Map<string, string>();
    leads.forEach((lead) => {
      if (lead.trip_title) seen.set(lead.trip_title, lead.trip_title);
    });
    return Array.from(seen.values());
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const query = searchVal.trim().toLowerCase();
      if (query) {
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesEmail = lead.email.toLowerCase().includes(query);
        const matchesPhone = (lead.phone || "").toLowerCase().includes(query);
        const matchesTrip = lead.trip_title.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesTrip) return false;
      }

      const normalizedStatus = lead.status.toLowerCase();
      if (statusVal !== "all" && normalizedStatus !== statusVal) return false;
      if (activeTab !== "all") {
        if (activeTab === "confirmed" && !["converted", "confirmed"].includes(normalizedStatus)) return false;
        if (activeTab === "vibe check" && !["negotiating", "vibe check sent", "vibe check"].includes(normalizedStatus)) return false;
        if (activeTab !== "confirmed" && activeTab !== "vibe check" && normalizedStatus !== activeTab) return false;
      }

      if (sourceVal !== "all" && (lead.source || "").toLowerCase() !== sourceVal) return false;
      if (tripVal !== "all" && lead.trip_title !== tripVal) return false;
      return true;
    });
  }, [activeTab, leads, searchVal, sourceVal, statusVal, tripVal]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const counts = {
    all: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    contacted: leads.filter((lead) => lead.status === "contacted").length,
    qualified: leads.filter((lead) => lead.status === "qualified").length,
    vibeCheck: leads.filter((lead) => ["negotiating", "vibe check sent", "vibe check"].includes(lead.status.toLowerCase())).length,
    confirmed: leads.filter((lead) => ["converted", "confirmed"].includes(lead.status.toLowerCase())).length,
  };

  const paginationRange = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (currentPage <= 3) return [1, 2, 3, "...", totalPages];
    if (currentPage >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage, "...", totalPages];
  }, [currentPage, totalPages]);

  const resetFilters = () => {
    setSearchVal("");
    setStatusVal("all");
    setSourceVal("all");
    setTripVal("all");
    setActiveTab("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Header area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight flex items-center gap-2">
            Leads
          </h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
            Manage and track your assigned traveler enquiries.
          </p>
        </div>
        <Link
          href="/manager/leads/new"
          className="px-4 py-2.5 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md no-underline"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Leads", value: counts.all, icon: Users, color: "text-[#3B82F6] bg-[#EBF0FF]", sub: "Assigned to you" },
          { label: "New Leads", value: counts.new, icon: Send, color: "text-[#FF5B26] bg-[#FFF1EA]", sub: "Require contact" },
          { label: "Qualified", value: counts.qualified, icon: Filter, color: "text-[#7C3AED] bg-[#F4EDFF]", sub: "Ready for vibe check" },
          { label: "Confirmed", value: counts.confirmed, icon: CircleCheck, color: "text-[#10B981] bg-[#ECFDF5]", sub: "Successfully converted" },
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
        {[
          { id: "all", label: "All Leads", count: counts.all },
          { id: "new", label: "New", count: counts.new },
          { id: "contacted", label: "Contacted", count: counts.contacted },
          { id: "qualified", label: "Qualified", count: counts.qualified },
          { id: "vibe check", label: "Vibe Check", count: counts.vibeCheck },
          { id: "confirmed", label: "Confirmed", count: counts.confirmed },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`pb-1 text-xs font-extrabold tracking-wide uppercase transition-all bg-transparent border-0 border-b-2 cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "border-[#FF5B26] text-[#FF5B26]"
                : "border-transparent text-nomichi-ink/40 hover:text-nomichi-ink/75"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${
              activeTab === tab.id ? "bg-[#FF5B26]/10 text-[#FF5B26]" : "bg-gray-100 text-gray-400"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table Search & Dropdowns card */}
      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-4 pr-10 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold text-nomichi-ink placeholder-nomichi-ink/30"
            />
            <Search className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Trip Select */}
          <div className="relative">
            <select
              value={tripVal}
              onChange={(e) => {
                setTripVal(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-4 pr-9 border border-[#e7e1d5] rounded-xl bg-white focus:outline-none focus:border-[#FF5B26] text-xs font-semibold text-nomichi-ink/80 cursor-pointer appearance-none truncate"
            >
              <option value="all">All Trips</option>
              {tripOptions.map((trip) => (
                <option key={trip} value={trip}>{trip}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Select */}
          <div className="relative">
            <select
              value={statusVal}
              onChange={(e) => {
                setStatusVal(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-4 pr-9 border border-[#e7e1d5] rounded-xl bg-white focus:outline-none focus:border-[#FF5B26] text-xs font-semibold text-nomichi-ink/80 cursor-pointer appearance-none"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="negotiating">Vibe Check</option>
              <option value="converted">Confirmed</option>
              <option value="lost">Lost</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Source Select */}
          <div className="relative">
            <select
              value={sourceVal}
              onChange={(e) => {
                setSourceVal(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-4 pr-9 border border-[#e7e1d5] rounded-xl bg-white focus:outline-none focus:border-[#FF5B26] text-xs font-semibold text-nomichi-ink/80 cursor-pointer appearance-none"
            >
              <option value="all">All Sources</option>
              <option value="website">Website</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
              <option value="facebook">Facebook</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="h-11 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/80 font-bold text-xs rounded-xl flex items-center justify-center gap-2 bg-white cursor-pointer transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-nomichi-ink/45" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30 text-nomichi-ink/40 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-4">Lead</th>
                <th className="px-6 py-4">Trip Interest</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Added On</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e1d5]/10 text-nomichi-ink">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                    No leads match your filter parameters.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#FAF8F4]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border border-[#e7e1d5]/40 bg-white overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#FF5B26]">
                            {lead.avatar_url ? (
                              <img
                                src={lead.avatar_url}
                                alt={lead.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(lead.name || "default")}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="text-left">
                            <span className="font-extrabold text-[12px] block text-nomichi-ink">{lead.name}</span>
                            <span className="text-[10px] text-nomichi-ink/40 font-semibold block mt-0.5">{lead.phone || lead.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={lead.trip_image_url || `https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=120&q=80`}
                            alt={lead.trip_title}
                            className="h-9 w-9 rounded-lg object-cover border border-[#e7e1d5]/40"
                          />
                          <div className="text-left">
                            <span className="font-extrabold text-[12px] block text-nomichi-ink">{lead.trip_title}</span>
                            <span className="text-[10px] text-nomichi-ink/40 font-semibold block mt-0.5">{lead.trip_destination || "Trip enquiry"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusColorClass(lead.status)}`}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-nomichi-ink/75 capitalize">
                        {sourceBadge[(lead.source || "").toLowerCase()] || "Website"}
                      </td>
                      <td className="px-6 py-4 text-left font-semibold text-nomichi-ink/80">
                        <span>{formatRelative(lead.created_at)}</span>
                        <span className="text-[10px] block mt-0.5 font-bold text-nomichi-ink/40">
                          {formatDateRange(lead.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/manager/leads/${lead.id}`}
                            className="px-3 py-1.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-[#FF5B26] border-[#FFEFEA] hover:bg-[#FFEFEA]/20 font-bold text-xs rounded-xl no-underline transition-all bg-white"
                          >
                            View
                          </Link>
                          <button className="p-2 border border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg bg-transparent cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
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
            Showing {filteredLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-xl border border-[#e7e1d5] bg-white flex items-center justify-center text-nomichi-ink/50 cursor-pointer hover:bg-[#FAF8F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
            {paginationRange.map((item, index) =>
              item === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 text-nomichi-ink/30">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setCurrentPage(Number(item))}
                  className={`w-8 h-8 rounded-xl border text-xs font-black transition-colors cursor-pointer ${
                    currentPage === item
                      ? "border-[#FF5B26] bg-[#FFEFEA] text-[#FF5B26]"
                      : "border-[#e7e1d5] bg-white text-nomichi-ink/50 hover:bg-[#FAF8F4]"
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-xl border border-[#e7e1d5] bg-white flex items-center justify-center text-nomichi-ink/50 cursor-pointer hover:bg-[#FAF8F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
