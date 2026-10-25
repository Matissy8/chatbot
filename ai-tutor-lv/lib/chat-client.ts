import { RequestError, assertSession, readErrorDetails, toRequestError } from "@/lib/fetch-json";
import type { ChatMessage } from "@/lib/chat-types";
import { DAILY_LIMIT_CODE } from "@/lib/plans";

const FIRST_BYTE_TIMEOUT_MS = 55_000;
const IDLE_TIMEOUT_MS = 30_000;

export async function streamChatReply({
  messages,
  chatId,
  subject,
  signal: external,
  onText,
}: {
  messages: ChatMessage[];
  chatId?: string;
  subject?: string;
  signal?: AbortSignal;
  onText: (text: string) => void;
}): Promise<{ chatId?: string; text: string }> {
  const controller = new AbortController();
  const abortExternal = () => controller.abort(external?.reason);
  if (external?.aborted) abortExternal();
  else external?.addEventListener("abort", abortExternal, { once: true });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
  };

  try {
    arm(FIRST_BYTE_TIMEOUT_MS);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, chatId, subject }),
      signal: controller.signal,
    });
    assertSession(response);
    if (!response.ok) {
      const details = await readErrorDetails(response);
      if (response.status === 429 && details.code === DAILY_LIMIT_CODE) {
        throw new RequestError(details.message, "limit", details.limit);
      }
      throw new RequestError(details.message, "server");
    }
    if (!response.body) throw new RequestError("Atbildes straume nav pieejama.", "server");

    const nextChatId = response.headers.get("x-chat-id") ?? chatId;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      arm(IDLE_TIMEOUT_MS);
      text += decoder.decode(value, { stream: true });
      onText(text);
    }
    text += decoder.decode();
    onText(text);
    if (!text.trim()) throw new RequestError("Atbilde bija tukša. Mēģini vēlreiz.", "server");
    return { chatId: nextChatId, text };
  } catch (error) {
    throw toRequestError(error, controller.signal);
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", abortExternal);
  }
}
