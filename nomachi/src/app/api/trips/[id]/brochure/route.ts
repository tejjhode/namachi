import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyBrochureToken } from "@/lib/brochure-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

    // Parse the requested index first (needed for token verification)
    const requestUrl2 = new URL(request.url);
    const indexStr2 = requestUrl2.searchParams.get("index") || "0";
    const requestedIndex = parseInt(indexStr2, 10);

    // Verify signed token OR check Supabase user session cookie
    const token = requestUrl2.searchParams.get("token") || "";
    let isAuthorized = false;
    if (token && verifyBrochureToken(id, requestedIndex, token)) {
      isAuthorized = true;
    } else {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          isAuthorized = true;
        }
      } catch (err) {
        console.warn("Failed to verify session cookie in brochure route:", err);
      }
    }

    if (!isAuthorized) {
      return new Response("Unauthorized: Invalid link or session expired.", { status: 401 });
    }

    let targetUrl = trip.brochure_url;
    let targetName = "brochure.pdf";

    if (trip.brochure_url.startsWith("[")) {
      try {
        const brochures = JSON.parse(trip.brochure_url);
        const item = brochures[requestedIndex] || brochures[0];
        if (item) {
          targetUrl = item.url || "";
          targetName = item.name || `brochure_${requestedIndex + 1}.pdf`;
        }
      } catch (err) {
        console.error("Failed to parse multiple brochures JSON:", err);
      }
    }

    // Check if it's a base64 data URI
    if (targetUrl.startsWith("data:")) {
      const match = targetUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        
        const isDownload = requestUrl2.searchParams.get("download") === "true";

        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${targetName}"`,
          },
        });
      }
    }

    // If it's a relative URL, redirect to absolute path
    if (targetUrl.startsWith("/")) {
      const requestUrl = new URL(request.url);
      return NextResponse.redirect(`${requestUrl.origin}${targetUrl}`);
    }

    // Otherwise redirect to the external/public URL directly
    return NextResponse.redirect(targetUrl);
  } catch (error: any) {
    console.error("Failed to serve trip brochure dynamically:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
