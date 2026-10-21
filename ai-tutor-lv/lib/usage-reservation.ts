import type { createAdminClient } from "@/lib/supabase/admin";

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

export async function cancelReservation(admin: ReturnType<typeof createAdminClient>, reservationId: string) {
  try {
    const { error } = await admin.rpc("cancel_daily_usage", { p_reservation_id: reservationId });
    if (error) console.error("Failed to cancel daily chat reservation:", error);
  } catch (error) {
    console.error("Failed to cancel daily chat reservation:", error);
  }
}
