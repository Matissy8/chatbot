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
  "Mūzikas terminoloģija: skaņu Si apzīmē ar H, bet Si bemolu ar B; lieto 'tīrā kvinta', 'mazā terca', 'lielā seksta', 'skaņkārta', 'tonalitāte', 'atslēga', 'taktsmērs'.",
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
      ? "Dominantes septakords (D7) parasti risinās uz toniku. Vispirms nosaki akorda skaņas: pamattoni, tercu, kvintu un septīmu. Tad pārbaudi balsu kustību un izvairies no paralēlām kvintām. Ja vēlies, varu arī dot tev konkrētu piemēru vai vingrinājumu."
      : language === "ru"
        ? "Доминантсептаккорд (D7) обычно разрешается в тонику. Сначала определи состав аккорда: основной тон, терция, квинта и септима. Затем проследи за голосоведением, чтобы звуки плавно перешли в тоническое трезвучие. Если хочешь, я приведу конкретный пример или упражнение."
        : "A dominant seventh chord (D7) usually resolves to the tonic. First, identify the chord structure: root, third, fifth, and seventh. Then check voice leading so the tones move smoothly toward the tonic chord and avoid problematic parallels. I can also give you a worked example or practice exercise.";
  }

  const topicReply = FALLBACK_TOPICS.find((topic) => topic.keywords.some((keyword) => normalized.includes(keyword)))?.reply[language];
  if (topicReply) return topicReply;

  if (normalized.includes("intervāl") || normalized.includes("interval") || normalized.includes("интервал") || normalized.includes("solfedžo") || normalized.includes("mūzika")) {
    return language === "lv"
      ? "Intervāls ir attālums starp diviem toniem. Mērķis ir saprast gan augstumu, gan kvalitāti: piemēram, tīra kvarta, mazā terca, tīrā kvinta. Sāc ar to, kā dzirdēt un atpazīt intervālu pēc attāluma, un tad salīdzini to ar skalu konstrukciju."
      : language === "ru"
        ? "Интервал — это расстояние между двумя звуками. Важно определить его величину и качество: например, чистая кварта, малая терция или чистая квинта. Сначала потренируйся распознавать интервал на слух, а затем свяжи его со строением гаммы."
        : "An interval is the distance between two pitches. Start with the quality and size: for example, perfect fourth, minor third, or perfect fifth. Practice hearing the distance first, then connect it to the scale structure you already know.";
  }

  return language === "lv"
    ? "Šobrīd AI modelis nav pieejams, tāpēc uz šo jautājumu nevaru sniegt pilnu atbildi. Pamēģini jautāt par dominantes septakordu, intervāliem, taktsmēriem un ritmu, skaņas akustiku, harmoniju vai polifoniju, vai atgriezies vēlāk."
    : language === "ru"
      ? "Сейчас ИИ-модель недоступна, поэтому полный ответ на этот вопрос дать не могу. Спросите о доминантсептаккорде, интервалах, тактовых размерах и ритме, акустике звука, гармонии или полифонии либо попробуйте позже."
      : "The AI model isn't available right now, so I can't give a full answer to this question. Try asking about the dominant seventh chord, intervals, time signatures and rhythm, sound acoustics, harmony, or polyphony, or come back later.";
}

type FallbackTopic = { keywords: string[]; reply: Record<TutorLanguage, string> };

