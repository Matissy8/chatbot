import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleAuthEnabled } from "@/lib/supabase/providers";

export default async function RegisterPage() {
  return <AuthForm mode="register" googleEnabled={await isGoogleAuthEnabled()} />;
}
