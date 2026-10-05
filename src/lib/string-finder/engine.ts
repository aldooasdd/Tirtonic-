/**
 * Tirtonic String Finder — engine (port TypeScript dari reference/engine.js).
 * Pure function, tanpa LLM. Logika, rumus, urutan, dan tie-breaker WAJIB identik
 * dengan kode acuan; output harus lolos reference/test-cases.json.
 */
import type { AttrKey, Answers, Dataset, MetricKey, Phase2Cfg, Rules, StringRow, Swing } from "./types";

const TEN = [40, 51, 62];
const SW: Swing[] = ["S", "M", "F"];
export const CONDITIONS: string[] = TEN.flatMap((t) => SW.map((s) => `${t}${s}`)); // '40S' ... '62F'
const METRICS: MetricKey[] = ["st", "tl", "er", "dw", "sp"];
export const ATTRS: AttrKey[] = ["spin", "power", "control", "comfort", "stability", "durability"];
const SWING_LABEL: Record<string, string> = { S: "lambat", M: "sedang", F: "cepat" };

// Persentil 0–100 (0 = terendah, 100 = tertinggi). Nilai null diabaikan. Seri dapat rata-rata posisi.
function percentileRank(values: (number | null)[]): (number | null)[] {
  const idx = values
    .map((v, i) => [v, i] as [number | null, number])
    .filter((x) => x[0] != null)
    .sort((a, b) => (a[0] as number) - (b[0] as number)) as [number, number][];
  const out: (number | null)[] = new Array(values.length).fill(null);
  const n = idx.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
    const p = n > 1 ? ((i + j) / 2) / (n - 1) * 100 : 50;
    for (let k = i; k <= j; k++) out[idx[k][1]] = p;
    i = j + 1;
  }
  return out;
}

export interface Prepared {
  data: Dataset;
  pct: Record<string, Record<MetricKey, (number | null)[]>>;
  gaugePct: (number | null)[];
  fallbackOrder: Record<string, string[]>;
}

// Dijalankan sekali saat data dimuat (bisa di-cache).
export function prepare(data: Dataset): Prepared {
  const pct: Record<string, Record<MetricKey, (number | null)[]>> = {};
  for (const c of CONDITIONS) {
    pct[c] = {} as Record<MetricKey, (number | null)[]>;
    for (const m of METRICS) pct[c][m] = percentileRank(data.slices[c][m]);
  }
  const gaugePct = percentileRank(data.strings.map((s) => s.g));
  // Urutan kondisi pengganti bila data kondisi customer tidak ada:
  // jarak terdekat (selisih indeks tensi + selisih indeks swing); jika seri, 51F didahulukan.
  const fallbackOrder: Record<string, string[]> = {};
  for (const c of CONDITIONS) {
    const ti = TEN.indexOf(+c.slice(0, 2));
    const si = SW.indexOf(c[2] as Swing);
    const dist = (x: string) => Math.abs(TEN.indexOf(+x.slice(0, 2)) - ti) + Math.abs(SW.indexOf(x[2] as Swing) - si);
    fallbackOrder[c] = CONDITIONS.slice().sort((a, b) => dist(a) - dist(b) || (a === "51F" ? -1 : b === "51F" ? 1 : 0));
  }
  return { data, pct, gaugePct, fallbackOrder };
}

export interface Plan {
  weights: Record<AttrKey, number>;
  filters: { exclude_material: string; reason: string }[];
  condition: string;
  priorities: AttrKey[];
}

// Jawaban customer -> bobot, filter keras, kondisi data.
// extraWeights: nudge opsional (mis. dari karakter raket) ditambah sebelum normalisasi.
export function buildPlan(answers: Answers, rules: Rules, extraWeights?: Partial<Record<AttrKey, number>>): Plan {
  const w: Record<string, number> = { ...rules.base_weights };
  const add = (obj?: Partial<Record<AttrKey, number>>) => {
    for (const k in obj || {}) w[k] = Math.max(0, w[k] + (obj as Record<string, number>)[k]);
  };
  (answers.priorities || []).forEach((p, i) => {
    w[p] += rules.priority_bonus[i] || 0;
  });
  for (const q of ["level", "swing", "arm", "change", "breakage"]) {
    add((rules.adjustments[q] || {})[answers[q] as string]);
  }
  add(extraWeights);
  const total = ATTRS.reduce((s, k) => s + w[k], 0);
  const weights = Object.fromEntries(ATTRS.map((k) => [k, w[k] / total])) as Record<AttrKey, number>;
  const filters: { exclude_material: string; reason: string }[] = [];
  for (const f of rules.hard_filters) {
    const hit = f.when_any.find((cond) => Object.entries(cond).every(([k, v]) => answers[k] === v));
    if (hit) {
      const key = Object.entries(hit)[0].join("=");
      filters.push({ exclude_material: f.exclude_material, reason: f.reason[key] || key });
    }
  }
  const swing = rules.condition_map.swing[answers.swing as string] || "M";
  const tension = rules.condition_map.tension[answers.tension as string] || 51;
  return { weights, filters, condition: `${tension}${swing}`, priorities: answers.priorities || [] };
}

