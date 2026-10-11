export const GUEST_COOKIE_NAME = "aitutor-guest";

export function isGuestModeEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_GUEST_MODE === "true";
}
