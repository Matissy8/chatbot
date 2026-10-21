"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/components/providers/app-provider";
import { Flame, LogOut, Sparkles } from "lucide-react";
import { signout } from "@/app/(auth)/actions";
import { translate } from "@/lib/i18n";

function rigaDate(value: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const practicedToday = Boolean(session?.lastActive && rigaDate(new Date(session.lastActive)) === rigaDate(new Date()));

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    } else if (!loading && session && !session.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [loading, router, session]);

  if (loading || !session || !session.onboardingComplete) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">{tr("Ielādē profilu…")}</div>;
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground xl:flex-row">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-background/90 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tr("Izglītības platforma")}</p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{tr("Interaktīvās mācības")}</h2>
            {session.isGuest && <p className="mt-1 text-xs text-muted-foreground">{tr("Viesu priekšskatījums · dati netiek saglabāti")}</p>}
            {!session.isGuest && (
              <p className={`mt-1 text-xs ${practicedToday ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`} role="status">
                {tr(practicedToday ? "Dienas sērija atjaunināta šodien. Turpini mācīties!" : "Uzturi savu mūzikas sēriju dzīvu! Izpildi 1 šodienas uzdevumu.")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="h-4 w-4" />
              {session.xp} XP
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground sm:px-3 sm:text-xs">
              <Flame className="h-4 w-4" />
              {session.streak} {tr("dienas")}
            </div>
            <form action={signout} className="xl:hidden">
              <Button type="submit" variant="outline" size="icon" aria-label={tr("Iziet no konta")}>
                <LogOut className="h-4 w-4" />{tr("Iziet no konta")}
              </Button>
            </form>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
