import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateBrochureToken } from "@/lib/brochure-token";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/brochure-token
 * Body: { tripId: string, index?: number }
 * Returns: { url: string } — a signed, time-limited brochure download URL
 * Requires a valid Supabase session (authenticated manager or admin only).
 */
export async function POST(request: Request) {
  try {
    // Verify authenticated session via Authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role || "").toLowerCase();
    if (!["manager", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { tripId, index = 0 } = body;

    if (!tripId) {
      return NextResponse.json({ error: "tripId is required" }, { status: 400 });
    }

    // Verify the trip exists and has a brochure
    const { data: trip } = await supabaseAdmin
      .from("trips")
      .select("id, brochure_url")
      .eq("id", tripId)
      .single();

    if (!trip || !trip.brochure_url) {
      return NextResponse.json({ error: "No brochure found for this trip" }, { status: 404 });
    }

    const signedToken = generateBrochureToken(tripId, index);
    const origin = new URL(request.url).origin;
    const url = `${origin}/api/trips/${tripId}/brochure?index=${index}&token=${signedToken}`;

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("Failed to generate brochure token:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
