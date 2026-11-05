"use client";

import { useEffect, type ChangeEvent } from "react";
import { MUSIC_SUBJECTS, type MusicSubjectId } from "@/lib/music-subjects";
import { translate, type Language } from "@/lib/i18n";

export function SubjectSelector({
  selectedSubject,
  onSelect,
  gradeLevel = 1,
  language = "lv",
}: {
  selectedSubject: string;
  onSelect: (id: MusicSubjectId) => void;
  gradeLevel?: number;
  language?: Language;
}) {
  const availableSubjects = MUSIC_SUBJECTS.filter((subject) => gradeLevel >= subject.minGrade);
  const activeSubject = availableSubjects.find((subject) => subject.id === selectedSubject)?.id
    ?? availableSubjects[0]?.id
    ?? "";

  useEffect(() => {
    if (activeSubject && activeSubject !== selectedSubject) {
      onSelect(activeSubject);
    }
  }, [activeSubject, onSelect, selectedSubject]);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const subject = availableSubjects.find((item) => item.id === event.currentTarget.value);
    if (subject) onSelect(subject.id);
  }

  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">{translate(language, "Mācību priekšmets")}</span>
      <select
        value={activeSubject}
        onChange={handleChange}
        aria-label={translate(language, "Mācību priekšmets")}
        className="w-full min-w-0 truncate rounded-md border border-border bg-background px-2 py-1.5 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
      >
        {availableSubjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {translate(language, subject.name)}{subject.minGrade >= 9 ? ` (${translate(language, "Vidusskola / I–IV kurss")})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}