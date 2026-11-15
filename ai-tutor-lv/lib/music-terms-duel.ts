import type { Language } from "@/lib/i18n";

export type MusicDuelCategory = "Tempi" | "Dinamika" | "Artikulācija un raksturs";

export interface MusicDuelTerm {
  id: string;
  italian: string;
  category: MusicDuelCategory;
  translations: Record<Language, string>;
}

export const MUSIC_DUEL_CATEGORIES: MusicDuelCategory[] = ["Tempi", "Dinamika", "Artikulācija un raksturs"];

const T: MusicDuelCategory = "Tempi";
const D: MusicDuelCategory = "Dinamika";
const A: MusicDuelCategory = "Artikulācija un raksturs";

export const MUSIC_DUEL_TERMS: MusicDuelTerm[] = [
  { id: "dt-01", italian: "Grave", category: T, translations: { lv: "Smagi, svinīgi lēni", en: "Solemnly slow", ru: "Тяжело, очень медленно" } },
  { id: "dt-02", italian: "Largo", category: T, translations: { lv: "Ļoti lēni un plaši", en: "Very slow and broad", ru: "Очень медленно и широко" } },
  { id: "dt-03", italian: "Lento", category: T, translations: { lv: "Lēni, vilkti", en: "Slowly", ru: "Медленно, протяжно" } },
  { id: "dt-04", italian: "Adagio", category: T, translations: { lv: "Lēni, mierīgi", en: "Slow and stately", ru: "Медленно, спокойно" } },
  { id: "dt-05", italian: "Andante", category: T, translations: { lv: "Nesteidzīgi, soļojot", en: "At a walking pace", ru: "Не спеша, шагом" } },
  { id: "dt-06", italian: "Andantino", category: T, translations: { lv: "Mazliet kustīgāk par Andante", en: "Slightly faster than Andante", ru: "Чуть подвижнее Andante" } },
  { id: "dt-07", italian: "Moderato", category: T, translations: { lv: "Mēreni", en: "Moderately", ru: "Умеренно" } },
  { id: "dt-08", italian: "Allegretto", category: T, translations: { lv: "Diezgan dzīvi", en: "Moderately fast", ru: "Довольно оживлённо" } },
  { id: "dt-09", italian: "Allegro", category: T, translations: { lv: "Ātri, dzīvespriecīgi", en: "Fast and bright", ru: "Быстро, весело" } },
  { id: "dt-10", italian: "Vivace", category: T, translations: { lv: "Dzīvi, mundri", en: "Lively and fast", ru: "Живо, бодро" } },
  { id: "dt-11", italian: "Presto", category: T, translations: { lv: "Ļoti ātri", en: "Very fast", ru: "Очень быстро" } },
  { id: "dt-12", italian: "Prestissimo", category: T, translations: { lv: "Visātrākajā tempā", en: "Extremely fast", ru: "Предельно быстро" } },
  { id: "dt-13", italian: "Accelerando", category: T, translations: { lv: "Paātrinot tempu", en: "Gradually speeding up", ru: "Ускоряя" } },
  { id: "dt-14", italian: "Ritardando", category: T, translations: { lv: "Palēninot tempu", en: "Gradually slowing down", ru: "Замедляя" } },
  { id: "dt-15", italian: "A tempo", category: T, translations: { lv: "Iepriekšējā tempā", en: "Back to original tempo", ru: "В прежнем темпе" } },

  { id: "dt-16", italian: "Pianissimo (pp)", category: D, translations: { lv: "Ļoti klusi", en: "Very soft", ru: "Очень тихо" } },
  { id: "dt-17", italian: "Piano (p)", category: D, translations: { lv: "Klusi", en: "Soft", ru: "Тихо" } },
  { id: "dt-18", italian: "Mezzo piano (mp)", category: D, translations: { lv: "Pusklusi", en: "Moderately soft", ru: "Не очень тихо" } },
  { id: "dt-19", italian: "Mezzo forte (mf)", category: D, translations: { lv: "Pusskaļi", en: "Moderately loud", ru: "Не очень громко" } },
  { id: "dt-20", italian: "Forte (f)", category: D, translations: { lv: "Skaļi, spēcīgi", en: "Loud, strong", ru: "Громко, сильно" } },
  { id: "dt-21", italian: "Fortissimo (ff)", category: D, translations: { lv: "Ļoti skaļi", en: "Very loud", ru: "Очень громко" } },
  { id: "dt-22", italian: "Crescendo", category: D, translations: { lv: "Pakāpeniski pastiprinot", en: "Gradually louder", ru: "Постепенно усиливая" } },
  { id: "dt-23", italian: "Diminuendo", category: D, translations: { lv: "Pakāpeniski klusinot", en: "Gradually softer", ru: "Постепенно затихая" } },
  { id: "dt-24", italian: "Sforzando (sf)", category: D, translations: { lv: "Pēkšņi akcentējot", en: "Sudden strong accent", ru: "Внезапный акцент" } },
  { id: "dt-25", italian: "Subito piano", category: D, translations: { lv: "Pēkšņi klusi", en: "Suddenly soft", ru: "Внезапно тихо" } },

  { id: "dt-26", italian: "Legato", category: A, translations: { lv: "Saistīti, plūstoši", en: "Smooth and connected", ru: "Связанно, плавно" } },
  { id: "dt-27", italian: "Staccato", category: A, translations: { lv: "Īsi, saraustīti", en: "Short and detached", ru: "Коротко, отрывисто" } },
  { id: "dt-28", italian: "Tenuto", category: A, translations: { lv: "Izturēti, pilnā garumā", en: "Held for full value", ru: "Выдержанно, полностью" } },
  { id: "dt-29", italian: "Marcato", category: A, translations: { lv: "Izcelti, uzsvērti", en: "Marked, accented", ru: "Подчёркнуто, выделяя" } },
  { id: "dt-30", italian: "Cantabile", category: A, translations: { lv: "Dziedoši", en: "In a singing style", ru: "Певуче" } },
  { id: "dt-31", italian: "Dolce", category: A, translations: { lv: "Maigi, saldi", en: "Sweetly, gently", ru: "Нежно, ласково" } },
  { id: "dt-32", italian: "Espressivo", category: A, translations: { lv: "Izteiksmīgi", en: "Expressively", ru: "Выразительно" } },
  { id: "dt-33", italian: "Con moto", category: A, translations: { lv: "Ar kustību", en: "With movement", ru: "С движением" } },
  { id: "dt-34", italian: "Con brio", category: A, translations: { lv: "Ar uguni, spoži", en: "With spirit and vigor", ru: "С огнём, с жаром" } },
  { id: "dt-35", italian: "Maestoso", category: A, translations: { lv: "Cēli, majestātiski", en: "Majestically", ru: "Величественно, торжественно" } },
  { id: "dt-36", italian: "Grazioso", category: A, translations: { lv: "Graciozi, daiļi", en: "Gracefully", ru: "Грациозно, изящно" } },
  { id: "dt-37", italian: "Scherzando", category: A, translations: { lv: "Rotaļīgi, jokojot", en: "Playfully", ru: "Шутливо, игриво" } },
  { id: "dt-38", italian: "Tranquillo", category: A, translations: { lv: "Mierīgi, rāmi", en: "Calmly, quietly", ru: "Спокойно, безмятежно" } },
  { id: "dt-39", italian: "Agitato", category: A, translations: { lv: "Satraukti, nemierīgi", en: "Agitated, restless", ru: "Взволнованно, тревожно" } },
  { id: "dt-40", italian: "Da capo al fine", category: A, translations: { lv: "No sākuma līdz vārdam Fine", en: "From the head to the end", ru: "С начала до слова Fine" } },
];
