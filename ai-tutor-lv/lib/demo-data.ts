export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const demoLeaderboard = [
  { rank: 1, name: "Anna", level: 18, xp: 4820, streak: 14 },
  { rank: 2, name: "Roberts", level: 17, xp: 4310, streak: 12 },
  { rank: 3, name: "Elīna", level: 15, xp: 3940, streak: 9 },
  { rank: 4, name: "Emīls", level: 14, xp: 3650, streak: 11 },
  { rank: 5, name: "Marta", level: 14, xp: 3510, streak: 8 },
  { rank: 6, name: "Mārtiņš", level: 13, xp: 3260, streak: 10 },
  { rank: 7, name: "Katrīna", level: 13, xp: 3180, streak: 7 },
  { rank: 8, name: "Juris", level: 12, xp: 2940, streak: 6 },
  { rank: 9, name: "Līga", level: 12, xp: 2860, streak: 9 },
  { rank: 10, name: "Dārta", level: 11, xp: 2720, streak: 5 },
];

export const demoProgress = [
  { subject: "Harmonija", percent: 91, xp: 980 },
  { subject: "Solfedžo", percent: 84, xp: 760 },
  { subject: "Mūzikas literatūra", percent: 88, xp: 820 },
  { subject: "Matemātika", percent: 73, xp: 640 },
  { subject: "Fizika", percent: 61, xp: 480 },
];

export const demoAchievements = [
  { id: "first-question", title: "Pirmais jautājums", description: "Uzdevi savu pirmo jautājumu", unlocked: true },
  { id: "streak-7", title: "7 dienu sērija", description: "Mācījies 7 dienas pēc kārtas", unlocked: true },
  { id: "harmony-beginner", title: "Harmonijas iesācējs", description: "Uzzināji D7 un triādes pamatus", unlocked: true },
  { id: "perfect-quiz", title: "Perfect Quiz", description: "Iegūsti 100% uzdevumu risinājumā", unlocked: false },
  { id: "music-master", title: "Music Theory Master", description: "Pabeidz 10 mūzikas tēmas", unlocked: false },
  { id: "xp-1000", title: "1000 XP", description: "Sasniegti 1000 XP", unlocked: true },
];

export const demoPractice = [
  { title: "Dominantes septakords", level: "Vidējais", xp: 25 },
  { title: "Kvadrātvienādojumi", level: "Sākotnējais", xp: 18 },
  { title: "Intervāli", level: "Uzlabots", xp: 30 },
  { title: "Kadences", level: "Vidējais", xp: 22 },
];

export const demoChatMessages: ChatMessage[] = [
  { role: "assistant", content: "Sveiki! Es esmu tavs AI tutors. Uzdo jautājumu par matemātiku, harmoniju, solfedžo vai jebkuru citu tēmu." },
  { role: "user", content: "Kā atrisināt D7 harmonijā?" },
  {
    role: "assistant",
    content: "Dominantes septakords **D7** parasti atrisinās uz toniku. Do mažorā tas ir `G–B–D–F`, un atrisinājums — `C–E–G`.\n\nAkorda spriegumu rada ievadtonis **B**, kas virzās uz **C**, un septīma **F**, kas virzās lejup uz **E**.\n\n| D7 balss | Atrisinājums |\n| --- | --- |\n| B (terca) | C (tonika) |\n| F (septīma) | E (terca) |\n\nFunkciju var pierakstīt arī kā $V^7 \\rightarrow I$.",
  },
];

export function calculateLevel(xp: number) {
  let level = 1;
  let threshold = 100;
  let remaining = xp;

  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.floor(threshold * 1.2);
  }

  return { level, current: remaining, needed: threshold };
}
