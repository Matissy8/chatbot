import type { Language } from "@/lib/i18n";

export type AppSession = {
  id: string;
  email: string;
  displayName: string;
  userType: "school_student" | "music_student" | "music_high_school" | "teacher" | "independent";
  grade?: number;
  language: Language;
  xp: number;
  level: number;
  streak: number;
  lastActive: string | null;
  onboardingComplete: boolean;
  isGuest?: boolean;
};
