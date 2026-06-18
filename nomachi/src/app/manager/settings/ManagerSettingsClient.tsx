"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Plane,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";

type ManagerSettingsClientProps = {
  user: {
    full_name: string;
    avatar_url?: string | null;
    email: string;
  };
};

type SettingKey = "taskDigest" | "leadAlerts" | "tripAlerts" | "darkMode" | "twoFactor";

export function ManagerSettingsClient({ user }: ManagerSettingsClientProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState({
    fullName: user.full_name,
    email: user.email,
    phone: "+91 98765 43210",
    timezone: "Asia/Kolkata",
    language: "English",
    taskDigest: true,
    leadAlerts: true,
    tripAlerts: true,
    darkMode: false,
    twoFactor: true,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSuccess("");

    setTimeout(() => {
      setIsSaving(false);
      setSuccess("Settings updated successfully.");
    }, 700);
  };

  const toggleSetting = (key: SettingKey) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const firstName = user.full_name?.split(" ")[0] || "Manager";

  return (
    <section className="px-5 md:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl md:text-[30px] font-bold tracking-tight text-slate-900">Settings</h1>
              <p className="text-sm text-slate-600 mt-1">Manage your profile, notifications, and security preferences.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Security Review
              </button>
              <button className="h-12 px-4 rounded-2xl bg-[#FF5B26] hover:bg-[#ea4c18] text-white font-semibold text-sm inline-flex items-center gap-2 shadow-sm">
                <Sparkles className="w-4 h-4" />
                Sync Profile
              </button>
            </div>
          </div>

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <form onSubmit={handleSubmit} className="xl:col-span-8 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="w-10 h-10 rounded-full bg-[#EBF3FF] text-[#2563EB] flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">Profile</h2>
                    <p className="text-sm text-slate-500">Your account details and contact information.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</label>
                    <input
                      value={settings.fullName}
                      onChange={(event) => setSettings({ ...settings, fullName: event.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF5B26]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
                    <input
                      value={settings.email}
                      onChange={(event) => setSettings({ ...settings, email: event.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF5B26]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
                    <input
                      value={settings.phone}
                      onChange={(event) => setSettings({ ...settings, phone: event.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF5B26]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF5B26] bg-white"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">Notifications</h2>
                    <p className="text-sm text-slate-500">Choose what updates you want to receive.</p>
                  </div>
                </div>

                {[
                  { key: "taskDigest", label: "Daily task digest", description: "Receive a summary of open tasks and follow-ups." },
                  { key: "leadAlerts", label: "Lead assignment alerts", description: "Get notified when a lead is assigned to you." },
                  { key: "tripAlerts", label: "Trip workflow alerts", description: "Get notified for booking, departure, and completion updates." },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => toggleSetting(item.key as SettingKey)}
                    className="w-full flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{item.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.description}</div>
                    </div>
                    <div
                      className={`w-12 h-7 rounded-full p-1 flex items-center transition-colors ${
                        settings[item.key as SettingKey] ? "bg-[#FF5B26] justify-end" : "bg-slate-200 justify-start"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <div className="w-10 h-10 rounded-full bg-[#F4EDFF] text-[#7C3AED] flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">Security</h2>
                    <p className="text-sm text-slate-500">Keep your account protected.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button type="button" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSetting("twoFactor")}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {settings.twoFactor ? "2FA Enabled" : "Enable 2FA"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-12 px-5 rounded-2xl bg-[#FF5B26] hover:bg-[#ea4c18] text-white font-semibold text-sm inline-flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                  {!isSaving && <Save className="w-4 h-4" />}
                </button>
              </div>
            </form>

            <div className="xl:col-span-4 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900">Manager Snapshot</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-500">Role</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">Manager</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-500">Language</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">{settings.language}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-500">Timezone</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">IST</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-500">Notifications</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">On</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Quick Preferences</h3>
                    <p className="text-sm text-slate-500">Small changes that make daily work easier.</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <span className="text-slate-600">Dark mode</span>
                    <span className="text-slate-900 font-semibold">{settings.darkMode ? "On" : "Off"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <span className="text-slate-600">Working hours</span>
                    <span className="text-slate-900 font-semibold">9 AM - 6 PM</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <span className="text-slate-600">Preferred updates</span>
                    <span className="text-slate-900 font-semibold">Email + In-app</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </section>
  );
}
