"use client";

import { useState, type FormEvent } from "react";
import { Bug, Camera, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

type Mode = "ask" | "report";
type Step = "choose" | "capture" | "form" | "success";

const MAX_SCREENSHOT_LENGTH = 1_400_000;

async function captureScreen(): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvas = await html2canvas(document.documentElement, {
    x: window.scrollX,
    y: window.scrollY,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    scale: Math.min(1, 1200 / width),
    useCORS: true,
    logging: false,
    ignoreElements: (element) => element.hasAttribute("data-junior-hide"),
  });

  const scale = Math.min(1, 1024 / canvas.width, 1024 / canvas.height);
  const resized = document.createElement("canvas");
  resized.width = Math.max(1, Math.round(canvas.width * scale));
  resized.height = Math.max(1, Math.round(canvas.height * scale));
  const context = resized.getContext("2d");
  if (!context) throw new Error("Neizdevās sagatavot ekrānuzņēmumu.");
  context.drawImage(canvas, 0, 0, resized.width, resized.height);

  let screenshot = resized.toDataURL("image/jpeg", 0.62);
  if (screenshot.length > MAX_SCREENSHOT_LENGTH) screenshot = resized.toDataURL("image/jpeg", 0.4);
  if (screenshot.length > MAX_SCREENSHOT_LENGTH) throw new Error("Ekrānuzņēmums ir pārāk liels.");
  return screenshot;
}

export function MaestroJunior() {
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<Mode>("ask");
  const [screenshot, setScreenshot] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    if (busy) return;
    setIsOpen(false);
    setStep("choose");
    setScreenshot("");
    setIncludeScreenshot(false);
    setInput("");
    setAnswer("");
    setCaptureError("");
    setError("");
  }

  async function begin(nextMode: Mode) {
    setMode(nextMode);
    setStep("capture");
    setScreenshot("");
    setIncludeScreenshot(false);
    setInput("");
    setAnswer("");
    setError("");
    setCaptureError("");
    try {
      setScreenshot(await captureScreen());
    } catch (cause) {
      console.error("Unable to capture the screen for Maestro Junior:", cause);
      setCaptureError(tr("Ekrānuzņēmumu neizdevās uzņemt. Vari turpināt bez tā."));
    } finally {
      setStep("form");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(mode === "ask" ? "/api/junior" : "/api/junior/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "ask"
            ? { question: text, screenshot: includeScreenshot ? screenshot || null : null }
            : { description: text, screenshot: includeScreenshot ? screenshot || null : null, pageUrl: window.location.pathname }
        ),
      });
      const data = await response.json() as { answer?: unknown; error?: unknown };
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : tr("Neizdevās nosūtīt ziņojumu."));

      if (mode === "ask") {
        if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error(tr("Junioram neizdevās sagatavot atbildi."));
        setAnswer(data.answer);
      } else {
        setStep("success");
        setInput("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr("Neizdevās nosūtīt ziņojumu."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 print:hidden sm:left-5 md:bottom-5" data-junior-hide>
      {!isOpen ? (
        <Button type="button" onClick={() => setIsOpen(true)} aria-label={tr("Atvērt Maestro Junior")} className="h-14 w-14 rounded-full shadow-xl">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </Button>
      ) : step === "choose" ? (
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-xl">
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void begin("ask")}>
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {tr("Jautāt Maestro Junior")}
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => void begin("report")}>
              <Bug className="h-4 w-4" aria-hidden="true" />
              {tr("Ziņot par kļūdu")}
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={close} aria-label={tr("Aizvērt Maestro Junior")} className="h-14 w-14 rounded-full shadow-xl">
            <X className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="junior-title"
          className="flex max-h-[min(650px,calc(100dvh-6rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="junior-title" className="font-semibold">{tr(mode === "ask" ? "Maestro Junior" : "Ziņot par kļūdu")}</h2>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={tr("Aizvērt Maestro Junior")} onClick={close} disabled={busy}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          {step === "capture" ? (
            <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              {tr("Sagatavoju ekrānuzņēmumu…")}
            </div>
          ) : step === "success" ? (
            <div className="space-y-4 p-4">
              <p role="status" className="text-sm">{tr("Paldies! Ziņojums ir nosūtīts.")}</p>
              <Button type="button" onClick={close}>{tr("Gatavs")}</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
              {mode === "ask" && answer ? (
                <>
                  <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{answer}</div>
                  <Button type="button" variant="outline" onClick={() => { setAnswer(""); setInput(""); setStep("choose"); }}>
                    {tr("Uzdot vēl vienu jautājumu")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {tr(mode === "ask" ? "Apraksti, kas nav saprotams. Junioram pievienotais ekrāns palīdzēs paskaidrot redzamo." : "Īsi apraksti, kas lietotnē nestrādā. Ziņojumu redzēs tikai pilnvarotie lietotnes administratori.")}
                  </p>
                  {captureError && <p className="text-sm text-amber-700 dark:text-amber-300" role="status">{captureError}</p>}
                  {screenshot && (
                    <div className="space-y-2 rounded-xl border border-border p-2">
                      <div
                        role="img"
                        aria-label={tr("Ekrānuzņēmuma priekšskatījums")}
                        className="h-36 w-full rounded-lg bg-muted bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url("${screenshot}")` }}
                      />
                      <label className="flex cursor-pointer items-start gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={includeScreenshot}
                          onChange={(event) => setIncludeScreenshot(event.target.checked)}
                          className="mt-0.5 size-4 accent-primary"
                        />
                        <span>{tr(mode === "ask" ? "Pievienot ekrānuzņēmumu un nosūtīt to AI atbildes sagatavošanai. Pirms sūtīšanas pārbaudi, vai attēlā nav sensitīvas informācijas." : "Pievienot ekrānuzņēmumu kļūdas ziņojumam; tas tiks glabāts privāti. Pirms nosūtīšanas pārbaudi, vai attēlā nav sensitīvas informācijas.")}</span>
                      </label>
                    </div>
                  )}
                  {!screenshot && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      {tr("Ziņojumu vari nosūtīt arī bez ekrānuzņēmuma.")}
                    </p>
                  )}
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    maxLength={mode === "ask" ? 1200 : 2000}
                    rows={3}
                    required
                    placeholder={tr(mode === "ask" ? "Ieraksti savu jautājumu…" : "Kas notika? Ko tu gaidīji?")}
                    aria-label={tr(mode === "ask" ? "Tavs jautājums" : "Kļūdas apraksts")}
                    disabled={busy}
                  />
                  {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                  <Button type="submit" disabled={busy || !input.trim()} className="gap-2">
                    {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                    {tr(mode === "ask" ? "Jautāt Junioram" : "Nosūtīt kļūdas ziņojumu")}
                  </Button>
                </>
              )}
            </form>
          )}
        </section>
      )}
    </div>
  );
}
