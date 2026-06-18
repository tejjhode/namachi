import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function handleSignOut(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.auth.signOut();
    }
  } catch (error: any) {
    console.error("Sign out execution warning:", error);
  }
}

export async function POST(request: Request) {
  await handleSignOut(request);
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  await handleSignOut(request);
  
  // Return a redirect response to the root page, forcing the browser to load it fresh
  const response = NextResponse.redirect(new URL("/", origin));
  
  // Set headers to prevent caching of the redirect
  response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  
  return response;
}
