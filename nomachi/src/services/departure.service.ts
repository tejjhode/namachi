import { createClient } from "@/lib/supabase/client";
import { Departure } from "@/types/admin.types";

const supabase = createClient();

export const departureService = {
  async getDepartures(params?: { tripId?: string | null }): Promise<Departure[]> {
    let query = supabase
      .from("trip_departures")
      .select("*, trips(id, title, destination)")
      .order("start_date", { ascending: true });

    if (params?.tripId) {
      query = query.eq("trip_id", params.tripId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Departure[];
  },

  async updateDeparture(id: string, updates: Partial<Omit<Departure, "id" | "trips">>): Promise<Departure> {
    const { data, error } = await supabase
      .from("trip_departures")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Departure;
  },

  async deleteDeparture(id: string): Promise<void> {
    const { error } = await supabase
      .from("trip_departures")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
};
