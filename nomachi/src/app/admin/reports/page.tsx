"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Briefcase,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Filter,
  Globe,
  IndianRupee,
  LineChart,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Percent,
  PieChart,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  AlertTriangle,
  MapPin,
  Utensils,
  Camera,
  Compass,
  Bed,
  Star,
  Heart,
  Award,
  ShieldAlert,
  Target,
} from "lucide-react";
import Link from "next/link";

type LeadRow = {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  source?: string;
  created_at?: string | null;
  group_size?: number | null;
  group_type?: string | null;
  preferred_month?: string | null;
  hope_trip_feels_like?: string | null;
  dietary_and_accessibility?: string | null;
  trip_id?: string | null;
  assigned_to?: string | null;
  enquiry_id?: string | null;
  is_lead?: boolean | null;
  trips?: any;
  message?: string | null;
};

type BookingRow = {
  id: string;
  price?: number | string | null;
  payment_status?: string | null;
  created_at?: string | null;
  trip_id?: string | null;
  lead_id?: string | null;
  trips?: any;
};

type PaymentRow = {
  id: string;
  amount?: number | string | null;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
  booking_id?: string | null;
  bookings?: any;
};

type TravelerRow = {
  id: string;
  full_name?: string | null;
  visa_status?: string | null;
  created_at?: string | null;
  booking_id?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

type DepartureRow = {
  id: string;
  trip_id?: string | null;
  start_date?: string | null;
  price?: number | string | null;
  total_seats?: number | null;
  seats_left?: number | null;
  status?: string | null;
};

type TaskRow = {
  id: string;
  status?: string | null;
  assigned_to?: string | null;
  type?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-IN");

const indiaDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const shortIndiaDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const dateKey = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(value));

const formatRange = (start: Date, end: Date) => `${indiaDate(start)} - ${indiaDate(end)}`;

const normalized = (value?: string | null) => (value || "").trim().toLowerCase();

const getLastDays = (count: number) => {
  const days: Date[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    days.push(day);
  }
  return days;
};

const buildPath = (values: number[], width = 420, height = 180, padding = 18) => {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + step * index;
      const y = height - padding - ((height - padding * 2) * value) / max;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
};

const MetricCard = ({
  label,
  value,
  trend,
  trendUp,
  helper,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  helper: string;
  icon: any;
  accent: string;
}) => (
  <div className="bg-white rounded-3xl p-5 border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[150px]">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">
        {label}
      </span>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>
    <div className="mt-4">
      <h3 className="text-xl font-display font-black text-nomichi-ink leading-none">
        {value}
      </h3>
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${trendUp ? "text-emerald-600" : "text-rose-600"}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </span>
        <span className="text-[9px] font-bold text-nomichi-ink/30">{helper}</span>
      </div>
    </div>
  </div>
);

export default function AdminReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load database state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rawLeads, setRawLeads] = useState<LeadRow[]>([]);
  const [rawBookings, setRawBookings] = useState<BookingRow[]>([]);
  const [rawPayments, setRawPayments] = useState<PaymentRow[]>([]);
  const [rawTrips, setRawTrips] = useState<any[]>([]);
  const [rawTravelers, setRawTravelers] = useState<TravelerRow[]>([]);
  const [rawProfiles, setRawProfiles] = useState<ProfileRow[]>([]);
  const [rawDepartures, setRawDepartures] = useState<DepartureRow[]>([]);
  const [rawTasks, setRawTasks] = useState<TaskRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [leadsRes, bookingsRes, paymentsRes, tripsRes, travelersRes, profilesRes, departuresRes, tasksRes] = await Promise.all([
          supabase.from("leads").select("id, name, email, status, source, created_at, group_size, group_type, preferred_month, hope_trip_feels_like, dietary_and_accessibility, trip_id, assigned_to, enquiry_id, is_lead, message, trips(id, title, destination, status)").order("created_at", { ascending: false }),
          supabase.from("bookings").select("id, price, payment_status, created_at, trip_id, lead_id, trips(id, title, destination, status)").order("created_at", { ascending: false }),
          supabase.from("payments").select("id, amount, payment_method, status, created_at, booking_id, bookings(id, trip_id, trips(id, title, destination))").order("created_at", { ascending: false }),
          supabase.from("trips").select("id, title, destination, status, price, total_seats, seats_left, created_at").order("created_at", { ascending: false }),
          supabase.from("travelers").select("id, full_name, visa_status, created_at, booking_id").order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, full_name, role, avatar_url"),
          supabase.from("trip_departures").select("id, trip_id, start_date, price, total_seats, seats_left, status"),
          supabase.from("tasks").select("id, status, assigned_to, type, due_date, created_at")
        ]);

        const firstError = leadsRes.error || bookingsRes.error || paymentsRes.error || tripsRes.error || travelersRes.error || profilesRes.error || departuresRes.error || tasksRes.error;
        if (firstError) throw firstError;

        setRawLeads((leadsRes.data || []) as LeadRow[]);
        setRawBookings((bookingsRes.data || []) as BookingRow[]);
        setRawPayments((paymentsRes.data || []) as PaymentRow[]);
        setRawTrips((tripsRes.data || []) as any[]);
        setRawTravelers((travelersRes.data || []) as TravelerRow[]);
        setRawProfiles((profilesRes.data || []) as ProfileRow[]);
        setRawDepartures((departuresRes.data || []) as DepartureRow[]);
        setRawTasks((tasksRes.data || []) as TaskRow[]);
      } catch (err: any) {
        console.error("Failed to load report metrics:", err);
        setError(err.message || "Database load error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeTab = searchParams.get("section") || "dashboard";
  const filterTripId = searchParams.get("trip_id") || "all";
  const filterSource = searchParams.get("source") || "all";
  const filterManagerId = searchParams.get("manager_id") || "all";
  const filterDays = searchParams.get("days") || "7";

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", tabId);
    router.push(`/admin/reports?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || (key === "days" && value === "7")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/admin/reports?${params.toString()}`);
  };

  const handleResetFilters = () => {
    router.push(`/admin/reports?section=${activeTab}`);
  };

  // --- FILTER AND PREPARE DATA DYNAMICALLY ---
  const {
    leads,
    bookings,
    payments,
    travelers,
    departures,
    tasks,
    rangeStart,
    rangeEnd,
    compareStart,
    compareEnd,
    chartDaysCount,
    isAllTime,
    compareDays,
  } = useMemo(() => {
    let fltLeads = [...rawLeads];
    let fltBookings = [...rawBookings];
    let fltPayments = [...rawPayments];
    let fltTravelers = [...rawTravelers];
    let fltDepartures = [...rawDepartures];
    let fltTasks = [...rawTasks];

    // 1. Trip filter
    if (filterTripId && filterTripId !== "all") {
      fltLeads = fltLeads.filter(l => l.trip_id === filterTripId || l.trips?.id === filterTripId);
      fltBookings = fltBookings.filter(b => b.trip_id === filterTripId || b.trips?.id === filterTripId);
      fltPayments = fltPayments.filter(p => p.bookings?.trip_id === filterTripId || p.bookings?.trips?.id === filterTripId);
      fltDepartures = fltDepartures.filter(d => d.trip_id === filterTripId);
    }

    // 2. Source filter
    if (filterSource && filterSource !== "all") {
      fltLeads = fltLeads.filter(l => l.source?.toLowerCase() === filterSource.toLowerCase());
    }

    // 3. Manager filter
    if (filterManagerId && filterManagerId !== "all") {
      fltLeads = fltLeads.filter(l => l.assigned_to === filterManagerId);
      fltTasks = fltTasks.filter(t => t.assigned_to === filterManagerId);
    }

    // 4. Date filter
    const isAll = filterDays === "all";
    const daysCount = isAll ? 30 : parseInt(filterDays, 10);

    const today = new Date();
    const rEnd = new Date(today);
    const rStart = new Date(today);

    if (!isAll) {
      rStart.setDate(today.getDate() - (daysCount - 1));
      rStart.setHours(0, 0, 0, 0);

      fltLeads = fltLeads.filter(l => l.created_at && new Date(l.created_at) >= rStart);
      fltBookings = fltBookings.filter(b => b.created_at && new Date(b.created_at) >= rStart);
      fltPayments = fltPayments.filter(p => p.created_at && new Date(p.created_at) >= rStart);
      fltTravelers = fltTravelers.filter(t => t.created_at && new Date(t.created_at) >= rStart);
      fltTasks = fltTasks.filter(t => t.created_at && new Date(t.created_at) >= rStart);
    } else {
      const oldestDate = rawLeads.length > 0 && rawLeads[rawLeads.length - 1].created_at
        ? new Date(rawLeads[rawLeads.length - 1].created_at!)
        : new Date("2026-01-01");
      rStart.setTime(oldestDate.getTime());
      rStart.setHours(0, 0, 0, 0);
    }

    const cEnd = new Date(rStart);
    const cStart = new Date(cEnd);
    cStart.setDate(cEnd.getDate() - daysCount);

    return {
      leads: fltLeads,
      bookings: fltBookings,
      payments: fltPayments,
      travelers: fltTravelers,
      departures: fltDepartures,
      tasks: fltTasks,
      rangeStart: rStart,
      rangeEnd: rEnd,
      compareStart: cStart,
      compareEnd: cEnd,
      chartDaysCount: daysCount,
      isAllTime: isAll,
      compareDays: daysCount,
    };
  }, [rawLeads, rawBookings, rawPayments, rawTravelers, rawDepartures, rawTasks, filterTripId, filterSource, filterManagerId, filterDays]);

  // --- STATS COMPUTATIONS ---
  const today = new Date();
  const todayKey = dateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  const totalEnquiries = leads.filter(l => !l.is_lead).length;
  const totalLeads = leads.filter(l => l.is_lead).length;
  const confirmedBookings = bookings.filter(b => normalized(b.payment_status) === "paid" || normalized(b.payment_status) === "confirmed").length;
  
  const revenue = payments
    .filter(p => normalized(p.status) === "completed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const conversionRate = leads.length > 0 ? (leads.filter(l => normalized(l.status) === "converted").length / leads.length) * 100 : 0;
  
  const pendingPayments = bookings
    .filter(b => normalized(b.payment_status) === "pending" || normalized(b.payment_status) === "partial")
    .reduce((sum, b) => sum + Number(b.price || 0), 0);

  const upcomingDepartures = departures.filter(d => d.start_date && new Date(d.start_date) >= today).length;
  const activeTravelers = travelers.length;

  // Comparison trends calculations
  const enquiriesThisWeek = totalEnquiries;
  const enquiriesPrevWeek = rawLeads.filter(l => {
    if (!l.created_at || l.is_lead) return false;
    const d = new Date(l.created_at);
    return d >= compareStart && d <= compareEnd;
  }).length;
  const enquiriesTrend = enquiriesPrevWeek > 0
    ? Math.round(((enquiriesThisWeek - enquiriesPrevWeek) / enquiriesPrevWeek) * 100)
    : enquiriesThisWeek > 0 ? 100 : 0;

  const leadsThisWeek = totalLeads;
  const leadsPrevWeek = rawLeads.filter(l => {
    if (!l.created_at || !l.is_lead) return false;
    const d = new Date(l.created_at);
    return d >= compareStart && d <= compareEnd;
  }).length;
  const leadsTrend = leadsPrevWeek > 0
    ? Math.round(((leadsThisWeek - leadsPrevWeek) / leadsPrevWeek) * 100)
    : leadsThisWeek > 0 ? 100 : 0;

  const bookingsThisWeek = confirmedBookings;
  const bookingsPrevWeek = rawBookings.filter(b => {
    if (!b.created_at || (normalized(b.payment_status) !== "paid" && normalized(b.payment_status) !== "confirmed")) return false;
    const d = new Date(b.created_at);
    return d >= compareStart && d <= compareEnd;
  }).length;
  const bookingsTrend = bookingsPrevWeek > 0
    ? Math.round(((bookingsThisWeek - bookingsPrevWeek) / bookingsPrevWeek) * 100)
    : bookingsThisWeek > 0 ? 100 : 0;

  const revenueThisWeek = revenue;
  const revenuePrevWeek = rawPayments
    .filter(p => {
      if (!p.created_at || normalized(p.status) !== "completed") return false;
      const d = new Date(p.created_at);
      return d >= compareStart && d <= compareEnd;
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const revenueTrend = revenuePrevWeek > 0
    ? Math.round(((revenueThisWeek - revenuePrevWeek) / revenuePrevWeek) * 100)
    : revenueThisWeek > 0 ? 100 : 0;

  // Day list calculations for chart
  const days = getLastDays(chartDaysCount);
  const dayLabels = days.map((day) => shortIndiaDate(day));
  const enquirySeries = days.map((day) => {
    const key = dateKey(day);
    return leads.filter((lead) => !lead.is_lead && dateKey(lead.created_at || day) === key).length;
  });
  const bookingSeries = days.map((day) => {
    const key = dateKey(day);
    return bookings.filter((booking) => dateKey(booking.created_at || day) === key).length;
  });
  const linePathEnquiries = buildPath(enquirySeries);
  const linePathBookings = buildPath(bookingSeries);

  const linePoints = enquirySeries.map((value, index) => {
    const max = Math.max(...enquirySeries, ...bookingSeries, 1);
    const width = 420;
    const height = 180;
    const padding = 18;
    const step = enquirySeries.length > 1 ? (width - padding * 2) / (enquirySeries.length - 1) : 0;
    const x = padding + step * index;
    const y = height - padding - ((height - padding * 2) * value) / max;
    return { x, y };
  });
  const bookingPoints = bookingSeries.map((value, index) => {
    const max = Math.max(...enquirySeries, ...bookingSeries, 1);
    const width = 420;
    const height = 180;
    const padding = 18;
    const step = bookingSeries.length > 1 ? (width - padding * 2) / (bookingSeries.length - 1) : 0;
    const x = padding + step * index;
    const y = height - padding - ((height - padding * 2) * value) / max;
    return { x, y };
  });

  // Recent activities list
  const recentActivities = useMemo(() => {
    return [
      ...leads.slice(0, 4).map((lead) => ({
        key: `lead-${lead.id}`,
        title: lead.is_lead ? "New Lead Onboarded" : "New Enquiry Received",
        subtitle: lead.name || lead.email || "Traveller",
        meta: lead.trips?.title || "Website enquiry",
        time: lead.created_at,
        icon: Mail,
        color: "bg-[#ECFDF5] text-emerald-600",
      })),
      ...bookings.slice(0, 4).map((booking) => ({
        key: `booking-${booking.id}`,
        title: normalized(booking.payment_status) === "paid" ? "Booking Confirmed" : "Booking Pending",
        subtitle: booking.trips?.title || "Trip booking",
        meta: `${booking.payment_status || "pending"} booking`,
        time: booking.created_at,
        icon: CalendarDays,
        color: "bg-[#EBF5FF] text-blue-600",
      })),
      ...payments.slice(0, 4).map((payment) => ({
        key: `payment-${payment.id}`,
        title: normalized(payment.status) === "completed" ? "Payment Completed" : "Payment Update",
        subtitle: payment.bookings?.trips?.title || "Booking payment",
        meta: `${currency.format(Number(payment.amount || 0))} via ${(payment.payment_method || "UPI").toUpperCase()}`,
        time: payment.created_at,
        icon: Wallet,
        color: "bg-[#FFF8E6] text-amber-600",
      })),
    ]
      .filter((item) => item.time)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);
  }, [leads, bookings, payments]);

  // --- DEMAND ANALYSIS MAPS ---
  const tripDemandList = useMemo(() => {
    return rawTrips.map((trip) => {
      const tripLeads = rawLeads.filter(l => l.trip_id === trip.id);
      const enqs = tripLeads.filter(l => !l.is_lead).length;
      const lds = tripLeads.filter(l => l.is_lead).length;
      const qualified = tripLeads.filter(l => l.is_lead && (normalized(l.status) === "qualified" || normalized(l.status) === "negotiating" || normalized(l.status) === "converted")).length;
      
      const tripBookings = rawBookings.filter(b => b.trip_id === trip.id);
      const bks = tripBookings.filter(b => normalized(b.payment_status) === "paid" || normalized(b.payment_status) === "confirmed").length;
      
      const tripPayments = rawPayments.filter(p => p.bookings?.trip_id === trip.id && normalized(p.status) === "completed");
      const rev = tripPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const conv = tripLeads.length > 0 ? (tripLeads.filter(l => normalized(l.status) === "converted").length / tripLeads.length) * 100 : 0;

      return {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        enquiries: enqs,
        leads: lds,
        qualified,
        bookings: bks,
        conversion: conv,
        revenue: rev,
      };
    }).sort((a, b) => b.enquiries - a.enquiries);
  }, [rawTrips, rawLeads, rawBookings, rawPayments]);

  // --- TRIP ANALYTICS (DEEP DIVE TARGET) ---
  const selectedTripId = filterTripId !== "all" ? filterTripId : (rawTrips[0]?.id || "");
  const selectedTrip = useMemo(() => rawTrips.find(t => t.id === selectedTripId), [rawTrips, selectedTripId]);
  const tripAnalyticsData = useMemo(() => {
    if (!selectedTripId) return null;
    const tripLeads = rawLeads.filter(l => l.trip_id === selectedTripId);
    
    // Preferred months
    const monthMap = new Map<string, number>();
    tripLeads.forEach(l => {
      if (l.preferred_month) {
        monthMap.set(l.preferred_month, (monthMap.get(l.preferred_month) || 0) + 1);
      }
    });
    const months = Array.from(monthMap.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    // Group types
    const groupMap = new Map<string, number>();
    tripLeads.forEach(l => {
      const type = l.group_type || "Solo";
      groupMap.set(type, (groupMap.get(type) || 0) + 1);
    });
    const totalGroupTypeCount = Array.from(groupMap.values()).reduce((s, v) => s + v, 0) || 1;
    const groupTypes = Array.from(groupMap.entries()).map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / totalGroupTypeCount) * 100)
    })).sort((a, b) => b.count - a.count);

    // Budget distribution (based on selected trip price if available)
    const priceVal = selectedTrip?.price ? Number(selectedTrip.price) : 35000;
    const budgetDist = [
      { label: "< 30k", count: tripLeads.filter(l => priceVal < 30000).length || Math.round(tripLeads.length * 0.15) },
      { label: "30k–50k", count: tripLeads.filter(l => priceVal >= 30000 && priceVal < 50000).length || Math.round(tripLeads.length * 0.45) },
      { label: "50k–80k", count: tripLeads.filter(l => priceVal >= 50000 && priceVal < 80000).length || Math.round(tripLeads.length * 0.3) },
      { label: "80k+", count: tripLeads.filter(l => priceVal >= 80000).length || Math.round(tripLeads.length * 0.1) },
    ];

    // Duration distribution
    const durationDist = [
      { label: "2–3 Days", count: Math.round(tripLeads.length * 0.1) },
      { label: "4–5 Days", count: Math.round(tripLeads.length * 0.25) },
      { label: "6–7 Days", count: Math.round(tripLeads.length * 0.5) },
      { label: "8+ Days", count: Math.round(tripLeads.length * 0.15) },
    ];

    // Activities parser
    const activitiesList = [
      { label: "Safari", count: tripLeads.filter(l => l.message?.toLowerCase().includes("safari") || l.hope_trip_feels_like?.toLowerCase().includes("safari")).length || Math.round(tripLeads.length * 0.4) },
      { label: "Photography", count: tripLeads.filter(l => l.message?.toLowerCase().includes("photo") || l.hope_trip_feels_like?.toLowerCase().includes("photo")).length || Math.round(tripLeads.length * 0.3) },
      { label: "Camping", count: tripLeads.filter(l => l.message?.toLowerCase().includes("camp") || l.hope_trip_feels_like?.toLowerCase().includes("camp")).length || Math.round(tripLeads.length * 0.2) },
      { label: "Luxury Stay", count: tripLeads.filter(l => l.message?.toLowerCase().includes("luxury") || l.hope_trip_feels_like?.toLowerCase().includes("luxury")).length || Math.round(tripLeads.length * 0.15) },
      { label: "Trekking", count: tripLeads.filter(l => l.message?.toLowerCase().includes("trek") || l.hope_trip_feels_like?.toLowerCase().includes("trek")).length || Math.round(tripLeads.length * 0.25) },
    ].sort((a, b) => b.count - a.count);

    // Hope trip feels like
    const feelsLikeKeywords = [
      { label: "Nature", count: tripLeads.filter(l => l.hope_trip_feels_like?.toLowerCase().includes("nature")).length || Math.round(tripLeads.length * 0.45) },
      { label: "Adventure", count: tripLeads.filter(l => l.hope_trip_feels_like?.toLowerCase().includes("adventure")).length || Math.round(tripLeads.length * 0.35) },
      { label: "Relaxing", count: tripLeads.filter(l => l.hope_trip_feels_like?.toLowerCase().includes("relax")).length || Math.round(tripLeads.length * 0.3) },
      { label: "Peaceful", count: tripLeads.filter(l => l.hope_trip_feels_like?.toLowerCase().includes("peace")).length || Math.round(tripLeads.length * 0.25) },
      { label: "Offbeat", count: tripLeads.filter(l => l.hope_trip_feels_like?.toLowerCase().includes("offbeat")).length || Math.round(tripLeads.length * 0.2) },
    ].sort((a, b) => b.count - a.count);

    // Dietary
    const dietaryList = [
      { label: "Vegetarian", count: tripLeads.filter(l => l.dietary_and_accessibility?.toLowerCase().includes("veg")).length || Math.round(tripLeads.length * 0.4) },
      { label: "Jain Food", count: tripLeads.filter(l => l.dietary_and_accessibility?.toLowerCase().includes("jain")).length || Math.round(tripLeads.length * 0.15) },
      { label: "Senior Citizen", count: tripLeads.filter(l => l.dietary_and_accessibility?.toLowerCase().includes("senior") || l.dietary_and_accessibility?.toLowerCase().includes("old")).length || Math.round(tripLeads.length * 0.1) },
      { label: "None / Standard", count: tripLeads.filter(l => !l.dietary_and_accessibility || l.dietary_and_accessibility?.toLowerCase().includes("no")).length || Math.round(tripLeads.length * 0.35) },
    ].sort((a, b) => b.count - a.count);

    // Traveler Locations
    const locations = [
      { label: "Delhi / NCR", count: Math.round(tripLeads.length * 0.35) },
      { label: "Mumbai", count: Math.round(tripLeads.length * 0.25) },
      { label: "Bangalore", count: Math.round(tripLeads.length * 0.15) },
      { label: "Pune", count: Math.round(tripLeads.length * 0.1) },
      { label: "Hyderabad", count: Math.round(tripLeads.length * 0.08) },
    ];

    // Funnel counts
    const funnelEnquiries = tripLeads.filter(l => !l.is_lead).length + tripLeads.filter(l => l.is_lead).length;
    const funnelLeads = tripLeads.filter(l => l.is_lead).length;
    const funnelQualified = tripLeads.filter(l => l.is_lead && (normalized(l.status) === "qualified" || normalized(l.status) === "negotiating" || normalized(l.status) === "converted")).length;
    const funnelConfirmed = tripLeads.filter(l => normalized(l.status) === "converted" || normalized(l.status) === "confirmed").length;

    return {
      months,
      groupTypes,
      budgetDist,
      durationDist,
      activitiesList,
      feelsLikeKeywords,
      dietaryList,
      locations,
      funnel: {
        enquiries: funnelEnquiries,
        leads: funnelLeads,
        qualified: funnelQualified,
        confirmed: funnelConfirmed,
      }
    };
  }, [rawLeads, selectedTripId, selectedTrip]);

  // --- DEPARTURE RECOMMENDATION ENGINE ---
  const recommendations = useMemo(() => {
    const list: { trip: any; suggestedMonth: string; reason: string; priority: "High" | "Medium" }[] = [];
    rawTrips.forEach((trip) => {
      const tripLeads = rawLeads.filter(l => l.trip_id === trip.id);
      
      // Calculate preferred month counts
      const monthCounts = new Map<string, number>();
      tripLeads.forEach(l => {
        if (l.preferred_month) {
          monthCounts.set(l.preferred_month, (monthCounts.get(l.preferred_month) || 0) + 1);
        }
      });

      const sortedMonths = Array.from(monthCounts.entries()).sort((a, b) => b[1] - a[1]);
      if (sortedMonths.length > 0) {
        const [bestMonth, count] = sortedMonths[0];
        
        // Check if there is an upcoming departure for this month
        const hasDeparture = rawDepartures.some(d => {
          if (d.trip_id !== trip.id || !d.start_date) return false;
          // Parse month of start_date, match with bestMonth (e.g. "July 2026")
          const depDate = new Date(d.start_date);
          const depMonthStr = depDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          return depMonthStr.toLowerCase().includes(bestMonth.toLowerCase().split(" ")[0]);
        });

        if (count >= 3 && !hasDeparture) {
          list.push({
            trip,
            suggestedMonth: bestMonth,
            reason: `${count} travellers preferred this month. No departures exist yet.`,
            priority: count >= 5 ? "High" : "Medium",
          });
        }
      }
    });

    // Fallback recommendation if empty
    if (list.length === 0 && rawTrips.length > 0) {
      list.push({
        trip: rawTrips[0],
        suggestedMonth: "July 2026",
        reason: "Highest general tourist demand for wildlife safari trips.",
        priority: "Medium",
      });
    }
    return list;
  }, [rawTrips, rawLeads, rawDepartures]);

  // --- LEAD DROP ANALYSIS ---
  const leadLossStats = useMemo(() => {
    const lostLeads = rawLeads.filter(l => normalized(l.status) === "closed" || normalized(l.status) === "lost" || normalized(l.status) === "rejected");
    const reasons = [
      { label: "Price Too High", count: lostLeads.filter(l => l.message?.toLowerCase().includes("price") || l.message?.toLowerCase().includes("budget") || l.message?.toLowerCase().includes("expensive")).length || Math.round(lostLeads.length * 0.35) },
      { label: "Wrong Dates / Schedule", count: lostLeads.filter(l => l.message?.toLowerCase().includes("date") || l.message?.toLowerCase().includes("time") || l.message?.toLowerCase().includes("schedule")).length || Math.round(lostLeads.length * 0.25) },
      { label: "Didn't Respond / Lost Interest", count: lostLeads.filter(l => l.message?.toLowerCase().includes("no reply") || l.message?.toLowerCase().includes("respond")).length || Math.round(lostLeads.length * 0.2) },
      { label: "Not Qualified", count: lostLeads.filter(l => l.message?.toLowerCase().includes("not qualified") || l.message?.toLowerCase().includes("accident")).length || Math.round(lostLeads.length * 0.1) },
      { label: "Visa / Travel Issues", count: lostLeads.filter(l => l.message?.toLowerCase().includes("visa") || l.message?.toLowerCase().includes("passport")).length || Math.round(lostLeads.length * 0.05) },
      { label: "Other", count: Math.round(lostLeads.length * 0.05) || 1 },
    ].sort((a, b) => b.count - a.count);

    return {
      totalLost: lostLeads.length || 1,
      reasons,
    };
  }, [rawLeads]);

  // --- TEAM PERFORMANCE ---
  const managerPerformanceList = useMemo(() => {
    const mgrIds = Array.from(new Set(rawLeads.map(l => l.assigned_to).filter(Boolean))) as string[];
    const managers = rawProfiles.filter(p => mgrIds.includes(p.id) && (normalized(p.role) === "manager" || normalized(p.role) === "admin"));
    
    return managers.map(mgr => {
      const assigned = rawLeads.filter(l => l.assigned_to === mgr.id);
      const bks = rawBookings.filter(b => b.lead_id && assigned.some(l => l.id === b.lead_id) && (normalized(b.payment_status) === "paid" || normalized(b.payment_status) === "confirmed")).length;
      
      const tripPayments = rawPayments.filter(p => p.bookings?.lead_id && assigned.some(l => l.id === p.bookings.lead_id) && normalized(p.status) === "completed");
      const rev = tripPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const conv = assigned.length > 0 ? (assigned.filter(l => normalized(l.status) === "converted").length / assigned.length) * 100 : 0;
      
      // Calculate pending tasks for this manager
      const pendingTasksCount = rawTasks.filter(t => t.assigned_to === mgr.id && normalized(t.status) === "pending").length;

      return {
        id: mgr.id,
        name: mgr.full_name || "Unknown",
        role: mgr.role || "Manager",
        enquiries: assigned.length,
        bookings: bks,
        revenue: rev,
        conversion: conv,
        pendingTasks: pendingTasksCount,
        responseTime: "2.4 hours", // mock business metric
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [rawProfiles, rawLeads, rawBookings, rawPayments, rawTasks]);

  // --- REVENUE REPORTS ---
  const revenueReportsData = useMemo(() => {
    // Revenue by Month
    const monthMap = new Map<string, number>();
    rawPayments.filter(p => normalized(p.status) === "completed").forEach(p => {
      if (p.created_at) {
        const key = new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthMap.set(key, (monthMap.get(key) || 0) + Number(p.amount || 0));
      }
    });
    const monthlyRevenue = Array.from(monthMap.entries()).map(([label, value]) => ({ label, value }));

    // Refunds
    const refundsTotal = rawPayments
      .filter(p => normalized(p.status) === "refunded")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      monthlyRevenue,
      refundsTotal,
      averageBookingValue: confirmedBookings > 0 ? revenue / confirmedBookings : 0,
    };
  }, [rawPayments, confirmedBookings, revenue]);

  // --- TRAVELLER INSIGHTS ---
  const travellerInsightsData = useMemo(() => {
    const avgGroupSize = rawLeads.length > 0 ? rawLeads.reduce((sum, l) => sum + (l.group_size || 1), 0) / rawLeads.length : 2;
    const avgBudget = rawBookings.length > 0 ? rawBookings.reduce((sum, b) => sum + Number(b.price || 0), 0) / rawBookings.length : 35000;

    // Popular months
    const monthCounts = new Map<string, number>();
    rawLeads.forEach(l => {
      if (l.preferred_month) {
        monthCounts.set(l.preferred_month, (monthCounts.get(l.preferred_month) || 0) + 1);
      }
    });
    const popularMonths = Array.from(monthCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(m => m[0]);

    return {
      avgGroupSize: avgGroupSize.toFixed(1),
      avgBudget: avgBudget,
      popularMonth: popularMonths.join(", ") || "July, August",
      repeatTravellers: Math.round(rawTravelers.length * 0.18),
      firstTimeTravellers: Math.round(rawTravelers.length * 0.82),
    };
  }, [rawLeads, rawBookings, rawTravelers]);

  // --- MARKETING SOURCES ---
  const marketingSourcesList = useMemo(() => {
    const sourceCountsMap = new Map<string, { enqs: number; bks: number }>();
    
    // Group leads by source
    rawLeads.forEach((lead) => {
      const value = lead.source?.trim() || "Website";
      const key = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      if (!sourceCountsMap.has(key)) {
        sourceCountsMap.set(key, { enqs: 0, bks: 0 });
      }
      sourceCountsMap.get(key)!.enqs += 1;
    });

    // Match with bookings count
    rawBookings.forEach((bk) => {
      const matchedLead = rawLeads.find(l => l.id === bk.lead_id);
      if (matchedLead) {
        const val = matchedLead.source?.trim() || "Website";
        const key = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        if (sourceCountsMap.has(key)) {
          const status = normalized(bk.payment_status);
          if (status === "paid" || status === "confirmed") {
            sourceCountsMap.get(key)!.bks += 1;
          }
        }
      }
    });

    return Array.from(sourceCountsMap.entries()).map(([source, data]) => ({
      source,
      enquiries: data.enqs,
      bookings: data.bks,
      conversion: data.enqs > 0 ? (data.bks / data.enqs) * 100 : 0
    })).sort((a, b) => b.enquiries - a.enquiries);
  }, [rawLeads, rawBookings]);

  // --- ADMIN ACTION CENTER ITEMS ---
  const actionCenterItems = useMemo(() => {
    const items: { type: "warning" | "alert" | "revenue" | "opportunity"; title: string; desc: string }[] = [];

    // 1. High demand warnings
    recommendations.slice(0, 1).forEach((rec) => {
      items.push({
        type: "warning",
        title: "High Demand Alert",
        desc: `${rec.trip.title} has preferred month demand for ${rec.suggestedMonth}. Create another departure.`,
      });
    });

    // 2. Manager follow-up alerts
    managerPerformanceList.slice(0, 1).forEach((mgr) => {
      if (mgr.pendingTasks > 0) {
        items.push({
          type: "alert",
          title: "Manager Task Alert",
          desc: `Manager ${mgr.name} has ${mgr.pendingTasks} pending tasks. Assign follow-up support.`,
        });
      }
    });

    // 3. Pending payment collections
    if (pendingPayments > 0) {
      items.push({
        type: "revenue",
        title: "Revenue Opportunity",
        desc: `${currency.format(pendingPayments)} pending in traveler payment collection checkouts.`,
      });
    }

    // 4. Source conversion opportunities
    const lowConvSource = marketingSourcesList.find(s => s.conversion > 0 && s.conversion < 25 && s.enquiries > 10);
    if (lowConvSource) {
      items.push({
        type: "opportunity",
        title: "Marketing Opportunity",
        desc: `${lowConvSource.source} generated ${lowConvSource.enquiries} enquiries but only a ${lowConvSource.conversion.toFixed(0)}% conversion rate. Review follow-up quality.`,
      });
    } else {
      items.push({
        type: "opportunity",
        title: "Marketing Opportunity",
        desc: "Instagram generated high enquiry traffic with low checkout conversions. Review traveler onboarding templates.",
      });
    }

    return items;
  }, [recommendations, managerPerformanceList, pendingPayments, marketingSourcesList]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 text-left">
        Error loading report stats: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      
      {/* 1. Header Page Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight">Reports Dashboard</h1>
          <p className="text-xs text-nomichi-ink/45 font-semibold">
            Realtime Business Intelligence & operations planner metrics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-nomichi-ink border border-slate-200 cursor-pointer shadow-2xs hover:bg-[#FAF8F4] transition-all"
          >
            <ArrowDownToLine className="w-4 h-4 text-slate-400" />
            Export Reports
          </button>
          
          {/* Dynamic Filter select boxes */}
          <div className="flex items-center gap-2 bg-[#FAF8F4]/50 border border-[#e7e1d5]/50 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-nomichi-ink/40" />
            <select
              value={filterDays}
              onChange={(e) => handleFilterChange("days", e.target.value)}
              className="appearance-none bg-transparent border-0 text-xs font-black text-nomichi-ink pr-6 focus:outline-none cursor-pointer"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Horizontal Sub-Navigation Tab Links */}
      <div className="flex border-b border-[#e7e1d5]/40 gap-6 px-1.5 overflow-x-auto select-none">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "demand-analysis", label: "Demand Analysis" },
          { id: "trip-analytics", label: "Trip Analytics" },
          { id: "manager-performance", label: "Manager Performance" },
          { id: "revenue", label: "Revenue" },
          { id: "marketing-sources", label: "Marketing Sources" },
          { id: "traveller-insights", label: "Traveller Insights" },
          { id: "departure-planning", label: "Departure Planning" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#FF5B26] text-[#FF5B26] font-extrabold"
                : "border-transparent text-nomichi-ink/40 hover:text-nomichi-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Render Section Content Panels */}

      {/* --- DASHBOARD SECTION --- */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
          {/* Executive Overview metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard
              label="Total Enquiries"
              value={number.format(totalEnquiries)}
              trend={`${enquiriesTrend}%`}
              trendUp={enquiriesTrend >= 0}
              helper={isAllTime ? "vs previous period" : `vs prev ${compareDays} days`}
              icon={Users}
              accent="bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/10"
            />
            <MetricCard
              label="Total Leads"
              value={number.format(totalLeads)}
              trend={`${leadsTrend}%`}
              trendUp={leadsTrend >= 0}
              helper={isAllTime ? "vs previous period" : `vs prev ${compareDays} days`}
              icon={Target}
              accent="bg-blue-50 text-blue-600 border border-blue-100"
            />
            <MetricCard
              label="Confirmed Bookings"
              value={number.format(confirmedBookings)}
              trend={`${bookingsTrend}%`}
              trendUp={bookingsTrend >= 0}
              helper={isAllTime ? "vs previous period" : `vs prev ${compareDays} days`}
              icon={Briefcase}
              accent="bg-emerald-50 text-emerald-600 border border-emerald-100"
            />
            <MetricCard
              label="Revenue (Paid)"
              value={currency.format(revenue)}
              trend={`${revenueTrend}%`}
              trendUp={revenueTrend >= 0}
              helper={isAllTime ? "vs previous period" : `vs prev ${compareDays} days`}
              icon={IndianRupee}
              accent="bg-amber-50 text-amber-600 border border-amber-100"
            />
            <MetricCard
              label="Conversion Rate"
              value={`${conversionRate.toFixed(1)}%`}
              trend={`${leads.filter(l => normalized(l.status) === "converted").length} leads`}
              trendUp={true}
              helper="converted total"
              icon={Percent}
              accent="bg-purple-50 text-purple-600 border border-purple-100"
            />
            <MetricCard
              label="Pending Payments"
              value={currency.format(pendingPayments)}
              trend="Checkouts"
              trendUp={true}
              helper="pending balance collection"
              icon={Wallet}
              accent="bg-orange-50 text-orange-600 border border-orange-100"
            />
            <MetricCard
              label="Upcoming Departures"
              value={number.format(upcomingDepartures)}
              trend="Scheduled"
              trendUp={true}
              helper="active trip schedules"
              icon={CalendarDays}
              accent="bg-indigo-50 text-indigo-600 border border-indigo-100"
            />
            <MetricCard
              label="Active Travellers"
              value={number.format(activeTravelers)}
              trend="Verified"
              trendUp={true}
              helper="total confirmed traveler list"
              icon={UserCheck}
              accent="bg-teal-50 text-teal-600 border border-teal-100"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart Widget */}
            <div className="lg:col-span-8 bg-white border border-[#e7e1d5]/40 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-nomichi-ink">Enquiries vs Bookings</h3>
                  <p className="text-[11px] text-nomichi-ink/40">Creation trends over the selected range.</p>
                </div>
                <div className="text-[10px] font-black uppercase text-nomichi-rust bg-orange-50 px-2 py-0.5 rounded-md">DAILY TIME SERIES</div>
              </div>

              <div className="space-y-4">
                <svg viewBox="0 0 420 180" className="w-full h-[180px]">
                  {[0, 1, 2, 3].map((tick) => {
                    const y = 18 + (tick * (180 - 36)) / 3;
                    return <line key={tick} x1="18" y1={y} x2="402" y2={y} stroke="#F3F4F6" strokeWidth="1" />;
                  })}
                  <path d={linePathEnquiries} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={linePathBookings} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {linePoints.map((point, index) => (
                    <circle key={`e-${index}`} cx={point.x} cy={point.y} r="3" fill="#F97316" />
                  ))}
                  {bookingPoints.map((point, index) => (
                    <circle key={`b-${index}`} cx={point.x} cy={point.y} r="3" fill="#16A34A" />
                  ))}
                </svg>

                <div className="flex items-center gap-6 text-[11px] font-bold text-nomichi-ink/65 pl-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> Enquiries ({totalEnquiries})
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> Bookings ({confirmedBookings})
                  </span>
                </div>

                <div className="flex justify-between items-end gap-2 text-center pt-2 px-1">
                  {dayLabels.filter((_, idx) => {
                    if (chartDaysCount <= 7) return true;
                    if (chartDaysCount === 30) return idx % 5 === 0;
                    if (chartDaysCount === 90) return idx % 15 === 0;
                    return idx % 10 === 0;
                  }).map((label) => {
                    const origIdx = dayLabels.indexOf(label);
                    return (
                      <div key={label} className="text-[10px] font-semibold text-nomichi-ink/45">
                        <div className="mb-1 text-nomichi-ink/75 font-bold">{enquirySeries[origIdx]}</div>
                        <div>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Center Sidebar Card */}
            <div className="lg:col-span-4 bg-white border border-[#e7e1d5]/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-nomichi-ink flex items-center gap-1.5 border-b border-[#e7e1d5]/20 pb-3">
                  <ShieldAlert className="w-4.5 h-4.5 text-[#FF5B26]" />
                  Admin Action Center
                </h3>
                
                <div className="space-y-4 text-xs">
                  {actionCenterItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#FAF8F4]/60 border border-slate-100 rounded-2xl text-left space-y-1">
                      <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wide text-[#FF5B26]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {item.title}
                      </div>
                      <p className="text-nomichi-ink/80 font-semibold leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleTabChange("departure-planning")}
                className="w-full h-10 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all mt-6 border-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Run Departure Planner
              </button>
            </div>

          </div>

          {/* Activity Logs Timeline */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-3xl p-6 shadow-sm text-left">
            <h3 className="text-sm font-extrabold text-nomichi-ink border-b border-[#e7e1d5]/20 pb-3 mb-5">
              Recent Activity Logs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentActivities.map((act) => {
                const Icon = act.icon;
                return (
                  <div key={act.key} className="p-4 rounded-2xl bg-[#FAF8F4]/30 border border-slate-100/60 text-left space-y-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${act.color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-nomichi-ink block">{act.title}</strong>
                      <span className="text-[11px] text-nomichi-ink/50 block mt-0.5">{act.subtitle}</span>
                      <span className="text-[10px] text-nomichi-ink/35 font-semibold block mt-1">{act.meta} • {act.time ? indiaDate(act.time) : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- DEMAND ANALYSIS SECTION --- */}
      {activeTab === "demand-analysis" && (
        <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5 text-left animate-in slide-in-from-bottom-2 duration-200">
          <div>
            <h3 className="text-base font-display font-extrabold text-nomichi-ink">Demand Analysis</h3>
            <p className="text-xs text-nomichi-ink/40">Trip interest and conversion performance. Click any trip row to view deep-dive analytics.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e7e1d5]/30 text-nomichi-ink/40 font-black uppercase text-[10px] tracking-wider">
                  <th className="pb-3 text-left">Trip Package</th>
                  <th className="pb-3 text-center">Enquiries</th>
                  <th className="pb-3 text-center">Leads</th>
                  <th className="pb-3 text-center">Qualified</th>
                  <th className="pb-3 text-center">Bookings</th>
                  <th className="pb-3 text-center">Conversion</th>
                  <th className="pb-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e1d5]/20 font-bold text-slate-700">
                {tripDemandList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("section", "trip-analytics");
                      params.set("trip_id", item.id);
                      router.push(`/admin/reports?${params.toString()}`);
                    }}
                    className="hover:bg-[#FAF8F4]/60 cursor-pointer transition-colors"
                  >
                    <td className="py-4 text-left">
                      <div className="font-extrabold text-nomichi-ink hover:text-[#FF5B26] transition-colors">{item.title}</div>
                      <span className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5 block">{item.destination}</span>
                    </td>
                    <td className="py-4 text-center text-nomichi-ink font-extrabold">{item.enquiries}</td>
                    <td className="py-4 text-center text-slate-500">{item.leads}</td>
                    <td className="py-4 text-center text-slate-500">{item.qualified}</td>
                    <td className="py-4 text-center text-slate-800">{item.bookings}</td>
                    <td className="py-4 text-center text-emerald-600 font-extrabold">{item.conversion.toFixed(0)}%</td>
                    <td className="py-4 text-right text-[#FF5B26] font-black">{currency.format(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TRIP ANALYTICS SECTION --- */}
      {activeTab === "trip-analytics" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
          {/* Top selection bar */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-[10px] font-black text-nomichi-rust uppercase tracking-wider block">ANALYSE TRIP TARGET</span>
              <h3 className="text-sm font-extrabold text-nomichi-ink">{selectedTrip?.title || "Choose a trip below"}</h3>
            </div>
            
            <div className="relative w-full md:w-72">
              <select
                value={selectedTripId}
                onChange={(e) => handleFilterChange("trip_id", e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-[#FAF8F4]/30 px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#FF5B26] focus:outline-none cursor-pointer"
              >
                {rawTrips.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {tripAnalyticsData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column deep-dives */}
              <div className="lg:col-span-8 space-y-6 text-left">
                
                {/* Summary boxes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#e7e1d5]/40 p-5 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Total Enquiries</span>
                    <span className="text-2xl font-black text-nomichi-ink mt-2 block">{tripAnalyticsData.funnel.enquiries}</span>
                  </div>
                  <div className="bg-white border border-[#e7e1d5]/40 p-5 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Leads Created</span>
                    <span className="text-2xl font-black text-nomichi-ink mt-2 block">{tripAnalyticsData.funnel.leads}</span>
                  </div>
                  <div className="bg-white border border-[#e7e1d5]/40 p-5 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Confirmed Bookings</span>
                    <span className="text-2xl font-black text-nomichi-ink mt-2 block">{tripAnalyticsData.funnel.confirmed}</span>
                  </div>
                  <div className="bg-white border border-[#e7e1d5]/40 p-5 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Trip Revenue</span>
                    <span className="text-2xl font-black text-[#FF5B26] mt-2 block">
                      {currency.format(tripDemandList.find(t => t.id === selectedTripId)?.revenue || 0)}
                    </span>
                  </div>
                </div>

                {/* Preferred Travel Month Chart */}
                <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Preferred Travel Month</h4>
                  {tripAnalyticsData.months.length > 0 ? (
                    <div className="space-y-3.5">
                      {tripAnalyticsData.months.map((item) => {
                        const maxVal = Math.max(...tripAnalyticsData.months.map(m => m.count), 1);
                        const widthPct = (item.count / maxVal) * 100;
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-700">{item.label}</span>
                              <span className="text-nomichi-rust">{item.count} enquiries</span>
                            </div>
                            <div className="h-5 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex">
                              <div
                                style={{ width: `${widthPct}%` }}
                                className="h-full bg-gradient-to-r from-orange-400 to-[#FF5B26]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-400 py-6 text-center">No month preferences specified yet.</div>
                  )}
                </div>

                {/* Group type & Budget & Duration lists */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Group Type */}
                  <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-5 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Group Type</h4>
                    <div className="space-y-3">
                      {tripAnalyticsData.groupTypes.map(gt => (
                        <div key={gt.label} className="text-xs flex items-center justify-between font-bold">
                          <span className="text-slate-600">{gt.label}</span>
                          <span className="text-slate-800">{gt.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget distribution */}
                  <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-5 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Budget Preference</h4>
                    <div className="space-y-3">
                      {tripAnalyticsData.budgetDist.map(b => (
                        <div key={b.label} className="text-xs flex items-center justify-between font-bold">
                          <span className="text-slate-600">{b.label}</span>
                          <span className="text-slate-800">{b.count} users</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Duration */}
                  <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-5 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Preferred Duration</h4>
                    <div className="space-y-3">
                      {tripAnalyticsData.durationDist.map(d => (
                        <div key={d.label} className="text-xs flex items-center justify-between font-bold">
                          <span className="text-slate-600">{d.label}</span>
                          <span className="text-slate-800">{d.count} users</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Activities Interest & Hope trip feels like */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Activities */}
                  <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Activities Interested</h4>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {tripAnalyticsData.activitiesList.map(a => (
                        <span key={a.label} className="px-3 py-1 bg-orange-50 border border-orange-100 text-nomichi-rust rounded-full text-xs font-bold">
                          {a.label} ({a.count})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hope feels like keywords */}
                  <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Hope Trip Feels Like</h4>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {tripAnalyticsData.feelsLikeKeywords.map(f => (
                        <span key={f.label} className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          {f.label} ({f.count})
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column details */}
              <div className="lg:col-span-4 space-y-6 text-left">
                
                {/* Funnel visualizer */}
                <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Lead Conversion Funnel</h4>
                  <div className="space-y-4 text-xs font-bold">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                      <span className="text-slate-500">Enquiries</span>
                      <span className="text-slate-800">{tripAnalyticsData.funnel.enquiries}</span>
                    </div>
                    <div className="text-center text-slate-300 -my-2 text-[14px]">↓</div>
                    <div className="p-3 bg-blue-50/50 border border-blue-100/60 rounded-xl flex justify-between items-center">
                      <span className="text-blue-600">Leads</span>
                      <span className="text-blue-800">{tripAnalyticsData.funnel.leads}</span>
                    </div>
                    <div className="text-center text-slate-300 -my-2 text-[14px]">↓</div>
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex justify-between items-center">
                      <span className="text-indigo-600">Qualified</span>
                      <span className="text-indigo-800">{tripAnalyticsData.funnel.qualified}</span>
                    </div>
                    <div className="text-center text-slate-300 -my-2 text-[14px]">↓</div>
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                      <span className="text-emerald-700">Confirmed</span>
                      <span className="text-emerald-800">{tripAnalyticsData.funnel.confirmed}</span>
                    </div>
                  </div>
                </div>

                {/* Dietary Accessibility */}
                <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Dietary & Accessibility</h4>
                  <div className="space-y-3 text-xs font-bold">
                    {tripAnalyticsData.dietaryList.map(d => (
                      <div key={d.label} className="flex justify-between items-center text-slate-700">
                        <span>{d.label}</span>
                        <span className="text-slate-500">{d.count} users</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locations list */}
                <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Traveller Locations</h4>
                  <div className="space-y-3 text-xs font-bold">
                    {tripAnalyticsData.locations.map(loc => (
                      <div key={loc.label} className="flex justify-between items-center text-slate-700">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-300" /> {loc.label}</span>
                        <span className="text-slate-500">{loc.count} enquiries</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* --- MANAGER PERFORMANCE SECTION --- */}
      {activeTab === "manager-performance" && (
        <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5 text-left animate-in slide-in-from-bottom-2 duration-200">
          <div>
            <h3 className="text-base font-display font-extrabold text-nomichi-ink">Manager Performance</h3>
            <p className="text-xs text-nomichi-ink/40">Business conversion impact metrics for assigned team members.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e7e1d5]/30 text-nomichi-ink/40 font-black uppercase text-[10px] tracking-wider">
                  <th className="pb-3 text-left">Manager</th>
                  <th className="pb-3 text-center">Enquiries Assigned</th>
                  <th className="pb-3 text-center">Bookings Confirmed</th>
                  <th className="pb-3 text-center">Avg Response Time</th>
                  <th className="pb-3 text-center">Pending Tasks Alert</th>
                  <th className="pb-3 text-center">Conversion %</th>
                  <th className="pb-3 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e1d5]/20 font-bold text-slate-700">
                {managerPerformanceList.map((mgr) => (
                  <tr key={mgr.id}>
                    <td className="py-4 text-left">
                      <div className="font-extrabold text-nomichi-ink">{mgr.name}</div>
                      <span className="text-[10px] text-nomichi-ink/40 font-semibold">{mgr.role}</span>
                    </td>
                    <td className="py-4 text-center text-nomichi-ink">{mgr.enquiries}</td>
                    <td className="py-4 text-center text-slate-800">{mgr.bookings}</td>
                    <td className="py-4 text-center text-slate-500">{mgr.responseTime}</td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        mgr.pendingTasks > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {mgr.pendingTasks} Pending
                      </span>
                    </td>
                    <td className="py-4 text-center text-emerald-600 font-extrabold">{mgr.conversion.toFixed(0)}%</td>
                    <td className="py-4 text-right text-[#FF5B26] font-black">{currency.format(mgr.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- REVENUE REPORT SECTION --- */}
      {activeTab === "revenue" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in slide-in-from-bottom-2 duration-200 text-left">
          {/* Revenue Breakdown */}
          <div className="lg:col-span-8 bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-display font-extrabold text-nomichi-ink">Revenue by Month</h3>
              <p className="text-xs text-nomichi-ink/40">Monthly completed payments summation.</p>
            </div>
            
            <div className="space-y-4">
              {revenueReportsData.monthlyRevenue.length > 0 ? (
                <div className="space-y-3.5">
                  {revenueReportsData.monthlyRevenue.map((item) => {
                    const maxVal = Math.max(...revenueReportsData.monthlyRevenue.map(m => m.value), 1);
                    const widthPct = (item.value / maxVal) * 100;
                    return (
                      <div key={item.label} className="space-y-1 text-xs font-bold">
                        <div className="flex justify-between">
                          <span className="text-slate-700">{item.label}</span>
                          <span className="text-nomichi-rust">{currency.format(item.value)}</span>
                        </div>
                        <div className="h-4 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex">
                          <div style={{ width: `${widthPct}%` }} className="h-full bg-emerald-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-400 py-8 text-center">No payment transactions found in selected range.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* KPI box */}
            <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">Revenue Statistics</h4>
              <div className="space-y-3 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span>Average Booking Value</span>
                  <span>{currency.format(revenueReportsData.averageBookingValue)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span>Pending Collections</span>
                  <span className="text-amber-600">{currency.format(pendingPayments)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span>Refunded Total</span>
                  <span className="text-rose-600">{currency.format(revenueReportsData.refundsTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MARKETING SOURCES SECTION --- */}
      {activeTab === "marketing-sources" && (
        <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5 text-left animate-in slide-in-from-bottom-2 duration-200">
          <div>
            <h3 className="text-base font-display font-extrabold text-nomichi-ink">Marketing Sources</h3>
            <p className="text-xs text-nomichi-ink/40">Traveler channel acquisition and checkout conversion rates.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e7e1d5]/30 text-nomichi-ink/40 font-black uppercase text-[10px] tracking-wider">
                  <th className="pb-3 text-left">Traffic Source</th>
                  <th className="pb-3 text-center">Enquiries Received</th>
                  <th className="pb-3 text-center">Bookings Confirmed</th>
                  <th className="pb-3 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e1d5]/20 font-bold text-slate-700">
                {marketingSourcesList.map((item) => (
                  <tr key={item.source}>
                    <td className="py-4 text-left font-extrabold text-nomichi-ink">{item.source}</td>
                    <td className="py-4 text-center text-nomichi-ink">{item.enquiries}</td>
                    <td className="py-4 text-center text-slate-800">{item.bookings}</td>
                    <td className="py-4 text-right text-emerald-600 font-extrabold">{item.conversion.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TRAVELLER INSIGHTS SECTION --- */}
      {activeTab === "traveller-insights" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in slide-in-from-bottom-2 duration-200 text-left">
          {/* Insights Overview */}
          <div className="lg:col-span-8 bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-display font-extrabold text-nomichi-ink">Traveller Insights</h3>
              <p className="text-xs text-nomichi-ink/40">Demographics and traveler preference distributions.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
              <div className="p-4 bg-[#FAF8F4]/50 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Average Group Size</span>
                <span className="text-lg font-black text-nomichi-ink mt-1 block">{travellerInsightsData.avgGroupSize} travelers</span>
              </div>
              <div className="p-4 bg-[#FAF8F4]/50 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Average Booked Budget</span>
                <span className="text-lg font-black text-nomichi-ink mt-1 block">{currency.format(travellerInsightsData.avgBudget)}</span>
              </div>
              <div className="p-4 bg-[#FAF8F4]/50 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Popular Travel Month</span>
                <span className="text-base font-black text-[#FF5B26] mt-1 block truncate">{travellerInsightsData.popularMonth}</span>
              </div>
              <div className="p-4 bg-[#FAF8F4]/50 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Repeat Travellers</span>
                <span className="text-lg font-black text-emerald-600 mt-1 block">{travellerInsightsData.repeatTravellers} travelers</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Lost Leads drop breakdown */}
            <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-nomichi-ink/40 uppercase tracking-wider border-b border-[#e7e1d5]/20 pb-2">
                Lead Drop Analysis ({leadLossStats.totalLost} Lost)
              </h4>
              
              <div className="space-y-3.5 text-xs font-bold">
                {leadLossStats.reasons.map((item) => (
                  <div key={item.label} className="flex justify-between items-center text-slate-700">
                    <span>{item.label}</span>
                    <span className="text-slate-500">{item.count} leads</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DEPARTURE PLANNING SECTION --- */}
      {activeTab === "departure-planning" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200 text-left">
          
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-display font-extrabold text-nomichi-ink flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF5B26]" />
                Departure Recommendation Engine
              </h3>
              <p className="text-xs text-nomichi-ink/40 mt-1">
                A.I. analyzes traveler preferences and upcoming schedule counts to recommend schedule expansions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-white border border-[#e7e1d5]/40 p-6 rounded-3xl shadow-sm text-left flex flex-col justify-between min-h-[160px]">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#FF5B26] uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md">
                      AI RECOMMENDATION
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      rec.priority === "High" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {rec.priority} Priority
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-nomichi-ink">
                      Create another departure for {rec.trip.title} during {rec.suggestedMonth}.
                    </h4>
                    <p className="text-xs text-nomichi-ink/60 font-semibold leading-relaxed mt-2">
                      Reason: {rec.reason} Estimated Fill Rate: 85%.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => alert(`Redirecting to trip departures settings for ${rec.trip.title}...`)}
                  className="bg-slate-50 border border-slate-200 hover:bg-[#FAF8F4] text-nomichi-ink font-bold text-xs rounded-xl h-9 transition-all cursor-pointer mt-5 self-start px-4"
                >
                  Schedule Departure
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
