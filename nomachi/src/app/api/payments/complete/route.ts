import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function getAdminEmail(): string {
  const from = process.env.SMTP_FROM || "";
  const match = from.match(/<(.+)>/);
  if (match) return match[1];
  return from || "admin@nomachi.in";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, amount, paymentMethod } = body;

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "bookingId and amount are required" }, { status: 400 });
    }

    const transactionId = `TXN${Date.now().toString().slice(-10)}NMC`;
    const paidAt = new Date().toISOString();
    const paidAtFormatted = new Date(paidAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1. Insert payment record
    const { error: paymentInsertError } = await supabaseAdmin
      .from("payments")
      .insert({
        booking_id: bookingId,
        amount: Number(amount),
        payment_method: paymentMethod || "Online",
        status: "completed",
        transaction_reference: transactionId,
        created_at: paidAt,
      });

    if (paymentInsertError) {
      console.warn("Payment insert warning:", paymentInsertError);
    }

    // 2. Update booking payment_status to paid
    const { error: bookingUpdateError } = await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", bookingId);

    if (bookingUpdateError) {
      return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 });
    }

    // 3. Fetch booking context for emails and workflow sync
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(`
        id, price, payment_status, created_at, user_id,
        trips(id, title, destination),
        profiles:user_id(id, full_name, email, phone),
        leads(id, assigned_to, enquiry_id)
      `)
      .eq("id", bookingId)
      .single();

    const bk = booking as any;
    const tripTitle = bk?.trips?.title || "Your Trip";
    const tripDestination = bk?.trips?.destination || "";
    const travelerName = bk?.profiles?.full_name || "Traveler";
    const travelerEmail = bk?.profiles?.email || "";
    const travelerPhone = bk?.profiles?.phone || "";
    const totalPrice = Number(bk?.price || amount);
    const bookingRef = bookingId.slice(0, 8).toUpperCase();
    const amountFormatted = `\u20B9${Number(amount).toLocaleString("en-IN")}`;
    const totalFormatted = `\u20B9${totalPrice.toLocaleString("en-IN")}`;
    const paymentMethodLabel =
      paymentMethod === "card" ? "Credit / Debit Card" :
      paymentMethod === "upi" ? "UPI" :
      paymentMethod === "netbanking" ? "Net Banking" :
      paymentMethod || "Online";
    const normalizedBookingStatus = String(bk?.payment_status || "").toLowerCase().trim();

    // 4. Fetch assigned manager
    let managerEmail = "";
    let managerName = "";
    const leads = bk?.leads;
    const leadObj = Array.isArray(leads) ? leads[0] : leads;
    const assignedTo = leadObj?.assigned_to;
    if (assignedTo) {
      const { data: mgr } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", assignedTo)
        .single();
      if (mgr) {
        managerEmail = (mgr as any).email || "";
        managerName = (mgr as any).full_name || "";
      }
    }

    // ── 4b. Auto-complete payment follow-up when booking is paid ──
    if (leadObj?.id && normalizedBookingStatus === "paid") {
      const leadId = leadObj.id;
      // Find the step 7 task for this lead
      const { data: step7Task } = await supabaseAdmin
        .from("tasks")
        .select("id, status")
        .eq("source_kind", "lead")
        .eq("source_id", leadId)
        .eq("step", 7)
        .neq("status", "completed")
        .maybeSingle();

      if (step7Task) {
        // Mark payment follow-up as completed
        await supabaseAdmin
          .from("tasks")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", step7Task.id);
        
        // Update lead status to "converted"
        await supabaseAdmin
          .from("leads")
          .update({ status: "converted" })
          .eq("id", leadId);

        // Add lead note for the activity timeline
        await supabaseAdmin
          .from("lead_notes")
          .insert({
            lead_id: leadId,
            content: `Payment Follow-up: Pending → Done by traveler payment.\n- Status: Paid\n- Amount: ${amountFormatted}\n- Transaction Ref: ${transactionId}\n- Booking Ref: ${bookingRef}\n(Automatically updated when booking payment_status changed to paid)`,
            created_by: assignedTo || null
          });

        // Notify Manager
        if (assignedTo) {
          try {
            await supabaseAdmin.from("notifications").insert({
              user_id: assignedTo,
              title: "Payment Follow-up Completed",
              body: `Payment for "${travelerName}" is marked paid and the payment follow-up task has been completed automatically.`,
              type: "Payment Follow-up Completed",
              priority: "High",
              source_id: leadId,
              is_read: false,
            });
          } catch (err) {
            console.error("Failed to notify manager in API:", err);
          }
        }

        // Create Step 8 Task ("Confirm Booking") if not already created
        const { data: existingStep8 } = await supabaseAdmin
          .from("tasks")
          .select("id")
          .eq("source_kind", "lead")
          .eq("source_id", leadId)
          .eq("step", 8)
          .maybeSingle();

        if (!existingStep8) {
          const dueDate = new Date();
          const dueDateStr = dueDate.toISOString();

          await supabaseAdmin.from("tasks").insert([{
            title: "Confirm Booking",
            description: `All tasks complete. Confirm the booking for ${travelerName} to finalize their trip registration.`,
            related_to: travelerName,
            related_id: leadObj?.enquiry_id || `LEAD-${leadId.slice(0, 6).toUpperCase()}`,
            source_kind: "lead",
            source_id: leadId,
            type: "booking",
            priority: "High",
            due_date: dueDateStr,
            status: "to do",
            assigned_to: assignedTo,
            created_by: assignedTo,
            details: `All tasks complete. Confirm the booking for ${travelerName} to finalize their trip registration.`,
            subtasks: [
              { title: "Verify all tasks completed", completed: false },
              { title: "Confirm payment received", completed: false },
              { title: "Click Confirm Booking to finalize", completed: false }
            ],
            step: 8,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
        }
      }
    }


    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    const paymentContext = {
      travelerName, travelerEmail, travelerPhone,
      tripTitle, tripDestination,
      bookingRef, transactionId,
      amountFormatted, totalFormatted,
      paymentMethodLabel, paidAtFormatted,
      managerName,
    };

    // Dispatch email notifications sequentially with 600ms delay to satisfy SMTP rate limit
    if (travelerEmail) {
      try {
        await fetch(`${origin}/api/notifications/deliver`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: travelerEmail,
            title: `✅ Payment Confirmed — ${tripTitle}`,
            body: `Your payment of ${amountFormatted} for ${tripTitle} has been confirmed. Transaction ID: ${transactionId}`,
            type: "Payment Received - Traveler",
            priority: "High",
            source_id: bookingId,
            paymentContext,
          }),
        });
      } catch (e) {
        console.error("Traveler email error:", e);
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    const adminEmail = getAdminEmail();
    try {
      await fetch(`${origin}/api/notifications/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          title: `💳 Payment Received — ${travelerName} | ${tripTitle}`,
          body: `Payment of ${amountFormatted} received from ${travelerName} for booking ${bookingRef}.`,
          type: "Payment Received - Admin",
          priority: "High",
          source_id: bookingId,
          paymentContext,
        }),
      });
    } catch (e) {
      console.error("Admin email error:", e);
    }

    if (managerEmail) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      try {
        await fetch(`${origin}/api/notifications/deliver`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: managerEmail,
            title: `🎯 Client Payment Received — ${travelerName}`,
            body: `${travelerName} has completed payment of ${amountFormatted} for ${tripTitle}. Booking ${bookingRef} is now fully paid.`,
            type: "Payment Received - Manager",
            priority: "High",
            source_id: bookingId,
            paymentContext,
          }),
        });
      } catch (e) {
        console.error("Manager email error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      transactionId,
      bookingRef,
    });
  } catch (error: any) {
    console.error("Payment complete error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
