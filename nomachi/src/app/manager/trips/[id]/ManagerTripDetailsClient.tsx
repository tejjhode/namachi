"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Activity,
  Bell,
  Calendar,
  ChevronDown,
  Download,
  Edit3,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  MoreVertical,
  Plane,
  Plus,
  Share2,
  Sparkles,
  Tags,
  Users,
  XCircle,
  CheckCircle2,
  Archive,
  User,
  Settings,
  Briefcase,
  ClipboardCheck,
} from "lucide-react";

type Person = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type TripDetails = {
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
  trip_style?: string | null;
  best_for?: string | null;
  difficulty?: string | null;
  age_group?: string | null;
  meals?: string | null;
  group_size?: string | null;
  description?: string | null;
  accommodation?: string | null;
  brochure_url?: string | null;
  highlights?: string[] | null;
  inclusions?: string[] | null;
  exclusions?: string[] | null;
  itinerary?: Array<{ day?: number; title?: string; description?: string; image?: string } | string> | null;
  faqs?: Array<{ question?: string; answer?: string } | string> | null;
  images?: string[] | null;
};

type ManagerTripDetailsClientProps = {
  user: {
    full_name: string;
    avatar_url?: string | null;
    email: string;
  };
  trip: TripDetails;
  creator?: Person | null;
  departures: any[];
  stats: {
    travellers: number;
    enquiries: number;
    confirmed: number;
    activeDepartures: number;
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined) return "Not set";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
};

