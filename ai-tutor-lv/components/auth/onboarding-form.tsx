"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSession } from "@/components/providers/app-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const userTypes = ["school_student", "music_student", "music_high_school", "teacher", "independent"] as const;
type UserType = (typeof userTypes)[number];

const roleOptions: { value: UserType; label: string }[] = [
  { value: "school_student", label: "Skolēns vispārizglītojošā skolā" },
  { value: "music_student", label: "Mūzikas skolas audzēknis" },
  { value: "music_high_school", label: "Mūzikas vidusskolas students" },
  { value: "teacher", label: "Skolotājs" },
  { value: "independent", label: "Mācos pašmācības ceļā" },
];

export function OnboardingForm() {
  const router = useRouter();
  const { session, refreshSession } = useAppSession();
  const [role, setRole] = useState<UserType>("independent");
  const [grade, setGrade] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState<"lv" | "en">("lv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const needsGrade = role === "school_student" || role === "music_student";

  async function handleComplete() {
    setError("");
    if (!isSupabaseConfigured()) {
      setError("Supabase nav konfigurēts. Pievieno savienojuma iestatījumus un mēģini vēlreiz.");
      return;
    }
    if (needsGrade && !grade) {
      setError("Izvēlies savu klasi.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        role,
        grade_level: needsGrade ? Number(grade) : null,
        display_name: displayName.trim() || session?.displayName || user.email?.split("@")[0] || "Skolēns",
        language,
        onboarding_completed_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (profileError) {
        setError("Profila saglabāšana neizdevās. Pārliecinies, ka Supabase datubāzē ir izpildīts schema.sql.");
        return;
      }

      await refreshSession();
      router.replace("/chat");
      router.refresh();
    } catch (cause) {
      console.error("Onboarding save failed:", cause);
      setError("Neizdevās saglabāt iestatījumus. Mēģini vēlreiz.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-xl border-border bg-card shadow-xl shadow-foreground/5">
      <CardHeader>
        <p className="text-sm font-medium text-muted-foreground">Pirmais solis</p>
        <CardTitle className="text-2xl font-bold text-foreground">Iepazīsimies!</CardTitle>
        <CardDescription>Palīdzi AI pielāgot paskaidrojumus tavam mācību līmenim.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="display-name">Vārds vai segvārds</Label>
          <Input
            id="display-name"
            autoComplete="nickname"
            maxLength={80}
            placeholder="Piemēram, Anna"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Kā tu izmantosi platformu?</Label>
          <Select value={role} onValueChange={(value) => {
            if (typeof value === "string" && userTypes.includes(value as UserType)) {
              setRole(value as UserType);
              if (value !== "school_student" && value !== "music_student") setGrade("");
            }
          }}>
            <SelectTrigger id="role" className="w-full bg-background">
              <SelectValue placeholder="Izvēlies savu lomu" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsGrade && (
          <div className="space-y-2">
            <Label htmlFor="grade">Kurā klasē tu mācies?</Label>
            <Select value={grade} onValueChange={(value) => setGrade(typeof value === "string" ? value : "")}>
              <SelectTrigger id="grade" className="w-full bg-background">
                <SelectValue placeholder="Izvēlies klasi" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => (
                  <SelectItem key={value} value={value}>{value}. klase</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="language">Atbilžu valoda</Label>
          <Select value={language} onValueChange={(value) => {
            if (value === "lv" || value === "en") setLanguage(value);
          }}>
            <SelectTrigger id="language" className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lv">Latviešu</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}

        <Button onClick={handleComplete} disabled={loading} className="w-full">
          {loading ? "Saglabā iestatījumus…" : "Sākt mācīties"}
        </Button>
      </CardContent>
    </Card>
  );
}
