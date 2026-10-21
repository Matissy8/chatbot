"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FREE_DAILY_QUESTION_LIMIT, type Plan } from "@/lib/plans";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

const freeFeatures = [
  `${FREE_DAILY_QUESTION_LIMIT} AI jautājumi dienā`,
  "Uzdevumu ģenerators, progress un sasniegumi",
  "Limits atjaunojas katru dienu pēc Latvijas laika",
];

const proFeatures = [
  "Neierobežots AI jautājumu skaits",
  "Viss, kas iekļauts bezmaksas plānā",
];

export function PricingSection({ plan, used, usageError }: { plan: Plan; used?: number | null; usageError?: string }) {
  const isPro = plan === "pro";
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);

  return (
    <div className="mx-auto w-full max-w-4xl py-4 sm:py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tr("Izvēlies savu Maestro plānu")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{tr("Mācies mūziku un skolas priekšmetus ar AI atbalstu.")}</p>
      </div>

      <div className="mt-8 grid items-stretch gap-6 md:grid-cols-2">
        <Card className="justify-between">
          <div className="space-y-4">
            <CardHeader>
              <CardTitle className="text-lg">{tr("Bezmaksas")}</CardTitle>
              <CardDescription>{tr("Ikdienas jautājumiem")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p>
                <span className="text-4xl font-semibold tracking-tight">0 €</span>
                <span className="text-muted-foreground"> / {tr("mēnesī")}</span>
              </p>
              {!isPro && used !== undefined && (
                <div className="space-y-1.5" role="status">
                  {used === null ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300" role="alert" title={usageError}>
                      {tr("Šodienas limits")}: — / {FREE_DAILY_QUESTION_LIMIT} ({tr("neizdevās nolasīt")})
                    </p>
                  ) : (
                    <>
                      <Progress value={Math.min(100, (used / FREE_DAILY_QUESTION_LIMIT) * 100)} />
                      <p className="text-xs text-muted-foreground">
                        {tr("Šodien izmantoti")} {used} {tr("no")} {FREE_DAILY_QUESTION_LIMIT} {tr("jautājumiem")}
                      </p>
                    </>
                  )}
                </div>
              )}
              <ul className="space-y-3 text-sm">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {tr(feature)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </div>
          <CardFooter className="border-t-0 bg-transparent">
            <Button variant="outline" size="lg" disabled className="h-10 w-full">
              {tr(isPro ? "Bezmaksas plāns" : "Pašreizējais plāns")}
            </Button>
          </CardFooter>
        </Card>

        <Card className="justify-between ring-2 ring-primary">
          <div className="space-y-4">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Maestro PRO</CardTitle>
                <Badge>{tr("Ietaupi 25%")}</Badge>
              </div>
              <CardDescription>{tr("Nopietnai, ikdienas mācīšanās praksei")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-4xl font-semibold tracking-tight">15 €</span>
                <span className="sr-only">{tr("Iepriekšējā cena:")}</span>
                <del className="text-lg text-muted-foreground">20 €</del>
                <span className="text-muted-foreground">/ {tr("mēnesī")}</span>
              </p>
              <ul className="space-y-3 text-sm">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {tr(feature)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </div>
          <CardFooter className="flex-col items-stretch gap-2 border-t-0 bg-transparent">
            <Button size="lg" disabled className="h-10 w-full">
              {tr(isPro ? "Pašreizējais plāns" : "Drīzumā")}
            </Button>
            {!isPro && <p className="text-center text-xs text-muted-foreground">{tr("Maksājumi vēl nav pieejami.")}</p>}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
