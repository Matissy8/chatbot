"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

export default function SettingsPage() {
  const { session, language, changeLanguage } = useAppSession();
  const [error, setError] = useState("");
  const tr = (text: string) => translate(language, text);

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">{tr("Iestatījumi")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{tr("Privātums un lomu konfigurācija")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">{tr("Display name")}</label>
            <p className="text-sm text-muted-foreground">{session?.displayName}</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">{tr("Līderu saraksta redzamība")}</label>
            <p className="text-sm text-muted-foreground">{tr("School only")}</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">{tr("Galvenā valoda")}</label>
            <Select value={language} onValueChange={(value) => void selectLanguage(value)}>
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
