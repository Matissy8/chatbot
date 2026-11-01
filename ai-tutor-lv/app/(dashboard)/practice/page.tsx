"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Lightbulb, LoaderCircle, RotateCcw, Sparkles, Target, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { guestPracticeQuestions, practiceDifficulties, practiceSubjects, type PracticeDifficulty, type PracticeSubject, type PublicPracticeQuestion } from "@/lib/practice-data";
import { translate } from "@/lib/i18n";

type CheckedAnswer = { selectedOption: number; correct: boolean; explanation: string };
type QuizStartResult = { attemptId: string; questions: PublicPracticeQuestion[] };
type CompletionResult = { awarded: boolean; score: number; total: number; xpAwarded: number; totalXp: number };

const subjectHints: Record<PracticeSubject, string> = {
  harmony: "Atceries: dominantes septakords (D7) parasti risinās uz toniku, bet vadošais tonis virzās augšup par pustoni.",
  solfeggio: "Intervālu nosaki pēc pakāpju skaita un pustoņu skaita; piemēram, tīra kvinta ir 7 pustoņi.",
  math: "Ritma uzdevumos pārvērt visas nošu vērtības vienā vienībā, piemēram, astotdaļnotēs, un tad saskaiti.",
  physics: "Atceries: frekvence nosaka augstumu, amplitūda — skaļumu, virstoņi — tembru; oktāva dubulto frekvenci.",
};

