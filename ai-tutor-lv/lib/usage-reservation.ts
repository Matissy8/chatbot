import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_LIMIT_CODE, FREE_DAILY_QUESTION_LIMIT } from "@/lib/plans";

type AdminClient = ReturnType<typeof createAdminClient>;

export function getReservationId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value)) return getReservationId(value[0]);
  if (typeof value === "object" && value !== null && "reservation_id" in value) {
    return getReservationId(value.reservation_id);
  }
  return null;
}

export function isConfirmed(value: unknown): boolean {
  if (value === true) return true;
  if (Array.isArray(value)) return isConfirmed(value[0]);
  return typeof value === "object" && value !== null && "confirmed" in value && value.confirmed === true;
}

export async function cancelReservation(admin: AdminClient, reservationId: string) {
  try {
    const { error } = await admin.rpc("cancel_daily_usage", { p_reservation_id: reservationId });
    if (error) console.error("Failed to cancel daily chat reservation:", error);
  } catch (error) {
    console.error("Failed to cancel daily chat reservation:", error);
  }
}

export type DailyUsageReservation = { admin: AdminClient; reservationId: string | null };

// Reserves one request of the shared free-plan daily limit. Pro accounts get a null reservationId; otherwise a Response explains why the request cannot continue.
export async function reserveDailyUsage(userId: string): Promise<DailyUsageReservation | Response> {
  let admin: AdminClient;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Daily usage reservations require the server-side Supabase service role key:", error);
    return Response.json({ error: "Serverī nav konfigurēta dienas limita rezervēšana. Sazinies ar vietnes administratoru." }, { status: 503 });
  }

  const { data: profile, error: planError } = await admin.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (planError) {
    console.error("Unable to read the user's plan before reserving usage:", planError);
    return Response.json({ error: "Neizdevās nolasīt konta plānu. Pārbaudi Supabase datubāzes shēmu." }, { status: 503 });
  }
  if (profile?.plan === "pro") return { admin, reservationId: null };

  const { data, error } = await admin.rpc("try_reserve_daily_usage", {
    p_user_id: userId,
    p_max_limit: FREE_DAILY_QUESTION_LIMIT,
  });
  if (error) {
    console.error("Unable to reserve daily usage:", error);
    return Response.json({ error: "Neizdevās rezervēt dienas limita pieprasījumu." }, { status: 503 });
  }

  const reservationId = getReservationId(data);
  if (!reservationId) {
    return Response.json(
      { error: `Šodienas bezmaksas limits (${FREE_DAILY_QUESTION_LIMIT} jautājumi) ir sasniegts.`, code: DAILY_LIMIT_CODE, limit: FREE_DAILY_QUESTION_LIMIT },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }
  return { admin, reservationId };
}

export async function confirmReservation(admin: AdminClient, reservationId: string) {
  const { data, error } = await admin.rpc("confirm_daily_usage", { p_reservation_id: reservationId });
  if (error || !isConfirmed(data)) {
    console.error("Unable to confirm daily usage reservation:", error);
    return false;
  }
  return true;
}
