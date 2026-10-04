import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnvironment } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    throw new Error("Supabase nav konfigurēts. Pievieno URL un anonīmo atslēgu .env.local failā.");
  }

  return createBrowserClient(environment.url, environment.anonKey);
}
