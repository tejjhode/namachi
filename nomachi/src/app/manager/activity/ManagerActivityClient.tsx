"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Clock3,
  Mail,
  MessageSquare,
  MoreVertical,
  Plane,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users,
  XCircle,
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
};

type ManagerActivityClientProps = {
  user: {
    full_name: string;
    avatar_url?: string | null;
    email: string;
  };
  activities: ActivityItem[];
};

const categoryMeta: Record<ActivityCategory, { label: string; className: string; icon: typeof Activity }> = {
  system: { label: "System", className: "bg-slate-100 text-slate-600", icon: Shield },
  leads: { label: "Leads & Enquiries", className: "bg-[#FFF1EA] text-[#FF5B26]", icon: UserPlus },
  trips: { label: "Trips & Bookings", className: "bg-[#EBF3FF] text-[#1E6BFF]", icon: Plane },
  payments: { label: "Payments", className: "bg-[#ECFDF5] text-[#16A34A]", icon: CreditCard },
  messages: { label: "Messages", className: "bg-[#F4EDFF] text-[#7C3AED]", icon: Mail },
  documents: { label: "Documents", className: "bg-[#FFF6E5] text-[#D97706]", icon: FileText },
  team: { label: "Team", className: "bg-[#EEF2FF] text-[#2563EB]", icon: Users },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export function ManagerActivityClient({ user, activities }: ManagerActivityClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | ActivityCategory>("all");
  const [selectedCategories, setSelectedCategories] = useState<ActivityCategory[]>([
    "system",
    "leads",
    "trips",
    "payments",
    "messages",
    "documents",
    "team",
  ]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [dateWindow, setDateWindow] = useState("this_week");
  const [currentPage, setCurrentPage] = useState(1);

  const firstName = user.full_name?.split(" ")[0] || "Manager";
  const itemsPerPage = 8;

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach((item) => {
      if (item.userId) map.set(item.userId, item.userName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  const uniqueEntityTypes = useMemo(() => {
    return Array.from(new Set(activities.map((item) => item.entityType).filter(Boolean))).sort();
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activities.filter((item) => {
      if (selectedTab !== "all" && item.category !== selectedTab) return false;
      if (!selectedCategories.includes(item.category)) return false;
      if (selectedUser !== "all" && item.userId !== selectedUser) return false;
      if (selectedEntity !== "all" && item.entityType !== selectedEntity) return false;
      if (dateWindow !== "all" && !inDateWindow(item.time, dateWindow)) return false;
      if (query) {
        const searchable = `${item.label} ${item.details} ${item.entity} ${item.userName} ${item.entityType}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }, [activities, dateWindow, searchQuery, selectedCategories, selectedEntity, selectedTab, selectedUser]);

  const paginationCount = Math.max(1, Math.ceil(filteredActivities.length / itemsPerPage));
  const paginatedActivities = filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const counts = {
    today: activities.filter((item) => inDateWindow(item.time, "today")).length,
    completed: activities.filter((item) => ["updated", "status_changed", "created"].includes(item.action)).length,
    pending: activities.filter((item) => ["assigned", "created"].includes(item.action) && item.category === "leads").length,
    users: new Set(activities.filter((item) => inDateWindow(item.time, "this_week")).map((item) => item.userId || item.userName)).size,
  };

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const dateRangeLabel = `${formatCompactDate(weekStart.toISOString())} - ${formatCompactDate(new Date().toISOString())}`;

  const tabs: Array<"all" | ActivityCategory> = ["all", "system", "leads", "trips", "payments", "messages", "documents", "team"];

  const toggleCategory = (category: ActivityCategory) => {
    setCurrentPage(1);
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
    setSelectedTab("all");
  };

  const applyTab = (tab: "all" | ActivityCategory) => {
    setCurrentPage(1);
    setSelectedTab(tab);
    setSelectedCategories(tab === "all" ? ["system", "leads", "trips", "payments", "messages", "documents", "team"] : [tab]);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTab("all");
    setSelectedCategories(["system", "leads", "trips", "payments", "messages", "documents", "team"]);
    setSelectedUser("all");
    setSelectedEntity("all");
    setDateWindow("this_week");
    setCurrentPage(1);
  };

  return (
    <section className="px-5 md:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-[30px] font-bold tracking-tight text-slate-900">Activity</h1>
              <p className="text-sm text-slate-600 mt-1">Track all important activities across the system.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-[#FF5B26] hover:text-[#FF5B26]">
              <ArrowRight className="w-4 h-4 rotate-[-45deg]" />
              Export
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Today's Activities", value: counts.today, icon: Activity, accent: "text-[#2563EB] bg-[#EEF4FF]" },
              { label: "Completed", value: counts.completed, icon: CheckCircle2, accent: "text-[#16A34A] bg-[#ECFDF5]" },
              { label: "Pending", value: counts.pending, icon: Clock3, accent: "text-[#F97316] bg-[#FFF7E8]" },
              { label: "Unique Users", value: counts.users, icon: Users, accent: "text-[#7C3AED] bg-[#F4EDFF]" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${item.accent}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">{item.label}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{item.value}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {item.label === "Today's Activities" && "from the last 24 hours"}
                    {item.label === "Completed" && "this week"}
                    {item.label === "Pending" && "requires action"}
                    {item.label === "Unique Users" && "active this week"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_310px] gap-4 items-start">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 overflow-x-auto">
                <div className="flex items-center gap-8 min-w-max">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => applyTab(tab)}
                      className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                        selectedTab === tab ? "border-[#FF5B26] text-[#FF5B26]" : "border-transparent text-slate-600"
                      }`}
                    >
                      {tab === "all" ? "All Activities" : categoryMeta[tab].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(150px,1fr))] gap-3 items-center">
                  <div className="relative">
                    <input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search activities..."
                      className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#FF5B26]"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedUser}
                      onChange={(event) => {
                        setSelectedUser(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#FF5B26]"
                    >
                      <option value="all">All Users</option>
                      {uniqueUsers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedEntity}
                      onChange={(event) => {
                        setSelectedEntity(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#FF5B26]"
                    >
                      <option value="all">All Entities</option>
                      {uniqueEntityTypes.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <div className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 flex items-center justify-between text-sm text-slate-700">
                      <span>{dateRangeLabel}</span>
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <button className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 inline-flex items-center justify-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Activity</th>
                          <th className="px-5 py-4">Details</th>
                          <th className="px-5 py-4">Entity</th>
                          <th className="px-5 py-4">User</th>
                          <th className="px-5 py-4">Time</th>
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedActivities.length === 0 ? (
                          <tr>
                            <td className="px-5 py-16 text-center text-slate-500" colSpan={6}>
                              No activities match your filters.
                            </td>
                          </tr>
                        ) : (
                          paginatedActivities.map((item) => {
                            const meta = categoryMeta[item.category];
                            const Icon = meta.icon;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.className}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900">{item.label}</div>
                                      <div className="text-xs text-slate-500">{meta.label}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-700">{item.details}</td>
                                <td className="px-5 py-4">
                                  <div className="font-semibold text-slate-900">{item.entity}</div>
                                  <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                    {item.entityType}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    {item.userAvatar ? (
                                      <img src={item.userAvatar} alt={item.userName} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center text-xs font-bold">
                                        {item.userName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-semibold text-slate-900">{item.userName}</div>
                                      <div className="text-xs text-slate-500">Manager</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(item.time)}</td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center justify-end">
                                    <button className="w-8 h-8 rounded-xl border border-slate-200 bg-white inline-flex items-center justify-center text-slate-500 hover:border-[#FF5B26] hover:text-[#FF5B26]">
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
                    <div>
                      Showing {filteredActivities.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length} activities
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                        className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40"
                        disabled={currentPage === 1}
                      >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, paginationCount) }, (_, index) => index + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`h-9 min-w-9 px-3 rounded-xl border text-sm font-semibold ${
                              currentPage === page ? "border-[#FF5B26] bg-[#FFF1EA] text-[#FF5B26]" : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage((value) => Math.min(paginationCount, value + 1))}
                        className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 disabled:opacity-40"
                        disabled={currentPage === paginationCount}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 xl:sticky xl:top-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Filters</h3>
                    <button onClick={resetFilters} className="text-sm font-semibold text-[#FF5B26] hover:underline">
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-700">Activity Type</div>
                    <div className="space-y-2">
                      {(["system", "leads", "trips", "payments", "messages", "documents", "team"] as ActivityCategory[]).map((category) => (
                        <label key={category} className="flex items-center gap-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="h-4 w-4 rounded border-slate-300 text-[#FF5B26] focus:ring-[#FF5B26]"
                          />
                          <span>{categoryMeta[category].label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-700">User</div>
                    <div className="relative">
                      <select
                        value={selectedUser}
                        onChange={(event) => setSelectedUser(event.target.value)}
                        className="appearance-none w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#FF5B26]"
                      >
                        <option value="all">All Users</option>
                        {uniqueUsers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-700">Entity Type</div>
                    <div className="relative">
                      <select
                        value={selectedEntity}
                        onChange={(event) => setSelectedEntity(event.target.value)}
                        className="appearance-none w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm outline-none focus:border-[#FF5B26]"
                      >
                        <option value="all">All Entities</option>
                        {uniqueEntityTypes.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-700">Date Range</div>
                    <div className="h-12 rounded-2xl border border-slate-200 bg-white px-4 flex items-center justify-between text-sm text-slate-700">
                      <span>{dateRangeLabel}</span>
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-700">Quick Filters</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["today", "Today"],
                        ["yesterday", "Yesterday"],
                        ["this_week", "This Week"],
                        ["last_week", "Last Week"],
                        ["this_month", "This Month"],
                        ["last_month", "Last Month"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setDateWindow(value)}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                            dateWindow === value ? "border-[#FF5B26] bg-[#FFF1EA] text-[#FF5B26]" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="w-full rounded-2xl bg-[#FF5B26] px-4 py-3 text-sm font-semibold text-white shadow-sm">
                    Apply Filters
                  </button>
                </aside>
              </div>
            </div>
          </div>
    </section>
  );
}
