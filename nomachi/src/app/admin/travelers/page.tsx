import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Mail, MapPin, Phone, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default async function AdminTravelersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: travelers, error } = await supabase
    .from("leads")
    .select("id, name, email, phone, status, source, group_size, created_at, enquiry_id, trips(id, title, destination, start_date, end_date)")
    .eq("status", "converted")
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
            Confirmed travelers pulled from converted leads.
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
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Email</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Group Size</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Enquiry ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e1d5]/20">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                    No confirmed travelers found.
                  </td>
                </tr>
              ) : (
                rows.map((traveler) => (
                  <tr key={traveler.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-nomichi-ink">{traveler.name || "Unnamed traveller"}</td>
                    <td className="px-6 py-4 text-nomichi-ink/85">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-nomichi-ink/30" />
                        {traveler.email || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-nomichi-ink/75">{traveler.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-nomichi-ink">{traveler.trips?.title || "Unknown trip"}</div>
                        <div className="flex items-center gap-2 text-[11px] text-nomichi-ink/45">
                          <MapPin className="h-3.5 w-3.5" />
                          {traveler.trips?.destination || "—"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d5]/60 bg-[#FAF8F4] px-3 py-1 text-[11px] font-bold text-nomichi-ink/70">
                        <Users className="h-3.5 w-3.5 text-[#FF5B26]" />
                        {traveler.group_size || 1} traveller{(traveler.group_size || 1) !== 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-nomichi-ink/75">{traveler.enquiry_id || traveler.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
