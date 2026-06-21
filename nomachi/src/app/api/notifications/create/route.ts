import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. Insert notification using admin client (bypasses RLS)
    const { data: notification, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert([
        {
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          type: payload.type,
          priority: payload.priority || "Medium",
          source_id: payload.source_id || null,
          is_read: false,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Async delivery channel checks
    try {
      console.log(`[Create Notification API] Running delivery checks for user_id: ${payload.user_id}`);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, phone, role")
        .eq("id", payload.user_id)
        .maybeSingle();

      if (profile) {
        const rawRole = profile.role || "user";
        const role = rawRole.toLowerCase();
        const titleLower = payload.title.toLowerCase();
        const typeLower = payload.type.toLowerCase();

        console.log(`[Create Notification API] User Profile: email=${profile.email}, role=${role}, titleLower=${titleLower}, typeLower=${typeLower}`);

        let sendEmailTo = "";
        let sendWATo = "";

        // Email Match Checks
        if (role === "user") {
          const matchesEmail =
            titleLower.includes("booking confirmed") ||
            titleLower.includes("payment reminder") ||
            titleLower.includes("payment received") ||
            titleLower.includes("payment failure") ||
            titleLower.includes("refunded") ||
            titleLower.includes("welcome") ||
            titleLower.includes("enquiry") ||
            titleLower.includes("assigned") ||
            titleLower.includes("manager") ||
            titleLower.includes("call") ||
            titleLower.includes("scheduled") ||
            titleLower.includes("vibe check") ||
            typeLower.includes("booking") ||
            typeLower.includes("payment") ||
            typeLower.includes("welcome") ||
            typeLower.includes("enquiry") ||
            typeLower.includes("assign") ||
            typeLower.includes("communication") ||
            typeLower.includes("vibe check");
          console.log(`[Create Notification API] Role traveler matchesEmail: ${matchesEmail}`);
          if (matchesEmail && profile.email) {
            sendEmailTo = profile.email;
          }
        } else if (role === "manager" || role === "staff") {
          const matchesEmail =
            titleLower.includes("assigned") ||
            titleLower.includes("overdue") ||
            titleLower.includes("follow-up") ||
            titleLower.includes("reminder") ||
            titleLower.includes("lead") ||
            typeLower.includes("assign") ||
            typeLower.includes("overdue") ||
            typeLower.includes("lead") ||
            typeLower.includes("task");
          console.log(`[Create Notification API] Role manager/staff matchesEmail: ${matchesEmail}`);
          if (matchesEmail && profile.email) {
            sendEmailTo = profile.email;
          }
        } else if (role === "admin") {
          const matchesEmail =
            titleLower.includes("failure") ||
            titleLower.includes("unassigned") ||
            titleLower.includes("new enquiry") ||
            typeLower.includes("failure") ||
            typeLower.includes("unassigned") ||
            typeLower.includes("enquiry");
          console.log(`[Create Notification API] Role admin matchesEmail: ${matchesEmail}`);
          if (matchesEmail && profile.email) {
            sendEmailTo = profile.email;
          }
        }

        // WhatsApp Match Checks
        if (role === "user") {
          const matchesWA =
            titleLower.includes("booking confirmed") ||
            titleLower.includes("payment reminder") ||
            titleLower.includes("departure reminder") ||
            titleLower.includes("trip starts tomorrow") ||
            typeLower.includes("booking confirmed") ||
            typeLower.includes("payment reminder") ||
            typeLower.includes("departure reminder");
          if (matchesWA && profile.phone) {
            sendWATo = profile.phone;
          }
        }

        console.log(`[Create Notification API] Result: sendEmailTo=${sendEmailTo}, sendWATo=${sendWATo}`);

        // Trigger deliver endpoint
        if (sendEmailTo || sendWATo) {
          const requestUrl = new URL(request.url);
          const origin = requestUrl.origin;

          console.log(`[Create Notification API] Dispatching deliver payload to ${origin}/api/notifications/deliver`);
          fetch(`${origin}/api/notifications/deliver`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: sendEmailTo || undefined,
              phone: sendWATo || undefined,
              title: payload.title,
              body: payload.body,
              priority: payload.priority || "Medium",
              type: payload.type,
              source_id: payload.source_id || undefined,
            }),
          }).catch((err) => console.error("Notification delivery dispatch error:", err));
        }
      }
    } catch (err) {
      console.error("Failed to run server channel checks:", err);
    }

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error("API notification creation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