// Offline answers for the starter prompts; they are matched in order, so rhythm is checked before the generic solfège/interval reply.
const FALLBACK_TOPICS: FallbackTopic[] = [
  {
    keywords: ["taktsmēr", "ritm", "notu garum", "time signature", "rhythm", "note value", "note length", "тактов", "ритм", "длительност"],
    reply: {
      lv: "Taktsmērs parāda, cik skaitāmo vienību ir taktī un kāda nota tās apzīmē: 4/4 nozīmē četras ceturtdaļnotis taktī. Notu garumi attiecas kā 1 : 2: veselā nota ir divas pusnotis, pusnote — divas ceturtdaļnotis, ceturtdaļnote — divas astotdaļnotis. Punkts aiz notes pagarina to par pusi, tāpēc punktēta ceturtdaļnote ilgst 1,5 ceturtdaļnotis. Pamēģini aprēķināt, cik astotdaļnošu ietilpst 3/4 taktī.",
      ru: "Тактовый размер показывает, сколько долей в такте и какой нотой они обозначены: 4/4 — четыре четвертные ноты в такте. Длительности относятся как 1 : 2: целая нота равна двум половинным, половинная — двум четвертным, четвертная — двум восьмым. Точка увеличивает ноту наполовину, поэтому четвертная с точкой длится полторы четвертные. Попробуй посчитать, сколько восьмых помещается в такте 3/4.",
      en: "A time signature shows how many beats are in a bar and which note value counts as a beat: 4/4 means four quarter-note beats per bar. Note values relate as 1 : 2 — a whole note equals two half notes, a half note two quarter notes, a quarter note two eighth notes. A dot adds half the note's value, so a dotted quarter note lasts 1.5 quarter notes. Try working out how many eighth notes fit into a 3/4 bar.",
    },
  },
  {
    keywords: ["akustik", "skaņas vil", "viļņ", "rezonans", "virstoņ", "acoustic", "sound wave", "resonan", "overtone", "акустик", "звуков", "волн", "резонанс", "обертон"],
    reply: {
      lv: "Skaņa rodas, kad ķermenis svārstās un rada gaisa spiediena viļņus. Svārstību frekvence herciem nosaka toņa augstumu: a1 ir 440 Hz, bet oktāvu augstāk frekvence dubultojas (880 Hz). Instrumenta tembru veido virstoņi — katra skaņa ir pamattoņa un virstoņu kopums. Rezonanse nozīmē, ka instrumenta korpuss pastiprina frekvences, kas ir tuvas tā paša svārstībām, tāpēc vijoles vai ģitāras korpuss skaņu padara skaļāku un bagātāku.",
      ru: "Звук возникает, когда тело колеблется и создаёт волны давления воздуха. Частота колебаний в герцах определяет высоту звука: ля первой октавы — 440 Гц, а на октаву выше частота удваивается (880 Гц). Тембр инструмента формируют обертоны — каждый звук состоит из основного тона и обертонов. Резонанс означает, что корпус инструмента усиливает частоты, близкие к его собственным колебаниям, поэтому корпус скрипки или гитары делает звук громче и насыщеннее.",
      en: "Sound is produced when a body vibrates and creates air-pressure waves. The vibration frequency in hertz sets the pitch: A4 is 440 Hz, and an octave higher the frequency doubles (880 Hz). An instrument's timbre comes from overtones — every note is a combination of a fundamental and its overtones. Resonance means the instrument's body amplifies frequencies close to its own natural vibration, which is why a violin or guitar body makes the sound louder and richer.",
    },
  },
  {
    keywords: ["polifon", "kontrapunkt", "fūg", "polyphon", "counterpoint", "fugue", "полифон", "контрапункт", "фуг"],
    reply: {
      lv: "Polifonijā vairākas patstāvīgas melodiskās līnijas skan vienlaikus. Kontrapunktā svarīgas intervālu attiecības starp balsīm: konsonanses (terces, sekstas, tīrās kvintas un oktāvas) ir stabilas, bet disonanses jāsagatavo un jāatrisina. Imitācijā tā pati tēma pēc kārtas ienāk dažādās balsīs, un fūgā šis princips ir izvērsts visā skaņdarbā.",
      ru: "В полифонии одновременно звучат несколько самостоятельных мелодических линий. В контрапункте важны интервальные отношения между голосами: консонансы (терции, сексты, чистые квинты и октавы) устойчивы, а диссонансы нужно подготовить и разрешить. В имитации одна и та же тема поочерёдно вступает в разных голосах, а в фуге этот принцип развивается на протяжении всего произведения.",
      en: "In polyphony several independent melodic lines sound at the same time. Counterpoint focuses on the intervals between voices: consonances (thirds, sixths, perfect fifths and octaves) are stable, while dissonances must be prepared and resolved. In imitation the same theme enters in different voices one after another, and a fugue develops this principle across the whole piece.",
    },
  },
  {
    keywords: ["harmonij", "harmony", "гармони"],
    reply: {
      lv: "Funkcionālajā harmonijā akordus grupē trīs funkcijās: tonika (T) rada mieru, subdominante (S) attālina no tonikas, dominante (D) rada spriedzi un tiecas uz toniku. Pamata kadence ir T–S–D–T; C mažorā tās ir C–F–G–C. Četrbalsīgā faktūrā seko, lai balsis kustas pakāpeniski, un izvairies no paralēlām kvintām un oktāvām.",
      ru: "В функциональной гармонии аккорды делятся на три функции: тоника (T) даёт устойчивость, субдоминанта (S) уводит от тоники, доминанта (D) создаёт напряжение и стремится к тонике. Основная каденция — T–S–D–T; в до мажоре это C–F–G–C. В четырёхголосном изложении следи за плавным движением голосов и избегай параллельных квинт и октав.",
      en: "Functional harmony groups chords into three functions: tonic (T) is stable, subdominant (S) moves away from the tonic, and dominant (D) creates tension that pulls back to the tonic. The basic cadence is T–S–D–T; in C major that is C–F–G–C. In four-part writing keep voices moving smoothly and avoid parallel fifths and octaves.",
    },
  },
];
