import { createClient } from "@/lib/supabase/server";

export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  subject = "General"
): Promise<number> {
  if (amount !== 15 || reason !== "Uzdots jautājums AI asistentam") {
    throw new Error("Unsupported XP reward.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error("Unauthorized XP award request.");
  }

  const { data, error } = await supabase.rpc("award_chat_xp", {
    p_user_id: user.id,
    p_subject: subject,
  });
  if (error) throw new Error(`Failed to award chat XP: ${error.message}`);
  return Number(data);
}
