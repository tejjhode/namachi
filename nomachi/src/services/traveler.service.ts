import { createClient } from "@/lib/supabase/client";
import { Traveler } from "@/types/admin.types";

const supabase = createClient();

export const travelerService = {
  async createTraveler(payload: {
    booking_id: string;
    user_id?: string | null;
    full_name: string;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    nationality?: string | null;
    passport_number?: string | null;
    passport_expiry?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relation?: string | null;
    visa_status?: Traveler["visa_status"];
  }): Promise<Traveler> {
    const { data, error } = await supabase
      .from("travelers")
      .insert({
        booking_id: payload.booking_id,
        user_id: payload.user_id || null,
        full_name: payload.full_name,
        email: payload.email || null,
        phone: payload.phone || null,
        gender: payload.gender || null,
        date_of_birth: payload.date_of_birth || null,
        nationality: payload.nationality || null,
        passport_number: payload.passport_number || null,
        passport_expiry: payload.passport_expiry || null,
        emergency_contact_name: payload.emergency_contact_name || null,
        emergency_contact_phone: payload.emergency_contact_phone || null,
        emergency_contact_relation: payload.emergency_contact_relation || null,
        visa_status: payload.visa_status || "not_required",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Traveler;
  },

  async getTravelersByBooking(bookingId: string): Promise<Traveler[]> {
    const { data, error } = await supabase
      .from("travelers")
      .select("*")
      .eq("booking_id", bookingId);

    if (error) throw error;
    return (data || []) as Traveler[];
  },

  async updateTravelerPassport(
    travelerId: string,
    passportNum: string,
    expiry: string
  ): Promise<Traveler> {
    const { data, error } = await supabase
      .from("travelers")
      .update({
        passport_number: passportNum,
        passport_expiry: expiry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", travelerId)
      .select()
      .single();

    if (error) throw error;
    return data as Traveler;
  },

  async updateTravelerEmergencyContact(
    travelerId: string,
    payload: {
      name: string;
      phone: string;
      relation: string;
    }
  ): Promise<Traveler> {
    const { data, error } = await supabase
      .from("travelers")
      .update({
        emergency_contact_name: payload.name,
        emergency_contact_phone: payload.phone,
        emergency_contact_relation: payload.relation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", travelerId)
      .select()
      .single();

    if (error) throw error;
    return data as Traveler;
  },

  async updateVisaStatus(
    travelerId: string,
    status: Traveler["visa_status"]
  ): Promise<Traveler> {
    const { data, error } = await supabase
      .from("travelers")
      .update({
        visa_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", travelerId)
      .select()
      .single();

    if (error) throw error;
    return data as Traveler;
  },

  async getTravelers(params?: {
    visaStatus?: string;
  }): Promise<Traveler[]> {
    let query = supabase
      .from("travelers")
      .select("*, bookings(*, trips(*), profiles(*))")
      .order("created_at", { ascending: false });

    if (params?.visaStatus && params.visaStatus !== "all") {
      query = query.eq("visa_status", params.visaStatus);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Traveler[];
  },
};
