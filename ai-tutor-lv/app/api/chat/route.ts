import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { streamText, type ModelMessage } from "ai";
import {
  aiRequestOptions,
  cacheGet,
  cacheSet,
  generateTutorReply,
  getConfiguredModel,
  hasConfiguredAIProvider,
  limitContext,
} from "@/lib/ai-provider";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";
import { createClient } from "@/lib/supabase/server";
import { awardXP } from "@/lib/xp";
import { apiErrorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 12_000;
const STREAM_TIMEOUT_MS = 50_000;
const FIRST_TURN_CACHE_TTL_MS = 30 * 60 * 1000;
const SUBJECTS = ["Harmonija", "Solfedžo", "Mūzikas literatūra", "Matemātika", "Fizika", "Vēsture"];

type IncomingMessage = { role: "user" | "assistant"; content: string };
type ServerClient = Awaited<ReturnType<typeof createClient>>;
type Profile = { role: string | null; grade_level: number | string | null; language: string | null } | null;

function getSubject(text: string, requestedSubject: unknown): string {
  if (typeof requestedSubject === "string" && requestedSubject.trim()) {
    return requestedSubject.trim().slice(0, 80);
  }
  const normalized = text.toLocaleLowerCase("lv");
  return SUBJECTS.find((subject) => normalized.includes(subject.toLocaleLowerCase("lv"))) ?? "General";
}

async function persistAssistantReply(supabase: ServerClient, chatId: string, userId: string, text: string, subject: string) {
  try {
    const { error } = await supabase.from("messages").insert({ chat_id: chatId, role: "assistant", content: text });
    if (error) {
      console.error("Failed to persist assistant message:", error);
      return;
    }
    await awardXP(userId, 15, "Uzdots jautājums AI asistentam", subject);
  } catch (error) {
    console.error("Failed to persist reply or award chat XP:", error);
  }
}

// Streams provider text; if the provider yields nothing, answers with the local fallback instead of an empty reply.
function createReplyStream({
  messages,
  system,
  language,
  useProvider,
  cacheKey,
  signal,
  onComplete,
}: {
  messages: IncomingMessage[];
  system: string;
  language: "lv" | "en";
  useProvider: boolean;
  cacheKey?: string;
  signal: AbortSignal;
  onComplete?: (text: string) => Promise<void>;
}) {
  const encoder = new TextEncoder();
  let clientGone = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        if (clientGone) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          clientGone = true;
        }
      };

      let full = "";
      const cached = cacheKey ? cacheGet(cacheKey) : undefined;

      if (cached) {
        full = cached;
        send(cached);
      } else if (useProvider) {
        try {
          const result = streamText({
            model: getConfiguredModel(),
            system,
            messages: limitContext(messages) as ModelMessage[],
            ...aiRequestOptions(STREAM_TIMEOUT_MS, 1200, signal),
            onError: ({ error }) => console.error("AI stream error:", error),
          });
          for await (const chunk of result.textStream) {
            full += chunk;
            send(chunk);
          }
        } catch (error) {
          console.error("AI provider stream failed:", error);
        }
        if (cacheKey && full.trim()) cacheSet(cacheKey, full, FIRST_TURN_CACHE_TTL_MS);
      }

      if (!full.trim()) {
        full = await generateTutorReply({ messages, language, allowProviders: false });
        send(full);
      }

      // Persist before closing so the client's follow-up XP refresh sees the new total.
      if (onComplete && !clientGone) await onComplete(full);
      try {
        controller.close();
      } catch {
        // Already cancelled by the client.
      }
    },
    cancel() {
      clientGone = true;
    },
  });
}

