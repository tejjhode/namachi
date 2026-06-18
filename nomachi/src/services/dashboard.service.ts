import { createClient } from "@/lib/supabase/client";
import { DashboardStats } from "@/types/admin.types";

const supabase = createClient();

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const [leadsRes, tripsRes, departuresRes] = await Promise.all([
      supabase.from("leads").select("*"),
      supabase.from("trips").select("*"),
      supabase.from("trip_departures").select("*"),
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (departuresRes.error) throw departuresRes.error;

    const leadsData = leadsRes.data || [];
    const tripsData = tripsRes.data || [];
    const departuresData = departuresRes.data || [];

    const totalL = leadsData.length;
    const newL = leadsData.filter((l) => {
      if (!l.created_at) return false;
      return new Date(l.created_at).toDateString() === new Date().toDateString();
    }).length;

    const activeT = tripsData.filter(
      (t) => t.status === "Open" || t.status === "active"
    ).length;

    const upcomingD = departuresData.filter((d) => {
      if (!d.start_date) return false;
      return new Date(d.start_date) > new Date();
    }).length;

    const pendingE = leadsData.filter(
      (l) => l.status === "new" || l.status === "contacted"
    ).length;

    const confirmedT = leadsData
      .filter((l) => l.status === "converted")
      .reduce((sum, l) => sum + (parseInt(l.group_size) || 1), 0);

    // Funnel count
    const funnel = {
      new: leadsData.filter((l) => l.status === "new").length,
      contacted: leadsData.filter((l) => l.status === "contacted").length,
      qualified: leadsData.filter((l) => l.status === "qualified").length,
      negotiating: leadsData.filter((l) => l.status === "negotiating" || l.status === "vibe check sent").length,
      converted: leadsData.filter((l) => l.status === "converted").length,
      lost: leadsData.filter((l) => l.status === "lost").length,
    };

    // Trends computation
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Total Leads Trend
    const leadsLast7 = leadsData.filter((l) => new Date(l.created_at) >= sevenDaysAgo).length;
    const leadsPrev7 = leadsData.filter((l) => new Date(l.created_at) >= fourteenDaysAgo && new Date(l.created_at) < sevenDaysAgo).length;
    let leadsTrendVal = 0;
    let leadsUp = true;
    if (leadsPrev7 > 0) {
      const diff = leadsLast7 - leadsPrev7;
      leadsTrendVal = Math.round((Math.abs(diff) / leadsPrev7) * 100);
      leadsUp = diff >= 0;
    } else if (leadsLast7 > 0) {
      leadsTrendVal = 100;
      leadsUp = true;
    }

    // 2. New Leads Today vs Yesterday
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
    const todayLeads = leadsData.filter((l) => new Date(l.created_at).toDateString() === todayStr).length;
    const yesterdayLeads = leadsData.filter((l) => new Date(l.created_at).toDateString() === yesterdayStr).length;
    let newLeadsTrendVal = 0;
    let newLeadsUp = true;
    if (yesterdayLeads > 0) {
      const diff = todayLeads - yesterdayLeads;
      newLeadsTrendVal = Math.round((Math.abs(diff) / yesterdayLeads) * 100);
      newLeadsUp = diff >= 0;
    } else if (todayLeads > 0) {
      newLeadsTrendVal = 100;
      newLeadsUp = true;
    }

    // 3. Active Trips Trend
    const tripsLast30 = tripsData.filter((t) => new Date(t.created_at) >= thirtyDaysAgo).length;
    const tripsPrev30 = tripsData.filter((t) => new Date(t.created_at) >= sixtyDaysAgo && new Date(t.created_at) < thirtyDaysAgo).length;
    let tripsTrendVal = 0;
    let activeTripsUp = true;
    if (tripsPrev30 > 0) {
      const diff = tripsLast30 - tripsPrev30;
      tripsTrendVal = Math.round((Math.abs(diff) / tripsPrev30) * 100);
      activeTripsUp = diff >= 0;
    } else if (tripsLast30 > 0) {
      tripsTrendVal = 100;
      activeTripsUp = true;
    }

    // 4. Pending Enquiries Trend
    const pendingNow = leadsData.filter((l) => (l.status === "new" || l.status === "contacted") && new Date(l.created_at) >= sevenDaysAgo).length;
    const pendingPrev = leadsData.filter((l) => (l.status === "new" || l.status === "contacted") && new Date(l.created_at) >= fourteenDaysAgo && new Date(l.created_at) < sevenDaysAgo).length;
    let pendingTrendVal = 0;
    let pendingEnquiriesUp = false;
    if (pendingPrev > 0) {
      const diff = pendingNow - pendingPrev;
      pendingTrendVal = Math.round((Math.abs(diff) / pendingPrev) * 100);
      pendingEnquiriesUp = diff >= 0;
    } else if (pendingNow > 0) {
      pendingTrendVal = 100;
      pendingEnquiriesUp = true;
    }

    // 5. Confirmed Travelers Trend
    const travelersLast7 = leadsData
      .filter((l) => l.status === "converted" && new Date(l.created_at) >= sevenDaysAgo)
      .reduce((sum, l) => sum + (parseInt(l.group_size) || 1), 0);
    const travelersPrev7 = leadsData
      .filter((l) => l.status === "converted" && new Date(l.created_at) >= fourteenDaysAgo && new Date(l.created_at) < sevenDaysAgo)
      .reduce((sum, l) => sum + (parseInt(l.group_size) || 1), 0);
    let travelersTrendVal = 0;
    let confirmedTravelersUp = true;
    if (travelersPrev7 > 0) {
      const diff = travelersLast7 - travelersPrev7;
      travelersTrendVal = Math.round((Math.abs(diff) / travelersPrev7) * 100);
      confirmedTravelersUp = diff >= 0;
    } else if (travelersLast7 > 0) {
      travelersTrendVal = 100;
      confirmedTravelersUp = true;
    }

    return {
      totalLeads: totalL,
      newLeadsToday: newL,
      activeTrips: activeT,
      upcomingDepartures: upcomingD,
      pendingEnquiries: pendingE,
      confirmedTravelers: confirmedT,
      funnel,
      trends: {
        leads: `${leadsTrendVal}%`,
        leadsUp,
        newLeads: `${newLeadsTrendVal}%`,
        newLeadsUp,
        activeTrips: `${tripsTrendVal}%`,
        activeTripsUp,
        pendingEnquiries: `${pendingTrendVal}%`,
        pendingEnquiriesUp,
        confirmedTravelers: `${travelersTrendVal}%`,
        confirmedTravelersUp,
      },
    };
  },
};
