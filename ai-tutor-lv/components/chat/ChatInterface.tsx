"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type UIEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Camera,
  FileText,
  GraduationCap,
  Layers,
  Lightbulb,
  Map,
  Mic,
  Music2,
  Plus,
  Send,
  Sigma,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { LimitReachedModal } from "@/components/chat/LimitReachedModal";
import type { ChatMessage as ChatMessageData } from "@/lib/chat-types";
import { useAppSession } from "@/components/providers/app-provider";
import { streamChatReply } from "@/lib/chat-client";
import { isAbort, isLimitReached } from "@/lib/fetch-json";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SubjectSelector } from "@/components/chat/SubjectSelector";
import { MUSIC_SUBJECTS } from "@/lib/music-subjects";
import { subjectTone } from "@/lib/subject-styles";

// Accounts without a grade (teachers, independent learners, guests) can see every subject.
const OPEN_GRADE_LEVEL = 12;

const quickActions = [
  { label: "Izskaidro vienkārši", prompt: "Izskaidro vienkārši: ", icon: Lightbulb },
  { label: "Dod piemēru", prompt: "Dod piemēru: ", icon: FileText },
  { label: "Palīdzi ar mājasdarbu", prompt: "Palīdzi ar mājasdarbu: ", icon: GraduationCap },
  { label: "Pārbaudi atbildi", prompt: "Pārbaudi manu atbildi: ", icon: BarChart3 },
];
const chipSubjectIds = ["solfedzo", "muzikas_teorija", "harmonija", "muzikas_literatura"];

type SpeechRecognitionEventLike = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const speechLocales = { lv: "lv-LV", en: "en-US", ru: "ru-RU" } as const;
const subscribeNothing = () => () => undefined;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const speechWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

const suggestions = [
  { title: "Paskaidro D7 akorda atrisinājumu", subject: "Mūzika · Harmonija", subjectId: "harmonija", icon: Music2 },
  { title: "Izskaidro taktsmēru un notu garumu muzikālās attiecības", subject: "Mūzikas teorija · Ritms", subjectId: "muzikas_teorija", icon: Sigma },
  { title: "Dod man solfedžo ritma uzdevumu", subject: "Mūzika · Solfedžo", subjectId: "solfedzo", icon: BookOpen },
  { title: "Kā veidojas skaņas viļņi un instrumentu rezonanse?", subject: "Mūzikas teorija · Akustika", subjectId: "muzikas_teorija", icon: Sparkles },
];

