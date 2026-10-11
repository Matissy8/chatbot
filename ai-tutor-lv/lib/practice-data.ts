export type PracticeSubject = "harmony" | "solfeggio" | "math" | "physics";
export type PracticeDifficulty = "easy" | "medium" | "hard";

export type PublicPracticeQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: number;
  explanation?: string;
};

export const guestPracticeQuestions: Record<PracticeSubject, Record<PracticeDifficulty, PublicPracticeQuestion[]>> = {
  harmony: {
    easy: [{ id: "guest-h-e1", question: "C mažorā kādu funkciju pilda C–E–G trijskanis?", options: ["Toniku", "Dominanti", "Subdominanti"], correctAnswer: 0, explanation: "C–E–G ir C mažora I pakāpes trijskanis, tātad tonika." }],
    medium: [{ id: "guest-h-m1", question: "C mažorā uz kuras pakāpes veido D7?", options: ["I", "IV", "V"], correctAnswer: 2, explanation: "Dominantes septakords veidojas uz V pakāpes." }],
    hard: [{ id: "guest-h-h1", question: "C mažorā kur atrisinās ievadtonis B?", options: ["A", "C", "D"], correctAnswer: 1, explanation: "Vadošais tonis B parasti virzās augšup par pustoni uz C." }],
  },
  solfeggio: {
    easy: [{ id: "guest-s-e1", question: "Cik ceturtdaļnošu ilgst pusnote?", options: ["1", "2", "4"], correctAnswer: 1, explanation: "Pusnote ilgst divas ceturtdaļnotis." }],
    medium: [{ id: "guest-s-m1", question: "Kāds intervāls ir starp C un G?", options: ["Tīra kvarta", "Tīra kvinta", "Oktāva"], correctAnswer: 1, explanation: "C–G ir piecu skaņkārtas pakāpju attālums — tīra kvinta." }],
    hard: [{ id: "guest-s-h1", question: "Cik veselu toņu veido tritonu?", options: ["2", "2,5", "3"], correctAnswer: 2, explanation: "Tritons aptver trīs veselus toņus." }],
  },
  math: {
    easy: [{ id: "guest-m-e1", question: "Atrisini 3x + 2 = 11.", options: ["x = 2", "x = 3", "x = 4"], correctAnswer: 1, explanation: "Atņem 2: 3x=9. Dala ar 3: x=3." }],
    medium: [{ id: "guest-m-m1", question: "Kāda ir x virsotnes koordināta funkcijai x² − 4x + 4?", options: ["−2", "2", "4"], correctAnswer: 1, explanation: "Virsotnei x=−b/(2a)=4/2=2." }],
    hard: [{ id: "guest-m-h1", question: "Atrisini x² − 5x + 6 = 0.", options: ["2 vai 3", "−2 vai −3", "1 vai 6"], correctAnswer: 0, explanation: "(x−2)(x−3)=0, tātad x ir 2 vai 3." }],
  },
  physics: {
    easy: [{ id: "guest-p-e1", question: "Kāda ir ātruma SI mērvienība?", options: ["m/s", "kg", "N"], correctAnswer: 0, explanation: "Ātrumu mēra metros sekundē (m/s)." }],
    medium: [{ id: "guest-p-m1", question: "12 metru ceļš veikts 3 sekundēs. Kāds ir vidējais ātrums?", options: ["3 m/s", "4 m/s", "36 m/s"], correctAnswer: 1, explanation: "v=s/t=12/3=4 m/s." }],
    hard: [{ id: "guest-p-h1", question: "Spēks 10 N pārvieto ķermeni 4 m spēka virzienā. Kāds ir darbs?", options: ["14 J", "40 J", "2,5 J"], correctAnswer: 1, explanation: "W=F·s=10×4=40 J." }],
  },
};

export type SubmittedPracticeAnswer = {
  questionId: string;
  selectedOption: number;
};

export const practiceSubjects: { value: PracticeSubject; label: string }[] = [
  { value: "harmony", label: "Mūzika · Harmonija" },
  { value: "solfeggio", label: "Mūzika · Solfedžo" },
  { value: "math", label: "Matemātika" },
  { value: "physics", label: "Fizika" },
];

export const practiceDifficulties: { value: PracticeDifficulty; label: string }[] = [
  { value: "easy", label: "Iesācējs" },
  { value: "medium", label: "Vidējs" },
  { value: "hard", label: "Padziļināts" },
];
