import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreditCard, TrendingUp, Wallet } from "lucide-react";

export default async function AdminReportsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch all bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("price, payment_status, id");

  // 2. Fetch all completed payments
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, payment_method, status, created_at, bookings(id, trips(title))")
    .eq("status", "completed");

  if (bookingsError || paymentsError) {
    throw bookingsError || paymentsError;
  }

  const allBookings = bookings || [];
  const allPayments = payments || [];

  // Metrics calculations
  const totalBookingsCount = allBookings.length;
  const totalPotentialRevenue = allBookings.reduce((sum, b) => sum + Number(b.price), 0);
  const totalRealizedRevenue = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOutstandingBalance = Math.max(0, totalPotentialRevenue - totalRealizedRevenue);

  // Payments by method
  const methodMap: Record<string, number> = {
    upi: 0,
    card: 0,
    bank_transfer: 0,
    cash: 0,
    other: 0
  };
  allPayments.forEach(p => {
    const method = (p.payment_method || "other").toLowerCase();
    if (methodMap[method] !== undefined) {
      methodMap[method] += Number(p.amount);
    } else {
      methodMap.other += Number(p.amount);
    }
  });

  const methodPercentages = Object.entries(methodMap).map(([method, amount]) => {
    const percentage = totalRealizedRevenue > 0 ? (amount / totalRealizedRevenue) * 100 : 0;
    return { method, amount, percentage };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Revenue & Financial Analytics</h1>
        <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
          Real-time financial audits, cash realizations, and outstanding traveler collections.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Realized Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-[#e7e1d5]/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block">Realized Revenue</span>
              <span className="text-3xl font-display font-extrabold text-[#FF5B26]">
                ₹{totalRealizedRevenue.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#FFEFEA] flex items-center justify-center text-[#FF5B26]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#e7e1d5]/30 text-[11px] text-nomichi-ink/40 font-semibold">
            Cash successfully collected.
          </div>
        </div>

        {/* Total Booked Value */}
        <div className="bg-white rounded-3xl p-6 border border-[#e7e1d5]/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block">Total Booked Value</span>
              <span className="text-3xl font-display font-extrabold text-nomichi-ink">
                ₹{totalPotentialRevenue.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/60">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#e7e1d5]/30 text-[11px] text-nomichi-ink/40 font-semibold">
            Value of all {totalBookingsCount} bookings combined.
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-3xl p-6 border border-[#e7e1d5]/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block">Outstanding Collections</span>
              <span className="text-3xl font-display font-extrabold text-nomichi-ink/65">
                ₹{totalOutstandingBalance.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-nomichi-ink/35">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#e7e1d5]/30 text-[11px] text-nomichi-ink/40 font-semibold">
            Pending traveler collections.
          </div>
        </div>
      </div>

      {/* Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Realization Progress */}
        <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-display font-extrabold text-nomichi-ink">Revenue Realization</h2>
            <p className="text-[11px] text-nomichi-ink/45 mt-0.5">Realized revenue vs outstanding collections.</p>
          </div>
          <div className="space-y-4">
            <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${totalPotentialRevenue > 0 ? (totalRealizedRevenue / totalPotentialRevenue) * 100 : 0}%` }}
                className="bg-[#FF5B26]"
              />
              <div 
                style={{ width: `${totalPotentialRevenue > 0 ? (totalOutstandingBalance / totalPotentialRevenue) * 100 : 0}%` }}
                className="bg-[#FAF8F4] border-l border-white"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-nomichi-ink/65">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#FF5B26] rounded-full" />
                <span>Realized: {totalPotentialRevenue > 0 ? ((totalRealizedRevenue / totalPotentialRevenue) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-nomichi-sand/30 rounded-full" />
                <span>Outstanding: {totalPotentialRevenue > 0 ? ((totalOutstandingBalance / totalPotentialRevenue) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-display font-extrabold text-nomichi-ink">Payment Methods</h2>
            <p className="text-[11px] text-nomichi-ink/45 mt-0.5">Realized value distribution by payment mode.</p>
          </div>
          <div className="space-y-3.5">
            {methodPercentages.map(({ method, amount, percentage }) => {
              const labelMap: Record<string, string> = {
                upi: "UPI",
                card: "Credit / Debit Card",
                bank_transfer: "Bank Transfer / NEFT",
                cash: "Cash",
                other: "Other Modes"
              };
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-nomichi-ink">
                    <span>{labelMap[method] || method.toUpperCase()}</span>
                    <span>₹{amount.toLocaleString("en-IN")} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-[#FF5B26]/80 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
