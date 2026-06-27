"use client";

import { useTrips } from "@/hooks/useTrips";
import { useLeads } from "@/hooks/useLeads";
import { useUsers } from "@/hooks/useUsers";
import { tripService } from "@/services/trip.service";
import {
  Loader2,
  Plus,
  Calendar,
  MapPin,
  Search,
  ChevronDown,
  SlidersHorizontal,
  List,
  Grid,
  MoreVertical,
  Compass,
  Users,
  CheckCircle,
  XCircle,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AllTripsPage() {
  const router = useRouter();
  const {
    trips,
    loading: loadingTrips,
    error: errorTrips,
    filters,
    updateFilters,
    archiveTrip,
    restoreTrip,
    openForEnquiries,
    duplicateTrip,
    deleteTrip,
    refresh: refreshTrips
  } = useTrips();

  const { leads, loading: loadingLeads } = useLeads();
  const { users } = useUsers();

  const [catalogViewMode, setCatalogViewMode] = useState<"list" | "grid">("list");
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null);
  const [activeActionDropdownPosition, setActiveActionDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [activeTripForActivation, setActiveTripForActivation] = useState<any | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [leaderDropdownOpen, setLeaderDropdownOpen] = useState(false);

  const [activationForm, setActivationForm] = useState({
    startDate: "",
    endDate: "",
    totalSeats: "12",
    price: "",
    tripLeaderId: "",
    meetingPoint: "",
    notes: "",
  });

  // Close dropdown when clicking outside any dropdown wrapper
  useEffect(() => {
    if (!activeActionDropdownId) return;
    
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown-wrapper]')) {
        setActiveActionDropdownId(null);
        setActiveActionDropdownPosition(null);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeActionDropdownId]);

  const getSubtitle = (trip: any) => {
    if (trip.title.includes("Tokyo")) return "City lights, culture & mountain views";
    if (trip.title.includes("Swiss") || trip.title.includes("Alps")) return "Scenic rail journeys & alpine villages";
    if (trip.title.includes("Bali")) return "Spirituality, beaches & culture";
    if (trip.title.includes("Iceland")) return "Chase the aurora in Iceland";
    if (trip.title.includes("Ladakh")) return "High passes, valleys & monasteries";
    if (trip.title.includes("Morocco")) return "Deserts, medinas & local life";
    return trip.description ? (trip.description.split('.')[0] + '.') : "A curated journey by Nomichi.";
  };

  const getEnquiryDisplay = (trip: any, tripLeads: any[]) => {
    const count = tripLeads.length;
    if (count === 0) return { count: 0, label: "—", className: "text-nomichi-ink/40" };
    
    const s = trip.status?.toLowerCase();
    if (s === "completed") {
      return { count, label: "Completed", className: "text-nomichi-ink/50" };
    }
    if (s === "active") {
      const confirmedCount = tripLeads.filter(l => ["converted", "confirmed"].includes(l.status?.toLowerCase())).length;
      if (confirmedCount > 0) {
        return { count: confirmedCount, label: "Confirmed", className: "text-emerald-600 font-bold" };
      }
      const qualifiedCount = tripLeads.filter(l => ["qualified", "negotiating", "vibe_check_sent"].includes(l.status?.toLowerCase())).length;
      return { count: qualifiedCount || count, label: "Qualified", className: "text-emerald-600 font-bold" };
    }
    return { count, label: "Interested", className: "text-nomichi-ink/60" };
  };

  const formatActiveDates = (startStr: string, endStr: string) => {
    if (!startStr) return "TBD";
    const start = new Date(startStr);
    const startDay = start.getDate();
    const startMonth = start.toLocaleDateString("en-IN", { month: "short" });
    if (!endStr) return `${startDay} ${startMonth}`;
    const end = new Date(endStr);
    const endDay = end.getDate();
    const endMonth = end.toLocaleDateString("en-IN", { month: "short" });
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}`;
    } else {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
  };

  const handleOpenActivateModal = (trip: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveActionDropdownId(null);
    setActiveTripForActivation(trip);
    setActivationForm({
      startDate: "",
      endDate: "",
      totalSeats: "12",
      price: trip.price ? String(trip.price) : "",
      tripLeaderId: "",
      meetingPoint: "",
      notes: "",
    });
  };

  const handleActivateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTripForActivation) return;
    try {
      setSubmitLoading(true);
      setError("");
      setSuccess("");

      const { startDate, endDate, totalSeats, price, tripLeaderId, meetingPoint, notes } = activationForm;
      if (!startDate || !totalSeats) {
        throw new Error("Please fill in all required fields (Start Date and Total Seats).");
      }
      if (!tripLeaderId) {
        throw new Error("Please assign a trip manager before activating the trip.");
      }

      const selectedLeader = users.find((p) => p.id === tripLeaderId);
      if (!selectedLeader) {
        throw new Error("Selected trip manager could not be found.");
      }

      await tripService.activateTrip(activeTripForActivation, {
        startDate,
        endDate: endDate || undefined,
        totalSeats: parseInt(totalSeats) || 12,
        price: parseFloat(price) || activeTripForActivation.price || 0,
        tripLeaderId: tripLeaderId || undefined,
        tripLeader: selectedLeader?.full_name || selectedLeader?.email || undefined,
        meetingPoint: meetingPoint || undefined,
        notes: notes || undefined,
      });

      setSuccess(`Trip "${activeTripForActivation.title}" successfully activated!`);
      setActiveTripForActivation(null);
      refreshTrips();
    } catch (err: any) {
      setError(err.message || "Failed to activate trip.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleActionDropdown = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeActionDropdownId === tripId) {
      setActiveActionDropdownId(null);
      setActiveActionDropdownPosition(null);
      return;
    }

    setActiveActionDropdownId(tripId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const estimatedMenuHeight = 180;
    const openAbove = rect.bottom + estimatedMenuHeight + 12 > window.innerHeight && rect.top > estimatedMenuHeight + 12;

    setActiveActionDropdownPosition({
      top: openAbove ? rect.top - estimatedMenuHeight - 8 : rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  const handleDuplicate = async (trip: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveActionDropdownId(null);
    try {
      setSubmitLoading(true);
      await duplicateTrip(trip);
      setSuccess(`Trip duplicated successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to duplicate trip.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveActionDropdownId(null);
    if (!window.confirm("Are you sure you want to delete this trip?")) return;
    try {
      setSubmitLoading(true);
      await deleteTrip(tripId);
      setSuccess("Trip deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete trip.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Get unique lists for filter select options
  const uniqueDestinations = Array.from(new Set(trips.map((t) => t.destination).filter(Boolean)));
  const uniqueStyles = Array.from(
    new Set(
      trips
        .flatMap((t) => (t.trip_style ? t.trip_style.split(",") : []))
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );

  const loading = loadingTrips || loadingLeads;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* Header section with title and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">All Trips</h1>
          <p className="text-xs text-nomichi-ink/50 font-semibold mt-0.5">Manage all your trips and their details.</p>
        </div>
        <Link
          href="/admin/trips/new"
          className="px-4 py-2.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all border-0 flex items-center gap-1.5 cursor-pointer no-underline"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
          Add New Trip
        </Link>
      </div>

      {/* Status Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { id: "all", label: "All Trips", count: trips.length },
          { id: "draft", label: "Draft", count: trips.filter((t) => t.status?.toLowerCase() === "draft").length },
          { id: "open", label: "Open For Enquiries", count: trips.filter((t) => ["open", "open for enquiries", "open for inquiry"].includes(t.status?.toLowerCase() || "")).length },
          { id: "active", label: "Active", count: trips.filter((t) => t.status?.toLowerCase() === "active").length },
          { id: "completed", label: "Completed", count: trips.filter((t) => t.status?.toLowerCase() === "completed").length },
          { id: "archived", label: "Archived", count: trips.filter((t) => t.status?.toLowerCase() === "archived").length },
        ].map((tab) => {
          const isActive = (filters.status || "all") === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => updateFilters({ status: tab.id })}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? "bg-white border-[#FF5B26] text-[#FF5B26] shadow-2xs"
                  : "bg-[#FAF8F4]/80 border-transparent text-nomichi-ink/50 hover:bg-[#e7e1d5]/30 hover:text-nomichi-ink"
              }`}
            >
              <span>{tab.label}</span>
              {tab.id !== "all" && (
                <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-md ${
                  isActive ? "bg-[#FFEFEA] text-[#FF5B26]" : "bg-[#e7e1d5]/40 text-nomichi-ink/40"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search, Filters, and Sorting Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative w-64">
            <input
              type="text"
              value={filters.search || ""}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Search trips or destinations..."
              className="w-full pl-4 pr-9.5 py-2.5 bg-white border border-[#e7e1d5] rounded-xl text-xs font-semibold placeholder-nomichi-ink/30 text-nomichi-ink focus:outline-none focus:border-[#FF5B26]"
            />
            <Search className="w-4 h-4 text-nomichi-ink/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Destination Dropdown */}
          <div className="relative">
            <select
              value={filters.destination || "all"}
              onChange={(e) => updateFilters({ destination: e.target.value })}
              className="appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
            >
              <option value="all">All Destinations</option>
              {uniqueDestinations.map((dest: string) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Trip Style Dropdown */}
          <div className="relative">
            <select
              value={filters.tripStyle || "all"}
              onChange={(e) => updateFilters({ tripStyle: e.target.value })}
              className="appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
            >
              <option value="all">All Trip Styles</option>
              {uniqueStyles.map((style: string) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Difficulty Dropdown */}
          <div className="relative">
            <select
              value={filters.difficulty || "all"}
              onChange={(e) => updateFilters({ difficulty: e.target.value })}
              className="appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
            >
              <option value="all">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Challenging">Challenging</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Sort & View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-1 bg-white border border-[#e7e1d5] px-3.5 py-2.5 rounded-xl text-xs cursor-pointer focus-within:border-[#FF5B26]">
            <span className="text-nomichi-ink/40 font-semibold">Sort by:</span>
            <select
              value={filters.sortBy || "newest"}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="appearance-none bg-transparent border-0 pr-6 text-xs font-bold text-nomichi-ink focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center border border-[#e7e1d5] rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setCatalogViewMode("list")}
              className={`p-2.5 transition-all border-0 cursor-pointer ${
                catalogViewMode === "list"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/40 hover:bg-[#FAF8F4]"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCatalogViewMode("grid")}
              className={`p-2.5 transition-all border-0 border-l border-[#e7e1d5]/50 cursor-pointer ${
                catalogViewMode === "grid"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/40 hover:bg-[#FAF8F4]"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5">
          <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      {/* Trips Listing Display Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
        </div>
      ) : catalogViewMode === "list" ? (
        /* LIST VIEW MODE */
        <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Trip</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Destination</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Status</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Duration / Dates</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Enquiries / Seats</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Created On</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e1d5]/20">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                      No trips match your filters.
                    </td>
                  </tr>
                ) : (
                  trips.map((trip) => {
                    const tripLeads = leads.filter((l) => l.trip_id === trip.id);
                    const enqInfo = getEnquiryDisplay(trip, tripLeads);
                    
                    const createdOnStr = trip.created_at
                      ? new Date(trip.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })
                      : "28 May 2025";

                    const stylesList = trip.trip_style ? trip.trip_style.split(",").map((s: string) => s.trim()) : [];
                    const mainStyle = stylesList[0] || "Custom Trip";

                    const diff = trip.difficulty?.toLowerCase();
                    const filledBars = diff === "easy" ? 1 : diff === "moderate" ? 2 : diff === "challenging" ? 3 : 1;

                    return (
                      <tr
                        key={trip.id}
                        onClick={() => router.push(`/admin/trips/${trip.id}/overview`)}
                        className="hover:bg-[#FAF8F4]/30 transition-colors cursor-pointer"
                      >
                        {/* TRIP TITLE & STYLE INFO */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-14 rounded-xl border border-[#e7e1d5]/40 overflow-hidden shrink-0 shadow-sm">
                              <img src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"} className="w-full h-full object-cover" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-nomichi-ink text-sm leading-tight">{trip.title}</span>
                              </div>
                              <p className="text-[10px] text-nomichi-ink/50 font-semibold max-w-[240px] truncate leading-normal">
                                {getSubtitle(trip)}
                              </p>
                              <div className="flex items-center gap-2.5 pt-0.5">
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-nomichi-ink/55 uppercase bg-[#FAF8F4] border border-[#e7e1d5]/50 px-2 py-0.5 rounded-lg shadow-2xs">
                                  <Compass className="w-2.5 h-2.5 text-[#FF5B26]" />
                                  {mainStyle}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-nomichi-ink/50">
                                  <span className="flex items-end gap-0.5 h-2 w-3">
                                    <span className={`w-0.5 h-1 rounded-xs ${filledBars >= 1 ? "bg-[#FF5B26]" : "bg-[#e7e1d5]"}`}></span>
                                    <span className={`w-0.5 h-1.5 rounded-xs ${filledBars >= 2 ? "bg-[#FF5B26]" : "bg-[#e7e1d5]"}`}></span>
                                    <span className={`w-0.5 h-2.5 rounded-xs ${filledBars >= 3 ? "bg-[#FF5B26]" : "bg-[#e7e1d5]"}`}></span>
                                  </span>
                                  {trip.difficulty || "Easy"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* DESTINATION */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-nomichi-ink/75 font-semibold text-xs">
                            <MapPin className="w-4.5 h-4.5 text-nomichi-ink/30 shrink-0" />
                            <span>{trip.destination}</span>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap inline-block ${
                            trip.status?.toLowerCase() === "draft"
                              ? "bg-gray-100 text-gray-500 border-gray-200"
                              : trip.status?.toLowerCase() === "open" || trip.status?.toLowerCase() === "open for enquiries"
                              ? "bg-[#EBF3FF] text-[#1E6BFF] border-[#D0E2FF]"
                              : trip.status?.toLowerCase() === "active"
                              ? "bg-[#E6F9F0] text-[#00A854] border-[#B3F5D3]"
                              : trip.status?.toLowerCase() === "completed"
                              ? "bg-[#F5F0FF] text-[#8C52FF] border-[#E8DBFF]"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>
                            {trip.status?.toLowerCase() === "open" || trip.status?.toLowerCase() === "open for enquiries"
                              ? "Open For Enquiries"
                              : trip.status
                              ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1).toLowerCase()
                              : ""}
                          </span>
                        </td>

                        {/* DURATION / DATES */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-nomichi-ink/75 font-semibold text-xs">
                            <Calendar className="w-4 h-4 text-nomichi-ink/30" />
                            <span>
                              {trip.status?.toLowerCase() === "active"
                                ? formatActiveDates(trip.start_date!, trip.end_date!)
                                : (trip.duration || "Flexible")}
                            </span>
                          </div>
                        </td>

                        {/* ENQUIRIES / SEATS */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-nomichi-ink text-sm">
                              <Users className="w-4 h-4 text-nomichi-ink/30" />
                              <span>
                                {trip.status?.toLowerCase() === "active"
                                  ? `${trip.seats_left ?? trip.total_seats ?? 12} Left`
                                  : enqInfo.count}
                              </span>
                            </div>
                            <p className={`text-[10px] font-semibold ${
                              trip.status?.toLowerCase() === "active"
                                ? "text-nomichi-ink/40"
                                : enqInfo.label === "Qualified" || enqInfo.label === "Confirmed"
                                ? "text-[#00A854] font-bold"
                                : "text-nomichi-ink/40"
                            }`}>
                              {trip.status?.toLowerCase() === "active" ? "Seats Left" : enqInfo.label}
                            </p>
                          </div>
                        </td>

                        {/* CREATED ON */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-left text-xs">
                            <p className="font-extrabold text-nomichi-ink leading-tight">{createdOnStr}</p>
                          </div>
                        </td>

                        {/* ACTIONS DROPDOWN */}
                        <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div data-dropdown-wrapper className="inline-block text-left">
                            <button
                              onClick={(e) => toggleActionDropdown(trip.id, e)}
                              className="p-1.5 hover:bg-[#FAF8F4] rounded-lg transition-colors border-0 bg-transparent text-nomichi-ink/50 hover:text-nomichi-ink cursor-pointer"
                            >
                              <MoreVertical className="w-4.5 h-4.5" />
                            </button>

                            {activeActionDropdownId === trip.id && activeActionDropdownPosition && (
                              <div
                                className="fixed z-50 w-44 bg-white border border-[#e7e1d5]/60 rounded-2xl shadow-xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col text-left"
                                style={{
                                  top: activeActionDropdownPosition.top,
                                  right: activeActionDropdownPosition.right,
                                }}
                              >
                              <a
                                  href={`/admin/trips/${trip.id}/overview`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-nomichi-ink hover:bg-[#FAF8F4] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left no-underline"
                                >
                                  👁 View
                                </a>
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/admin/trips/${trip.id}`); }}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-nomichi-ink hover:bg-[#FAF8F4] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={(e) => handleOpenActivateModal(trip, e)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#FF5B26] hover:bg-[#FFEFEA] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
                                >
                                  🚀 Activate
                                </button>
                                <div className="border-t border-[#e7e1d5]/30 my-1"></div>
                                <button
                                  onClick={(e) => handleDelete(trip.id, e)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW MODE */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.length === 0 ? (
            <div className="col-span-full py-16 bg-white rounded-3xl border border-[#e7e1d5]/40 text-center text-nomichi-ink/40 font-semibold shadow-sm">
              No trips match your filters.
            </div>
          ) : (
            trips.map((trip) => {
              const tripLeads = leads.filter((l) => l.trip_id === trip.id);
              const enqInfo = getEnquiryDisplay(trip, tripLeads);
              const stylesList = trip.trip_style ? trip.trip_style.split(",").map((s: string) => s.trim()) : [];
              const mainStyle = stylesList[0] || "Custom Trip";

              return (
                <div
                  key={trip.id}
                  onClick={() => router.push(`/admin/trips/${trip.id}/overview`)}
                  className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all cursor-pointer relative"
                >
                  <div className="h-44 w-full relative">
                    <img src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4" data-dropdown-wrapper onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleActionDropdown(trip.id, e)}
                        className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-xs border-0 text-nomichi-ink/50 hover:text-nomichi-ink cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeActionDropdownId === trip.id && activeActionDropdownPosition && (
                        <div
                          className="fixed z-50 w-44 bg-white border border-[#e7e1d5]/60 rounded-2xl shadow-xl p-1.5 flex flex-col text-left"
                          style={{
                            top: activeActionDropdownPosition.top,
                            right: activeActionDropdownPosition.right,
                          }}
                        >
                          <a
                             href={`/admin/trips/${trip.id}/overview`}
                             onClick={(e) => e.stopPropagation()}
                             className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-nomichi-ink hover:bg-[#FAF8F4] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left no-underline"
                           >
                             👁 View
                           </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/trips/${trip.id}`); }}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-nomichi-ink hover:bg-[#FAF8F4] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
                          >
                             ✏️ Edit
                           </button>
                           <button
                             onClick={(e) => handleOpenActivateModal(trip, e)}
                             className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#FF5B26] hover:bg-[#FFEFEA] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
                           >
                             🚀 Activate
                           </button>
                           <div className="border-t border-[#e7e1d5]/30 my-1"></div>
                           <button
                             onClick={(e) => handleDelete(trip.id, e)}
                             className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
                           >
                             🗑️ Delete
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#FF5B26] tracking-wider">{mainStyle}</span>
                        <span className="px-2 py-0.5 rounded bg-[#FAF8F4] border border-[#e7e1d5]/30 text-[9px] font-extrabold text-nomichi-ink/50 uppercase">
                          {trip.status}
                        </span>
                      </div>
                      <h3 className="text-base font-display font-extrabold text-nomichi-ink leading-tight">{trip.title}</h3>
                      <p className="text-xs text-nomichi-ink/50 font-semibold">{trip.destination}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#e7e1d5]/20 pt-4 text-xs font-bold text-nomichi-ink/75">
                      <span>₹{(trip.price || 0).toLocaleString("en-IN")}</span>
                      <span>{trip.duration || "Flexible"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===================== ACTIVATE TRIP MODAL ===================== */}
      {activeTripForActivation && (() => {
        const isImageOk = !!activeTripForActivation.image_url;
        const isDescriptionOk = !!activeTripForActivation.description;
        const isItineraryOk = !!(activeTripForActivation.itinerary && activeTripForActivation.itinerary.length > 0);
        const isBrochureOk = !!activeTripForActivation.brochure_url;
        const isPriceOk = !!(activeTripForActivation.price && activeTripForActivation.price > 0);
        const isHighlightsOk = !!(activeTripForActivation.highlights && activeTripForActivation.highlights.length > 0);
        const isManagerOk = !!activationForm.tripLeaderId;

        const isReadyToActivate = isImageOk && isDescriptionOk && isItineraryOk && isBrochureOk && isPriceOk && isHighlightsOk && isManagerOk;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-[#1A1816]/60 backdrop-blur-md transition-opacity"
              onClick={() => setActiveTripForActivation(null)}
            />
            
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/50 shadow-2xl overflow-hidden relative w-full max-w-3xl z-10 animate-in zoom-in-95 duration-200 text-left">
              <div className="px-6 py-5 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]">
                <div>
                  <h3 className="text-base font-display font-extrabold text-nomichi-ink uppercase tracking-wider">Activate Departure</h3>
                  <p className="text-[10px] text-nomichi-ink/50 font-semibold mt-0.5">{activeTripForActivation.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTripForActivation(null)}
                  className="w-8 h-8 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center cursor-pointer text-nomichi-ink/50 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-4 bg-[#EBF3FF] border-b border-[#D0E2FF] flex items-center gap-2.5 text-[#1E6BFF] text-xs font-semibold">
                <Compass className="w-4 h-4 shrink-0 animate-pulse" />
                <span>This trip will become bookable and visible with confirmed travel dates.</span>
              </div>

              <form onSubmit={handleActivateTripSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* LEFT COLUMN: DEPARTURE DETAILS */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2">Departure Details</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Start Date *</label>
                        <input
                          type="date"
                          required
                          value={activationForm.startDate}
                          onChange={(e) => setActivationForm({ ...activationForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">End Date *</label>
                        <input
                          type="date"
                          required
                          value={activationForm.endDate}
                          onChange={(e) => setActivationForm({ ...activationForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Total Seats *</label>
                        <input
                          type="number"
                          required
                          placeholder="12"
                          value={activationForm.totalSeats}
                          onChange={(e) => setActivationForm({ ...activationForm, totalSeats: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Trip Leader *</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setLeaderDropdownOpen(!leaderDropdownOpen)}
                            className="w-full px-3 py-2 border border-[#e7e1d5] bg-white rounded-xl text-xs font-bold text-left flex justify-between items-center cursor-pointer text-nomichi-ink focus:outline-none focus:border-[#FF5B26]"
                          >
                            <span className="flex items-center gap-2">
                              {(() => {
                                const selectedLeader = users.find((p) => p.id === activationForm.tripLeaderId);
                                if (selectedLeader) {
                                  return (
                                    <>
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-[10px] shrink-0 border border-[#e7e1d5]/40">
                                        {selectedLeader.avatar_url ? (
                                          <img src={selectedLeader.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                          (selectedLeader.full_name || "M").charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <span>{selectedLeader.full_name}</span>
                                    </>
                                  );
                                }
                                return <span>{selectedLeader ? selectedLeader.full_name : "Select Team Member"}</span>;
                              })()}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 shrink-0" />
                          </button>

                          {leaderDropdownOpen && (
                            <div className="absolute top-10 left-0 right-0 bg-white border border-[#e7e1d5] rounded-xl shadow-lg z-20 p-1 space-y-0.5 max-h-48 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivationForm({ ...activationForm, tripLeaderId: "" });
                                  setLeaderDropdownOpen(false);
                                }}
                                className="w-full px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-[#FAF8F4] border-0 bg-transparent text-nomichi-ink/50 cursor-pointer"
                              >
                                Select Team Member
                              </button>
                              {users
                                .filter((u: any) => u.role?.toUpperCase() === "MANAGER")
                                .map((user: any) => {
                                  const name = user.full_name || user.email;
                                  return (
                                    <button
                                      key={user.id}
                                      type="button"
                                      onClick={() => {
                                        setActivationForm({ ...activationForm, tripLeaderId: user.id });
                                        setLeaderDropdownOpen(false);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-[#FAF8F4] border-0 bg-transparent text-nomichi-ink cursor-pointer flex items-center gap-2"
                                    >
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-[10px] shrink-0 border border-[#e7e1d5]/40">
                                        {user.avatar_url ? (
                                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                          (user.full_name || "M").charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <span>{name}</span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-nomichi-ink/40 font-semibold">
                          Assigning a manager will activate the trip and make it visible to travelers.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Meeting Point</label>
                      <input
                        type="text"
                        placeholder="Airport / City"
                        value={activationForm.meetingPoint}
                        onChange={(e) => setActivationForm({ ...activationForm, meetingPoint: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Notes (Optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Any special notes for this departure..."
                        value={activationForm.notes}
                        onChange={(e) => setActivationForm({ ...activationForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold resize-none"
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: PRE-ACTIVATION CHECKLIST */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2">Pre-activation Checklist</h4>
                    
                    <ul className="space-y-2 text-xs font-semibold text-nomichi-ink/75">
                      <li className="flex items-center gap-2">
                        {isImageOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isImageOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Cover image exists</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isDescriptionOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isDescriptionOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Description exists</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isItineraryOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isItineraryOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Itinerary added</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isBrochureOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isBrochureOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Brochure uploaded</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isPriceOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isPriceOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Price added</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isHighlightsOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isHighlightsOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Highlights added</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isManagerOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isManagerOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Manager assigned</span>
                      </li>
                    </ul>

                    {/* Pre-activation Status Box */}
                    {isReadyToActivate ? (
                      <div className="bg-[#E6F9F0] border border-[#B3F5D3] rounded-2xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-extrabold text-emerald-950">All good!</p>
                          <p className="text-[10px] opacity-90 mt-0.5">This trip is ready to be activated.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs font-semibold">
                        <div className="flex items-center gap-2 mb-1.5">
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                          <span className="font-extrabold text-rose-950">Cannot activate departure</span>
                        </div>
                        <div className="space-y-1 pl-1 text-[10px] opacity-90 font-medium flex flex-col gap-0.5">
                          {!isImageOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Cover image missing</span></div>}
                          {!isDescriptionOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Description missing</span></div>}
                          {!isItineraryOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Itinerary missing</span></div>}
                          {!isBrochureOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Brochure missing</span></div>}
                          {!isPriceOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Price missing</span></div>}
                          {!isHighlightsOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Highlights missing</span></div>}
                          {!isManagerOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Trip manager not assigned</span></div>}
                        </div>
                      </div>
                    )}

                    <div className="bg-[#FAF8F4] border border-[#e7e1d5]/40 rounded-2xl p-3 text-[10px] font-semibold text-nomichi-ink/60 leading-normal flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[#FF5B26] shrink-0 mt-0.5" />
                      <span>Once activated, you can manage bookings, travelers and availability from the Departures section.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e7e1d5]/30 mt-6">
                  <button
                    type="button"
                    onClick={() => setActiveTripForActivation(null)}
                    className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading || !isReadyToActivate}
                    className="px-5 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Activate Departure
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
