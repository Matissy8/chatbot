"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { FloatingAssistant } from "@/components/chat/FloatingAssistant";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/components/providers/app-provider";
import { Flame, Menu, Sparkles } from "lucide-react";
import { signout } from "@/app/(auth)/actions";
import { translate } from "@/lib/i18n";
import { formatDays } from "@/lib/format-utils";
import { rigaDate } from "@/lib/streak";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, language, profileError, refreshSession } = useAppSession();
  const tr = (text: string) => translate(language, text);
  // The drawer is tied to the pathname it was opened on, so navigating closes it without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const sidebarOpen = drawerPath === pathname;
  const openSidebar = useCallback(() => setDrawerPath(pathname), [pathname]);
  const closeSidebar = useCallback(() => setDrawerPath(null), []);
  const practicedToday = Boolean(session?.lastActive && rigaDate(new Date(session.lastActive)) === rigaDate(new Date()));

  useEffect(() => {
    // A profile load failure keeps the signed-in user here; redirecting to /login would bounce straight back.
    if (!loading && !session && !profileError) {
      router.replace("/login");
    } else if (!loading && session && !session.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [loading, profileError, router, session]);

  if (!loading && !session && profileError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm" role="alert">
          <h1 className="text-lg font-semibold">{tr("Neizdevās ielādēt profilu.")}</h1>
          <p className="text-sm text-muted-foreground">{tr("Pārbaudi interneta savienojumu un Supabase datubāzes shēmu, tad mēģini vēlreiz.")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={() => void refreshSession()}>{tr("Mēģināt vēlreiz")}</Button>
            <form action={signout}>
              <Button type="submit" variant="outline" className="w-full">{tr("Iziet no konta")}</Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !session || !session.onboardingComplete) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">{tr("Ielādē profilu…")}</div>;
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground md:flex-row print:block print:h-auto print:overflow-visible">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col print:block">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/90 px-3 py-2 backdrop-blur sm:px-5 sm:py-3 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={tr("Atvērt sānu joslu")}
              className="-ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">{tr("Izglītības platforma")}</p>
              <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">{tr("Interaktīvās mācības")}</h2>
              {session.isGuest && <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{tr("Viesu priekšskatījums · dati netiek saglabāti")}</p>}
              {!session.isGuest && (
                <p className={`mt-1 hidden text-xs sm:block ${practicedToday ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`} role="status">
                  {tr(practicedToday ? "Dienas sērija atjaunināta šodien. Turpini mācīties!" : "Uzturi savu mūzikas sēriju dzīvu! Izpildi 1 šodienas uzdevumu.")}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:gap-2 sm:px-3">
              <Sparkles className="h-4 w-4" />
              {session.xp} XP
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground sm:gap-2 sm:px-3 sm:text-xs">
              <Flame className="h-4 w-4" />
              {formatDays(session.streak, language)}
            </div>
          </div>
        </header>
        <main className={`min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 print:overflow-visible print:p-0 ${pathname.startsWith("/chat") ? "" : "pb-20 md:pb-5"}`}>{children}</main>
        <MobileNav onOpenMenu={openSidebar} />
        {/* The chat page is already a full conversation, so the quick helper is shown on the other pages only. */}
        {!pathname.startsWith("/chat") && <FloatingAssistant />}
      </div>
    </div>
  );
}
