"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthActionResult = {
  error?: string;
  message?: string;
};

function supabaseSetupError(): AuthActionResult | null {
  return isSupabaseConfigured()
    ? null
    : { error: "Supabase nav konfigurēts. Pievieno projekta URL un anonīmo vai publicējamo atslēgu .env.local failā." };
}

function formatAuthError(message: string): string {
  if (message.toLowerCase().includes("invalid login credentials")) return "E-pasts vai parole nav pareiza.";
  if (message.toLowerCase().includes("user already registered")) return "Šis e-pasts jau ir reģistrēts. Pieslēdzies savam kontam.";
  if (message.toLowerCase().includes("password should be at least")) return "Parolei jābūt vismaz 6 rakstzīmes garai.";
  return message;
}

export async function login(previousState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  void previousState;
  const setupError = supabaseSetupError();
  if (setupError) return setupError;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Ievadi e-pastu un paroli." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: formatAuthError(error.message) };

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: formatAuthError(error.message) };

  revalidatePath("/", "layout");
  if (!data.session) {
    return { message: "Pārbaudi savu e-pastu un apstiprini kontu, tad pieslēdzies." };
  }

  redirect("/onboarding");
}

export async function signout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}