"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import {
  BookOpen,
  ChevronDown,
  Contrast,
  Crown,
  GraduationCap,
  Headphones,
  Layers,
  Languages,
  Laptop,
  LogOut,
  Map,
  MessageSquare,
  Menu,
  Moon,
  Music2,
  Pin,
  Plus,
  Settings,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  X,
  Zap,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signout } from "@/app/(auth)/actions";
import { useAppSession } from "@/components/providers/app-provider";
import { Progress } from "@/components/ui/progress";
import { calculateLevel } from "@/lib/gamification";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { translate, type Language } from "@/lib/i18n";
import { applyTheme, getServerTheme, getStoredTheme, setStoredTheme, subscribeTheme, type ThemeMode } from "@/lib/theme";

type NavLinkEntry = { href: string; label: string; icon: ComponentType<LucideProps> };
type NavEntry = NavLinkEntry | {
  label: string;
  icon: ComponentType<LucideProps>;
  subItems: NavLinkEntry[];
};

type ViewMode = "student" | "teacher";
const VIEW_MODE_KEY = "maestro-view-mode";
const COLLAPSED_KEY = "maestro-sidebar-collapsed";

const navGroups: { label: string; audience?: ViewMode; items: NavEntry[] }[] = [
  {
    label: "Mācības",
    audience: "student",
    items: [
      { href: "/chat", label: "Saruna", icon: MessageSquare },
      { href: "/practice", label: "Uzdevumu ģenerators", icon: Target },
    ],
  },
  {
    label: "Mūzikas treniņi",
    audience: "student",
    items: [
      { href: "/quiz", label: "Zibens-viktorīna", icon: Zap },
      { href: "/audio-quiz", label: "Klausīšanās viktorīna", icon: Headphones },
      { href: "/flashcards", label: "Mūzikas kartītes", icon: Layers },
    ],
  },
  {
    label: "Progresa ceļš",
    audience: "student",
    items: [
      {
        label: "Progresa ceļš",
        icon: TrendingUp,
        subItems: [
          { href: "/learning-path", label: "Mācību ceļvedis", icon: Map },
          { href: "/progress", label: "Tavs progress", icon: TrendingUp },
          { href: "/achievements", label: "Sasniegumi", icon: BookOpen },
          { href: "/leaderboard", label: "Līderu saraksts", icon: Trophy },
        ],
      },
    ],
  },
  {
    label: "Skolotājam",
    audience: "teacher",
    items: [
      { href: "/teacher-tools", label: "Skolotāja režīms", icon: GraduationCap },
      { href: "/assistant-screen", label: "Metodisko materiālu bāze", icon: Laptop },
    ],
  },
  {
    label: "Rīki un konts",
    items: [
      { href: "/profile", label: "Profils", icon: UserRound },
      { href: "/pricing", label: "Plāni", icon: Crown },
      { href: "/settings", label: "Iestatījumi", icon: Settings },
    ],
  },
];