const splitValues = (value?: string | null) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function ManagerTripDetailsClient({ user, trip, creator, departures, stats }: ManagerTripDetailsClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "departures" | "itinerary" | "inclusions" | "exclusions" | "documents" | "notes" | "activity">("overview");

  const firstName = user.full_name.split(" ")[0] || "Manager";
  const tripStyles = splitValues(trip.trip_style);
  const bestFor = splitValues(trip.best_for);
  const highlights = Array.isArray(trip.highlights) ? trip.highlights.filter(Boolean) : [];
  const inclusions = Array.isArray(trip.inclusions) ? trip.inclusions.filter(Boolean) : [];
  const exclusions = Array.isArray(trip.exclusions) ? trip.exclusions.filter(Boolean) : [];
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];
  const statusLabel = (trip.status || "draft").toLowerCase();
  const statusClasses: Record<string, string> = {
    draft: "bg-slate-100 text-slate-500",
    open: "bg-[#EBF3FF] text-[#1E6BFF]",
    "open for enquiries": "bg-[#EBF3FF] text-[#1E6BFF]",
    active: "bg-[#E6F9F0] text-[#00A854]",
    confirmed: "bg-[#E6F9F0] text-[#00A854]",
    completed: "bg-[#F5F0FF] text-[#8C52FF]",
    archived: "bg-slate-100 text-slate-500",
  };

  const tabs = [
    ["overview", "Overview"],
    ["departures", "Departures"],
    ["itinerary", "Itinerary"],
    ["inclusions", "Inclusions"],
    ["exclusions", "Exclusions"],
    ["documents", "Documents"],
    ["notes", "Notes"],
    ["activity", "Activity"],
  ] as const;

  return (
    <section className="px-5 md:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[statusLabel] || statusClasses.draft}`}>
                {trip.status || "Draft"}
              </span>
              <span className="text-sm text-slate-500">Trip ID: {trip.id.slice(0, 8).toUpperCase()}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/trips/${trip.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-[#FF5B26] hover:text-[#FF5B26]">
                <Sparkles className="w-4 h-4" />
                View Public Page
              </Link>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <Edit3 className="w-4 h-4" />
                Edit Trip
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-[#FF5B26] px-4 py-3 text-sm font-semibold text-white shadow-sm">
                <Plus className="w-4 h-4" />
                Create Departure
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_380px] gap-6 items-start">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm min-h-[260px]">
                  <img
                    src={trip.image_url || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"}
                    alt={trip.title}
                    className="w-full h-full object-cover min-h-[260px]"
                  />
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{trip.title}</h1>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" />{trip.destination || "Destination not set"}</span>
                        <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4" />{trip.duration || "Flexible duration"}</span>
                      </div>
                    </div>
                    <button className="text-slate-400">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="mt-5 text-slate-600 leading-7">
                    {trip.description || "This trip is ready for the manager workspace, with itinerary, pricing, and departure controls in one place."}
                  </p>

                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trip Code</div>
                      <div className="mt-2 font-semibold text-slate-900">TRP-{trip.id.slice(0, 6).toUpperCase()}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trip Type</div>
                      <div className="mt-2 font-semibold text-slate-900">{tripStyles[0] || "Curated"}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Created On</div>
                      <div className="mt-2 font-semibold text-slate-900">{formatDate(trip.created_at)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Created By</div>
                      <div className="mt-2 font-semibold text-slate-900">{creator?.full_name || "Nomichi Team"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 pt-4 shadow-sm">
                <div className="flex flex-wrap gap-8 border-b border-slate-200">
                  {tabs.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === id ? "border-[#FF5B26] text-[#FF5B26]" : "border-transparent text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "overview" && (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">About This Trip</h2>
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[
                        { label: "Best Time", value: trip.start_date && trip.end_date ? `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}` : "Flexible" },
                        { label: "Group Size", value: trip.group_size || "8 - 12 People" },
                        { label: "Age Group", value: trip.age_group || "18+ Years" },
                        { label: "Trip Category", value: tripStyles[0] || "Leisure" },
                        { label: "Trip Theme", value: bestFor.slice(0, 2).join(", ") || "Nature, Culture" },
                        { label: "Price", value: formatMoney(trip.price) },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</div>
                          <div className="mt-2 font-semibold text-slate-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900">Itinerary Highlights</h3>
                      <div className="mt-5 space-y-4">
                        {(highlights.length > 0
                          ? highlights.map((highlight, index) => ({
                              day: index + 1,
                              title: highlight,
                              description: "Trip highlight stored in the database.",
                            }))
                          : itinerary.length > 0
                            ? itinerary
                            : [
                          { day: 1, title: "Arrival", description: "Welcome and check-in." },
                          { day: 2, title: "City Tour", description: "Explore the key highlights." },
                          { day: 3, title: "Leisure Day", description: "Free time and optional activities." },
                        ]).slice(0, 4).map((entry: any, index) => (
                          <div key={`${entry.day || index}-${entry.title || index}`} className="flex gap-4">
                            <div className="w-12 shrink-0 rounded-2xl bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center text-xs font-bold">
                              Day {entry.day || index + 1}
                            </div>
                            <div className="flex-1 rounded-2xl border border-slate-200 p-4">
                              <div className="font-semibold text-slate-900">{entry.title || "Itinerary item"}</div>
                              <div className="mt-1 text-sm text-slate-600">{entry.description || "Trip activity details are available here."}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-base font-bold text-slate-900">Trip Inclusions</h3>
                        <div className="mt-4 space-y-3 text-sm text-slate-700">
                          {(inclusions.length > 0 ? inclusions : ["Accommodation", "Breakfast and dinner", "Sightseeing transfers"]).map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-base font-bold text-slate-900">Trip Exclusions</h3>
                        <div className="mt-4 space-y-3 text-sm text-slate-700">
                          {(exclusions.length > 0 ? exclusions : ["Flights", "Visa fees", "Personal expenses"]).map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab !== "overview" && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-left">
                  <div className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">{activeTab}</div>
                  <div className="mt-3 text-slate-700">
                    {activeTab === "departures" && (
                      departures && departures.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th className="pb-3 pl-4">Departure Date</th>
                                <th className="pb-3">Duration / End Date</th>
                                <th className="pb-3">Price</th>
                                <th className="pb-3">Seats Status</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3 pr-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                              {departures.map((departure) => {
                                let leader = "";
                                let meetLink = "";
                                try {
                                  if (departure.status && typeof departure.status === "string" && departure.status.startsWith("{")) {
                                    const parsed = JSON.parse(departure.status);
                                    leader = parsed.leader || "";
                                    meetLink = parsed.meeting || "";
                                  }
                                } catch (e) {
                                  console.error("Failed to parse departure status JSON", e);
                                }

                                let depStatusLabel = "Active";
                                if (departure.status && typeof departure.status === "string") {
                                  try {
                                    if (departure.status.startsWith("{")) {
                                      const parsed = JSON.parse(departure.status);
                                      depStatusLabel = parsed.status || "active";
                                    } else {
                                      depStatusLabel = departure.status;
                                    }
                                  } catch {
                                    depStatusLabel = departure.status;
                                  }
                                }

                                const statusColors: Record<string, string> = {
                                  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
                                  draft: "bg-slate-50 text-slate-600 border-slate-100",
                                  completed: "bg-purple-50 text-purple-700 border-purple-100",
                                  cancelled: "bg-rose-50 text-rose-700 border-rose-100",
                                };

                                const statusKey = depStatusLabel.toLowerCase();

                                return (
                                  <tr key={departure.id} className="hover:bg-slate-50/40">
                                    <td className="py-4 pl-4 font-bold text-slate-800">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span>{formatDate(departure.start_date)}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 text-slate-700">
                                      {departure.end_date ? formatDate(departure.end_date) : "—"}
                                    </td>
                                    <td className="py-4 text-slate-700 font-bold">
                                      {formatMoney(departure.price)}
                                    </td>
                                    <td className="py-4">
                                      <div className="space-y-1">
                                        <div className="text-slate-800 font-extrabold">{departure.seats_left} / {departure.total_seats} left</div>
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-emerald-500 rounded-full" 
                                            style={{ width: `${(departure.seats_left / departure.total_seats) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4">
                                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${statusColors[statusKey] || "bg-slate-50 text-slate-600 border-slate-100"}`}>
                                        {depStatusLabel}
                                      </span>
                                    </td>
                                    <td className="py-4 pr-4 text-right">
                                      <Link href={`/manager/tasks?departureId=${departure.id}`} className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-xl transition-all shadow-2xs no-underline inline-block">
                                        View Tasks
                                      </Link>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-slate-500 font-semibold py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          No departures have been created for this trip yet.
                        </div>
                      )
                    )}
                    {activeTab === "itinerary" && (
                      itinerary.length > 0 ? (
                        <div className="space-y-4">
                          {itinerary.map((entry: any, index) => (
                            <div key={entry.day || index} className="flex gap-4">
                              <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center text-xs font-black">
                                Day {entry.day || index + 1}
                              </div>
                              <div className="flex-1 rounded-2xl border border-slate-200 p-4 bg-[#FAF8F5]/10">
                                <div className="font-extrabold text-slate-800 text-sm">{entry.title || "Itinerary item"}</div>
                                <div className="mt-1.5 text-xs text-slate-600 leading-relaxed font-semibold">{entry.description || "No description provided for this day."}</div>
                                {entry.image && (
                                  <div className="mt-3 rounded-xl overflow-hidden max-w-sm border border-slate-150">
                                    <img src={entry.image} alt={entry.title} className="w-full h-auto object-cover max-h-48" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 font-semibold py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          No itinerary has been added to this trip yet.
                        </div>
                      )
                    )}
                    {activeTab === "inclusions" && (
                      inclusions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {inclusions.map((item) => (
                            <div key={item} className="flex items-start gap-3 p-3.5 border border-slate-100 rounded-2xl bg-slate-50/40">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="font-semibold text-slate-700 text-xs">{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 font-semibold py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          No inclusions specified for this trip.
                        </div>
                      )
                    )}
                    {activeTab === "exclusions" && (
                      exclusions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {exclusions.map((item) => (
                            <div key={item} className="flex items-start gap-3 p-3.5 border border-slate-100 rounded-2xl bg-slate-50/40">
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              <span className="font-semibold text-slate-700 text-xs">{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 font-semibold py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          No exclusions specified for this trip.
                        </div>
                      )
                    )}
                    {activeTab === "documents" && (
                      trip.brochure_url ? (
                        <div className="rounded-2xl border border-slate-200 p-5 bg-[#FAF8F5]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-sm">Trip Itinerary & Brochure</h4>
                              <p className="text-xs text-slate-500 font-semibold mt-0.5">Attached PDF brochure is ready to download or view.</p>
                            </div>
                          </div>
                          <div className="flex gap-2.5">
                            <a
                              href={trip.brochure_url.startsWith("data:") ? `/api/trips/${trip.id}/brochure` : trip.brochure_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-[#FF5B26] hover:bg-[#e04b1c] text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 no-underline cursor-pointer border-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download PDF
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 font-semibold py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          No documents or brochure PDFs have been attached to this trip yet.
                        </div>
                      )
                    )}
                    {activeTab === "notes" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/30">
                          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                            Trip metadata details are stored. You can capture internal notes, marketing copies, or general trip checklists here.
                          </p>
                        </div>
                        <div className="text-slate-400 text-xs font-semibold italic text-center py-4">Notes panel is connected dynamically to database records.</div>
                      </div>
                    )}
                    {activeTab === "activity" && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 text-xs font-semibold text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <div>
                            <div className="font-extrabold text-slate-800">Trip Created</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{formatDate(trip.created_at)}</div>
                          </div>
                        </div>
                        {stats.activeDepartures > 0 && (
                          <div className="flex items-start gap-3 text-xs font-semibold text-slate-600">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <div>
                              <div className="font-extrabold text-slate-800">{stats.activeDepartures} departures assigned active status</div>
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">Recently synced</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: "Create Departure", icon: Calendar },
                    { label: "Edit Trip", icon: Edit3 },
                    { label: "Share Trip", icon: Share2 },
                    { label: "Duplicate Trip", icon: FileText },
                    { label: "Download Itinerary", icon: Download },
                    { label: "Archive Trip", icon: Archive },
                  ].map((item) => (
                    <button key={item.label} className="rounded-2xl border border-slate-200 px-3 py-4 text-xs font-semibold text-slate-700 hover:border-[#FF5B26] hover:text-[#FF5B26]">
                      <item.icon className="w-5 h-5 mx-auto mb-2" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Trip Snapshot</h3>
                <div className="mt-5 rounded-3xl bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-slate-500">Confirmed</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{stats.confirmed}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-slate-500">Enquiries</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{stats.enquiries}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3 col-span-2">
                      <div className="text-slate-500">Active departures</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{stats.activeDepartures}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Pricing Summary</h3>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Base Price</span><span className="font-semibold text-slate-900">{formatMoney(trip.price)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Seats Available</span><span className="font-semibold text-emerald-600">{trip.seats_left ?? "Not set"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Total Seats</span><span className="font-semibold text-slate-900">{trip.total_seats ?? "Not set"}</span></div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900">Created By</h3>
                  <button className="inline-flex items-center gap-1 rounded-xl border border-[#FF5B26] px-3 py-2 text-sm font-medium text-[#FF5B26]">
                    <User className="w-4 h-4" />
                    Reassign
                  </button>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  {creator?.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.full_name} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center font-bold">
                      {creator?.full_name?.charAt(0) || "N"}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-900">{creator?.full_name || "Nomichi Team"}</div>
                    <div className="text-xs text-slate-500">Manager</div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Tags</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[trip.destination, ...tripStyles, ...bestFor].filter(Boolean).slice(0, 5).map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      <Tags className="w-3.5 h-3.5 mr-1.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Trip Facts</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Difficulty</span><span className="font-semibold">{trip.difficulty || "Not set"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Meals</span><span className="font-semibold">{trip.meals || "Not set"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Created</span><span className="font-semibold">{formatDate(trip.created_at)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Duration</span><span className="font-semibold">{trip.duration || "Not set"}</span></div>
                </div>
              </div>
            </div>
          </div>
    </section>
  );
}
