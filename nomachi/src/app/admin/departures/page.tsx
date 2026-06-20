import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Plane, Users } from "lucide-react";
import Link from "next/link";


const parseDepartureStatus = (value?: string | null) => {
  if (!value) return { status: "active", code: "—", leader: "Unassigned", meeting: "—" };
  try {
    if (value.trim().startsWith("{")) {
      const parsed = JSON.parse(value);
      return {
        status: parsed.status || "active",
        code: parsed.code || "—",
        leader: parsed.leader || "Unassigned",
        meeting: parsed.meeting || "—",
      };
    }
  } catch {
    // fall through
  }
  return { status: value, code: "—", leader: "Unassigned", meeting: "—" };
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default async function AdminDeparturesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: departures, error } = await supabase
    .from("trip_departures")
    .select("id, trip_id, start_date, end_date, total_seats, seats_left, price, status, trips(id, title, destination)")
    .order("start_date", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (departures || []) as any[];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Departures</h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
            Departure schedules and seat availability from the database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/departures/new"
            className="px-4 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5 no-underline"
          >
            Create Departure
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d5]/60 bg-white px-4 py-2 text-xs font-bold text-nomichi-ink/70">
            <Plane className="h-4 w-4 text-[#FF5B26]" />
            {rows.length} departures
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Code</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Seats</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Leader</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Meeting</th>
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e1d5]/20">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                    No departures active.
                  </td>
                </tr>
              ) : (
                rows.map((departure) => {
                  const meta = parseDepartureStatus(departure.status);
                  const seatsLeft = departure.seats_left ?? departure.total_seats ?? 0;
                  const pctLeft = departure.total_seats ? Math.round((seatsLeft / departure.total_seats) * 100) : 0;

                  return (
                    <tr key={departure.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-nomichi-ink">{meta.code}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-nomichi-ink">{departure.trips?.title || "Unknown trip"}</div>
                          <div className="flex items-center gap-2 text-[11px] text-nomichi-ink/45">
                            <MapPin className="h-3.5 w-3.5" />
                            {departure.trips?.destination || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-nomichi-ink/75">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-nomichi-ink/30" />
                          {formatDate(departure.start_date)}
                          {departure.end_date ? ` - ${formatDate(departure.end_date)}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d5]/60 bg-[#FAF8F4] px-3 py-1 text-[11px] font-bold text-nomichi-ink/70">
                            <Users className="h-3.5 w-3.5 text-[#FF5B26]" />
                            {seatsLeft} / {departure.total_seats || "—"}
                          </div>
                          <div className="text-[11px] text-nomichi-ink/40">{pctLeft}% seats left</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-nomichi-ink/75">{meta.leader}</td>
                      <td className="px-6 py-4 text-nomichi-ink/75">{meta.meeting}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${
                          meta.status === "active"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-[#e7e1d5]/60 bg-[#FAF8F4] text-nomichi-ink/70"
                        }`}>
                          {meta.status === "active" ? "Active" : meta.status}
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
