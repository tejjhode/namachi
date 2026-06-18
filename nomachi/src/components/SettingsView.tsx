"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Sun,
  Moon,
  Monitor,
  Download,
  Trash2,
  ChevronRight,
  Check,
  Shield,
  Eye,
  EyeOff,
  Cookie,
  FileText,
  Info,
  Palette,
  Languages,
  Clock,
  IndianRupee,
  Type,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ExternalLink,
  Smartphone,
  Mail,
  Bell,
  BellOff,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AppSettings {
  general: {
    language: string;
    timezone: string;
    currency: string;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    font_size: "small" | "default" | "large";
    reduce_animations: boolean;
  };
  privacy: {
    analytics_consent: boolean;
    marketing_emails: boolean;
    personalized_recommendations: boolean;
    cookie_preference: "essential" | "functional" | "all";
  };
}

interface SettingsViewProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  onBack: () => void;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */
const DEFAULT_SETTINGS: AppSettings = {
  general: {
    language: "English",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    currency: "INR (₹)",
  },
  appearance: {
    theme: "light",
    font_size: "default",
    reduce_animations: false,
  },
  privacy: {
    analytics_consent: true,
    marketing_emails: false,
    personalized_recommendations: true,
    cookie_preference: "functional",
  },
};

const LANGUAGES = ["English", "Hindi", "Marathi", "Tamil", "Bengali", "Gujarati", "Kannada", "Telugu"];
const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];
const CURRENCIES = [
  "INR (₹)",
  "USD ($)",
  "EUR (€)",
  "GBP (£)",
  "AED (د.إ)",
  "SGD (S$)",
  "JPY (¥)",
  "AUD (A$)",
];
const FONT_SIZES = [
  { value: "small" as const, label: "Small", desc: "Compact layout" },
  { value: "default" as const, label: "Default", desc: "Recommended" },
  { value: "large" as const, label: "Large", desc: "Easier to read" },
];
const THEMES = [
  { value: "light" as const, label: "Light", icon: Sun, desc: "Clean & bright" },
  { value: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on the eyes" },
  { value: "system" as const, label: "System", icon: Monitor, desc: "Match your device" },
];
const COOKIE_OPTIONS = [
  { value: "essential" as const, label: "Essential Only", desc: "Only cookies required for the app to work" },
  { value: "functional" as const, label: "Functional", desc: "Includes preferences and analytics" },
  { value: "all" as const, label: "All Cookies", desc: "Includes marketing and personalization" },
];

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function SettingsView({ user, onBack }: SettingsViewProps) {
  const supabase = createClient();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: string; text: string }>({ type: "", text: "" });
  const [activeSection, setActiveSection] = useState<"general" | "appearance" | "privacy" | "about">("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  /* ---- Dropdown open states ---- */
  const [langOpen, setLangOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);

  /* ---- Load settings from DB ---- */
  useEffect(() => {
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        const { data } = await supabase
          .from("user_settings")
          .select("general, appearance, privacy")
          .eq("user_id", authUser.id)
          .single();

        if (data) {
          setSettings((prev) => ({
            general: { ...prev.general, ...(data.general || {}) },
            appearance: { ...prev.appearance, ...(data.appearance || {}) },
            privacy: { ...prev.privacy, ...(data.privacy || {}) },
          }));
        }
      } catch {
        /* first load — use defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---- Persist ---- */
  const saveSettings = useCallback(
    async (next: AppSettings) => {
      setSaving(true);
      setSaveMessage({ type: "", text: "" });
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("Not authenticated");

        const { error } = await supabase
          .from("user_settings")
          .upsert(
            {
              user_id: authUser.id,
              general: next.general,
              appearance: next.appearance,
              privacy: next.privacy,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (error) throw error;

        setSaveMessage({ type: "success", text: "Settings saved" });
        setTimeout(() => setSaveMessage({ type: "", text: "" }), 2500);
      } catch (err: any) {
        setSaveMessage({ type: "error", text: err?.message || "Failed to save" });
      } finally {
        setSaving(false);
      }
    },
    [supabase],
  );

  /* Convenience updater that saves immediately */
  const update = <K extends keyof AppSettings>(
    section: K,
    patch: Partial<AppSettings[K]>,
  ) => {
    const next = {
      ...settings,
      [section]: { ...settings[section], ...patch },
    };
    setSettings(next);
    saveSettings(next);
  };

  /* ---- Export data ---- */
  const handleExportData = async () => {
    setExportingData(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("email", user.email);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profile || {},
        enquiries: leads || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nomachi-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSaveMessage({ type: "success", text: "Data exported successfully" });
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 2500);
    } catch {
      setSaveMessage({ type: "error", text: "Export failed" });
    } finally {
      setExportingData(false);
    }
  };

  /* ---- Delete account ---- */
  const handleDeleteAccount = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      await supabase.from("profiles").delete().eq("id", authUser.id);
      await supabase.auth.signOut();
      window.location.href = "/auth/signout";
    } catch {
      setSaveMessage({ type: "error", text: "Failed to delete account" });
    }
  };

  /* ---- Friendly timezone label ---- */
  const tzLabel = (tz: string) => {
    try {
      const offset = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "";
      return `${tz.replace(/_/g, " ")} (${offset})`;
    } catch {
      return tz;
    }
  };

  /* ---- Section nav items ---- */
  const sections = [
    { key: "general" as const, label: "General", icon: Globe, desc: "Language, timezone & currency" },
    { key: "appearance" as const, label: "Appearance", icon: Palette, desc: "Theme & display" },
    { key: "privacy" as const, label: "Privacy & Data", icon: Shield, desc: "Consent & data controls" },
    { key: "about" as const, label: "About", icon: Info, desc: "App info & legal" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 animate-pulse">
        <Loader2 className="w-6 h-6 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* -------- Header -------- */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-nomichi-sand/15 text-nomichi-ink/60 hover:text-nomichi-ink transition-all border-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <div className="leading-none">
          <h2 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Settings</h2>
          <p className="text-xs text-nomichi-ink/50 font-medium mt-1.5">
            Manage your app preferences and account data.
          </p>
        </div>
      </div>

      {/* -------- Save Toast -------- */}
      {saveMessage.text && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-xl animate-in slide-in-from-top-3 fade-in duration-300 flex items-center gap-2 ${
            saveMessage.type === "success"
              ? "bg-[#E8F8F0] text-[#10B981] border border-[#10B981]/20"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {saveMessage.type === "success" ? (
            <Check className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          )}
          {saveMessage.text}
        </div>
      )}

      {/* -------- Two‑Column Layout -------- */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ---- Left Nav ---- */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-3 space-y-1 lg:sticky lg:top-8">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left transition-all border-0 cursor-pointer ${
                  activeSection === s.key
                    ? "bg-[#FFEFEA] text-[#FF5B26]"
                    : "text-nomichi-ink/70 hover:bg-nomichi-sand/8 hover:text-nomichi-ink"
                }`}
              >
                <s.icon
                  className={`w-[18px] h-[18px] stroke-[2] shrink-0 ${
                    activeSection === s.key ? "text-[#FF5B26]" : "text-nomichi-ink/40"
                  }`}
                />
                <div className="min-w-0">
                  <span className="text-[13px] font-extrabold block leading-tight">{s.label}</span>
                  <span className="text-[10px] font-semibold text-nomichi-ink/40 block leading-tight mt-0.5 truncate">
                    {s.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ---- Right Content ---- */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ================ GENERAL ================ */}
          {activeSection === "general" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <SectionCard title="Language" icon={Languages} subtitle="Choose your preferred language">
                <CustomSelect
                  value={settings.general.language}
                  options={LANGUAGES}
                  open={langOpen}
                  setOpen={(v) => { setLangOpen(v); setTzOpen(false); setCurrOpen(false); }}
                  onChange={(v) => update("general", { language: v })}
                />
              </SectionCard>

              <SectionCard title="Timezone" icon={Clock} subtitle="All dates and times will use this timezone">
                <CustomSelect
                  value={settings.general.timezone}
                  options={TIMEZONES}
                  labelFn={tzLabel}
                  open={tzOpen}
                  setOpen={(v) => { setTzOpen(v); setLangOpen(false); setCurrOpen(false); }}
                  onChange={(v) => update("general", { timezone: v })}
                />
              </SectionCard>

              <SectionCard title="Currency" icon={IndianRupee} subtitle="Default currency for trip prices">
                <CustomSelect
                  value={settings.general.currency}
                  options={CURRENCIES}
                  open={currOpen}
                  setOpen={(v) => { setCurrOpen(v); setLangOpen(false); setTzOpen(false); }}
                  onChange={(v) => update("general", { currency: v })}
                />
              </SectionCard>
            </div>
          )}

          {/* ================ APPEARANCE ================ */}
          {activeSection === "appearance" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <SectionCard title="Theme" icon={Palette} subtitle="Choose how the app looks">
                <div className="grid grid-cols-3 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => update("appearance", { theme: t.value })}
                      className={`relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        settings.appearance.theme === t.value
                          ? "border-[#FF5B26] bg-[#FFEFEA]/40 shadow-sm"
                          : "border-[#e7e1d5]/50 bg-nomichi-white hover:border-[#FF5B26]/30"
                      }`}
                    >
                      {settings.appearance.theme === t.value && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-[#FF5B26] rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        </div>
                      )}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          settings.appearance.theme === t.value
                            ? "bg-[#FF5B26]/10 text-[#FF5B26]"
                            : "bg-nomichi-sand/10 text-nomichi-ink/40"
                        }`}
                      >
                        <t.icon className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-extrabold block">{t.label}</span>
                        <span className="text-[10px] font-semibold text-nomichi-ink/40 mt-0.5 block">{t.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Font Size" icon={Type} subtitle="Adjust text size across the app">
                <div className="flex gap-3">
                  {FONT_SIZES.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => update("appearance", { font_size: f.value })}
                      className={`flex-1 py-3.5 px-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        settings.appearance.font_size === f.value
                          ? "border-[#FF5B26] bg-[#FFEFEA]/40 shadow-sm"
                          : "border-[#e7e1d5]/50 bg-nomichi-white hover:border-[#FF5B26]/30"
                      }`}
                    >
                      <span
                        className={`font-extrabold block ${
                          f.value === "small" ? "text-[11px]" : f.value === "large" ? "text-sm" : "text-xs"
                        }`}
                      >
                        {f.label}
                      </span>
                      <span className="text-[10px] font-semibold text-nomichi-ink/40 block mt-0.5">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Reduce Animations" icon={Monitor} subtitle="Turn off transition effects for performance">
                <ToggleSwitch
                  checked={settings.appearance.reduce_animations}
                  onChange={(v) => update("appearance", { reduce_animations: v })}
                  label={settings.appearance.reduce_animations ? "Animations disabled" : "Animations enabled"}
                />
              </SectionCard>
            </div>
          )}

          {/* ================ PRIVACY & DATA ================ */}
          {activeSection === "privacy" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <SectionCard title="Cookie Preferences" icon={Cookie} subtitle="Control which cookies we use">
                <div className="space-y-2.5">
                  {COOKIE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update("privacy", { cookie_preference: opt.value })}
                      className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                        settings.privacy.cookie_preference === opt.value
                          ? "border-[#FF5B26] bg-[#FFEFEA]/30"
                          : "border-[#e7e1d5]/50 bg-nomichi-white hover:border-[#FF5B26]/30"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          settings.privacy.cookie_preference === opt.value
                            ? "border-[#FF5B26] bg-[#FF5B26]"
                            : "border-[#e7e1d5]"
                        }`}
                      >
                        {settings.privacy.cookie_preference === opt.value && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold block leading-tight">{opt.label}</span>
                        <span className="text-[10px] font-semibold text-nomichi-ink/40 block leading-tight mt-0.5">
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Data Consent" icon={Eye} subtitle="Control how your data is used">
                <div className="space-y-4">
                  <ToggleSwitch
                    checked={settings.privacy.analytics_consent}
                    onChange={(v) => update("privacy", { analytics_consent: v })}
                    label="Usage Analytics"
                    subtitle="Help us improve by sharing anonymous usage data"
                  />
                  <div className="h-px bg-[#e7e1d5]/30" />
                  <ToggleSwitch
                    checked={settings.privacy.marketing_emails}
                    onChange={(v) => update("privacy", { marketing_emails: v })}
                    label="Marketing Emails"
                    subtitle="Receive promotional offers and travel deals"
                  />
                  <div className="h-px bg-[#e7e1d5]/30" />
                  <ToggleSwitch
                    checked={settings.privacy.personalized_recommendations}
                    onChange={(v) => update("privacy", { personalized_recommendations: v })}
                    label="Personalized Recommendations"
                    subtitle="Get trip suggestions based on your preferences"
                  />
                </div>
              </SectionCard>

              <SectionCard title="Your Data" icon={Download} subtitle="Export or delete your account data">
                <div className="space-y-3">
                  <button
                    onClick={handleExportData}
                    disabled={exportingData}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-[#e7e1d5]/50 bg-nomichi-white hover:bg-nomichi-sand/5 transition-all text-left cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#E8F8F0] flex items-center justify-center">
                        {exportingData ? (
                          <Loader2 className="w-4 h-4 text-[#10B981] animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 text-[#10B981] stroke-[2]" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-extrabold block">Export My Data</span>
                        <span className="text-[10px] font-semibold text-nomichi-ink/40 block mt-0.5">
                          Download all your data as JSON
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-nomichi-ink/30" />
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-red-200/60 bg-red-50/30 hover:bg-red-50/60 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-500 stroke-[2]" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-red-600 block">Delete Account</span>
                        <span className="text-[10px] font-semibold text-red-400 block mt-0.5">
                          Permanently remove your account and all data
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-300" />
                  </button>
                </div>
              </SectionCard>

              {/* Delete confirmation modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-nomichi-ink/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/60 p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200 text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-7 h-7 text-red-500 stroke-[2]" />
                    </div>
                    <h3 className="font-display font-extrabold text-lg text-nomichi-ink">Delete Account?</h3>
                    <p className="text-xs text-nomichi-ink/50 font-medium mt-2 leading-relaxed max-w-xs mx-auto">
                      This action is permanent and cannot be undone. All your data, enquiries, and preferences will be
                      permanently deleted.
                    </p>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 border border-[#e7e1d5] rounded-xl text-xs font-extrabold text-nomichi-ink/70 hover:bg-nomichi-sand/10 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                      >
                        Delete Forever
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================ ABOUT ================ */}
          {activeSection === "about" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* App Info */}
              <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#FF5B26] to-[#FF8F6B] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF5B26]/20">
                    <span className="text-white font-display font-black text-lg">N</span>
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-lg text-nomichi-ink leading-none">Nomachi</h3>
                    <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-1">
                      Curated Travel Experiences
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <InfoRow label="Version" value="1.0.0" />
                  <InfoRow label="Account" value={user.email} />
                  <InfoRow label="Member Since" value={new Date().getFullYear().toString()} />
                  <InfoRow label="Platform" value={typeof navigator !== "undefined" ? (navigator.userAgent.includes("Mac") ? "macOS" : navigator.userAgent.includes("Win") ? "Windows" : navigator.userAgent.includes("Linux") ? "Linux" : "Web") : "Web"} />
                </div>
              </div>

              {/* Legal Links */}
              <SectionCard title="Legal" icon={FileText} subtitle="Terms, policies & licenses">
                <div className="space-y-1">
                  {[
                    { label: "Terms of Service", href: "#" },
                    { label: "Privacy Policy", href: "#" },
                    { label: "Cookie Policy", href: "#" },
                    { label: "Refund Policy", href: "#" },
                    { label: "Open Source Licenses", href: "#" },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-nomichi-sand/8 transition-all text-xs font-bold text-nomichi-ink/70 hover:text-nomichi-ink no-underline"
                    >
                      {link.label}
                      <ExternalLink className="w-3.5 h-3.5 text-nomichi-ink/30 stroke-[2]" />
                    </a>
                  ))}
                </div>
              </SectionCard>

              {/* Credits */}
              <div className="bg-gradient-to-br from-[#FFECE5] to-[#FFF6F4] rounded-3xl border border-[#FF5B26]/10 p-6 text-center">
                <p className="text-xs font-bold text-[#FF5B26]/80 leading-relaxed">
                  Made with ❤️ by the Nomachi Team
                </p>
                <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-1.5">
                  © {new Date().getFullYear()} Nomachi Travel Pvt. Ltd. All rights reserved.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Sub‑components                                                     */
/* ================================================================== */

function SectionCard({
  title,
  icon: Icon,
  subtitle,
  children,
}: {
  title: string;
  icon: any;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#FF5B26] stroke-[2]" />
        </div>
        <div>
          <h3 className="font-display font-extrabold text-sm text-nomichi-ink leading-none">{title}</h3>
          <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-1">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CustomSelect({
  value,
  options,
  open,
  setOpen,
  onChange,
  labelFn,
}: {
  value: string;
  options: string[];
  open: boolean;
  setOpen: (v: boolean) => void;
  onChange: (v: string) => void;
  labelFn?: (v: string) => string;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#e7e1d5]/60 bg-nomichi-white hover:border-[#FF5B26]/40 transition-all text-xs font-bold text-nomichi-ink cursor-pointer"
      >
        <span className="truncate">{labelFn ? labelFn(value) : value}</span>
        <ChevronDown
          className={`w-4 h-4 text-nomichi-ink/40 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-nomichi-white rounded-2xl border border-[#e7e1d5]/40 shadow-xl py-1.5 max-h-52 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-left transition-colors cursor-pointer ${
                value === opt
                  ? "bg-[#FFEFEA] text-[#FF5B26] font-extrabold"
                  : "text-nomichi-ink/70 hover:bg-nomichi-sand/8"
              }`}
            >
              {value === opt && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
              <span className={value === opt ? "" : "ml-6"}>{labelFn ? labelFn(opt) : opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  subtitle,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  subtitle?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full text-left cursor-pointer border-0 bg-transparent p-0"
    >
      <div className="min-w-0">
        <span className="text-xs font-extrabold text-nomichi-ink block leading-tight">{label}</span>
        {subtitle && (
          <span className="text-[10px] font-semibold text-nomichi-ink/40 block leading-tight mt-0.5">{subtitle}</span>
        )}
      </div>
      <div
        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ml-4 ${
          checked ? "bg-[#FF5B26]" : "bg-[#e7e1d5]"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#e7e1d5]/20 last:border-0">
      <span className="text-[11px] font-semibold text-nomichi-ink/50">{label}</span>
      <span className="text-[11px] font-extrabold text-nomichi-ink truncate ml-4 max-w-[60%] text-right">{value}</span>
    </div>
  );
}
