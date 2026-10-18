import { getSupabaseEnvironment } from "@/lib/supabase/config";

// The button is shown only once Google is enabled in the Supabase dashboard; otherwise it would open a raw JSON error page.
export async function isGoogleAuthEnabled() {
  const environment = getSupabaseEnvironment();
  if (!environment) return false;

  try {
    const response = await fetch(`${environment.url}/auth/v1/settings`, {
      headers: { apikey: environment.anonKey },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    });
    if (!response.ok) return false;
    const settings = (await response.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
