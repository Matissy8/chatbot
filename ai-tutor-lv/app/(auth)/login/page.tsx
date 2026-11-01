import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleAuthEnabled } from "@/lib/supabase/providers";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const initialError = error === "oauth"
    ? "Pieteikšanās ar Google neizdevās. Mēģini vēlreiz."
    : error === "link"
      ? "Saite ir nederīga vai novecojusi. Pieprasi jaunu."
      : undefined;
  return (
    <AuthForm
      mode="login"
      googleEnabled={await isGoogleAuthEnabled()}
      initialError={initialError}
    />
  );
}
