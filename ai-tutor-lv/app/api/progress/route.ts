import { apiErrorResponse } from "@/lib/api-error";
import { MUSIC_SUBJECTS, normalizeMusicSubject, type MusicSubjectId } from "@/lib/music-subjects";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

    const subjectXp: Record<MusicSubjectId, number> = Object.fromEntries(
      MUSIC_SUBJECTS.map(({ id }) => [id, 0])
    ) as Record<MusicSubjectId, number>;
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let weeklyXp = 0;
    const pageSize = 1000;

    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("xp_transactions")
        .select("id, amount, subject, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        console.error("Progress statistics load failed:", error);
        return Response.json({ error: "Neizdevās ielādēt progresa statistiku." }, { status: 503 });
      }

      for (const transaction of data ?? []) {
        const amount = Number(transaction.amount);
        const subject = normalizeMusicSubject(transaction.subject);
        if (subject) subjectXp[subject] += amount;
        const createdAt = new Date(transaction.created_at).getTime();
        if (createdAt >= weekStart && createdAt <= Date.now()) weeklyXp += amount;
      }

      if (!data || data.length < pageSize) break;
    }

    return Response.json(
      { subjectXp, weeklyXp },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās ielādēt progresa statistiku.");
  }
}
