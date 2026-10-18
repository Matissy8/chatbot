"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, LoaderCircle, Send, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { LimitReachedModal } from "@/components/chat/LimitReachedModal";
import type { ChatMessage as ChatMessageData } from "@/lib/demo-data";
import { streamChatReply } from "@/lib/chat-client";
import { isAbort, isLimitReached } from "@/lib/fetch-json";

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>([
    { role: "assistant", content: "Sveiki! Kā varu palīdzēt tieši tagad?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const chatIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading, isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await streamChatReply({
        messages: nextMessages,
        chatId: chatIdRef.current,
        signal: controller.signal,
        onText: (value) => setMessages([...nextMessages, { role: "assistant", content: value }]),
      });
      chatIdRef.current = result.chatId;
      window.dispatchEvent(new Event("chat-history-updated"));
    } catch (error) {
      if (isAbort(error)) return;
      if (isLimitReached(error)) {
        setMessages(messages);
        setInput(text);
        setLimit(error.limit ?? 0);
        return;
      }
      setMessages([
        ...nextMessages,
        { role: "assistant", content: error instanceof Error && error.message ? error.message : "Neizdevās sazināties ar asistentu." },
      ]);
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      <LimitReachedModal open={limit !== null} onOpenChange={(open) => !open && setLimit(null)} limit={limit || undefined} />
      {!isOpen ? (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Atvērt ātro asistentu"
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 hover:bg-primary/85"
        >
          <Bot className="h-6 w-6 stroke-[1.75]" />
        </Button>
      ) : (
        <section
          aria-label="Ātrais mācību asistents"
          className={cn(
            "flex max-h-[min(480px,calc(100vh-2rem))] w-[min(384px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",
            isCompact ? "h-[352px]" : "h-[480px]"
          )}
        >
          <header className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold leading-none">Ātrais palīgs</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Mācību atbalsts vienmēr pa rokai</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Vidžeta iestatījumi" onClick={() => setShowSettings((value) => !value)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Aizvērt ātro asistentu" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {showSettings ? (
            <div className="flex flex-1 flex-col gap-4 p-4 text-sm">
              <h2 className="font-semibold">Vidžeta iestatījumi</h2>
              <label className="flex items-center justify-between gap-4 text-muted-foreground">
                <span>Vienkāršots, kompakts izskats</span>
                <input type="checkbox" checked={isCompact} onChange={(event) => setIsCompact(event.target.checked)} className="size-4 accent-foreground" />
              </label>
              <Button type="button" onClick={() => setShowSettings(false)} className="mt-auto w-full">Gatavs</Button>
            </div>
          ) : (
            <>
              <div ref={messagesRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
                {messages.map((message, index) => (
                  <ChatMessage key={`${message.role}-${index}`} message={message} />
                ))}
                {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Domāju…</div>}
              </div>
              <form onSubmit={sendMessage} className="flex shrink-0 gap-2 border-t border-border p-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Raksti ziņu…"
                  aria-label="Ziņa ātrajam asistentam"
                  className="h-10 min-w-0 flex-1 bg-background"
                />
                <Button type="submit" size="icon" aria-label="Nosūtīt ziņu" disabled={loading || !input.trim()} className="h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
