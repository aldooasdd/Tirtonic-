// Saran tarikan senar (lbs) dari jawaban kuesioner. Deterministik (tanpa AI).
// Customer boleh menimpa angka ini. Penyesuaian poly dilakukan di sisi klien saat
// senar dipilih (poly dimainkan lebih rendah demi kenyamanan).
import type { Answers } from "./types";
import { racketTensionDelta, type RacketSpec } from "./racket";

const BASE: Record<string, number> = { rendah: 46, sedang: 52, tinggi: 58, tidaktahu: 50 };
const MIN = 40;
const MAX = 62;

/** Penyesuaian tarikan dari jawaban (dipakai dgn basis dari kuesioner ATAU rentang raket). */
export function tensionAdjustment(answers: Answers): number {
  let d = 0;
  if (answers.arm === "cedera") d -= 3;
  else if (answers.arm === "pegal") d -= 1;
  if (answers.level === "pemula") d -= 1;
  const pri = Array.isArray(answers.priorities) ? answers.priorities : [];
  const ADJ: Record<string, number> = { control: 2, power: -2, spin: -1, comfort: -1, stability: 1 };
  pri.forEach((p, i) => { d += (ADJ[p] ?? 0) * (i === 0 ? 1 : 0.5); });
  return d;
}

export function suggestTension(answers: Answers, racket?: RacketSpec | null): { lbs: number; note: string; racketNote?: string } {
  let t = (BASE[String(answers.tension ?? "tidaktahu")] ?? 50) + tensionAdjustment(answers);
  let racketNote: string | undefined;
  if (racket) {
    const r = racketTensionDelta(racket);
    t += r.delta;
    if (r.note) racketNote = r.note;
  }

  const lbs = Math.max(MIN, Math.min(MAX, Math.round(t)));
  const note =
    lbs <= 48 ? "lebih rendah untuk power & kenyamanan"
    : lbs >= 56 ? "lebih tinggi untuk kontrol"
    : "seimbang antara kontrol dan kenyamanan";
  return { lbs, note, racketNote };
}

// ponytail: cek sanity sederhana
export function _demo(): void {
  const a = (o: Partial<Answers>) => suggestTension({ level: "rutin", swing: "sedang", priorities: [], arm: "tidak", change: "sedang", breakage: "tidak", tension: "sedang", ...o } as Answers).lbs;
  console.assert(a({ tension: "rendah" }) < a({ tension: "tinggi" }), "rendah < tinggi");
  console.assert(a({ arm: "cedera" }) < a({ arm: "tidak" }), "cedera lebih rendah");
  console.assert(a({ priorities: ["control"] }) > a({ priorities: ["power"] }), "kontrol > power");
  console.assert(a({}) >= 40 && a({}) <= 62, "dalam rentang");
}
