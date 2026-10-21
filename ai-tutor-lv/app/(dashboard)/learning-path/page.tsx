"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Circle, Lock, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { learningPathLessons } from "@/lib/music-learning-data";
import { translate } from "@/lib/i18n";

type ProgressResult = { completed: string[] };
type LessonStatus = "completed" | "active" | "locked";

export default function LearningPathPage() {
  const { refreshSession, session, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(() => !session?.isGuest);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.isGuest) return;
    let active = true;
    void fetchJson<ProgressResult>("/api/learning/path").then((result) => {
      if (active) setCompleted(result.completed);
    }).catch((cause: unknown) => {
      if (active) setError(translate(language, cause instanceof Error ? cause.message : "Neizdevās ielādēt mācību ceļa progresu."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [session?.isGuest, language]);

  const isCompleted = (id: string) => id === "notes" || completed.includes(id);

  function statusFor(index: number): LessonStatus {
    const lesson = learningPathLessons[index];
    if (isCompleted(lesson.id)) return "completed";
    const prerequisite = lesson.prerequisite;
    return prerequisite && isCompleted(prerequisite) ? "active" : "locked";
  }

  async function completeLesson(id: string) {
    if (saving) return;
    setSaving(id);
    setError("");
    try {
      if (session?.isGuest) {
        setCompleted((current) => current.includes(id) ? current : [...current, id]);
      } else {
        await fetchJson("/api/learning/path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: id }),
        });
        setCompleted((current) => current.includes(id) ? current : [...current, id]);
        void refreshSession().catch((cause: unknown) => console.error("Unable to refresh learning path activity:", cause));
      }
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās saglabāt mācību ceļa progresu."));
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Soli pa solim")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Mācību ceļvedis")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {tr("Apgūsti mūzikas teoriju secīgi. Nākamais līmenis atbloķējas pēc iepriekšējā pabeigšanas.")}
        </p>
      </header>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground" role="status">{tr("Ielādē progresu…")}</p>}

      <div className="space-y-4">
        {learningPathLessons.map((lesson, index) => {
          const status = statusFor(index);
          const id = lesson.progressId;
          return (
            <Card key={lesson.id} className={status === "active" ? "border-primary/50 shadow-sm" : "border-border"}>
              <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${status === "completed" ? "bg-emerald-600 text-white" : status === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {status === "completed" ? <Check className="h-5 w-5" /> : status === "locked" ? <Lock className="h-5 w-5" /> : <Music2 className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Līmenis")} {index + 1} · {tr(status === "completed" ? "Pabeigts" : status === "active" ? "Aktīvs" : "Bloķēts")}</p>
                  <CardTitle className="mt-1">{tr(lesson.title)}</CardTitle>
                  <CardDescription className="mt-1">{tr(lesson.description)}</CardDescription>
                </div>
                {status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : status === "locked" ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Circle className="h-4 w-4 text-primary" />}
              </CardHeader>
              {status !== "locked" && (
                <CardContent className="flex flex-wrap gap-2">
                  <Link
                    href={{ pathname: "/chat", query: { prompt: tr(lesson.prompt) } }}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {tr("Sākt treniņu")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  {status === "active" && id && (
                    <Button variant="outline" onClick={() => void completeLesson(id)} disabled={saving !== ""} className="gap-2">
                      {tr(saving === id ? "Saglabā…" : "Atzīmēt kā pabeigtu")}
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
      {session?.isGuest && <p className="text-center text-xs text-muted-foreground">{tr("Viesu priekšskatījuma progress netiek saglabāts pēc sesijas beigām.")}</p>}
    </div>
  );
}
