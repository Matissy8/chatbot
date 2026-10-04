import { generateText } from "ai";
import { getConfiguredModel, hasConfiguredAIProvider } from "@/lib/ai-provider";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const resourceTypes = ["lesson-plan", "worksheet", "quiz"] as const;
type ResourceType = (typeof resourceTypes)[number];
const resourceLabels: Record<ResourceType, string> = {
  "lesson-plan": "45 minūšu stundas plānu",
  worksheet: "drukājamu darba lapu ar atbilžu atslēgu",
  quiz: "pārbaudes darbu ar atbilžu atslēgu",
};

function buildFallbackResource(type: ResourceType, topic: string, grade: string) {
  if (type === "lesson-plan") {
    return `# Stundas plāns: ${topic}\n\n**Mērķauditorija:** ${grade}. klase\n**Ilgums:** 45 minūtes\n\n## Mācību mērķi\n- Skolēns saviem vārdiem izskaidro tēmas “${topic}” pamatjēdzienus.\n- Skolēns pielieto apgūto jaunā piemērā un pamato risinājuma soļus.\n\n## Stundas gaita\n1. **Ierosināšana (5 min):** īss sākuma jautājums par iepriekšējām zināšanām.\n2. **Jaunā satura skaidrojums (10 min):** skolotājs modelē vienu piemēru, uzsverot domāšanas gaitu.\n3. **Vadītā prakse (10 min):** klase kopīgi risina uzdevumu, skolotājs uzdod pārbaudes jautājumus.\n4. **Patstāvīgais darbs (15 min):** skolēni veic trīs pakāpeniski grūtākus uzdevumus par “${topic}”.\n5. **Noslēgums (5 min):** izejas biļete — viens apgūtais fakts un viens jautājums.\n\n## Diferencēšana\n- Atbalsts: piedāvā jēdzienu kartīti un daļēji aizpildītu piemēru.\n- Padziļinājums: aicini izveidot savu piemēru un salīdzināt divas metodes.\n\n## Formatīvā vērtēšana\nVēro, vai skolēns spēj pamatot katru risinājuma soli; sniedz konkrētu, uz nākamo soli vērstu atgriezenisko saiti.`;
  }

  if (type === "worksheet") {
    return `# Darba lapa: ${topic}\n\n**Vārds:** ____________________  **Datums:** __________\n**Klase:** ${grade}. klase\n\n## Atceries\nPirms uzdevumu risināšanas pieraksti vienu svarīgu noteikumu vai ideju par tēmu “${topic}”.\n\n## Uzdevumi\n1. **Pamatuzdevums.** Paskaidro tēmas “${topic}” galveno jēdzienu saviem vārdiem.\n2. **Piemērs.** Atrisini vienkāršu piemēru par “${topic}” un pieraksti visus soļus.\n3. **Pielietojums.** Izmanto apgūto jaunā situācijā un pamato izvēlēto metodi.\n4. **Izaicinājums.** Izveido savu uzdevumu par “${topic}” un uzraksti risinājumu.\n\n## Pašnovērtējums\n- [ ] Varu izskaidrot galveno ideju.\n- [ ] Varu patstāvīgi atrisināt pamatuzdevumu.\n- [ ] Zinu, ko vēl vēlos noskaidrot.\n\n## Skolotājam: atbilžu atslēga\nAtbildes ir individuālas. Vērtē, vai skolēns nosauc atbilstošo jēdzienu, parāda pamatotus soļus un pārbauda rezultātu.`;
  }

  return `# Pārbaudes darbs: ${topic}\n\n**Klase:** ${grade}. klase  **Laiks:** 20 minūtes  **Punkti:** 10\n\nAtbildi uz jautājumiem un parādi risinājuma gaitu.\n\n1. (2 p.) Definē galveno jēdzienu, kas saistīts ar tēmu “${topic}”.\n2. (2 p.) Nosauc vienu piemēru un paskaidro, kā tas saistīts ar tēmu.\n3. (3 p.) Atrisini tipveida uzdevumu par “${topic}”, parādot starpsoļus.\n4. (3 p.) Salīdzini divas metodes vai piemērus un pamato savu secinājumu.\n\n## Skolotājam: vērtēšanas kritēriji un atbilžu atslēga\n- 1. jautājums: 2 p. par precīzu definīciju.\n- 2. jautājums: 1 p. par piemēru, 1 p. par pamatojumu.\n- 3. jautājums: 1 p. par metodes izvēli, 1 p. par pareiziem soļiem, 1 p. par atbildi.\n- 4. jautājums: līdz 3 p. par salīdzinājumu un pamatotu secinājumu.\n\nPirms izmantošanas pārskati un pielāgo uzdevumu savai mācību programmai.`;
}

export async function POST(request: Request) {
  let body: { topic?: unknown; type?: unknown; grade?: unknown; subject?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pieprasījuma dati nav derīgi." }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const type = body.type;
  const grade = typeof body.grade === "string" ? body.grade.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "Vispārīgs mācību priekšmets";
  if (topic.length < 2 || topic.length > 160 || !resourceTypes.includes(type as ResourceType) || grade.length > 32) {
    return Response.json({ error: "Norādi tēmu, materiāla veidu un derīgu klašu līmeni." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const resourceType = type as ResourceType;
  const prompt = `Sagatavo ${resourceLabels[resourceType]} latviešu valodā. Priekšmets: ${subject}. Tēma: ${topic}. Klašu līmenis: ${grade || "vispārīgs"}.\n\nPrasības: lieto skaidru, drukāšanai piemērotu Markdown struktūru. Materiālam jābūt pedagoģiski korektam un vecumam atbilstošam. Iekļauj konkrētus uzdevumus, nevis tikai tukšas norādes. ${resourceType === "quiz" || resourceType === "worksheet" ? "Pievieno skolotājam paredzētu atbilžu atslēgu un īsus vērtēšanas kritērijus." : "Iekļauj mērķus, laika sadalījumu, mācību aktivitātes un diferencēšanas ieteikumus."}`;

  let content: string;
  if (hasConfiguredAIProvider()) {
    try {
      const { text } = await generateText({
        model: getConfiguredModel(),
        system: "Tu esi pieredzējis Latvijas skolotājs un mācību materiālu redaktors. Veido precīzus, praktiskus un iekļaujošus materiālus.",
        prompt,
      });
      content = text;
    } catch (error) {
      console.error("Teacher material AI generation failed:", error);
      content = buildFallbackResource(resourceType, topic, grade || "vispārīgā");
    }
  } else {
    content = buildFallbackResource(resourceType, topic, grade || "vispārīgā");
  }

  return Response.json({ content, type: resourceType, topic });
}
