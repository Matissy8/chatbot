const COURSE_NUMERALS = ["I", "II", "III", "IV"] as const;

// Music secondary school courses I–IV are the same level as grades 9–12.
export function courseForGrade(grade: number): string | null {
  return grade >= 9 && grade <= 12 ? COURSE_NUMERALS[grade - 9] : null;
}

export function gradeLabel(grade: number | string, gradeWord: string, includeCourse = true): string {
  const value = Number(grade);
  const course = includeCourse ? courseForGrade(value) : null;
  return course ? `${value}. ${gradeWord} / ${course} kurss` : `${value}. ${gradeWord}`;
}

const COURSE_BY_TEXT: Record<string, number> = { "1": 9, i: 9, "2": 10, ii: 10, "3": 11, iii: 11, "4": 12, iv: 12 };

// Converts "II kurss", "2. kurss", "10. klase" or 10 to the grade number; course input maps to grades 9–12.
export function normalizeGradeLevel(input: string | number): number | null {
  if (typeof input === "number") return Number.isInteger(input) && input >= 1 && input <= 12 ? input : null;

  const text = input.toLowerCase().trim();
  const course = text.match(/^(iv|iii|ii|i|[1-4])\.?\s*kurs/);
  if (course) return COURSE_BY_TEXT[course[1]];

  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null;
}

export function describeGradeForAI(grade: number | string | null | undefined): string {
  const value = normalizeGradeLevel(grade ?? "");
  if (value === null) return typeof grade === "string" && grade.trim() ? grade.trim() : "nav norādīta";
  const course = courseForGrade(value);
  return course ? `${value}. klase (mūzikas vidusskolas ${course} kurss)` : `${value}. klase`;
}

export const GRADE_LEVEL_RULES = [
  "Mūzikas izglītības līmeņi: 1.–8. klase ir mūzikas skolas pamatizglītības posms (solfedžo pamati, intervāli, mažors un minors, ritms).",
  "9.–12. klase ir tas pats, kas mūzikas vidusskolas 1.–4. kurss: 9. klase = I kurss, 10. klase = II kurss, 11. klase = III kurss, 12. klase = IV kurss.",
  "Ja norādīts 'I kurss', '1. kurss' vai '9. klase', tas ir vidusskolēns, nevis 1. klases bērns: uzdevumiem jābūt vidusskolas līmenī (harmonija, funkcionālā analīze, modulācijas, alterētie akordi, četrbalsīga faktūra), nevis bērnu solfedžo līmenī.",
].join(" ");
