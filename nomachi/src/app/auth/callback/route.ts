import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("=== CALLBACK REQUEST ===");
  console.log("Full URL:", request.url);
  console.log("Code Param:", code);
  console.log("=========================");

  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log("=== SESSION EXCHANGE ===");
    console.log("SESSION DATA:", data);
    console.log("SESSION ERROR:", error);
    console.log("========================");

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If there's an error or code is missing, redirect to login page with error param
  return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
}
