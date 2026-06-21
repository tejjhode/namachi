"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notificationService } from "@/services/notification.service";
import { taskService } from "@/services/task.service";
import { 
  Home, 
  Compass, 
  ClipboardList, 
  Map, 
  Heart, 
  MessageSquare, 
  User as UserIcon, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Bell, 
  ChevronDown, 
  Star,
  Search,
  Menu,
  X,
  Plane,
  ShieldCheck,
  Tag,
  Calendar,
  MapPin,
  Headphones,
  Users,
  ChevronRight,
  Send,
  Loader2,
  Info,
  Sparkles,
  Shield,
  Clock,
  Check
} from "lucide-react";

interface TripEnquiryViewProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string;
    phone?: string;
  };
  leads?: any[];
  trip: any;
}

// Helpers for profile name display
function formatFriendlyName(fullName: string): string {
  if (!fullName) return "Traveler";
  let clean = fullName.replace(/^\d+\s*/, "").trim();
  if (!clean) return "Traveler";
  const words = clean.split(/\s+/);
  const lower = clean.toLowerCase();
  
  if (lower.includes("tejaswa")) return "Tejaswa";
  if (lower.includes("tejswa")) return "Tejswa";
  
  const titleCasedWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return titleCasedWords[0];
}

function formatFullName(fullName: string): string {
  if (!fullName) return "Traveler";
  let clean = fullName.replace(/^\d+\s*/, "").trim();
  if (!clean) return "Traveler";
  
  const words = clean.split(/\s+/);
  const titleCasedWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return titleCasedWords.join(" ");
}

