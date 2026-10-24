"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { flashcards, type FlashcardId } from "@/lib/music-learning-data";
import { translate } from "@/lib/i18n";

type CardProgress = { known_count: number; review_count: number };
type ProgressResult = { progress: { card_id: string; known_count: number; review_count: number }[] };

export default function FlashcardsPage() {
  const { refreshSession, session, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState<Partial<Record<FlashcardId, CardProgress>>>({});
  const [loading, setLoading] = useState(() => !session?.isGuest);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isComplete = index >= flashcards.length;
  const card = flashcards[Math.min(index, flashcards.length - 1)];
  const currentProgress = progress[card.id] ?? { known_count: 0, review_count: 0 };
  const completedReviews = Object.values(progress).reduce((total, item) => total + (item?.known_count ?? 0) + (item?.review_count ?? 0), 0);

  useEffect(() => {
    if (session?.isGuest) return;
    let active = true;
    void fetchJson<ProgressResult>("/api/learning/flashcards").then((result) => {
      if (!active) return;
      setProgress(Object.fromEntries(result.progress.map((item) => [item.card_id, {
        known_count: item.known_count,
        review_count: item.review_count,
      }])) as Partial<Record<FlashcardId, CardProgress>>);
    }).catch((cause: unknown) => {
      if (active) setError(translate(language, cause instanceof Error ? cause.message : "Neizdevās ielādēt kartīšu progresu."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [session?.isGuest, language]);

  async function rateCard(knew: boolean) {
    if (saving || isComplete) return;
    setSaving(true);
    setError("");
    try {
      if (session?.isGuest) {
        setProgress((current) => ({
          ...current,
          [card.id]: {
            known_count: (current[card.id]?.known_count ?? 0) + (knew ? 1 : 0),
            review_count: (current[card.id]?.review_count ?? 0) + (knew ? 0 : 1),
          },
        }));
      } else {
        const result = await fetchJson<CardProgress>("/api/learning/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, knew }),
        });
        setProgress((current) => ({ ...current, [card.id]: result }));
        void refreshSession().catch((cause: unknown) => console.error("Unable to refresh flashcard activity:", cause));
      }
      setFlipped(false);
      setIndex((current) => current + 1);
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās saglabāt kartītes progresu."));
    } finally {
      setSaving(false);
    }
  }

  if (isComplete) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <BookOpen className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">{tr("Visas kartītes atkārtotas! 🎉")}</h1>
        <p className="text-sm text-muted-foreground">{tr("Atkārtojumu kopā")}: {completedReviews}</p>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="button" onClick={() => { setIndex(0); setFlipped(false); setError(""); }}>
          {tr("Sākt vēlreiz")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Mūzikas teorijas atkārtošana")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Mūzikas kartītes")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {tr("Atceries itāļu mūzikas terminus, intervālus un akordus. Apgriez kartīti un atzīmē, vai atbildi zināji.")}
        </p>
      </header>

      <Card className="overflow-visible border-border shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4" />{tr(card.category)}</span>
            <span>{tr("Kartīte")} {index + 1} / {flashcards.length}</span>
          </div>

          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            disabled={saving}
            aria-pressed={flipped}
            aria-label={tr(flipped ? "Rādīt jautājumu" : "Apgriezt kartīti un rādīt atbildi")}
            className="group w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative h-64 [perspective:1000px]">
              <div
                className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-center text-white shadow-md [backface-visibility:hidden]">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">{tr("Ko nozīmē?")}</span>
                  <h2 className="mt-4 text-4xl font-bold">{tr(card.term)}</h2>
                  <p className="mt-4 text-sm text-indigo-100">{tr("Noklikšķini, lai apgrieztu kartīti.")}</p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-950 p-6 text-center text-white shadow-md [transform:rotateY(180deg)] [backface-visibility:hidden]">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">{tr("Atbilde")}</span>
                  <h3 className="mt-4 text-2xl font-bold">{tr(card.definition)}</h3>
                  <p className="mt-3 max-w-lg text-sm text-indigo-100">{tr(card.example)}</p>
                </div>
              </div>
            </div>
          </button>

          {flipped && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={() => void rateCard(false)} disabled={saving} className="h-11 gap-2">
                <RotateCcw className="h-4 w-4" /> {tr("Mācos vēl")}
              </Button>
              <Button onClick={() => void rateCard(true)} disabled={saving} className="h-11 gap-2">
                {tr("Zināju")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {loading && <p className="text-sm text-muted-foreground" role="status">{tr("Ielādē progresu…")}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <span>{tr("Zināju")}: {currentProgress.known_count} · {tr("Mācos vēl")}: {currentProgress.review_count}</span>
            <span>{tr("Atkārtojumu kopā")}: {completedReviews}</span>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" disabled={saving || index === 0} onClick={() => { setIndex((value) => Math.max(0, value - 1)); setFlipped(false); }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> {tr("Iepriekšējā")}
            </Button>
            <Button variant="ghost" size="sm" disabled={saving || index === flashcards.length - 1} onClick={() => { setIndex((value) => Math.min(flashcards.length - 1, value + 1)); setFlipped(false); }}>
              {tr("Nākamā")} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {session?.isGuest && <p className="text-center text-xs text-muted-foreground">{tr("Viesu priekšskatījumā progress saglabājas tikai šajā skatā.")}</p>}
    </div>
  );
}
