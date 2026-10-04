import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: { attemptId?: unknown; questionId?: unknown; selectedOption?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Atbilde nav derīga." }, { status: 400 });
  }
  if (typeof body.attemptId !== "string" || !uuidPattern.test(body.attemptId) ||
      typeof body.questionId !== "string" || body.questionId.length > 40 ||
      !Number.isInteger(body.selectedOption) || (body.selectedOption as number) < 0 || (body.selectedOption as number) > 7) {
    return Response.json({ error: "Atbilde nav derīga." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await supabase.rpc("submit_practice_answer", {
    p_attempt_id: body.attemptId,
    p_question_id: body.questionId,
    p_selected_option: body.selectedOption,
  });
  if (error) {
    console.error("Practice answer check failed:", error);
    return Response.json({ error: "Neizdevās pārbaudīt atbildi. Mēģinājums var būt beidzies." }, { status: 400 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return Response.json(result);
}