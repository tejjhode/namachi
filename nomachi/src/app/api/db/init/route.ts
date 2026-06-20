import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db/init";
import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";

export async function POST() {
  try {
    // 1. Check authenticated user
    const client = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Verify role is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = (profile?.role || user.user_metadata?.role || "").trim().toLowerCase();
    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const success = await initializeDatabase();

    if (!success) {
      return NextResponse.json(
        { success: false, message: "Database initialization completed with warnings." },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to initialize database." },
      { status: 500 }
    );
  }
}

