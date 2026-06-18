import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function PUT() {
  try {
    // Get all users from auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    // For each auth user, insert or update in profiles
    const results = [];
    for (const user of users) {
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || "Unknown",
            avatar_url: user.user_metadata?.avatar_url || null,
            phone: user.phone || null,
            role: (user.user_metadata?.role || "USER").toUpperCase(),
            is_active: true,
          },
          {
            onConflict: "id", // Update if exists, insert if not
          }
        );

      if (upsertError) {
        results.push({
          email: user.email,
          status: "failed",
          error: upsertError.message,
        });
      } else {
        results.push({
          email: user.email,
          status: "synced",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Auth users synced to profiles",
      synced_count: results.filter(r => r.status === "synced").length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