export interface MetricRes {
  p: number;
  raw: number;
  condition: string;
  exact: boolean;
}
type MetricMap = Record<MetricKey, MetricRes | null>;

function metric(P: Prepared, i: number, m: MetricKey, condition: string): MetricRes | null {
  for (const c of P.fallbackOrder[condition]) {
    const p = P.pct[c][m][i];
    if (p != null) return { p, raw: P.data.slices[c][m][i] as number, condition: c, exact: c === condition };
  }
  return null;
}

// Rumus atribut (semua skala 0–100, makin tinggi makin baik untuk atribut itu).
function attributes(M: MetricMap, gaugeP: number | null): Record<AttrKey, number | null> {
  return {
    spin: M.sp ? M.sp.p : null, // spin potential tinggi
    control: M.st ? M.st.p : null, // lebih kaku = lebih terkontrol
    comfort: M.st ? (M.dw ? 0.7 * (100 - M.st.p) + 0.3 * M.dw.p : 100 - M.st.p) : null, // lembut + dwell time panjang
    power: M.st && M.er ? 0.5 * M.er.p + 0.5 * (100 - M.st.p) : null, // energy return tinggi + lembut
    stability: M.tl ? 100 - M.tl.p : null, // tension loss rendah
    durability: gaugeP, // gauge lebih tebal
  };
}

export interface Ranked {
  index: number;
  string: StringRow;
  metrics: MetricMap;
  attrs: Record<AttrKey, number | null>;
  score: number;
  exact: boolean;
  gaugePct: number | null;
  explanation?: Explanation;
  // hanya dipakai di fase 2:
  label?: string;
  product?: Phase2Product;
}

export interface Stats {
  total: number;
  filtered_material: number;
  missing_priority_data: number;
  limited_coverage: number;
  candidates: number;
}

export interface ScoreResult {
  plan: Plan;
  ranked: Ranked[];
  stats: Stats;
  picks?: Ranked[];
  phase2?: Phase2Result;
}

export function scoreAll(P: Prepared, answers: Answers, rules: Rules, extraWeights?: Partial<Record<AttrKey, number>>): ScoreResult {
  const plan = buildPlan(answers, rules, extraWeights);
  const excluded = new Set(plan.filters.map((f) => f.exclude_material));
  const neutral = rules.selection.neutral_percentile_for_missing;
  const stats: Stats = {
    total: P.data.strings.length,
    filtered_material: 0,
    missing_priority_data: 0,
    limited_coverage: 0,
    candidates: 0,
  };
  const ranked: Ranked[] = [];
  P.data.strings.forEach((s, i) => {
    if (
      excluded.has(s.m) ||
      (excluded.size && rules.exclude_unknown_material_when_filtering && s.m === "Tidak diketahui")
    ) {
      stats.filtered_material++;
      return;
    }
    if (rules.selection.exclude_coverage.includes(s.c)) {
      stats.limited_coverage++;
      return;
    }
    const M = Object.fromEntries(METRICS.map((m) => [m, metric(P, i, m, plan.condition)])) as MetricMap;
    const A = attributes(M, P.gaugePct[i]);
    // Atribut prioritas customer WAJIB punya data; kalau tidak, senar tidak boleh direkomendasikan.
    if (plan.priorities.some((p) => A[p] == null)) {
      stats.missing_priority_data++;
      return;
    }
    const score = ATTRS.reduce((sum, k) => sum + plan.weights[k] * (A[k] == null ? neutral : (A[k] as number)), 0);
    const exact = (["st", "tl", "sp"] as MetricKey[]).every((m) => !M[m] || (M[m] as MetricRes).exact);
    ranked.push({ index: i, string: s, metrics: M, attrs: A, score, exact, gaugePct: P.gaugePct[i] });
  });
  ranked.sort(
    (a, b) => b.score - a.score || (Number(b.exact) - Number(a.exact)) || a.string.n.localeCompare(b.string.n),
  );
  stats.candidates = ranked.length;
  return { plan, ranked, stats };
}

