import { streamText, type ModelMessage } from "ai";
import { generateTutorReply, getConfiguredModel, hasConfiguredAIProvider } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";
import { awardXP } from "@/lib/xp";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 12_000;
const SUBJECTS = ["Harmonija", "Solfedžo", "Mūzikas literatūra", "Matemātika", "Fizika", "Vēsture"];

type IncomingMessage = { role: "user" | "assistant"; content: string };

function getSubject(text: string, requestedSubject: unknown): string {
  if (typeof requestedSubject === "string" && requestedSubject.trim()) {
    return requestedSubject.trim().slice(0, 80);
  }
  const normalized = text.toLocaleLowerCase("lv");
  return SUBJECTS.find((subject) => normalized.includes(subject.toLocaleLowerCase("lv"))) ?? "General";
}

async function persistAssistantReply(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chatId: string,
  userId: string,
  text: string,
  subject: string
) {
  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    role: "assistant",
    content: text,
  });
  if (error) {
    console.error("Failed to persist assistant message:", error);
    return;
  }

  try {
    await awardXP(userId, 15, "Uzdots jautājums AI asistentam", subject);
  } catch (error) {
    console.error("Failed to award chat XP:", error);
  }
}

export async function POST(request: Request) {
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

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const subject = getSubject(lastMessage.content, body.subject);
  let activeChatId: string;

  if (typeof body.chatId === "string" && body.chatId.length > 0) {
    const { data: existingChat, error } = await supabase
      .from("chats")
      .select("id")
      .eq("id", body.chatId)
      .maybeSingle();
    if (error) return Response.json({ error: "Neizdevās ielādēt sarunu." }, { status: 500 });
    if (!existingChat) return new Response("Chat not found", { status: 404 });
    activeChatId = existingChat.id;
  } else {
    const title = lastMessage.content.slice(0, 60).trim() || "Jauna saruna";
    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title, subject })
      .select("id")
      .single();
    if (error || !newChat) {
      console.error("Failed to create chat:", error);
      return Response.json({ error: "Neizdevās izveidot sarunu." }, { status: 500 });
    }
    activeChatId = newChat.id;
  }

  const { error: userMessageError } = await supabase.from("messages").insert({
    chat_id: activeChatId,
    role: "user",
    content: lastMessage.content,
  });
  if (userMessageError) {
    console.error("Failed to persist user message:", userMessageError);
    return Response.json({ error: "Neizdevās saglabāt jautājumu." }, { status: 500 });
  }

  const { error: updateChatError } = await supabase
    .from("chats")
    .update({ subject })
    .eq("id", activeChatId);
  if (updateChatError) console.error("Failed to update chat timestamp/subject:", updateChatError);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, grade_level, language")
    .eq("id", user.id)
    .maybeSingle();
  const language = profile?.language === "en" ? "English" : "Latvian";
  const system = `Tu esi atbalstošs un akadēmiski precīzs AITutor LV mācību asistents Latvijas skolēniem. Atbildi ${language} valodā. Lietotāja mācību loma: ${profile?.role ?? "independent"}; klase: ${profile?.grade_level ?? "nav norādīta"}. Tēma: ${subject}. Izmanto skaidru struktūru, Markdown un KaTeX formulas, ja tas palīdz; paskaidro risinājuma gaitu.`;
  const aiMessages = messages as ModelMessage[];
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "x-chat-id": activeChatId,
  });

  if (hasConfiguredAIProvider()) {
    const result = streamText({
      model: getConfiguredModel(),
      system,
      messages: aiMessages,
      onFinish: async ({ text }) => {
        await persistAssistantReply(supabase, activeChatId, user.id, text, subject);
      },
    });

    return result.toTextStreamResponse({ headers });
  }

  const reply = await generateTutorReply({
    messages: messages.map((message) => ({ ...message })),
    language: profile?.language === "en" ? "en" : "lv",
  });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const characters = Array.from(reply);
        const chunkSize = 28;
        for (let index = 0; index < characters.length; index += chunkSize) {
          controller.enqueue(encoder.encode(characters.slice(index, index + chunkSize).join("")));
        }
        await persistAssistantReply(supabase, activeChatId, user.id, reply, subject);
        controller.close();
      } catch (error) {
        console.error("Fallback chat stream failed:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, { headers });
}
