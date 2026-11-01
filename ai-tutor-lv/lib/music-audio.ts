// Latvian note names: H is the natural si, B is si-flat.
const noteOffsets: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 10,
  H: 11,
};

const syllableNotes: Record<string, string> = {
  do: "C",
  re: "D",
  mi: "E",
  fa: "F",
  sol: "G",
  la: "A",
  si: "H",
};

const noteSequencePattern = /\b((?:Do|Re|Mi|Fa|Sol|La|Si|[A-H](?:#|b)?)(?:\s*[-–—]\s*(?:Do|Re|Mi|Fa|Sol|La|Si|[A-H](?:#|b)?)){2,3})\b/gi;

let audioContext: AudioContext | null = null;

export function findNoteSequences(text: string): string[] {
  return [...new Set([...text.matchAll(noteSequencePattern)].map(([sequence]) => sequence))];
}

function noteFrequency(token: string): number {
  const normalized = token.toLowerCase();
  const isSolfeggio = normalized in syllableNotes;
  const noteName = isSolfeggio ? syllableNotes[normalized] : token[0].toUpperCase();
  const accidental = isSolfeggio ? "" : token.slice(1).toLowerCase();
  // International "Bb" already means si-flat, so it must not be lowered twice.
  const semitoneOffset = normalized === "bb" ? 0 : accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = 60 + noteOffsets[noteName] + semitoneOffset;
  return 440 * 2 ** ((midi - 69) / 12);
}

export async function playNoteSequence(sequence: string): Promise<void> {
  const context = audioContext ?? new AudioContext();
  audioContext = context;
  await context.resume();

  const notes = sequence.split(/\s*[-–—]\s*/).map(noteFrequency);
  const now = context.currentTime;
  const duration = 1.2;

  for (const frequency of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12 / notes.length, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
