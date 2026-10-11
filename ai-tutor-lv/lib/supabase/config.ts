const DEFAULT_SUPABASE_URL = "https://ulayllwlyyirsueqpmxn.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_c6AI4981dx3JrQAitVtwIQ_A_JX5012";

export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { url, anonKey: publishableKey };
}

export function isSupabaseConfigured() {
  return getSupabaseEnvironment() !== null;
}