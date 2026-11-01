import { Flame, Music2, Sparkles } from "lucide-react";

type ProfileHeroProps = {
  name: string;
  gradeLabel: string;
  xp: number;
  greeting: string;
  badgeLabel: string;
  description: string;
  streakText: string;
};

const pianoKeys = Array.from({ length: 14 }, (_, index) => index);
const blackKeyPositions = new Set([0, 1, 3, 4, 5, 7, 8, 10, 11, 12]);

export function ProfileHero({
  name,
  gradeLabel,
  xp,
  greeting,
  badgeLabel,
  description,
  streakText,
}: ProfileHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-violet-100/80 via-indigo-50 to-amber-50/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:border-white/10 dark:from-violet-950/50 dark:via-indigo-950/40 dark:to-amber-950/30 sm:p-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/10" aria-hidden="true" />
      <div className="relative z-10 max-w-2xl space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-violet-800 shadow-sm dark:border-violet-300/10 dark:bg-zinc-950/40 dark:text-violet-200">
          <Music2 className="h-3.5 w-3.5" aria-hidden="true" />
          {badgeLabel} <span className="text-violet-400">·</span> {gradeLabel}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          {greeting}, {name}!
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {description}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-100">
            <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
            {streakText}
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-100">
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
            {xp.toLocaleString()} XP
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-2 right-0 hidden h-44 w-[42%] -rotate-6 opacity-75 transition-transform duration-700 hover:rotate-0 md:block" aria-hidden="true">
        <div className="relative flex h-full items-start overflow-hidden rounded-t-xl border border-zinc-300/70 bg-zinc-900/90 p-1 shadow-2xl dark:border-zinc-600">
          {pianoKeys.map((key) => (
            <div key={key} className="relative h-full flex-1 border-r border-zinc-300 bg-gradient-to-b from-white to-zinc-100 last:border-r-0">
              {blackKeyPositions.has(key % 7) && key < pianoKeys.length - 1 && (
                <span className="absolute -right-2 top-0 z-10 h-[62%] w-[62%] rounded-b-sm bg-gradient-to-b from-zinc-700 to-zinc-950 shadow-md" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
