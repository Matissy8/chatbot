import { connection } from "next/server";
import { PricingSection } from "@/components/pricing/PricingSection";
import { createClient } from "@/lib/supabase/server";
import { fetchActiveDailyUsage } from "@/lib/daily-usage";
import type { Plan } from "@/lib/plans";

export default async function PricingPage() {
  // Plan and usage are per user, so this page must never be prerendered or cached.
  await connection();

  let plan: Plan = "free";
  let used: number | null | undefined;
  let usageError: string | undefined;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.plan === "pro") plan = "pro";

      const usage = await fetchActiveDailyUsage(user.id);
      used = usage.count;
      usageError = usage.error ?? undefined;
    }
  } catch (error) {
    console.error("Unable to load the user's plan and chat usage:", error);
    if (used === undefined) {
      used = null;
      usageError = "Neizdevās nolasīt dienas limitu.";
    }
  }

  return <PricingSection plan={plan} used={used} usageError={usageError} />;
}
