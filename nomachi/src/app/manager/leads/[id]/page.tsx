import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";
import { isManagerOrAdminRole, normalizeRole } from "@/lib/auth/roles";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Settings,
  Users,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plane,
  Briefcase,
  Bell,
  ChevronDown,
} from "lucide-react";

export const dynamic = "force-dynamic";

const statusMeta: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-[#FFF1EA] text-[#FF5B26]" },
  contacted: { label: "Contacted", className: "bg-[#EAF1FF] text-[#2563EB]" },
  qualified: { label: "Qualified", className: "bg-[#F4EDFF] text-[#7C3AED]" },
  negotiating: { label: "Vibe Check", className: "bg-[#FFF6E5] text-[#D97706]" },
  converted: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#16A34A]" },
  confirmed: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#16A34A]" },
  lost: { label: "Not a Fit", className: "bg-[#F3F4F6] text-[#6B7280]" },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Flexible dates";
  const startLabel = start ? new Date(start).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const endLabel = end ? new Date(end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  return startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel || endLabel;
};

export default async function ManagerLeadDetailPage({ params }: { params: { id: string } }) {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  const role = normalizeRole(profile?.role || user.user_metadata?.role);
  if (!isManagerOrAdminRole(role)) {
    redirect("/");
  }

  if (role === "ADMIN") {
    redirect(`/admin/leads/${params.id}`);
  }

  const { data: lead } = await supabase
    .from("leads")
    .select(`
      *,
      trips (
        id,
        title,
        destination,
        image_url,
        start_date,
        end_date
      ),
      lead_notes (
        id,
        content,
        created_at,
        created_by
      ),
      profiles!leads_assigned_to_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("id", params.id)
    .single();

  if (!lead || lead.assigned_to !== user.id) {
    redirect("/manager/leads");
  }

  const leadData = lead as any;
  const assignedProfile = leadData.profiles || profile;
  const statusKey = (leadData.status || "new").toLowerCase();
  const status = statusMeta[statusKey] || statusMeta.new;
  const phoneDigits = (leadData.phone || "").replace(/[^0-9]/g, "");
  const whatsAppHref = phoneDigits ? `https://wa.me/${phoneDigits}` : "#";
  const callHref = leadData.phone ? `tel:${leadData.phone}` : "#";
  const emailHref = leadData.email ? `mailto:${leadData.email}` : "#";

  return (
    <section className="px-5 md:px-8 py-6 space-y-6">
          <Link href="/manager/leads" className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF5B26]">
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </Link>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center text-xl font-black uppercase shrink-0">
                      {leadData.name?.charAt(0) || "L"}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">{leadData.name}</h1>
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{leadData.phone || "No phone number"}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{leadData.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{leadData.trips?.destination || "Travel enquiry"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Lead Source</div>
                      <div className="mt-2 font-semibold text-slate-900">{leadData.source || "Website"}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Enquiry Date</div>
                      <div className="mt-2 font-semibold text-slate-900">{formatDateTime(leadData.created_at)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Assigned To</div>
                      <div className="mt-2 font-semibold text-slate-900">{assignedProfile?.full_name || "Manager"}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Last Updated</div>
                      <div className="mt-2 font-semibold text-slate-900">{formatDateTime(leadData.updated_at || leadData.created_at)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 overflow-x-auto pb-1">
                  {["Overview", "Notes", "Follow-ups", "Documents", "Messages"].map((tab, index) => (
                    <button
                      key={tab}
                      className={`pb-3 border-b-2 ${index === 0 ? "border-[#FF5B26] text-[#FF5B26]" : "border-transparent text-slate-500"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Trip Interest</h2>
                    <div className="mt-4 flex flex-col md:flex-row gap-4 md:items-center">
                      <img
                        src={leadData.trips?.image_url || "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80"}
                        alt={leadData.trips?.title || "Trip"}
                        className="w-full md:w-44 h-28 rounded-2xl object-cover"
                      />
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">{leadData.trips?.title || "General Enquiry"}</h3>
                        <p className="text-sm text-slate-600">
                          {formatDateRange(leadData.trips?.start_date, leadData.trips?.end_date)} · {leadData.group_size || 1} traveller{(leadData.group_size || 1) !== 1 ? "s" : ""}
                        </p>
                        <p className="text-sm text-slate-600">
                          Budget: {leadData.budget ? `₹${Number(leadData.budget).toLocaleString("en-IN")}` : "Not shared"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-lg font-bold text-slate-900">Requirements</h2>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      {[
                        leadData.notes,
                        leadData.group_type && `Group type: ${leadData.group_type}`,
                        leadData.preferred_month && `Preferred month: ${leadData.preferred_month}`,
                        leadData.hope_trip_feels_like && `Wants the trip to feel: ${leadData.hope_trip_feels_like}`,
                        leadData.dietary_and_accessibility && `Dietary / accessibility: ${leadData.dietary_and_accessibility}`,
                      ].filter(Boolean).length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2">
                          {[leadData.notes, leadData.group_type && `Group type: ${leadData.group_type}`, leadData.preferred_month && `Preferred month: ${leadData.preferred_month}`, leadData.hope_trip_feels_like && `Wants the trip to feel: ${leadData.hope_trip_feels_like}`, leadData.dietary_and_accessibility && `Dietary / accessibility: ${leadData.dietary_and_accessibility}`]
                            .filter(Boolean)
                            .map((item: any) => <li key={item}>{item}</li>)}
                        </ul>
                      ) : (
                        <p className="text-slate-500">No additional requirements were added.</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-bold text-slate-900">Notes</h2>
                      <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                        <Send className="w-4 h-4" />
                        Add Note
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {leadData.lead_notes?.length ? (
                        leadData.lead_notes.map((note: any) => (
                          <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                {formatDateTime(note.created_at)}
                              </span>
                              <span>By Manager</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                          No activity notes yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{leadData.phone || "No phone number"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={whatsAppHref} className="rounded-xl bg-[#ECFDF5] px-3 py-2 text-[#16A34A]">WA</a>
                      <a href={callHref} className="rounded-xl bg-[#EEF2FF] px-3 py-2 text-[#2563EB]">Call</a>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="break-all">{leadData.email}</span>
                    </div>
                    <a href={emailHref} className="rounded-xl bg-[#FFF7ED] px-3 py-2 text-[#F97316]">Email</a>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{leadData.trips?.destination || "Trip destination not set"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <a href={whatsAppHref} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">WhatsApp</a>
                  <a href={callHref} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Call Traveller</a>
                  <a href={emailHref} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Send Email</a>
                  <button className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">Add Note</button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900">Assignment</h2>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {assignedProfile?.avatar_url ? (
                      <img src={assignedProfile.avatar_url || ""} alt={assignedProfile.full_name || "Manager"} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center font-bold">
                        {(assignedProfile?.full_name || "M").charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-slate-500">Assigned To</div>
                      <div className="font-semibold text-slate-900">{assignedProfile?.full_name || "Manager"}</div>
                      <div className="text-xs text-slate-500">Manager</div>
                    </div>
                  </div>
                  <button className="rounded-xl border border-[#FF5B26] px-4 py-2 text-sm font-medium text-[#FF5B26]">Reassign</button>
                </div>
                <div className="mt-4 text-sm text-slate-600">
                  <div className="text-xs text-slate-500">Assigned On</div>
                  <div className="font-medium text-slate-900">{formatDateTime(leadData.created_at)}</div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Activity Timeline</h2>
                  <span className="text-sm font-semibold text-[#FF5B26]">View All</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Lead created</div>
                      <div className="text-xs text-slate-500">{formatDateTime(leadData.created_at)} · By System</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Status updated to {status.label}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(leadData.updated_at || leadData.created_at)} · By System</div>
                    </div>
                  </div>
                  {leadData.lead_notes?.[0] && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#F4EDFF] text-[#7C3AED] flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Latest note added</div>
                        <div className="text-xs text-slate-500">{formatDateTime(leadData.lead_notes[0].created_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
    </section>
  );
}
