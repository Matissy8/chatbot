"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Camera, FileImage, FileSearch, LoaderCircle, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default function AssistantScreenPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [subject, setSubject] = useState("Vispārīgs mācību uzdevums");
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseImage(file?: File) {
    setError("");
    setAnalysis("");
    if (!file) return;
    if (!acceptedTypes.has(file.type)) {
      setError("Izvēlies JPG, PNG, WebP vai GIF attēlu.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Attēlam jābūt mazākam par 8 MB.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setImage(file);
  }

  function removeImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setImage(null);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseImage(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    chooseImage(event.dataTransfer.files[0]);
  }

  async function analyzeImage() {
    if (!image || loading) return;
    setLoading(true);
    setError("");
    setAnalysis("");
    try {
      const data = new FormData();
      data.set("image", image);
      data.set("subject", subject);
      data.set("prompt", prompt);
      const response = await fetch("/api/assistant-screen", { method: "POST", body: data });
      const result = await response.json() as { analysis?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Neizdevās analizēt attēlu.");
      setAnalysis(result.analysis ?? "Analīze nav pieejama.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Neizdevās analizēt attēlu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Soli pa solim mācību atbalsts</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Ekrāna un foto palīgs</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Augšupielādē uzdevuma foto. Asistents pārrakstīs salasāmo tekstu un izskaidros risinājumu, neizdomājot attēlā neredzamo.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" /> Uzdevuma attēls</CardTitle>
            <CardDescription>JPG, PNG, WebP vai GIF · līdz 8 MB. Attēls tiks nosūtīts analīzei, bet netiek saglabāts lietotnē.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${dragOver ? "border-foreground bg-muted" : "border-border bg-muted/20 hover:bg-muted/40"}`}
            >
              {previewUrl ? (
                <div className="relative w-full">
                  <Image src={previewUrl} alt="Augšupielādētā uzdevuma priekšskatījums" width={720} height={480} unoptimized className="mx-auto max-h-72 w-auto rounded-lg object-contain" />
                  <Button type="button" variant="secondary" size="icon" onClick={removeImage} aria-label="Noņemt attēlu" className="absolute right-1 top-1">
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="mt-3 truncate text-xs text-muted-foreground">{image?.name}</p>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background"><Camera className="h-5 w-5" /></div>
                  <div><p className="text-sm font-medium">Nomet attēlu šeit vai izvēlies failu</p><p className="mt-1 text-xs text-muted-foreground">Var izmantot arī nofotografētu burtnīcas lapu.</p></div>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2"><FileImage className="h-4 w-4" /> Izvēlēties failu</Button>
                </>
              )}
              <Input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" onChange={onFileChange} className="sr-only" aria-label="Izvēlēties uzdevuma attēlu" />
            </div>

            <div className="space-y-2">
              <label htmlFor="assistant-subject" className="text-sm font-medium">Priekšmets</label>
              <Select value={subject} onValueChange={(value) => { if (typeof value === "string") setSubject(value); }}>
                <SelectTrigger id="assistant-subject" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{["Vispārīgs mācību uzdevums", "Matemātika", "Fizika", "Harmonija", "Solfedžo", "Cits"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="assistant-prompt" className="text-sm font-medium">Papildu norāde <span className="font-normal text-muted-foreground">(neobligāti)</span></label>
              <Input id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={500} placeholder="Piemēram, paskaidro 8. klases līmenī" />
            </div>

            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            <Button type="button" onClick={() => void analyzeImage()} disabled={!image || loading} className="w-full gap-2">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Analizē attēlu…" : "Analizēt un izskaidrot"}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[420px] border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileSearch className="h-4 w-4" /> Analīze un risinājums</CardTitle>
            <CardDescription>Atpazītais uzdevums un skaidrojums pa soļiem.</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <article className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:font-semibold prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
              </article>
            ) : loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center" role="status"><LoaderCircle className="h-6 w-6 animate-spin" /><p className="text-sm text-muted-foreground">Pārbaudu attēla saturu un gatavoju skaidrojumu…</p></div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted"><FileSearch className="h-5 w-5" /></div><p className="mt-4 text-sm font-medium">Analīze parādīsies šeit</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">Pievieno uzdevuma attēlu un izvēlies “Analizēt un izskaidrot”.</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}