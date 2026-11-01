"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleOptions } from "@/components/auth/onboarding-form";
import { useAppSession } from "@/components/providers/app-provider";
import { gradeLabel } from "@/lib/grade-levels";
import { translate } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const GRADED_ROLES = ["school_student", "music_student", "music_high_school"];

export default function SettingsPage() {
  const { session, language, changeLanguage, refreshSession } = useAppSession();
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState(session?.displayName ?? "");
  const [grade, setGrade] = useState(session?.grade ? String(session.grade) : "");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [saved, setSaved] = useState(false);
  const tr = (text: string) => translate(language, text);

  const userType = session?.userType ?? "independent";
  const needsGrade = GRADED_ROLES.includes(userType);
  const gradeValues = userType === "music_high_school"
    ? ["9", "10", "11", "12"]
    : Array.from({ length: 12 }, (_, index) => String(index + 1));
  const gradeItems = Object.fromEntries(gradeValues.map((value) => [value, gradeLabel(value, tr("klase"), language === "lv" || userType === "music_high_school", tr("kurss"))]));
  const roleLabel = roleOptions.find((option) => option.value === userType)?.label ?? "";
  const isGuest = Boolean(session?.isGuest);
  const unchanged = displayName.trim() === (session?.displayName ?? "") && (!needsGrade || grade === (session?.grade ? String(session.grade) : ""));

  async function selectLanguage(value: string | null) {
    if (value !== "lv" && value !== "en" && value !== "ru") return;
    setError("");
    try {
      await changeLanguage(value);
    } catch (cause) {
      console.error("Unable to save language preference:", cause);
      setError(tr("Neizdevās saglabāt valodas izvēli."));
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!session || isGuest || saving) return;
    setProfileError("");
    setSaved(false);

    const name = displayName.trim();
    if (!name) {
      setProfileError(tr("Ievadi vārdu vai segvārdu."));
      return;
    }
    if (needsGrade && !grade) {
      setProfileError(tr("Izvēlies klasi."));
      return;
    }

    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ display_name: name, grade_level: needsGrade ? Number(grade) : null })
        .eq("id", session.id)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Profile row was not updated.");
      await refreshSession();
      setDisplayName(name);
      setSaved(true);
    } catch (cause) {
      console.error("Unable to save profile:", cause);
      setProfileError(tr("Neizdevās saglabāt profila izmaiņas."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">{tr("Iestatījumi")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Mācību profils")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void saveProfile(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">{tr("Vārds vai segvārds")}</Label>
              <Input
                id="settings-name"
                autoComplete="name"
                maxLength={80}
                disabled={isGuest}
                placeholder={tr("Piemēram, Anna")}
                value={displayName}
                onChange={(event) => { setDisplayName(event.target.value); setSaved(false); }}
              />
            </div>
            {session?.email && (
              <div className="space-y-2">
                <Label htmlFor="settings-email">{tr("E-pasts")}</Label>
                <Input id="settings-email" type="email" value={session.email} disabled readOnly />
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{tr("Konta loma")}</p>
              <p className="text-sm text-muted-foreground">{tr(roleLabel)}</p>
            </div>
            {needsGrade && (
              <div className="space-y-2">
                <Label htmlFor="settings-grade">{tr("Kurā klasē tu mācies?")}</Label>
                <Select disabled={isGuest} items={gradeItems} value={grade} onValueChange={(value) => { setGrade(typeof value === "string" ? value : ""); setSaved(false); }}>
                  <SelectTrigger id="settings-grade" className="w-full sm:w-64">
                    <SelectValue placeholder={tr("Izvēlies klasi")} />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeValues.map((value) => (
                      <SelectItem key={value} value={value}>{gradeItems[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isGuest && <p className="text-sm text-muted-foreground">{tr("Viesu režīms izmanto demo profilu; sarunas un XP netiek saglabātas.")}</p>}
            {profileError && <p className="text-sm text-destructive" role="alert">{profileError}</p>}
            {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{tr("Izmaiņas saglabātas.")}</p>}
            <Button type="submit" disabled={isGuest || saving || unchanged}>
              {saving ? tr("Saglabā…") : tr("Saglabāt izmaiņas")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Privātums un lomu konfigurācija")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">{tr("Līderu saraksta redzamība")}</p>
            <p className="text-sm text-muted-foreground">
              {tr(needsGrade ? "Līderu sarakstā redzams tavs vārds un XP." : "Līderu sarakstā tiek rādīti tikai skolēni un audzēkņi.")}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">{tr("Galvenā valoda")}</label>
            <Select items={{ lv: tr("Latviešu"), en: tr("English"), ru: tr("Русский") }} value={language} onValueChange={(value) => void selectLanguage(value)}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lv">{tr("Latviešu")}</SelectItem>
                <SelectItem value="en">{tr("English")}</SelectItem>
                <SelectItem value="ru">{tr("Русский")}</SelectItem>
              </SelectContent>
            </Select>
            {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
