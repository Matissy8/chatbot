"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Medal, Trophy } from "lucide-react";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { translate } from "@/lib/i18n";

type RankingPeriod = "week" | "month" | "semester" | "allTime";

type Leader = {
  rank: number;
  displayName: string;
  xp: number;
  streak: number;
  isCurrentUser: boolean;
};

const periods: { value: RankingPeriod; label: string }[] = [
  { value: "week", label: "Šonedēļ" },
  { value: "month", label: "Šomēnes" },
  { value: "semester", label: "Šajā semestrī" },
  { value: "allTime", label: "Visu laiku" },
];

const podiumStyles = [
  { icon: Trophy, label: "1. vieta", color: "text-foreground", surface: "bg-muted" },
  { icon: Medal, label: "2. vieta", color: "text-muted-foreground", surface: "bg-secondary" },
  { icon: Medal, label: "3. vieta", color: "text-muted-foreground", surface: "bg-secondary" },
];

function LeaderAvatar({ name }: { name: string }) {
  return (
    <Avatar className="h-10 w-10">
      <AvatarFallback className="bg-muted text-foreground">{name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default function LeaderboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<RankingPeriod>("month");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const locale = language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "lv-LV";

  useEffect(() => {
    let active = true;
    let timeout: number | undefined;

    async function refresh() {
      try {
        const result = await fetchJson<{ leaders: Leader[] }>(`/api/leaderboard?period=${selectedPeriod}`, { timeoutMs: 15_000 });
        if (active) {
          setLeaders(result.leaders);
          setError("");
        }
      } catch (cause) {
        if (active) setError(translate(language, cause instanceof Error ? cause.message : "Neizdevās ielādēt līderu sarakstu."));
      } finally {
        if (active) {
          setLoading(false);
          timeout = window.setTimeout(() => void refresh(), 60_000);
        }
      }
    }

    void refresh();
    return () => {
      active = false;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [language, selectedPeriod]);

  const topThree = leaders.filter((leader) => leader.rank <= 3);
  const podiumOrder = [topThree.find((leader) => leader.rank === 2), topThree.find((leader) => leader.rank === 1), topThree.find((leader) => leader.rank === 3)];
  const viewer = leaders.find((leader) => leader.isCurrentUser);
  const listLeaders = leaders.filter((leader) => leader.rank > 3);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 p-5 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{tr("Kopiena")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{tr("Līderu saraksts")}</h1>
          <p className="mt-1 text-muted-foreground">{tr("Sacenties ar citiem un audzē savu līmeni.")}</p>
        </div>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tr("Tava vieta")}</p>
              <p className="font-bold text-foreground">{viewer ? `#${viewer.rank}` : "—"}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
              {viewer?.displayName.charAt(0).toUpperCase() ?? "?"}
            </div>
          </CardContent>
        </Card>
      </header>

      <Tabs value={selectedPeriod} onValueChange={(value) => { setLoading(true); setSelectedPeriod(value as RankingPeriod); }} className="w-full">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-fit">
          {periods.map((period) => (
            <TabsTrigger key={period.value} value={period.value} className="px-3 py-2">
              {tr(period.label)}
            </TabsTrigger>
          ))}
        </TabsList>
        {periods.map((period) => (
          <TabsContent key={period.value} value={period.value}>
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{tr(error)}</p>
            ) : loading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{tr("Ielādē līderu sarakstu…")}</p>
            ) : leaders.length === 0 ? (
              <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">{tr("Šajā periodā vēl nav XP ieguvušu dalībnieku.")}</p>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  {podiumOrder.map((leader, index) => {
                    if (!leader) return <div key={`empty-podium-${index}`} />;
                    const rank = podiumStyles[leader.rank - 1];
                    const Icon = rank.icon;
                    return (
                      <Card key={leader.rank} className={`border border-border shadow-sm ${rank.surface} ${index === 1 ? "md:-translate-y-2" : ""}`}>
                        <CardContent className="flex flex-col items-center p-5 text-center">
                          <Icon className={`mb-2 h-6 w-6 ${rank.color}`} aria-hidden="true" />
                          <LeaderAvatar name={leader.displayName} />
                          <p className="mt-3 font-semibold text-foreground">{leader.displayName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{tr(rank.label)}</p>
                          <Badge variant="secondary" className="mt-3 bg-background font-mono text-foreground">
                            {leader.xp.toLocaleString(locale)} XP
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card className="overflow-hidden border-border bg-card shadow-sm">
                  <CardContent className="p-0">
                    {listLeaders.map((leader) => (
                      <div key={`${leader.rank}-${leader.displayName}`} className={`flex items-center justify-between gap-4 border-b border-border p-4 last:border-0 transition-colors hover:bg-muted/50 ${leader.isCurrentUser ? "bg-muted/40" : ""}`}>
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="w-7 text-center text-sm font-semibold text-muted-foreground">#{leader.rank}</span>
                          <LeaderAvatar name={leader.displayName} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{leader.displayName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center"><Flame className="mr-1 h-3 w-3" />{leader.streak} {tr("dienas")}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 font-mono">{leader.xp.toLocaleString(locale)} XP</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
