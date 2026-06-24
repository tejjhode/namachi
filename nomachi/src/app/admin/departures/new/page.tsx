"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  FileText,
  User,
  Loader2,
  XCircle,
  Tag,
  CheckCircle2,
  Info,
  Send,
  IndianRupee,
  Clock
} from "lucide-react";

export default function NewDeparturePage() {
  const router = useRouter();
  const supabase = createClient();

  const [trips, setTrips] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form Fields State
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalSeats, setTotalSeats] = useState(12);
  const [price, setPrice] = useState(0);
  const [departureCode, setDepartureCode] = useState("");
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [selectedLeader, setSelectedLeader] = useState<any>(null);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  // Fetch trips and managers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, managersRes] = await Promise.all([
          supabase.from("trips").select("id, title, destination, price, image_url, duration").order("title"),
          supabase.from("profiles").select("id, full_name, role, avatar_url, email, phone").in("role", ["manager", "MANAGER", "Manager"]).order("full_name")
        ]);

        if (tripsRes.error) throw tripsRes.error;
        if (managersRes.error) throw managersRes.error;

        setTrips(tripsRes.data || []);
        setManagers(managersRes.data || []);

        if (tripsRes.data && tripsRes.data.length > 0) {
          setSelectedTripId(tripsRes.data[0].id);
          setSelectedTrip(tripsRes.data[0]);
          setPrice(Number(tripsRes.data[0].price || 0));
        }
      } catch (err: any) {
        console.error("Failed to load form data:", err);
        setError(err.message || "Failed to load trips or managers.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update trip and price when trip changes
  const handleTripChange = (tripId: string) => {
    setSelectedTripId(tripId);
    const trip = trips.find((t) => t.id === tripId);
    setSelectedTrip(trip || null);
    if (trip) setPrice(Number(trip.price || 0));
  };

  // Update leader preview on selection
  const handleLeaderChange = (leaderId: string) => {
    setSelectedLeaderId(leaderId);
    const leader = managers.find((m) => m.id === leaderId);
    setSelectedLeader(leader || null);
  };

  // Auto-generate departure code when startDate changes
  useEffect(() => {
    if (!startDate) return;
    const generateCode = async () => {
      try {
        const startYear = new Date(startDate).getFullYear();
        const { data: existingDeps } = await supabase.from("trip_departures").select("status");
        const yearDeps = (existingDeps || []).filter((d) => {
          try {
            if (d.status?.trim().startsWith("{")) {
              const parsed = JSON.parse(d.status);
              return parsed.code?.startsWith(`DEP-${startYear}-`);
            }
          } catch (e) {}
          return false;
        });
        const nextIndex = yearDeps.length + 1;
        setDepartureCode(`DEP-${startYear}-${String(nextIndex).padStart(3, "0")}`);
      } catch (err) {
        console.error("Failed to generate departure code:", err);
      }
    };
    generateCode();
  }, [startDate]);

  // ── Send departure notification emails ──────────────────────────────────
  const sendDepartureEmails = async (departureId: string) => {
    try {
      const trip = selectedTrip;
      const leader = selectedLeader;
      const tripTitle = trip?.title || "Your Trip";
      const tripDest = trip?.destination || "";
      const startFormatted = startDate ? new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
      const endFormatted = endDate ? new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
      const priceFormatted = `₹${Number(price).toLocaleString("en-IN")}`;
      const meetingStr = meetingPoint || "To be communicated";
      const leaderName = leader?.full_name || "Nomichi Team";

      // 1. Find confirmed bookings for this trip
     const { data: bookings } = await supabase
  .from("bookings")
  .select(`
    id,
    user_id,
    profiles:user_id(
      full_name,
      email,
      phone
    )
  `)
  .eq("trip_id", selectedTripId);

      const confirmedTravelers = (bookings || []).filter((b: any) => b.profiles?.email);

      // 2. Send email to each confirmed traveler
      const travelerEmailBody = `Hello,\n\nGreat news! Your departure for ${tripTitle} has been officially scheduled.\n\nDeparture Code: ${departureCode}\nTrip: ${tripTitle}${tripDest ? ` (${tripDest})` : ""}\nStart Date: ${startFormatted}\nEnd Date: ${endFormatted}\nPrice: ${priceFormatted}\nMeeting Point: ${meetingStr}\nTrip Leader: ${leaderName}${leader?.phone ? `\nLeader Contact: ${leader.phone}` : ""}\n\n${notes ? `Important Notes:\n${notes}\n\n` : ""}Please ensure you carry all required documents, including valid ID proof and any necessary travel permits.\n\nWe can't wait to take you on this incredible journey!\n\nWarm regards,\nNomichi Travel Team`;

      for (const booking of confirmedTravelers) {
        const traveler = booking.profiles as any;
        if (!traveler?.email) continue;
        try {
          await fetch("/api/notifications/deliver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: traveler.email,
              title: `🎒 Departure Scheduled — ${tripTitle}`,
              body: travelerEmailBody,
              type: "Departure Scheduled",
              priority: "High",
              source_id: selectedTripId,
            }),
          });
        } catch (e) {
          console.error("Failed to send traveler email:", traveler.email, e);
        }
      }

      // 3. Send assignment email to the Trip Leader
      if (leader?.email) {
        const leaderEmailBody = `Hello ${leader.full_name},\n\nYou have been assigned as the Trip Leader for the following departure:\n\nDeparture Code: ${departureCode}\nTrip: ${tripTitle}${tripDest ? ` (${tripDest})` : ""}\nStart Date: ${startFormatted}\nEnd Date: ${endFormatted}\nTotal Seats: ${totalSeats}\nPrice per Person: ${priceFormatted}\nMeeting Point: ${meetingStr}\n\n${notes ? `Operational Notes:\n${notes}\n\n` : ""}Confirmed Travelers: ${confirmedTravelers.length}\n\nPlease review the departure details and coordinate with the team for a smooth experience.\n\nYou can manage this departure from your Nomichi Manager Dashboard.\n\nBest regards,\nNomichi Admin Team`;

        await fetch("/api/notifications/deliver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: leader.email,
            title: `📋 You've been assigned as Trip Leader — ${tripTitle}`,
            body: leaderEmailBody,
            type: "Trip Leader Assignment",
            priority: "High",
            source_id: selectedTripId,
          }),
        });
      }

      return confirmedTravelers.length;
    } catch (err) {
      console.error("Error sending departure emails:", err);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !startDate || !endDate || !departureCode) {
      setError("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const leaderName = selectedLeader?.full_name || "Unassigned";

      const statusJson = JSON.stringify({
        status,
        code: departureCode,
        leader: leaderName,
        leader_id: selectedLeaderId || null,
        meeting: meetingPoint || "Airport / City",
        notes: notes || "",
      });

      const departureData = {
        trip_id: selectedTripId,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        total_seats: Number(totalSeats),
        seats_left: Number(totalSeats),
        price: Number(price),
        status: statusJson,
      };

      const { data: insertedRow, error: insertErr } = await supabase
        .from("trip_departures")
        .insert([departureData])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Send emails after successful insert
      const travelerCount = await sendDepartureEmails(insertedRow?.id || "");

      setSuccess(`Departure scheduled! Emails sent to ${travelerCount} traveler${travelerCount !== 1 ? "s" : ""}${selectedLeader ? " and the Trip Leader" : ""}.`);

      setTimeout(() => router.push("/admin/departures"), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create departure.");
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    active:    { label: "Active",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  dot: "bg-emerald-500" },
    full:      { label: "Full",      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",        dot: "bg-blue-500" },
    cancelled: { label: "Cancelled", color: "text-red-700",     bg: "bg-red-50 border-red-200",          dot: "bg-red-500" },
    completed: { label: "Completed", color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",    dot: "bg-purple-500" },
  };
  const currentStatus = statusConfig[status] || statusConfig.active;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
        <p className="text-xs text-nomichi-ink/40 font-semibold">Loading trip data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">

      {/* ── Top Action Bar ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7e1d5]/50 pb-5">
        <div className="text-left flex items-center gap-3">
          <Link href="/admin/departures" className="p-2 bg-white border border-[#e7e1d5]/40 rounded-xl text-nomichi-ink hover:bg-[#FAF8F4] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Create Departure</h1>
            <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">Schedule a new departure date and assign a trip leader.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/departures" className="px-4 py-2.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer no-underline">
            Cancel
          </Link>
          <button
            type="submit"
            form="new-departure-form"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#FF5B26] hover:bg-[#d94e1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scheduling…</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Schedule Departure</>
            )}
          </button>
        </div>
      </div>

      {/* ── Status Messages ──────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-left">
          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      {/* ── Main Form ────────────────────────────────────────── */}
      <form id="new-departure-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">

        {/* ── Left Column ─────────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Schedule Details Card */}
          <div className="bg-white rounded-2xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e7e1d5]/30 flex items-center gap-2.5 bg-[#FAF8F4]/40">
              <div className="w-8 h-8 rounded-lg bg-[#FFEFEA] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#FF5B26]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-nomichi-ink">Schedule Details</h3>
                <p className="text-[10px] text-nomichi-ink/40 font-semibold">Provide the basic information for this departure.</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Trip Template + Departure Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Trip Template *</label>
                  <select
                    required
                    value={selectedTripId}
                    onChange={(e) => handleTripChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold text-nomichi-ink appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a Trip</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}{trip.destination ? ` — ${trip.destination}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Departure Code *</label>
                  <div className="relative">
                    <Tag className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., DEP-2026-003"
                      value={departureCode}
                      onChange={(e) => setDepartureCode(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Start + End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Start Date *</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">End Date *</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Seats + Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Total Seats *</label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min={1}
                      max={500}
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(Number(e.target.value) || 0)}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Price per Person (₹) *</label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value) || 0)}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Operations & Logistics Card */}
          <div className="bg-white rounded-2xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e7e1d5]/30 flex items-center gap-2.5 bg-[#FAF8F4]/40">
              <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-nomichi-ink">Operations &amp; Logistics</h3>
                <p className="text-[10px] text-nomichi-ink/40 font-semibold">Assign a leader and add operational details.</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Trip Leader Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">
                  Trip Leader <span className="text-[#FF5B26]">*</span>
                </label>

                {managers.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 border border-amber-200 bg-amber-50 rounded-xl text-xs font-semibold text-amber-700">
                    <Info className="w-4 h-4 shrink-0" />
                    No managers found. Please add a manager in Users first.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Select dropdown */}
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={selectedLeaderId}
                        onChange={(e) => handleLeaderChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold text-nomichi-ink appearance-none cursor-pointer"
                      >
                        <option value="">— Select a Manager as Leader —</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Leader Preview Card */}
                    {selectedLeader && (
                      <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-[#FAF8F4] to-white border border-[#e7e1d5]/60 rounded-xl">
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#FF5B26]/20 shrink-0">
                          {selectedLeader.avatar_url ? (
                            <img src={selectedLeader.avatar_url} alt={selectedLeader.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#FFEFEA] flex items-center justify-center">
                              <span className="text-[#FF5B26] font-black text-base">
                                {selectedLeader.full_name?.charAt(0).toUpperCase() || "M"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-sm text-nomichi-ink">{selectedLeader.full_name}</p>
                          <p className="text-[10px] text-nomichi-ink/45 font-semibold capitalize">{selectedLeader.role}</p>
                          {selectedLeader.email && (
                            <p className="text-[10px] text-nomichi-ink/45 font-semibold truncate">{selectedLeader.email}</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase rounded-full">
                            Leader
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meeting Point */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Meeting Point</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g., Delhi IGI Airport T3"
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Logistic Notes */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Logistic Notes</label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-nomichi-ink/25 absolute left-3.5 top-3.5" />
                  <textarea
                    rows={4}
                    placeholder="e.g., Remind travelers to bring visa copies, local SIM cards, warm clothing…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold resize-none"
                  />
                </div>
              </div>
            </div>
          </div>



        </div>

        {/* ── Right Sidebar ────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Status Card */}
          <div className="bg-white rounded-2xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e7e1d5]/30 bg-[#FAF8F4]/40">
              <h3 className="text-sm font-extrabold text-nomichi-ink">Status</h3>
              <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Set the current status for this departure.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-2">Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["active", "full", "cancelled", "completed"] as const).map((s) => {
                    const cfg = statusConfig[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          status === s
                            ? `${cfg.bg} ${cfg.color} shadow-sm`
                            : "bg-white border-[#e7e1d5] text-nomichi-ink/50 hover:bg-[#FAF8F4]"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${status === s ? cfg.dot : "bg-zinc-300"}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active status info */}
              {status === "active" && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-emerald-700">Active departures are visible to your team and travellers.</p>
                </div>
              )}
            </div>
          </div>

          {/* Trip Preview Card */}
          {selectedTrip && (
            <div className="bg-white rounded-2xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
              {selectedTrip.image_url && (
                <img src={selectedTrip.image_url} alt={selectedTrip.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-5 space-y-3">
                <div>
                  <h4 className="font-extrabold text-sm text-nomichi-ink leading-snug">{selectedTrip.title}</h4>
                  {selectedTrip.destination && (
                    <p className="text-[10px] text-nomichi-ink/45 font-semibold flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{selectedTrip.destination}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedTrip.duration && (
                    <div className="flex items-center gap-1.5 text-nomichi-ink/55 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#FF5B26]/60" />
                      {selectedTrip.duration}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-nomichi-ink/55 font-semibold">
                    <Users className="w-3.5 h-3.5 text-[#FF5B26]/60" />
                    {totalSeats} Seats
                  </div>
                  <div className="flex items-center gap-1.5 text-nomichi-ink/55 font-semibold col-span-2">
                    <IndianRupee className="w-3.5 h-3.5 text-[#FF5B26]/60" />
                    ₹{Number(price).toLocaleString("en-IN")} per person
                  </div>
                </div>
                {startDate && endDate && (
                  <div className="flex items-center gap-1.5 text-xs text-nomichi-ink/55 font-semibold pt-1 border-t border-[#e7e1d5]/30">
                    <Calendar className="w-3.5 h-3.5 text-[#FF5B26]/60" />
                    {new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {" — "}
                    {new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            </div>
          )}



        </div>
      </form>
    </div>
  );
}
