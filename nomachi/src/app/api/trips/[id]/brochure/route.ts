import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client using the service role key to bypass RLS checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return new Response("Missing trip ID", { status: 400 });
    }

    const { data: trip, error } = await supabaseAdmin
      .from("trips")
      .select("brochure_url")
      .eq("id", id)
      .single();

    if (error || !trip || !trip.brochure_url) {
      return new Response("Brochure not found", { status: 404 });
    }

    const brochureUrl = trip.brochure_url;

    // Check if it's a base64 data URI
    if (brochureUrl.startsWith("data:")) {
      const match = brochureUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");

        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Disposition": "inline; filename=\"brochure.pdf\"",
          },
        });
      }
    }

    // If it's a relative URL, redirect to absolute path
    if (brochureUrl.startsWith("/")) {
      const requestUrl = new URL(request.url);
      return NextResponse.redirect(`${requestUrl.origin}${brochureUrl}`);
    }

    // Otherwise redirect to the external/public URL directly
    return NextResponse.redirect(brochureUrl);
  } catch (error: any) {
    console.error("Failed to serve trip brochure dynamically:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
