import { createClient } from "@/lib/supabase/client";
import { Trip, Departure } from "@/types/admin.types";

const supabase = createClient();

export const tripService = {
  async getTrips(params?: {
    search?: string;
    status?: string;
    destination?: string;
    tripStyle?: string;
    difficulty?: string;
    sortBy?: string;
  }): Promise<Trip[]> {
    let query = supabase.from("trips").select("*");

    if (params?.status && params.status !== "all") {
      if (params.status === "open") {
        query = query.in("status", ["Open", "Open for Enquiries"]);
      } else {
        query = query.eq("status", params.status);
      }
    }

    if (params?.destination && params.destination !== "all") {
      query = query.eq("destination", params.destination);
    }

    if (params?.difficulty && params.difficulty !== "all") {
      query = query.eq("difficulty", params.difficulty);
    }

    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,destination.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let trips = (data || []) as Trip[];

    if (params?.tripStyle && params.tripStyle !== "all") {
      trips = trips.filter((t) =>
        t.trip_style?.toLowerCase().includes(params.tripStyle!.toLowerCase())
      );
    }

    // Sort client-side or server-side
    if (params?.sortBy) {
      if (params.sortBy === "newest") {
        trips.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      } else if (params.sortBy === "oldest") {
        trips.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      } else if (params.sortBy === "price_asc") {
        trips.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (params.sortBy === "price_desc") {
        trips.sort((a, b) => (b.price || 0) - (a.price || 0));
      }
    }

    return trips;
  },

  async getTripById(id: string): Promise<Trip> {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Trip;
  },

  async createTrip(trip: Omit<Trip, "id" | "created_at">): Promise<Trip> {
    const { data, error } = await supabase
      .from("trips")
      .insert([trip])
      .select()
      .single();

    if (error) throw error;
    return data as Trip;
  },

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const { data, error } = await supabase
      .from("trips")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Trip;
  },

  async deleteTrip(id: string): Promise<void> {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) throw error;
  },

  async archiveTrip(id: string): Promise<Trip> {
    return this.updateTrip(id, { status: "archived" });
  },

  async restoreTrip(id: string): Promise<Trip> {
    return this.updateTrip(id, { status: "draft" });
  },

  async openForEnquiries(id: string): Promise<Trip> {
    return this.updateTrip(id, { status: "Open" });
  },

  async duplicateTrip(trip: Trip): Promise<Trip> {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const duplicatedData: Omit<Trip, "id" | "created_at"> = {
      title: `${trip.title} (Copy)`,
      destination: trip.destination,
      description: trip.description,
      trip_style: trip.trip_style,
      difficulty: trip.difficulty,
      best_for: trip.best_for,
      age_group: trip.age_group,
      meals: trip.meals,
      group_size: trip.group_size,
      duration: trip.duration,
      price: trip.price,
      total_seats: undefined,
      seats_left: undefined,
      image_url: trip.image_url,
      brochure_url: trip.brochure_url,
      images: trip.images,
      accommodation: trip.accommodation,
      highlights: trip.highlights,
      inclusions: trip.inclusions,
      exclusions: trip.exclusions,
      status: "draft",
      rating: 5.0,
      reviews: 0,
      itinerary: trip.itinerary,
      faqs: trip.faqs,
      created_by: authUser?.id || undefined,
    };

    return this.createTrip(duplicatedData);
  },

  async getDepartures(params?: { tripId?: string | null }): Promise<Departure[]> {
    let query = supabase.from("trip_departures").select("*, trips(id, title, destination)").order("start_date", { ascending: true });

    if (params?.tripId) {
      query = query.eq("trip_id", params.tripId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Departure[];
  },

  async activateTrip(
    trip: Trip,
    departureData: {
      startDate: string;
      endDate?: string;
      totalSeats: number;
      price: number;
      tripLeaderId?: string;
      tripLeader?: string;
      meetingPoint?: string;
      notes?: string;
    }
  ): Promise<void> {
    const startYear = new Date(departureData.startDate).getFullYear();
    const existingDeps = await this.getDepartures();
    
    const yearDeps = existingDeps.filter(d => {
      try {
        const parsed = JSON.parse(d.status);
        return parsed.code?.startsWith(`DEP-${startYear}-`);
      } catch (e) {
        return false;
      }
    });
    
    const nextIndex = yearDeps.length + 1;
    const departureCode = `DEP-${startYear}-${String(nextIndex).padStart(3, "0")}`;

    const tripLeaderName = departureData.tripLeader
      ? departureData.tripLeader
      : departureData.tripLeaderId
        ? (await supabase.from("profiles").select("full_name").eq("id", departureData.tripLeaderId).maybeSingle()).data?.full_name || "Select Team Member"
        : "Select Team Member";

    const statusJson = JSON.stringify({
      status: "active",
      code: departureCode,
      leader: tripLeaderName,
      meeting: departureData.meetingPoint || "Airport / City",
      notes: departureData.notes || "",
    });

    // Update the trip status and details
    const { error: updateErr } = await supabase
      .from("trips")
      .update({
        start_date: new Date(departureData.startDate).toISOString(),
        end_date: departureData.endDate ? new Date(departureData.endDate).toISOString() : null,
        total_seats: departureData.totalSeats,
        seats_left: departureData.totalSeats,
        status: "active",
      })
      .eq("id", trip.id);

    if (updateErr) throw updateErr;

    // Create the departure
    const { error: departureErr } = await supabase.from("trip_departures").insert([
      {
        trip_id: trip.id,
        start_date: new Date(departureData.startDate).toISOString(),
        end_date: departureData.endDate ? new Date(departureData.endDate).toISOString() : null,
        total_seats: departureData.totalSeats,
        seats_left: departureData.totalSeats,
        price: departureData.price,
        status: statusJson,
      },
    ]);

    if (departureErr) throw departureErr;

    if (departureData.tripLeaderId) {
      const { error: primaryAssignErr } = await supabase
        .from("leads")
        .update({ assigned_to: departureData.tripLeaderId })
        .eq("trip_id", trip.id);

      if (primaryAssignErr) throw primaryAssignErr;
    }
  },
};
