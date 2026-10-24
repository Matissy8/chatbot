"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Flame, Music2, Target, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { calculateLevel } from "@/lib/gamification";
import { MUSIC_SUBJECTS, type MusicSubjectId } from "@/lib/music-subjects";
import { translate } from "@/lib/i18n";

type ProgressStatistics = {
  subjectXp: Record<MusicSubjectId, number>;
  weeklyXp: number;
};

type StatisticsResult = { userId: string; data: ProgressStatistics };
type StatisticsError = { userId: string; message: string };

const emptyStatistics: ProgressStatistics = {
  subjectXp: Object.fromEntries(MUSIC_SUBJECTS.map(({ id }) => [id, 0])) as Record<MusicSubjectId, number>,
  weeklyXp: 0,
};

export default function ProgressPage() {
  const { session, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [statisticsResult, setStatisticsResult] = useState<StatisticsResult | null>(null);
  const [statisticsError, setStatisticsError] = useState<StatisticsError | null>(null);
  const userId = session && !session.isGuest ? session.id : null;
  const statistics = session?.isGuest
    ? emptyStatistics
    : userId && statisticsResult?.userId === userId
      ? statisticsResult.data
      : null;
  const error = userId && statisticsError?.userId === userId
    ? translate(language, statisticsError.message)
    : "";
  const loading = Boolean(userId && !statistics && !error);
  const xp = session?.xp ?? 0;
  const streak = session?.streak ?? 0;
  const level = calculateLevel(xp);
  const levelProgress = Math.round((level.currentLevelXp / level.nextLevelXp) * 100);
  const hasSubjectProgress = Boolean(statistics && Object.values(statistics.subjectXp).some((subjectXp) => subjectXp > 0));

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchJson<ProgressStatistics>("/api/progress")
      .then((result) => {
        if (active) {
          setStatisticsResult({ userId, data: result });
          setStatisticsError((current) => current?.userId === userId ? null : current);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setStatisticsError({
            userId,
            message: cause instanceof Error ? cause.message : "Neizdevās ielādēt progresa statistiku.",
          });
        }
      });
    return () => { active = false; };
  }, [userId]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 p-5 md:p-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Tava mācību statistika")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{tr("Tavs progress")}</h1>
        <p className="mt-1 text-muted-foreground">{tr("Analīze par tavām zināšanām un mācību paradumiem.")}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden border-border bg-muted/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Brain className="h-5 w-5" /> {tr("Kopējais līmenis")}
            </CardTitle>
            <CardDescription>{tr("Tavs kopējais mācību progress")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-black text-foreground">{level.level}. {tr("līmenis")}</p>
            <Progress value={levelProgress} className="h-2 bg-background" />
            <p className="mt-2 text-xs text-muted-foreground">
              {level.currentLevelXp.toLocaleString(language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "lv-LV")} / {level.nextLevelXp.toLocaleString(language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "lv-LV")} {tr("XP līdz nākamajam līmenim")}
            </p>
            <p className="mt-1 text-xs font-medium text-foreground">{xp.toLocaleString(language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "lv-LV")} {tr("XP kopā")}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Flame className="h-5 w-5" /> {tr("Aktivitātes sērija")}
            </CardTitle>
            <CardDescription>{tr("Regulāra mācīšanās atmaksājas")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-3xl font-black text-foreground">{streak} {tr(streak === 1 ? "diena" : "dienas")}</p>
            <p className="text-sm text-muted-foreground">{tr("Turpini mācīties katru dienu, lai saglabātu sēriju.")}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Target className="h-5 w-5" /> {tr("Pēdējo 7 dienu aktivitāte")}
            </CardTitle>
            <CardDescription>{tr("XP pēdējās 7 dienās")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-3xl font-black text-foreground">
              {loading ? "…" : statistics ? `${statistics.weeklyXp} XP` : "—"}
            </p>
            {!loading && statistics?.weeklyXp === 0 && (
              <p className="text-sm text-muted-foreground">{tr("Pēdējās 7 dienās vēl nav iegūts XP.")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{tr("Priekšmetu analīze")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tr("Tavā kontā uzkrātais XP katrā mūzikas priekšmetā.")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {statistics && MUSIC_SUBJECTS.map((subject) => {
            const subjectXp = statistics.subjectXp[subject.id] ?? 0;
            const subjectLevel = calculateLevel(subjectXp);
            const SubjectIcon = subject.id === "harmonija" || subject.id === "solfedzo" ? Music2 : Brain;

            return (
              <Card key={subject.id} className="border-border bg-card shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="flex items-center gap-2 text-foreground">
                      <SubjectIcon className="h-5 w-5" /> {tr(subject.name)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">{subjectLevel.level}. {tr("līmenis")}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" /> {subjectXp.toLocaleString(language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "lv-LV")} {tr("priekšmeta XP")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-foreground">{tr("Progress līdz nākamajam līmenim")}</span>
                    <span className="text-muted-foreground">{Math.round((subjectLevel.currentLevelXp / subjectLevel.nextLevelXp) * 100)}%</span>
                  </div>
                  <Progress value={(subjectLevel.currentLevelXp / subjectLevel.nextLevelXp) * 100} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {loading && <p className="text-sm text-muted-foreground" role="status">{tr("Ielādē statistiku…")}</p>}
        {!loading && !error && statistics && !hasSubjectProgress && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">{tr("Te vēl nav progresa datu. Sāc pirmo mācību nodarbību!")}</p>
        <Link
          href="/learning-path"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {tr("Atvērt mācību ceļu")} <ArrowRight className="h-4 w-4" />
        </Link>
          </div>
        )}
        {session?.isGuest && <p className="text-center text-xs text-muted-foreground">{tr("Viesu priekšskatījumā progress netiek saglabāts.")}</p>}
      </section>
    </div>
  );
}
