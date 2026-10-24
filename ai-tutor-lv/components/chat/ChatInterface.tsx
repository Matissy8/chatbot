"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Camera,
  Layers,
  Map,
  Mic,
  Music2,
  Plus,
  Send,
  Sigma,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { FloatingAssistant } from "@/components/chat/FloatingAssistant";
import { LimitReachedModal } from "@/components/chat/LimitReachedModal";
import type { ChatMessage as ChatMessageData } from "@/lib/demo-data";
import { useAppSession } from "@/components/providers/app-provider";
import { streamChatReply } from "@/lib/chat-client";
import { isAbort, isLimitReached } from "@/lib/fetch-json";
import { translate } from "@/lib/i18n";

const suggestions = [
  { title: "Paskaidro D7 akorda atrisinājumu", subject: "Mūzika · Harmonija", icon: Music2 },
  { title: "Izskaidro taktsmēru un notu garumu muzikālās attiecības", subject: "Mūzikas teorija · Ritms", icon: Sigma },
  { title: "Dod man solfedžo ritma uzdevumu", subject: "Mūzika · Solfedžo", icon: BookOpen },
  { title: "Kā veidojas skaņas viļņi un instrumentu rezonanse?", subject: "Mūzikas teorija · Akustika", icon: Sparkles },
];

const subjects = ["Solfedžo", "Mūzikas teorija", "Mūzikas literatūra", "Harmonija", "Polifonija", "Mūzikas formu analīze", "Diriģēšana", "Instrumentācija un orķestrācija"];

export function ChatInterface({
  chatId: initialChatId,
  initialMessages = [],
  initialPrompt,
}: {
  chatId?: string;
  initialMessages?: ChatMessageData[];
  initialPrompt?: string;
}) {
  const router = useRouter();
  const { refreshSession, language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [loading, setLoading] = useState(false);
  const [imageAttached, setImageAttached] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    // The ref blocks double submits that happen before React re-renders the disabled state.
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;

    const nextMessages: ChatMessageData[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setImageAttached(false);
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

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-[768px] flex-col items-center py-7 text-center sm:py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">{tr("Ar ko sāksim šodien?")}</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {tr("Sāc sarunu brīvā formā — es palīdzēšu soli pa solim saprast sarežģītas tēmas.")}
            </p>

            <div className="mt-7 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
              {suggestions.map(({ title, subject, icon: Icon }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => void sendMessage(tr(title))}
                  disabled={loading}
                  className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground">
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
                    className="rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-primary" /> {tr(title)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{tr(description)}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => void sendMessage(`${tr("Pastāsti par")} ${tr(subject)} ${tr("pamatiem")}`)}
                  disabled={loading}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {tr(subject)}
                </button>
              ))}
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

      <footer className="shrink-0 border-t border-border bg-background px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-[768px]">
          {imageAttached && (
            <div className="mb-2 flex w-fit items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-secondary font-semibold">IMG</span>
              <span className="text-muted-foreground">{tr("Foto pievienots")}</span>
              <button type="button" onClick={() => setImageAttached(false)} aria-label={tr("Noņemt foto")} className="rounded p-1 hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={tr("Ieraksti jautājumu šeit…")}
              aria-label={tr("Jautājums AI asistentam")}
              rows={1}
              className="max-h-36 min-h-10 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={tr("Pievienot foto")}
                  title={tr("Pievienot foto")}
                  onClick={() => setImageAttached((current) => !current)}
                  className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <Camera className="h-5 w-5 stroke-[1.75]" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={tr(isRecording ? "Apturēt balss ievadi" : "Balss ievade")}
                  title={tr("Balss ievade")}
                  onClick={() => setIsRecording((current) => !current)}
                  className={isRecording ? "h-11 w-11 rounded-xl bg-muted text-foreground" : "h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground"}
                >
                  <Mic className="h-5 w-5 stroke-[1.75]" />
                </Button>
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
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {tr("Pārbaudi svarīgu informāciju un izmanto atbildes kā mācību atbalstu.")}
          </p>
        </div>
      </footer>

      <FloatingAssistant />
      <LimitReachedModal open={limit !== null} onOpenChange={(open) => !open && setLimit(null)} limit={limit || undefined} />
    </section>
  );
}
