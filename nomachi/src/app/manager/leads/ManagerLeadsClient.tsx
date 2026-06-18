"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  ChevronDown,
  CircleCheck,
  Filter,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Users,
  MessageSquare,
  Briefcase,
  Plane,
  ClipboardCheck,
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
};

type ManagerProfile = {
  full_name: string;
  avatar_url?: string | null;
};

type ManagerLeadsClientProps = {
  user: ManagerProfile;
  leads: LeadItem[];
};

const statusMeta: Record<string, { label: string; className: string }> = {
  all: { label: "All Leads", className: "bg-[#FFF1EA] text-[#FF5B26]" },
  new: { label: "New", className: "bg-[#FFF1EA] text-[#FF5B26]" },
  contacted: { label: "Contacted", className: "bg-[#EAF1FF] text-[#2563EB]" },
  qualified: { label: "Qualified", className: "bg-[#F4EDFF] text-[#7C3AED]" },
  "vibe check": { label: "Vibe Check", className: "bg-[#FFF6E5] text-[#D97706]" },
  confirmed: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#16A34A]" },
  lost: { label: "Lost", className: "bg-[#F3F4F6] text-[#6B7280]" },
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

export function ManagerLeadsClient({ user, leads }: ManagerLeadsClientProps) {
  const [searchVal, setSearchVal] = useState("");
  const [statusVal, setStatusVal] = useState("all");
  const [sourceVal, setSourceVal] = useState("all");
  const [tripVal, setTripVal] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const firstName = user.full_name?.split(" ")[0] || "Manager";

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
    <section className="px-5 md:px-8 py-7 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
              <p className="mt-2 text-slate-500">Only leads assigned to you.</p>
            </div>
            <Link href="/manager/leads/new" className="inline-flex items-center gap-2 rounded-2xl bg-[#FF5B26] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#e64f20]">
              <Plus className="w-4 h-4" />
              Add New Lead
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Leads", count: counts.all },
              { id: "new", label: "New", count: counts.new },
              { id: "contacted", label: "Contacted", count: counts.contacted },
              { id: "qualified", label: "Qualified", count: counts.qualified },
              { id: "vibe check", label: "Vibe Check", count: counts.vibeCheck },
              { id: "confirmed", label: "Confirmed", count: counts.confirmed },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    active ? "border-[#FF5B26] bg-[#FFF7F3] text-[#FF5B26]" : "border-transparent bg-transparent text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-[#FF5B26]/10" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  value={searchVal}
                  onChange={(event) => {
                    setSearchVal(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, email or phone..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-3 text-sm outline-none focus:border-[#FF5B26]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="relative min-w-[150px]">
                <select
                  value={tripVal}
                  onChange={(event) => {
                    setTripVal(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#FF5B26]"
                >
                  <option value="all">All Trips</option>
                  {tripOptions.map((trip) => (
                    <option key={trip} value={trip}>
                      {trip}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative min-w-[150px]">
                <select
                  value={statusVal}
                  onChange={(event) => {
                    setStatusVal(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#FF5B26]"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="negotiating">Vibe Check</option>
                  <option value="converted">Confirmed</option>
                  <option value="lost">Lost</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative min-w-[150px]">
                <select
                  value={sourceVal}
                  onChange={(event) => {
                    setSourceVal(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#FF5B26]"
                >
                  <option value="all">All Sources</option>
                  <option value="website">Website</option>
                  <option value="instagram">Instagram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="referral">Referral</option>
                  <option value="facebook">Facebook</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <SlidersHorizontal className="w-4 h-4" />
                More Filters
              </button>

              <button className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Sort by: Newest First
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Lead</th>
                    <th className="px-6 py-4">Trip</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Added On</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="text-sm font-semibold text-slate-900">No leads match your filters</div>
                        <div className="mt-1 text-sm text-slate-500">Try widening the search or resetting the filters.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead) => {
                      const statusKey = lead.status.toLowerCase() === "converted" ? "confirmed" : lead.status.toLowerCase();
                      const status = statusMeta[statusKey] || { label: lead.status, className: "bg-slate-100 text-slate-600" };
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-[#FFF1EA] text-[#FF5B26] font-bold flex items-center justify-center shrink-0">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{lead.name}</div>
                                <div className="text-sm text-slate-500">{lead.phone || lead.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={lead.trip_image_url || `https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=120&q=80`}
                                alt={lead.trip_title}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-medium text-slate-900">{lead.trip_title}</div>
                                <div className="text-sm text-slate-500">{lead.trip_destination || "Trip enquiry"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-700">{sourceBadge[(lead.source || "").toLowerCase()] || "Website"}</td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-medium text-slate-900">{formatRelative(lead.created_at)}</div>
                            <div className="text-xs text-slate-500">{formatDateRange(lead.created_at)}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/manager/leads/${lead.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <span className="text-sm">View</span>
                              </Link>
                              <button className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
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

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 border-t border-slate-100">
              <div className="text-sm text-slate-600">
                Showing {filteredLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="rounded-xl border border-slate-200 p-3 text-slate-500 disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>

                {paginationRange.map((item, index) =>
                  item === "..." ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(Number(item))}
                      className={`min-w-10 rounded-xl border px-3 py-3 text-sm font-medium ${
                        currentPage === item ? "border-[#FF5B26] bg-[#FFF7F3] text-[#FF5B26]" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="rounded-xl border border-slate-200 p-3 text-slate-500 disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
    </section>
  );
}
