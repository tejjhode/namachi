import { NextResponse } from "next/server";
import { createSupabaseServerClient, supabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 1. Delete profile from public.profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      console.error("Error deleting user profile:", profileError);
    }

    // 2. Delete the user from auth.users (requires admin service role)
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) {
      return NextResponse.json(
        { error: `Auth deletion failed: ${authError.message}` },
        { status: 500 }
      );
    }

    // 3. Clear auth cookies by calling signOut on the server client
    await client.auth.signOut();

    const response = NextResponse.json({ success: true, message: "Account deleted successfully" });
    // Prevent caching
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: any) {
    console.error("Account deletion failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
