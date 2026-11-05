"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PitchDetector } from "pitchy";
import Link from "next/link";
import { LoaderCircle, Mic, MicOff, Music2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { translate } from "@/lib/i18n";

type Exercise = {
  key: string;
  title: string;
  notes: { midi: number; label: string }[];
};

type Attempt = {
  targetNote: string;
  detectedNote: string;
  cents: number;
};

type PitchReading = {
  frequency: number;
  note: string;
};

const exercises: Exercise[] = [
  {
    key: "do-major",
    title: "Do mažora gamma",
    notes: [
      { midi: 60, label: "C4" },
      { midi: 62, label: "D4" },
      { midi: 64, label: "E4" },
      { midi: 65, label: "F4" },
      { midi: 67, label: "G4" },
      { midi: 69, label: "A4" },
      { midi: 71, label: "H4" },
      { midi: 72, label: "C5" },
    ],
  },
  {
    key: "sol-major",
    title: "Sol mažora gamma",
    notes: [
      { midi: 67, label: "G4" },
      { midi: 69, label: "A4" },
      { midi: 71, label: "H4" },
      { midi: 72, label: "C5" },
      { midi: 74, label: "D5" },
      { midi: 76, label: "E5" },
      { midi: 78, label: "Fis5" },
      { midi: 79, label: "G5" },
    ],
  },
];

const noteNames = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "B", "H"];
const solfegeNames = ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];
const TUNING_TOLERANCE_CENTS = 30;

function frequencyToReading(frequency: number): PitchReading {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const nearestMidi = Math.round(midi);
  const pitchClass = ((nearestMidi % 12) + 12) % 12;
  const octave = Math.floor(nearestMidi / 12) - 1;
  return {
    frequency,
    note: `${noteNames[pitchClass]}${octave}`,
  };
}

