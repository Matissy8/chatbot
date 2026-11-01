"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, CheckCircle2, Flame, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { calculateLevel } from "@/lib/gamification";
import { learningPathLessons } from "@/lib/music-learning-data";
import { MUSIC_SUBJECTS, type MusicSubjectId } from "@/lib/music-subjects";
import { subjectTone } from "@/lib/subject-styles";
import { translate } from "@/lib/i18n";
import { formatDays } from "@/lib/format-utils";

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
  const locale = language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "lv-LV";
  const [completedLessons, setCompletedLessons] = useState<{ userId: string | null; ids: string[] } | null>(null);
  // "notes" is always unlocked, matching the learning path page.
  const completedTopics = session?.isGuest
    ? 1
    : completedLessons?.userId === userId
      ? new Set(["notes", ...completedLessons.ids].filter((id) => learningPathLessons.some((lesson) => lesson.id === id))).size
      : null;
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

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchJson<{ completed: string[] }>("/api/learning/path")
      .then((result) => { if (active) setCompletedLessons({ userId, ids: result.completed }); })
      .catch((cause: unknown) => console.error("Unable to load learning path progress:", cause));
    return () => { active = false; };
  }, [userId]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 p-5 md:p-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Tava mācību statistika")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{tr("Tavs progress")}</h1>
        <p className="mt-1 text-muted-foreground">{tr("Analīze par tavām zināšanām un mācību paradumiem.")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{tr("Kopējais XP")}</p>
              <p className="text-2xl font-black text-foreground">{xp.toLocaleString(locale)} XP</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {loading ? "…" : statistics ? `${statistics.weeklyXp.toLocaleString(locale)} ${tr("XP pēdējās 7 dienās")}` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"><Flame className="h-5 w-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{tr("Aktivitātes sērija")}</p>
              <p className="text-2xl font-black text-foreground">{formatDays(streak, language)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tr("Turpini mācīties katru dienu, lai saglabātu sēriju.")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300"><Brain className="h-5 w-5" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{tr("Kopējais līmenis")}</p>
              <p className="text-2xl font-black text-foreground">{level.level}. {tr("līmenis")}</p>
              <Progress value={levelProgress} className="mt-2" indicatorClassName="bg-violet-500" />
              <p className="mt-1 text-xs text-muted-foreground">
                {level.currentLevelXp.toLocaleString(locale)} / {level.nextLevelXp.toLocaleString(locale)} {tr("XP līdz nākamajam līmenim")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{tr("Pabeigtās tēmas")}</p>
              <p className="text-2xl font-black text-foreground">{completedTopics === null ? "…" : `${completedTopics} / ${learningPathLessons.length}`}</p>
              <Progress value={completedTopics === null ? 0 : (completedTopics / learningPathLessons.length) * 100} className="mt-2" indicatorClassName="bg-emerald-500" />
              <Link href="/learning-path" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                {tr("Tavs mācību ceļš")} <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
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
            const tone = subjectTone(subject.id);
            const SubjectIcon = tone.icon;

            return (
              <Card key={subject.id} className="border-border bg-card shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="flex items-center gap-2.5 text-foreground">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone.badge}`}><SubjectIcon className="h-4 w-4" aria-hidden="true" /></span>
                      {tr(subject.name)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">{subjectLevel.level}. {tr("līmenis")}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" /> {subjectXp.toLocaleString(locale)} {tr("priekšmeta XP")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-foreground">{tr("Progress līdz nākamajam līmenim")}</span>
                    <span className="text-muted-foreground">{Math.round((subjectLevel.currentLevelXp / subjectLevel.nextLevelXp) * 100)}%</span>
                  </div>
                  <Progress value={(subjectLevel.currentLevelXp / subjectLevel.nextLevelXp) * 100} indicatorClassName={tone.bar} />
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
