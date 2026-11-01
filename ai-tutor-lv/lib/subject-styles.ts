import { BarChart3, BookOpen, GraduationCap, Layers, Music2, type LucideIcon } from "lucide-react";

export type SubjectTone = {
  icon: LucideIcon;
  // Pastel card surface with a matching border and text colour.
  card: string;
  // Round icon badge.
  badge: string;
  // Progress bar fill.
  bar: string;
  // Selected subject chip.
  chipActive: string;
};

const sky: Omit<SubjectTone, "icon"> = {
  card: "border-sky-100 bg-sky-50/80 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300",
  badge: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300",
  bar: "bg-sky-500",
  chipActive: "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
};
const emerald: Omit<SubjectTone, "icon"> = {
  card: "border-emerald-100 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
  badge: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
  bar: "bg-emerald-500",
  chipActive: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
};
const amber: Omit<SubjectTone, "icon"> = {
  card: "border-amber-100 bg-amber-50/80 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
  badge: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  bar: "bg-amber-500",
  chipActive: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
};
const violet: Omit<SubjectTone, "icon"> = {
  card: "border-violet-100 bg-violet-50/80 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300",
  badge: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
  bar: "bg-violet-500",
  chipActive: "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
};

const tones: Record<string, SubjectTone> = {
  solfedzo: { icon: Music2, ...sky },
  muzikas_teorija: { icon: GraduationCap, ...emerald },
  harmonija: { icon: BarChart3, ...amber },
  muzikas_literatura: { icon: BookOpen, ...violet },
  polifonija: { icon: Layers, ...violet },
};

export function subjectTone(subjectId: string): SubjectTone {
  return tones[subjectId] ?? { icon: BookOpen, ...violet };
}
