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
    easy: [{ id: "guest-h-e1", question: "C mažorā kādu funkciju pilda C–E–G trijskanis?", options: ["Dominanti", "Subdominanti", "Toniku"], correctAnswer: 2, explanation: "C–E–G ir C mažora I pakāpes trijskanis, tātad tonika." }],
    medium: [{ id: "guest-h-m1", question: "C mažorā uz kuras pakāpes veido D7?", options: ["I", "IV", "V"], correctAnswer: 2, explanation: "Dominantes septakords veidojas uz V pakāpes." }],
    hard: [{ id: "guest-h-h1", question: "C mažorā kur atrisinās ievadtonis H?", options: ["A", "C", "D"], correctAnswer: 1, explanation: "Vadošais tonis H parasti virzās augšup par pustoni uz C." }],
  },
  solfeggio: {
    easy: [{ id: "guest-s-e1", question: "Cik ceturtdaļnošu ilgst pusnote?", options: ["1", "2", "4"], correctAnswer: 1, explanation: "Pusnote ilgst divas ceturtdaļnotis." }],
    medium: [{ id: "guest-s-m1", question: "Kāds intervāls ir starp C un G?", options: ["Tīra kvarta", "Tīra kvinta", "Oktāva"], correctAnswer: 1, explanation: "C–G ir piecu skaņkārtas pakāpju attālums — tīra kvinta." }],
    hard: [{ id: "guest-s-h1", question: "Cik veselu toņu veido tritonu?", options: ["2", "2,5", "3"], correctAnswer: 2, explanation: "Tritons aptver trīs veselus toņus." }],
  },
  math: {
    easy: [{ id: "guest-m-e1", question: "Cik ceturtdaļnošu ir veselā notī?", options: ["2", "4", "8"], correctAnswer: 1, explanation: "Veselā nota ilgst četras ceturtdaļnotis." }],
    medium: [{ id: "guest-m-m1", question: "Cik astotdaļnošu ir 3/4 taktī?", options: ["3", "6", "8"], correctAnswer: 1, explanation: "3/4 taktī ir trīs ceturtdaļnotis jeb sešas astotdaļnotis." }],
    hard: [{ id: "guest-m-h1", question: "Kā parasti grupē sešas astotdaļnotes 6/8 taktī?", options: ["2 + 4", "1 + 5", "3 + 3"], correctAnswer: 2, explanation: "6/8 takti parasti skaita divās grupās pa trīs astotdaļnotēm." }],
  },
  physics: {
    easy: [{ id: "guest-p-e1", question: "Kādā mērvienībā mēra skaņas frekvenci?", options: ["Ņūtoni (N)", "Herci (Hz)", "Vati (W)"], correctAnswer: 1, explanation: "Frekvenci mēra hercos (Hz): tie ir svārstību skaits sekundē." }],
    medium: [{ id: "guest-p-m1", question: "Kāda ir etalona skaņas a1 frekvence?", options: ["220 Hz", "440 Hz", "880 Hz"], correctAnswer: 1, explanation: "Etalona skaņa a1 ir 440 Hz." }],
    hard: [{ id: "guest-p-h1", question: "Kāda frekvenču attiecība atbilst tīrajai kvintai?", options: ["2 : 1", "4 : 3", "3 : 2"], correctAnswer: 2, explanation: "Tīrā kvinta atbilst frekvenču attiecībai 3 : 2." }],
  },
};

export type SubmittedPracticeAnswer = {
  questionId: string;
  selectedOption: number;
};

// The "math" and "physics" codes are kept for the database; their content is rhythm proportions and acoustics.
export const practiceSubjects: { value: PracticeSubject; label: string }[] = [
  { value: "harmony", label: "Mūzika · Harmonija" },
  { value: "solfeggio", label: "Mūzika · Solfedžo" },
  { value: "math", label: "Mūzikas teorija · Ritms un proporcijas" },
  { value: "physics", label: "Mūzikas teorija · Akustika" },
];

export const practiceDifficulties: { value: PracticeDifficulty; label: string }[] = [
  { value: "easy", label: "Iesācējs" },
  { value: "medium", label: "Vidējs" },
  { value: "hard", label: "Padziļināts" },
];
