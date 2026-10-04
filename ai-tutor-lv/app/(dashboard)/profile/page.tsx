"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { calculateLevel } from "@/lib/gamification";

export default function ProfilePage() {
  const { session } = useAppSession();
  const level = calculateLevel(session?.xp ?? 0);
  const roleLabels = {
    school_student: "Skolēns",
    music_student: "Mūzikas skolas audzēknis",
    music_high_school: "Mūzikas vidusskolas students",
    teacher: "Skolotājs",
    independent: "Pašmācība",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">Profils</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Lietotājs</p>
              <CardTitle className="mt-2 text-2xl">{session?.displayName}</CardTitle>
            </div>
            <div className="rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground">Līmenis {level.level}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                <span>XP progress</span>
                <span>{level.currentLevelXp} / {level.nextLevelXp}</span>
              </div>
              <Progress value={(level.currentLevelXp / level.nextLevelXp) * 100} className="h-3" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Sērija</p>
                <p className="mt-2 text-xl font-semibold">{session?.streak ?? 0} dienas</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Teorija</p>
                <p className="mt-2 text-xl font-semibold">88%</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Lietotāja tips</p>
                <p className="mt-2 text-xl font-semibold">{session ? roleLabels[session.userType] : "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
