import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Target, TrendingUp } from "lucide-react";

export default async function ManagerReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch only leads assigned to this manager (RLS blocks leads of other managers automatically)
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, status");

  if (error) {
    throw error;
  }

  const allLeads = leads || [];
  const totalLeadsCount = allLeads.length;

  // Funnel stage definitions
  const stages = {
    new: 0,
    contacted: 0,
    qualified: 0,
    negotiating: 0,
    converted: 0,
    lost: 0
  };

  allLeads.forEach(l => {
    const status = (l.status || "new").toLowerCase();
    if (stages[status as keyof typeof stages] !== undefined) {
      stages[status as keyof typeof stages]++;
    } else if (status === "confirmed" || status === "vibe check sent" || status === "vibe check") {
      stages.negotiating++;
    } else {
      stages.new++;
    }
  });

  const convertedCount = stages.converted;
  const conversionRate = totalLeadsCount > 0 ? (convertedCount / totalLeadsCount) * 100 : 0;

  const funnelStages = [
    { label: "New Lead", count: stages.new, color: "bg-gray-400" },
    { label: "Contacted", count: stages.contacted, color: "bg-blue-400" },
    { label: "Qualified", count: stages.qualified, color: "bg-amber-400" },
    { label: "Negotiating / Vibe Check", count: stages.negotiating, color: "bg-indigo-400" },
    { label: "Converted (Booking Confirmed)", count: stages.converted, color: "bg-[#FF5B26]" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Pipeline Conversion Reports</h1>
        <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
          Track conversions, stage leakage, and operational funnel distributions.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Leads */}
        <div className="bg-white rounded-3xl p-6 border border-[#e7e1d5]/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block">Assigned Leads</span>
              <span className="text-3xl font-display font-extrabold text-nomichi-ink">
                {totalLeadsCount}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/65">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#e7e1d5]/30 text-[11px] text-nomichi-ink/40 font-semibold">
            Total traveler contacts managed by you.
          </div>
        </div>

        {/* Converted Bookings */}
        <div className="bg-white rounded-3xl p-6 border border-[#e7e1d5]/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block">Converted Bookings</span>
              <span className="text-3xl font-display font-extrabold text-[#FF5B26]">
                {convertedCount}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#FFEFEA] flex items-center justify-center text-[#FF5B26]">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#e7e1d5]/30 text-[11px] text-nomichi-ink/40 font-semibold">
            Leads advanced to confirmed bookings.
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-3xl p-6 border border-[#e7e1d5]/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block">Conversion Rate</span>
              <span className="text-3xl font-display font-extrabold text-nomichi-ink">
                {conversionRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/60">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#e7e1d5]/30 text-[11px] text-nomichi-ink/40 font-semibold">
            Percentage of leads converted.
          </div>
        </div>
      </div>

      {/* Funnel Section */}
      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-base font-display font-extrabold text-nomichi-ink">Sales Funnel Analysis</h2>
          <p className="text-[11px] text-nomichi-ink/45 mt-0.5">Assigned lead counts across pipeline stages.</p>
        </div>
        <div className="space-y-4">
          {funnelStages.map(({ label, count, color }) => {
            const pct = totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0;
            return (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-nomichi-ink">
                  <span>{label}</span>
                  <span>{count} leads ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${pct}%` }}
                    className={`h-full ${color} rounded-full`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
