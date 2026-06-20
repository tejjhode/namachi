"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Compass } from "lucide-react";
import Link from "next/link";
import { tripService } from "@/services/trip.service";
import { leadService } from "@/services/lead.service";
import { Trip } from "@/types/admin.types";

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    trip_interest: "",
    trip_id: "",
    group_size: 1,
    notes: "",
    status: "new",
  });

  useEffect(() => {
    tripService
      .getTrips()
      .then((data) => {
        setTrips(data);
      })
      .catch((err) => {
        console.error("Failed to load trips:", err);
      })
      .finally(() => {
        setLoadingTrips(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedTrip = trips.find((t) => t.id === form.trip_id);
      const leadData = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        trip_interest: selectedTrip ? selectedTrip.title : form.trip_interest || undefined,
        trip_id: form.trip_id || undefined,
        group_size: form.group_size,
        notes: form.notes || undefined,
        status: form.status,
        is_lead: true,
      };

      await leadService.createLead(leadData);
      router.push("/admin/leads");
    } catch (err) {
      console.error("Failed to create lead:", err);
      alert("Error creating lead. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="flex items-center gap-4">
        <Link href="/admin/leads" className="p-2 bg-white border border-[#e7e1d5]/40 rounded-xl text-nomichi-ink hover:bg-[#FAF8F4] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Create New Lead</h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">Manually add a travel lead or client request.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-nomichi-ink/40 ml-1">Client Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors"
            />
          </div>
          
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-nomichi-ink/40 ml-1">Email Address *</label>
            <input
              required
              type="email"
              placeholder="e.g. rahul@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors"
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-nomichi-ink/40 ml-1">Phone Number</label>
            <input
              type="text"
              placeholder="e.g. +91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors"
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-nomichi-ink/40 ml-1">Group Size *</label>
            <input
              required
              type="number"
              min="1"
              value={form.group_size}
              onChange={(e) => setForm({ ...form, group_size: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors"
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-nomichi-ink/40 ml-1">Trip Interest</label>
            {loadingTrips ? (
              <div className="flex items-center gap-2 text-xs text-nomichi-ink/40 font-semibold px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF5B26]" /> Loading trips...
              </div>
            ) : (
              <select
                value={form.trip_id}
                onChange={(e) => setForm({ ...form, trip_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors cursor-pointer"
              >
                <option value="">General Enquiry / Custom Trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.destination})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-widest text-nomichi-ink/40 ml-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors cursor-pointer"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="negotiating">Negotiating</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-[10px] font-black uppercase tracking-widest text-nomichi-ink/40 ml-1">Client Message / Notes</label>
          <textarea
            rows={4}
            placeholder="Type any initial preferences, notes, or messages sent by the client..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e7e1d5]/20">
          <Link href="/admin/leads" className="px-6 py-2.5 text-xs font-bold text-nomichi-ink/60 hover:text-nomichi-ink transition-colors">Cancel</Link>
          <button 
            disabled={isSubmitting}
            type="submit" 
            className="flex items-center gap-2 px-8 py-2.5 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Lead
          </button>
        </div>
      </form>
    </div>
  );
}
