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
      .select("image_url")
      .eq("id", id)
      .single();

    if (error || !trip || !trip.image_url) {
      // Redirect to a default public Unsplash image if no image in database
      return NextResponse.redirect(
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"
      );
    }

    const imageUrl = trip.image_url;

    // Check if it's a base64 data URI
    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");

        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // If it's a relative URL, redirect to absolute path
    if (imageUrl.startsWith("/")) {
      const requestUrl = new URL(request.url);
      return NextResponse.redirect(`${requestUrl.origin}${imageUrl}`);
    }

    // Otherwise redirect to the external/public URL directly
    return NextResponse.redirect(imageUrl);
  } catch (error: any) {
    console.error("Failed to serve trip image dynamically:", error);
    return NextResponse.redirect(
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"
    );
  }
}
