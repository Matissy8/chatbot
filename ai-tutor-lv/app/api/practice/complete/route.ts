import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: { attemptId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pieprasījuma dati nav derīgi." }, { status: 400 });
  }

  if (typeof body.attemptId !== "string" || !uuidPattern.test(body.attemptId)) {
    return Response.json({ error: "Viktorīnas mēģinājums nav derīgs." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await supabase.rpc("complete_practice_attempt", {
    p_attempt_id: body.attemptId,
  });
  if (error) {
    console.error("Practice completion failed:", error);
    const status = error.message.includes("not found") || error.message.includes("expired") ? 404 : 503;
    return Response.json({
      error: status === 404 ? "Prakses mēģinājums nav atrasts vai ir beidzies." : "Neizdevās saglabāt prakses rezultātu. Pārbaudi Supabase shēmu.",
    }, { status });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return Response.json({
    awarded: Boolean(result?.awarded),
    score: Number(result?.score ?? 0),
    total: Number(result?.question_count ?? 0),
    xpAwarded: result?.awarded ? 50 : 0,
    totalXp: Number(result?.total_xp ?? 0),
  });
}