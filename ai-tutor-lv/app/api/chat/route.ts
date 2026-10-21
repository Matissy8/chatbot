import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { generateText, type ModelMessage } from "ai";
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
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { awardXP } from "@/lib/xp";
import { apiErrorResponse } from "@/lib/api-error";
import { DAILY_LIMIT_CODE, FREE_DAILY_QUESTION_LIMIT } from "@/lib/plans";
import type { TutorLanguage } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 12_000;
const AI_TIMEOUT_MS = 40_000;
const FIRST_TURN_CACHE_TTL_MS = 30 * 60 * 1000;
const SUBJECTS = ["Harmonija", "Solfedžo", "Mūzikas literatūra", "Matemātika", "Fizika", "Vēsture"];
const BASE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
};

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

function getReservationId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value)) return getReservationId(value[0]);
  if (typeof value === "object" && value !== null && "reservation_id" in value) {
    return getReservationId(value.reservation_id);
  }
  return null;
}

function isConfirmed(value: unknown) {
  if (value === true) return true;
  if (Array.isArray(value)) return isConfirmed(value[0]);
  return typeof value === "object" && value !== null && "confirmed" in value && value.confirmed === true;
}

async function persistAssistantReply(supabase: ServerClient, chatId: string, userId: string, text: string, subject: string) {
  const { error } = await supabase.from("messages").insert({ chat_id: chatId, role: "assistant", content: text });
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

async function cancelReservation(admin: ReturnType<typeof createAdminClient>, reservationId: string) {
  try {
    const { error } = await admin.rpc("cancel_daily_usage", { p_reservation_id: reservationId });
    if (error) console.error("Failed to cancel daily chat reservation:", error);
  } catch (error) {
    console.error("Failed to cancel daily chat reservation:", error);
  }
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
  if (isGuest) {
    const text = await generateTutorReply({ messages, language: "lv", allowProviders: false });
    return new Response(text, { headers: { ...BASE_HEADERS, "Cache-Control": "no-store", "X-Guest-Mode": "true" } });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Daily chat reservations require the server-side Supabase service role key:", error);
    return Response.json({ error: "Serverī nav konfigurēta dienas limita rezervēšana. Sazinies ar vietnes administratoru." }, { status: 503 });
  }

  const { data: profilePlan, error: planError } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  if (planError) {
    console.error("Unable to read the user's plan before reserving chat usage:", planError);
    return Response.json({ error: "Neizdevās nolasīt konta plānu. Pārbaudi Supabase datubāzes shēmu." }, { status: 503 });
  }

  let reservationId: string | null = null;
  let reservationSettled = profilePlan?.plan === "pro";
  if (!reservationSettled) {
    const { data: reservationData, error: reservationError } = await admin.rpc("try_reserve_daily_usage", {
      p_user_id: user.id,
      p_max_limit: FREE_DAILY_QUESTION_LIMIT,
    });
    if (reservationError) {
      console.error("Unable to reserve daily chat usage:", reservationError);
      return Response.json({ error: "Neizdevās rezervēt dienas limita pieprasījumu." }, { status: 503 });
    }

    reservationId = getReservationId(reservationData);
    if (!reservationId) {
      return Response.json(
        { error: `Šodienas bezmaksas limits (${FREE_DAILY_QUESTION_LIMIT} jautājumi) ir sasniegts.`, code: DAILY_LIMIT_CODE, limit: FREE_DAILY_QUESTION_LIMIT },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  try {
    const subject = getSubject(lastMessage.content, body.subject);
    const requestedChatId = typeof body.chatId === "string" && body.chatId.length > 0 ? body.chatId : undefined;
    const profileQuery = supabase.from("profiles").select("role, grade_level, language").eq("id", user.id).maybeSingle();

    let activeChatId: string;
    let profile: Profile;

    if (requestedChatId) {
      const [chatResult, messageResult, profileResult, updateResult] = await Promise.all([
        supabase.from("chats").select("id").eq("id", requestedChatId).maybeSingle(),
        supabase.from("messages").insert({ chat_id: requestedChatId, role: "user", content: lastMessage.content }),
        profileQuery,
        supabase.from("chats").update({ subject }).eq("id", requestedChatId),
      ]);
      if (chatResult.error) return Response.json({ error: "Neizdevās ielādēt sarunu. Atjaunini Supabase datubāzes shēmu." }, { status: 503 });
      if (!chatResult.data) return Response.json({ error: "Šī saruna nav atrasta." }, { status: 404 });
      if (messageResult.error) {
        console.error("Failed to persist user message:", messageResult.error);
        return Response.json({ error: "Neizdevās saglabāt jautājumu." }, { status: 500 });
      }
      if (updateResult.error) console.error("Failed to update chat subject:", updateResult.error);
      activeChatId = chatResult.data.id;
      profile = profileResult.data;
      if (profileResult.error) console.error("Failed to load user profile for the assistant:", profileResult.error);
    } else {
      const title = lastMessage.content.slice(0, 60).trim() || "Jauna saruna";
      const { data: newChat, error: chatError } = await supabase
        .from("chats")
        .insert({ user_id: user.id, title, subject })
        .select("id")
        .single();
      if (chatError || !newChat) {
        console.error("Failed to create chat:", chatError);
        return Response.json({ error: "Neizdevās izveidot sarunu. Atjaunini Supabase datubāzes shēmu." }, { status: 503 });
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
      if (profileResult.error) console.error("Failed to load user profile for the assistant:", profileResult.error);
    }

    const language: TutorLanguage = profile?.language === "en" || profile?.language === "ru" ? profile.language : "lv";
    const responseLanguage = language === "lv" ? "Latvian" : language === "ru" ? "Russian" : "English";
    const sourceInstructions = "When answering questions or analyzing uploaded materials, you MUST provide a precise citation to the source file, book, or chapter in the format [Avots: Faila nosaukums / lpp.]. Never invent citations. Cite only sources actually provided in the conversation; if no source or page is available, say so instead of fabricating one.";
    const system = [
      `Tu esi atbalstošs un akadēmiski precīzs Maestro mācību asistents Latvijas skolēniem. Atbildi ${responseLanguage} valodā.`,
      `Lietotāja mācību loma: ${profile?.role ?? "independent"}; klase: ${profile?.grade_level ?? "nav norādīta"}. Tēma: ${subject}.`,
      sourceInstructions,
      "Palīdzi ar skolas mācību priekšmetiem un mūziku (harmonija, solfedžo, mūzikas literatūra). Ņem vērā visu iepriekšējo sarunu, atbildi tieši uz pēdējo jautājumu un neatkārto iepriekšējās atbildes. Ja neesi pārliecināts, pasaki to godīgi un sniedz to, ko zini droši.",
      "Esi kodolīgs; izmanto Markdown un KaTeX formulas, ja tas palīdz, un paskaidro risinājuma gaitu.",
    ].join(" ");

    const cacheKey = messages.length === 1
      ? createHash("sha256")
          .update(`${language}|${profile?.role}|${profile?.grade_level}|${subject}|${lastMessage.content.trim().toLowerCase()}`)
          .digest("hex")
      : undefined;
    const cached = cacheKey ? cacheGet(cacheKey) : undefined;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(AI_TIMEOUT_MS)]);
    let responseText = cached ?? "";

    if (!responseText && hasConfiguredAIProvider()) {
      const result = await generateText({
        model: getConfiguredModel(),
        system,
        messages: limitContext(messages) as ModelMessage[],
        ...aiRequestOptions(AI_TIMEOUT_MS, 1200, signal),
      });
      responseText = result.text;
    } else if (!responseText) {
      responseText = await generateTutorReply({ messages, language, allowProviders: false });
    }

    if (!responseText.trim()) throw new Error("Gemini returned an empty response.");
    if (cacheKey && !cached) cacheSet(cacheKey, responseText, FIRST_TURN_CACHE_TTL_MS);

    if (reservationId) {
      const { data: confirmationData, error: confirmationError } = await admin.rpc("confirm_daily_usage", {
        p_reservation_id: reservationId,
      });
      if (confirmationError || !isConfirmed(confirmationData)) {
        console.error("Unable to confirm daily chat reservation:", confirmationError);
        return Response.json({ error: "Neizdevās apstiprināt dienas limita rezervāciju. Mēģini vēlreiz." }, { status: 504 });
      }
      reservationSettled = true;
    }

    await persistAssistantReply(supabase, activeChatId, user.id, responseText, subject);
    return new Response(responseText, { headers: { ...BASE_HEADERS, "x-chat-id": activeChatId } });
  } catch (error) {
    console.error("AI chat request failed:", error);
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json(
      { error: timedOut ? "AI atbildes gaidīšanas laiks pārsniegts. Dienas limits nav patērēts." : "Neizdevās ģenerēt AI atbildi. Dienas limits nav patērēts. Mēģini vēlreiz." },
      { status: timedOut ? 504 : 502, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    if (reservationId && !reservationSettled) {
      reservationSettled = true;
      await cancelReservation(admin, reservationId);
    }
  }
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās apstrādāt sarunas pieprasījumu.");
  }
}
