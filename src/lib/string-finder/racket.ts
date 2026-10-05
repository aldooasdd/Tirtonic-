// Lookup spek raket (dari TWU, lihat docs/string-finder/data/rackets-twu-specs.csv)
// + hitung penyesuaian tarikan berdasar kekakuan frame (flex/RDC) & head size.
// Statis (tanpa DB). Raket yang tak ketemu → null → fallback ke saran kuesioner.
import specs from "./rackets-specs.json";

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

// ponytail: cek sanity
export function _demo(): void {
  const stiff = { label: "x", head: 100, weight: 300, flex: 72 };
  const flexy = { label: "y", head: 100, weight: 300, flex: 58 };
  console.assert(racketTensionDelta(stiff).delta < racketTensionDelta(flexy).delta, "kaku < lentur");
  console.assert(lookupRacket("Babolat Pure Aero")?.flex === 70, "lookup Pure Aero");
  console.assert(lookupRacket("raket ngasal 123") === null, "tak ketemu → null");
}
