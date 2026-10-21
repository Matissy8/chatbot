import { cookies } from "next/headers";
import { apiErrorResponse } from "@/lib/api-error";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";
import { createClient } from "@/lib/supabase/server";

const periods = new Set(["week", "month", "semester", "allTime"]);

type LeaderboardRow = {
  rank_position: number;
  display_name: string;
  xp: number;
  streak: number;
  is_current_user: boolean;
};

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    if (isGuestModeEnabled() && cookieStore.get(GUEST_COOKIE_NAME)?.value === "1") {
      return Response.json({ error: "Līderu sarakstam nepieciešams autentificēts konts." }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

    const period = new URL(request.url).searchParams.get("period") ?? "allTime";
    if (!periods.has(period)) return Response.json({ error: "Līderu saraksta periods nav derīgs." }, { status: 400 });

    const { data, error } = await supabase.rpc("get_leaderboard", { p_period: period });
    if (error) {
      console.error("Failed to load leaderboard:", error);
      return Response.json({ error: "Neizdevās ielādēt līderu sarakstu." }, { status: 500 });
    }

    const leaders = (data ?? []).map((leader: LeaderboardRow) => ({
      rank: Number(leader.rank_position),
      displayName: leader.display_name,
      xp: Number(leader.xp),
      streak: Number(leader.streak),
      isCurrentUser: leader.is_current_user,
    }));

    return Response.json({ leaders }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās ielādēt līderu sarakstu.");
  }
}
