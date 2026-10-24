export interface MusicSubject {
  id: string;
  name: string;
  shortName: string;
  description: string;
  minGrade: number;
  subtopics: readonly string[];
}

export const MUSIC_SUBJECTS = [
  {
    id: "solfedzo",
    name: "Solfedžo",
    shortName: "Solfedžo",
    description: "Dzirdes attīstīšana, diktāti, intonēšana, ritmika un intervālu/akordu atpazīšana.",
    minGrade: 1,
    subtopics: [
      "Dzirdes analīze",
      "Muzikālais diktāts",
      "Dziedāšana no lapas",
      "Intervāli un akordi dzirdē",
      "Ritma vingrinājumi",
    ],
  },
  {
    id: "muzikas_teorija",
    name: "Mūzikas teorija",
    shortName: "Teorija",
    description: "Elementārā mūzikas teorija, nošu raksts, skaņkārtas, tonalitātes, metri un skaņas akustiskie pamati.",
    minGrade: 1,
    subtopics: [
      "Nošu raksts un atslēgas",
      "Skaņkārtas un mažors/minors",
      "Intervālu un akordu uzbūve",
      "Metrs, ritms un taktsmēri",
      "Skaņas akustika un fizika (svārstības, herci, virstoņi mūzikā)",
      "Muzikālā matemātika (nošu vērtību attiecības, intervālu proporcijas)",
    ],
  },
  {
    id: "muzikas_literatura",
    name: "Mūzikas literatūra un vēsture",
    shortName: "Mūz. lit.",
    description: "Pasaules un Latvijas mūzikas vēsture, komponistu biogrāfijas, laikmeti un skaņdarbu analīze.",
    minGrade: 4,
    subtopics: [
      "Baroks, klasicisms, romantisms",
      "20. un 21. gadsimta mūzika",
      "Latvijas mūzikas vēsture",
      "Komponistu stils un darbi",
      "Muzikālo žanru attīstība",
    ],
  },
  {
    id: "harmonija",
    name: "Harmonija",
    shortName: "Harmonija",
    description: "Funkcionālā harmonija, četrbalsīgā faktūra, akordu savienojumi, kadences un modulācijas.",
    minGrade: 9,
    subtopics: [
      "Četrbalsīgā kora faktūra",
      "Galvenie un blakus triskaņi",
      "Septakordi un nonakordi",
      "Harmoniskās sekvences",
      "Novirzes un modulācijas",
      "Alterētie akordi un ērģeļpunkts",
    ],
  },
  {
    id: "polifonija",
    name: "Polifonija",
    shortName: "Polifonija",
    description: "Kontrapunkts, stingrais un brīvais stils, imitācijas un fūgas.",
    minGrade: 9,
    subtopics: [
      "Stingrā stila kontrapunkts",
      "Brīvā stila polifonija",
      "Divbalsīga un trīsbalsīga imitācija",
      "Invencijas un kanoni",
      "Fūgas uzbūve",
    ],
  },
  {
    id: "muzikas_formas",
    name: "Mūzikas formu analīze",
    shortName: "Formu analīze",
    description: "Skaņdarbu uzbūves principi un kompozīcijas struktūra.",
    minGrade: 9,
    subtopics: [
      "Periods un teikums",
      "Divdaļu un trīsdaļu formas",
      "Rondo un variācijas",
      "Sonātes forma un sonātes-allegro cikls",
    ],
  },
  {
    id: "dirigesana",
    name: "Diriģēšana",
    shortName: "Diriģēšana",
    description: "Kora un orķestra diriģēšanas tehnika, manuālā tehnika, partitūras iestudēšana.",
    minGrade: 9,
    subtopics: [
      "Manuālā tehnika un taktsmēru shēmas",
      "Auftakts, dinamika un fermātas",
      "Kora partitūras analīze un iestudēšana",
      "Diriģenta žesta psiholoģija",
    ],
  },
  {
    id: "instrumentacija",
    name: "Instrumentācija un orķestrācija",
    shortName: "Instrumentācija",
    description: "Mūzikas instrumentu diapazoni, tembri, partitūru lasīšana un pārlikšana orķestrim.",
    minGrade: 9,
    subtopics: [
      "Instrumentu diapazoni un transponēšana",
      "Stīgu, pūšamo un sitamo instrumentu grupas",
      "Faktūras orķestrēšana",
      "Partitūras lasīšana",
    ],
  },
] as const satisfies readonly MusicSubject[];

export type MusicSubjectId = (typeof MUSIC_SUBJECTS)[number]["id"];

export function normalizeMusicSubject(input: string | null | undefined): MusicSubjectId | null {
  if (!input) return null;
  const raw = input.toLocaleLowerCase("lv").trim();
  if (!raw) return null;

  if (raw.includes("fizik") || raw.includes("akustik") || raw.includes("matemāt") || raw.includes("matemat") || raw.includes("teorij")) {
    return "muzikas_teorija";
  }
  if (raw.includes("solfed")) return "solfedzo";
  if (raw.includes("literat") || raw.includes("vēstur") || raw.includes("vestur")) return "muzikas_literatura";
  if (raw.includes("harmonij")) return "harmonija";
  if (raw.includes("polifon")) return "polifonija";
  if (raw.includes("form")) return "muzikas_formas";
  if (raw.includes("diriģ") || raw.includes("dirig")) return "dirigesana";
  if (raw.includes("instrument") || raw.includes("orķestr") || raw.includes("orkestr")) return "instrumentacija";

  const directMatch = MUSIC_SUBJECTS.find((subject) => subject.id === raw);
  return directMatch?.id ?? null;
}

export const MUSIC_SUBJECT_AI_RULES = `
PRIEKŠMETU UN TĒMU NOTEIKUMI:
1. Šī platforma ir TIKAI Latvijas mūzikas skolu un mūzikas vidusskolu profesionālās ievirzes un profesionālās izglītības vide.
2. Atļauti TIKAI šādi mūzikas priekšmeti:
   - Solfedžo
   - Mūzikas teorija (elementārā mūzikas teorija)
   - Mūzikas literatūra un mūzikas vēsture
   - Harmonija (vidusskolas I–IV kurss / 9.–12. klase)
   - Polifonija (vidusskolas I–IV kurss)
   - Mūzikas formu analīze (vidusskolas I–IV kurss)
   - Diriģēšana (kora / simfoniskā)
   - Instrumentācija un orķestrācija
3. AIZLIEGTS ĢENERĒT vispārizglītojošos priekšmetus kā atsevišķas disciplīnas (latviešu valoda, matemātika, fizika, ķīmija, pasaules vispārējā vēsture).
4. Fizika un matemātika NAV atsevišķi priekšmeti. Tās eksistē VIENĪGI kā paskaidrojoši elementi "Mūzikas teorijā" vai "Solfedžo":
   - Fizika tiek pieminēta TIKAI kā akustika (skaņas rašanās, stīgas svārstības, frekvences hercos, virstoņi un tembrs).
   - Matemātika tiek pieminēta TIKAI kā ritma un taktsmēru proporcijas vai pitagora/temperētās skaņkārtas aprēķins.
`;