export function TripEnquiryView({ user, leads = [], trip }: TripEnquiryViewProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Parse phone number if present
  let initialPhoneCode = "+91";
  let initialPhoneNumber = "";
  if (user.phone) {
    const cleanPhone = user.phone.trim();
    if (cleanPhone.startsWith("+")) {
      if (cleanPhone.startsWith("+91")) {
        initialPhoneCode = "+91";
        initialPhoneNumber = cleanPhone.slice(3).replace(/[\s-]/g, "");
      } else {
        initialPhoneCode = cleanPhone.slice(0, 3);
        initialPhoneNumber = cleanPhone.slice(3).replace(/[\s-]/g, "");
      }
    } else {
      initialPhoneNumber = cleanPhone.replace(/[\s-]/g, "");
    }
  }

  // Form states
  const [fullName, setFullName] = useState(formatFullName(user.fullName));
  const [phoneCode, setPhoneCode] = useState(initialPhoneCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [groupType, setGroupType] = useState("");
  const [preferredMonth, setPreferredMonth] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState("");
  const [hopeFeelsLike, setHopeFeelsLike] = useState("");
  const [anythingElse, setAnythingElse] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Submission / validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const firstName = formatFriendlyName(user.fullName);
  const avatarLetter = firstName.charAt(0).toUpperCase() || "T";

  // Breadcrumbs data
  const isInternational = !trip.destination.toLowerCase().includes("india");
  const categoryLabel = isInternational ? "International" : "Domestic";
  const countryLabel = trip.destination.split(",").pop()?.trim() || "India";

  // Notifications feed count
  const dbMessages: any[] = [];
  leads.forEach(lead => {
    if (lead.lead_notes && Array.isArray(lead.lead_notes)) {
      lead.lead_notes.forEach((note: any) => {
        dbMessages.push(note);
      });
    }
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone Number is required";
    } else if (!/^\d{10}$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = "Please enter a valid 10-digit number";
    }
    if (!groupType) newErrors.groupType = "Please select a group type";
    if (!preferredMonth) newErrors.preferredMonth = "Please select a preferred month";
    if (!numberOfPeople) newErrors.numberOfPeople = "Please select number of people";
    if (!hopeFeelsLike.trim()) newErrors.hopeFeelsLike = "Please tell us what you're hoping for";
    if (!agreeTerms) newErrors.agreeTerms = "You must agree to the Terms & Conditions";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmitError("");
      setSuccess(false);

      let assignedToId: string | null = null;
      let assignedLeaderName = "A Trip Manager";
      try {
        // Query the trip_departures table for this trip
        const { data: departureData } = await supabase
          .from("trip_departures")
          .select("status")
          .eq("trip_id", trip.id)
          .maybeSingle();

        if (departureData && departureData.status) {
          const parsedStatus = JSON.parse(departureData.status);
          const leaderName = parsedStatus.leader;
          if (leaderName && leaderName !== "Select Team Member") {
            assignedLeaderName = leaderName;
            // Find the profile ID of this leader
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id")
              .or(`full_name.eq."${leaderName}",email.eq."${leaderName}"`)
              .maybeSingle();

            if (profileData) {
              assignedToId = profileData.id;
            }
          }
        }
      } catch (err) {
        console.warn("Could not auto-assign trip leader:", err);
      }

      // Insert lead into Supabase
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: fullName,
          email: user.email,
          phone: `${phoneCode} ${phoneNumber.trim()}`,
          group_type: groupType,
          preferred_month: preferredMonth,
          group_size: parseInt(numberOfPeople),
          hope_trip_feels_like: hopeFeelsLike.trim(),
          dietary_and_accessibility: anythingElse.trim(),
          trip_id: trip.id,
          status: "new",
          assigned_to: assignedToId
        })
        .select("id")
        .single();

      if (error) throw error;

      if (data?.id) {
        try {
          await taskService.evaluateLeadWorkflow(data.id);
        } catch (e) {
          console.warn("Failed to generate workflow tasks for new lead:", e);
        }
      }

      // Dispatch notifications
      try {
        await notificationService.notifyTraveler(
          user.email,
          "We've received your enquiry 🌍",
          "Your enquiry has been received.",
          "Enquiry Submitted",
          data?.id || null,
          "Medium"
        );

        await notificationService.notifyAdmins(
          `🚨 New Enquiry Received – ${trip.title}`,
          `${fullName} submitted an enquiry for "${trip.title}".`,
          "New Enquiry",
          data?.id || null,
          "Medium"
        );

        if (assignedToId) {
          await notificationService.notifyManager(
            assignedToId,
            `New Lead Assigned – ${fullName}`,
            `New lead "${fullName}" for "${trip.title}" has been assigned to you.`,
            "Lead Assigned",
            data?.id || null,
            "Medium"
          );

          await notificationService.notifyTraveler(
            user.email,
            "Manager Assigned",
            `${assignedLeaderName} has been assigned to assist you.`,
            "Manager Assigned",
            data?.id || null,
            "Medium"
          );
        }
      } catch (notifErr) {
        console.error("Failed to send notifications:", notifErr);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/?view=enquiries");
      }, 2000);
    } catch (err: any) {
      console.error("Failed to submit enquiry:", err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Pre-seed some months options (upcoming 6 months)
  const getMonthsOptions = () => {
    const options = [];
    const date = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 6; i++) {
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + i + 1, 1);
      const label = `${months[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
      options.push(label);
    }
    return options;
  };

  return (
    <div className="h-screen bg-[#FAF8F4] font-sans antialiased text-nomichi-ink flex w-full overflow-hidden">
      
      {/* 1. LEFT SIDEBAR (Locked in position) */}
      <aside className="w-[280px] h-screen bg-nomichi-white border-r border-[#e7e1d5]/50 hidden xl:flex flex-col justify-between shrink-0 p-6 sticky top-0">
        <div className="space-y-8 flex-grow">
          {/* Logo Section */}
          <div className="flex flex-col items-start px-2">
            <img src="/logo.png" alt="Nomichi Logo" className="h-10 w-auto object-contain" />
            <span className="text-[10px] font-bold text-nomichi-sand tracking-[0.25em] uppercase mt-2.5">
              Wander • Connect • Belong
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => router.push("/?view=home")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-all"
            >
              <Home className="w-5 h-5 stroke-[2px]" />
              Home
            </button>
            <button 
              onClick={() => router.push("/?view=explore")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-all"
            >
              <Compass className="w-5 h-5 stroke-[2px]" />
              Explore Trips
            </button>
            <button 
              onClick={() => router.push("/?view=enquiries")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-all"
            >
              <ClipboardList className="w-5 h-5 stroke-[2px]" />
              My Enquiries
            </button>
            <button 
              onClick={() => router.push("/?view=journeys")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-all"
            >
              <Map className="w-5 h-5 stroke-[2px]" />
              My Journeys
            </button>
            <button 
              onClick={() => router.push("/?view=wishlist")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-all"
            >
              <Heart className="w-5 h-5 stroke-[2px]" />
              Wishlist
            </button>
            <button 
              onClick={() => router.push("/?view=enquiries")}
              className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-left rounded-2xl w-full text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-all"
            >
              <span className="flex items-center gap-3.5">
                <MessageSquare className="w-5 h-5 stroke-[2px]" />
                Messages
              </span>
              {dbMessages.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-nomichi-rust text-nomichi-white text-[10px] font-bold flex items-center justify-center">
                  {dbMessages.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => router.push("/?view=home")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust rounded-2xl w-full text-left transition-all"
            >
              <UserIcon className="w-5 h-5 stroke-[2px]" />
              Profile
            </button>
            <button 
              onClick={() => router.push("/?view=home")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust rounded-2xl w-full text-left transition-all"
            >
              <Settings className="w-5 h-5 stroke-[2px]" />
              Settings
            </button>
          </nav>
        </div>

        {/* Bottom fixed area */}
        <div className="space-y-4 pt-6 border-t border-[#e7e1d5]/50 mt-6">
          <nav className="space-y-1">
            <button 
              onClick={() => router.push("/?view=home")}
              className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust rounded-2xl w-full text-left transition-all"
            >
              <HelpCircle className="w-5 h-5 stroke-[2px]" />
              Help & Support
            </button>
            <a href="/auth/signout" className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-rust hover:bg-nomichi-rust/5 rounded-2xl transition-all">
              <LogOut className="w-5 h-5 stroke-[2.2px]" />
              Logout
            </a>
          </nav>

          {/* Refer Promo Card */}
          <div className="bg-gradient-to-br from-[#FFECE5] to-[#FFF6F4] rounded-2xl p-5 border border-[#FF5B26]/15 relative overflow-hidden flex flex-col justify-between h-[170px] shadow-sm">
            <img 
              src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=250&q=80" 
              alt="Refer background" 
              className="absolute inset-0 w-full h-full object-cover brightness-95 opacity-20 mix-blend-overlay pointer-events-none"
            />
            <div className="absolute top-[-15px] right-[-15px] w-20 h-20 bg-[#FF5B26]/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="relative z-10 space-y-1">
              <h4 className="text-xs font-extrabold text-[#FF5B26] tracking-tight">Refer & Travel Together</h4>
              <p className="text-[10px] text-nomichi-ink/65 leading-relaxed font-bold">
                Invite friends for rewards.
              </p>
            </div>
            <button className="bg-white hover:bg-nomichi-rust/5 text-[#FF5B26] border border-[#FF5B26]/30 text-[10px] font-extrabold py-2 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 relative z-10 w-fit shadow-sm">
              Invite Now →
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-nomichi-white border-b border-nomichi-sand/10 px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 xl:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 hover:bg-nomichi-sand/10 rounded-lg text-nomichi-ink focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <img src="/logo.png" alt="Nomichi Logo" className="h-8 w-auto object-contain" />
          </div>

          {/* Centered search input */}
          <div className="hidden xl:flex items-center gap-2.5 bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-1.5 w-80 max-w-md">
            <Search className="w-4 h-4 text-nomichi-ink/40" />
            <input 
              type="text" 
              placeholder="Search destinations, trips..." 
              className="bg-transparent text-xs font-semibold text-nomichi-ink placeholder-nomichi-ink/45 focus:outline-none w-full"
              readOnly
            />
            <span className="text-[10px] font-bold text-nomichi-ink/35 bg-nomichi-white border border-[#e7e1d5]/60 px-1.5 py-0.5 rounded-md shrink-0">
              ⌘ K
            </span>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-5.5 ml-auto xl:ml-0">
            {/* Notifications */}
            <button aria-label="Notifications" className="relative p-2 text-nomichi-ink/70 hover:text-nomichi-rust hover:bg-[#FAF8F4] rounded-full transition-all border border-[#e7e1d5]/60 bg-[#FFFFFF] shrink-0">
              <Bell className="w-5 h-5 stroke-[1.8px]" />
              {dbMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-nomichi-rust rounded-full text-[9px] font-extrabold flex items-center justify-center text-nomichi-white shadow-sm">
                  {dbMessages.length}
                </span>
              )}
            </button>

            {/* Profile Avatar / Dropdown */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/10 flex items-center justify-center font-bold text-sm shrink-0">
                {avatarLetter}
              </div>
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-nomichi-ink leading-none mb-0.5">
                  {formatFullName(user.fullName)}
                </span>
                <span className="text-[10px] font-semibold text-nomichi-ink/50 leading-none">
                  Explorer Member
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-nomichi-ink/50" />
            </div>
          </div>
        </header>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-nomichi-white border-b border-nomichi-sand/15 p-5 space-y-4 absolute top-[68px] left-0 w-full z-40 shadow-xl transition-all">
            <nav className="flex flex-col gap-3 font-semibold text-sm">
              <button 
                onClick={() => router.push("/?view=home")}
                className="px-3 py-2.5 rounded-xl flex items-center gap-3 text-left w-full text-nomichi-ink/70"
              >
                <Home className="w-4.5 h-4.5" /> Home
              </button>
              <button 
                onClick={() => router.push("/?view=explore")}
                className="px-3 py-2.5 rounded-xl flex items-center gap-3 text-left w-full text-nomichi-ink/70"
              >
                <Compass className="w-4.5 h-4.5" /> Explore Trips
              </button>
              <button 
                onClick={() => router.push("/?view=enquiries")}
                className="px-3 py-2.5 rounded-xl flex items-center gap-3 text-left w-full text-nomichi-ink/70"
              >
                <ClipboardList className="w-4.5 h-4.5" /> My Enquiries
              </button>
              <a href="/auth/signout" className="px-3 py-2.5 rounded-xl text-nomichi-rust flex items-center gap-3 font-bold text-left">
                <LogOut className="w-4.5 h-4.5" /> Logout
              </a>
            </nav>
          </div>
        )}

        {/* 3. MAIN FORM CONTENT */}
        <div className="p-6 lg:p-8 space-y-8 max-w-[1300px] w-full mx-auto flex-grow">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-nomichi-ink/40 uppercase tracking-wider">
            <span className="cursor-pointer hover:text-nomichi-rust" onClick={() => router.push("/?view=explore")}>Explore Trips</span>
            <ChevronRight className="w-3 h-3" />
            <span>{categoryLabel}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="cursor-pointer hover:text-nomichi-rust" onClick={() => router.push(`/trips/${trip.id}`)}>{trip.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-nomichi-ink">Enquire Now</span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight">Enquire Now</h1>
            <p className="text-xs text-nomichi-ink/50 font-semibold">Share your details and we'll get back to you shortly.</p>
          </div>

          {/* Security Banner Card */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#e7e1d5]/50 p-5 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Item 1 */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-nomichi-ink leading-tight">Your information is secure</h4>
                  <p className="text-[10px] text-nomichi-ink/50 leading-none font-bold">We never share your data</p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                  <Clock className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-nomichi-ink leading-tight">Quick response</h4>
                  <p className="text-[10px] text-nomichi-ink/50 leading-none font-bold">We'll get back within 24 hours</p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                  <Headphones className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-nomichi-ink leading-tight">Need help?</h4>
                  <p className="text-[10px] text-nomichi-ink/50 leading-none font-bold">Talk to our travel expert</p>
                </div>
              </div>

            </div>
          </div>

          {/* Grid Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Main Form Column */}
            <form onSubmit={handleSubmit} className="lg:col-span-9 space-y-8">
              
              {/* Your Details */}
              <div className="bg-nomichi-white border border-[#e7e1d5]/40 rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
                <h3 className="text-sm font-extrabold text-nomichi-ink tracking-tight border-b border-[#e7e1d5]/30 pb-3">Your Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Full Name <span className="text-[#FF5B26]">*</span></label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name" 
                      className={`w-full bg-[#FAF8F4] border ${errors.fullName ? "border-red-500" : "border-[#e7e1d5]/80"} rounded-xl px-4 py-3 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26]`}
                    />
                    {errors.fullName && <p className="text-[10px] font-bold text-red-500">{errors.fullName}</p>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Phone Number <span className="text-[#FF5B26]">*</span></label>
                    <div className="flex gap-2">
                      <select 
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        className="bg-[#FAF8F4] border border-[#e7e1d5]/80 rounded-xl px-2 py-3 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] shrink-0"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+81">🇯🇵 +81</option>
                      </select>
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="Enter 10 digit number" 
                        className={`w-full bg-[#FAF8F4] border ${errors.phoneNumber ? "border-red-500" : "border-[#e7e1d5]/80"} rounded-xl px-4 py-3 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26]`}
                      />
                    </div>
                    {errors.phoneNumber && <p className="text-[10px] font-bold text-red-500">{errors.phoneNumber}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Email Address <span className="text-[#FF5B26]">*</span></label>
                    <input 
                      type="email" 
                      value={user.email}
                      readOnly
                      placeholder="Enter your email" 
                      className="w-full bg-[#FAF8F4]/50 border border-[#e7e1d5]/40 rounded-xl px-4 py-3 text-xs font-semibold text-nomichi-ink/50 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div className="bg-nomichi-white border border-[#e7e1d5]/40 rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
                <h3 className="text-sm font-extrabold text-nomichi-ink tracking-tight border-b border-[#e7e1d5]/30 pb-3">Trip Details</h3>

                {/* Inline Selected Trip Summary Card */}
                <div className="bg-[#FAF8F4] border border-[#e7e1d5]/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <img 
                      src={trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=200&q=80"} 
                      alt={trip.title} 
                      className="w-24 h-16 object-cover rounded-xl shrink-0 shadow-xs"
                    />
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-display font-extrabold text-sm text-nomichi-ink truncate">{trip.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wide">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-nomichi-rust" />
                          {trip.start_date ? new Date(trip.start_date).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "Flexible Dates"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-nomichi-rust" />
                          {trip.duration || "7 Days"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-nomichi-rust" />
                          {trip.destination}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => router.push(`/trips/${trip.id}`)}
                    className="border border-[#FF5B26]/30 hover:bg-[#FFEFEA]/40 text-[#FF5B26] bg-white rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition-colors shrink-0"
                  >
                    Change Trip
                  </button>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Group Type */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Group Type <span className="text-[#FF5B26]">*</span></label>
                    <select 
                      value={groupType}
                      onChange={(e) => setGroupType(e.target.value)}
                      className={`w-full bg-[#FAF8F4] border ${errors.groupType ? "border-red-500" : "border-[#e7e1d5]/80"} rounded-xl px-3 py-3 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26]`}
                    >
                      <option value="">Select group type</option>
                      <option value="Solo">Solo Traveler</option>
                      <option value="Friends">With Friends</option>
                      <option value="Couple">As a Couple</option>
                      <option value="Family">With Family</option>
                    </select>
                    {errors.groupType && <p className="text-[10px] font-bold text-red-500">{errors.groupType}</p>}
                  </div>

                  {/* Preferred Month */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Preferred Month <span className="text-[#FF5B26]">*</span></label>
                    <select 
                      value={preferredMonth}
                      onChange={(e) => setPreferredMonth(e.target.value)}
                      className={`w-full bg-[#FAF8F4] border ${errors.preferredMonth ? "border-red-500" : "border-[#e7e1d5]/80"} rounded-xl px-3 py-3 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26]`}
                    >
                      <option value="">Select preferred month</option>
                      {getMonthsOptions().map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {errors.preferredMonth && <p className="text-[10px] font-bold text-red-500">{errors.preferredMonth}</p>}
                  </div>

                  {/* Number of People */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Number of People <span className="text-[#FF5B26]">*</span></label>
                    <select 
                      value={numberOfPeople}
                      onChange={(e) => setNumberOfPeople(e.target.value)}
                      className={`w-full bg-[#FAF8F4] border ${errors.numberOfPeople ? "border-red-500" : "border-[#e7e1d5]/80"} rounded-xl px-3 py-3 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26]`}
                    >
                      <option value="">Select number of people</option>
                      <option value="1">1 Person</option>
                      <option value="2">2 People</option>
                      <option value="3">3 People</option>
                      <option value="4">4 People</option>
                      <option value="5">5+ People</option>
                    </select>
                    {errors.numberOfPeople && <p className="text-[10px] font-bold text-red-500">{errors.numberOfPeople}</p>}
                  </div>

                </div>

                {/* Textarea 1: What hoping feels like */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">What are you hoping this trip feels like? <span className="text-[#FF5B26]">*</span></label>
                    <span className="text-[9px] font-bold text-nomichi-ink/35">{hopeFeelsLike.length}/500</span>
                  </div>
                  <textarea 
                    value={hopeFeelsLike}
                    onChange={(e) => setHopeFeelsLike(e.target.value.slice(0, 500))}
                    placeholder="Tell us about your travel style, expectations, and what excites you most about this trip..."
                    rows={4}
                    className={`w-full bg-[#FAF8F4] border ${errors.hopeFeelsLike ? "border-red-500" : "border-[#e7e1d5]/80"} rounded-xl p-4 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] resize-none`}
                  />
                  {errors.hopeFeelsLike && <p className="text-[10px] font-bold text-red-500">{errors.hopeFeelsLike}</p>}
                </div>

                {/* Textarea 2: Anything else */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Anything else we should know?</label>
                    <span className="text-[9px] font-bold text-nomichi-ink/35">{anythingElse.length}/300</span>
                  </div>
                  <textarea 
                    value={anythingElse}
                    onChange={(e) => setAnythingElse(e.target.value.slice(0, 300))}
                    placeholder="Dietary preferences, accessibility needs, special occasions, etc. (Optional)"
                    rows={3}
                    className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/80 rounded-xl p-4 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] resize-none"
                  />
                </div>
              </div>

              {/* Submit panel */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <label className="flex items-start gap-2.5 text-xs font-bold text-nomichi-ink/65 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-[#e7e1d5]/85 text-[#FF5B26] focus:ring-[#FF5B26]/30 accent-[#FF5B26] w-4 h-4 cursor-pointer"
                  />
                  <span>
                    I agree to Nomichi's <a href="#" className="text-[#FF5B26] hover:underline">Terms & Conditions</a> and <a href="#" className="text-[#FF5B26] hover:underline">Privacy Policy</a>
                  </span>
                </label>

                <button 
                  type="submit"
                  disabled={submitting || success}
                  className="bg-[#FF5B26] hover:bg-[#b04b1e] text-nomichi-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Enquiry
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Feedback Notifications */}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Enquiry submitted successfully! Redirecting you to enquiries dashboard...</span>
                </div>
              )}
              {submitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-300">
                  <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

            </form>

            {/* Right Summary Column (Col Span 3) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Trip Summary Panel */}
              <div className="bg-nomichi-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5">
                <div className="space-y-3.5">
                  <span className="block text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider">Trip Summary</span>
                  
                  {/* Summary Card Details */}
                  <div className="space-y-4">
                    <img 
                      src={trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80"} 
                      alt={trip.title} 
                      className="w-full h-36 object-cover rounded-xl shadow-xs"
                    />
                    <div className="space-y-1">
                      <h4 className="font-display font-extrabold text-sm text-nomichi-ink leading-tight">{trip.title}</h4>
                      <p className="text-[10px] text-nomichi-ink/50 font-bold flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-nomichi-rust" />
                        {trip.destination}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Spans facts lists */}
                <div className="space-y-3 pt-3 border-t border-[#e7e1d5]/30 text-xs font-bold text-nomichi-ink/65">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-nomichi-ink/35" />
                    <span>{trip.start_date ? new Date(trip.start_date).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "Flexible Dates"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-nomichi-ink/35" />
                    <span>{trip.duration || "7 Days"} / {trip.duration ? (parseInt(trip.duration) - 1) + " Nights" : "6 Nights"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-nomichi-ink/35" />
                    <span>{trip.group_size || "Small Group (8-12)"}</span>
                  </div>
                </div>

                {/* Price block */}
                <div className="pt-4 border-t border-[#e7e1d5]/30 space-y-1">
                  <span className="block text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider">Price (per person)</span>
                  <div className="flex flex-col">
                    <span className="text-2xl font-extrabold text-[#FF5B26]">
                      {trip.price ? `₹${Number(trip.price).toLocaleString("en-IN")}` : "₹89,999"}
                    </span>
                    <span className="text-[9px] font-semibold text-nomichi-ink/40">Inclusive of all taxes (GST)</span>
                  </div>
                </div>

                {/* Seats Progress Block */}
                <div className="bg-[#FAF8F4] border border-[#e7e1d5]/55 rounded-2xl p-4.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Seats Available
                    </span>
                    <span className="text-nomichi-ink/60">{trip.seats_left || 6} seats left</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-[#e7e1d5]/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${((trip.total_seats - trip.seats_left) / trip.total_seats) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Have Questions Widget */}
                <div className="pt-4 border-t border-[#e7e1d5]/30 space-y-3.5">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-extrabold text-nomichi-ink">Have questions?</h5>
                    <p className="text-[10px] text-nomichi-ink/50 font-bold leading-normal">Our travel experts are here to help you plan the perfect journey.</p>
                  </div>

                  {/* Avatars */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2.5 overflow-hidden">
                      <img className="inline-block h-7.5 w-7.5 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80" alt="Exp 1" />
                      <img className="inline-block h-7.5 w-7.5 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80" alt="Exp 2" />
                      <img className="inline-block h-7.5 w-7.5 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80" alt="Exp 3" />
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => router.push("/?view=enquiries")}
                    className="w-full bg-white hover:bg-[#FAF8F4] text-nomichi-ink border border-[#e7e1d5]/80 text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-nomichi-rust" />
                    Contact Expert
                  </button>
                  
                  <span className="block text-center text-[9px] font-bold text-nomichi-ink/35 pt-1">We typically respond within 2 hours</span>
                </div>

              </div>

            </div>

          </div>

          {/* 4. TRUST FOOTER */}
          <div className="bg-[#F5F1E8] rounded-[24px] border border-[#e7e1d5]/50 p-6 lg:p-8 shadow-sm mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                  <Compass className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-nomichi-ink">Expertly Curated</h4>
                  <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                    Hand-crafted journeys designed by local experts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-nomichi-ink">Trusted & Secure</h4>
                  <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                    100% verified experiences and secure booking guarantee.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                  <Headphones className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-nomichi-ink">24/7 Support</h4>
                  <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                    Travel support team always by your side, anywhere.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                  <Tag className="w-5 h-5 stroke-[2px]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-nomichi-ink">Best Price Promise</h4>
                  <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                    Premium experiences at guaranteed transparent pricing.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
