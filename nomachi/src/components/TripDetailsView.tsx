"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  Share2,
  Check,
  ChevronRight,
  Send,
  Loader2,
  Info,
  Sparkles,
  Clock
} from "lucide-react";

interface TripDetailsViewProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  leads?: any[];
  trip: any;
}

// Name formatter helpers
function formatFriendlyName(fullName: string): string {
  if (!fullName) return "Traveler";
  let clean = fullName.replace(/^\d+\s*/, "").trim();
  if (!clean) return "Traveler";
  const words = clean.split(/\s+/);
  const lower = clean.toLowerCase();
  
  if (lower.includes("tejaswa")) return "Tejaswa";
  if (lower.includes("tejswa")) return "Tejswa";
  
  const titleCasedWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  if (titleCasedWords.length > 1 && titleCasedWords[1].length > 2) {
    return titleCasedWords[1];
  }
  return titleCasedWords[0];
}

function formatFullName(fullName: string): string {
  if (!fullName) return "Traveler";
  let clean = fullName.replace(/^\d+\s*/, "").trim();
  if (!clean) return "Traveler";
  
  const words = clean.split(/\s+/);
  const titleCasedWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  
  if (titleCasedWords.length >= 2) {
    const w0 = titleCasedWords[0];
    const w1 = titleCasedWords[1];
    if (w0.toLowerCase().includes("tejaswa") || w0.toLowerCase().includes("tejswa")) {
      return `${w0} ${w1}`;
    }
    if (w1.toLowerCase().includes("tejaswa") || w1.toLowerCase().includes("tejswa")) {
      return `${w1} ${w0}`;
    }
    return `${w1} ${w0}`;
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function TripDetailsView({ user, leads = [], trip }: TripDetailsViewProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "itinerary" | "inclusions" | "exclusions" | "accommodation" | "faqs" | "reviews">("overview");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  
  // Wishlist state
  const [wishlisted, setWishlisted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Enquiry state
  const [enquiring, setEnquiring] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");

  const firstName = formatFriendlyName(user.fullName);
  const avatarLetter = firstName.charAt(0).toUpperCase() || "T";

  // Fetch current user id
  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setCurrentUserId(data.user.id);
      }
    };
    fetchUserId();
  }, []);

  // Load wishlist state from database if logged in, else localStorage
  useEffect(() => {
    const loadWishlistStatus = async () => {
      if (currentUserId) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("wishlist")
          .eq("id", currentUserId)
          .maybeSingle();
        if (!error && profile?.wishlist) {
          setWishlisted(profile.wishlist.includes(trip.id));
          return;
        }
      }

      // Fallback
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("nomichi_wishlist");
        if (saved) {
          const list = JSON.parse(saved);
          setWishlisted(list.includes(trip.id));
        }
      }
    };

    loadWishlistStatus();
  }, [currentUserId, trip.id]);

  const toggleWishlist = async () => {
    let list: string[] = [];

    // Fallback localStorage path
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nomichi_wishlist");
      list = saved ? JSON.parse(saved) : [];
    }

    const isCurrentlyWishlisted = list.includes(trip.id);
    let updatedList: string[] = [];

    if (currentUserId) {
      // Fetch fresh database list
      const { data: profile } = await supabase
        .from("profiles")
        .select("wishlist")
        .eq("id", currentUserId)
        .maybeSingle();
      
      const dbList = profile?.wishlist || [];
      const dbWishlisted = dbList.includes(trip.id);
      
      updatedList = dbWishlisted
        ? dbList.filter((id: string) => id !== trip.id)
        : [...dbList, trip.id];
      
      setWishlisted(!dbWishlisted);
      
      // Update DB
      await supabase
        .from("profiles")
        .update({ wishlist: updatedList })
        .eq("id", currentUserId);
    } else {
      // LocalStorage toggle
      updatedList = isCurrentlyWishlisted
        ? list.filter((id: string) => id !== trip.id)
        : [...list, trip.id];
      
      setWishlisted(!isCurrentlyWishlisted);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("nomichi_wishlist", JSON.stringify(updatedList));
    }
  };

  const handleEnquiry = async () => {
    try {
      setEnquiring(true);
      setEnquiryError("");
      setEnquirySuccess(false);

      // Check if lead already exists for this trip
      const alreadyEnquired = leads.some(lead => lead.trip_id === trip.id && (lead.status === 'new' || lead.status === 'contacted'));
      if (alreadyEnquired) {
        setEnquiryError("You have already submitted an enquiry for this trip!");
        setEnquiring(false);
        return;
      }

      // Insert new lead row linked to trip
      const { error } = await supabase
        .from("leads")
        .insert({
          name: formatFullName(user.fullName),
          email: user.email,
          status: "new",
          trip_id: trip.id
        });

      if (error) throw error;

      setEnquirySuccess(true);
      
      // Optional: Redirect to My Enquiries view after delay
      setTimeout(() => {
        router.push("/?view=enquiries");
      }, 2000);
    } catch (err: any) {
      console.error("Enquiry failed:", err);
      setEnquiryError(err.message || "Something went wrong. Please try again.");
    } finally {
      setEnquiring(false);
    }
  };

  const shareTrip = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert("Trip link copied to clipboard!");
    }
  };

  // Determine breadcrumb dynamic values
  const isInternational = !trip.destination.toLowerCase().includes("india");
  const categoryLabel = isInternational ? "International" : "Domestic";
  const countryLabel = trip.destination.split(",").pop()?.trim() || "India";

  // Messages count for notification bell badge
  const dbMessages: any[] = [];
  leads.forEach(lead => {
    if (lead.lead_notes && Array.isArray(lead.lead_notes)) {
      lead.lead_notes.forEach((note: any) => {
        dbMessages.push(note);
      });
    }
  });

  const fallbackGalleryImages = [
    trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
  ];

  const galleryImages = Array.from(
    new Set(
      [trip.image_url, ...(Array.isArray(trip.images) ? trip.images : [])]
        .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
    )
  );

  const resolvedGalleryImages = galleryImages.length > 0 ? galleryImages : fallbackGalleryImages;
  const selectedImage = resolvedGalleryImages[Math.min(activeImageIndex, resolvedGalleryImages.length - 1)] || fallbackGalleryImages[0];
  const visibleThumbnails = resolvedGalleryImages.slice(1, 4);
  const remainingImageCount = Math.max(resolvedGalleryImages.length - 4, 0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [trip.id, trip.image_url, trip.images]);

  // Itinerary fallback template if null
  const itineraryDays = trip.itinerary || [
    { day: 1, title: "Arrival & Welcome", description: "Arrive at the destination airport. Our tour guide will meet you and transfer you to the hotel. Join us for a special group welcome dinner." },
    { day: 2, title: "Explore Local Highlights", description: "Spend the day visiting historical landmarks, natural wonders, and exploring the culture with our expert guide." },
    { day: 3, title: "Free Exploration & Adventures", description: "A free day to walk around, shop, try local cuisines, or choose from one of our optional excursions." },
    { day: 4, title: "Farewell & Departure", description: "Enjoy breakfast, check out of your hotel, and take your private transfer back to the airport for your flight home." }
  ];

  // Inclusions/Exclusions fallbacks
  const inclusionsList = trip.inclusions || ["Premium boutique hotel stay", "Daily breakfast & dinners", "Entrance fees to attractions", "Private airport transfers"];
  const exclusionsList = trip.exclusions || ["International flight bookings", "Personal expenses", "Optional tour excursions", "Travel insurance cover"];

  // FAQs fallbacks
  const faqsList = trip.faqs || [
    { question: "What is the group size?", answer: "Our group size is kept small, between 8 to 12 travelers, to maintain an intimate and flexible experience." },
    { question: "Are flights included?", answer: "No, international flights to and from the destination are not included in the trip price." }
  ];

  // Accommodation fallback
  const accommodationDetails = trip.accommodation || "Hand-picked premium 4-star boutique hotels located near cultural city centers.";

  // Trip facts items
  const quickFacts = [
    { label: "Trip Style", value: trip.trip_style || "Small Group, Cultural", icon: Plane },
    { label: "Difficulty", value: trip.difficulty || "Easy", icon: Compass },
    { label: "Best For", value: trip.best_for || "Solo, Friends, Couples", icon: Users },
    { label: "Age Group", value: trip.age_group || "18+", icon: Calendar },
    { label: "Meals", value: trip.meals || "Breakfast Included", icon: Tag }
  ];

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
            {user.email && (
              <>
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
              </>
            )}
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
            {user.email ? (
              <a href="/auth/signout" className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-rust hover:bg-nomichi-rust/5 rounded-2xl transition-all">
                <LogOut className="w-5 h-5 stroke-[2.2px]" />
                Logout
              </a>
            ) : (
              <button 
                onClick={() => router.push("/login")}
                className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-rust hover:bg-nomichi-rust/5 rounded-2xl w-full text-left transition-all"
              >
                <LogOut className="w-5 h-5 stroke-[2.2px] rotate-180" />
                Log In
              </button>
            )}
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

          {/* Centered search input matching layout */}
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
            {user.email ? (
              <>
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
              </>
            ) : (
              <button 
                onClick={() => router.push("/login")}
                className="bg-[#FF5B26] hover:bg-[#b04b1e] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full transition-all shrink-0"
              >
                Log In
              </button>
            )}
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
              <div className="h-px bg-[#e7e1d5]/40 my-2" />
              <div className="flex flex-col gap-3.5 pl-3 pt-1">
                <button onClick={() => router.push("/?view=explore")} className="hover:text-[#FF5B26] font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70">Destinations</button>
                <button onClick={() => router.push("/?view=explore")} className="hover:text-[#FF5B26] font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70">Trips</button>
                <button onClick={() => router.push("/?view=home")} className="hover:text-[#FF5B26] font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70">About Us</button>
                <button onClick={() => router.push("/?view=home")} className="hover:text-[#FF5B26] font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70">How It Works</button>
                <button onClick={() => router.push("/?view=home")} className="hover:text-[#FF5B26] font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70">Community</button>
                <button onClick={() => router.push("/?view=home")} className="hover:text-[#FF5B26] font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70">Blog</button>
              </div>
            </nav>
          </div>
        )}

        {/* 3. TRIP DETAIL PAGE CONTENT LAYOUT */}
        <div className="p-6 lg:p-8 space-y-8 max-w-[1300px] w-full mx-auto flex-grow">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-nomichi-ink/40 uppercase tracking-wider">
            <span className="cursor-pointer hover:text-nomichi-rust" onClick={() => router.push("/?view=explore")}>Explore Trips</span>
            <ChevronRight className="w-3 h-3" />
            <span>{categoryLabel}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-nomichi-ink">{countryLabel}</span>
          </div>

          {/* Title Header with Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2.5">
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-nomichi-ink tracking-tight">
                {trip.title}
              </h1>
              {/* Fact Tags row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-nomichi-ink/65">
                <span className="flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-4 h-4 text-nomichi-ink/35 shrink-0" />
                  {trip.destination}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-4 h-4 text-nomichi-ink/35 shrink-0" />
                  {trip.start_date ? new Date(trip.start_date).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "Flexible Dates"}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Clock className="w-4 h-4 text-nomichi-ink/35 shrink-0" />
                  {trip.duration || "7 Days"}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Users className="w-4 h-4 text-nomichi-ink/35 shrink-0" />
                  {trip.group_size || "Small Group (8-12)"}
                </span>
              </div>
            </div>

            {/* Save & Share */}
            <div className="flex items-center gap-2.5">
              <button 
                onClick={toggleWishlist}
                className="bg-nomichi-white border border-[#e7e1d5]/60 hover:bg-[#FAF8F4] text-nomichi-ink rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <Heart className={`w-4 h-4 ${wishlisted ? "fill-current text-[#FF5B26]" : "text-nomichi-ink/60"}`} />
                {wishlisted ? "Saved" : "Save"}
              </button>
              <button 
                onClick={shareTrip}
                className="bg-nomichi-white border border-[#e7e1d5]/60 hover:bg-[#FAF8F4] text-nomichi-ink rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <Share2 className="w-4 h-4 text-nomichi-ink/60" />
                Share
              </button>
            </div>
          </div>

          {/* Grid Layout: Main Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Content Area (Col Span 9) */}
            <div className="lg:col-span-9 space-y-8">
              
              {/* Gallery Image Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Main Large Image */}
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="md:col-span-3 h-80 md:h-[368px] relative rounded-[24px] overflow-hidden shadow-sm group text-left"
                >
                  <img 
                    src={selectedImage}
                    alt={trip.title} 
                    className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 bg-[#1C1B1A]/85 text-[#FAF8F4] text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-sm flex items-center gap-1.5 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#FF5B26] fill-[#FF5B26]" /> Bestseller
                  </span>
                </button>
                {/* 3 Secondary Stacked Images */}
                <div className="md:col-span-1 flex flex-row md:flex-col gap-4 h-24 md:h-[368px]">
                  {visibleThumbnails.map((imgUrl: string, idx: number) => {
                    const actualIndex = idx + 1;
                    const showRemainingOverlay = idx === visibleThumbnails.length - 1 && remainingImageCount > 0;
                    return (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(actualIndex);
                          if (showRemainingOverlay) {
                            setGalleryOpen(true);
                          }
                        }}
                        className={`relative rounded-[18px] overflow-hidden flex-1 h-full shadow-sm group cursor-pointer text-left ${
                          actualIndex === activeImageIndex ? "ring-2 ring-[#FF5B26] ring-offset-2 ring-offset-[#FAF8F4]" : ""
                        }`}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`${trip.title} gallery image ${actualIndex + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {showRemainingOverlay && (
                          <div className="absolute inset-0 bg-[#1C1B1A]/60 flex flex-col items-center justify-center text-nomichi-white">
                            <span className="text-base font-extrabold">+{remainingImageCount}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">More</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {galleryOpen && (
                <div className="fixed inset-0 z-50 bg-[#1C1B1A]/85 backdrop-blur-sm p-4 md:p-8">
                  <div className="mx-auto flex h-full max-w-6xl flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="text-nomichi-white">
                        <p className="text-sm font-bold">{trip.title}</p>
                        <p className="text-xs font-semibold text-nomichi-white/70">
                          {activeImageIndex + 1} / {resolvedGalleryImages.length}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGalleryOpen(false)}
                        className="rounded-full bg-white/10 p-2 text-nomichi-white transition hover:bg-white/20"
                        aria-label="Close gallery"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] bg-black/20">
                      <img
                        src={selectedImage}
                        alt={trip.title}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 overflow-x-auto md:grid-cols-6">
                      {resolvedGalleryImages.map((imgUrl: string, idx: number) => (
                        <button
                          key={`${imgUrl}-${idx}-modal`}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative h-24 overflow-hidden rounded-2xl border transition ${
                            idx === activeImageIndex
                              ? "border-[#FF5B26] ring-2 ring-[#FF5B26]/40"
                              : "border-white/10 hover:border-white/40"
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`${trip.title} gallery thumbnail ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs Section */}
              <div className="bg-nomichi-white rounded-[24px] border border-[#e7e1d5]/45 shadow-sm overflow-hidden">
                {/* Tab buttons bar */}
                <div className="flex border-b border-[#e7e1d5]/40 overflow-x-auto scrollbar-none">
                  {(["overview", "itinerary", "inclusions", "exclusions", "accommodation", "faqs"] as const).map((tab) => {
                    const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative shrink-0 ${isActive ? "border-nomichi-rust text-nomichi-rust bg-[#FAF8F4]/20" : "border-transparent text-nomichi-ink/50 hover:text-nomichi-rust"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content body */}
                <div className="p-6 md:p-8 space-y-6">
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      <p className="text-sm font-medium text-nomichi-ink/75 leading-relaxed">
                        {trip.description}
                      </p>
                      
                      {/* Fact grid cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 pt-6 border-t border-[#e7e1d5]/35">
                        {quickFacts.map((fact, idx) => {
                          const Icon = fact.icon;
                          return (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                                <Icon className="w-4.5 h-4.5" />
                              </div>
                              <div className="flex flex-col space-y-0.5">
                                <span className="block text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider leading-none">{fact.label}</span>
                                <span className="block text-xs font-extrabold text-nomichi-ink leading-snug whitespace-normal">{fact.value}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === "itinerary" && (
                    <div className="space-y-5">
                      {itineraryDays.map((dayItem: any, idx: number) => (
                        <div key={idx} className="bg-[#FAF8F4] border border-[#e7e1d5]/45 rounded-2xl p-5 flex gap-4 items-start shadow-xs">
                          <div className="w-12 h-12 rounded-xl bg-nomichi-rust text-nomichi-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider leading-none">Day</span>
                            <span className="text-lg font-extrabold leading-none">{dayItem.day || idx + 1}</span>
                          </div>
                          <div className="space-y-1.5 min-w-0 flex-grow">
                            <h4 className="font-display font-extrabold text-sm text-nomichi-ink leading-snug">{dayItem.title}</h4>
                            <p className="text-xs text-nomichi-ink/65 font-semibold leading-relaxed">{dayItem.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "inclusions" && (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pl-1">
                      {inclusionsList.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-3 text-xs font-bold text-nomichi-ink/75">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === "exclusions" && (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pl-1">
                      {exclusionsList.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-3 text-xs font-bold text-nomichi-ink/65">
                          <div className="w-5 h-5 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                            <X className="w-3 h-3 stroke-[3px]" />
                          </div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === "accommodation" && (
                    <div className="flex gap-5 items-start">
                      <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                        <Home className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="font-display font-bold text-sm text-nomichi-ink">Premium Accommodation</h4>
                        <p className="text-xs font-semibold text-nomichi-ink/70 leading-relaxed whitespace-pre-line">
                          {accommodationDetails}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "faqs" && (
                    <div className="space-y-4">
                      {faqsList.map((faq: any, idx: number) => (
                        <div key={idx} className="bg-[#FAF8F4] border border-[#e7e1d5]/45 rounded-2xl p-5 space-y-1.5 shadow-xs">
                          <h4 className="font-display font-extrabold text-sm text-nomichi-ink flex items-center gap-2">
                            <span className="text-nomichi-rust shrink-0">Q.</span>
                            {faq.question}
                          </h4>
                          <p className="text-xs font-semibold text-nomichi-ink/65 leading-relaxed pl-5">
                            {faq.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Widget Panel (Col Span 3) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Booking & Price Box */}
              <div className="bg-nomichi-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5">
                
                {/* Price and Rating */}
                <div className="flex justify-between items-start pt-1">
                  <div className="space-y-0.5">
                    <span className="block text-2xl font-extrabold text-[#FF5B26]">
                      {trip.price ? `₹${Number(trip.price).toLocaleString("en-IN")}` : "₹89,999"}
                    </span>
                    <span className="block text-[10px] font-semibold text-nomichi-ink/40">per person (incl. GST)</span>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1 text-xs font-bold text-nomichi-ink mt-1 bg-[#FAF8F4] border border-[#e7e1d5]/60 px-2.5 py-1 rounded-xl">
                    <Star className="w-3.5 h-3.5 fill-current text-nomichi-sand" />
                    <span>{trip.rating ? Number(trip.rating).toFixed(1) : "4.8"}</span>
                    <span className="text-nomichi-ink/40 font-semibold">({trip.reviews || 50})</span>
                  </div>
                </div>

                {/* Seats Available Progress block */}
                <div className="bg-[#FAF8F4] border border-[#e7e1d5]/55 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Seats Available
                    </span>
                    <span className="text-nomichi-ink/60">{trip.seats_left || 6} seats left</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-[#e7e1d5]/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${((trip.total_seats - trip.seats_left) / trip.total_seats) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Error/Success Feedback Alerts */}
                {enquirySuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Enquiry submitted successfully! Redirecting you...</span>
                  </div>
                )}
                {enquiryError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-300">
                    <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{enquiryError}</span>
                  </div>
                )}

                {/* Primary Booking CTA Buttons */}
                <div className="space-y-3 pt-1">
                  <button 
                    onClick={() => router.push(`/trips/${trip.id}/enquire`)}
                    className="w-full bg-[#FF5B26] hover:bg-[#b04b1e] text-nomichi-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Enquire Now
                  </button>
                  <button 
                    onClick={() => {
                      if (trip.brochure_url) {
                        const link = document.createElement('a');
                        link.href = trip.brochure_url;
                        link.target = '_blank';
                        link.download = `${trip.title.replace(/\s+/g, '_')}_Brochure.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else {
                        window.print();
                      }
                    }}
                    className="w-full bg-white hover:bg-[#FAF8F4] text-[#FF5B26] border border-[#FF5B26]/30 text-sm font-bold py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Download Brochure
                  </button>
                </div>
              </div>

              {/* Trip Highlights List Widget */}
              <div className="bg-nomichi-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-nomichi-ink tracking-tight flex items-center gap-2 border-b border-[#e7e1d5]/30 pb-2.5">
                  <Sparkles className="w-4 h-4 text-nomichi-rust" />
                  Trip Highlights
                </h3>
                <ul className="space-y-3">
                  {(trip.highlights || [
                    "Explore key cultural city centers",
                    "Authentic curated local dining experiences",
                    "English speaking tour coordinators",
                    "Private and secure local transit transfers"
                  ]).map((hl: string, i: number) => (
                    <li key={i} className="flex gap-2.5 items-start text-xs font-bold text-nomichi-ink/75">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B26] mt-2 shrink-0" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Need Help Travel Expert Widget */}
              <div className="bg-nomichi-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-extrabold text-nomichi-ink tracking-tight">Need Help?</h3>
                  <p className="text-xs text-nomichi-ink/50 font-bold">Talk to our travel experts</p>
                </div>
                
                {/* Experts avatars */}
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2.5 overflow-hidden">
                    <img 
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white" 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" 
                      alt="Expert 1" 
                    />
                    <img 
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white" 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" 
                      alt="Expert 2" 
                    />
                    <img 
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white" 
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" 
                      alt="Expert 3" 
                    />
                  </div>
                  <span className="text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wide">Available 24/7</span>
                </div>

                <button 
                  onClick={() => router.push("/?view=enquiries")}
                  className="w-full bg-white hover:bg-[#FAF8F4] text-nomichi-ink border border-[#e7e1d5]/80 text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Headphones className="w-4 h-4 text-nomichi-rust" />
                  Contact Us
                </button>
              </div>

            </div>

          </div>

          {/* 4. BEIGE TRUST FOOTER (4 columns) */}
          <div className="bg-[#F5F1E8] rounded-[24px] border border-[#e7e1d5]/50 p-6 lg:p-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Trust Column 1 */}
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

              {/* Trust Column 2 */}
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

              {/* Trust Column 3 */}
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

              {/* Trust Column 4 */}
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
