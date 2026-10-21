import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function handlePost(request: Request) {
  let body: { action?: unknown; attemptId?: unknown; questionId?: unknown; selectedOption?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pieprasījuma dati nav derīgi." }, { status: 400 });
  }

  if (body.action !== "start" && body.action !== "answer" && body.action !== "complete") {
    return Response.json({ error: "Viktorīnas darbība nav derīga." }, { status: 400 });
  }
  if (body.action !== "start" && (typeof body.attemptId !== "string" || !uuidPattern.test(body.attemptId))) {
    return Response.json({ error: "Viktorīnas mēģinājums nav derīgs." }, { status: 400 });
  }
  if (body.action === "answer" && (
    typeof body.questionId !== "string" ||
    body.questionId.length > 40 ||
    !Number.isInteger(body.selectedOption) ||
    (body.selectedOption as number) < 0 ||
    (body.selectedOption as number) > 3
  )) {
    return Response.json({ error: "Atbilde nav derīga." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

  if (body.action === "start") {
    const { data, error } = await supabase.rpc("start_quick_quiz");
    if (error || !data) {
      console.error("Quick quiz creation failed:", error);
      return Response.json({ error: "Neizdevās sākt viktorīnu. Pārbaudi Supabase shēmu." }, { status: 503 });
    }
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "answer") {
    const { data, error } = await supabase.rpc("submit_quick_quiz_answer", {
      p_attempt_id: body.attemptId as string,
      p_question_id: body.questionId as string,
      p_selected_option: body.selectedOption as number,
    });
    if (error) {
      console.error("Quick quiz answer check failed:", error);
      const status = /not found|expired/i.test(error.message) ? 404 : 503;
      return Response.json({ error: status === 404 ? "Viktorīnas mēģinājums nav atrasts vai ir beidzies." : "Neizdevās pārbaudīt atbildi." }, { status });
    }
    return Response.json(Array.isArray(data) ? data[0] : data, { headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase.rpc("complete_quick_quiz", {
    p_attempt_id: body.attemptId as string,
  });
  if (error) {
    console.error("Quick quiz completion failed:", error);
    const status = /not found|expired/i.test(error.message) ? 404 : 503;
    return Response.json({ error: status === 404 ? "Viktorīnas mēģinājums nav atrasts vai ir beidzies." : "Neizdevās saglabāt viktorīnas rezultātu." }, { status });
  }
  return Response.json(Array.isArray(data) ? data[0] : data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās apstrādāt viktorīnas darbību. Mēģini vēlreiz.");
  }
}
