"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Plane, Users, Edit3, Trash2, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { departureService } from "@/services/departure.service";

const parseDepartureStatus = (value?: string | null) => {
  if (!value) return { status: "active", code: "—", leader: "Unassigned", meeting: "—", notes: "" };
  try {
    if (value.trim().startsWith("{")) {
      const parsed = JSON.parse(value);
      return {
        status: parsed.status || "active",
        code: parsed.code || "—",
        leader: parsed.leader || "Unassigned",
        meeting: parsed.meeting || "—",
        notes: parsed.notes || "",
      };
    }
  } catch {
    // fall through
  }
  return { status: value, code: "—", leader: "Unassigned", meeting: "—", notes: "" };
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function AdminDeparturesPage() {
  const supabase = createClient();
  const [departures, setDepartures] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isEditDepartureModalOpen, setIsEditDepartureModalOpen] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<any | null>(null);
  const [editDepartureForm, setEditDepartureForm] = useState({
    startDate: "",
    endDate: "",
    totalSeats: "",
    seatsLeft: "",
    price: "",
    status: "active",
    code: "",
    leader: "",
    meeting: "",
    notes: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await departureService.getDepartures();
      setDepartures(data);

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      setProfiles(profs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteDeparture = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this departure? This action cannot be undone.")) return;
    try {
      setError("");
      setSuccess("");
      await departureService.deleteDeparture(id);
      setSuccess("Departure successfully deleted.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete departure.");
    }
  };

  const handleStartEditDeparture = (dep: any) => {
    const meta = parseDepartureStatus(dep.status);
    setEditingDeparture(dep);
    setEditDepartureForm({
      startDate: dep.start_date ? dep.start_date.split("T")[0] : "",
      endDate: dep.end_date ? dep.end_date.split("T")[0] : "",
      totalSeats: String(dep.total_seats || 0),
      seatsLeft: String(dep.seats_left || 0),
      price: String(dep.price || 0),
      status: meta.status || "active",
      code: meta.code || "",
      leader: meta.leader || "Unassigned",
      meeting: meta.meeting || "",
      notes: meta.notes || ""
    });
    setIsEditDepartureModalOpen(true);
  };

  const handleEditDepartureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeparture) return;
    try {
      setError("");
      setSuccess("");

      const { startDate, endDate, totalSeats, seatsLeft, price, status, code, leader, meeting, notes } = editDepartureForm;
      if (!startDate || !totalSeats || !seatsLeft || !price) {
        throw new Error("Please fill in all required fields.");
      }

      const statusJson = JSON.stringify({
        status,
        code,
        leader,
        meeting,
        notes
      });

      await departureService.updateDeparture(editingDeparture.id, {
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        total_seats: parseInt(totalSeats),
        seats_left: parseInt(seatsLeft),
        price: parseFloat(price),
        status: statusJson
      });

      setSuccess("Departure updated successfully.");
      setIsEditDepartureModalOpen(false);
      setEditingDeparture(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update departure.");
    }
  };

  if (loading && departures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

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
            className="px-4 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5 no-underline animate-in"
          >
            Create Departure
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d5]/60 bg-white px-4 py-2 text-xs font-bold text-nomichi-ink/70">
            <Plane className="h-4 w-4 text-[#FF5B26]" />
            {departures.length} departures
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

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
                <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e1d5]/20">
              {departures.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                    No departures active.
                  </td>
                </tr>
              ) : (
                departures.map((departure) => {
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
                      <td className="px-6 py-4 text-right space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditDeparture(departure)}
                          className="text-nomichi-ink/45 hover:text-[#FF5B26] border-0 bg-transparent cursor-pointer p-1 transition-colors"
                          title="Edit Departure"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeparture(departure.id)}
                          className="text-nomichi-ink/45 hover:text-red-600 border-0 bg-transparent cursor-pointer p-1 transition-colors"
                          title="Delete Departure"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Departure Modal */}
      {isEditDepartureModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-xl max-w-lg w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]/30">
              <div>
                <h3 className="text-base font-display font-extrabold text-nomichi-ink uppercase tracking-wider">Edit Departure</h3>
                <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">Modify departure details for capacity and status</p>
              </div>
              <button
                onClick={() => {
                  setIsEditDepartureModalOpen(false);
                  setEditingDeparture(null);
                }}
                className="w-6 h-6 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/50 cursor-pointer bg-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleEditDepartureSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Departure Code *</label>
                <input
                  type="text"
                  required
                  value={editDepartureForm.code}
                  onChange={(e) => setEditDepartureForm({ ...editDepartureForm, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35 bg-[#FAF8F4]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={editDepartureForm.startDate}
                    onChange={(e) => setEditDepartureForm({ ...editDepartureForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-[#FAF8F4]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={editDepartureForm.endDate}
                    onChange={(e) => setEditDepartureForm({ ...editDepartureForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-[#FAF8F4]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Total Seats *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editDepartureForm.totalSeats}
                    onChange={(e) => setEditDepartureForm({ ...editDepartureForm, totalSeats: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-[#FAF8F4]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Seats Left *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editDepartureForm.seatsLeft}
                    onChange={(e) => setEditDepartureForm({ ...editDepartureForm, seatsLeft: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-[#FAF8F4]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Price (INR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editDepartureForm.price}
                    onChange={(e) => setEditDepartureForm({ ...editDepartureForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-[#FAF8F4]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Trip Leader</label>
                  <select
                    value={editDepartureForm.leader}
                    onChange={(e) => setEditDepartureForm({ ...editDepartureForm, leader: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-white"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {profiles.map((u) => (
                      <option key={u.id} value={u.full_name || u.email}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Meeting Point</label>
                  <input
                    type="text"
                    value={editDepartureForm.meeting}
                    onChange={(e) => setEditDepartureForm({ ...editDepartureForm, meeting: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35 bg-[#FAF8F4]/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Status *</label>
                <select
                  value={editDepartureForm.status}
                  onChange={(e) => setEditDepartureForm({ ...editDepartureForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-white"
                >
                  <option value="active">Active</option>
                  <option value="sold_out">Sold Out</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Logistics & Notes</label>
                <textarea
                  rows={2}
                  value={editDepartureForm.notes}
                  onChange={(e) => setEditDepartureForm({ ...editDepartureForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink resize-none bg-[#FAF8F4]/30"
                />
              </div>

              <div className="pt-4 border-t border-[#e7e1d5]/30 flex justify-end gap-3 bg-[#FAF8F4]/10 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditDepartureModalOpen(false);
                    setEditingDeparture(null);
                  }}
                  className="px-5 py-2.5 border border-[#e7e1d5] text-nomichi-ink font-bold text-xs rounded-xl hover:bg-[#FAF8F4] transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#FF5B26] text-white font-bold text-xs rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-sm border-0 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
