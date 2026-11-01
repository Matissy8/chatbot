"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { calculateLevel } from "@/lib/gamification";
import { gradeLabel as formatGradeLabel } from "@/lib/grade-levels";
import { translate } from "@/lib/i18n";
import { formatStreakDays } from "@/lib/format-utils";

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
  const gradeDisplayLabel = session?.grade
    ? formatGradeLabel(session.grade, tr("klase"), true, tr("kurss"))
    : tr("Klase nav norādīta");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProfileHero
        name={session?.displayName ?? tr("Skolēns")}
        gradeLabel={gradeDisplayLabel}
        xp={session?.xp ?? 0}
        greeting={tr("Sveicināts")}
        badgeLabel={tr("Mūzikas studija")}
        description={tr("Tava personīgā mūzikas mācību telpa. Seko līdzi savam līmenim un turpini krāt zināšanas ik dienu.")}
        streakText={formatStreakDays(session?.streak ?? 0, language)}
      />
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{tr("Konta informācija")}</p>
              <CardTitle className="mt-2 text-2xl">{tr("Profils")}</CardTitle>
            </div>
            <div className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">{tr("Līmenis")} {level.level}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                <p className="text-sm text-muted-foreground">{tr("Lietotāja tips")}</p>
                <p className="mt-2 font-semibold text-foreground">{session ? roleLabels[session.userType] : "—"}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="text-sm text-muted-foreground">{tr("E-pasts")}</p>
                <p className="mt-2 break-all font-semibold text-foreground">{session?.email || "—"}</p>
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                <span>{tr("XP progress")}</span>
                <span>{level.currentLevelXp} / {level.nextLevelXp}</span>
              </div>
              <Progress value={(level.currentLevelXp / level.nextLevelXp) * 100} className="h-3 transition-all duration-700" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
