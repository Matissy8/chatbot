"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, RotateCcw, Timer, Trophy } from "lucide-react";
import type { Language } from "@/lib/i18n";
import {
  MUSIC_DUEL_CATEGORIES,
  MUSIC_DUEL_TERMS,
  type MusicDuelTerm,
} from "@/lib/music-terms-duel";

const PAIRS_PER_ROUND = 5;
const WRONG_FLASH_MS = 450;

const LABELS: Record<Language, {
  all: string;
  categories: Record<string, string>;
  italian: string;
  translation: string;
  combo: string;
  seconds: string;
  newRound: string;
  doneIn: string;
  perfect: string;
  mistakes: string;
  next: string;
  category: string;
}> = {
  lv: {
    all: "Visas tēmas",
    categories: { Tempi: "Tempi", Dinamika: "Dinamika", "Artikulācija un raksturs": "Artikulācija un raksturs" },
    italian: "Itāliski",
    translation: "Latviski",
    combo: "Combo",
    seconds: "s",
    newRound: "Jauns",
    doneIn: "Duelis pabeigts sekundēs:",
    perfect: "Perfekti — nevienas kļūdas!",
    mistakes: "Kļūdas:",
    next: "Nākamie 5 termini →",
    category: "Tēma",
  },
  en: {
    all: "All topics",
    categories: { Tempi: "Tempo", Dinamika: "Dynamics", "Artikulācija un raksturs": "Articulation and character" },
    italian: "Italian",
    translation: "English",
    combo: "Combo",
    seconds: "s",
    newRound: "New",
    doneIn: "Duel finished in seconds:",
    perfect: "Perfect — no mistakes!",
    mistakes: "Mistakes:",
    next: "Next 5 terms →",
    category: "Topic",
  },
  ru: {
    all: "Все темы",
    categories: { Tempi: "Темпы", Dinamika: "Динамика", "Artikulācija un raksturs": "Артикуляция и характер" },
    italian: "По-итальянски",
    translation: "По-русски",
    combo: "Комбо",
    seconds: "с",
    newRound: "Заново",
    doneIn: "Дуэль завершена за секунд:",
    perfect: "Идеально — без ошибок!",
    mistakes: "Ошибки:",
    next: "Следующие 5 терминов →",
    category: "Тема",
  },
};

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createRound(category: string) {
  const pool = category === "Visi" ? MUSIC_DUEL_TERMS : MUSIC_DUEL_TERMS.filter((term) => term.category === category);
  const picked = shuffle(pool).slice(0, PAIRS_PER_ROUND);
  return { left: shuffle(picked), right: shuffle(picked) };
}

export default function TermDuel({ language }: { language: Language }) {
  const labels = LABELS[language];
  const [category, setCategory] = useState("Visi");
  const [round, setRound] = useState(() => createRound("Visi"));
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const wrongTimer = useRef<number | undefined>(undefined);

  const isDone = matchedIds.length === round.left.length;

  useEffect(() => {
    if (isDone) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isDone, round]);

  useEffect(() => () => window.clearTimeout(wrongTimer.current), []);

  const startRound = useCallback((nextCategory: string) => {
    window.clearTimeout(wrongTimer.current);
    setRound(createRound(nextCategory));
    setMatchedIds([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrong(null);
    setCombo(0);
    setMistakes(0);
    setSeconds(0);
  }, []);

  function evaluate(leftId: string, rightId: string) {
    if (leftId === rightId) {
      setMatchedIds((current) => [...current, leftId]);
      setCombo((value) => value + 1);
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }
    setWrong({ left: leftId, right: rightId });
    setCombo(0);
    setMistakes((value) => value + 1);
    wrongTimer.current = window.setTimeout(() => {
      setWrong(null);
      setSelectedLeft(null);
      setSelectedRight(null);
    }, WRONG_FLASH_MS);
  }

  function pickLeft(id: string) {
    if (wrong || matchedIds.includes(id)) return;
    setSelectedLeft(id);
    if (selectedRight) evaluate(id, selectedRight);
  }

  function pickRight(id: string) {
    if (wrong || matchedIds.includes(id)) return;
    setSelectedRight(id);
    if (selectedLeft) evaluate(selectedLeft, id);
  }

  function buttonClass(isMatched: boolean, isSelected: boolean, isWrong: boolean) {
    const base = "flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 px-3 py-2 text-center leading-snug transition-all active:scale-[0.98]";
    if (isMatched) return `${base} pointer-events-none scale-95 border-emerald-500/20 bg-emerald-500/10 text-emerald-600/50 dark:text-emerald-400/40`;
    if (isWrong) return `${base} border-red-500 bg-red-500/20 text-red-700 dark:text-red-300`;
    if (isSelected) return `${base} border-primary bg-primary/15 text-primary shadow-sm`;
    return `${base} border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40`;
  }

  function renderColumn(items: MusicDuelTerm[], side: "left" | "right") {
    return items.map((item) => {
      const selected = side === "left" ? selectedLeft : selectedRight;
      return (
        <button
          key={item.id}
          type="button"
          disabled={matchedIds.includes(item.id)}
          aria-pressed={selected === item.id}
          onClick={() => (side === "left" ? pickLeft(item.id) : pickRight(item.id))}
          className={`${buttonClass(matchedIds.includes(item.id), selected === item.id, wrong?.[side] === item.id)} ${side === "left" ? "text-sm font-bold" : "text-xs font-medium sm:text-sm"}`}
        >
          {side === "left" ? item.italian : item.translations[language]}
        </button>
      );
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-amber-500">
            <Flame className="h-4 w-4 fill-amber-500" aria-hidden="true" />
            {combo}x {labels.combo}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground" role="timer">
            <Timer className="h-4 w-4" aria-hidden="true" />
            {seconds}{labels.seconds}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label={labels.category}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              startRound(event.target.value);
            }}
            className="min-h-[44px] rounded-xl border border-border bg-background px-3 py-1.5 text-base font-medium md:text-xs"
          >
            <option value="Visi">{labels.all}</option>
            {MUSIC_DUEL_CATEGORIES.map((name) => (
              <option key={name} value={name}>{labels.categories[name]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => startRound(category)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.newRound}
          </button>
        </div>
      </div>

      {isDone ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
          <Trophy className="h-12 w-12 text-amber-500" aria-hidden="true" />
          <h3 className="text-xl font-bold text-foreground">{labels.doneIn} {seconds}</h3>
          <p className="text-sm text-muted-foreground">
            {mistakes === 0 ? labels.perfect : `${labels.mistakes} ${mistakes}`}
          </p>
          <button
            type="button"
            onClick={() => startRound(category)}
            className="mt-2 min-h-[48px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
          >
            {labels.next}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div className="space-y-2">
            <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{labels.italian}</div>
            {renderColumn(round.left, "left")}
          </div>
          <div className="space-y-2">
            <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{labels.translation}</div>
            {renderColumn(round.right, "right")}
          </div>
        </div>
      )}
    </div>
  );
}
