"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Headphones, LoaderCircle, Play, Sparkles, Timer, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/fetch-json";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const acceptedExtensions = new Set(["mp3", "wav", "ogg", "flac", "aac", "aiff", "aif"]);
const timerOptions: { seconds: number | null; label: string }[] = [
  { seconds: null, label: "Bez taimera" },
  { seconds: 30, label: "30 sekundes" },
  { seconds: 60, label: "60 sekundes" },
  { seconds: 120, label: "2 minūtes" },
];

type TimerState = "idle" | "running" | "expired";

export default function AudioQuizPage() {
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [guess, setGuess] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (timerState !== "running") return;
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setTimerState("expired");
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerState]);

  function chooseFile(next?: File) {
    setError("");
    setAnswer("");
    if (!next) return;
    const extension = next.name.split(".").pop()?.toLowerCase() ?? "";
    if (!acceptedExtensions.has(extension)) {
      setError(tr("Izvēlies MP3, WAV, OGG, FLAC, AAC vai AIFF failu."));
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      setError(tr("Audio failam jābūt mazākam par 8 MB."));
      return;
    }
    setAudioUrl(URL.createObjectURL(next));
    setFile(next);
    setTimerState("idle");
  }

  function removeFile() {
    setAudioUrl("");
    setFile(null);
    setAnswer("");
    setTimerState("idle");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function chooseTimer(seconds: number | null) {
    setTimerSeconds(seconds);
    setTimerState("idle");
    setTimeLeft(seconds ?? 0);
  }

  function startRound() {
    setAnswer("");
    setError("");
    setGuess("");
    if (timerSeconds !== null) {
      setTimeLeft(timerSeconds);
      setTimerState("running");
    }
    void document.querySelector<HTMLAudioElement>("#audio-quiz-player")?.play().catch(() => undefined);
  }

  async function submit() {
    if (!file || loading) return;
    const timedOut = timerState === "expired";
    setTimerState("idle");
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const data = new FormData();
      data.set("audio", file);
      data.set("question", question);
      data.set("guess", guess);
      data.set("timedOut", timedOut ? "1" : "0");
      const result = await fetchJson<{ response?: string }>("/api/audio-quiz", { method: "POST", body: data, timeoutMs: 65_000 });
      setAnswer(result.response ?? tr("Analīze nav pieejama."));
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās analizēt audio. Mēģini vēlreiz."));
    } finally {
      setLoading(false);
    }
  }

  const guessLocked = timerState === "expired";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Mūzikas literatūra un solfedžo")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Klausīšanās viktorīna")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tr("Augšupielādē audio piemēru, noklausies to, uzraksti savu minējumu un saņem AI pasniedzēja analīzi. Taimeri vari izmantot pēc izvēles.")}</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Headphones className="h-4 w-4" /> {tr("Audio piemērs")}</CardTitle>
            <CardDescription>{tr("Atbalstītie formāti: MP3, WAV, OGG, FLAC, AAC un AIFF · līdz 8 MB.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {file ? (
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <Button type="button" variant="secondary" size="icon" onClick={removeFile} aria-label={tr("Noņemt failu")}><X className="h-4 w-4" /></Button>
                </div>
                <audio id="audio-quiz-player" controls src={audioUrl} className="w-full" />
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background"><Upload className="h-5 w-5" /></div>
                <p className="text-sm font-medium">{tr("Izvēlies audio failu")}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" /> {tr("Izvēlēties failu")}</Button>
              </div>
            )}
            <Input ref={fileInputRef} type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac,audio/aiff,.mp3,.wav,.ogg,.flac,.aac,.aiff,.aif" onChange={onFileChange} className="sr-only" aria-label={tr("Izvēlies audio failu")} />
            <p className="text-xs text-muted-foreground">{tr("🔒 Audio fails tiek nosūtīts konfigurētajam AI pakalpojumam tikai analīzei un lietotnē netiek saglabāts. Izmanto materiālus atbilstoši skolas un autortiesību nosacījumiem.")}</p>

            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-medium"><Timer className="h-4 w-4" /> {tr("Laika režīms")}</legend>
              <div className="flex flex-wrap gap-2">
                {timerOptions.map((option) => (
                  <Button key={option.label} type="button" size="sm" variant={timerSeconds === option.seconds ? "default" : "outline"} aria-pressed={timerSeconds === option.seconds} onClick={() => chooseTimer(option.seconds)}>
                    {tr(option.label)}
                  </Button>
                ))}
              </div>
              {timerSeconds !== null && timerState !== "idle" && (
                <p className={`text-lg font-bold ${timerState === "expired" || timeLeft <= 10 ? "text-destructive" : ""}`} role="timer" aria-live="off">
                  {timerState === "expired" ? tr("Laiks ir beidzies!") : `${tr("Atlikušais laiks")}: ${timeLeft} s`}
                </p>
              )}
            </fieldset>

            <Button type="button" variant="secondary" onClick={startRound} disabled={!file || loading} className="w-full gap-2">
              <Play className="h-4 w-4" /> {tr("Sākt klausīšanos")}
            </Button>

            <div className="space-y-2">
              <label htmlFor="audio-quiz-guess" className="text-sm font-medium">{tr("Mans minējums")} <span className="font-normal text-muted-foreground">({tr("neobligāti")})</span></label>
              <Textarea id="audio-quiz-guess" value={guess} onChange={(event) => setGuess(event.target.value)} maxLength={500} disabled={guessLocked} placeholder={tr("Piemēram, šķiet, ka tas ir klasicisma laikmeta simfonija…")} />
            </div>
            <div className="space-y-2">
              <label htmlFor="audio-quiz-question" className="text-sm font-medium">{tr("Jautājums AI")} <span className="font-normal text-muted-foreground">({tr("neobligāti")})</span></label>
              <Input id="audio-quiz-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} placeholder={tr("Piemēram, kāds ir šī skaņdarba taktsmērs un tonalitāte?")} />
            </div>

            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            <Button type="button" onClick={() => void submit()} disabled={!file || loading} className="w-full gap-2">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {tr(loading ? "Analizē skaņdarbu…" : "Iesniegt un pārbaudīt")}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[420px] border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> {tr("AI pasniedzēja vērtējums")}</CardTitle>
            <CardDescription>{tr("Skaņdarba analīze un atsauksme par tavu minējumu.")}</CardDescription>
          </CardHeader>
          <CardContent>
            {answer ? (
              <article className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:font-semibold prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
              </article>
            ) : loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center" role="status"><LoaderCircle className="h-6 w-6 animate-spin" /><p className="text-sm text-muted-foreground">{tr("Klausos audio un gatavoju analīzi…")}</p></div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted"><Headphones className="h-5 w-5" /></div><p className="mt-4 text-sm font-medium">{tr("Analīze parādīsies šeit")}</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">{tr("Pievieno audio failu un izvēlies “Iesniegt un pārbaudīt”.")}</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
