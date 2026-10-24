import { generateText } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { MUSIC_SUBJECT_AI_RULES } from "@/lib/music-subjects";

export type TutorLanguage = "lv" | "en" | "ru";

const MAX_CONTEXT_MESSAGES = 12;
const MAX_CONTEXT_CHARS = 16_000;

export function limitContext<T extends { role: string; content: string }>(messages: T[]): T[] {
  const kept: T[] = [];
  let chars = 0;
  for (let index = messages.length - 1; index >= 0 && kept.length < MAX_CONTEXT_MESSAGES; index -= 1) {
    const message = messages[index];
    // Always keep the newest message, even if it alone exceeds the budget.
    if (kept.length > 0 && chars + message.content.length > MAX_CONTEXT_CHARS) break;
    chars += message.content.length;
    kept.unshift(message);
  }
  // Provider conversations should start with a user turn.
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  return kept;
}

// Appended to system prompts; the rules apply only when the reply is written in Latvian.
export const LATVIAN_STYLE_RULES = [
  "Ja atbildi latviešu valodā: lieto tikai pareizu, dabisku latviešu literāro valodu ar korektu gramatiku, locījumiem, dzimti un interpunkciju.",
  "Nekopē angļu valodas teikuma uzbūvi un neveido jaunus vārdus; ja neesi drošs par vārda formu, izvēlies vienkāršāku, pārbaudītu formulējumu.",
  "Mūzikas terminoloģija: skaņu Si apzīmē ar H, bet Si bemolu ar B; lieto 'tīrā kvinta', 'mazā tercija', 'lielā seksta', 'skaņkārta', 'tonalitāte', 'atslēga', 'taktsmērs'.",
  "Piemērs stilam. Jautājums: Kas ir tīrā kvinta? Atbilde: Tīrā kvinta ir konsonējošs intervāls, kas aptver piecas pakāpes un ietver trīs ar pusi toņus; piemēram, no skaņas C uz augšu tā ir skaņa G.",
].join(" ");

export function withLatvianStyle(system: string) {
  return `${system} ${LATVIAN_STYLE_RULES}`;
}

export function aiRequestOptions(timeoutMs: number, maxOutputTokens: number, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return {
    abortSignal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    maxOutputTokens,
    temperature: 0.3,
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
  };
}

const cache = new Map<string, { value: string; expires: number }>();
const CACHE_MAX_ENTRIES = 200;

export function cacheGet(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

export function cacheSet(key: string, value: string, ttlMs: number) {
  cache.delete(key);
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

function getUsableGeminiKey() {
  const value = process.env.GEMINI_API_KEY;
  return value?.trim() && !/your-|replace|placeholder|example|changeme/i.test(value)
    ? value
    : undefined;
}

export function hasConfiguredAIProvider() {
  return Boolean(getUsableGeminiKey());
}

export function getConfiguredModel() {
  const apiKey = getUsableGeminiKey();
  if (!apiKey) throw new Error("No Gemini API key is configured.");
  return createGoogle({ apiKey })("gemini-3.8-flash");
}

export async function generateTutorReply({
  messages,
  language = "lv",
  allowProviders = true,
}: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  language?: TutorLanguage;
  allowProviders?: boolean;
}) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content ?? "Palīdzi man mācīties.";

  if (!allowProviders || !getUsableGeminiKey()) {
    return buildFallbackReply({ lastUserMessage, language });
  }

  try {
    const model = getConfiguredModel();
    const result = await generateText({
      model,
      ...aiRequestOptions(30_000, 1200),
      system:
        language === "lv"
          ? withLatvianStyle(`Tu esi Latvijas mūzikas skolas AI pasniedzējs. Atbildi latviešu valodā, lieto pareizu mūzikas terminoloģiju un paskaidro iemeslu, ne tikai rezultātu. ${MUSIC_SUBJECT_AI_RULES}`)
          : language === "ru"
            ? `Ты — ИИ-преподаватель музыкальной школы. Отвечай на русском языке и объясняй ход решения. ${MUSIC_SUBJECT_AI_RULES}`
            : `You are an AI music-school tutor. Answer in English and explain your reasoning clearly. ${MUSIC_SUBJECT_AI_RULES}`,
      messages: limitContext(messages).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    return result.text;
  } catch (error) {
    console.error("AI provider error:", error);
    return buildFallbackReply({ lastUserMessage, language });
  }
}

function buildFallbackReply({
  lastUserMessage,
  language,
}: {
  lastUserMessage: string;
  language: TutorLanguage;
}) {
  const normalized = lastUserMessage.toLowerCase();

  if (normalized.includes("d7") || normalized.includes("dominant") || normalized.includes("septakords")) {
    return language === "lv"
      ? "Dominantes septakords (D7) parasti risinās uz toniku. Vispirms nosaki akorda skaņas: pamattoni, terciju, kvintu un septīmu. Tad pārbaudi balsu kustību un izvairies no paralēlām kvintām. Ja vēlies, varu arī dot tev konkrētu piemēru vai vingrinājumu."
      : language === "ru"
        ? "Доминантсептаккорд (D7) обычно разрешается в тонику. Сначала определи состав аккорда: основной тон, терция, квинта и септима. Затем проследи за голосоведением, чтобы звуки плавно перешли в тоническое трезвучие. Если хочешь, я приведу конкретный пример или упражнение."
        : "A dominant seventh chord (D7) usually resolves to the tonic. First, identify the chord structure: root, third, fifth, and seventh. Then check voice leading so the tones move smoothly toward the tonic chord and avoid problematic parallels. I can also give you a worked example or practice exercise.";
  }

  if (normalized.includes("intervāl") || normalized.includes("solfedžo") || normalized.includes("mūzika")) {
    return language === "lv"
      ? "Intervāls ir attālums starp diviem toniem. Mērķis ir saprast gan augstumu, gan kvalitāti: piemēram, tīra kvarta, mazā terca, tīrā kvinta. Sāc ar to, kā dzirdēt un atpazīt intervālu pēc attāluma, un tad salīdzini to ar skalu konstrukciju."
      : language === "ru"
        ? "Интервал — это расстояние между двумя звуками. Важно определить его величину и качество: например, чистая кварта, малая терция или чистая квинта. Сначала потренируйся распознавать интервал на слух, а затем свяжи его со строением гаммы."
        : "An interval is the distance between two pitches. Start with the quality and size: for example, perfect fourth, minor third, or perfect fifth. Practice hearing the distance first, then connect it to the scale structure you already know.";
  }

  return language === "lv"
    ? "Šis asistents palīdz tikai Latvijas mūzikas skolas priekšmetos. Jautā par solfedžo, mūzikas teoriju, mūzikas literatūru, harmoniju vai citu mūzikas priekšmetu."
    : language === "ru"
      ? "Этот помощник отвечает только по предметам музыкальной школы. Спросите о сольфеджио, музыкальной теории, литературе, гармонии или другом музыкальном предмете."
      : "This assistant supports music-school subjects only. Ask about solfège, music theory, music literature, harmony, or another music subject.";
}
