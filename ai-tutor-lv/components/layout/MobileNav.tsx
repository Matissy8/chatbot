"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Layers, Map, Menu, MessageSquare, Zap, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

type Tab = { href: string; label: string; icon: ComponentType<LucideProps>; matches?: string[] };

const tabs: Tab[] = [
  { href: "/chat", label: "Saruna", icon: MessageSquare },
  { href: "/quiz", label: "Zibens", icon: Zap },
  { href: "/flashcards", label: "Kartītes", icon: Layers },
  { href: "/learning-path", label: "Progress", icon: Map, matches: ["/learning-path", "/progress", "/achievements", "/leaderboard"] },
];

const tabClass = "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MobileNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);

  return (
    <nav
      aria-label={tr("Galvenā navigācija")}
      className="flex shrink-0 items-stretch justify-around gap-1 border-t border-border bg-sidebar-background/95 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden print:hidden"
    >
      {tabs.map(({ href, label, icon: Icon, matches }) => {
        const active = (matches ?? [href]).some((path) => pathname === path || pathname.startsWith(`${path}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(tabClass, active ? "text-primary" : "text-muted-foreground")}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{tr(label)}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onOpenMenu} className={cn(tabClass, "text-muted-foreground")}>
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span>{tr("Vairāk")}</span>
      </button>
    </nav>
  );
}
