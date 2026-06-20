import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail, MapPin, Phone, Users, CheckCircle2, Clock3, AlertTriangle, FileText } from "lucide-react";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default async function AdminTravelersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: travelers, error } = await supabase
    .from("travelers")
    .select(`
      id,
      full_name,
      email,
      phone,
      visa_status,
      passport_number,
      passport_expiry,
      created_at,
      bookings(
        id,
        trips(
          id,
          title,
          destination
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (travelers || []) as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Travelers</h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
            Confirmed travelers and their visa/passport status from the database.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d5]/60 bg-white px-4 py-2 text-xs font-bold text-nomichi-ink/70">
          <Users className="h-4 w-4 text-[#FF5B26]" />
          {rows.length} travelers
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Name</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Passport Details</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Visa Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e1d5]/20">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                    No travelers found.
                  </td>
                </tr>
              ) : (
                rows.map((traveler) => {
                  let visaBadgeClass = "border-nomichi-ink/20 bg-gray-50 text-nomichi-ink/70";
                  let visaStatusText = "Not Required";
                  let VisaIcon = CheckCircle2;

                  if (traveler.visa_status === "approved") {
                    visaBadgeClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
                    visaStatusText = "Approved";
                    VisaIcon = CheckCircle2;
                  } else if (traveler.visa_status === "pending") {
                    visaBadgeClass = "border-amber-200 bg-amber-50 text-amber-700";
                    visaStatusText = "Pending";
                    VisaIcon = Clock3;
                  } else if (traveler.visa_status === "rejected") {
                    visaBadgeClass = "border-red-200 bg-red-50 text-red-700";
                    visaStatusText = "Rejected";
                    VisaIcon = AlertTriangle;
                  }

                  const tripTitle = traveler.bookings?.trips?.title || "—";
                  const tripDestination = traveler.bookings?.trips?.destination || "—";

                  return (
                    <tr key={traveler.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-nomichi-ink">{traveler.full_name}</td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-2 text-nomichi-ink/85">
                          <Mail className="h-3.5 w-3.5 text-nomichi-ink/30" />
                          {traveler.email || "—"}
                        </div>
                        <div className="flex items-center gap-2 text-nomichi-ink/85">
                          <Phone className="h-3.5 w-3.5 text-nomichi-ink/30" />
                          {traveler.phone || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-nomichi-ink">{tripTitle}</div>
                          <div className="flex items-center gap-2 text-[11px] text-nomichi-ink/45">
                            <MapPin className="h-3.5 w-3.5" />
                            {tripDestination}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1 text-nomichi-ink/75">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-nomichi-ink/30" />
                          <span>No: {traveler.passport_number || "—"}</span>
                        </div>
                        {traveler.passport_expiry && (
                          <div className="text-[10px] text-nomichi-ink/45 ml-5">
                            Expiry: {formatDateTime(traveler.passport_expiry)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${visaBadgeClass}`}>
                          <VisaIcon className="h-3.5 w-3.5" />
                          {visaStatusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
