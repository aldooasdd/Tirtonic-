// Konsep raket: customer isi sendiri head size + jenis raket (power/spin/control).
// Tidak ada database merek — penyesuaian tarikan & bobot senar dihitung langsung
// dari dua variabel itu. Statis & deterministik.
import type { AttrKey } from "./types";

export type RacketType = "power" | "spin" | "control";
export type RacketInput = { head?: number | null; type?: RacketType | null };

export const RACKET_TYPES: { key: RacketType; label: string }[] = [
  { key: "power", label: "Power" },
  { key: "spin", label: "Spin" },
  { key: "control", label: "Control" },
];

const HEAD_MIN = 85;
const HEAD_MAX = 125;
export const validHead = (h?: number | null): h is number => typeof h === "number" && h >= HEAD_MIN && h <= HEAD_MAX;
export const hasRacketInput = (r?: RacketInput | null): boolean => !!r && (validHead(r.head) || !!r.type);

const typeLabel = (t?: RacketType | null) => RACKET_TYPES.find((x) => x.key === t)?.label ?? null;

/** Label ringkas untuk disimpan/ditampilkan, mis. "Power · 100 in²". */
export function racketLabel(r?: RacketInput | null): string | null {
  if (!hasRacketInput(r)) return null;
  const parts: string[] = [];
  const t = typeLabel(r!.type);
  if (t) parts.push(t);
  if (validHead(r!.head)) parts.push(`${r!.head} in²`);
  return parts.join(" · ") || null;
}

/** Penyesuaian tarikan (lbs) dari head size + jenis raket. */
export function racketTensionDelta(r: RacketInput): { delta: number; note: string } {
  // ponytail: ambang heuristik — setel kalau feedback stringer bilang perlu.
  let d = 0;
  const n: string[] = [];
  if (validHead(r.head)) {
    if (r.head >= 105) { d += 2; n.push(`head besar (${r.head} in²) → tarikan dinaikkan untuk kontrol`); }
    else if (r.head <= 95) { d -= 1; n.push(`head kecil (${r.head} in²) → tarikan sedikit diturunkan`); }
  }
  if (r.type === "power") { d += 1; n.push("raket power → tarikan dinaikkan agar lebih terkontrol"); }
  else if (r.type === "control") { d -= 1; n.push("raket control → tarikan diturunkan untuk tambahan power & kenyamanan"); }
  return { delta: d, note: n.join("; ") };
}

/**
 * Nudge bobot atribut senar dari karakter raket (ditambahkan ke plan engine, kecil
 * supaya jawaban customer tetap dominan — bandingkan base 10, prioritas 40).
 * Logika: senar menyeimbangkan karakter raket.
 */
export function racketStringWeights(r: RacketInput): Partial<Record<AttrKey, number>> {
  const w: Partial<Record<AttrKey, number>> = {};
  const add = (k: AttrKey, v: number) => { w[k] = (w[k] ?? 0) + v; };
  if (validHead(r.head)) {
    if (r.head >= 105) { add("control", 6); add("power", -4); } // head besar = powerful → kontrol
    else if (r.head <= 95) add("power", 5);                     // head kecil = kurang power → bantu power
  }
  if (r.type === "power") add("control", 6);                    // raket power → senar ke kontrol
  else if (r.type === "spin") add("spin", 6);                   // raket spin → senar perkuat spin
  else if (r.type === "control") { add("power", 5); add("comfort", 2); } // raket control → tambah power & nyaman
  return w;
}

export function racketStringNote(r: RacketInput): string {
  const n: string[] = [];
  if (validHead(r.head) && r.head >= 105) n.push("lebih mengutamakan kontrol");
  else if (validHead(r.head) && r.head <= 95) n.push("sedikit menambah power");
  if (r.type === "power") n.push("menyeimbangkan raket power ke kontrol");
  else if (r.type === "spin") n.push("menonjolkan spin");
  else if (r.type === "control") n.push("menambah power & kenyamanan");
  return n.join(", ");
}

// ponytail: cek sanity
export function _demo(): void {
  const big = racketTensionDelta({ head: 110, type: "power" }).delta;
  const small = racketTensionDelta({ head: 93, type: "control" }).delta;
  console.assert(big > small, "head besar + power > head kecil + control");
  console.assert(racketStringWeights({ type: "spin" }).spin === 6, "spin → spin+6");
  console.assert(hasRacketInput({ head: 100 }) && !hasRacketInput({}), "deteksi input");
  console.assert(racketLabel({ type: "power", head: 100 }) === "Power · 100 in²", "label");
}
