import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "@/lib/supabase/config";
import { createTimeoutFetch } from "@/lib/supabase/fetch";

export function createAdminClient() {
  const environment = getSupabaseEnvironment();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!environment || !serviceRoleKey) {
    throw new Error("Līmeņa uzskaitei serverī jākonfigurē SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createSupabaseClient(environment.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { fetch: createTimeoutFetch(10_000) },
  });
}
