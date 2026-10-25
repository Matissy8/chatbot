export type AchievementDefinition = {
  id: "first-quiz" | "streak-3" | "streak-7" | "xp-100" | "flashcard-20" | "perfect-quiz";
  title: string;
  description: string;
  icon: string;
  maxProgress: number;
};

export const ACHIEVEMENTS_CATALOG: readonly AchievementDefinition[] = [
  {
    id: "first-quiz",
    title: "Pirmais sasniegums",
    description: "Pabeidz savu pirmo zibens-viktorīnu.",
    icon: "🎵",
    maxProgress: 1,
  },
  {
    id: "streak-3",
    title: "Ritma disciplīna",
    description: "Mācies 3 dienas pēc kārtas.",
    icon: "🔥",
    maxProgress: 3,
  },
  {
    id: "streak-7",
    title: "Nedēļas meistars",
    description: "Noturi 7 dienu mācību sēriju.",
    icon: "⚡",
    maxProgress: 7,
  },
  {
    id: "xp-100",
    title: "Jaunais teorētiķis",
    description: "Iegūsti 100 pieredzes punktus (XP).",
    icon: "🎼",
    maxProgress: 100,
  },
  {
    id: "flashcard-20",
    title: "Kartīšu meistars",
    description: "Atkārto vismaz 20 mūzikas kartītes.",
    icon: "🧠",
    maxProgress: 20,
  },
  {
    id: "perfect-quiz",
    title: "Nevainojama dzirde",
    description: "Pabeidz zibens-viktorīnu ar 5 pareizām atbildēm no 5.",
    icon: "🏆",
    maxProgress: 5,
  },
];

export type AchievementStatistics = {
  xp: number;
  streak: number;
  completedQuizzes: number;
  bestQuizScore: number;
  bestQuizQuestionCount: number;
  reviewedCards: number;
  unlockedAchievementIds: string[];
};

export function getAchievementProgress(
  achievement: AchievementDefinition,
  statistics: AchievementStatistics
) {
  switch (achievement.id) {
    case "first-quiz":
      return Math.min(statistics.completedQuizzes, achievement.maxProgress);
    case "streak-3":
    case "streak-7":
      return Math.min(statistics.streak, achievement.maxProgress);
    case "xp-100":
      return Math.min(statistics.xp, achievement.maxProgress);
    case "flashcard-20":
      return Math.min(statistics.reviewedCards, achievement.maxProgress);
    case "perfect-quiz":
      return statistics.bestQuizQuestionCount === achievement.maxProgress
        ? Math.min(statistics.bestQuizScore, achievement.maxProgress)
        : 0;
  }
}
