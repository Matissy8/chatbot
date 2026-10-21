"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Bot, LoaderCircle } from "lucide-react";
import { enterGuestMode, login, signup } from "@/app/(auth)/actions";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGuestModeEnabled } from "@/lib/guest-mode";
import { useAppSession } from "@/components/providers/app-provider";
import { translate, type Language } from "@/lib/i18n";

export function AuthForm({
  mode,
  googleEnabled = false,
  initialError,
}: {
  mode: "login" | "register";
  googleEnabled?: boolean;
  initialError?: string;
}) {
  const isLogin = mode === "login";
  const { language, changeLanguage } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [state, formAction, pending] = useActionState(isLogin ? login : signup, initialError ? { error: initialError } : {});
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [languageError, setLanguageError] = useState("");

  async function selectLanguage(next: Language) {
    setLanguageError("");
    try {
      await changeLanguage(next);
    } catch (error) {
      console.error("Unable to save language preference:", error);
      setLanguageError(tr("Neizdevās saglabāt valodas izvēli."));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <Card className="w-full max-w-md border-border bg-card shadow-xl shadow-foreground/5">
        <CardHeader className="items-center pb-4 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {tr(isLogin ? "Esi sveicināts Maestro" : "Izveido savu kontu")}
          </CardTitle>
          <CardDescription>
            {tr(isLogin ? "Ienāc, lai turpinātu mācīties un krātu XP." : "Reģistrējies, lai sāktu personalizētu mācību ceļu.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured() && (
            <div className="mb-4 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground" role="status">
              {tr("Pārbaudi Supabase projekta savienojuma iestatījumus .env.local failā. AI funkcijām pievieno Gemini, OpenAI vai Anthropic API atslēgu.")}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="display_name">{tr("Vārds vai segvārds")}</Label>
                <Input id="display_name" name="display_name" autoComplete="name" placeholder={tr("Anna")} maxLength={80} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{tr("E-pasts")}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder={tr("tavs@epasts.lv")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{tr("Parole")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder={tr("Vismaz 6 rakstzīmes")}
                minLength={6}
                required
              />
            </div>

            {state.error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{tr(state.error)}</p>}
            {oauthError && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{tr(oauthError)}</p>}
            {state.message && <p className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground" role="status">{tr(state.message)}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {tr(pending ? "Lūdzu, uzgaidi…" : isLogin ? "Pieslēgties" : "Reģistrēt kontu")}
            </Button>
          </form>

          {googleEnabled && isSupabaseConfigured() && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {tr("vai")}
                <span className="h-px flex-1 bg-border" />
              </div>
              <GoogleAuthButton onError={setOauthError} />
            </div>
          )}

          {isLogin && isGuestModeEnabled() && (
            <div className="mt-3 border-t border-border pt-3">
              <form action={enterGuestMode}>
                <Button type="submit" variant="outline" className="w-full">
                  {tr("Turpināt kā viesim (priekšskatījums)")}
                </Button>
              </form>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {tr("Viesu režīms izmanto demo profilu; sarunas un XP netiek saglabātas.")}
              </p>
            </div>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {tr(isLogin ? "Nav konta? " : "Jau esi reģistrējies? ")}
            <Link href={isLogin ? "/register" : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
              {tr(isLogin ? "Izveidot kontu" : "Pieslēgties")}
            </Link>
          </p>
          <div className="mt-4 flex justify-center gap-2" aria-label={tr("Valodas izvēle")}>
            {(["lv", "en", "ru"] as const).map((value) => (
              <button key={value} type="button" aria-label={tr("Valoda") + ": " + value.toUpperCase()} aria-pressed={language === value} onClick={() => void selectLanguage(value)} className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted aria-pressed:bg-muted aria-pressed:text-foreground">
                {value.toUpperCase()}
              </button>
            ))}
          </div>
          {languageError && <p className="mt-2 text-center text-xs text-destructive" role="alert">{languageError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