export function ChatInterface({
  chatId: initialChatId,
  initialMessages = [],
  initialPrompt,
  initialSubject,
}: {
  chatId?: string;
  initialMessages?: ChatMessageData[];
  initialPrompt?: string;
  initialSubject?: string;
}) {
  const router = useRouter();
  const { refreshSession, language, session } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const voiceSupported = useSyncExternalStore(subscribeNothing, () => getSpeechRecognition() !== null, () => false);
  const [limit, setLimit] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject ?? "solfedzo");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isComposerHidden, setIsComposerHidden] = useState(false);
  const lastScrollTop = useRef(0);
  const ignoreScrollUntil = useRef(0);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Programmatic scrolling and layout changes from the collapse animation must not toggle the composer.
  function setComposerHidden(hidden: boolean) {
    ignoreScrollUntil.current = Date.now() + 350;
    setIsComposerHidden(hidden);
  }

  useEffect(() => {
    ignoreScrollUntil.current = Date.now() + 350;
  }, [messages.length, loading]);

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const currentScrollTop = e.currentTarget.scrollTop;
    if (Date.now() < ignoreScrollUntil.current) {
      lastScrollTop.current = currentScrollTop;
      return;
    }
    const diff = currentScrollTop - lastScrollTop.current;

    if (Math.abs(diff) < 8) return;

    if (diff > 0 && currentScrollTop > 40) {
      if (!isComposerHidden) setComposerHidden(true);
    } else if (diff < 0) {
      if (isComposerHidden) setComposerHidden(false);
    }

    lastScrollTop.current = currentScrollTop;
  }

  useEffect(() => () => {
    abortRef.current?.abort();
    recognitionRef.current?.stop();
  }, []);

  function toggleVoiceInput() {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    const recognition = new Recognition();
    const baseText = input.trim();
    recognition.lang = speechLocales[language];
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results).map((result) => result[0].transcript).join(" ").trim();
      setInput(baseText ? `${baseText} ${spoken}` : spoken);
    };
    recognition.onerror = () => setVoiceError(tr("Neizdevās izmantot mikrofonu. Pārbaudi pārlūka atļaujas."));
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsRecording(false);
    };

    setVoiceError("");
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      recognitionRef.current = null;
      setVoiceError(tr("Neizdevās izmantot mikrofonu. Pārbaudi pārlūka atļaujas."));
    }
  }

  // A suggestion for a subject the student's grade doesn't cover keeps the current selection.
  function subjectForGrade(subjectId: string) {
    const gradeLevel = session?.grade ?? OPEN_GRADE_LEVEL;
    return MUSIC_SUBJECTS.some((subject) => subject.id === subjectId && gradeLevel >= subject.minGrade) ? subjectId : selectedSubject;
  }

  async function sendMessage(text: string, subject = selectedSubject) {
    const trimmed = text.trim();
    // The ref blocks double submits that happen before React re-renders the disabled state.
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;
    recognitionRef.current?.stop();
    setSelectedSubject(subject);

    const nextMessages: ChatMessageData[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let frame: number | null = null;
    let latest = "";
    const flush = () => {
      frame = null;
      setMessages([...nextMessages, { role: "assistant", content: latest }]);
    };

    try {
      const result = await streamChatReply({
        messages: nextMessages,
        chatId,
        subject,
        signal: controller.signal,
        onText: (value) => {
          latest = value;
          if (frame === null) frame = requestAnimationFrame(flush);
        },
      });
      if (frame !== null) cancelAnimationFrame(frame);
      setMessages([...nextMessages, { role: "assistant", content: result.text }]);
      setChatId(result.chatId);

      void refreshSession().catch(() => undefined);
      if (result.chatId && result.chatId !== chatId) {
        router.replace(`/chat/${result.chatId}`, { scroll: false });
      }
      window.dispatchEvent(new Event("chat-history-updated"));
    } catch (error) {
      if (frame !== null) cancelAnimationFrame(frame);
      if (isAbort(error)) return;
      if (isLimitReached(error)) {
        // The server rejected this question before saving it, so keep the thread as it was and let the user retry later.
        setMessages(messages);
        setInput(trimmed);
        setLimit(error.limit ?? 0);
        return;
      }
      const message = tr(error instanceof Error && error.message ? error.message : "Neizdevās sazināties ar AI asistentu.");
      // Keep any partial text the user already saw and append the error below it.
      const partial = latest.trim();
      setMessages([
        ...nextMessages,
        { role: "assistant", content: partial ? `${partial}\n\n_Atvaino — ${message}_` : `Atvaino — ${message}` },
      ]);
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      setLoading(false);
    }
  }

  function startFromPrompt(prompt: string) {
    setInput(tr(prompt));
    inputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  return (
    <section className="relative flex h-full min-h-[480px] flex-col overflow-hidden bg-background">
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">{tr("Mācību dialogs")}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{tr("Uzdod jautājumu par mūzikas skolas priekšmetiem — solfedžo, teoriju, mūzikas literatūru un citiem.")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setMessages([]);
            setChatId(undefined);
            router.push("/chat");
          }}
          disabled={messages.length === 0 || loading}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> {tr("Jauna saruna")}
        </Button>
      </header>

      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-4xl flex-col items-center py-7 text-center sm:py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">{tr("Sveiks,")} {session?.displayName}!</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {tr("Turpini mācīties sev ērtā tempā. Izvēlies priekšmetu vai uzdod jautājumu palīgam.")}
            </p>

            <div className="mt-7 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
              {suggestions.map(({ title, subject, subjectId, icon: Icon }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => void sendMessage(tr(title), subjectForGrade(subjectId))}
                  disabled={loading}
                  className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-full", subjectTone(subjectId).badge)}>
                    <Icon className="h-4 w-4 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-medium leading-snug">{tr(title)}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{tr(subject)}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 w-full">
              <h3 className="mb-3 text-left text-sm font-semibold">{tr("Treniņi un atkārtošana")}</h3>
              <div className="grid gap-3 text-left sm:grid-cols-3">
                {[
                  { href: "/quiz", icon: Zap, title: "Sāc zibens-viktorīnu", description: "Pieci īsi jautājumi" },
                  { href: "/flashcards", icon: Layers, title: "Mūzikas kartītes", description: "Atkārto terminus un akordus" },
                  { href: "/learning-path", icon: Map, title: "Mācību ceļvedis", description: "Turpini pa līmeņiem" },
                ].map(({ href, icon: Icon, title, description }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-primary" /> {tr(title)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{tr(description)}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 w-full">
              <h3 className="mb-3 text-left text-sm font-semibold">{tr("Mācību priekšmeti")}</h3>
              <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
                {MUSIC_SUBJECTS.filter((subject) => (session?.grade ?? OPEN_GRADE_LEVEL) >= subject.minGrade).map((subject) => {
                  const tone = subjectTone(subject.id);
                  const SubjectIcon = tone.icon;
                  return (
                    <div key={subject.id} className={cn("flex flex-col rounded-2xl border p-4", tone.card)}>
                      <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-full", tone.badge)}>
                        <SubjectIcon className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-semibold">{tr(subject.name)}</p>
                      <p className="mt-1 flex-1 text-xs leading-relaxed opacity-80">{tr(subject.description)}</p>
                      <button
                        type="button"
                        onClick={() => void sendMessage(`${tr("Pastāsti par")} ${tr(subject.name)} ${tr("pamatiem")}`, subject.id)}
                        disabled={loading}
                        className="mt-3 self-start text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        {tr("Atvērt")} →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {messages.map((message, index) => (
              <ChatMessage key={`${message.role}-${index}`} message={message} />
            ))}
            {loading && (
              <div className="mx-auto flex w-full max-w-[768px] items-center gap-2 text-xs text-muted-foreground" role="status">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {tr("Asistents veido atbildi…")}
              </div>
            )}
          </div>
        )}
      </div>

      <footer
        onFocusCapture={() => {
          if (isComposerHidden) setComposerHidden(false);
        }}
        className={cn(
          "shrink-0 border-t border-border bg-background px-3 py-3 transition-all duration-300 ease-in-out sm:px-6 sm:py-4",
          isComposerHidden
            ? "pointer-events-none max-h-0 translate-y-full overflow-hidden border-transparent py-0 opacity-0 sm:py-0"
            : "max-h-[420px] translate-y-0 opacity-100",
        )}
      >
        <div className="mx-auto max-w-[768px]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={tr("Ieraksti jautājumu šeit…")}
              aria-label={tr("Jautājums AI asistentam")}
              rows={1}
              className="max-h-36 min-h-10 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between pt-1">
              <SubjectSelector selectedSubject={selectedSubject} onSelect={setSelectedSubject} gradeLevel={session?.grade ?? OPEN_GRADE_LEVEL} language={language} />
              <div className="flex items-center gap-1">
                <Link
                  href="/assistant-screen"
                  aria-label={tr("Pievienot foto")}
                  title={tr("Pievienot foto")}
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground")}
                >
                  <Camera className="h-5 w-5 stroke-[1.75]" />
                </Link>
                {voiceSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={tr(isRecording ? "Apturēt balss ievadi" : "Balss ievade")}
                    aria-pressed={isRecording}
                    title={tr("Balss ievade")}
                    onClick={toggleVoiceInput}
                    className={isRecording ? "h-11 w-11 rounded-xl bg-muted text-foreground" : "h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground"}
                  >
                    <Mic className="h-5 w-5 stroke-[1.75]" />
                  </Button>
                )}
                {isRecording && <span className="ml-1 text-xs text-muted-foreground" role="status">{tr("Balss režīms")}</span>}
              </div>
              <Button
                type="submit"
                size="icon"
                aria-label={tr("Nosūtīt ziņu")}
                disabled={loading || !input.trim()}
                className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/85"
              >
                <Send className="h-4 w-4 stroke-[1.75]" />
              </Button>
            </div>
          </form>
          {voiceError && <p className="mt-2 text-center text-xs text-destructive" role="alert">{voiceError}</p>}
          {messages.length === 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={tr("Mācību priekšmets")}>
                {MUSIC_SUBJECTS.filter((subject) => chipSubjectIds.includes(subject.id) && (session?.grade ?? OPEN_GRADE_LEVEL) >= subject.minGrade).map((subject) => {
                  const tone = subjectTone(subject.id);
                  const SubjectIcon = tone.icon;
                  const active = selectedSubject === subject.id;
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedSubject(subject.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? tone.chipActive : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <SubjectIcon className="h-3.5 w-3.5" aria-hidden="true" /> {tr(subject.name)}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {quickActions.map(({ label, prompt, icon: ActionIcon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => startFromPrompt(prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ActionIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {tr(label)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {tr("Pārbaudi svarīgu informāciju un izmanto atbildes kā mācību atbalstu.")}
          </p>
        </div>
      </footer>

      <LimitReachedModal open={limit !== null} onOpenChange={(open) => !open && setLimit(null)} limit={limit || undefined} />
    </section>
  );
}
