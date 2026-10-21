"use client";

import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, LoaderCircle, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSession } from "@/components/providers/app-provider";
import { fetchJson } from "@/lib/fetch-json";
import { guestQuickQuiz } from "@/lib/music-learning-data";
import type { PublicPracticeQuestion } from "@/lib/practice-data";
import { translate } from "@/lib/i18n";

type QuizQuestion = Omit<PublicPracticeQuestion, "correctAnswer" | "explanation">;
type AnswerResult = {
  correct: boolean;
  explanation: string;
  selected_option: number;
  correct_option: number;
  xp_awarded: number;
};
type QuizSummary = { score: number; question_count: number };

const optionStyles = [
  "bg-rose-600 text-white hover:bg-rose-700",
  "bg-blue-600 text-white hover:bg-blue-700",
  "bg-amber-400 text-amber-950 hover:bg-amber-500",
  "bg-emerald-600 text-white hover:bg-emerald-700",
];

export function QuickQuiz() {
  const { refreshSession, session, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerResult>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const question = questions[currentIndex];
  const answer = question ? answers[question.id] : undefined;

  async function startQuiz() {
    setBusy(true);
    setError("");
    setSummary(null);
    setAnswers({});
    setCurrentIndex(0);
    try {
      if (session?.isGuest) {
        setAttemptId("guest-preview");
        setQuestions(guestQuickQuiz.map((item) => ({ id: item.id, question: item.question, options: item.options })));
      } else {
        const result = await fetchJson<{ attemptId: string; questions: QuizQuestion[] }>("/api/quick-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
        setAttemptId(result.attemptId);
        setQuestions(result.questions);
      }
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās sākt viktorīnu."));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(selectedOption: number) {
    if (!question || answer || busy) return;
    setBusy(true);
    setError("");
    try {
      let result: AnswerResult;
      if (session?.isGuest) {
        const demoQuestion = guestQuickQuiz[0];
        result = {
          correct: selectedOption === demoQuestion.correctAnswer,
          explanation: demoQuestion.explanation,
          selected_option: selectedOption,
          correct_option: demoQuestion.correctAnswer,
          xp_awarded: 0,
        };
      } else {
        result = await fetchJson<AnswerResult>("/api/quick-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "answer", attemptId, questionId: question.id, selectedOption }),
        });
      }
      setAnswers((current) => ({ ...current, [question.id]: result }));
      void refreshSession().catch((cause: unknown) => console.error("Unable to refresh the quiz profile:", cause));
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās pārbaudīt atbildi."));
    } finally {
      setBusy(false);
    }
  }

  async function finishQuiz() {
    if (!attemptId || busy) return;
    setBusy(true);
    setError("");
    try {
      if (session?.isGuest) {
        setSummary({
          score: Object.values(answers).filter((item) => item.correct).length,
          question_count: questions.length,
        });
      } else {
        const result = await fetchJson<QuizSummary>("/api/quick-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", attemptId }),
        });
        setSummary(result);
        void refreshSession().catch((cause: unknown) => console.error("Unable to refresh the completed quiz profile:", cause));
      }
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās saglabāt viktorīnas rezultātu."));
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    if (currentIndex + 1 < questions.length) setCurrentIndex((index) => index + 1);
    else void finishQuiz();
  }

  function resetQuiz() {
    setAttemptId("");
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setSummary(null);
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Ātra mūzikas teorijas pārbaude")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Zibens-viktorīna")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {tr(session?.isGuest ? "Atbildi uz demo jautājumu, saņem tūlītēju skaidrojumu." : "Atbildi uz pieciem jautājumiem. Par katru pareizu atbildi saņemsi 20 XP un tūlītēju skaidrojumu.")}
        </p>
      </header>

      {summary ? (
        <Card className="border-border py-8 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">{tr("Viktorīna pabeigta!")}</h2>
            <p className="text-sm text-muted-foreground">
              {tr("Pareizi:")} {summary.score} {tr("no")} {summary.question_count}
            </p>
            {session?.isGuest ? (
              <p className="text-sm text-muted-foreground">{tr("Viesu priekšskatījumā XP un progress netiek saglabāti.")}</p>
            ) : (
              <div className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold">
                <Sparkles className="h-4 w-4" /> {tr("XP par pareizajām atbildēm ir saglabāti profilā.")}
              </div>
            )}
            <Button onClick={resetQuiz} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" /> {tr("Mēģināt vēlreiz")}
            </Button>
          </CardContent>
        </Card>
      ) : question ? (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardDescription className="flex items-center justify-between gap-2">
              <span>{tr("Solfedžo · Zibens-viktorīna")}</span>
              <span>{tr("Jautājums")} {currentIndex + 1} / {questions.length}</span>
            </CardDescription>
            <CardTitle className="text-xl">{tr(question.question)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {question.options.map((option, index) => {
                const selected = answer?.selected_option === index;
                const correctChoice = Boolean(answer && answer.correct_option === index);
                const incorrectChoice = answer && selected && !answer.correct;
                return (
                  <button
                    key={`${question.id}-${index}`}
                    type="button"
                    onClick={() => void submitAnswer(index)}
                    disabled={Boolean(answer) || busy}
                    aria-pressed={selected}
                    className={`flex min-h-16 items-center justify-between gap-3 rounded-xl p-4 text-left font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-90 ${optionStyles[index]} ${correctChoice ? "ring-4 ring-emerald-300" : ""} ${incorrectChoice ? "ring-4 ring-rose-300" : ""}`}
                  >
                    <span className="flex items-center gap-3"><span className="text-xs font-bold opacity-75">{String.fromCharCode(65 + index)}</span>{tr(option)}</span>
                    {correctChoice ? <Check className="h-5 w-5" /> : incorrectChoice ? <X className="h-5 w-5" /> : null}
                  </button>
                );
              })}
            </div>

            {answer && (
              <div className={`rounded-xl border p-4 ${answer.correct ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10"}`}>
                <p className="flex items-center gap-2 font-semibold">
                  {answer.correct ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {tr(answer.correct ? "Pareizi!" : "Nepareizi!")}
                  {answer.xp_awarded > 0 && <span className="ml-auto text-sm">+{answer.xp_awarded} XP</span>}
                </p>
                <p className="mt-1 text-sm">{tr(answer.explanation)}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {answer && (
              <Button onClick={nextQuestion} disabled={busy} className="w-full gap-2">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {tr(currentIndex + 1 < questions.length ? "Nākamais jautājums" : "Pabeigt viktorīnu")}
                {!busy && <ArrowRight className="h-4 w-4" />}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>{tr("Vai esi gatavs?")}</CardTitle>
            <CardDescription>{tr("Izvēlies atbildi, uzreiz uzzini rezultātu un nostiprini mūzikas teoriju.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {session?.isGuest && <p className="text-sm text-muted-foreground">{tr("Viesu priekšskatījumā pieejams viens demo jautājums.")}</p>}
            <Button onClick={() => void startQuiz()} disabled={busy} className="w-full gap-2">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {tr("Sākt viktorīnu")}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
