"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  FileText,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  Tag
} from "lucide-react";

export default function NewDeparturePage() {
  const router = useRouter();
  const supabase = createClient();

  const [trips, setTrips] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form Fields State
  const [selectedTripId, setSelectedTripId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalSeats, setTotalSeats] = useState(12);
  const [price, setPrice] = useState(0);
  const [departureCode, setDepartureCode] = useState("");
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  // Fetch trips and team members on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, profilesRes] = await Promise.all([
          supabase.from("trips").select("id, title, destination, price").order("title"),
          supabase.from("profiles").select("id, full_name, role").in("role", ["admin", "manager", "staff"]).order("full_name")
        ]);

        if (tripsRes.error) throw tripsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        setTrips(tripsRes.data || []);
        setTeam(profilesRes.data || []);

        if (tripsRes.data && tripsRes.data.length > 0) {
          setSelectedTripId(tripsRes.data[0].id);
          setPrice(Number(tripsRes.data[0].price || 0));
        }
      } catch (err: any) {
        console.error("Failed to load form data:", err);
        setError(err.message || "Failed to load trips or team members.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update default price when trip changes
  const handleTripChange = (tripId: string) => {
    setSelectedTripId(tripId);
    const selectedTrip = trips.find((t) => t.id === tripId);
    if (selectedTrip) {
      setPrice(Number(selectedTrip.price || 0));
    }
  };

  // Auto-generate departure code when startDate changes
  useEffect(() => {
    if (!startDate) return;

    const generateCode = async () => {
      try {
        const startYear = new Date(startDate).getFullYear();
        const { data: existingDeps, error: fetchErr } = await supabase
          .from("trip_departures")
          .select("status");

        if (fetchErr) throw fetchErr;

        const yearDeps = (existingDeps || []).filter((d) => {
          try {
            if (d.status?.trim().startsWith("{")) {
              const parsed = JSON.parse(d.status);
              return parsed.code?.startsWith(`DEP-${startYear}-`);
            }
          } catch (e) {
            // fall through
          }
          return false;
        });

        const nextIndex = yearDeps.length + 1;
        const computedCode = `DEP-${startYear}-${String(nextIndex).padStart(3, "0")}`;
        setDepartureCode(computedCode);
      } catch (err) {
        console.error("Failed to generate departure code:", err);
      }
    };

    generateCode();
  }, [startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !startDate || !endDate || !departureCode) {
      setError("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const leaderName = selectedLeaderId
        ? team.find((member) => member.id === selectedLeaderId)?.full_name || "Unassigned"
        : "Unassigned";

      // Serialize metadata fields inside the status column to match departures parser
      const statusJson = JSON.stringify({
        status,
        code: departureCode,
        leader: leaderName,
        meeting: meetingPoint || "Airport / City",
        notes: notes || "",
      });

      const departureData = {
        trip_id: selectedTripId,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        total_seats: Number(totalSeats),
        seats_left: Number(totalSeats), // default same as total seats on create
        price: Number(price),
        status: statusJson,
      };

      const { error: insertErr } = await supabase
        .from("trip_departures")
        .insert([departureData]);

      if (insertErr) throw insertErr;

      router.push("/admin/departures");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create departure.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7e1d5]/50 pb-5">
        <div className="text-left flex items-center gap-3">
          <Link href="/admin/departures" className="p-2 bg-white border border-[#e7e1d5]/40 rounded-xl text-nomichi-ink hover:bg-[#FAF8F4] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Create Departure</h1>
            <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
              Schedule a new departure date and assign leaders for trips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/departures"
            className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer no-underline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="new-departure-form"
            disabled={submitting}
            className="px-5 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Schedule Departure
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5 text-left animate-in shake duration-300">
          <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Form container */}
      <form id="new-departure-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
        
        {/* Left Form Block */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-[#FF5B26]" />
              Schedule Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Trip Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Trip Template *</label>
                <select
                  required
                  value={selectedTripId}
                  onChange={(e) => handleTripChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                >
                  <option value="" disabled>Select a Trip</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title} ({trip.destination})
                    </option>
                  ))}
                </select>
              </div>

              {/* Departure Code */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Departure Code *</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-nomichi-ink/20 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., DEP-2026-003"
                    value={departureCode}
                    onChange={(e) => setDepartureCode(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Start Date */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Total Seats */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Total Seats *</label>
                <div className="relative">
                  <Users className="w-4 h-4 text-nomichi-ink/20 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min={1}
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(Number(e.target.value) || 0)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Price (₹) *</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-nomichi-ink/20 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3 flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5 text-[#FF5B26]" />
              Operations & Logistics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Trip Leader */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Trip Leader</label>
                <div className="relative">
                  <User className="w-4 h-4 text-nomichi-ink/20 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedLeaderId}
                    onChange={(e) => setSelectedLeaderId(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  >
                    <option value="">Unassigned / Select Leader</option>
                    {team.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Meeting Point */}
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Meeting Point</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-nomichi-ink/20 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g., Delhi IGI Airport T3"
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Logistic Notes</label>
              <div className="relative">
                <FileText className="w-4.5 h-4.5 text-nomichi-ink/20 absolute left-3.5 top-3" />
                <textarea
                  rows={4}
                  placeholder="e.g., Remind travelers to bring visa copies, local SIM cards..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Block */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">Status</h3>

            <div>
              <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
              >
                <option value="active">Active</option>
                <option value="full">Full</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
