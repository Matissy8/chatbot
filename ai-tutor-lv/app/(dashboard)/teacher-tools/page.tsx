"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Check, Clipboard, Download, FileQuestion, LoaderCircle, Printer, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ResourceType = "lesson-plan" | "worksheet" | "quiz";

const resourceTypes: { value: ResourceType; label: string; description: string; icon: typeof BookOpen }[] = [
  { value: "lesson-plan", label: "Stundas plāns", description: "Mērķi, aktivitātes un laika plāns", icon: BookOpen },
  { value: "worksheet", label: "Darba lapa", description: "Uzdevumi ar skolotāja atbilžu atslēgu", icon: ScrollText },
  { value: "quiz", label: "Pārbaudes darbs", description: "Jautājumi un vērtēšanas kritēriji", icon: FileQuestion },
];

export default function TeacherToolsPage() {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Mūzika");
  const [grade, setGrade] = useState("8");
  const [resourceType, setResourceType] = useState<ResourceType>("lesson-plan");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateMaterial() {
    if (topic.trim().length < 2) return;
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/teacher-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), subject, grade, type: resourceType }),
      });
      const data = await response.json() as { content?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Neizdevās izveidot materiālu.");
      setContent(data.content ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Neizdevās izveidot materiālu.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMaterial() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadMaterial() {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resourceType}-${topic.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-") || "materials"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Sagatavo mācību materiālus</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Skolotāja rīki</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Izveido pielāgojamu stundas plānu, darba lapu vai pārbaudes darbu. Rezultātu vari rediģēt, kopēt vai izdrukāt.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Materiāla iestatījumi</CardTitle>
            <CardDescription>Norādi tēmu un mērķauditoriju.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="material-topic" className="text-sm font-medium">Tēma</label>
              <Input id="material-topic" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} placeholder="Piemēram, lineārie vienādojumi" />
            </div>
            <div className="space-y-2">
              <label htmlFor="material-subject" className="text-sm font-medium">Priekšmets</label>
              <Select value={subject} onValueChange={(value) => { if (typeof value === "string") setSubject(value); }}>
                <SelectTrigger id="material-subject" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{["Mūzika", "Matemātika", "Fizika", "Vēsture", "Latviešu valoda", "Cits"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="material-grade" className="text-sm font-medium">Klase vai līmenis</label>
              <Select value={grade} onValueChange={(value) => { if (typeof value === "string") setGrade(value); }}>
                <SelectTrigger id="material-grade" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{[...Array.from({ length: 12 }, (_, index) => `${index + 1}. klase`), "Vidusskola", "Pieaugušie"].map((value) => <SelectItem key={value} value={value.startsWith("Pieaugušie") ? "Pieaugušie" : value.split(".")[0]}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Materiāla veids</legend>
              <div className="space-y-2">
                {resourceTypes.map(({ value, label, description, icon: Icon }) => (
                  <button key={value} type="button" onClick={() => setResourceType(value)} aria-pressed={resourceType === value}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${resourceType === value ? "border-foreground bg-muted/50" : "border-border hover:bg-muted/40"}`}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span>
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
            <Button onClick={() => void generateMaterial()} disabled={loading || topic.trim().length < 2} className="w-full gap-2">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              {loading ? "Sagatavo materiālu…" : "Ģenerēt materiālu"}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[500px] border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border">
            <div><CardTitle className="text-base">Priekšskatījums</CardTitle><CardDescription>Materiālu vari pārskatīt un izdrukāt.</CardDescription></div>
            {content && <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => void copyMaterial()} aria-label={copied ? "Nokopēts" : "Kopēt materiālu"} title="Kopēt">
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={downloadMaterial} aria-label="Lejupielādēt materiālu" title="Lejupielādēt Markdown">
                <Download className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => window.print()} aria-label="Drukāt materiālu" title="Drukāt">
                <Printer className="h-4 w-4" />
              </Button>
            </div>}
          </CardHeader>
          <CardContent className="p-5 sm:p-7">
            {content ? (
              <article className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:font-semibold prose-strong:text-foreground prose-li:marker:text-muted-foreground print:prose-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </article>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted"><BookOpen className="h-5 w-5" /></div>
                <p className="mt-4 text-sm font-medium">Materiāls parādīsies šeit</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">Izvēlies tēmu un materiāla veidu, tad spied “Ģenerēt materiālu”.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