function onePerFamily(ranked: Ranked[]): Ranked[] {
  const seen = new Set<string>();
  const out: Ranked[] = [];
  for (const r of ranked) {
    if (seen.has(r.string.f)) continue;
    seen.add(r.string.f);
    out.push(r);
  }
  return out;
}

// FASE 1: 3 senar dengan skor tertinggi, masing-masing dari keluarga senar berbeda.
export function recommend(P: Prepared, answers: Answers, rules: Rules, extraWeights?: Partial<Record<AttrKey, number>>): ScoreResult {
  const res = scoreAll(P, answers, rules, extraWeights);
  const pool = rules.selection.one_per_family ? onePerFamily(res.ranked) : res.ranked;
  res.picks = pool.slice(0, rules.selection.top_n).map((r) => ({ ...r, explanation: explain(r, res.plan) }));
  return res;
}

// ---- Fase 2 ----
export interface Phase2Product {
  price_per_set: number;
  sold_90d: number;
  in_stock: boolean;
}
export interface Phase2Item {
  string: { n: string; f: string };
  score: number;
  product: Phase2Product;
  [k: string]: unknown;
}
export interface Phase2Result {
  picks: (Phase2Item & { label: string })[];
  best_match: Phase2Item | null;
  threshold: number | null;
}

// FASE 2: dari kelompok "cocok", pilih Terlaris, Premium (termahal), Paling hemat (termurah).
// products: { [nama senar TWU]: { price_per_set, sold_90d, in_stock } }
export function recommendPhase2(
  P: Prepared,
  answers: Answers,
  rules: Rules,
  products: Record<string, Phase2Product>,
): ScoreResult {
  const res = scoreAll(P, answers, rules);
  const cfg = rules.phase2;
  const avail = onePerFamily(res.ranked.filter((r) => products[r.string.n] && products[r.string.n].in_stock));
  const items = avail.map((r) => ({ ...r, product: products[r.string.n] })) as unknown as Phase2Item[];
  res.phase2 = selectPhase2(items, cfg);
  res.phase2.picks.forEach((p) => {
    (p as unknown as Ranked).explanation = explain(p as unknown as Ranked, res.plan);
  });
  return res;
}

// Terpisah supaya bisa dites dengan data sintetis. items sudah terurut skor turun & 1 per keluarga.
export function selectPhase2(items: Phase2Item[], cfg: Phase2Cfg): Phase2Result {
  if (!items.length) return { picks: [], best_match: null, threshold: null };
  const top = items[0].score;
  let t = cfg.pool_threshold;
  let pool = items.filter((x) => x.score >= t * top);
  while (pool.length < 3 && t - cfg.pool_step >= cfg.pool_floor - 1e-9) {
    t -= cfg.pool_step;
    pool = items.filter((x) => x.score >= t * top);
  }
  const left = pool.slice();
  const picks: (Phase2Item & { label: string })[] = [];
  const take = (label: string, cmp: (a: Phase2Item, b: Phase2Item) => number) => {
    if (!left.length) return;
    left.sort((a, b) => cmp(a, b) || b.score - a.score);
    picks.push({ ...(left.shift() as Phase2Item), label });
  };
  take(cfg.labels.bestseller, (a, b) => b.product.sold_90d - a.product.sold_90d);
  take(cfg.labels.premium, (a, b) => b.product.price_per_set - a.product.price_per_set);
  take(cfg.labels.budget, (a, b) => a.product.price_per_set - b.product.price_per_set);
  const bestMatch = pool[0];
  return {
    picks,
    best_match: picks.some((p) => p.string.n === bestMatch.string.n) ? null : bestMatch,
    threshold: +t.toFixed(2),
  };
}

