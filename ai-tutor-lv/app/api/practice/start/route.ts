import { createClient } from "@/lib/supabase/server";
import { practiceDifficulties, practiceSubjects, type PracticeDifficulty, type PracticeSubject } from "@/lib/practice-data";

export const runtime = "nodejs";

const subjects = new Set<PracticeSubject>(practiceSubjects.map(({ value }) => value));
const difficulties = new Set<PracticeDifficulty>(practiceDifficulties.map(({ value }) => value));

export async function POST(request: Request) {
  let body: { subject?: unknown; difficulty?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Parametri nav derīgi." }, { status: 400 });
  }

  if (typeof body.subject !== "string" || !subjects.has(body.subject as PracticeSubject) ||
      typeof body.difficulty !== "string" || !difficulties.has(body.difficulty as PracticeDifficulty)) {
    return Response.json({ error: "Izvēlies derīgu priekšmetu un grūtību." }, { status: 400 });
  }

  const subject = body.subject as PracticeSubject;
  const difficulty = body.difficulty as PracticeDifficulty;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await supabase.rpc("start_practice_attempt", {
    p_subject: subject,
    p_difficulty: difficulty,
  });
  if (error || !data) {
    console.error("Practice attempt creation failed:", error);
    return Response.json({ error: "Neizdevās sākt praksi. Pārliecinies, ka izpildīji supabase/schema_practice.sql." }, { status: 503 });
  }

  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
