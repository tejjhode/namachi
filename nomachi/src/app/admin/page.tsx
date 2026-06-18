"use client";

import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  Briefcase,
  Plane,
  MessageSquare,
  CalendarCheck,
  Sparkles,
  Loader2
} from "lucide-react";

export default function AdminDashboardPage() {
  const { stats, loading, error } = useDashboardStats();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
        Error loading dashboard stats: {error || "Unknown error"}
      </div>
    );
  }

  const getTodayDateString = () => {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const countNew = stats.funnel.new;
  const countContacted = stats.funnel.contacted;
  const countQualified = stats.funnel.qualified;
  const countNegotiating = stats.funnel.negotiating;
  const countConverted = stats.funnel.converted;
  const countLost = stats.funnel.lost;
  const totalLeads = stats.totalLeads;

  const conversionRate = totalLeads > 0 ? ((countConverted / totalLeads) * 100).toFixed(1) : "0.0";

  // Calculate dynamic Donut slices for Enquiries by Status
  const pctNew = totalLeads > 0 ? Math.round((countNew / totalLeads) * 100) : 0;
  const pctContacted = totalLeads > 0 ? Math.round((countContacted / totalLeads) * 100) : 0;
  const pctQualified = totalLeads > 0 ? Math.round((countQualified / totalLeads) * 100) : 0;
  const pctConverted = totalLeads > 0 ? Math.round((countConverted / totalLeads) * 100) : 0;
  const pctLost = totalLeads > 0 ? Math.round((countLost / totalLeads) * 100) : 0;

  // Build a conic gradient background representing the dynamic database slices
  const donutGradient = totalLeads > 0
    ? `conic-gradient(#62A1F8 0% ${pctNew}%, #5CB87A ${pctNew}% ${pctNew + pctContacted}%, #F8C04E ${pctNew + pctContacted}% ${pctNew + pctContacted + pctQualified}%, #7C5CFC ${pctNew + pctContacted + pctQualified}% ${pctNew + pctContacted + pctQualified + pctConverted}%, #E5E7EB ${pctNew + pctContacted + pctQualified + pctConverted}% 100%)`
    : "#E5E7EB";

  // SVG Funnel Taper points dynamic builder
  const maxFunnelVal = Math.max(countNew, countContacted, countQualified, countNegotiating, countConverted, 1);
  const getPolygonPoints = (index: number, val: number) => {
    const segmentHeight = 20;
    const gap = 3;
    
    const topY = index * (segmentHeight + gap);
    const bottomY = topY + segmentHeight;
    
    // Normalize width (scale between 10% and 90% of SVG canvas width = 100)
    const w = (val / maxFunnelVal) * 80 + 10;
    const wTop = w;
    const wBottom = w * 0.85; // Slight taper to give it a funnel look
    
    const x1 = 50 - wTop / 2;
    const x2 = 50 + wTop / 2;
    const x3 = 50 + wBottom / 2;
    const x4 = 50 - wBottom / 2;
    
    return `${x1},${topY} ${x2},${topY} ${x3},${bottomY} ${x4},${bottomY}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Row */}
      <div className="flex items-center justify-between text-left">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight flex items-center gap-2">
            Good morning 👋
          </h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
            Here's what's happening with Nomichi today.
          </p>
        </div>
        <button className="px-4 py-2.5 border border-[#e7e1d5] hover:bg-[#FAF8F4]/80 text-nomichi-ink/80 font-bold text-xs rounded-xl flex items-center gap-2 transition-all bg-white cursor-pointer shadow-sm">
          <Calendar className="w-4 h-4 text-nomichi-ink/45" />
          Today, {getTodayDateString()}
          <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {/* Total Leads */}
        <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Total Leads</span>
            <div className="w-8 h-8 rounded-full bg-[#EBF0FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stats.totalLeads}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${stats.trends.leadsUp ? "text-emerald-600" : "text-rose-600"}`}>
                {stats.trends.leadsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {stats.trends.leads}
              </span>
              <span className="text-[9px] font-bold text-nomichi-ink/30">vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* New Leads Today */}
        <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">New Leads Today</span>
            <div className="w-8 h-8 rounded-full bg-[#EBF5FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stats.newLeadsToday}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${stats.trends.newLeadsUp ? "text-emerald-600" : "text-rose-600"}`}>
                {stats.trends.newLeadsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {stats.trends.newLeads}
              </span>
              <span className="text-[9px] font-bold text-nomichi-ink/30">vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Active Trips */}
        <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Active Trips</span>
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stats.activeTrips}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${stats.trends.activeTripsUp ? "text-emerald-600" : "text-rose-600"}`}>
                {stats.trends.activeTripsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {stats.trends.activeTrips}
              </span>
              <span className="text-[9px] font-bold text-nomichi-ink/30">vs last month</span>
            </div>
          </div>
        </div>

        {/* Upcoming Departures */}
        <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Upcoming Departures</span>
            <div className="w-8 h-8 rounded-full bg-[#FFF1F2] text-[#F43F5E] flex items-center justify-center shrink-0">
              <Plane className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stats.upcomingDepartures}</h3>
            <div className="flex flex-col mt-2">
              <span className="text-[9px] font-bold text-nomichi-ink/40">Next Departures</span>
            </div>
          </div>
        </div>

        {/* Pending Enquiries */}
        <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Pending Enquiries</span>
            <div className="w-8 h-8 rounded-full bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stats.pendingEnquiries}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${stats.trends.pendingEnquiriesUp ? "text-emerald-600" : "text-rose-600"}`}>
                {stats.trends.pendingEnquiriesUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {stats.trends.pendingEnquiries}
              </span>
              <span className="text-[9px] font-bold text-nomichi-ink/30">vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* Confirmed Travelers */}
        <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Confirmed Travelers</span>
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stats.confirmedTravelers}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${stats.trends.confirmedTravelersUp ? "text-emerald-600" : "text-rose-600"}`}>
                {stats.trends.confirmedTravelersUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {stats.trends.confirmedTravelers}
              </span>
              <span className="text-[9px] font-bold text-nomichi-ink/30">vs last 7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lead Funnel */}
        <div className="bg-white p-6 rounded-3xl border border-[#e7e1d5]/40 shadow-sm lg:col-span-6 flex flex-col justify-between text-left h-[460px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-extrabold text-nomichi-ink">Lead Funnel</h2>
            <button className="px-3 py-1.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/75 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all bg-white cursor-pointer shadow-sm">
              This Month
              <ChevronDown className="w-3 h-3 text-nomichi-ink/40" />
            </button>
          </div>
          <div className="flex flex-row items-center justify-between flex-1 gap-8 mt-2">
            <div className="w-1/2 flex items-center justify-center">
              <svg viewBox="0 0 100 120" className="w-full max-h-[260px]">
                <polygon points={getPolygonPoints(0, countNew)} fill="#7C5CFC" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                <polygon points={getPolygonPoints(1, countContacted)} fill="#62A1F8" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                <polygon points={getPolygonPoints(2, countQualified)} fill="#5CB87A" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                <polygon points={getPolygonPoints(3, countNegotiating)} fill="#F8C04E" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                <polygon points={getPolygonPoints(4, countConverted)} fill="#F2745D" className="opacity-95 hover:opacity-100 transition-all duration-500" />
              </svg>
            </div>
            <div className="w-1/2 flex flex-col justify-center space-y-4">
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C5CFC]" /> New
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countNew}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#62A1F8]" /> Contacted
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countContacted}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5CB87A]" /> Qualified
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countQualified}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F8C04E]" /> Vibe Check Sent
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countNegotiating}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F2745D]" /> Confirmed
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countConverted}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-extrabold text-nomichi-ink/50">Conversion Rate</span>
                <span className="text-sm font-black text-emerald-600">{conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enquiries Status */}
        <div className="bg-white p-6 rounded-3xl border border-[#e7e1d5]/40 shadow-sm lg:col-span-6 flex flex-col justify-between text-left h-[460px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-extrabold text-nomichi-ink">Enquiries by Status</h2>
            <button className="px-3 py-1.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/75 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all bg-white cursor-pointer shadow-sm">
              This Month
              <ChevronDown className="w-3 h-3 text-nomichi-ink/40" />
            </button>
          </div>
          <div className="flex flex-row items-center justify-between flex-1 gap-8 mt-2">
            <div className="w-1/2 flex items-center justify-center">
              <div className="w-[170px] h-[170px] rounded-full flex items-center justify-center relative shadow-sm" style={{ background: donutGradient }}>
                <div className="w-[114px] h-[114px] rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                  <span className="text-2xl font-display font-black text-nomichi-ink leading-none">{totalLeads}</span>
                  <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-widest mt-1.5">Total</span>
                </div>
              </div>
            </div>
            <div className="w-1/2 flex flex-col justify-center space-y-4">
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#62A1F8]" /> New
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countNew} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctNew}%)</span></span>
              </div>
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5CB87A]" /> Contacted
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countContacted} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctContacted}%)</span></span>
              </div>
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F8C04E]" /> Qualified
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countQualified} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctQualified}%)</span></span>
              </div>
              <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7C5CFC]" /> Confirmed
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countConverted} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctConverted}%)</span></span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" /> Lost
                </span>
                <span className="text-xs font-extrabold text-nomichi-ink">{countLost} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctLost}%)</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