// ---- Penjelasan berbasis angka (template, bukan AI) ----
const fmt = (x: number, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace(".", ",");
const r0 = (x: number) => Math.min(99, Math.max(1, Math.round(x))); // hindari "lebih ... dari 100% senar"

function strengthText(k: AttrKey, r: Ranked, others: AttrKey[] = []): string {
  const M = r.metrics;
  switch (k) {
    case "spin":
      return `Potensi spin lebih tinggi dari ${r0((M.sp as MetricRes).p)}% senar yang diuji (nilai ${fmt((M.sp as MetricRes).raw)}).`;
    case "comfort":
      return `Lebih lembut dari ${r0(100 - (M.st as MetricRes).p)}% senar yang diuji (stiffness ${fmt((M.st as MetricRes).raw, 0)} lb/in).`;
    case "control":
      return `Lebih kaku dari ${r0((M.st as MetricRes).p)}% senar, jadi arah bola lebih mudah dijaga (stiffness ${fmt((M.st as MetricRes).raw, 0)} lb/in).`;
    case "power":
      return (M.er as MetricRes).p >= 100 - (M.st as MetricRes).p || others.includes("comfort")
        ? `Mengembalikan energi lebih baik dari ${r0((M.er as MetricRes).p)}% senar (energy return ${fmt((M.er as MetricRes).raw)}%).`
        : `Lentur (lebih lembut dari ${r0(100 - (M.st as MetricRes).p)}% senar), membantu bola melaju lebih jauh.`;
    case "stability":
      return `Tensinya lebih awet dari ${r0(100 - (M.tl as MetricRes).p)}% senar (tension loss ${fmt((M.tl as MetricRes).raw)}%).`;
    case "durability":
      return `Lebih tebal dari ${r0(r.gaugePct as number)}% senar (${fmt(r.string.g as number, 2)} mm), jadi lebih tahan putus.`;
  }
}

function weaknessText(k: AttrKey, r: Ranked): string {
  const M = r.metrics;
  switch (k) {
    case "spin":
      return `Potensi spin di bawah rata-rata (lebih rendah dari ${r0(100 - (M.sp as MetricRes).p)}% senar).`;
    case "comfort":
      return `Cukup kaku (lebih kaku dari ${r0((M.st as MetricRes).p)}% senar). Perhatikan kalau lengan mudah pegal.`;
    case "control":
      return `Senarnya lembut, jadi bola cenderung melaju lebih jauh dan butuh kontrol dari ayunan.`;
    case "power":
      return `Power di bawah rata-rata; kedalaman bola lebih banyak bergantung pada ayunan Anda.`;
    case "stability":
      return `Tensi turun cukup cepat (tension loss ${fmt((M.tl as MetricRes).raw)}%), sebaiknya diganti lebih rutin.`;
    case "durability":
      return `Gauge tipis (${fmt(r.string.g as number, 2)} mm), lebih cepat putus kalau sering topspin.`;
  }
}

export interface Explanation {
  strengths: { attr: AttrKey; text: string }[];
  weakness: { attr: AttrKey | null; text: string };
  notes: string[];
}

export function explain(r: Ranked, plan: Plan): Explanation {
  const A = r.attrs;
  const W = plan.weights;
  const cand = ATTRS.filter((k) => A[k] != null && W[k] >= 0.1).sort((a, b) => W[b] * (A[b] as number) - W[a] * (A[a] as number));
  let strengths = cand.filter((k) => (A[k] as number) >= 60).slice(0, 2);
  if (!strengths.length && cand.length) strengths = [cand.slice().sort((a, b) => (A[b] as number) - (A[a] as number))[0]];
  const weakCand = ATTRS.filter(
    (k) => A[k] != null && (A[k] as number) < 35 && !strengths.includes(k) && (k !== "durability" || W[k] >= 0.1),
  ).sort((a, b) => Math.max(W[b], 0.05) * (50 - (A[b] as number)) - Math.max(W[a], 0.05) * (50 - (A[a] as number)));
  const notes: string[] = [];
  const nonExact = (["st", "tl", "sp", "er", "dw"] as MetricKey[]).map((m) => r.metrics[m]).filter((x) => x && !x.exact) as MetricRes[];
  if (nonExact.length) {
    const c = nonExact[0].condition;
    notes.push(`Data lab untuk tensi dan ayunan Anda belum tersedia; dihitung dari pengujian ${c.slice(0, 2)} lbs, swing ${SWING_LABEL[c[2]]}.`);
  }
  if (!r.metrics.sp) notes.push("Potensi spin senar ini tidak diukur di data lab.");
  return {
    strengths: strengths.map((k) => ({ attr: k, text: strengthText(k, r, strengths) as string })),
    weakness: weakCand.length
      ? { attr: weakCand[0], text: weaknessText(weakCand[0], r) as string }
      : { attr: null, text: "Tidak ada kelemahan menonjol untuk kebutuhan Anda." },
    notes,
  };
}
