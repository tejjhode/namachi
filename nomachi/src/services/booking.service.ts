import { createClient } from "@/lib/supabase/client";
import { Booking, Payment } from "@/types/admin.types";

const supabase = createClient();

export const bookingService = {
  async createBooking(payload: {
    lead_id?: string | null;
    user_id?: string | null;
    trip_id?: string | null;
    departure_id?: string | null;
    price: number;
    payment_status?: Booking["payment_status"];
  }): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        lead_id: payload.lead_id || null,
        user_id: payload.user_id || null,
        trip_id: payload.trip_id || null,
        departure_id: payload.departure_id || null,
        price: payload.price,
        payment_status: payload.payment_status || "pending",
        updated_at: new Date().toISOString(),
      })
      .select("*, trips(id, title, destination), profiles(id, full_name)")
      .single();

    if (error) throw error;
    return data as Booking;
  },

  async getBookingById(id: string): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, trips(*), profiles(*), payments(*), travelers(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Booking;
  },

  async updateBookingPaymentStatus(
    bookingId: string,
    status: Booking["payment_status"]
  ): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .update({
        payment_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  async addPaymentRecord(
    bookingId: string,
    payload: {
      amount: number;
      payment_method: Payment["payment_method"];
      transaction_reference?: string | null;
      status?: Payment["status"];
    }
  ): Promise<Payment> {
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .insert({
        booking_id: bookingId,
        amount: payload.amount,
        payment_method: payload.payment_method,
        transaction_reference: payload.transaction_reference || null,
        status: payload.status || "completed",
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    const { data: allPayments, error: fetchError } = await supabase
      .from("payments")
      .select("amount, status")
      .eq("booking_id", bookingId);

    if (fetchError) throw fetchError;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("price")
      .eq("id", bookingId)
      .single();

    if (bookingError) throw bookingError;

    const totalPaid = (allPayments || [])
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    let newStatus: Booking["payment_status"] = "pending";
    if (totalPaid >= Number(booking.price)) {
      newStatus = "paid";
    } else if (totalPaid > 0) {
      newStatus = "partial";
    }

    await this.updateBookingPaymentStatus(bookingId, newStatus);

    return paymentData as Payment;
  },

  async getBookings(params?: {
    userId?: string;
    managerId?: string;
    status?: string;
  }): Promise<Booking[]> {
    let query = supabase
      .from("bookings")
      .select("*, trips(*), profiles(*), travelers(*), leads(*)")
      .order("created_at", { ascending: false });

    if (params?.userId) {
      query = query.eq("user_id", params.userId);
    }

    if (params?.status && params.status !== "all") {
      query = query.eq("payment_status", params.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    let bookings = (data || []) as Booking[];

    if (params?.managerId) {
      bookings = bookings.filter((b) => b.leads?.assigned_to === params.managerId);
    }

    return bookings;
  },
};
