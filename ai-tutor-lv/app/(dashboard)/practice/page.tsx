"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, RotateCcw, Sparkles, Target, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { guestPracticeQuestions, practiceDifficulties, practiceSubjects, type PracticeDifficulty, type PracticeSubject, type PublicPracticeQuestion } from "@/lib/practice-data";
import { translate } from "@/lib/i18n";

type CheckedAnswer = { selectedOption: number; correct: boolean; explanation: string };
type QuizStartResult = { attemptId: string; questions: PublicPracticeQuestion[] };
type CompletionResult = { awarded: boolean; score: number; total: number; xpAwarded: number; totalXp: number };

export default function PracticePage() {
  const { refreshSession, session, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [subject, setSubject] = useState<PracticeSubject>("harmony");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("medium");
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<PublicPracticeQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CheckedAnswer>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [error, setError] = useState("");

  const question = questions?.[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  async function startQuiz() {
    setIsStarting(true);
    setError("");
    setResult(null);
    setCompleted(false);
    setQuestions([]);
    setAnswers({});
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
    if (currentQuestion + 1 < questions.length) setCurrentQuestion((value) => value + 1);
    else void completeQuiz();
  }

  function resetQuiz() {
    setAttemptId("");
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setCompleted(false);
    setCurrentQuestion(0);
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Interaktīvs treniņš")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Uzdevumu ģenerators")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tr("Izvēlies priekšmetu un grūtību. Atbildes pārbaudīsies uzreiz, bet par pabeigtu viktorīnu reģistrētam lietotājam pienākas +50 XP.")}</p>
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
                <Select value={subject} onValueChange={(value) => {
                  if (typeof value === "string" && practiceSubjects.some((item) => item.value === value)) setSubject(value as PracticeSubject);
                }}>
                  <SelectTrigger id="practice-subject" className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{practiceSubjects.map((item) => <SelectItem key={item.value} value={item.value}>{tr(item.label)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="practice-difficulty" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Grūtības līmenis")}</label>
                <Select value={difficulty} onValueChange={(value) => {
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
              {tr(isStarting ? "Sagatavo jautājumus…" : session?.isGuest ? "Sākt demo treniņu" : "Sākt treniņu · +50 XP")}
            </Button>
          </CardContent>
        </Card>
      )}

      {question && !completed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{tr("Jautājums")} {currentQuestion + 1} {tr("no")} {questions.length}</span>
            <span>{tr("Pareizi:")} {Object.values(answers).filter((answer) => answer.correct).length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
          <Card className="border-border">
            <CardHeader><CardTitle className="text-lg font-medium leading-relaxed">{question.question}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option, index) => {
                const checked = answers[question.id];
                const selected = checked?.selectedOption === index;
                const className = checked
                  ? selected && checked.correct ? "border-foreground bg-primary text-primary-foreground" : selected ? "border-destructive bg-destructive/10 text-destructive" : "border-border opacity-60"
                  : "border-border hover:bg-muted/60";
                return (
                  <button key={`${question.id}-${index}`} type="button" onClick={() => void submitAnswer(index)} disabled={Boolean(checked) || isChecking}
                    className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left text-sm font-medium transition-colors disabled:cursor-default ${className}`}>
                    <span>{option}</span>
                    {checked && selected && (checked.correct ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />)}
                    {isChecking && !checked && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  </button>
                );
              })}
              {answers[question.id] && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4" aria-live="polite">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {answers[question.id].correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {tr(answers[question.id].correct ? "Pareizi!" : "Šoreiz nepareizi")}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{answers[question.id].explanation}</p>
                  {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                  <Button onClick={nextQuestion} disabled={isCompleting} className="w-full gap-2">
                    {isCompleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {tr(currentQuestion + 1 < questions.length ? "Nākamais jautājums" : "Pabeigt treniņu")}
                    {!isCompleting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              )}
              {error && !answers[question.id] && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {completed && result && (
        <Card className="border-border py-8 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Trophy className="h-8 w-8" /></div>
            <h2 className="text-2xl font-bold">{tr("Treniņš pabeigts!")}</h2>
            <p className="text-sm text-muted-foreground">{tr("Rezultāts:")} {result.score} {tr("no")} {result.total} {tr("pareizi.")}</p>
            <div className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold"><Sparkles className="h-4 w-4" />{tr(session?.isGuest ? "Viesu demo — rezultāts un XP netiek saglabāti" : result.awarded ? "+50 XP pievienoti profilam" : "Šis mēģinājums jau bija ieskaitīts")}</div>
            <Button onClick={resetQuiz} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" /> {tr("Jauns treniņš")}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
