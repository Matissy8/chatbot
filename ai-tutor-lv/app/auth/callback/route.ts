import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Only same-site paths are allowed, so the callback can never redirect to another origin.
function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/chat";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const failure = NextResponse.redirect(`${origin}/login?error=oauth`);

  const code = searchParams.get("code");
  if (!code || !isSupabaseConfigured()) return failure;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth code exchange failed:", error.message);
      return failure;
    }
  } catch (error) {
    console.error("OAuth callback failed:", error);
    return failure;
  }

  return NextResponse.redirect(`${origin}${safeNextPath(searchParams.get("next"))}`);
}
