// Konsep raket: customer isi sendiri head size + jenis raket (power/spin/control).
// Tidak ada database merek — penyesuaian tarikan & bobot senar dihitung langsung
// dari dua variabel itu. Statis & deterministik.
import type { AttrKey } from "./types";

export type RacketType = "power" | "spin" | "control";
// Jenis raket bisa lebih dari satu (mis. spin+control). `types` = daftar yang dipilih.
export type RacketInput = { head?: number | null; types?: RacketType[] | null };

export const RACKET_TYPES: { key: RacketType; label: string }[] = [
  { key: "power", label: "Power" },
  { key: "spin", label: "Spin" },
  { key: "control", label: "Control" },
];

const HEAD_MIN = 85;
const HEAD_MAX = 125;
export const validHead = (h?: number | null): h is number => typeof h === "number" && h >= HEAD_MIN && h <= HEAD_MAX;
export const hasRacketInput = (r?: RacketInput | null): boolean => !!r && (validHead(r.head) || !!(r.types && r.types.length));

const typesOf = (r?: RacketInput | null): RacketType[] => r?.types ?? [];
const typesLabel = (ts: RacketType[]) => ts.map((t) => RACKET_TYPES.find((x) => x.key === t)?.label).filter(Boolean).join(" + ");

/** Label ringkas untuk disimpan/ditampilkan, mis. "Spin + Control · 100 in²". */
export function racketLabel(r?: RacketInput | null): string | null {
  if (!hasRacketInput(r)) return null;
  const parts: string[] = [];
  const t = typesLabel(typesOf(r));
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
  const ts = typesOf(r);
  if (ts.includes("power")) { d += 1; n.push("raket power → tarikan dinaikkan agar lebih terkontrol"); }
  if (ts.includes("control")) { d -= 1; n.push("raket control → tarikan diturunkan untuk tambahan power & kenyamanan"); }
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
  const ts = typesOf(r);
  if (ts.includes("power")) add("control", 6);                  // raket power → senar ke kontrol
  if (ts.includes("spin")) add("spin", 6);                      // raket spin → senar perkuat spin
  if (ts.includes("control")) { add("power", 5); add("comfort", 2); } // raket control → tambah power & nyaman
  return w;
}

export function racketStringNote(r: RacketInput): string {
  const n: string[] = [];
  if (validHead(r.head) && r.head >= 105) n.push("lebih mengutamakan kontrol");
  else if (validHead(r.head) && r.head <= 95) n.push("sedikit menambah power");
  const ts = typesOf(r);
  if (ts.includes("power")) n.push("menyeimbangkan raket power ke kontrol");
  if (ts.includes("spin")) n.push("menonjolkan spin");
  if (ts.includes("control")) n.push("menambah power & kenyamanan");
  return n.join(", ");
}

// ponytail: cek sanity
export function _demo(): void {
  const big = racketTensionDelta({ head: 110, types: ["power"] }).delta;
  const small = racketTensionDelta({ head: 93, types: ["control"] }).delta;
  console.assert(big > small, "head besar + power > head kecil + control");
  console.assert(racketStringWeights({ types: ["spin"] }).spin === 6, "spin → spin+6");
  console.assert(hasRacketInput({ head: 100 }) && !hasRacketInput({}), "deteksi input");
  console.assert(racketLabel({ types: ["power"], head: 100 }) === "Power · 100 in²", "label");
  console.assert(racketLabel({ types: ["spin", "control"] }) === "Spin + Control", "label multi");
  console.assert(racketStringWeights({ types: ["spin", "control"] }).spin === 6 && racketStringWeights({ types: ["spin", "control"] }).power === 5, "spin+control gabung");
}
