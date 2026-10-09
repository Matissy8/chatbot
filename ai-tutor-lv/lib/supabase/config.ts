const DEFAULT_SUPABASE_URL = "https://ulayllwlyyirsueqpmxn.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_c6AI4981dx3JrQAitVtwIQ_A_JX5012";
const PLACEHOLDER_VALUE = /your-project|your-anon-key|your-publishable-key|your-|replace|placeholder/i;

function configuredValue(...values: (string | undefined)[]) {
  return values
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value && !PLACEHOLDER_VALUE.test(value)));
}

export function getSupabaseEnvironment() {
  const url = configuredValue(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? DEFAULT_SUPABASE_URL;
  const publishableKey = configuredValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) ?? DEFAULT_SUPABASE_PUBLISHABLE_KEY;

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