"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileImage, FileSearch, LoaderCircle, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/fetch-json";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const acceptedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf", "docx", "txt", "md"]);

export default function AssistantScreenPage() {
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);
  const [file, setFile] = useState<File | null>(null);
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

  function chooseFile(file?: File) {
    setError("");
    setAnalysis("");
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!acceptedExtensions.has(extension)) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setFile(null);
      setError(tr("Izvēlies JPG, PNG, WebP, GIF, PDF, DOCX, TXT vai Markdown failu."));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setFile(null);
      setError(tr("Failam jābūt mazākam par 8 MB."));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? URL.createObjectURL(file) : "");
    setFile(file);
  }

  function removeFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFile(null);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function analyzeFile() {
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setAnalysis("");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("subject", subject);
      data.set("prompt", prompt);
      const result = await fetchJson<{ analysis?: string }>("/api/assistant-screen", { method: "POST", body: data, timeoutMs: 65_000 });
      setAnalysis(result.analysis ?? tr("Analīze nav pieejama."));
    } catch (cause) {
      setError(tr(cause instanceof Error ? cause.message : "Neizdevās analizēt materiālu. Mēģini vēlreiz."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{tr("Soli pa solim mācību atbalsts")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Metodisko materiālu un uzdevumu analīze")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tr("Augšupielādē skolas metodiskos materiālus, darba lapas vai grāmatas uzdevumu. Asistents analizēs saturu, izskaidros risinājumu un uzrādīs atsauces.")}</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" /> {tr("Materiāla fails")}</CardTitle>
            <CardDescription>{tr("Atbalstītie formāti: JPG, PNG, WebP, GIF, PDF, DOCX, TXT un Markdown · līdz 8 MB.")}</CardDescription>
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
                  <Image src={previewUrl} alt={tr("Augšupielādētā uzdevuma priekšskatījums")} width={720} height={480} unoptimized className="mx-auto max-h-72 w-auto rounded-lg object-contain" />
                  <Button type="button" variant="secondary" size="icon" onClick={removeFile} aria-label={tr("Noņemt failu")} className="absolute right-1 top-1">
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="mt-3 truncate text-xs text-muted-foreground">{file?.name}</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-3">
                  <FileSearch className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <p className="max-w-full truncate text-sm font-medium">{file.name}</p>
                  <Button type="button" variant="secondary" size="sm" onClick={removeFile}>{tr("Noņemt failu")}</Button>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background"><Upload className="h-5 w-5" /></div>
                  <div><p className="text-sm font-medium">{tr("Nomet attēlu vai dokumentu šeit, vai izvēlies failu")}</p><p className="mt-1 text-xs text-muted-foreground">{tr("Var izmantot attēlus, PDF, DOCX, TXT un Markdown failus.")}</p></div>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2"><FileImage className="h-4 w-4" /> {tr("Izvēlēties failu")}</Button>
                </>
              )}
              <Input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,.md" onChange={onFileChange} className="sr-only" aria-label={tr("Izvēlies materiāla failu")} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tr("🔒 Fails tiek nosūtīts konfigurētajam AI pakalpojumam tikai analīzei un lietotnē netiek saglabāts. Pakalpojuma datu apstrādi nosaka tā privātuma politika. Augšupielādējiet materiālus atbilstoši skolas un autoru nosacījumiem.")}</p>

            <div className="space-y-2">
              <label htmlFor="assistant-subject" className="text-sm font-medium">{tr("Priekšmets")}</label>
              <Select value={subject} onValueChange={(value) => { if (typeof value === "string") setSubject(value); }}>
                <SelectTrigger id="assistant-subject" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{["Vispārīgs mācību uzdevums", "Matemātika", "Fizika", "Harmonija", "Solfedžo", "Cits"].map((value) => <SelectItem key={value} value={value}>{tr(value)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="assistant-prompt" className="text-sm font-medium">{tr("Papildu norāde")} <span className="font-normal text-muted-foreground">({tr("neobligāti")})</span></label>
              <Input id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={500} placeholder={tr("Piemēram, paskaidro 8. klases līmenī")} />
            </div>

            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            <Button type="button" onClick={() => void analyzeFile()} disabled={!file || loading} className="w-full gap-2">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {tr(loading ? "Analizē materiālu…" : "Analizēt un izskaidrot")}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[420px] border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileSearch className="h-4 w-4" /> {tr("Analīze un risinājums")}</CardTitle>
            <CardDescription>{tr("Atpazītais uzdevums un skaidrojums pa soļiem.")}</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <article className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:font-semibold prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
              </article>
            ) : loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center" role="status"><LoaderCircle className="h-6 w-6 animate-spin" /><p className="text-sm text-muted-foreground">{tr("Analizēju materiāla saturu un gatavoju skaidrojumu…")}</p></div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted"><FileSearch className="h-5 w-5" /></div><p className="mt-4 text-sm font-medium">{tr("Analīze parādīsies šeit")}</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">{tr("Pievieno materiāla failu un izvēlies “Analizēt un izskaidrot”.")}</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}