async function handlePost(request: Request) {
  let body: { messages?: unknown; chatId?: unknown; subject?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nederīgs pieprasījuma saturs." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return Response.json({ error: "Ziņu skaits nav derīgs." }, { status: 400 });
  }

  const messages: IncomingMessage[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== "object") {
      return Response.json({ error: "Ziņas formāts nav derīgs." }, { status: 400 });
    }
    const candidate = item as { role?: unknown; content?: unknown };
    if ((candidate.role !== "user" && candidate.role !== "assistant") || typeof candidate.content !== "string") {
      return Response.json({ error: "Ziņas formāts nav derīgs." }, { status: 400 });
    }
    if (candidate.content.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: "Ziņa ir pārāk gara." }, { status: 400 });
    }
    messages.push({ role: candidate.role, content: candidate.content });
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user" || !lastMessage.content.trim()) {
    return Response.json({ error: "Pēdējai ziņai jābūt lietotāja jautājumam." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const isGuest = isGuestModeEnabled() && cookieStore.get(GUEST_COOKIE_NAME)?.value === "1";
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(STREAM_TIMEOUT_MS)]);
  const baseHeaders = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
  };

  if (isGuest) {
    const stream = createReplyStream({ messages, system: "", language: "lv", useProvider: false, signal });
    return new Response(stream, { headers: { ...baseHeaders, "Cache-Control": "no-store", "X-Guest-Mode": "true" } });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });
  const userId = user.id;

  const subject = getSubject(lastMessage.content, body.subject);
  const requestedChatId = typeof body.chatId === "string" && body.chatId.length > 0 ? body.chatId : undefined;

  const profileQuery = supabase.from("profiles").select("role, grade_level, language").eq("id", userId).maybeSingle();

  let activeChatId: string;
  let profile: Profile;

  if (requestedChatId) {
    const [chatResult, messageResult, profileResult, updateResult] = await Promise.all([
      supabase.from("chats").select("id").eq("id", requestedChatId).maybeSingle(),
      supabase.from("messages").insert({ chat_id: requestedChatId, role: "user", content: lastMessage.content }),
      profileQuery,
      supabase.from("chats").update({ subject }).eq("id", requestedChatId),
    ]);
    if (chatResult.error) return Response.json({ error: "Neizdevās ielādēt sarunu." }, { status: 500 });
    // RLS rejects the insert for chats the user does not own, so a missing chat means 404.
    if (!chatResult.data) return Response.json({ error: "Šī saruna nav atrasta." }, { status: 404 });
    if (messageResult.error) {
      console.error("Failed to persist user message:", messageResult.error);
      return Response.json({ error: "Neizdevās saglabāt jautājumu." }, { status: 500 });
    }
    if (updateResult.error) console.error("Failed to update chat subject:", updateResult.error);
    activeChatId = chatResult.data.id;
    profile = profileResult.data;
  } else {
    const title = lastMessage.content.slice(0, 60).trim() || "Jauna saruna";
    const { data: newChat, error: chatError } = await supabase
      .from("chats")
      .insert({ user_id: userId, title, subject })
      .select("id")
      .single();
    if (chatError || !newChat) {
      console.error("Failed to create chat:", chatError);
      return Response.json({ error: "Neizdevās izveidot sarunu." }, { status: 500 });
    }
    activeChatId = newChat.id;

    const [messageResult, profileResult] = await Promise.all([
      supabase.from("messages").insert({ chat_id: activeChatId, role: "user", content: lastMessage.content }),
      profileQuery,
    ]);
    if (messageResult.error) {
      console.error("Failed to persist user message:", messageResult.error);
      return Response.json({ error: "Neizdevās saglabāt jautājumu." }, { status: 500 });
    }
    profile = profileResult.data;
  }

  const language = profile?.language === "en" ? "en" : "lv";
  const system = `Tu esi atbalstošs un akadēmiski precīzs Maestro mācību asistents Latvijas skolēniem. Atbildi ${language === "en" ? "English" : "Latvian"} valodā. Lietotāja mācību loma: ${profile?.role ?? "independent"}; klase: ${profile?.grade_level ?? "nav norādīta"}. Tēma: ${subject}. Esi kodolīgs; izmanto Markdown un KaTeX formulas, ja tas palīdz, un paskaidro risinājuma gaitu.`;
  // Only first-turn answers are shared across users, keyed by profile context, so no chat history is cached.
  const cacheKey = messages.length === 1
    ? createHash("sha256")
        .update(`${language}|${profile?.role}|${profile?.grade_level}|${subject}|${lastMessage.content.trim().toLowerCase()}`)
        .digest("hex")
    : undefined;

  const stream = createReplyStream({
    messages,
    system,
    language,
    useProvider: hasConfiguredAIProvider(),
    cacheKey,
    signal,
    onComplete: (text) => persistAssistantReply(supabase, activeChatId, userId, text, subject),
  });
  return new Response(stream, { headers: { ...baseHeaders, "x-chat-id": activeChatId } });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās apstrādāt sarunas pieprasījumu.");
  }
}
