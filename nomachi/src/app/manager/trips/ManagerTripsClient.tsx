"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Briefcase,
  Calendar,
  ChevronDown,
  Grid2X2,
  LayoutDashboard,
  List,
  LogOut,
  MapPin,
  MessageSquare,
  MoreVertical,
  Plane,
  Plus,
  Search,
  Settings,
  Users,
  ClipboardCheck,
} from "lucide-react";

type TripItem = {
  id: string;
  title: string;
  destination?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | null;
  duration?: string | null;
  image_url?: string | null;
  total_seats?: number | null;
  seats_left?: number | null;
  created_at?: string | null;
  created_by?: string | null;
  leads_count?: number;
  travellers?: number;
};

type ManagerTripsClientProps = {
  user: {
    full_name: string;
    avatar_url?: string | null;
    email: string;
  };
  trips: TripItem[];
  managerTrips: string[];
};

const statusMeta: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-500" },
  open: { label: "Open", className: "bg-[#EBF3FF] text-[#1E6BFF]" },
  "open for enquiries": { label: "Open", className: "bg-[#EBF3FF] text-[#1E6BFF]" },
  active: { label: "Active", className: "bg-[#E6F9F0] text-[#00A854]" },
  confirmed: { label: "Confirmed", className: "bg-[#E6F9F0] text-[#00A854]" },
  completed: { label: "Completed", className: "bg-[#F5F0FF] text-[#8C52FF]" },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-500" },
};

const formatDate = (value?: string | null) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDuration = (value?: string | null) => value || "Flexible";

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Flexible";
  return start && end ? `${formatDate(start)} - ${formatDate(end)}` : formatDate(start || end || null);
};

const formatRelative = (value?: string | null) => {
  if (!value) return "Recently";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";
  const diffDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};

