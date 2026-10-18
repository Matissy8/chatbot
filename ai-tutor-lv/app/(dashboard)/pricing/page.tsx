import { connection } from "next/server";
import { PricingSection } from "@/components/pricing/PricingSection";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/plans";

export default async function PricingPage() {
  // Plan and usage are per user, so this page must never be prerendered or cached.
  await connection();

  let plan: Plan = "free";
  let used: number | undefined;

  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_chat_credits");
    const row = (Array.isArray(data) ? data[0] : data) as { user_plan?: unknown; questions_used?: unknown } | null;
    if (row?.user_plan === "pro") plan = "pro";
    else if (typeof row?.questions_used === "number") used = row.questions_used;
  } catch (error) {
    // Show the plans even when usage cannot be loaded (guest preview or migration not applied yet).
    console.error("Unable to load chat credits:", error);
  }

  return <PricingSection plan={plan} used={used} />;
}
