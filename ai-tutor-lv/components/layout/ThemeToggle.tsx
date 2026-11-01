"use client";

import { useSyncExternalStore } from "react";
import { Contrast, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";
import { getServerTheme, getStoredTheme, setStoredTheme, subscribeTheme, type ThemeMode } from "@/lib/theme";

const themeOrder: ThemeMode[] = ["light", "dark", "contrast"];
const themeLabels: Record<ThemeMode, string> = { light: "Gaiša", dark: "Tumša", contrast: "Kontrasts" };

export function ThemeToggle({ className }: { className?: string }) {
  const { language } = useAppSession();
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, getServerTheme);
  const tr = (text: string) => translate(language, text);
  const Icon = theme === "dark" ? Moon : theme === "contrast" ? Contrast : Sun;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      title={tr(themeLabels[theme])}
      aria-label={`${tr("Mainīt tēmu. Pašreizējā:")} ${tr(themeLabels[theme])}`}
      onClick={() => setStoredTheme(themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length])}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
