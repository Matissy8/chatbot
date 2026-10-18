import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleAuthEnabled } from "@/lib/supabase/providers";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      googleEnabled={await isGoogleAuthEnabled()}
      initialError={error === "oauth" ? "Pieteikšanās ar Google neizdevās. Mēģini vēlreiz." : undefined}
    />
  );
}
