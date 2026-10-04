export type AppSession = {
  id: string;
  email: string;
  displayName: string;
  userType: "school_student" | "music_student" | "music_high_school" | "teacher" | "independent";
  grade?: number;
  language: "lv" | "en";
  xp: number;
  level: number;
  streak: number;
  lastActive: string;
  onboardingComplete: boolean;
};
