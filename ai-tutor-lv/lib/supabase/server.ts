import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnvironment } from "@/lib/supabase/config";

export async function createClient() {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    throw new Error("Supabase nav konfigurēts. Pievieno URL un anonīmo atslēgu .env.local failā.");
  }

  const cookieStore = await cookies();

  return createServerClient(environment.url, environment.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions);
          });
        } catch {
          // Server Components cannot write cookies; the proxy refreshes auth cookies.
        }
      },
    },
  });
}

export const createSupabaseServerClient = createClient;
