"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Bot, LoaderCircle } from "lucide-react";
import { login, signup } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState(isLogin ? login : signup, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <Card className="w-full max-w-md border-border bg-card shadow-xl shadow-foreground/5">
        <CardHeader className="items-center pb-4 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {isLogin ? "Esi sveicināts AITutor LV" : "Izveido savu kontu"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "Ienāc, lai turpinātu mācīties un krātu XP." : "Reģistrējies, lai sāktu personalizētu mācību ceļu."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured() && (
            <div className="mb-4 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground" role="status">
              Pārbaudi Supabase projekta savienojuma iestatījumus .env.local failā. AI funkcijām pievieno Gemini, OpenAI vai Anthropic API atslēgu.
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="display_name">Vārds vai segvārds</Label>
                <Input id="display_name" name="display_name" autoComplete="name" placeholder="Anna" maxLength={80} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-pasts</Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="tavs@epasts.lv" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parole</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="Vismaz 6 rakstzīmes"
                minLength={6}
                required
              />
            </div>

            {state.error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{state.error}</p>}
            {state.message && <p className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground" role="status">{state.message}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {pending ? "Lūdzu, uzgaidi…" : isLogin ? "Pieslēgties" : "Reģistrēt kontu"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isLogin ? "Nav konta? " : "Jau esi reģistrējies? "}
            <Link href={isLogin ? "/register" : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
              {isLogin ? "Izveidot kontu" : "Pieslēgties"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
