import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("=== CALLBACK REQUEST ===");
  console.log("Full URL:", request.url);
  console.log("Code Param:", code);
  console.log("=========================");

  const next = searchParams.get("next") ?? "/";
  let response = NextResponse.redirect(`${origin}${next}`);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
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
      return response;
    }
  }

  // If there's an error or code is missing, redirect to login page with error param
  return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
}
