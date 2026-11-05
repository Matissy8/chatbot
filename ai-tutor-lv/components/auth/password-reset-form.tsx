"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { requestPasswordReset, updatePassword } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

export function PasswordResetForm({ mode }: { mode: "request" | "update" }) {
  const isRequest = mode === "request";
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [state, formAction, pending] = useActionState(isRequest ? requestPasswordReset : updatePassword, {});

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-5">
      <Card className="w-full max-w-md border-border bg-card shadow-xl shadow-foreground/5">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {tr(isRequest ? "Aizmirsi paroli?" : "Jauna parole")}
          </CardTitle>
          <CardDescription>
            {tr(isRequest ? "Ievadi savu e-pastu, un mēs nosūtīsim saiti jaunas paroles izveidei." : "Izvēlies jaunu paroli savam kontam.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {isRequest ? (
              <div className="space-y-2">
                <Label htmlFor="email">{tr("E-pasts")}</Label>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder={tr("tavs@epasts.lv")} required />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">{tr("Jaunā parole")}</Label>
                  <Input id="password" name="password" type="password" autoComplete="new-password" placeholder={tr("Vismaz 6 rakstzīmes")} minLength={6} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">{tr("Atkārto paroli")}</Label>
                  <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={6} required />
                </div>
              </>
            )}

            {state.error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{tr(state.error)}</p>}
            {state.message && <p className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground" role="status">{tr(state.message)}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {tr(pending ? "Lūdzu, uzgaidi…" : isRequest ? "Nosūtīt saiti" : "Saglabāt jauno paroli")}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">{tr("Atpakaļ uz pieslēgšanos")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
