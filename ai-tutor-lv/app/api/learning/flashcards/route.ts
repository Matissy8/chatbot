import { flashcards } from "@/lib/music-learning-data";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

    const { data, error } = await supabase
      .from("flashcard_progress")
      .select("card_id, known_count, review_count");
    if (error) {
      console.error("Flashcard progress load failed:", error);
      return Response.json({ error: "Neizdevās ielādēt kartīšu progresu." }, { status: 503 });
    }
    return Response.json({ progress: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās ielādēt kartīšu progresu.");
  }
}

export async function POST(request: Request) {
  try {
    let body: { cardId?: unknown; knew?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Kartītes vērtējums nav derīgs." }, { status: 400 });
    }

    if (typeof body.cardId !== "string" || !flashcards.some((card) => card.id === body.cardId) || typeof body.knew !== "boolean") {
      return Response.json({ error: "Kartītes vērtējums nav derīgs." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

    const { data, error } = await supabase.rpc("record_flashcard_review", {
      p_card_id: body.cardId,
      p_knew: body.knew,
    });
    if (error) {
      console.error("Flashcard review could not be saved:", error);
      return Response.json({ error: "Neizdevās saglabāt kartītes progresu." }, { status: 503 });
    }
    const result = Array.isArray(data) ? data[0] : data;
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās saglabāt kartītes progresu.");
  }
}
