import { generateText } from "ai";
import { createGoogle } from "@ai-sdk/google";

export type TutorLanguage = "lv" | "en";

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

export function aiRequestOptions(timeoutMs: number, maxOutputTokens: number, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return {
    abortSignal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    maxOutputTokens,
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
          ? "Tu esi AI tutors Latvijas skolēniem. Atbildi latviešu valodā, izmanto pareizu izglītības terminoloģiju. Paskaidro iemeslu, ne tikai rezultātu."
          : "You are an AI tutor for students. Answer in English, explain the reasoning clearly, and use educational terminology.",
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
      ? "Dominantes septakords (D7) parasti risinās uz toniku. Pirmkārt, nosaki akorda struktūru: tonis–ters–kvinta–septīma. Tad pārbaudi balsu kustību: D7 pāriet uz tonikas akordu, lai saglabātu skaidru funkciju un izvairītos no paralēlām kvinteņām. Ja vēlies, varu arī dot tev konkrētu piemēru vai vingrinājumu."
      : "A dominant seventh chord (D7) usually resolves to the tonic. First, identify the chord structure: root, third, fifth, and seventh. Then check voice leading so the tones move smoothly toward the tonic chord and avoid problematic parallels. I can also give you a worked example or practice exercise.";
  }

  if (normalized.includes("matem") || normalized.includes("indukc") || normalized.includes("vienādoj")) {
    return language === "lv"
      ? "Sāc ar definīciju un pārbaudi, kas ir dotais solis. Matemātikā vislabāk ir sadalīt uzdevumu mazākos posmos: 1) saprast, ko vēlas pierādīt, 2) pārbaudīt bāzes gadījumu, 3) pieņemt, ka formula darbojas, 4) pierādīt nākamajam solim. Ja vēlies, varu to izskaidrot ar konkrētu piemēru."
      : "Start by identifying the exact claim and the structure of the proof. In mathematics, the safest method is: 1) state the claim, 2) prove the base case, 3) assume the statement for one step, 4) show it holds for the next step. I can walk through a concrete example if you want.";
  }

  if (normalized.includes("intervāl") || normalized.includes("solfedžo") || normalized.includes("mūzika")) {
    return language === "lv"
      ? "Intervāls ir attālums starp diviem toniem. Mērķis ir saprast gan augstumu, gan kvalitāti: piemēram, čista kvarta, maza tera, perfekta kvinta. Sāc ar to, kā dzirdēt un atpazīt intervālu pēc attāluma, un tad salīdzini to ar skalu konstrukciju."
      : "An interval is the distance between two pitches. Start with the quality and size: for example, perfect fourth, minor third, or perfect fifth. Practice hearing the distance first, then connect it to the scale structure you already know.";
  }

  return language === "lv"
    ? "Labi — sāksim vienkārši. Pirmkārt, noskaidro, ko tieši tu neizproti. Tad es to sadalīšu priekšmetā, piemēros un soli pa solim. Tu vari arī jautāt: 'Paskaidro vienkāršāk', 'Dod piemēru' vai 'Pamēģini pārbaudīt mani'."
    : "Let’s start simply. First, identify exactly what feels confusing. Then I’ll break it down into the concept, the reasoning, and a concrete example. You can also ask for a simpler explanation, an example, or a quick test.";
}