export function ManagerTripsClient({ user, trips, managerTrips }: ManagerTripsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"all" | "assigned">("all");
  const [destination, setDestination] = useState("all");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matches =
          trip.title.toLowerCase().includes(query) ||
          (trip.destination || "").toLowerCase().includes(query) ||
          formatDateRange(trip.start_date, trip.end_date).toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (tab === "assigned" && !managerTrips.includes(trip.id)) return false;
      if (destination !== "all" && (trip.destination || "") !== destination) return false;
      if (status !== "all" && (trip.status || "").toLowerCase() !== status) return false;
      if (month !== "all" && trip.start_date) {
        const tripMonth = new Date(trip.start_date).toLocaleDateString("en-IN", { month: "short" }).toLowerCase();
        if (tripMonth !== month) return false;
      } else if (month !== "all" && !trip.start_date) {
        return false;
      }
      return true;
    });
  }, [destination, managerTrips, month, searchQuery, status, tab, trips]);

  const counts = {
    total: trips.length,
    upcoming: trips.filter((trip) => trip.start_date && new Date(trip.start_date).getTime() >= Date.now()).length,
    confirmed: trips.filter((trip) => ["active", "confirmed"].includes((trip.status || "").toLowerCase())).length,
    travellers: trips.reduce((sum, trip) => sum + (trip.travellers || 0), 0),
  };

  const destinations = Array.from(new Set(trips.map((trip) => trip.destination).filter(Boolean))).sort();
  const months = Array.from(
    new Set(
      trips
        .map((trip) => {
          if (!trip.start_date) return null;
          return new Date(trip.start_date).toLocaleDateString("en-IN", { month: "short" }).toLowerCase();
        })
        .filter(Boolean)
    )
  ).sort();

  const firstName = user.full_name?.split(" ")[0] || "Manager";
  const visibleTrips = filteredTrips;

  return (
    <section className="px-5 md:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-[30px] font-bold tracking-tight text-slate-900">Trips</h1>
              <p className="text-sm text-slate-600 mt-1">Browse all trips and jump into the ones assigned to you.</p>
            </div>
            <Link
              href="/manager/trips/new"
              className="px-4 py-3 bg-[#FF5B26] hover:bg-[#ea4c18] text-white font-semibold text-sm rounded-2xl shadow-sm transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Trip
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap gap-10 px-6 pt-4 border-b border-slate-200">
              {[
                { id: "all", label: "All Trips" },
                { id: "assigned", label: "Assigned To Me" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id as "all" | "assigned")}
                  className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
                    tab === item.id ? "border-[#FF5B26] text-[#FF5B26]" : "border-transparent text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-[300px] max-w-full">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search trips by name or destination..."
                  className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#FF5B26]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>

              <div className="relative">
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="appearance-none h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#FF5B26]"
                >
                  <option value="all">Destination</option>
                  {destinations.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="appearance-none h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#FF5B26]"
                >
                  <option value="all">Month</option>
                  {months.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="appearance-none h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#FF5B26]"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                More Filters
              </button>
              <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-12 h-12 flex items-center justify-center ${viewMode === "list" ? "bg-[#FFF1EA] text-[#FF5B26]" : "text-slate-500"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-12 h-12 flex items-center justify-center border-l border-slate-200 ${viewMode === "grid" ? "bg-[#FFF1EA] text-[#FF5B26]" : "text-slate-500"}`}
                >
                  <Grid2X2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Trips",
                value: counts.total.toLocaleString("en-IN"),
                sub: "Accessible trips",
                icon: "briefcase",
              },
              {
                label: "Upcoming Trips",
                value: counts.upcoming.toLocaleString("en-IN"),
                sub: "Start dates ahead",
                icon: "plane",
              },
              {
                label: "Confirmed Trips",
                value: counts.confirmed.toLocaleString("en-IN"),
                sub: "Active or confirmed",
                icon: "check",
              },
              {
                label: "Total Travellers",
                value: counts.travellers.toLocaleString("en-IN"),
                sub: "Across assigned leads",
                icon: "users",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center shrink-0">
                  {item.icon === "briefcase" && <Briefcase className="w-6 h-6" />}
                  {item.icon === "plane" && <Plane className="w-6 h-6" />}
                  {item.icon === "check" && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  {item.icon === "users" && <Users className="w-6 h-6" />}
                </div>
                <div>
                  <div className="text-sm text-slate-500 font-medium">{item.label}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{item.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {viewMode === "list" ? (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Trip Name</th>
                      <th className="px-6 py-4">Destination</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Departure Date</th>
                      <th className="px-6 py-4">Travellers</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Assigned To</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleTrips.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                          No trips match your filters.
                        </td>
                      </tr>
                    ) : (
                      visibleTrips.map((trip) => {
                        const statusKey = (trip.status || "draft").toLowerCase();
                        const badge = statusMeta[statusKey] || statusMeta.draft;
                        const isAssigned = managerTrips.includes(trip.id);

                        return (
                          <tr key={trip.id} className="hover:bg-slate-50/60">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <img
                                  src={
                                    trip.image_url ||
                                    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80"
                                  }
                                  alt={trip.title}
                                  className="w-20 h-14 rounded-xl object-cover"
                                />
                                <div>
                                  <div className="font-semibold text-slate-900">{trip.title}</div>
                                  <div className="text-xs text-slate-500">{formatRelative(trip.created_at)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                {trip.destination || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">{formatDuration(trip.duration)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{formatDateRange(trip.start_date, trip.end_date)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{trip.travellers || 0}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt={user.full_name} className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center text-xs font-bold">
                                    {user.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span>{isAssigned ? user.full_name : "You"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2 text-slate-500">
                                <Link
                                  href={`/manager/trips/${trip.id}`}
                                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium inline-flex items-center gap-1 hover:border-[#FF5B26] hover:text-[#FF5B26]"
                                >
                                  View
                                  <ArrowRight className="w-4 h-4" />
                                </Link>
                                <button className="w-9 h-9 rounded-xl border border-slate-200 bg-white inline-flex items-center justify-center hover:border-[#FF5B26] hover:text-[#FF5B26]">
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleTrips.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                  No trips match your filters.
                </div>
              ) : (
                visibleTrips.map((trip) => {
                  const statusKey = (trip.status || "draft").toLowerCase();
                  const badge = statusMeta[statusKey] || statusMeta.draft;
                  return (
                    <Link
                      key={trip.id}
                      href={`/manager/trips/${trip.id}`}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      <img
                        src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80"}
                        alt={trip.title}
                        className="w-full h-44 object-cover"
                      />
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{trip.title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{trip.destination || "—"}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>{formatDuration(trip.duration)}</span>
                          <span>{trip.travellers || 0} travellers</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
    </section>
  );
}
