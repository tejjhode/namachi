import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Compass,
  Edit3,
  Eye,
  MapPin,
  Plane,
  Sparkles,
  User,
  Users,
  CalendarCheck,
  Clock3,
  Target,
  IndianRupee,
  LayoutGrid,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAmount = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "Not set";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "Not set";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};

const parseStatusMeta = (status?: string | null) => {
  if (!status) {
    return { state: "draft", code: "Unscheduled", leader: "Unassigned", meeting: "Not set", notes: "" };
  }
  try {
    if (status.trim().startsWith("{")) {
      const parsed = JSON.parse(status);
      return {
        state: parsed.status || "active",
        code: parsed.code || "Unscheduled",
        leader: parsed.leader || "Unassigned",
        meeting: parsed.meeting || "Not set",
        notes: parsed.notes || "",
      };
    }
  } catch {
    // fall through to plain string
  }
  return { state: status.toLowerCase(), code: "Unscheduled", leader: "Unassigned", meeting: "Not set", notes: "" };
};

export default async function AdminTripOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const normalizeRole = (value?: string | null) => value?.trim().toLowerCase() || "";
  const roleFromProfile = normalizeRole(profile?.role);
  const roleFromMetadata = normalizeRole(user.user_metadata?.role);
  const allowedRole = [roleFromProfile, roleFromMetadata].find((role) => ["admin", "manager"].includes(role));

  if (!profile && !allowedRole) {
    redirect("/login");
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (tripError || !trip) {
    notFound();
  }

const [
  { data: creatorProfile },
  { data: leads, error: leadsError },
  { data: departures, error: departuresError }
] = await Promise.all([
    trip.created_by
      ? supabase.from("profiles").select("id, full_name, avatar_url").eq("id", trip.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
   supabase
  .from("leads")
  .select(`
    *,
    profiles!leads_assigned_to_fkey (
      id,
      full_name,
      avatar_url
    )
  `)
  .eq("trip_id", id)
  .order("created_at", { ascending: false }),
    supabase
      .from("trip_departures")
      .select("*")
      .eq("trip_id", id)
      .order("start_date", { ascending: false }),
  ]);
  // console.log(JSON.stringify(leads, null, 2));
  console.log("Leads Error:", leadsError);
// console.log("Departures Error:", departuresError);
//   console.log("Trip ID:", id);
// console.log("Leads:", leads);
// console.log("Leads Count:", leads?.length);
// console.log("Departures:", departures);

  const enquiryRows = (leads || []) as any[];
  const userIds = [...new Set(enquiryRows.map((l) => l.user_id).filter(Boolean))];

const { data: enquirerProfiles } = await supabase
  .from("profiles")
  .select("id, full_name, avatar_url")
  .in("id", userIds);

const enquirerMap = Object.fromEntries(
  (enquirerProfiles || []).map((p) => [p.id, p])
);
  const departureRows = (departures || []) as any[];
  const highlights = Array.isArray(trip.highlights) ? trip.highlights : [];
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];
  const images = Array.isArray(trip.images) ? trip.images : [];
  const faqs = Array.isArray(trip.faqs) ? trip.faqs : [];
  const incl = Array.isArray(trip.inclusions) ? trip.inclusions : [];
  const excl = Array.isArray(trip.exclusions) ? trip.exclusions : [];
  const styles = typeof trip.trip_style === "string" ? trip.trip_style.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  const bestFor = typeof trip.best_for === "string" ? trip.best_for.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  const activeDepartures = departureRows.filter((dep) => parseStatusMeta(dep.status).state === "active");

  const enquiryCounts = enquiryRows.reduce(
    (acc, lead) => {
      const status = (lead.status || "").toLowerCase();
      if (["new", "contacted"].includes(status)) acc.pending += 1;
      if (status === "qualified") acc.qualified += 1;
      if (["converted", "confirmed"].includes(status)) acc.confirmed += 1;
      return acc;
    },
    { pending: 0, qualified: 0, confirmed: 0 }
  );

  const leadEvents = enquiryRows.flatMap((lead) => {
    const noteEvents = Array.isArray(lead.lead_notes)
      ? lead.lead_notes.map((note: any) => ({
          time: note.created_at,
          title: `Note added for ${lead.name}`,
          description: note.content || "Lead note added",
        }))
      : [];

    return [
      {
        time: lead.created_at,
        title: `Enquiry received from ${lead.name}`,
        description: `${lead.status || "new"} enquiry${lead.source ? ` via ${lead.source}` : ""}`,
      },
      ...noteEvents,
    ];
  });

  const departureEvents = departureRows.map((dep) => {
    const meta = parseStatusMeta(dep.status);
    return {
      time: dep.created_at || dep.start_date,
      title: `Departure ${meta.code}`,
      description: `${formatDate(dep.start_date)}${dep.end_date ? ` to ${formatDate(dep.end_date)}` : ""}`,
    };
  });

  const timeline = [
    {
      time: trip.created_at,
      title: "Trip created",
      description: creatorProfile?.full_name ? `Created by ${creatorProfile.full_name}` : "Trip created in database",
    },
    ...departureEvents,
    ...leadEvents,
  ]
    .filter((item) => item.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  const totalEnquiries = enquiryRows.length;
  const groupLabel = trip.group_size || "Not set";
  const currentUserName = profile.full_name || user.email?.split("@")[0] || "Admin";
  const currentUserAvatar = profile.avatar_url || user.user_metadata?.avatar_url || "";

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-nomichi-ink">
      <div className="flex min-h-screen">
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-20 border-b border-[#e7e1d5]/60 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-8 py-5">
              <div className="flex items-center gap-3">
                <Link href="/admin/trips" className="inline-flex items-center gap-2 text-sm font-bold text-nomichi-ink/60 hover:text-[#FF5B26] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Trips
                </Link>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#FAF8F4] border border-[#e7e1d5]/50 flex items-center justify-center">
                    {currentUserAvatar ? (
                      <img src={currentUserAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-[#FF5B26]" />
                    )}
                  </div>
                  <div className="leading-tight text-left">
                    <p className="text-sm font-extrabold">{currentUserName}</p>
                    <p className="text-[11px] text-nomichi-ink/45 font-semibold">Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-8 space-y-8">
            <section className="rounded-[28px] border border-[#e7e1d5]/50 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 xl:grid-cols-[290px_1fr_auto] gap-6 p-6 xl:p-7 items-start">
                <div className="relative">
                  <div className="aspect-[4/3] rounded-[22px] overflow-hidden bg-[#FAF8F4] border border-[#e7e1d5]/50">
                    <img
                      src={trip.image_url || "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80"}
                      alt={trip.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#FF5B26]/30 bg-[#FFEFEA] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#FF5B26]">
                      {trip.status || "Draft"}
                    </span>
                    {styles[0] && (
                      <span className="rounded-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-nomichi-ink/70">
                        {styles[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl font-display font-black leading-tight tracking-tight uppercase">
                      {trip.title}
                    </h1>
                    <p className="mt-2 text-sm font-medium text-nomichi-ink/60 max-w-2xl">
                      {trip.description || "No description stored for this trip."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    {trip.destination && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F4] border border-[#e7e1d5]/50 px-3 py-2">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5B26]" />
                        {trip.destination}
                      </span>
                    )}
                    {trip.difficulty && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F4] border border-[#e7e1d5]/50 px-3 py-2">
                        <Compass className="w-3.5 h-3.5 text-[#FF5B26]" />
                        {trip.difficulty}
                      </span>
                    )}
                    {trip.duration && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F4] border border-[#e7e1d5]/50 px-3 py-2">
                        <Clock3 className="w-3.5 h-3.5 text-[#FF5B26]" />
                        {trip.duration}
                      </span>
                    )}
                    {trip.price !== null && trip.price !== undefined && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F4] border border-[#e7e1d5]/50 px-3 py-2">
                        <IndianRupee className="w-3.5 h-3.5 text-[#FF5B26]" />
                        {formatAmount(trip.price)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                  <Link
                    href={`/admin/trips/${trip.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#e7e1d5]/60 bg-white px-5 py-3 text-sm font-bold text-nomichi-ink shadow-sm hover:bg-[#FAF8F4] transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Trip
                  </Link>
                  <Link
                    href={`/trips/${trip.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#e7e1d5]/60 bg-white px-5 py-3 text-sm font-bold text-nomichi-ink shadow-sm hover:bg-[#FAF8F4] transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Public Page
                  </Link>
                  <Link
                    href={`/admin/trips/${trip.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border-0 bg-[#FF5B26] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#FF5B26]/20 hover:bg-[#db4e20] transition-colors"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    Activate Departure
                  </Link>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {[
                { label: "Enquiries", value: totalEnquiries, icon: Users, bg: "bg-[#FFF1ED]", fg: "text-[#FF5B26]", sub: "Total enquiries" },
                { label: "Qualified", value: enquiryCounts.qualified, icon: Target, bg: "bg-[#F2ECFF]", fg: "text-[#7C5CFC]", sub: "Total qualified" },
                { label: "Confirmed", value: enquiryCounts.confirmed, icon: CheckCircle, bg: "bg-[#ECFDF5]", fg: "text-[#16A34A]", sub: "Total confirmed" },
                { label: "Departures", value: departureRows.length, icon: Plane, bg: "bg-[#FFF7E8]", fg: "text-[#F59E0B]", sub: "Active departures" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-5 shadow-sm flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full ${card.bg} ${card.fg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-nomichi-ink/60">{card.label}</p>
                      <p className="text-3xl font-black leading-none mt-1">{card.value}</p>
                      <p className="mt-1 text-[11px] font-semibold text-nomichi-ink/45">{card.sub}</p>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="flex flex-wrap gap-4 border-b border-[#e7e1d5]/60">
              {["Overview", "Enquiries", "Departures", "Travelers", "Content", "Activity"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`pb-4 text-sm font-bold transition-colors ${index === 0 ? "text-[#FF5B26] border-b-2 border-[#FF5B26]" : "text-nomichi-ink/55"}`}
                >
                  {tab}
                </button>
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.7fr] gap-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
                  <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-black">Trip Information</h2>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: "Destination", value: trip.destination, icon: MapPin },
                        { label: "Duration", value: trip.duration, icon: Calendar },
                        { label: "Price (per person)", value: formatAmount(trip.price), icon: IndianRupee },
                        { label: "Trip Style", value: styles.join(", ") || "Not set", icon: LayoutGrid },
                        { label: "Difficulty", value: trip.difficulty || "Not set", icon: Compass },
                        { label: "Group Size", value: groupLabel, icon: Users },
                        { label: "Meals", value: trip.meals || "Not set", icon: Sparkles },
                        { label: "Created On", value: formatDate(trip.created_at), icon: Clock3 },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-[#e7e1d5]/40 bg-[#FAF8F4]/35 p-4">
                            <div className="mt-0.5 text-nomichi-ink/40">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-nomichi-ink/45">{item.label}</p>
                              <p className="mt-1 text-sm font-bold text-nomichi-ink">{item.value || "Not set"}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-black">About This Trip</h2>
                    <p className="mt-4 text-sm leading-7 text-nomichi-ink/70">
                      {trip.description || "No trip description has been stored in the database for this trip yet."}
                    </p>

                    <div className="mt-6 rounded-3xl bg-[#FAF4EC] border border-[#f0e0c7] p-5">
                      <h3 className="text-sm font-black">Highlights</h3>
                      {highlights.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {highlights.map((item: string, idx: number) => (
                            <li key={`${item}-${idx}`} className="flex items-start gap-2 text-sm text-nomichi-ink/75">
                              <CheckCircle className="mt-0.5 w-4 h-4 text-emerald-500 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-nomichi-ink/55">No highlights stored for this trip.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black">Recent Enquiries</h2>
                    <span className="text-xs font-semibold text-nomichi-ink/45">{totalEnquiries} total</span>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#e7e1d5]/40">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#FAF8F4] text-nomichi-ink/45">
                        <tr>
                          <th className="px-4 py-3 font-bold">Name</th>
                          <th className="px-4 py-3 font-bold">Source</th>
                          <th className="px-4 py-3 font-bold">Submitted On</th>
                          <th className="px-4 py-3 font-bold">Status</th>
                          <th className="px-4 py-3 font-bold">Assigned To</th>
                        </tr>
                      </thead>
                     <tbody className="divide-y divide-[#e7e1d5]/30">
  {enquiryRows.length > 0 ? (
    enquiryRows.slice(0, 4).map((lead) => {
      const enquirer = enquirerMap[lead.user_id];

      return (
        <tr key={lead.id} className="bg-white">
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              {enquirer?.avatar_url ? (
                <img
                  src={enquirer.avatar_url}
                  alt={lead.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#e7e1d5]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#FFEFEA] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#FF5B26]" />
                </div>
              )}

              <div>
                <div className="font-bold">{lead.name}</div>
                <div className="text-xs text-nomichi-ink/45">
                  {lead.phone || lead.email}
                </div>
              </div>
            </div>
          </td>

          <td className="px-4 py-4 text-nomichi-ink/70">
            {lead.source || "Website"}
          </td>

          <td className="px-4 py-4 text-nomichi-ink/70">
            {formatDateTime(lead.created_at)}
          </td>

          <td className="px-4 py-4">
            <span className="rounded-full bg-[#FFEFEA] px-3 py-1 text-[11px] font-bold text-[#FF5B26]">
              {(lead.status || "new").toUpperCase()}
            </span>
          </td>

          <td className="px-4 py-4">
            {lead.profiles ? (
              <div className="flex items-center gap-3">
                <img
                  src={lead.profiles.avatar_url}
                  alt={lead.profiles.full_name}
                  className="w-8 h-8 rounded-full object-cover border border-[#e7e1d5]"
                />
                <span className="text-nomichi-ink/70 font-medium">
                  {lead.profiles.full_name}
                </span>
              </div>
            ) : (
              <span className="text-nomichi-ink/45">Unassigned</span>
            )}
          </td>
        </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan={5} className="px-4 py-10 text-center text-sm text-nomichi-ink/45">
        No enquiries linked to this trip yet.
      </td>
    </tr>
  )}
</tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-black">Trip Details</h2>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-nomichi-ink/50 font-semibold">Status</span>
                      <span className="rounded-full bg-[#EBF3FF] px-3 py-1 text-xs font-bold text-[#1E6BFF]">
                        {trip.status || "Draft"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-nomichi-ink/50 font-semibold">Created On</span>
                      <span className="font-bold">{formatDate(trip.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-nomichi-ink/50 font-semibold">Created By</span>
                      <span className="font-bold">{creatorProfile?.full_name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-nomichi-ink/50 font-semibold">Last Updated</span>
                      <span className="font-bold">{formatDateTime((trip as any).updated_at || trip.created_at)}</span>
                    </div>
                    <div className="border-t border-[#e7e1d5]/50 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-nomichi-ink/55">Enquiries</span>
                        <span className="font-bold">{totalEnquiries}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-nomichi-ink/55">Qualified</span>
                        <span className="font-bold">{enquiryCounts.qualified}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-nomichi-ink/55">Confirmed</span>
                        <span className="font-bold">{enquiryCounts.confirmed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-nomichi-ink/55">Departures</span>
                        <span className="font-bold">{departureRows.length}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/trips/${trip.id}`}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FF5B26] px-4 py-3 text-sm font-bold text-[#FF5B26] hover:bg-[#FFEFEA] transition-colors"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    Activate Departure
                  </Link>
                  <p className="mt-3 text-center text-xs font-medium text-nomichi-ink/45">
                    Create a departure to start confirming seats.
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-black">Activity Timeline</h2>
                  <div className="mt-5 space-y-4">
                    {timeline.length > 0 ? (
                      timeline.map((item, idx) => (
                        <div key={`${item.title}-${idx}`} className="flex gap-3">
                          <div className="mt-1 h-full w-3 flex flex-col items-center">
                            <span className="h-3 w-3 rounded-full bg-[#22C55E] shadow-sm" />
                            {idx !== timeline.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-[#e7e1d5]" />}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-bold">{item.title}</p>
                            <p className="text-xs font-semibold text-nomichi-ink/45 mt-1">{formatDateTime(item.time)}</p>
                            <p className="mt-1 text-sm leading-6 text-nomichi-ink/70">{item.description}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-nomichi-ink/45">No timeline activity available yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-black">Departure Snapshot</h2>
                  <div className="mt-5 space-y-4">
                    {activeDepartures.length > 0 ? (
                      activeDepartures.slice(0, 3).map((dep) => {
                        const meta = parseStatusMeta(dep.status);
                        return (
                          <div key={dep.id} className="rounded-2xl border border-[#e7e1d5]/40 bg-[#FAF8F4]/40 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-black">{meta.code}</p>
                                <p className="text-xs font-semibold text-nomichi-ink/45 mt-1">
                                  {formatDate(dep.start_date)}{dep.end_date ? ` - ${formatDate(dep.end_date)}` : ""}
                                </p>
                              </div>
                              <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold text-[#16A34A]">
                                Active
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-nomichi-ink/60">
                              <span>Seats: {dep.seats_left}/{dep.total_seats}</span>
                              <span>Leader: {meta.leader}</span>
                              <span>Meeting: {meta.meeting}</span>
                              <span>Price: {formatAmount(dep.price)}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-nomichi-ink/45">No active departure exists for this trip.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black">Content</h2>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#e7e1d5]/40 bg-[#FAF8F4]/40 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-nomichi-ink/45">Inclusions</p>
                    {incl.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-nomichi-ink/70">
                        {incl.map((item: string, idx: number) => (
                          <li key={`${item}-${idx}`}>• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-nomichi-ink/45">No inclusions stored.</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-[#e7e1d5]/40 bg-[#FAF4EC]/70 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-nomichi-ink/45">Exclusions</p>
                    {excl.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-nomichi-ink/70">
                        {excl.map((item: string, idx: number) => (
                          <li key={`${item}-${idx}`}>• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-nomichi-ink/45">No exclusions stored.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#e7e1d5]/40 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-nomichi-ink/45">Best For</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bestFor.length > 0 ? bestFor.map((item) => (
                      <span key={item} className="rounded-full bg-[#FFEFEA] px-3 py-1 text-xs font-bold text-[#FF5B26]">
                        {item}
                      </span>
                    )) : (
                      <span className="text-sm text-nomichi-ink/45">Not set</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e7e1d5]/50 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black">Gallery & FAQ</h2>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-nomichi-ink/45">Gallery</p>
                    {images.length > 0 ? (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {images.slice(0, 6).map((img: string, idx: number) => (
                          <div key={`${img}-${idx}`} className="aspect-square rounded-2xl overflow-hidden bg-[#FAF8F4] border border-[#e7e1d5]/40">
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-nomichi-ink/45">No gallery images saved.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-nomichi-ink/45">FAQs</p>
                    <div className="mt-3 space-y-3">
                      {faqs.length > 0 ? (
                        faqs.slice(0, 4).map((faq: any, idx: number) => (
                          <div key={`${faq.question}-${idx}`} className="rounded-2xl border border-[#e7e1d5]/40 p-4">
                            <p className="font-bold">{faq.question}</p>
                            <p className="mt-2 text-sm leading-6 text-nomichi-ink/65">{faq.answer}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-nomichi-ink/45">No FAQs stored.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
