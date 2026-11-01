import type { Language } from "@/lib/i18n";

// Latvian: 1 diena, 2 dienas, 10 dienu, 11 dienu, 21 diena. Russian and English follow their own rules.
export function formatDays(count: number, language: Language = "lv"): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (language === "en") return `${count} ${count === 1 ? "day" : "days"}`;

  if (language === "ru") {
    if (mod10 === 1 && mod100 !== 11) return `${count} день`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} дня`;
    return `${count} дней`;
  }

  if (mod10 === 0 || (mod100 >= 11 && mod100 <= 19)) return `${count} dienu`;
  if (mod10 === 1) return `${count} diena`;
  return `${count} dienas`;
}

// Attributive form used in "N-day streak" badges.
export function formatStreakDays(count: number, language: Language = "lv"): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (language === "en") return `${count}-day streak`;
  if (language === "ru") return `${formatDays(count, language)} подряд`;
  return mod10 === 1 && mod100 !== 11 ? `${count} dienas sērija` : `${count} dienu sērija`;
}
