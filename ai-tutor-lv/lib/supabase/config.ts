export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey || /your-project|your-anon-key|your-|replace|placeholder/i.test(`${url} ${anonKey}`)) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabaseEnvironment() !== null;
}