"use client";

import { useState } from "react";
import { Save, CheckCircle, Shield, Globe, Bell, Palette, Settings } from "lucide-react";

export default function SettingsPage() {
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    agencyName: "Nomichi Travel Agency",
    tagline: "Wander • Connect • Belong",
    email: "contact@nomichi.com",
    phone: "+91 98765 43210",
    address: "Bandra West, Mumbai, India",
    currency: "INR (₹)",
    theme: "Light Mode",
    enableNotifications: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess("");

    setTimeout(() => {
      setIsSaving(false);
      setSuccess("Settings updated successfully!");
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Agency Settings</h1>
        <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
          Configure global metadata, contact info, and admin defaults.
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column options */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. General Profile */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3 flex items-center gap-2">
                <Globe className="w-4.5 h-4.5 text-[#FF5B26]" />
                General Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Agency Name</label>
                  <input
                    type="text"
                    value={form.agencyName}
                    onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Tagline</label>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Support Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Office Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold resize-none"
                />
              </div>
            </div>

            {/* 2. Preferences */}
            <div className="space-y-4 pt-4 border-t border-[#e7e1d5]/20">
              <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3 flex items-center gap-2">
                <Palette className="w-4.5 h-4.5 text-[#FF5B26]" />
                Regional & Theme Preferences
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Base Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                  >
                    <option value="INR (₹)">INR (₹)</option>
                    <option value="USD ($)">USD ($)</option>
                    <option value="EUR (€)">EUR (€)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Color Theme</label>
                  <select
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                  >
                    <option value="Light Mode">Sleek Light Mode</option>
                    <option value="Dark Mode">Cyber Dark Mode</option>
                  </select>
                </div>
              </div>

              {/* Notification Switch */}
              <div className="flex items-center justify-between p-3.5 bg-[#FAF8F4]/50 border border-[#e7e1d5]/30 rounded-2xl">
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-extrabold text-nomichi-ink block">Email Notifications</span>
                  <span className="text-[10px] font-semibold text-nomichi-ink/40">Receive alert digests for new enquiries and leads.</span>
                </div>
                <div
                  onClick={() => setForm({ ...form, enableNotifications: !form.enableNotifications })}
                  className={`w-8 h-4 rounded-full p-0.5 flex items-center cursor-pointer transition-colors duration-200 ${
                    form.enableNotifications ? "bg-[#5CB87A] justify-end" : "bg-gray-200 justify-start"
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-[#e7e1d5]/20">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Settings"}
                {!isSaving && <Save className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>

        {/* Right column details */}
        <div className="lg:col-span-4 space-y-6">
          {/* Security details */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
            <h3 className="text-xs font-black text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2.5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FF5B26]" />
              System Status
            </h3>
            <div className="space-y-3.5 text-xs font-semibold text-nomichi-ink/75">
              <div className="flex items-center justify-between">
                <span>Database Connection</span>
                <span className="text-emerald-600 font-extrabold">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Supabase API sync</span>
                <span className="text-emerald-600 font-extrabold">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Environment mode</span>
                <span className="px-2 py-0.5 bg-nomichi-sand/10 border border-[#e7e1d5] rounded text-[10px] font-black uppercase text-nomichi-ink/50">
                  Production
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
