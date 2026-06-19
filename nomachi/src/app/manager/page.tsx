import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import {
  CircleCheck,
  Filter,
  Send,
  Users,
  ArrowRight,
} from "lucide-react";


type RecentLead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  created_at?: string | null;
  assigned_to?: string | null;
  trips?: {
    id?: string | null;
    title?: string | null;
    destination?: string | null;
    image_url?: string | null;
  } | null;
};

type TripRecord = {
  id: string;
  title: string;
  destination?: string | null;
  image_url?: string | null;
};

type ManagerProfile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  role?: string | null;
};

const statusLabelMap: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-[#FFF1EA] text-[#FF5B26]" },
  contacted: { label: "Contacted", className: "bg-[#EAF1FF] text-[#2563EB]" },
  qualified: { label: "Qualified", className: "bg-[#F4EDFF] text-[#7C3AED]" },
  negotiating: { label: "Vibe Check", className: "bg-[#FFF6E5] text-[#D97706]" },
  converted: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#16A34A]" },
  lost: { label: "Not a Fit", className: "bg-[#F3F4F6] text-[#6B7280]" },
};

const tripImages = [
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=160&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=160&q=80",
];

const formatTimeAgo = (value?: string | null) => {
  if (!value) return "Recently";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";
  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

export default async function ManagerPage() {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, email, role")
    .eq("id", user.id)
    .single();

  const role = normalizeRole(profile?.role || user.user_metadata?.role);
  if (!isManagerOrAdminRole(role)) {
    redirect("/");
  }

  if (role === "ADMIN") {
    redirect("/admin");
  }

  const [leadsResult, tripsResult, assigneesResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, email, phone, status, created_at, assigned_to, trips(id, title, destination, image_url)")
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trips")
      .select("id, title, destination, image_url, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
  ]);

  const leads = (leadsResult.data || []) as RecentLead[];
  const trips = (tripsResult.data || []) as TripRecord[];
  const assignees = (assigneesResult.data || []) as Array<{ id: string; full_name?: string | null; avatar_url?: string | null }>;
  const assigneeMap = new Map(assignees.map((entry) => [entry.id, entry]));

  const totalLeads = leads.length;
  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const qualifiedLeads = leads.filter((lead) => lead.status === "qualified").length;
  const confirmedLeads = leads.filter((lead) => lead.status === "converted" || lead.status === "confirmed").length;

  const pipelineItems = [
    { key: "new", label: "New", value: leads.filter((lead) => lead.status === "new").length, color: "bg-[#FF5B26]" },
    { key: "contacted", label: "Contacted", value: leads.filter((lead) => lead.status === "contacted").length, color: "bg-[#2563EB]" },
    { key: "qualified", label: "Qualified", value: leads.filter((lead) => lead.status === "qualified").length, color: "bg-[#7C3AED]" },
    { key: "negotiating", label: "Vibe Check", value: leads.filter((lead) => lead.status === "negotiating" || lead.status === "vibe check sent").length, color: "bg-[#F59E0B]" },
    { key: "converted", label: "Confirmed", value: confirmedLeads, color: "bg-[#16A34A]" },
    { key: "lost", label: "Not A Fit", value: leads.filter((lead) => lead.status === "lost").length, color: "bg-[#F97316]" },
  ];

  const tripCounts = trips.map((trip: TripRecord, index) => ({
    ...trip,
    leadsCount: leads.filter((lead) => lead.trips?.id === trip.id).length,
    imageUrl: trip.image_url || tripImages[index % tripImages.length],
  }))
    .filter((trip) => trip.leadsCount > 0)
    .sort((left, right) => right.leadsCount - left.leadsCount)
    .slice(0, 5);

  const recentLeads = leads.slice(0, 5).map((lead, index) => {
    const assignee = lead.assigned_to ? assigneeMap.get(lead.assigned_to) : undefined;
    const matchedTrip = lead.trips;
    const statusChip = statusLabelMap[lead.status.toLowerCase()] || {
      label: lead.status,
      className: "bg-[#F3F4F6] text-[#374151]",
    };

    return {
      ...lead,
      avatarLetter: lead.name?.charAt(0)?.toUpperCase() || "L",
      assigneeName: assignee?.full_name || "Unassigned",
      assigneeAvatar: assignee?.avatar_url || null,
      tripTitle: matchedTrip?.title || "General Enquiry",
      statusChip,
      timeAgo: formatTimeAgo(lead.created_at),
      avatarBg: ["bg-[#FFF1EA]", "bg-[#F4EDFF]", "bg-[#EBF0FF]", "bg-[#ECFDF5]", "bg-[#FFF7ED]"][index % 5],
    };
  });

  return (
    <section className="px-5 md:px-8 py-7 md:py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-500">A quick overview of leads and trips.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Total Leads", value: totalLeads, icon: Users, iconBg: "bg-[#FFF1EA] text-[#FF5B26]" },
              { label: "New Leads", value: newLeads, icon: Send, iconBg: "bg-[#EAF1FF] text-[#2563EB]" },
              { label: "Qualified", value: qualifiedLeads, icon: Filter, iconBg: "bg-[#F4EDFF] text-[#7C3AED]" },
              { label: "Confirmed", value: confirmedLeads, icon: CircleCheck, iconBg: "bg-[#ECFDF5] text-[#16A34A]" },
            ].map((card) => (
              <article key={card.label} className="bg-white rounded-2xl border border-slate-200/80 p-6 flex items-center gap-5 shadow-sm">
                <div className={`w-16 h-16 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <card.icon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                  <div className="mt-1 text-4xl font-bold tracking-tight text-slate-900">{card.value}</div>
                </div>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <article className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Pipeline Overview</h2>
              </div>
              <div className="space-y-4">
                {pipelineItems.map((item) => (
                  <div key={item.key} className="flex items-center gap-4">
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="w-28 text-sm text-slate-700 font-medium">{item.label}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Leads Per Trip</h2>
                <a href="/manager" className="text-sm font-semibold text-[#FF5B26] flex items-center gap-1">
                  View All Trips <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="space-y-4">
                {tripCounts.length > 0 ? tripCounts.map((trip) => (
                  <div key={trip.id} className="flex items-center gap-4">
                    <img src={trip.imageUrl} alt={trip.title} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{trip.title}</div>
                      <div className="text-sm text-slate-500">{trip.destination || "Featured trip"}</div>
                    </div>
                    <div className="font-semibold text-slate-900">{trip.leadsCount}</div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">No trip activity yet.</div>
                )}
              </div>
            </article>
          </div>

          <article className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Recent Leads</h2>
              <a href="/manager/leads" className="text-sm font-semibold text-[#FF5B26] flex items-center gap-1">
                View All Leads <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="hidden xl:grid grid-cols-[1.5fr_1.5fr_0.8fr_1.1fr_0.7fr] gap-4 px-2 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <div>Lead</div>
              <div>Trip</div>
              <div>Status</div>
              <div>Assigned To</div>
              <div className="text-right">Time</div>
            </div>

            {recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="grid grid-cols-1 xl:grid-cols-[1.5fr_1.5fr_0.8fr_1.1fr_0.7fr] gap-4 items-center rounded-2xl border border-slate-100 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${lead.avatarBg} text-[#FF5B26] flex items-center justify-center font-bold shrink-0`}>
                        {lead.avatarLetter}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{lead.name}</div>
                        <div className="text-sm text-slate-500">{lead.phone || lead.email}</div>
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-slate-900">{lead.tripTitle}</div>
                      <div className="text-sm text-slate-500">{lead.trips?.destination || "Trip enquiry"}</div>
                    </div>

                    <div>
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${lead.statusChip.className}`}>
                        {lead.statusChip.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {lead.assigneeAvatar ? (
                        <img src={lead.assigneeAvatar} alt={lead.assigneeName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold">
                          {lead.assigneeName.charAt(0)}
                        </div>
                      )}
                      <div className="text-sm font-medium text-slate-700">{lead.assigneeName}</div>
                    </div>

                    <div className="text-sm text-slate-500 xl:text-right">{lead.timeAgo}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No assigned leads yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Leads assigned to this manager will show up here automatically.
                </p>
              </div>
            )}
          </article>
    </section>
  );
}
