import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FREE_DAILY_QUESTION_LIMIT, type Plan } from "@/lib/plans";

const freeFeatures = [
  `${FREE_DAILY_QUESTION_LIMIT} AI jautājumi dienā`,
  "Uzdevumu ģenerators, progress un sasniegumi",
  "Limits atjaunojas katru dienu pēc Latvijas laika",
];

const proFeatures = [
  "Neierobežots AI jautājumu skaits",
  "Viss, kas iekļauts bezmaksas plānā",
];

export function PricingSection({ plan, used }: { plan: Plan; used?: number }) {
  const isPro = plan === "pro";

  return (
    <div className="mx-auto w-full max-w-4xl py-4 sm:py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Izvēlies savu Maestro plānu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Mācies mūziku un skolas priekšmetus ar AI atbalstu.</p>
      </div>

      <div className="mt-8 grid items-stretch gap-6 md:grid-cols-2">
        <Card className="justify-between">
          <div className="space-y-4">
            <CardHeader>
              <CardTitle className="text-lg">Bezmaksas</CardTitle>
              <CardDescription>Ikdienas jautājumiem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p>
                <span className="text-4xl font-semibold tracking-tight">0 €</span>
                <span className="text-muted-foreground"> / mēnesī</span>
              </p>
              {!isPro && used !== undefined && (
                <div className="space-y-1.5" role="status">
                  <Progress value={Math.min(100, (used / FREE_DAILY_QUESTION_LIMIT) * 100)} />
                  <p className="text-xs text-muted-foreground">
                    Šodien izmantoti {used} no {FREE_DAILY_QUESTION_LIMIT} jautājumiem
                  </p>
                </div>
              )}
              <ul className="space-y-3 text-sm">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </div>
          <CardFooter className="border-t-0 bg-transparent">
            <Button variant="outline" size="lg" disabled className="h-10 w-full">
              {isPro ? "Bezmaksas plāns" : "Pašreizējais plāns"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="justify-between ring-2 ring-primary">
          <div className="space-y-4">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Maestro PRO</CardTitle>
                <Badge>Ietaupi 25%</Badge>
              </div>
              <CardDescription>Nopietnai, ikdienas mācīšanās praksei</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-4xl font-semibold tracking-tight">15 €</span>
                <span className="sr-only">Iepriekšējā cena:</span>
                <del className="text-lg text-muted-foreground">20 €</del>
                <span className="text-muted-foreground">/ mēnesī</span>
              </p>
              <ul className="space-y-3 text-sm">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </div>
          <CardFooter className="flex-col items-stretch gap-2 border-t-0 bg-transparent">
            <Button size="lg" disabled className="h-10 w-full">
              {isPro ? "Pašreizējais plāns" : "Drīzumā"}
            </Button>
            {!isPro && <p className="text-center text-xs text-muted-foreground">Maksājumi vēl nav pieejami.</p>}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
