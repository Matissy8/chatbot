import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageData } from "@/lib/demo-data";

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

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
            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
          ) : (
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
              {message.content}
            </ReactMarkdown>
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
}