import { memo, useEffect, useState } from "react";
import { Bot, Volume2, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageData } from "@/lib/chat-types";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";
import { findNoteSequences, playNoteSequence } from "@/lib/music-audio";

interface ChatMessageProps {
  message: ChatMessageData;
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const { language } = useAppSession();
  const citations = isUser ? [] : [...message.content.matchAll(/\[Avots:\s*([^\]\r\n]+)\]/gi)].map(([citation]) => citation);
  const messageText = isUser ? message.content : message.content.replace(/\[Avots:\s*[^\]\r\n]+\]/gi, "").trim();
  const noteSequences = isUser ? [] : findNoteSequences(messageText);

  return (
    <div className={cn("mx-auto flex w-full max-w-[768px] gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </div>
      )}

      <div className={cn("flex max-w-[78%] flex-col overflow-hidden", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "min-w-0 px-4 py-3 text-[14px] leading-relaxed",
            isUser
              ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-2xl rounded-bl-sm border border-border bg-card text-card-foreground"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed">{messageText}</div>
          ) : (
            <>
              {messageText && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                    h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>,
                    blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary pl-3 text-muted-foreground">{children}</blockquote>,
                    code: ({ className, children, ...props }) => {
                      const isBlock = Boolean(className?.includes("language-")) || String(children).includes("\n");

                      return isBlock ? (
                        <code className={cn("font-mono", className)} {...props}>{children}</code>
                      ) : (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]" {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="my-3 overflow-x-auto rounded-lg bg-primary p-4 text-xs leading-relaxed text-primary-foreground">
                        {children}
                      </pre>
                    ),
                    table: ({ children }) => (
                      <div className="my-3 overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold">{children}</table>
                      </div>
                    ),
                    a: ({ children, href }) => (
                      <a className="text-foreground underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {messageText}
                </ReactMarkdown>
              )}
              {citations.length > 0 && (
                <div className="mt-2 space-y-1" aria-label={translate(language, "Avoti")}>
                  {citations.map((citation, index) => (
                    <p key={`${citation}-${index}`} className="border-l-4 border-indigo-500 bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                      {citation}
                    </p>
                  ))}
                </div>
              )}
              {noteSequences.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {noteSequences.map((sequence) => (
                    <AudioSequenceButton key={sequence} sequence={sequence} language={language} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
      )}
    </div>
  );
});

function AudioSequenceButton({ sequence, language }: { sequence: string; language: "lv" | "en" | "ru" }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!playing) return;
    const timeout = window.setTimeout(() => setPlaying(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [playing]);

  async function play() {
    setError("");
    try {
      await playNoteSequence(sequence);
      setPlaying(true);
    } catch (cause) {
      console.error("Unable to play the note sequence:", cause);
      setError(translate(language, "Audio atskaņošana šajā pārlūkā nav pieejama."));
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void play()}
        aria-label={`${translate(language, "Atskaņot notis")}: ${sequence}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-indigo-200"
      >
        <Volume2 className="h-3.5 w-3.5" />
        {playing ? translate(language, "Atskaņo…") : `${translate(language, "Atskaņot")}: ${sequence}`}
      </button>
      {error && <span className="text-xs text-destructive" role="alert">{error}</span>}
    </span>
  );
}