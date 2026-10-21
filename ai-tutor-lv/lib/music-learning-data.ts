import type { PublicPracticeQuestion } from "@/lib/practice-data";

export const flashcards = [
  { id: "allegro", term: "Allegro", category: "Itāļu mūzikas termini", definition: "Ātri un dzīvīgi.", example: "Allegro norāda uz strauju, enerģisku tempu." },
  { id: "andante", term: "Andante", category: "Itāļu mūzikas termini", definition: "Rāmi, soļojošā tempā.", example: "Andante ir mierīgs, dabisks temps." },
  { id: "forte", term: "Forte", category: "Dinamika", definition: "Skaļi.", example: "Forte apzīmē skaļu atskaņojumu." },
  { id: "piano", term: "Piano", category: "Dinamika", definition: "Klusināti, klusi.", example: "Dinamiskais apzīmējums p nozīmē piano." },
  { id: "crescendo", term: "Crescendo", category: "Dinamika", definition: "Pakāpeniski skaļāk.", example: "Skaļums pakāpeniski pieaug." },
  { id: "diminuendo", term: "Diminuendo", category: "Dinamika", definition: "Pakāpeniski klusāk.", example: "Skaļums pakāpeniski samazinās." },
  { id: "staccato", term: "Staccato", category: "Izpildījuma veids", definition: "Īsi un atdalīti.", example: "Staccato notis nesavieno garā, plūstošā skaņā." },
  { id: "legato", term: "Legato", category: "Izpildījuma veids", definition: "Plūstoši, savienojot skaņas.", example: "Legato frāzē notis pāriet cita citā bez pārtraukuma." },
  { id: "perfect-fifth", term: "Tīrā kvinta", category: "Intervāli", definition: "Intervāls, kas aptver piecas skaņkārtas pakāpes.", example: "Do–Sol veido tīro kvintu." },
  { id: "dominant-seventh", term: "Dominantes septakords (D7)", category: "Akordi", definition: "Četru skaņu akords, kas veidots uz skaņkārtas V pakāpes.", example: "C mažorā G7 sastāv no Sol–Si–Re–Fa." },
] as const;

export type FlashcardId = (typeof flashcards)[number]["id"];

export const learningPathLessons = [
  {
    id: "notes",
    title: "Notis un nošu atslēgas",
    description: "Atpazīsti notis un saproti nošu atslēgu nozīmi.",
    prompt: "Izskaidro nošu atpazīšanu un nošu atslēgu nozīmi ar vienkāršiem mūzikas piemēriem.",
    prerequisite: null,
    progressId: null,
  },
  {
    id: "rhythm",
    title: "Taktsmēri un 4/4 ritms",
    description: "Iepazīsti taktsmēra skaitīšanu un notu ilguma attiecības.",
    prompt: "Izskaidro 4/4 taktsmēru un notu ilguma matemātiskās attiecības, parādot, kā saskaitīt vienu takti.",
    prerequisite: "notes",
    progressId: "rhythm",
  },
  {
    id: "intervals",
    title: "Intervāli un tīrā kvinta",
    description: "Salīdzini skaņu augstumus un atpazīsti intervālus.",
    prompt: "Izskaidro intervālus un tīro kvintu, izmantojot Do–Sol piemēru.",
    prerequisite: "rhythm",
    progressId: "intervals",
  },
  {
    id: "dominant-seventh",
    title: "D7 akorda atrisinājums",
    description: "Uzbūvē dominantes septakordu un izproti tā atrisinājumu.",
    prompt: "Parādi, kā C mažorā uz V pakāpes uzbūvē dominantes septakordu (G7) un kā tas atrisinās tonikā.",
    prerequisite: "intervals",
    progressId: "dominant-seventh",
  },
] as const;

export type LearningPathProgressId = Exclude<(typeof learningPathLessons)[number]["id"], "notes">;

export const guestQuickQuiz: (PublicPracticeQuestion & { correctAnswer: number; explanation: string })[] = [
  {
    id: "guest-interval-c-g",
    question: "Kāds intervāls veidojas starp notīm Do (C) un Sol (G)?",
    options: ["Lielā terca", "Tīrā kvinta", "Tīrā kvarta", "Oktāva"],
    correctAnswer: 1,
    explanation: "Do–Re–Mi–Fa–Sol aptver piecas skaņkārtas pakāpes, tāpēc tas ir tīras kvintas intervāls.",
  },
];
