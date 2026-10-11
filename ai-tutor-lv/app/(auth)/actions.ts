"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";

export type AuthActionResult = {
  error?: string;
  message?: string;
};

const SIGNUP_STATUS_MESSAGE = "Ja konts ar šo e-pastu jau pastāv, pieslēdzies. Ja šī ir jauna reģistrācija, pārbaudi e-pastu un apstiprini kontu.";

function supabaseSetupError(): AuthActionResult | null {
  return isSupabaseConfigured()
    ? null
    : { error: "Supabase nav konfigurēts. Pievieno projekta URL un anonīmo vai publicējamo atslēgu .env.local failā." };
}

function formatAuthError(message: string): string {
  if (message.toLowerCase().includes("invalid login credentials")) return "E-pasts vai parole nav pareiza.";
  if (message.toLowerCase().includes("user already registered")) return "Šis e-pasts jau ir reģistrēts. Pieslēdzies savam kontam.";
  if (message.toLowerCase().includes("password should be at least")) return "Parolei jābūt vismaz 6 rakstzīmes garai.";
  if (/fetch failed|timeout|timed out|aborted|network|ENOTFOUND|ECONN/i.test(message)) {
    return "Neizdevās sazināties ar autentifikācijas serveri. Mēģini vēlreiz pēc brīža.";
  }
  return message;
}

export async function login(previousState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  void previousState;
  const setupError = supabaseSetupError();
  if (setupError) return setupError;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Ievadi e-pastu un paroli." };

  let authError: { message: string } | null;
  try {
    const supabase = await createClient();
    ({ error: authError } = await supabase.auth.signInWithPassword({ email, password }));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "auth server unavailable";
    return { error: formatAuthError(message) };
  }
  if (authError) return { error: formatAuthError(authError.message) };

  revalidatePath("/", "layout");
  redirect("/chat");
}

export async function signup(previousState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  void previousState;
  const setupError = supabaseSetupError();
  if (setupError) return setupError;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim() || email.split("@")[0];
  if (!email || !password) return { error: "Ievadi e-pastu un paroli." };
  if (password.length < 6) return { error: "Parolei jābūt vismaz 6 rakstzīmes garai." };

  let result: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["signUp"]>>;
  try {
    const supabase = await createClient();
    result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "auth server unavailable";
    return { error: formatAuthError(message) };
  }
  const { data, error } = result;
  if (error) {
    if (error.message.toLowerCase().includes("user already registered")) {
      return { message: SIGNUP_STATUS_MESSAGE };
    }
    return { error: formatAuthError(error.message) };
  }

  if (data.user?.identities?.length === 0) {
    return { message: SIGNUP_STATUS_MESSAGE };
  }

  revalidatePath("/", "layout");
  if (!data.session) {
    return { message: SIGNUP_STATUS_MESSAGE };
  }

  redirect("/onboarding");
}

export async function enterGuestMode() {
  if (!isGuestModeEnabled()) redirect("/login");

  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE_NAME, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  revalidatePath("/", "layout");
  redirect("/chat");
}

export async function signout() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE_NAME);
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase sign-out failed:", error);
    }
  }
  revalidatePath("/", "layout");
  redirect("/login");
}