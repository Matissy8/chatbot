"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/components/providers/app-provider";
import { Flame, LogOut, Sparkles } from "lucide-react";
import { signout } from "@/app/(auth)/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useAppSession();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    } else if (!loading && session && !session.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [loading, router, session]);

  if (loading || !session || !session.onboardingComplete) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Ielādē profilu…</div>;
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground xl:flex-row">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-background/90 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Izglītības platforma</p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Chat-first mācīšanās</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="h-4 w-4" />
              {session.xp} XP
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:inline-flex">
              <Flame className="h-4 w-4" />
              {session.streak} dienas
            </div>
            <form action={signout} className="xl:hidden">
              <Button type="submit" variant="outline" size="icon" aria-label="Iziet no konta">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
