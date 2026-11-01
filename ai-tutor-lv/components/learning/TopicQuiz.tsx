"use client";

import { useRef, useState, type ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { translate } from "@/lib/i18n";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

const readyTopicSets = [
  { label: "1.–4. klases intervāli un akordi", topics: "Tīrā prima, sekunde, terce, kvarta, kvinta, oktāva; mažora un minora trijskaņi; D7" },
  { label: "Latviešu simfoniskā klasika", topics: "Emīls Dārziņš — Melanholiskais valsis; Jāzeps Vītols — Latviešu tautas dziesmas; Alfrēds Kalniņš — Baņuta; Jānis Mediņš — Dzimtenes dziesma; Pēteris Vasks — Mūzika aizejošai vasarai" },
  { label: "Baroka un klasicisma tēmas", topics: "J. S. Bahs — Toccata un fūga d-moll; A. Vivaldi — Gadalaiki; G. F. Hendelis — Mesija; V. A. Mocarts — Mazā nakts mūzika; L. van Bēthovens — 5. simfonija" },
] as const;

type Turn = { role: "user" | "assistant"; content: string };

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function TopicQuiz() {
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const [firstImage, setFirstImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setError("");
    if (!file) return;
    if (!imageTypes.has(file.type)) return setError(tr("Izmanto PNG, JPEG vai WebP attēlu."));
    if (file.size > MAX_IMAGE_SIZE) return setError(tr("Attēlam jābūt mazākam par 4 MB."));
    try {
      setImage({ name: file.name, dataUrl: await readImage(file) });
    } catch {
      setError(tr("Neizdevās nolasīt attēlu."));
    }
  }

  async function send(text: string, attachedImage: string | null = null) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    const imageForRequest = turns.length === 0 ? attachedImage : firstImage;
    setTurns(next);
    setInput("");
    setImage(null);
    setLoading(true);
    setError("");
    if (turns.length === 0) setFirstImage(attachedImage);
    try {
      const result = await fetchJson<{ response?: string }>("/api/topic-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, image: imageForRequest }),
        timeoutMs: 65_000,
      });
      setTurns([...next, { role: "assistant", content: result.response ?? tr("Atbilde nav pieejama.") }]);
    } catch (cause) {
      setTurns(turns);
      setInput(content);
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās sagatavot viktorīnas atbildi."));
    } finally {
      setLoading(false);
    }
  }

  function startWithSet(set: (typeof readyTopicSets)[number]) {
    void send(`Sāksim viktorīnu ar tēmu komplektu „${set.label}”. Tēmas: ${set.topics}`);
  }

  function reset() {
    setTurns([]);
    setFirstImage(null);
    setImage(null);
    setInput("");
    setError("");
  }

  return (
    <div className="space-y-5">
      {turns.length === 0 ? (
        <>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">{tr("Gatavie tēmu komplekti")}</CardTitle>
              <CardDescription>{tr("Izvēlies komplektu un AI uzdos tēmas pa vienai.")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {readyTopicSets.map((set) => (
                <Button key={set.label} type="button" variant="outline" disabled={loading} onClick={() => startWithSet(set)}>
                  {tr(set.label)}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">{tr("Mans tēmu saraksts")}</CardTitle>
              <CardDescription>{tr("Iekopē tēmu sarakstu vai pievieno kladē uzņemtu attēlu — AI izvilks tēmas un pārjautās tās.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} placeholder={tr("1. Dārziņš — Melanholiskais valsis…")} aria-label={tr("Mans tēmu saraksts")} />
              {image && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-2 text-sm">
                  <span className="truncate">{image.name}</span>
                  <Button type="button" variant="secondary" size="icon" onClick={() => setImage(null)} aria-label={tr("Noņemt failu")}><X className="h-4 w-4" /></Button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseImage(event)} className="sr-only" aria-label={tr("Pievienot attēlu")} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}><ImagePlus className="h-4 w-4" /> {tr("Pievienot attēlu")}</Button>
                <Button type="button" className="gap-2" disabled={loading || (!input.trim() && !image)} onClick={() => void send(input.trim() || "Šis ir mans tēmu saraksts attēlā. Sāksim viktorīnu.", image?.dataUrl ?? null)}>
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {tr("Sākt viktorīnu")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-border">
          <CardContent className="space-y-4 pt-6">
            {turns.map((turn, index) => (
              <div key={index} className={turn.role === "user" ? "ml-auto max-w-[85%] rounded-xl bg-primary p-3 text-sm text-primary-foreground" : "max-w-[95%] rounded-xl border border-border bg-muted/30 p-3"}>
                {turn.role === "user" ? turn.content : (
                  <article className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
                  </article>
                )}
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="h-4 w-4 animate-spin" /> {tr("Gatavoju atbildi…")}</div>}
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
              <Textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} rows={2} aria-label={tr("Mana atbilde")} placeholder={tr("Raksti savu atbildi…")} />
              <Button type="submit" disabled={loading || !input.trim()} size="icon" aria-label={tr("Sūtīt")}><Send className="h-4 w-4" /></Button>
            </form>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>{tr("Sākt no jauna")}</Button>
          </CardContent>
        </Card>
      )}
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
