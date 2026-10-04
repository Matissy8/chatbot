"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Camera,
  Mic,
  Music2,
  Plus,
  Send,
  Sigma,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { FloatingAssistant } from "@/components/chat/FloatingAssistant";
import type { ChatMessage as ChatMessageData } from "@/lib/demo-data";
import { useAppSession } from "@/components/providers/app-provider";

const suggestions = [
  { title: "Paskaidro D7 akorda atrisinājumu", subject: "Mūzika · Harmonija", icon: Music2 },
  { title: "Kā darbojas matemātiskā indukcija?", subject: "Matemātika · 11. klase", icon: Sigma },
  { title: "Dod man solfedžo ritma uzdevumu", subject: "Mūzika · Solfedžo", icon: BookOpen },
  { title: "Izskaidro Ņūtona 2. likumu ar piemēru", subject: "Fizika · 8. klase", icon: Sparkles },
];

const subjects = ["Harmonija", "Solfedžo", "Matemātika", "Fizika", "Mūzikas literatūra", "Vēsture"];

export function ChatInterface({
  chatId: initialChatId,
  initialMessages = [],
}: {
  chatId?: string;
  initialMessages?: ChatMessageData[];
}) {
  const router = useRouter();
  const { refreshSession } = useAppSession();
  const [chatId, setChatId] = useState(initialChatId);
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageAttached, setImageAttached] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessageData[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setImageAttached(false);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, chatId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Neizdevās saņemt atbildi.");
      }

      const responseChatId = response.headers.get("x-chat-id") ?? chatId;
      setChatId(responseChatId ?? undefined);
      if (!response.body) throw new Error("Atbildes straume nav pieejama.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { role: "assistant", content: assistantText }]);
      }
      assistantText += decoder.decode();
      setMessages([...nextMessages, { role: "assistant", content: assistantText }]);
      await refreshSession();

      if (responseChatId && responseChatId !== chatId) {
        router.replace(`/chat/${responseChatId}`, { scroll: false });
      }
      window.dispatchEvent(new Event("chat-history-updated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Neizdevās sazināties ar AI asistentu.";
      setMessages([...nextMessages, { role: "assistant", content: `Atvaino — ${message}` }]);
    } finally {
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
          <h1 className="text-[18px] font-semibold tracking-tight">AI mācību asistents</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Uzdod jautājumu par skolu vai mūziku.</p>
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
          <Plus className="h-3.5 w-3.5" /> Jauna saruna
        </Button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-[768px] flex-col items-center py-7 text-center sm:py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Ar ko sāksim šodien?</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Sāc sarunu brīvā formā — es palīdzēšu soli pa solim saprast sarežģītas tēmas.
            </p>

            <div className="mt-7 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
              {suggestions.map(({ title, subject, icon: Icon }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => void sendMessage(title)}
                  disabled={loading}
                  className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground">
                    <Icon className="h-4 w-4 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-medium leading-snug">{title}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{subject}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => void sendMessage(`Pastāsti par ${subject} pamatiem`)}
                  disabled={loading}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {subject}
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
                Asistents veido atbildi…
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
              <span className="text-muted-foreground">Foto pievienots</span>
              <button type="button" onClick={() => setImageAttached(false)} aria-label="Noņemt foto" className="rounded p-1 hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ieraksti jautājumu šeit…"
              aria-label="Jautājums AI asistentam"
              rows={1}
              className="max-h-36 min-h-10 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Pievienot foto"
                  title="Pievienot foto"
                  onClick={() => setImageAttached((current) => !current)}
                  className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <Camera className="h-5 w-5 stroke-[1.75]" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={isRecording ? "Apturēt balss ievadi" : "Balss ievade"}
                  title="Balss ievade"
                  onClick={() => setIsRecording((current) => !current)}
                  className={isRecording ? "h-11 w-11 rounded-xl bg-muted text-foreground" : "h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground"}
                >
                  <Mic className="h-5 w-5 stroke-[1.75]" />
                </Button>
                {isRecording && <span className="ml-1 text-xs text-muted-foreground" role="status">Balss režīms</span>}
              </div>
              <Button
                type="submit"
                size="icon"
                aria-label="Nosūtīt ziņu"
                disabled={loading || !input.trim()}
                className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/85"
              >
                <Send className="h-4 w-4 stroke-[1.75]" />
              </Button>
            </div>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Pārbaudi svarīgu informāciju un izmanto atbildes kā mācību atbalstu.
          </p>
        </div>
      </footer>

      <FloatingAssistant />
    </section>
  );
}
