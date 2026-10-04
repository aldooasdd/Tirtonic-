// Cocokkan input raket (teks bebas) ke RacketSpec + turunkan saran tarikan & panduan
// tipe senar. Spec faktual; logika matching milik kita. Tidak mengubah ranking engine.
import type { Answers } from "./types";
import { tensionAdjustment } from "./tension";

export interface RacketLite {
  slug: string;
  brand: string;
  model: string;
  pattern: string;
  stiffnessRa: number | null;
  tensionMinLbs: number;
  tensionMaxLbs: number;
  stringType: string; // "Polyester" | "Multifilament" | "Any"
  powerLevel: string; // "Low" | "Medium" | "High"
  aliases: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const compact = (s: string) => norm(s).replace(/ /g, "");

/** Pencocokan paling spesifik menang (target terpanjang yang jadi substring input). */
export function matchRacket(input: string, rackets: RacketLite[]): RacketLite | null {
  const ci = compact(input);
  if (ci.length < 3) return null;
  let best: RacketLite | null = null;
  let bestLen = 0;
  for (const r of rackets) {
    const targets = [r.model, ...r.aliases];
    for (const t of targets) {
      const ct = compact(t);
      if (ct.length >= 4 && ci.includes(ct) && ct.length > bestLen) {
        best = r;
        bestLen = ct.length;
      }
    }
  }
  return best;
}

export interface RacketSetup {
  racket: { brand: string; model: string } | null;
  tensionLbs: number;
  tensionNote: string;
  racketNote: string | null; // panduan khusus raket (null kalau tak terdeteksi)
}

/** Saran tarikan + panduan. Kalau raket terdeteksi, basis dari rentang tarikan raket. */
export function suggestSetup(answers: Answers, racket: RacketLite | null): RacketSetup {
  const BASE: Record<string, number> = { rendah: 46, sedang: 52, tinggi: 58, tidaktahu: 50 };
  let base: number;
  let stiffAdj = 0;
  if (racket) {
    base = Math.round((racket.tensionMinLbs + racket.tensionMaxLbs) / 2);
    if (racket.stiffnessRa != null && racket.stiffnessRa >= 68) stiffAdj -= 1; // frame kaku → sedikit turun demi kenyamanan
  } else {
    base = BASE[String(answers.tension ?? "tidaktahu")] ?? 50;
  }
  let t = base + stiffAdj + tensionAdjustment(answers);
  // batasi ke rentang raket (bila ada), lalu batas umum
  if (racket) t = Math.max(racket.tensionMinLbs, Math.min(racket.tensionMaxLbs, t));
  const lbs = Math.max(40, Math.min(62, Math.round(t)));

  const tensionNote =
    lbs <= 48 ? "lebih rendah untuk power & kenyamanan"
    : lbs >= 56 ? "lebih tinggi untuk kontrol"
    : "seimbang antara kontrol dan kenyamanan";

  let racketNote: string | null = null;
  if (racket) {
    const bits: string[] = [];
    const stiff = racket.stiffnessRa != null && racket.stiffnessRa >= 68;
    const flex = racket.stiffnessRa != null && racket.stiffnessRa <= 60;
    const armSensitive = answers.arm === "cedera" || answers.arm === "pegal";

    if (stiff || armSensitive) bits.push("frame terasa cukup kaku atau lengan sensitif — senar lembut (multifilament/co-poly halus) + tarikan agak rendah lebih nyaman");
    else if (racket.stringType === "Polyester") bits.push("cocok dengan senar polyester (co-poly) untuk kontrol & spin");
    else if (flex) bits.push("frame lentur & nyaman — bebas pakai co-poly untuk kontrol ekstra");

    if (/18x20/.test(racket.pattern)) bits.push("pola rapat (18x20): kontrol & awet, spin sedikit berkurang");
    else bits.push("pola terbuka: mendukung spin");

    racketNote = `${racket.brand} ${racket.model} — ${bits.join("; ")}.`;
  }

  return { racket: racket ? { brand: racket.brand, model: racket.model } : null, tensionLbs: lbs, tensionNote, racketNote };
}
