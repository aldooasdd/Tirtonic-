// Lookup spek raket (dari TWU, lihat docs/string-finder/data/rackets-twu-specs.csv)
// + hitung penyesuaian tarikan berdasar kekakuan frame (flex/RDC) & head size.
// Statis (tanpa DB). Raket yang tak ketemu → null → fallback ke saran kuesioner.
import specs from "./rackets-specs.json";
import type { AttrKey } from "./types";

export type RacketSpec = { label: string; head: number; weight: number; flex: number };

const MAP = specs as Record<string, RacketSpec>;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function lookupRacket(name?: string | null): RacketSpec | null {
  if (!name) return null;
  return MAP[norm(name)] ?? null;
}

/** Penyesuaian tarikan dari karakter raket. flex = RDC (makin tinggi makin kaku), head in². */
export function racketTensionDelta(r: RacketSpec): { delta: number; note: string } {
  // ponytail: ambang heuristik — setel kalau feedback stringer bilang perlu.
  let d = 0;
  const n: string[] = [];
  if (r.flex >= 68) { d -= 2; n.push(`raket kaku (flex ${r.flex}) → tarikan diturunkan untuk kenyamanan`); }
  else if (r.flex <= 61) { d += 1; n.push(`raket lentur (flex ${r.flex}) → bisa sedikit lebih tinggi untuk kontrol`); }
  if (r.head >= 105) { d += 2; n.push(`head besar (${r.head} in²) → tarikan dinaikkan untuk kontrol`); }
  else if (r.head <= 95) { d -= 1; n.push(`head kecil (${r.head} in²) → tarikan sedikit diturunkan`); }
  return { delta: d, note: n.join("; ") };
}

/**
 * Nudge bobot atribut senar dari karakter raket (ditambahkan ke plan engine, kecil
 * supaya jawaban customer tetap dominan). Grounded di flex (kekakuan) & head (power).
 */
export function racketStringWeights(r: RacketSpec): Partial<Record<AttrKey, number>> {
  const w: Partial<Record<AttrKey, number>> = {};
  const add = (k: AttrKey, v: number) => { w[k] = (w[k] ?? 0) + v; };
  // ponytail: ambang & bobot heuristik — kecil (bandingkan base 10, prioritas 40).
  if (r.flex >= 68) add("comfort", 8);            // frame kaku → senar lebih lembut (redam shock)
  else if (r.flex >= 64) add("comfort", 4);
  if (r.head >= 105) { add("control", 6); add("power", -4); } // head besar = powerful → kontrol
  else if (r.head <= 95) add("power", 5);         // head kecil = kurang power → senar bantu power
  return w;
}

export function racketStringNote(r: RacketSpec): string {
  const n: string[] = [];
  if (r.flex >= 64) n.push("condong ke senar lebih nyaman");
  if (r.head >= 105) n.push("lebih mengutamakan kontrol");
  else if (r.head <= 95) n.push("sedikit menambah power");
  return n.join(", ");
}

// ponytail: cek sanity
export function _demo(): void {
  const stiff = { label: "x", head: 100, weight: 300, flex: 72 };
  const flexy = { label: "y", head: 100, weight: 300, flex: 58 };
  console.assert(racketTensionDelta(stiff).delta < racketTensionDelta(flexy).delta, "kaku < lentur");
  console.assert(lookupRacket("Babolat Pure Aero")?.flex === 70, "lookup Pure Aero");
  console.assert(lookupRacket("raket ngasal 123") === null, "tak ketemu → null");
}
