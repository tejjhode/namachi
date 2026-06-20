import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create an unmodified response by default
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // IMPORTANT: Use getUser() instead of getSession() for security.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/manager") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/profile");
    
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // If the user is NOT logged in and tries to access a protected route, redirect to login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    redirectUrl.searchParams.set("error", "Please log in to access this page");
    return NextResponse.redirect(redirectUrl);
  }

  // If the user is ALREADY logged in and tries to access login/signup, redirect to dashboard
  if (isAuthRoute && user) {
    const redirectUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Mandatory Profile Setup check for logged-in travelers (USER role)
  if (user) {
    const isSetupIgnored =
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/profile-setup");

    if (!isSetupIgnored) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, gender, date_of_birth, nationality, role")
          .eq("id", user.id)
          .single();

        const role = (profile?.role || user.user_metadata?.role || "USER").trim().toUpperCase();
        if (role === "USER") {
          const isProfileIncomplete =
            !profile?.phone ||
            !profile?.gender ||
            !profile?.date_of_birth ||
            !profile?.nationality;

          if (isProfileIncomplete) {
            const redirectUrl = new URL("/profile-setup", request.url);
            return NextResponse.redirect(redirectUrl);
          }
        }
      } catch (err) {
        console.warn("Middleware profile setup check error:", err);
      }
    }
  }

  // For all other routes (like "/"), the middleware allows the request to continue
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to add more excluded paths here (e.g. api/public-route)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
