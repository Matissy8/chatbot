export function calculateLevel(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  let level = 1;
  let xpNeeded = 100;
  let remainingXp = totalXp;

  while (remainingXp >= xpNeeded) {
    remainingXp -= xpNeeded;
    level += 1;
    xpNeeded = Math.floor(xpNeeded * 1.2);
  }

  return {
    level,
    currentLevelXp: remainingXp,
    nextLevelXp: xpNeeded,
  };
}

export type XpSource =
  | "chat_educational"
  | "practice_correct"
  | "quiz_perfect"
  | "daily_streak";

export const XP_REWARDS: Record<XpSource, number> = {
  chat_educational: 2,
  practice_correct: 5,
  quiz_perfect: 20,
  daily_streak: 10,
};

export async function grantXp(userId: string, source: XpSource, subject?: string) {
  const amount = XP_REWARDS[source];
  console.log(`[XP] Granted ${amount} XP to ${userId} for ${source} in ${subject ?? "general"}`);
  return amount;
}
