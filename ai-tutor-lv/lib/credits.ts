import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type ChatCreditResult = { blocked: false } | { blocked: true; limit: number };

const MISSING_FUNCTION_CODES = new Set(["PGRST202", "42883"]);

// Spends one daily question atomically in the database; PRO users are never blocked.
export async function consumeChatCredit(supabase: ServerClient): Promise<ChatCreditResult> {
  const { data, error } = await supabase.rpc("consume_chat_credit");

  if (error) {
    if (MISSING_FUNCTION_CODES.has(error.code)) {
      // Deploy order: keep chat working if the migration has not been applied yet.
      console.error("consume_chat_credit is missing; apply supabase/schema_plans.sql.", error);
      return { blocked: false };
    }
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as { is_allowed?: unknown; questions_limit?: unknown } | null;
  if (!row || typeof row.is_allowed !== "boolean") throw new Error("Unexpected consume_chat_credit response.");

  return row.is_allowed ? { blocked: false } : { blocked: true, limit: Number(row.questions_limit) };
}
