import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { SearchWidget } from "@/components/SearchWidget";
import { DashboardView } from "@/components/DashboardView";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { 
  MapPin, 
  Calendar, 
  Users, 
  Search, 
  Heart, 
  Star, 
  Compass, 
  CalendarDays, 
  Luggage, 
  Camera,
  Play,
  ArrowRight,
  Mail,
  Sparkles,
  Leaf,
  Headphones
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: {
    destination?: string;
    checkin?: string;
    checkout?: string;
  };
}

export default async function Home({ searchParams }: PageProps) {
  // Get active user session securely
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  // Fetch all open destinations for auto-complete listing
  const { data: allTrips } = await supabaseServer
    .from("trips")
    .select("destination")
    .in("status", ["Open", "active"]);
  const uniqueDestinations = Array.from(
    new Set(allTrips?.map((t) => t.destination).filter(Boolean) || [])
  ) as string[];

  // Fetch filtered open trips from Supabase
  let tripsQuery = supabaseServer.from("trips").select("*").in("status", ["Open", "active"]);

  const destinationQuery = searchParams?.destination;
  if (destinationQuery) {
    tripsQuery = tripsQuery.ilike("destination", `%${destinationQuery}%`);
  }

  const checkinQuery = searchParams?.checkin;
  if (checkinQuery) {
    tripsQuery = tripsQuery.gte("start_date", checkinQuery);
  }

  const { data: trips } = await tripsQuery;

  let userLeads: any[] = [];
  let initialChatMessages: any[] = [];
  if (user) {
    const { data: leads } = await supabaseServer
      .from("leads")
      .select("*, trips(*), lead_notes(*)")
      .eq("email", user.email);
    if (leads) {
      userLeads = leads;
    }

    // Fetch encrypted chat messages for all user leads + support thread (lead_id IS NULL)
    const leadIds = userLeads.map((l: any) => l.id);
    if (leadIds.length > 0) {
      const { data: msgs } = await supabaseServer
        .from("chat_messages")
        .select("*")
        .or(`lead_id.in.(${leadIds.join(",")}),lead_id.is.null`)
        .order("created_at", { ascending: true });
      if (msgs) initialChatMessages = msgs;
    } else {
      // Still fetch support thread messages
      const { data: msgs } = await supabaseServer
        .from("chat_messages")
        .select("*")
        .is("lead_id", null)
        .order("created_at", { ascending: true });
      if (msgs) initialChatMessages = msgs;
    }
  }

  let userRole = "USER";
  if (user) {
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile && profile.role) {
      userRole = profile.role;
    }
  }

  const userData = user ? {
    fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    avatarUrl: user.user_metadata?.avatar_url,
    email: user.email || "",
    role: userRole
  } : null;

  if (userData) {
    return <DashboardView user={userData} leads={userLeads} trips={trips || []} initialChatMessages={initialChatMessages} />;
  }


  // Select the 6 featured trips from the fetched database trips list
  const featuredTrips = (trips || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-nomichi-cream font-sans antialiased text-nomichi-ink overflow-x-hidden flex flex-col justify-between">
      
      {/* 1. HEADER SECTION (Clean, white background header) */}
      <header className="w-full bg-nomichi-white border-b border-nomichi-sand/15 py-4 px-6 lg:px-8 flex items-center justify-between shadow-sm relative z-30">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Nomichi Logo" className="h-9 w-auto object-contain" />
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide text-nomichi-ink/75">
          <a href="#destinations" className="hover:text-nomichi-rust transition-colors">Destinations</a>
          <a href="/login" className="hover:text-nomichi-rust transition-colors">Trips</a>
          <a href="/login" className="hover:text-nomichi-rust transition-colors">About Us</a>
          <a href="#how-it-works" className="hover:text-nomichi-rust transition-colors">How It Works</a>
          <a href="/login" className="hover:text-nomichi-rust transition-colors">Community</a>
          <a href="/login" className="hover:text-nomichi-rust transition-colors">Blog</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold text-nomichi-ink px-5 py-2.5 rounded-full hover:bg-nomichi-cream transition-colors border border-nomichi-sand/30">
            Log in
          </Link>
          <Link 
            href="/signup" 
            className="bg-nomichi-rust hover:bg-[#b04b1e] text-nomichi-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* 2. HERO & SEARCH SECTION */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-6 relative pb-20">
        
        {/* Rounded Hero Banner Container */}
        <div className="relative rounded-[32px] overflow-hidden min-h-[460px] md:min-h-[560px] lg:min-h-[600px] flex items-center px-8 md:px-16 text-nomichi-white shadow-xl">
          
          {/* Background image & gradient overlays */}
          <div className="absolute inset-0 z-0">
            <img
              src="/nomichi-hero.png"
              alt="Nomichi Hero"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-nomichi-ink/75 via-nomichi-ink/35 to-transparent" />
          </div>

          {/* Left-aligned hero content */}
          <div className="relative z-10 max-w-xl py-12 md:py-20 flex flex-col items-start">
            <h1 className="text-4xl md:text-6xl font-display font-extrabold leading-[1.1] tracking-tight mb-4 text-nomichi-white">
              Slow down. <br />
              Travel deeper.
            </h1>
            
            <p className="text-sm md:text-base text-nomichi-cream/90 font-medium leading-relaxed mb-8 max-w-md">
              Offbeat places, small groups, real connections. Journeys designed and run by Nomichi.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link 
                href="/login" 
                className="bg-nomichi-rust hover:bg-[#b04b1e] text-nomichi-white px-6 py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all duration-300"
              >
                Explore Trips
              </Link>
              <a 
                href="#how-it-works" 
                className="bg-nomichi-white/10 hover:bg-nomichi-white/20 border border-nomichi-white/30 backdrop-blur-sm text-nomichi-white px-6 py-3.5 rounded-full font-bold transition-all duration-300 flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-nomichi-rust flex items-center justify-center shrink-0">
                  <Play className="w-2.5 h-2.5 fill-current text-nomichi-white ml-0.5" />
                </div>
                How It Works
              </a>
            </div>
          </div>
        </div>

        {/* Floating SearchWidget (placed outside banner to prevent overflow-hidden clipping) */}
        <SearchWidget destinationsList={uniqueDestinations} />
      </section>

      {/* 3. FEATURED TRIPS SECTION */}
      <section id="destinations" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight">
              Featured Trips
            </h2>
          </div>
          <Link 
            href="/login" 
            className="text-sm font-bold text-nomichi-rust hover:text-[#b04b1e] hover:underline flex items-center gap-1 transition-colors"
          >
            View all trips
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Trips grid card listing */}
        {featuredTrips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredTrips.map((trip) => {
              const duration = trip.duration || "7 Days";
              const type = trip.title.toLowerCase().includes("relax") || trip.title.toLowerCase().includes("caldera") ? "Relaxed" : "Small Group";
              const price = trip.price ? `₹${Number(trip.price).toLocaleString("en-IN")}` : "₹99,999";
              const rating = trip.rating ? Number(trip.rating).toFixed(1) : "4.8";
              const reviews = trip.reviews || 50;

              return (
                <Link 
                  key={trip.id} 
                  href={`/trips/${trip.id}`}
                  className="group bg-nomichi-white rounded-[24px] overflow-hidden shadow-sm border border-nomichi-sand/15 hover:shadow-md transition-all duration-300 flex flex-col h-full cursor-pointer"
                >
                  <div className="relative h-52 shrink-0">
                    <img 
                      src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"} 
                      alt={trip.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    {/* Wishlist toggle */}
                    <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-nomichi-white/85 hover:bg-nomichi-white text-nomichi-ink/75 hover:text-nomichi-rust flex items-center justify-center shadow-sm transition-colors">
                      <Heart className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col justify-between flex-grow">
                    <div>
                      <h3 className="text-lg font-bold text-nomichi-ink mb-1 group-hover:text-nomichi-rust transition-colors leading-snug">
                        {trip.title}
                      </h3>
                      <p className="text-xs text-nomichi-ink/50 font-medium mb-4 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-nomichi-sand" />
                        {trip.destination}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-nomichi-ink/65 font-semibold mb-5">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-nomichi-sand" />
                          {duration}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-nomichi-sand" />
                          {type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-nomichi-sand/10">
                      <span className="text-lg font-extrabold text-nomichi-rust">
                        {price}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-nomichi-ink">
                        <Star className="w-3.5 h-3.5 fill-current text-nomichi-sand" />
                        <span>{rating}</span>
                        <span className="text-nomichi-ink/40 font-normal">({reviews})</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-nomichi-white rounded-[24px] border border-nomichi-sand/15 p-10 max-w-4xl mx-auto shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust mb-6">
              <Compass className="w-8 h-8 stroke-[1.5px]" />
            </div>
            <h3 className="text-xl font-display font-semibold text-nomichi-ink mb-2">No Featured Trips Available</h3>
            <p className="text-nomichi-ink/60 max-w-sm font-light leading-relaxed">
              We are currently adding some extraordinary journeys to our catalog. Please check back shortly.
            </p>
          </div>
        )}
      </section>

      {/* 4. VALUE BENEFITS SECTION (5 core columns) */}
      <section id="how-it-works" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 py-10 border-t border-b border-nomichi-sand/15">
          
          {/* Benefit 1 */}
          <div className="flex flex-col items-start">
            <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-nomichi-ink mt-3">Small Group Trips</h4>
            <p className="text-xs text-nomichi-ink/50 mt-1 leading-relaxed">
              Meaningful experiences with like-minded people.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="flex flex-col items-start">
            <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-nomichi-ink mt-3">Offbeat Destinations</h4>
            <p className="text-xs text-nomichi-ink/50 mt-1 leading-relaxed">
              Hidden gems and unique local experiences.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="flex flex-col items-start">
            <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-nomichi-ink mt-3">Expertly Curated</h4>
            <p className="text-xs text-nomichi-ink/50 mt-1 leading-relaxed">
              Trips designed and run by our team.
            </p>
          </div>

          {/* Benefit 4 */}
          <div className="flex flex-col items-start">
            <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-nomichi-ink mt-3">Responsible Travel</h4>
            <p className="text-xs text-nomichi-ink/50 mt-1 leading-relaxed">
              Travel consciously. Support local communities.
            </p>
          </div>

          {/* Benefit 5 */}
          <div className="flex flex-col items-start">
            <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-nomichi-ink mt-3">End-to-End Support</h4>
            <p className="text-xs text-nomichi-ink/50 mt-1 leading-relaxed">
              We've got your back before, during and after.
            </p>
          </div>

        </div>
      </section>

      {/* 5. NEWSLETTER CARD SECTION */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 mb-8">
        <div className="bg-[#f7f2ea] rounded-3xl p-8 md:p-12 border border-nomichi-sand/15 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-nomichi-sand/20 flex items-center justify-center text-nomichi-rust shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm md:text-base font-bold text-nomichi-ink">
                Travel inspiration, stories and exclusive offers.
              </h4>
              <p className="text-xs text-nomichi-ink/65 mt-0.5 font-medium">
                Straight to your inbox.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 max-w-md">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="bg-nomichi-white text-xs font-semibold placeholder-nomichi-ink/45 text-nomichi-ink rounded-xl px-4 py-3 border border-nomichi-sand/20 focus:outline-none focus:border-nomichi-rust w-full md:w-64"
            />
            <button 
              type="button" 
              className="bg-nomichi-rust hover:bg-[#b04b1e] text-nomichi-white text-xs font-bold px-6 py-3 rounded-xl transition-colors shrink-0"
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="w-full bg-nomichi-cream border-t border-nomichi-sand/15 text-nomichi-ink/85 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            
            {/* Tag line & Logo */}
            <div className="flex flex-col gap-3 md:col-span-2">
              <img src="/logo.png" alt="Nomichi Logo" className="h-9 w-auto object-contain self-start" />
              <p className="text-xs text-nomichi-ink/50 uppercase font-bold tracking-wider mt-1">
                WANDER • CONNECT • BELONG
              </p>
            </div>

            {/* Links Group 1 */}
            <div className="flex flex-col gap-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-nomichi-ink/50">Company</h5>
              <div className="flex flex-col gap-2 text-xs font-semibold text-nomichi-ink/75">
                <Link href="/login" className="hover:text-nomichi-rust transition-colors">About Us</Link>
                <Link href="/login" className="hover:text-nomichi-rust transition-colors">Careers</Link>
                <Link href="/login" className="hover:text-nomichi-rust transition-colors">Contact Us</Link>
              </div>
            </div>

            {/* Links Group 2 */}
            <div className="flex flex-col gap-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-nomichi-ink/50">Support</h5>
              <div className="flex flex-col gap-2 text-xs font-semibold text-nomichi-ink/75">
                <Link href="/login" className="hover:text-nomichi-rust transition-colors">FAQ</Link>
                <Link href="/login" className="hover:text-nomichi-rust transition-colors">Terms & Conditions</Link>
                <Link href="/login" className="hover:text-nomichi-rust transition-colors">Privacy Policy</Link>
              </div>
            </div>

          </div>

          {/* Social icons + Copyright */}
          <div className="pt-6 border-t border-nomichi-sand/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-nomichi-ink/40">Follow Us</span>
              <div className="flex items-center gap-2.5">
                <a href="#" className="w-8 h-8 rounded-full border border-nomichi-sand/25 flex items-center justify-center text-nomichi-ink/60 hover:text-nomichi-rust hover:border-nomichi-rust transition-colors" aria-label="Instagram">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full border border-nomichi-sand/25 flex items-center justify-center text-nomichi-ink/60 hover:text-nomichi-rust hover:border-nomichi-rust transition-colors" aria-label="Facebook">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full border border-nomichi-sand/25 flex items-center justify-center text-nomichi-ink/60 hover:text-nomichi-rust hover:border-nomichi-rust transition-colors" aria-label="Youtube">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/>
                    <polygon points="10 15 15 12 10 9"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full border border-nomichi-sand/25 flex items-center justify-center text-nomichi-ink/60 hover:text-nomichi-rust hover:border-nomichi-rust transition-colors" aria-label="LinkedIn">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect width="4" height="12" x="2" y="9"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </a>
              </div>
            </div>
            <p className="text-xs text-nomichi-ink/40 font-medium">
              © 2025 Nomichi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
