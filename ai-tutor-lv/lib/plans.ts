export type Plan = "free" | "pro";

// Display copy only; the enforced limit lives in public.free_daily_chat_limit() (supabase/schema_plans.sql).
export const FREE_DAILY_QUESTION_LIMIT = 10;

export const DAILY_LIMIT_CODE = "DAILY_LIMIT_REACHED";
