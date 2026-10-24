import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnvironment } from "@/lib/supabase/config";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";
import { createTimeoutFetch } from "@/lib/supabase/fetch";

const guestAllowedRoutes = [
  "/chat",
  "/practice",
  "/progress",
  "/leaderboard",
  "/profile",
  "/pricing",
  "/settings",
  "/achievements",
  "/teacher-tools",
  "/assistant-screen",
];

const protectedRoutes = [
  "/api/chat",
  "/api/practice",
  "/api/progress",
  "/api/teacher-tools",
  "/api/assistant-screen",
  "/api/audio-quiz",
  "/chat",
  "/chats",
  "/audio-quiz",
  "/practice",
  "/progress",
  "/leaderboard",
  "/profile",
  "/pricing",
  "/settings",
  "/achievements",
  "/teacher-tools",
  "/assistant-screen",
  "/onboarding",
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isGuest = isGuestModeEnabled() && request.cookies.get(GUEST_COOKIE_NAME)?.value === "1";

  if (isGuest && guestAllowedRoutes.includes(pathname)) {
    return NextResponse.next({ request });
  }

  if (isGuest && ["/api/chat", "/api/teacher-tools", "/api/assistant-screen"].includes(pathname)) {
    return NextResponse.next({ request });
  }

  if (isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  const environment = getSupabaseEnvironment();

  if (!environment) {
    if (isProtectedRoute) {
      if (pathname.startsWith("/api/")) {
        return Response.json({ error: "Autentifikācijas pakalpojums nav konfigurēts." }, { status: 503 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(environment.url, environment.anonKey, {
    global: { fetch: createTimeoutFetch(8_000) },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let isAuthenticated = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = !error && typeof data?.claims?.sub === "string";
  } catch (error) {
    // A Supabase outage should degrade to "signed out" rather than a 500 on every page.
    console.error("Proxy auth check failed:", error);
  }

  if (isProtectedRoute && !isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });
    }
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (isAuthenticated && ["/login", "/register"].includes(pathname)) {
    const redirectResponse = NextResponse.redirect(new URL("/chat", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};