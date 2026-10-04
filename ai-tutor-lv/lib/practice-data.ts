export type PracticeSubject = "harmony" | "solfeggio" | "math" | "physics";
export type PracticeDifficulty = "easy" | "medium" | "hard";

export type PublicPracticeQuestion = {
  id: string;
  question: string;
  options: string[];
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
