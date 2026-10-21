import { createAdminClient } from "@/lib/supabase/admin";

export type DailyUsageResult =
  | { count: number; error: null }
  | { count: null; error: string };

function getRigaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function fetchActiveDailyUsage(userId: string): Promise<DailyUsageResult> {
  try {
    const supabase = createAdminClient();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("daily_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("usage_date", getRigaDate(new Date()))
      .or(`status.eq.confirmed,and(status.eq.pending,created_at.gte.${fiveMinutesAgo})`);

    if (error) {
      console.error("Unable to read daily chat usage:", error);
      return { count: null, error: "Neizdevās nolasīt dienas limitu." };
    }

    return { count: count ?? 0, error: null };
  } catch (error) {
    console.error("Unable to read daily chat usage:", error);
    return { count: null, error: "Neizdevās nolasīt dienas limitu." };
  }
}
