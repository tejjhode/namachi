"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";

interface ReportFiltersProps {
  trips: { id: string; title: string }[];
  managers: { id: string; full_name: string }[];
  sources: string[];
}

export function ReportFilters({ trips, managers, sources }: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDays = searchParams.get("days") || "7";
  const currentTripId = searchParams.get("trip_id") || "all";
  const currentSource = searchParams.get("source") || "all";
  const currentManagerId = searchParams.get("manager_id") || "all";

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || (key === "days" && value === "7")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/admin/reports?${params.toString()}`);
  };

  const handleReset = () => {
    router.push("/admin/reports");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Date Range Select */}
      <div className="rounded-2xl border border-[#e7e1d5]/50 bg-[#FAF8F4]/30 px-4 py-2.5 text-left relative">
        <label className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wide block">Date Range</label>
        <div className="relative mt-1">
          <select
            value={currentDays}
            onChange={(e) => handleFilterChange("days", e.target.value)}
            className="w-full appearance-none bg-transparent border-0 text-sm font-bold text-nomichi-ink pr-8 focus:outline-none cursor-pointer"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <ChevronDown className="w-4 h-4 text-nomichi-ink/35 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Trip Select */}
      <div className="rounded-2xl border border-[#e7e1d5]/50 bg-[#FAF8F4]/30 px-4 py-2.5 text-left relative">
        <label className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wide block">Trip</label>
        <div className="relative mt-1">
          <select
            value={currentTripId}
            onChange={(e) => handleFilterChange("trip_id", e.target.value)}
            className="w-full appearance-none bg-transparent border-0 text-sm font-bold text-nomichi-ink pr-8 focus:outline-none cursor-pointer"
          >
            <option value="all">All Trips</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-nomichi-ink/35 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Source Select */}
      <div className="rounded-2xl border border-[#e7e1d5]/50 bg-[#FAF8F4]/30 px-4 py-2.5 text-left relative">
        <label className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wide block">Source</label>
        <div className="relative mt-1">
          <select
            value={currentSource}
            onChange={(e) => handleFilterChange("source", e.target.value)}
            className="w-full appearance-none bg-transparent border-0 text-sm font-bold text-nomichi-ink pr-8 focus:outline-none cursor-pointer"
          >
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s.toLowerCase()}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-nomichi-ink/35 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Manager Select */}
      <div className="rounded-2xl border border-[#e7e1d5]/50 bg-[#FAF8F4]/30 px-4 py-2.5 text-left relative">
        <label className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wide block">Manager</label>
        <div className="relative mt-1">
          <select
            value={currentManagerId}
            onChange={(e) => handleFilterChange("manager_id", e.target.value)}
            className="w-full appearance-none bg-transparent border-0 text-sm font-bold text-nomichi-ink pr-8 focus:outline-none cursor-pointer"
          >
            <option value="all">All Managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-nomichi-ink/35 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Actions Button */}
      <button
        onClick={handleReset}
        className="rounded-2xl border border-[#e7e1d5]/50 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-black text-nomichi-rust shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 h-full border-solid"
      >
        <RotateCcw className="w-4 h-4" />
        Reset Filters
      </button>
    </div>
  );
}
