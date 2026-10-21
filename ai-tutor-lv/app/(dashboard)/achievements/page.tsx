"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoAchievements } from "@/lib/demo-data";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

export default function AchievementsPage() {
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">{tr("Sasniegumi")}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demoAchievements.map((achievement) => (
          <Card key={achievement.id} className={achievement.unlocked ? "border-border bg-muted/50" : "opacity-70"}>
            <CardHeader>
              <CardTitle className="text-lg">{tr(achievement.title)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{tr(achievement.description)}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {tr(achievement.unlocked ? "Atgūts" : "Nav atvērts")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
