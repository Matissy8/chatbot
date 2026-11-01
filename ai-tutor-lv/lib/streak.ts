const rigaFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Riga",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Returns the calendar date (YYYY-MM-DD) in Riga, which is when daily streaks roll over.
export function rigaDate(value: Date) {
  return rigaFormatter.format(value);
}

function previousDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

// profiles.streak is only rewritten on the next activity, so a streak that was not continued yesterday or today has already ended.
export function effectiveStreak(streak: number, lastActiveAt: string | null | undefined, now = new Date()) {
  if (!streak || !lastActiveAt) return 0;
  const lastActiveDay = rigaDate(new Date(lastActiveAt));
  return lastActiveDay >= previousDay(rigaDate(now)) ? streak : 0;
}
