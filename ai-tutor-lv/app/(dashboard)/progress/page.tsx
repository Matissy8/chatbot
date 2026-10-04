"use client";

import { Brain, Flame, Music2, Target, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { demoProgress } from "@/lib/demo-data";
import { calculateLevel } from "@/lib/gamification";

export default function ProgressPage() {
  const { session } = useAppSession();
  const xp = session?.xp ?? 0;
  const streak = session?.streak ?? 0;
  const level = calculateLevel(xp);
  const levelProgress = Math.round((level.currentLevelXp / level.nextLevelXp) * 100);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 p-5 md:p-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Tava mācību statistika</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Tavs progress</h1>
        <p className="mt-1 text-muted-foreground">Analīze par tavām zināšanām un mācību paradumiem.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden border-border bg-muted/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Brain className="h-5 w-5" /> Kopējais līmenis
            </CardTitle>
            <CardDescription>Tavs kopējais mācību progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-black text-foreground">{level.level}. līmenis</p>
            <Progress value={levelProgress} className="h-2 bg-background" />
            <p className="mt-2 text-xs text-muted-foreground">
              {level.currentLevelXp.toLocaleString("lv-LV")} / {level.nextLevelXp.toLocaleString("lv-LV")} XP līdz nākamajam līmenim
            </p>
            <p className="mt-1 text-xs font-medium text-foreground">{xp.toLocaleString("lv-LV")} XP kopā</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Flame className="h-5 w-5" /> Aktivitātes sērija
            </CardTitle>
            <CardDescription>Regulāra mācīšanās atmaksājas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-3xl font-black text-foreground">{streak} {streak === 1 ? "diena" : "dienas"}</p>
            <p className="text-sm text-muted-foreground">Turpini mācīties katru dienu, lai saglabātu sēriju.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Target className="h-5 w-5" /> Šīs nedēļas mērķis
            </CardTitle>
            <CardDescription>XP, kas iegūts šonedēļ</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-3xl font-black text-foreground">210 XP</p>
            <p className="text-sm text-muted-foreground">Esi apguvis 12 jaunas tēmas.</p>
            <Progress value={70} className="mt-3 h-2" />
            <p className="mt-1 text-xs text-muted-foreground">70% no nedēļas mērķa</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Priekšmetu analīze</h2>
          <p className="mt-1 text-sm text-muted-foreground">XP un apguves līmenis katrā priekšmetā.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {demoProgress.map((subject) => {
            const subjectLevel = calculateLevel(subject.xp);
            const isMusic = ["Harmonija", "Solfedžo", "Mūzikas literatūra"].includes(subject.subject);
            const SubjectIcon = isMusic ? Music2 : Brain;

            return (
              <Card key={subject.subject} className="border-border bg-card shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="flex items-center gap-2 text-foreground">
                      <SubjectIcon className="h-5 w-5" /> {subject.subject}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">{subjectLevel.level}. līmenis</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" /> {subject.xp.toLocaleString("lv-LV")} priekšmeta XP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-foreground">Apguve</span>
                    <span className="text-muted-foreground">{subject.percent}%</span>
                  </div>
                  <Progress value={subject.percent} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
