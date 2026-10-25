"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import {
  ACHIEVEMENTS_CATALOG,
  getAchievementProgress,
  type AchievementStatistics,
} from "@/lib/achievements-config";
import { translate } from "@/lib/i18n";

type StatisticsResult = { userId: string; data: AchievementStatistics };
type StatisticsError = { userId: string; message: string };

export default function AchievementsPage() {
  const { language, loading: sessionLoading, session } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [result, setResult] = useState<StatisticsResult | null>(null);
  const [loadError, setLoadError] = useState<StatisticsError | null>(null);
  const userId = session && !session.isGuest ? session.id : null;
  const statistics = userId && result?.userId === userId ? result.data : null;
  const error = userId && loadError?.userId === userId
    ? translate(language, loadError.message)
    : "";
  const loading = sessionLoading || Boolean(userId && !statistics && !error);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchJson<AchievementStatistics>("/api/achievements")
      .then((data) => {
        if (!active) return;
        setResult({ userId, data });
        setLoadError((current) => current?.userId === userId ? null : current);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setLoadError({
          userId,
          message: cause instanceof Error ? cause.message : "Neizdevās ielādēt sasniegumus.",
        });
      });
    return () => { active = false; };
  }, [userId]);

  const achievements = statistics
    ? ACHIEVEMENTS_CATALOG.map((achievement) => {
        const unlocked = statistics.unlockedAchievementIds.includes(achievement.id);
        const progress = unlocked
          ? achievement.maxProgress
          : getAchievementProgress(achievement, statistics);
        return { ...achievement, progress, unlocked };
      })
    : [];
  const unlockedCount = achievements.filter(({ unlocked }) => unlocked).length;

  if (session?.isGuest) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">{tr("Sasniegumi")}</h1>
        <p className="text-muted-foreground">{tr("Viesu režīmā sasniegumu progress netiek saglabāts.")}</p>
        <Link
          href="/register"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          {tr("Reģistrējies, lai vāktu nozīmītes")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-foreground">{tr("Mani sasniegumi")}</h1>
        {statistics && (
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("Atbloķēts")}: {unlockedCount} / {ACHIEVEMENTS_CATALOG.length}
          </p>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          {tr("Ielādē sasniegumus…")}
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {statistics && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-semibold">
            <span>🔥 {statistics.streak} {tr("dienas")}</span>
            <span>⭐ {statistics.xp.toLocaleString(language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "lv-LV")} XP</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => {
              const percent = Math.round((achievement.progress / achievement.maxProgress) * 100);
              return (
                <Card
                  key={achievement.id}
                  className={achievement.unlocked ? "border-border bg-muted/50" : "opacity-80"}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <span className="text-2xl" aria-hidden="true">{achievement.icon}</span>
                      {tr(achievement.title)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{tr(achievement.description)}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      {tr(achievement.unlocked ? "Atbloķēts" : "Bloķēts")}
                    </p>
                    {!achievement.unlocked && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{tr("Progress")}</span>
                          <span>{achievement.progress} / {achievement.maxProgress}</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
