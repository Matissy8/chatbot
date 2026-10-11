import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";

export default async function HomePage() {
  const cookieStore = await cookies();
  if (isGuestModeEnabled() && cookieStore.get(GUEST_COOKIE_NAME)?.value === "1") redirect("/chat");
  if (!isSupabaseConfigured()) redirect("/login");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile?.onboarding_completed_at ? "/chat" : "/onboarding");
}
