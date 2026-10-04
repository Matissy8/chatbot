import { generateText } from "ai";
import { getConfiguredModel, hasConfiguredAIProvider } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

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
    return Response.json({ error: "Fotoanalīzei nepieciešama derīga OPENAI_API_KEY vai ANTHROPIC_API_KEY. Augšupielāde netika saglabāta." }, { status: 503 });
  }

  const profileResult = await supabase.from("profiles").select("language, role, grade_level").eq("id", user.id).maybeSingle();
  const profile = profileResult.data;
  const language = profile?.language === "en" ? "English" : "Latvian";
  const analysisPrompt = `Tu esi AITutor LV akadēmiskais mācību asistents. Analizē pievienoto uzdevuma foto. Priekšmets vai konteksts: ${subject}. Lietotāja klase: ${profile?.grade_level ?? "nav norādīta"}. Atbildi ${language} valodā.\n\nVispirms pārraksti tikai to uzdevuma tekstu, ko attēlā tiešām vari salasīt; nesalasāmās vietas skaidri atzīmē. Pēc tam izskaidro risinājumu pa soļiem, pamato katru darbību un beigās pārbaudi atbildi. Ja jautājums vaicā tikai par attēlu vai lietotāja piezīme ir: ${prompt || "(nav papildu jautājuma)"}, ņem to vērā. Nekad neizdomā nesalasāmu tekstu vai datus.`;

  try {
    const buffer = await image.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const result = await generateText({
      model: getConfiguredModel(),
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
    return Response.json({ error: "Neizdevās izanalizēt attēlu. Pārbaudi AI pakalpojuma konfigurāciju un mēģini vēlreiz." }, { status: 502 });
  }
}