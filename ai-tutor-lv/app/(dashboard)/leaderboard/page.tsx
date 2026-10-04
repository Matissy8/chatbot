"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Medal, Trophy } from "lucide-react";
import { useState } from "react";

const rankings = {
  week: [
    { id: 1, name: "Elīna", xp: 420, level: 15, streak: 21 },
    { id: 2, name: "Anna", xp: 385, level: 18, streak: 12 },
    { id: 3, name: "Roberts", xp: 310, level: 17, streak: 8 },
    { id: 4, name: "Matīss", xp: 275, level: 12, streak: 3 },
    { id: 5, name: "Zane", xp: 240, level: 11, streak: 5 },
  ],
  month: [
    { id: 1, name: "Anna", xp: 1480, level: 18, streak: 12 },
    { id: 2, name: "Roberts", xp: 1210, level: 17, streak: 8 },
    { id: 3, name: "Elīna", xp: 1090, level: 15, streak: 21 },
    { id: 4, name: "Matīss", xp: 880, level: 12, streak: 3 },
    { id: 5, name: "Zane", xp: 760, level: 11, streak: 5 },
  ],
  semester: [
    { id: 1, name: "Roberts", xp: 3280, level: 17, streak: 8 },
    { id: 2, name: "Anna", xp: 3020, level: 18, streak: 12 },
    { id: 3, name: "Elīna", xp: 2710, level: 15, streak: 21 },
    { id: 4, name: "Zane", xp: 2140, level: 11, streak: 5 },
    { id: 5, name: "Matīss", xp: 1970, level: 12, streak: 3 },
  ],
  allTime: [
    { id: 1, name: "Anna", xp: 4820, level: 18, streak: 12 },
    { id: 2, name: "Roberts", xp: 4310, level: 17, streak: 8 },
    { id: 3, name: "Elīna", xp: 3940, level: 15, streak: 21 },
    { id: 4, name: "Matīss", xp: 3100, level: 12, streak: 3 },
    { id: 5, name: "Zane", xp: 2850, level: 11, streak: 5 },
  ],
};

type RankingPeriod = keyof typeof rankings;

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

function RankingList({ period }: { period: RankingPeriod }) {
  const users = rankings[period];
  const [first, second, third] = users;
  const podium = [second, first, third];
  const podiumRanks = [podiumStyles[1], podiumStyles[0], podiumStyles[2]];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {podium.map((user, index) => {
          const rank = podiumRanks[index];
          const Icon = rank.icon;
          return (
            <Card key={user.id} className={`border border-border shadow-sm ${rank.surface} ${index === 1 ? "md:-translate-y-2" : ""}`}>
              <CardContent className="flex flex-col items-center p-5 text-center">
                <Icon className={`mb-2 h-6 w-6 ${rank.color}`} aria-hidden="true" />
                <Avatar className="mb-3 h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-background font-semibold text-foreground">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-foreground">{user.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{rank.label} · Līmenis {user.level}</p>
                <Badge variant="secondary" className="mt-3 bg-background font-mono text-foreground">
                  {user.xp.toLocaleString("lv-LV")} XP
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {users.slice(3).map((user, index) => (
            <div key={user.id} className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-0 transition-colors hover:bg-muted/50">
              <div className="flex min-w-0 items-center gap-4">
                <span className="w-7 text-center text-sm font-semibold text-muted-foreground">{index + 4}</span>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-muted text-foreground">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{user.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Līmenis {user.level}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center"><Flame className="mr-1 h-3 w-3" />{user.streak} dienas</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 font-mono">{user.xp.toLocaleString("lv-LV")} XP</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LeaderboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<RankingPeriod>("month");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 p-5 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Kopiena</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Līderu saraksts</h1>
          <p className="mt-1 text-muted-foreground">Sacenties ar citiem un audzē savu līmeni.</p>
        </div>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tava vieta</p>
              <p className="font-bold text-foreground">#24</p>
            </div>
            <Avatar>
              <AvatarFallback className="bg-muted font-semibold text-foreground">TU</AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>
      </header>

      <Tabs
        value={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as RankingPeriod)}
        className="w-full"
      >
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-fit">
          {periods.map((period) => (
            <TabsTrigger
              key={period.value}
              value={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className="px-3 py-2"
            >
              {period.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {periods.map((period) => (
          <TabsContent key={period.value} value={period.value}>
            <RankingList period={period.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