const themeLabels: Record<ThemeMode, string> = {
  light: "Gaiša",
  dark: "Tumša",
  contrast: "Kontrasts",
};

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, language, changeLanguage } = useAppSession();
  const isGuest = Boolean(session?.isGuest);
  const [userChats, setUserChats] = useState<{ id: string; title: string; is_pinned?: boolean }[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [storedViewMode, setStoredViewMode] = useState<ViewMode | null>(null);
  const viewMode: ViewMode = storedViewMode ?? (session?.userType === "teacher" ? "teacher" : "student");
  const visibleGroups = navGroups.filter((group) => !group.audience || group.audience === viewMode);
  const [chatHistoryError, setChatHistoryError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, getServerTheme);
  const [languageError, setLanguageError] = useState("");
  const [progressMenuState, setProgressMenuState] = useState<{ pathname: string; open: boolean } | null>(null);
  const isProgressOpen = progressMenuState?.pathname === pathname
    ? progressMenuState.open
    : true;
  const tr = (text: string) => translate(language, text);
  const xp = session?.xp ?? 0;
  const level = calculateLevel(xp);
  const progress = (level.currentLevelXp / level.nextLevelXp) * 100;

  const loadUserChats = useCallback(async () => {
    if (!session?.id || isGuest) {
      setUserChats([]);
      setChatHistoryError(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      let rows: { id: string; title: string; is_pinned?: boolean }[] | null = null;
      const pinned = await supabase
        .from("chats")
        .select("id, title, is_pinned")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(25);
      if (pinned.error) {
        // The is_pinned column is added by supabase/schema_update_pins_cards.sql; keep the list usable without it.
        const plain = await supabase
          .from("chats")
          .select("id, title")
          .order("updated_at", { ascending: false })
          .limit(25);
        if (plain.error) throw plain.error;
        rows = plain.data;
      } else {
        rows = pinned.data;
      }
      setUserChats(rows ?? []);
      setChatHistoryError(false);
    } catch (error) {
      console.error("Unable to load recent chats:", error);
      setUserChats([]);
      setChatHistoryError(true);
    }
  }, [session?.id, isGuest]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUserChats(), 0);
    window.addEventListener("chat-history-updated", loadUserChats);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("chat-history-updated", loadUserChats);
    };
  }, [loadUserChats, pathname]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
      const savedMode = window.localStorage.getItem(VIEW_MODE_KEY);
      if (savedMode === "student" || savedMode === "teacher") setStoredViewMode(savedMode);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  }

  function selectViewMode(next: ViewMode) {
    setStoredViewMode(next);
    window.localStorage.setItem(VIEW_MODE_KEY, next);
    router.push(next === "teacher" ? "/teacher-tools" : "/learning-path");
  }

  async function togglePinChat(chatId: string, currentlyPinned: boolean) {
    setDeleteError(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("chats").update({ is_pinned: !currentlyPinned }).eq("id", chatId);
      if (error) throw error;
      setUserChats((current) => current
        .map((chat) => (chat.id === chatId ? { ...chat, is_pinned: !currentlyPinned } : chat))
        .sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned))));
    } catch (error) {
      console.error("Unable to pin the chat:", error);
      setDeleteError(true);
    }
  }

  async function deleteChat(chatId: string) {
    if (!window.confirm(tr("Vai dzēst šo sarunu? To nevar atsaukt."))) return;
    setDeleteError(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("chats").delete().eq("id", chatId);
      if (error) throw error;
      setUserChats((current) => current.filter((chat) => chat.id !== chatId));
      if (pathname === `/chat/${chatId}`) router.push("/chat");
    } catch (error) {
      console.error("Unable to delete the chat:", error);
      setDeleteError(true);
    }
  }

  function cycleTheme() {
    const modes: ThemeMode[] = ["light", "dark", "contrast"];
    const next = modes[(modes.indexOf(theme) + 1) % modes.length];
    setStoredTheme(next);
  }

  async function selectLanguage(next: Language) {
    setLanguageError("");
    try {
      await changeLanguage(next);
    } catch (error) {
      console.error("Unable to save language preference:", error);
      setLanguageError(tr("Neizdevās saglabāt valodas izvēli."));
    }
  }

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden print:hidden"
        />
      )}

      <aside
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) onClose();
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] select-none flex-col justify-between border-r border-border bg-sidebar-background transition-[transform,visibility,width] duration-300           ease-in-out lg:static lg:z-auto lg:h-full lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:duration-200 print:hidden!",
                    open ? "translate-x-0" : "-translate-x-full max-lg:invisible",
                    collapsed ? "lg:w-14" : "lg:w-[240px]"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex items-center gap-2 p-4", collapsed && "lg:justify-center lg:px-2")}>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={tr(collapsed ? "Atvērt sānu joslu" : "Aizvērt sānu joslu")}
              aria-expanded={!collapsed}
              title={tr(collapsed ? "Atvērt sānu joslu" : "Aizvērt sānu joslu")}
              className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:block"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Link href="/chat" className={cn("flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2             focus-visible:ring-ring", collapsed && "lg:hidden")}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Music2 className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-base font-semibold leading-none tracking-tight text-foreground">Maestro</h1>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{tr("Virtuālais skolotājs")}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label={tr("Aizvērt sānu joslu")}
              className="ml-auto rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2               focus-visible:ring-ring lg:hidden"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

                        <nav aria-label={tr("Galvenā navigācija")} className={cn("flex-1 space-y-5 overflow-y-auto px-3 py-2", collapsed && "lg:hidden")}>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="group" aria-label={tr("Skats")}>
              {(["student", "teacher"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => selectViewMode(mode)}
                  className={cn(
                    "rounded-md px-2 py-2.5 text-xs font-medium lg:py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    viewMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tr(mode === "student" ? "Skolēnam / Interesentam" : "Skolotājam")}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Link
                href="/chat"
                aria-current={pathname === "/chat" ? "page" : undefined}
                className="mb-2 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4" />
                {tr("Jauna saruna")}
              </Link>
              <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {tr("Pēdējās sarunas")}
              </p>
              {userChats.length > 0 ? (
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {userChats.map((chat) => (
                    <div key={chat.id} className="group relative">
                      <NavItem
                        href={`/chat/${chat.id}`}
                        icon={chat.is_pinned ? Pin : MessageSquare}
                        label={chat.title}
                        active={pathname === `/chat/${chat.id}`}
                        title={chat.title}
                        className="pr-16"
                      />
                      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
                        <button
                          type="button"
                          onClick={() => void togglePinChat(chat.id, Boolean(chat.is_pinned))}
                          aria-label={`${tr(chat.is_pinned ? "Atspraust sarunu" : "Piespraust sarunu")}: ${chat.title}`}
                          aria-pressed={Boolean(chat.is_pinned)}
                          title={tr(chat.is_pinned ? "Atspraust sarunu" : "Piespraust sarunu")}
                          className={cn(
                            "rounded-md p-1.5 opacity-100 transition-opacity hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2                             focus-visible:ring-ring lg:opacity-0 group-hover:opacity-100",
                            pathname === `/chat/${chat.id}` ? "text-primary-foreground hover:bg-primary-foreground/20" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Pin className={cn("h-3.5 w-3.5", chat.is_pinned && "fill-current")} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteChat(chat.id)}
                          aria-label={`${tr("Dzēst sarunu")}: ${chat.title}`}
                          title={tr("Dzēst sarunu")}
                          className={cn(
                            "rounded-md p-1.5 opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2                             focus-visible:ring-ring lg:opacity-0 group-hover:opacity-100",
                            pathname === `/chat/${chat.id}` ? "text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" : "text-muted-foreground"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : chatHistoryError ? (
                <p className="px-3 py-2 text-xs text-destructive" role="status">{tr("Neizdevās ielādēt nesenās sarunas.")}</p>
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">{tr("Sarunu vēl nav")}</p>
              )}
              {deleteError && <p className="px-3 py-1 text-xs text-destructive" role="alert">{tr("Neizdevās izdzēst sarunu.")}</p>}
            </div>

            {visibleGroups.map((group, groupIndex) => {
              // The "New chat" button above already covers the chat link.
              const groupItems = groupIndex === 0
                ? group.items.filter((item) => !("href" in item) || item.href !== "/chat")
                : group.items;

              return (
              <div key={group.label} className="space-y-1">
                {!groupItems.some((item) => "subItems" in item) && (
                  <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {tr(group.label)}
                  </p>
                )}
                {groupItems.map((item) => {
                  if ("subItems" in item) {
                    const hasActiveChild = item.subItems.some((subItem) => isPathActive(pathname, subItem.href));

                    return (
                      <div key={item.label} className="space-y-1">
                        <button
                          type="button"
                          aria-expanded={isProgressOpen}
                          aria-controls="progress-navigation"
                          onClick={() => setProgressMenuState({ pathname, open: !isProgressOpen })}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            hasActiveChild ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <item.icon className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
                            {tr(item.label)}
                          </span>
                          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isProgressOpen && "rotate-180")} aria-hidden="true" />
                        </button>
                        <div
                          id="progress-navigation"
                          className={cn(
                            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                            isProgressOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="min-h-0 overflow-hidden border-l border-border pl-2">
                            <div className="space-y-1 py-1">
                              {item.subItems.map((subItem) => (
                                <NavItem
                                  key={subItem.href}
                                  {...subItem}
                                  label={tr(subItem.label)}
                                  active={isPathActive(pathname, subItem.href)}
                                  nested
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <NavItem
                      key={item.href}
                      {...item}
                      label={tr(item.label)}
                      active={isPathActive(pathname, item.href)}
                    />
                  );
                })}
              </div>
              );
            })}
          </nav>
        </div>

        <div className={cn("space-y-2 border-t border-border bg-background/50 p-3", collapsed && "lg:hidden")}>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">{tr("Līmenis")} {level.level}</span>
              <span className="tabular-nums text-muted-foreground">{level.currentLevelXp} / {level.nextLevelXp} XP</span>
            </div>
            <Progress value={progress} className="mt-1.5 h-1.5" aria-label={`${tr("Līmenis")} ${level.level}: ${xp.toLocaleString("lv-LV")} XP`} />
          </div>

          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`${tr("Mainīt tēmu. Pašreizējā:")} ${tr(themeLabels[theme])}`}
              className="flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {theme === "light" && <Sun className="h-3.5 w-3.5" />}
              {theme === "dark" && <Moon className="h-3.5 w-3.5" />}
              {theme === "contrast" && <Contrast className="h-3.5 w-3.5" />}
              {tr(themeLabels[theme])}
            </button>
            <div className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <div className="flex gap-0.5 font-mono text-xs" role="group" aria-label={tr("Valodas izvēle")}>
                {(["lv", "en", "ru"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => void selectLanguage(value)}
                    aria-pressed={language === value}
                    className={cn(
                      "min-h-10 rounded px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-8",
                      language === value ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {value.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {languageError && <p className="px-2 text-xs text-destructive" role="alert">{languageError}</p>}

          <div className="flex items-center justify-between border-t border-border pt-2">
            <Link href="/profile" className="min-w-0 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="truncate text-[13px] font-medium leading-tight">{session?.displayName ?? tr("Māceklis")}</p>
              <p className="truncate text-xs text-muted-foreground">{session?.email ?? ""}</p>
            </Link>
            <form action={signout}>
              <button
                type="submit"
                aria-label={tr("Iziet no konta")}
                title={tr("Iziet")}
                className="rounded-lg p-3 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:p-2"
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

function NavItem({ href, icon: Icon, label, active, nested = false, title, className }: NavLinkEntry & { active: boolean; nested?: boolean; title?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={title ?? label}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        nested ? "ml-1 px-2.5 py-2.5 text-xs lg:py-1.5" : "px-3 py-2.5 lg:py-2",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