function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function PitchPractice() {
  const { language, session } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const isGuest = Boolean(session?.isGuest);
  const [exerciseKey, setExerciseKey] = useState(exercises[0].key);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [reading, setReading] = useState<PitchReading | null>(null);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const frameRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);

  const exercise = exercises.find(({ key }) => key === exerciseKey) ?? exercises[0];
  const target = exercise.notes[attempts.length];
  const completed = attempts.length === exercise.notes.length;
  const liveCents = reading && target
    ? Math.round((69 + 12 * Math.log2(reading.frequency / 440) - target.midi) * 100)
    : null;

  function stopListening() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    detectorRef.current = null;
    bufferRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    setListening(false);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const context = contextRef.current;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  async function startListening() {
    if (listening || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(tr("Mikrofonam vajadzīgs drošs HTTPS savienojums un atbalstīts pārlūks."));
      startingRef.current = false;
      setStarting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const context = contextRef.current && contextRef.current.state !== "closed"
        ? contextRef.current
        : new AudioContext();
      contextRef.current = context;
      await context.resume();
      if (!mountedRef.current) return;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      context.createMediaStreamSource(stream).connect(analyser);
      contextRef.current = context;
      analyserRef.current = analyser;
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      bufferRef.current = new Float32Array(new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT));
      setListening(true);

      const detectPitch = () => {
        const currentAnalyser = analyserRef.current;
        const detector = detectorRef.current;
        const buffer = bufferRef.current;
        const activeContext = contextRef.current;
        if (!currentAnalyser || !detector || !buffer || !activeContext) return;
        currentAnalyser.getFloatTimeDomainData(buffer);
        const [frequency, clarity] = detector.findPitch(buffer, activeContext.sampleRate);
        setReading(clarity >= 0.88 && frequency >= 65 && frequency <= 1200 ? frequencyToReading(frequency) : null);
        frameRef.current = requestAnimationFrame(detectPitch);
      };
      frameRef.current = requestAnimationFrame(detectPitch);
    } catch (cause) {
      if (mountedRef.current) {
        stopListening();
        console.error("Unable to start pitch practice microphone:", cause);
        setError(tr("Neizdevās izmantot mikrofonu. Pārbaudi pārlūka atļaujas."));
      }
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setStarting(false);
    }
  }

  function playTarget() {
    if (!target) return;
    try {
      const context = contextRef.current ?? new AudioContext();
      contextRef.current = context;
      void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = midiToFrequency(target.midi);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.82);
    } catch (cause) {
      console.error("Unable to play the target pitch:", cause);
      setError(tr("Neizdevās atskaņot mērķa noti."));
    }
  }

  function submitNote() {
    if (!target || !reading) {
      setError(tr("Pirms atbildes iesniegšanas nodziedi vai nospēlē noti mikrofonā."));
      return;
    }
    const detectedMidi = 69 + 12 * Math.log2(reading.frequency / 440);
    const cents = Math.round((detectedMidi - target.midi) * 100);
    setAttempts((current) => [...current, {
      targetNote: target.label,
      detectedNote: reading.note,
      cents,
    }]);
    setReading(null);
    setError("");
    setFeedback("");
    if (attempts.length + 1 === exercise.notes.length) stopListening();
  }

  function resetPractice(nextExerciseKey = exerciseKey) {
    setExerciseKey(nextExerciseKey);
    setAttempts([]);
    setReading(null);
    setFeedback("");
    setError("");
  }

  async function requestFeedback() {
    if (!completed || isGuest || loadingFeedback) return;
    setLoadingFeedback(true);
    setError("");
    try {
      const result = await fetchJson<{ feedback: string }>("/api/pitch-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise: exercise.key, attempts, language }),
      });
      setFeedback(result.feedback);
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās sagatavot AI atsauksmi. Mēģini vēlreiz."));
    } finally {
      setLoadingFeedback(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Mūzikas literatūra un solfedžo")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Intonācijas treniņš")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tr("Nodziedi vai nospēlē mērķa noti. Skaņotājs to analizē tavā ierīcē, bet Gemini pēc vingrinājuma sniedz pedagoģisku atsauksmi.")}</p>
      </header>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Music2 className="h-4 w-4" />{tr("Vienbalsīgs nošu vingrinājums")}</CardTitle>
          <CardDescription>{tr("Mikrofona audio netiek augšupielādēts. AI atsauksmei tiek nosūtīti tikai vingrinājuma rezultāti.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="block space-y-2 text-sm font-medium" htmlFor="pitch-exercise">
            {tr("Izvēlies gammu")}
            <select
              id="pitch-exercise"
              value={exerciseKey}
              onChange={(event) => resetPractice(event.currentTarget.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base font-normal text-foreground"
              disabled={listening || starting || loadingFeedback}
            >
              {exercises.map((option) => <option key={option.key} value={option.key}>{tr(option.title)}</option>)}
            </select>
          </label>

          <Progress value={(attempts.length / exercise.notes.length) * 100} aria-label={tr("Vingrinājuma progress")} className="gap-2">
            <span className="text-sm font-medium">{tr("Notis")}: {Math.min(attempts.length + 1, exercise.notes.length)} / {exercise.notes.length}</span>
          </Progress>

          {!completed ? (
            <div className="rounded-2xl border border-border bg-muted/20 p-5 text-center sm:p-8">
              <p className="text-sm text-muted-foreground">{tr("Mērķa nots")}</p>
              <p className="my-2 text-5xl font-bold tracking-tight text-primary sm:text-6xl">{target?.label}</p>
              <p className="text-sm text-muted-foreground">{tr(solfegeNames[((target?.midi ?? 60) % 12)] ?? "Do")} · {tr("Soli pa solim izdziedi gammu augšup.")}</p>
              <Button type="button" variant="outline" onClick={playTarget} className="mt-4 min-h-11 gap-2">
                <Play className="h-4 w-4" />{tr("Atskaņot mērķa noti")}
              </Button>

              <div className="mt-6 rounded-xl border border-border bg-background p-4" aria-live="polite">
                {reading ? (
                  <>
                    <p className="text-4xl font-semibold tabular-nums">{reading.note}</p>
                    <p className={`mt-1 text-sm font-medium ${liveCents !== null && Math.abs(liveCents) <= TUNING_TOLERANCE_CENTS ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {reading.frequency.toFixed(1)} Hz · {liveCents !== null && liveCents > 0 ? "+" : ""}{liveCents} {tr("centi")} {tr("no mērķa")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{tr(listening ? "Klausos… nodziedi vai nospēlē vienu noti." : "Ieslēdz mikrofonu, lai sāktu.")}</p>
                )}
              </div>

              <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                <Button type="button" variant={listening ? "destructive" : "secondary"} onClick={listening ? stopListening : () => void startListening()} disabled={starting} className="min-h-12 gap-2">
                  {starting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {tr(starting ? "Pieslēdzos mikrofonam…" : listening ? "Apturēt mikrofonu" : "Ieslēgt mikrofonu")}
                </Button>
                <Button type="button" onClick={submitNote} disabled={!reading || !listening} className="min-h-12 gap-2">
                  {tr("Iesniegt noti")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4 sm:p-6">
              <div className="space-y-2">
                {attempts.map((attempt, index) => {
                  const inTune = Math.abs(attempt.cents) <= TUNING_TOLERANCE_CENTS;
                  return (
                    <div key={`${attempt.targetNote}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <span>{index + 1}. {attempt.targetNote} → {attempt.detectedNote}</span>
                      <span className={inTune ? "font-medium text-emerald-500" : "font-medium text-amber-500"}>
                        {attempt.cents > 0 ? "+" : ""}{attempt.cents} {tr("centi")} · {tr(inTune ? "Tīri" : "Jāpatrenē")}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isGuest && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm" role="status">
                  {tr("Vingrinājums pabeigts! Reģistrējies, lai saņemtu Gemini atsauksmi.")}{" "}
                  <Link href="/register" className="font-semibold underline underline-offset-4">{tr("Reģistrējies bez maksas")}</Link>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => void requestFeedback()} disabled={isGuest || loadingFeedback} className="min-h-12 gap-2">
                  {loadingFeedback ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {tr(loadingFeedback ? "Veidoju atsauksmi…" : "Saņemt Gemini atsauksmi")}
                </Button>
                <Button type="button" variant="outline" onClick={() => resetPractice()} className="min-h-12">
                  {tr("Atkārtot vingrinājumu")}
                </Button>
              </div>
              {feedback && (
                <article className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:font-semibold prose-strong:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback}</ReactMarkdown>
                </article>
              )}
            </div>
          )}

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{tr(error)}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
