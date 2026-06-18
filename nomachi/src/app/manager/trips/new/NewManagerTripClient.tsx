"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Calendar,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Plane,
  Plus,
  Save,
  Settings,
  Sparkles,
  Briefcase,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { tripService } from "@/services/trip.service";

type NewManagerTripClientProps = {
  user: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    email: string;
  };
};

export function NewManagerTripClient({ user }: NewManagerTripClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    destination: "",
    status: "Draft",
    start_date: "",
    end_date: "",
    duration: "",
    price: "",
    image_url: "",
    description: "",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: form.title.trim(),
        destination: form.destination.trim(),
        status: form.status,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        duration: form.duration || undefined,
        price: form.price ? Number(form.price) : undefined,
        image_url: form.image_url || undefined,
        description: form.description || undefined,
        created_by: user.id,
      };

      if (!payload.title || !payload.destination) {
        throw new Error("Title and destination are required.");
      }

      await tripService.createTrip(payload as any);
      setSuccess("Trip created successfully.");
      router.push("/manager/trips");
    } catch (err: any) {
      setError(err?.message || "Failed to create trip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="px-5 md:px-8 py-8 max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-[30px] font-bold tracking-tight text-slate-900">Create Trip</h1>
              <p className="text-sm text-slate-600 mt-1">Add a trip that belongs to your manager workspace.</p>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Trip Name</span>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26]" placeholder="Tokyo Lights & Mt Fuji" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Destination</span>
                <input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26]" placeholder="Tokyo, Japan" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26] bg-white">
                  <option>Draft</option>
                  <option>Open</option>
                  <option>Active</option>
                  <option>Confirmed</option>
                  <option>Completed</option>
                  <option>Archived</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Duration</span>
                <input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26]" placeholder="8 Days / 7 Nights" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Departure Date</span>
                <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26]" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Return Date</span>
                <input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26]" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Price</span>
                <input type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26]" placeholder="129999" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Image URL</span>
                <input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-[#FF5B26]" placeholder="https://..." />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#FF5B26]" placeholder="Short trip overview..." />
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-[#FF5B26] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ea4c18] disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Trip
              </button>
              <Link href="/manager/trips" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                Cancel
              </Link>
            </div>
          </form>
    </section>
  );
}
