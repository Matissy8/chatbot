import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_SCREENSHOT_LENGTH = 1_400_000;
const BUCKET = "junior-reports";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sesija ir beigusies. Pieslēdzies vēlreiz." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Neizdevās nolasīt kļūdas ziņojumu." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return Response.json({ error: "Kļūdas ziņojuma dati nav derīgi." }, { status: 400 });
  }
  const body = payload as { description?: unknown; screenshot?: unknown; pageUrl?: unknown };

  const description = typeof body.description === "string" ? body.description.trim() : "";
  const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl : "";
  if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
    return Response.json({ error: "Apraksti problēmu (līdz 2000 rakstzīmēm)." }, { status: 400 });
  }
  if (!pageUrl.startsWith("/") || pageUrl.startsWith("//") || pageUrl.length > 2048) {
    return Response.json({ error: "Lapas adrese nav derīga." }, { status: 400 });
  }

  let image: Buffer | undefined;
  if (body.screenshot !== undefined && body.screenshot !== null) {
    if (typeof body.screenshot !== "string" || body.screenshot.length > MAX_SCREENSHOT_LENGTH) {
      return Response.json({ error: "Ekrānuzņēmums ir pārāk liels. Mēģini vēlreiz bez tā." }, { status: 413 });
    }
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.screenshot);
    if (!match) return Response.json({ error: "Ekrānuzņēmuma formāts nav derīgs." }, { status: 400 });
    image = Buffer.from(match[1], "base64");
    if (image.length === 0 || image.length > 1_048_576) {
      return Response.json({ error: "Ekrānuzņēmumam jābūt mazākam par 1 MB." }, { status: 413 });
    }
  }

  const screenshotPath = image ? `${user.id}/${randomUUID()}.jpg` : null;
  if (image && screenshotPath) {
    const { error } = await supabase.storage.from(BUCKET).upload(screenshotPath, image, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      console.error("Unable to upload Junior bug-report screenshot:", error);
      return Response.json({ error: "Neizdevās saglabāt ekrānuzņēmumu. Mēģini nosūtīt ziņojumu bez tā." }, { status: 503 });
    }
  }

  const { error } = await supabase.from("bug_reports").insert({
    user_id: user.id,
    description,
    screenshot_path: screenshotPath,
    page_url: pageUrl,
  });
  if (error) {
    console.error("Unable to save Junior bug report:", error);
    if (screenshotPath) {
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([screenshotPath]);
      if (cleanupError) console.error("Unable to clean up orphaned Junior screenshot:", cleanupError);
    }
    return Response.json({ error: "Neizdevās saglabāt kļūdas ziņojumu. Pārbaudi Supabase shēmu." }, { status: 503 });
  }

  return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
