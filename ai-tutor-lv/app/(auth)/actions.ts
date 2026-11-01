"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";

export type AuthActionResult = {
  error?: string;
  message?: string;
  // Returned after sign-up so the form can offer to resend the confirmation e-mail.
  email?: string;
};

const SIGNUP_STATUS_MESSAGE = "Ja konts ar šo e-pastu jau pastāv, pieslēdzies. Ja šī ir jauna reģistrācija, pārbaudi e-pastu un apstiprini kontu.";
const RESEND_STATUS_MESSAGE = "Ja konts gaida apstiprinājumu, e-pasta ziņa ir nosūtīta vēlreiz. Pārbaudi arī mēstuļu mapi.";
const RESET_STATUS_MESSAGE = "Ja šāds konts pastāv, uz e-pastu ir nosūtīta paroles atjaunošanas saite.";

async function requestOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

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
      options: { data: { display_name: displayName }, emailRedirectTo: `${await requestOrigin()}/auth/callback` },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "auth server unavailable";
    return { error: formatAuthError(message) };
  }
  const { data, error } = result;
  if (error) {
    if (error.message.toLowerCase().includes("user already registered")) {
      return { message: SIGNUP_STATUS_MESSAGE, email };
    }
    return { error: formatAuthError(error.message) };
  }

  if (data.user?.identities?.length === 0) {
    return { message: SIGNUP_STATUS_MESSAGE, email };
  }

  revalidatePath("/", "layout");
  if (!data.session) {
    return { message: SIGNUP_STATUS_MESSAGE, email };
  }

  redirect("/onboarding");
}

export async function resendConfirmation(previousState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  void previousState;
  const setupError = supabaseSetupError();
  if (setupError) return setupError;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Ievadi e-pastu." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${await requestOrigin()}/auth/callback` },
    });
    if (error && !/already|confirmed/i.test(error.message)) return { error: formatAuthError(error.message), email };
  } catch (cause) {
    return { error: formatAuthError(cause instanceof Error ? cause.message : "auth server unavailable"), email };
  }
  // The same answer is returned for unknown or already confirmed addresses so accounts cannot be probed.
  return { message: RESEND_STATUS_MESSAGE, email };
}

export async function requestPasswordReset(previousState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  void previousState;
  const setupError = supabaseSetupError();
  if (setupError) return setupError;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Ievadi e-pastu." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await requestOrigin()}/auth/callback?next=/reset-password`,
    });
    if (error) return { error: formatAuthError(error.message) };
  } catch (cause) {
    return { error: formatAuthError(cause instanceof Error ? cause.message : "auth server unavailable") };
  }
  return { message: RESET_STATUS_MESSAGE };
}

export async function updatePassword(previousState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  void previousState;
  const setupError = supabaseSetupError();
  if (setupError) return setupError;

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (password.length < 6) return { error: "Parolei jābūt vismaz 6 rakstzīmes garai." };
  if (password !== confirmation) return { error: "Paroles nesakrīt." };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Paroles atjaunošanas saite ir nederīga vai novecojusi. Pieprasi jaunu." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: formatAuthError(error.message) };
  } catch (cause) {
    return { error: formatAuthError(cause instanceof Error ? cause.message : "auth server unavailable") };
  }

  revalidatePath("/", "layout");
  redirect("/chat");
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