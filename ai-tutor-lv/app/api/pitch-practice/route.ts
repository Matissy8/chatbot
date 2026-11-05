import { generateText } from "ai";
import { aiRequestOptions, getConfiguredModel, hasConfiguredAIProvider, withLatvianStyle } from "@/lib/ai-provider";
import { apiErrorResponse } from "@/lib/api-error";
import { confirmReservation, reserveDailyUsage, cancelReservation } from "@/lib/usage-reservation";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const exercises = {
  "do-major": ["C4", "D4", "E4", "F4", "G4", "A4", "H4", "C5"],
  "sol-major": ["G4", "A4", "H4", "C5", "D5", "E5", "Fis5", "G5"],
} as const;

type Language = "lv" | "en" | "ru";

type Attempt = {
  targetNote: string;
  detectedNote: string;
  cents: number;
};

function isLanguage(value: unknown): value is Language {
  return value === "lv" || value === "en" || value === "ru";
}

async function handlePost(request: Request) {
  let body: { exercise?: unknown; attempts?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pieprasījuma dati nav derīgi." }, { status: 400 });
  }

  if (typeof body.exercise !== "string" || !Object.hasOwn(exercises, body.exercise) || !isLanguage(body.language)) {
    return Response.json({ error: "Vingrinājuma dati nav derīgi." }, { status: 400 });
  }
  const expectedNotes = exercises[body.exercise as keyof typeof exercises];
  if (!Array.isArray(body.attempts) || body.attempts.length !== expectedNotes.length) {
    return Response.json({ error: "Vingrinājuma rezultāti nav pilnīgi." }, { status: 400 });
  }

  const attempts: Attempt[] = [];
  for (const [index, item] of body.attempts.entries()) {
    if (!item || typeof item !== "object") {
      return Response.json({ error: "Vingrinājuma rezultātu formāts nav derīgs." }, { status: 400 });
    }
    const candidate = item as Record<string, unknown>;
    if (
      candidate.targetNote !== expectedNotes[index] ||
      typeof candidate.detectedNote !== "string" ||
      !/^(?:Cis|Dis|Fis|Gis|[CDEFGABH])\d$/.test(candidate.detectedNote) ||
      typeof candidate.cents !== "number" ||
      !Number.isFinite(candidate.cents) ||
      Math.abs(candidate.cents) > 2400
    ) {
      return Response.json({ error: "Vingrinājuma rezultātu formāts nav derīgs." }, { status: 400 });
    }
    attempts.push({
      targetNote: expectedNotes[index],
      detectedNote: candidate.detectedNote,
      cents: Math.round(candidate.cents),
    });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });
  if (!hasConfiguredAIProvider()) {
    return Response.json({ error: "Gemini atsauksmei nepieciešama konfigurēta GEMINI_API_KEY." }, { status: 503 });
  }

  const reservation = await reserveDailyUsage(user.id);
  if (reservation instanceof Response) return reservation;
  let reservationSettled = reservation.reservationId === null;

  try {
    const languageName = body.language === "lv" ? "latviešu" : body.language === "ru" ? "krievu" : "angļu";
    const resultSummary = attempts.map(({ targetNote, detectedNote, cents }, index) => {
      const accuracy = Math.abs(cents) <= 30 ? "intonēts ±30 centu robežās" : "ārpus ±30 centu robežas";
      return `${index + 1}. mērķis ${targetNote}; noteiktais augstums ${detectedNote}; novirze no mērķa ${cents > 0 ? "+" : ""}${cents} centi (${accuracy}).`;
    }).join("\n");
    const { text } = await generateText({
      model: getConfiguredModel(),
      ...aiRequestOptions(35_000, 900, request.signal),
      system: body.language === "lv"
        ? withLatvianStyle("Tu esi atbalstošs Latvijas mūzikas skolas solfedžo pedagogs. Sniedz īsu un konkrētu intonācijas treniņa komentāru latviešu valodā. Neslavē vai nekritizē skolēnu personiski; vērtē tikai datus. Nosauc vienu stipro pusi, vienu konkrētu vingrināmu vietu un praktisku nākamo soli. Ņem vērā, ka mikrofona noteikšana un centu novirze ir aptuvena, un neizdomā cēloņus, ko dati nepierāda.")
        : body.language === "ru"
          ? "Ты — доброжелательный педагог музыкальной школы. Кратко прокомментируй данные упражнения на интонацию по-русски: отметь один сильный результат, одну конкретную область для тренировки и следующий практический шаг. Оценивай только данные; измерение микрофона приблизительно."
          : "You are a supportive music-school solfege teacher. Briefly review the intonation exercise in English: identify one strength, one specific area to practice, and a practical next step. Assess only the supplied data; microphone measurements are approximate.",
      prompt: `Skala: ${body.exercise === "do-major" ? "Do mažors" : "Sol mažors"}.\nAtbildi ${languageName} valodā.\nRezultāti:\n${resultSummary}`,
    });
    if (!text.trim()) throw new Error("Gemini returned an empty pitch-practice response.");

    if (reservation.reservationId) {
      if (!await confirmReservation(reservation.admin, reservation.reservationId)) {
        return Response.json({ error: "Neizdevās apstiprināt dienas limita rezervāciju. Mēģini vēlreiz." }, { status: 504 });
      }
      reservationSettled = true;
    }
    return Response.json({ feedback: text }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Pitch practice feedback generation failed:", error);
    return Response.json({ error: "Neizdevās sagatavot AI atsauksmi. Dienas limits nav patērēts. Mēģini vēlreiz." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  } finally {
    if (reservation.reservationId && !reservationSettled) {
      await cancelReservation(reservation.admin, reservation.reservationId);
    }
  }
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās sagatavot AI atsauksmi. Mēģini vēlreiz.");
  }
}
