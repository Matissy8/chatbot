"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { calculateLevel } from "@/lib/gamification";
import { translate } from "@/lib/i18n";

export default function ProfilePage() {
  const { session, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const level = calculateLevel(session?.xp ?? 0);
  const roleLabels = {
    school_student: tr("Skolēns"),
    music_student: tr("Mūzikas skolas audzēknis"),
    music_high_school: tr("Mūzikas vidusskolas students"),
    teacher: tr("Skolotājs"),
    independent: tr("Pašmācība"),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">{tr("Profils")}</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{tr("Lietotājs")}</p>
              <CardTitle className="mt-2 text-2xl">{session?.displayName}</CardTitle>
            </div>
            <div className="rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground">{tr("Līmenis")} {level.level}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                <span>{tr("XP progress")}</span>
                <span>{level.currentLevelXp} / {level.nextLevelXp}</span>
              </div>
              <Progress value={(level.currentLevelXp / level.nextLevelXp) * 100} className="h-3" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">{tr("Sērija")}</p>
                <p className="mt-2 text-xl font-semibold">{session?.streak ?? 0} {tr("dienas")}</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">{tr("Teorija")}</p>
                <p className="mt-2 text-xl font-semibold">88%</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">{tr("Lietotāja tips")}</p>
                <p className="mt-2 text-xl font-semibold">{session ? roleLabels[session.userType] : "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
