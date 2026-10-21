// Konsep raket: customer isi head size saja. Tidak ada jenis (power/spin/control)
// dan tidak ada database merek — penyesuaian tarikan & bobot senar dihitung langsung
// dari head size. Statis & deterministik.
import type { AttrKey } from "./types";

export type RacketInput = { head?: number | null };

const HEAD_MIN = 85;
const HEAD_MAX = 125;
export const validHead = (h?: number | null): h is number => typeof h === "number" && h >= HEAD_MIN && h <= HEAD_MAX;
export const hasRacketInput = (r?: RacketInput | null): boolean => !!r && validHead(r.head);

/** Label ringkas untuk disimpan/ditampilkan, mis. "100 in²". */
export function racketLabel(r?: RacketInput | null): string | null {
  return validHead(r?.head) ? `${r!.head} in²` : null;
}

/** Penyesuaian tarikan (lbs) dari head size. */
export function racketTensionDelta(r: RacketInput): { delta: number; note: string } {
  // ponytail: ambang heuristik — setel kalau feedback stringer bilang perlu.
  if (!validHead(r.head)) return { delta: 0, note: "" };
  if (r.head >= 105) return { delta: 2, note: `head besar (${r.head} in²) → tarikan dinaikkan untuk kontrol` };
  if (r.head <= 95) return { delta: -1, note: `head kecil (${r.head} in²) → tarikan sedikit diturunkan` };
  return { delta: 0, note: "" };
}

/**
 * Nudge bobot atribut senar dari head size (ditambahkan ke plan engine, kecil
 * supaya jawaban customer tetap dominan). Senar menyeimbangkan karakter raket.
 */
export function racketStringWeights(r: RacketInput): Partial<Record<AttrKey, number>> {
  if (!validHead(r.head)) return {};
  if (r.head >= 105) return { control: 6, power: -4 }; // head besar = powerful → kontrol
  if (r.head <= 95) return { power: 5 };               // head kecil = kurang power → bantu power
  return {};
}

export function racketStringNote(r: RacketInput): string {
  if (validHead(r.head) && r.head >= 105) return "lebih mengutamakan kontrol";
  if (validHead(r.head) && r.head <= 95) return "sedikit menambah power";
  return "";
}

// ponytail: cek sanity
export function _demo(): void {
  const big = racketTensionDelta({ head: 110 }).delta;
  const small = racketTensionDelta({ head: 93 }).delta;
  console.assert(big > small, "head besar > head kecil");
  console.assert(racketStringWeights({ head: 110 }).control === 6, "head besar → control+6");
  console.assert(hasRacketInput({ head: 100 }) && !hasRacketInput({}), "deteksi input");
  console.assert(racketLabel({ head: 100 }) === "100 in²", "label");
}