function SessionDonut({ correct, wrong, remaining, label }: { correct: number; wrong: number; remaining: number; label: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(correct + wrong + remaining, 1);
  const segments = [
    { value: correct, className: "stroke-emerald-500" },
    { value: wrong, className: "stroke-rose-500" },
    { value: remaining, className: "stroke-slate-300 dark:stroke-slate-600" },
  ];
  let offset = 0;

  return (
    <div className="relative h-16 w-16 shrink-0" role="img" aria-label={label}>
      <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
        {segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const circle = (
            <circle key={index} cx="36" cy="36" r={radius} fill="none" strokeWidth="8" className={`${segment.className} transition-all duration-700 ease-out`}
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">{label}</span>
    </div>
  );
}

export default function PracticePage() {
  const { refreshSession, session, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [subject, setSubject] = useState<PracticeSubject>("harmony");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("medium");
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<PublicPracticeQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CheckedAnswer>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [error, setError] = useState("");

  const question = questions?.[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length;
  const wrongCount = answeredCount - correctCount;

  async function startQuiz() {
    setIsStarting(true);
    setError("");
    setResult(null);
    setCompleted(false);
    setQuestions([]);
    setAnswers({});
    setSelectedOption(null);
    setCurrentQuestion(0);
    try {
      if (session?.isGuest) {
        setAttemptId("guest-preview");
        setQuestions(guestPracticeQuestions[subject][difficulty]);
        setIsStarting(false);
        return;
      }

      const data = await fetchJson<QuizStartResult>("/api/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, difficulty }),
        timeoutMs: 20_000,
      });
      if (!data || typeof data.attemptId !== "string" || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Neizdevās saņemt jautājumus.");
      }
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās sākt treniņu."));
    } finally {
      setIsStarting(false);
    }
  }

  async function submitAnswer(optionIndex: number) {
    if (!question || answers[question.id] || isChecking) return;
    setIsChecking(true);
    setError("");
    try {
      if (session?.isGuest) {
        setAnswers((current) => ({
          ...current,
          [question.id]: {
            selectedOption: optionIndex,
            correct: optionIndex === question.correctAnswer,
            explanation: question.explanation ?? "Demo jautājums viesu priekšskatījumam.",
          },
        }));
        return;
      }

      const data = await fetchJson<{ correct?: boolean; explanation?: string; selected_option?: number }>("/api/practice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, questionId: question.id, selectedOption: optionIndex }),
        timeoutMs: 20_000,
      });
      setAnswers((current) => ({
        ...current,
        [question.id]: {
          selectedOption: Number(data.selected_option ?? optionIndex),
          correct: Boolean(data.correct),
          explanation: data.explanation ?? "Atbilde ir saglabāta.",
        },
      }));
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās pārbaudīt atbildi."));
    } finally {
      setIsChecking(false);
    }
  }

  async function completeQuiz() {
    if (!attemptId || answeredCount !== questions.length || isCompleting) return;
    setIsCompleting(true);
    setError("");
    try {
      if (session?.isGuest) {
        setResult({
          awarded: false,
          score: Object.values(answers).filter((answer) => answer.correct).length,
          total: questions.length,
          xpAwarded: 0,
          totalXp: 0,
        });
        setCompleted(true);
        return;
      }

      const data = await fetchJson<CompletionResult>("/api/practice/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
        timeoutMs: 20_000,
      });
      setResult(data);
      setCompleted(true);
      void refreshSession().catch(() => undefined);
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās saglabāt rezultātu."));
    } finally {
      setIsCompleting(false);
    }
  }

  function nextQuestion() {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion((value) => value + 1);
      setSelectedOption(null);
    } else void completeQuiz();
  }

  function resetQuiz() {
    setAttemptId("");
    setQuestions([]);
    setAnswers({});
    setSelectedOption(null);
    setResult(null);
    setCompleted(false);
    setCurrentQuestion(0);
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Interaktīvs treniņš")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Uzdevumu ģenerators")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tr("Izvēlies priekšmetu un grūtību. Atbildes pārbaudīsies uzreiz, bet par pabeigtu viktorīnu reģistrētam lietotājam pienākas līdz +50 XP atkarībā no pareizajām atbildēm.")}</p>
      </header>

      {questions.length === 0 && !completed && (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5" /> {tr("Treniņa parametri")}</CardTitle>
            <CardDescription>{tr("Jautājumi tiek izvēlēti no mācību uzdevumu bankas.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="practice-subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Mācību priekšmets")}</label>
                <Select items={Object.fromEntries(practiceSubjects.map((item) => [item.value, tr(item.label)]))} value={subject} onValueChange={(value) => {
                  if (typeof value === "string" && practiceSubjects.some((item) => item.value === value)) setSubject(value as PracticeSubject);
                }}>
                  <SelectTrigger id="practice-subject" className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{practiceSubjects.map((item) => <SelectItem key={item.value} value={item.value}>{tr(item.label)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="practice-difficulty" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Grūtības līmenis")}</label>
                <Select items={Object.fromEntries(practiceDifficulties.map((item) => [item.value, tr(item.label)]))} value={difficulty} onValueChange={(value) => {
                  if (typeof value === "string" && practiceDifficulties.some((item) => item.value === value)) setDifficulty(value as PracticeDifficulty);
                }}>
                  <SelectTrigger id="practice-difficulty" className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{practiceDifficulties.map((item) => <SelectItem key={item.value} value={item.value}>{tr(item.label)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            <Button onClick={() => void startQuiz()} disabled={isStarting} className="h-10 w-full gap-2">
              {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {tr(isStarting ? "Sagatavo jautājumus…" : session?.isGuest ? "Sākt demo treniņu" : "Sākt treniņu · līdz +50 XP")}
            </Button>
          </CardContent>
        </Card>
      )}

      {question && !completed && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{tr("Jautājums")} {currentQuestion + 1} {tr("no")} {questions.length}</span>
              <span className="tabular-nums">{currentQuestion + 1} / {questions.length}</span>
            </div>
            <Progress value={(answeredCount / questions.length) * 100} />
            <Card className="border-border">
              <CardHeader><CardTitle className="text-lg font-medium leading-relaxed">{tr(question.question)}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label={tr(question.question)}>
                  {question.options.map((option, index) => {
                    const checked = answers[question.id];
                    const isPending = !checked && selectedOption === index;
                    const isChecked = checked?.selectedOption === index;
                    const className = checked
                      ? isChecked && checked.correct ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : isChecked ? "border-destructive bg-destructive/10 text-destructive" : "border-border opacity-60"
                      : isPending ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60";
                    return (
                      <button key={`${question.id}-${index}`} type="button" role="radio" aria-checked={isPending || isChecked} onClick={() => setSelectedOption(index)} disabled={Boolean(checked) || isChecking}
                        className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${className}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isPending || isChecked ? "border-current" : "border-muted-foreground/40"}`} aria-hidden="true">
                          {(isPending || isChecked) && <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                        </span>
                        <span className="flex-1">{tr(option)}</span>
                        {isChecked && (checked.correct ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />)}
                      </button>
                    );
                  })}
                </div>
                {answers[question.id] ? (
                  <div className="space-y-3" aria-live="polite">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {answers[question.id].correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      {tr(answers[question.id].correct ? "Pareizi!" : "Šoreiz nepareizi")}
                    </p>
                    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                    <Button onClick={nextQuestion} disabled={isCompleting} className="w-full gap-2">
                      {isCompleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      {tr(currentQuestion + 1 < questions.length ? "Nākamais jautājums" : "Pabeigt treniņu")}
                      {!isCompleting && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <>
                    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                    <Button onClick={() => selectedOption !== null && void submitAnswer(selectedOption)} disabled={selectedOption === null || isChecking} className="w-full gap-2">
                      {isChecking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {tr("Pārbaudīt")}
                      {!isChecking && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 lg:col-span-1">
            <Card className="border-amber-200/60 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><Lightbulb className="h-4 w-4" aria-hidden="true" /> {tr(answers[question.id] ? "Skaidrojums" : "Padoms")}</p>
                <p className="text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">{tr(answers[question.id] ? answers[question.id].explanation : subjectHints[subject])}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold">{tr("Sesijas rezultāts")}</p>
                <div className="flex items-center gap-4">
                  <SessionDonut correct={correctCount} wrong={wrongCount} remaining={questions.length - answeredCount} label={`${correctCount} / ${questions.length}`} />
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />{tr("Pareizi:")} {correctCount}</li>
                    <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden="true" />{tr("Nepareizi:")} {wrongCount}</li>
                    <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />{tr("Atlikuši:")} {questions.length - answeredCount}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> {tr("AI palīdzība")}</p>
                <Link
                  href={{ pathname: "/chat", query: { prompt: `${tr("Paskaidro šo uzdevumu:")} ${tr(question.question)}` } }}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {tr("Skaidrot šo uzdevumu")} <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      {completed && result && (
        <Card className="border-border py-8 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Trophy className="h-8 w-8" /></div>
            <h2 className="text-2xl font-bold">{tr("Treniņš pabeigts!")}</h2>
            <p className="text-sm text-muted-foreground">{tr("Rezultāts:")} {result.score} {tr("no")} {result.total} {tr("pareizi.")}</p>
            <div className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold"><Sparkles className="h-4 w-4" />{session?.isGuest ? tr("Viesu demo — rezultāts un XP netiek saglabāti") : result.xpAwarded > 0 ? `+${result.xpAwarded} ${tr("XP pievienoti profilam")}` : tr(result.awarded ? "Šoreiz XP netika piešķirts — mēģini vēlreiz!" : "Šis mēģinājums jau bija ieskaitīts")}</div>
            <Button onClick={resetQuiz} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" /> {tr("Jauns treniņš")}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
