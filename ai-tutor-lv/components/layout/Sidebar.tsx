"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  BookOpen,
  Contrast,
  GraduationCap,
  Languages,
  Laptop,
  LogOut,
  MessageSquare,
  Moon,
  Music2,
  Plus,
  Settings,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signout } from "@/app/(auth)/actions";
import { useAppSession } from "@/components/providers/app-provider";
import { Progress } from "@/components/ui/progress";
import { calculateLevel } from "@/lib/gamification";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ThemeMode = "light" | "dark" | "contrast";
type Language = "LV" | "EN" | "RU";
type NavEntry = { href: string; label: string; icon: ComponentType<LucideProps> };

const navGroups: { label: string; items: NavEntry[] }[] = [
  {
    label: "Mācības",
    items: [
      { href: "/chat", label: "Saruna", icon: MessageSquare },
      { href: "/practice", label: "Uzdevumu ģenerators", icon: Target },
    ],
  },
  {
    label: "Progress",
    items: [
      { href: "/progress", label: "Mans progress", icon: TrendingUp },
      { href: "/leaderboard", label: "Līderu saraksts", icon: Trophy },
      { href: "/achievements", label: "Sasniegumi", icon: BookOpen },
    ],
  },
  {
    label: "Rīki un konts",
    items: [
      { href: "/teacher-tools", label: "Skolotāja režīms", icon: GraduationCap },
      { href: "/assistant-screen", label: "Ekrāna un foto palīgs", icon: Laptop },
      { href: "/profile", label: "Profils", icon: UserRound },
      { href: "/settings", label: "Iestatījumi", icon: Settings },
    ],
  },
];

const themeLabels: Record<ThemeMode, string> = {
  light: "Gaiša",
  dark: "Tumša",
  contrast: "Kontrasts",
};

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-high-contrast");
  if (theme === "dark") root.classList.add("dark");
  if (theme === "contrast") root.classList.add("theme-high-contrast");
}

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useAppSession();
  const [userChats, setUserChats] = useState<{ id: string; title: string }[]>([]);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [language, setLanguage] = useState<Language>("LV");
  const xp = session?.xp ?? 0;
  const level = calculateLevel(xp);
  const progress = (level.currentLevelXp / level.nextLevelXp) * 100;
  const flattenedLinks = navGroups.flatMap((group) => group.items);

  const loadUserChats = useCallback(async () => {
    if (!session?.id) {
      setUserChats([]);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("chats")
        .select("id, title")
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      setUserChats(data ?? []);
    } catch (error) {
      console.error("Unable to load recent chats:", error);
      setUserChats([]);
    }
  }, [session?.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUserChats(), 0);
    window.addEventListener("chat-history-updated", loadUserChats);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("chat-history-updated", loadUserChats);
    };
  }, [loadUserChats, pathname]);

  function cycleTheme() {
    const modes: ThemeMode[] = ["light", "dark", "contrast"];
    const next = modes[(modes.indexOf(theme) + 1) % modes.length];
    setTheme(next);
    applyTheme(next);
  }

  function selectLanguage(next: Language) {
    setLanguage(next);
    document.documentElement.setAttribute("lang", next.toLowerCase());
    window.localStorage.setItem("ai-tutor-language", next);
  }

  return (
    <>
      <nav aria-label="Galvenā navigācija" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-sidebar-background px-3 py-2 xl:hidden">
        {flattenedLinks.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} compact />
        ))}
      </nav>

      <aside className="hidden h-screen w-[240px] shrink-0 select-none flex-col justify-between border-r border-border bg-sidebar-background xl:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="p-4">
            <Link href="/chat" className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Music2 className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-base font-semibold leading-none tracking-tight text-foreground">AITutor LV</h1>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">Inteliģentais mācību asistents</p>
              </div>
            </Link>
          </div>

          <nav aria-label="Galvenā navigācija" className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
            <div className="space-y-1">
              <Link
                href="/chat"
                aria-current={pathname === "/chat" ? "page" : undefined}
                className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4" />
                Jauna saruna
              </Link>
              <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Pēdējās sarunas
              </p>
              {userChats.length > 0 ? userChats.map((chat) => (
                <NavItem
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  icon={MessageSquare}
                  label={chat.title}
                  active={pathname === `/chat/${chat.id}`}
                  title={chat.title}
                />
              )) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">Sarunu vēl nav</p>
              )}
            </div>

            {navGroups.slice(1).map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <NavItem key={item.href} {...item} active={pathname === item.href} />
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-border bg-background/50 p-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold">Līmenis {level.level}</span>
              <span className="tabular-nums text-muted-foreground">{xp.toLocaleString("lv-LV")} XP</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
              {level.currentLevelXp} / {level.nextLevelXp} līdz nākamajam līmenim
            </p>
          </div>

          <div className="flex items-center justify-between px-2 text-xs">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sun className="h-3.5 w-3.5" /> Tēma
            </span>
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`Mainīt tēmu. Pašreizējā: ${themeLabels[theme]}`}
              className="flex items-center gap-1 rounded-md p-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {theme === "light" && <Sun className="h-3.5 w-3.5" />}
              {theme === "dark" && <Moon className="h-3.5 w-3.5" />}
              {theme === "contrast" && <Contrast className="h-3.5 w-3.5" />}
              {themeLabels[theme]}
            </button>
          </div>

          <div className="flex items-center justify-between px-2 text-xs">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Languages className="h-3.5 w-3.5" /> Valoda
            </span>
            <div className="flex gap-0.5 font-mono text-[10px]" aria-label="Valodas izvēle">
              {(["LV", "EN", "RU"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectLanguage(value)}
                  aria-pressed={language === value}
                  className={cn(
                    "rounded px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    language === value ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2">
            <Link href="/profile" className="min-w-0 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="truncate text-[13px] font-medium leading-tight">{session?.displayName ?? "Māceklis"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{session?.email ?? ""}</p>
            </Link>
            <form action={signout}>
              <button
                type="submit"
                aria-label="Iziet no konta"
                title="Iziet"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({ href, icon: Icon, label, active, compact = false, title }: NavEntry & { active: boolean; compact?: boolean; title?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={title ?? label}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "shrink-0 px-3 py-2 text-xs" : "px-3 py-2",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
