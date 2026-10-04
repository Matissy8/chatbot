"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, RotateCcw, Sparkles, Target, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSession } from "@/components/providers/app-provider";
import { practiceDifficulties, practiceSubjects, type PracticeDifficulty, type PracticeSubject, type PublicPracticeQuestion } from "@/lib/practice-data";

type CheckedAnswer = { selectedOption: number; correct: boolean; explanation: string };
type QuizStartResult = { attemptId: string; questions: PublicPracticeQuestion[] };
type CompletionResult = { awarded: boolean; score: number; total: number; xpAwarded: number; totalXp: number };

export default function PracticePage() {
  const { refreshSession } = useAppSession();
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

  const question = questions[currentQuestion];
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
      const response = await fetch("/api/practice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, difficulty }),
      });
      const data = await response.json() as QuizStartResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Neizdevās sākt treniņu.");
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Neizdevās sākt treniņu.");
    } finally {
      setIsStarting(false);
    }
  }

  async function submitAnswer(optionIndex: number) {
    if (!question || answers[question.id] || isChecking) return;
    setIsChecking(true);
    setError("");
    try {
      const response = await fetch("/api/practice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, questionId: question.id, selectedOption: optionIndex }),
      });
      const data = await response.json() as { correct?: boolean; explanation?: string; selected_option?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Neizdevās pārbaudīt atbildi.");
      setAnswers((current) => ({
        ...current,
        [question.id]: {
          selectedOption: Number(data.selected_option ?? optionIndex),
          correct: Boolean(data.correct),
          explanation: data.explanation ?? "Atbilde ir saglabāta.",
        },
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Neizdevās pārbaudīt atbildi.");
    } finally {
      setIsChecking(false);
    }
  }

  async function completeQuiz() {
    if (!attemptId || answeredCount !== questions.length || isCompleting) return;
    setIsCompleting(true);
    setError("");
    try {
      const response = await fetch("/api/practice/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await response.json() as CompletionResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Neizdevās saglabāt rezultātu.");
      setResult(data);
      setCompleted(true);
      await refreshSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Neizdevās saglabāt rezultātu.");
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
        <p className="text-sm font-medium text-muted-foreground">Interaktīvs treniņš</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Uzdevumu ģenerators</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Izvēlies priekšmetu un grūtību. Atbildes pārbaudīsies uzreiz, bet par pabeigtu viktorīnu saņemsi +50 XP.</p>
      </header>

      {questions.length === 0 && !completed && (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5" /> Treniņa parametri</CardTitle>
            <CardDescription>Jautājumi tiek izvēlēti no mācību uzdevumu bankas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="practice-subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mācību priekšmets</label>
                <Select value={subject} onValueChange={(value) => {
                  if (typeof value === "string" && practiceSubjects.some((item) => item.value === value)) setSubject(value as PracticeSubject);
                }}>
                  <SelectTrigger id="practice-subject" className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{practiceSubjects.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="practice-difficulty" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grūtības līmenis</label>
                <Select value={difficulty} onValueChange={(value) => {
                  if (typeof value === "string" && practiceDifficulties.some((item) => item.value === value)) setDifficulty(value as PracticeDifficulty);
                }}>
                  <SelectTrigger id="practice-difficulty" className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{practiceDifficulties.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            <Button onClick={() => void startQuiz()} disabled={isStarting} className="h-10 w-full gap-2">
              {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isStarting ? "Sagatavo jautājumus…" : "Sākt treniņu · +50 XP"}
            </Button>
          </CardContent>
        </Card>
      )}

      {question && !completed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Jautājums {currentQuestion + 1} no {questions.length}</span>
            <span>Pareizi: {Object.values(answers).filter((answer) => answer.correct).length}</span>
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
                    {answers[question.id].correct ? "Pareizi!" : "Šoreiz nepareizi"}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{answers[question.id].explanation}</p>
                  {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                  <Button onClick={nextQuestion} disabled={isCompleting} className="w-full gap-2">
                    {isCompleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {currentQuestion + 1 < questions.length ? "Nākamais jautājums" : "Pabeigt treniņu"}
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
            <h2 className="text-2xl font-bold">Treniņš pabeigts!</h2>
            <p className="text-sm text-muted-foreground">Rezultāts: {result.score} no {result.total} pareizi.</p>
            <div className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold"><Sparkles className="h-4 w-4" />{result.awarded ? "+50 XP pievienoti profilam" : "Šis mēģinājums jau bija ieskaitīts"}</div>
            <Button onClick={resetQuiz} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" /> Jauns treniņš</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
