import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarCheck, CheckCircle2, Clock3, Mail, MapPin, Users } from "lucide-react";

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

export default async function AdminBookingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookings, error } = await supabase
    .from("leads")
    .select("id, name, email, phone, status, source, group_size, created_at, enquiry_id, trips(id, title, destination, start_date, end_date)")
    .in("status", ["converted", "confirmed"])
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (bookings || []) as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Bookings</h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
            Confirmed enquiries and booking records from the database.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d5]/60 bg-white px-4 py-2 text-xs font-bold text-nomichi-ink/70">
          <CalendarCheck className="h-4 w-4 text-[#FF5B26]" />
          {rows.length} records
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Client</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Group</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Booked On</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e1d5]/20">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                rows.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-nomichi-ink">{booking.name || "Unnamed traveller"}</div>
                        <div className="flex items-center gap-2 text-[11px] text-nomichi-ink/45">
                          <Mail className="h-3.5 w-3.5" />
                          {booking.email || "—"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-nomichi-ink">{booking.trips?.title || "Unknown trip"}</div>
                        <div className="flex items-center gap-2 text-[11px] text-nomichi-ink/45">
                          <MapPin className="h-3.5 w-3.5" />
                          {booking.trips?.destination || "—"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-nomichi-ink/75">{booking.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d5]/60 bg-[#FAF8F4] px-3 py-1 text-[11px] font-bold text-nomichi-ink/70">
                        <Users className="h-3.5 w-3.5 text-[#FF5B26]" />
                        {booking.group_size || 1} traveller{(booking.group_size || 1) !== 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-nomichi-ink/75">{formatDateTime(booking.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirmed
                      </span>
                    </td>
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
