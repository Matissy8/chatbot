import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });
    }

    const { error: refreshError } = await supabase.rpc("refresh_user_achievements");
    if (refreshError) {
      console.error("Achievement unlock refresh failed:", refreshError);
      return Response.json(
        { error: "Neizdevās ielādēt sasniegumus. Pārbaudi Supabase datubāzes shēmu." },
        { status: 503 }
      );
    }

    const [profileResult, flashcardResult, quizResult, achievementsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("xp, streak")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("flashcard_progress")
        .select("known_count, review_count")
        .eq("user_id", user.id),
      supabase.rpc("get_quick_quiz_achievement_stats"),
      supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", user.id),
    ]);

    if (profileResult.error || flashcardResult.error || quizResult.error || achievementsResult.error) {
      console.error("Achievement statistics load failed:", {
        profile: profileResult.error,
        flashcards: flashcardResult.error,
        quiz: quizResult.error,
        achievements: achievementsResult.error,
      });
      return Response.json(
        { error: "Neizdevās ielādēt sasniegumus. Pārbaudi Supabase datubāzes shēmu." },
        { status: 503 }
      );
    }

    const quizStats = Array.isArray(quizResult.data) ? quizResult.data[0] : quizResult.data;
    const statistics = {
      xp: Number(profileResult.data?.xp ?? 0),
      streak: Number(profileResult.data?.streak ?? 0),
      completedQuizzes: Number(quizStats?.completed_quizzes ?? 0),
      bestQuizScore: Number(quizStats?.best_score ?? 0),
      bestQuizQuestionCount: Number(quizStats?.best_question_count ?? 0),
      unlockedAchievementIds: (achievementsResult.data ?? []).map((item) => item.achievement_id),
      reviewedCards: (flashcardResult.data ?? []).reduce(
        (total, card) => total + Number(card.known_count) + Number(card.review_count),
        0
      ),
    };

    return Response.json(statistics, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās ielādēt sasniegumus.");
  }
}
