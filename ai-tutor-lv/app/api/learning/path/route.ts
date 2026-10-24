import { learningPathLessons } from "@/lib/music-learning-data";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

    const { data, error } = await supabase
      .from("learning_path_progress")
      .select("lesson_id")
      .eq("user_id", user.id);
    if (error) {
      console.error("Learning path progress load failed:", error);
      return Response.json({ error: "Neizdevās ielādēt mācību ceļa progresu." }, { status: 503 });
    }
    return Response.json({ completed: (data ?? []).map((item) => item.lesson_id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās ielādēt mācību ceļa progresu.");
  }
}

export async function POST(request: Request) {
  try {
    let body: { lessonId?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Mācību līmenis nav derīgs." }, { status: 400 });
    }

    const lesson = learningPathLessons.find((item) => item.progressId === body.lessonId);
    if (!lesson || !lesson.progressId) {
      return Response.json({ error: "Mācību līmenis nav derīgs." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

    const { data, error } = await supabase.rpc("complete_learning_path_lesson", {
      p_lesson_id: lesson.progressId,
    });
    if (error) {
      console.error("Learning path lesson could not be completed:", error);
      const status = /previous lesson/i.test(error.message) ? 409 : 503;
      return Response.json({ error: status === 409 ? "Vispirms pabeidz iepriekšējo līmeni." : "Neizdevās saglabāt mācību ceļa progresu." }, { status });
    }
    return Response.json(Array.isArray(data) ? data[0] : data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās saglabāt mācību ceļa progresu.");
  }
}
