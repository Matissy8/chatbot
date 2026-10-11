import { generateText } from "ai";
import { aiRequestOptions, getConfiguredModel, hasConfiguredAIProvider } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME, isGuestModeEnabled } from "@/lib/guest-mode";
import { apiErrorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function handlePost(request: Request) {
  const cookieStore = await cookies();
  const isGuest = isGuestModeEnabled() && cookieStore.get(GUEST_COOKIE_NAME)?.value === "1";
  if (isGuest) {
    return Response.json({ error: "Viesu priekšskatījumā foto augšupielādi var apskatīt, bet AI analīzei nepieciešams autentificēts konts." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Neizdevās nolasīt attēla augšupielādi." }, { status: 400 });
  }

  const image = formData.get("image");
  const prompt = typeof formData.get("prompt") === "string" ? String(formData.get("prompt")).trim() : "";
  const subject = typeof formData.get("subject") === "string" ? String(formData.get("subject")).slice(0, 80) : "vispārīgs mācību uzdevums";

  if (!(image instanceof File)) return Response.json({ error: "Pievieno JPG, PNG, WebP vai GIF attēlu." }, { status: 400 });
  if (!allowedImageTypes.has(image.type)) return Response.json({ error: "Šis attēla formāts netiek atbalstīts. Izmanto JPG, PNG, WebP vai GIF." }, { status: 415 });
  if (image.size === 0 || image.size > MAX_IMAGE_SIZE) return Response.json({ error: "Attēlam jābūt mazākam par 8 MB." }, { status: 413 });

  if (!hasConfiguredAIProvider()) {
    return Response.json({ error: "Fotoanalīzei nepieciešama derīga OPENAI_API_KEY, ANTHROPIC_API_KEY vai GEMINI_API_KEY. Augšupielāde netika saglabāta." }, { status: 503 });
  }

  const [profileResult, buffer] = await Promise.all([
    supabase.from("profiles").select("language, role, grade_level").eq("id", user.id).maybeSingle(),
    image.arrayBuffer(),
  ]);
  const profile = profileResult.data;
  const language = profile?.language === "en" ? "English" : "Latvian";
  const analysisPrompt = `Tu esi Maestro akadēmiskais mācību asistents. Analizē pievienoto uzdevuma foto. Priekšmets vai konteksts: ${subject}. Lietotāja klase: ${profile?.grade_level ?? "nav norādīta"}. Atbildi ${language} valodā.\n\nVispirms pārraksti tikai to uzdevuma tekstu, ko attēlā tiešām vari salasīt; nesalasāmās vietas skaidri atzīmē. Pēc tam izskaidro risinājumu pa soļiem, pamato katru darbību un beigās pārbaudi atbildi. Ja jautājums vaicā tikai par attēlu vai lietotāja piezīme ir: ${prompt || "(nav papildu jautājuma)"}, ņem to vērā. Nekad neizdomā nesalasāmu tekstu vai datus.`;

  try {
    const bytes = new Uint8Array(buffer);
    const result = await generateText({
      model: getConfiguredModel(),
      ...aiRequestOptions(50_000, 1500, request.signal),
      system: "Paskaidro izglītojoši, korekti un soli pa solim. Svarīgāk ir mācīt risināšanas metodi, ne tikai nosaukt atbildi.",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: analysisPrompt },
          { type: "image", image: bytes, mediaType: image.type },
        ],
      }],
    });

    return Response.json({ analysis: result.text });
  } catch (error) {
    console.error("Homework image analysis failed:", error);
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json(
      { error: timedOut ? "Analīze aizņēma pārāk ilgu laiku. Mēģini ar mazāku attēlu." : "Neizdevās izanalizēt attēlu. Pārbaudi AI pakalpojuma konfigurāciju un mēģini vēlreiz." },
      { status: timedOut ? 504 : 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    return apiErrorResponse(error, "Neizdevās analizēt attēlu. Mēģini vēlreiz.");
  }
}