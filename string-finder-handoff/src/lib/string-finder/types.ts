// Tipe bersama untuk engine & slip. Bentuk data mengikuti data/strings.json.

export type Swing = "S" | "M" | "F";
export type MetricKey = "st" | "tl" | "er" | "dw" | "sp";
export type AttrKey = "spin" | "power" | "control" | "comfort" | "stability" | "durability";

export interface StringRow {
  n: string; // name
  f: string; // family
  m: string; // material
  c: string; // data_coverage
  g: number | null; // gauge_mm
  p?: number | null; // price_idr (harga 1 set)
}

export interface Slice {
  st: (number | null)[];
  tl: (number | null)[];
  er: (number | null)[];
  dw: (number | null)[];
  sp: (number | null)[];
}

export interface Dataset {
  source?: unknown;
  strings: StringRow[];
  slices: Record<string, Slice>;
}

export interface HardFilter {
  exclude_material: string;
  when_any: Record<string, string>[];
  reason: Record<string, string>;
}

export interface Phase2Cfg {
  pool_threshold: number;
  pool_floor: number;
  pool_step: number;
  labels: { bestseller: string; premium: string; budget: string };
}

export interface SlipFlag {
  when?: Record<string, string>;
  when_pick?: { stability_below?: number; gauge_below?: number; estimated?: boolean };
  text: string;
}

export interface SlipRules {
  note?: string;
  paper_default: string;
  code_prefix: string;
  code_alphabet: string;
  code_length: number;
  handwritten_fields: string[];
  flags: SlipFlag[];
}

export interface Rules {
  version: number;
  note?: string;
  base_weights: Record<AttrKey, number>;
  priority_bonus: number[];
  adjustments: Record<string, Record<string, Partial<Record<AttrKey, number>>>>;
  hard_filters: HardFilter[];
  exclude_unknown_material_when_filtering: boolean;
  condition_map: { swing: Record<string, Swing>; tension: Record<string, number> };
  selection: {
    phase: number;
    top_n: number;
    one_per_family: boolean;
    exclude_coverage: string[];
    neutral_percentile_for_missing: number;
  };
  phase2: Phase2Cfg;
  slip: SlipRules;
}

export interface Answers {
  level?: string;
  swing?: string;
  priorities?: AttrKey[];
  arm?: string;
  change?: string;
  breakage?: string;
  tension?: string;
  [k: string]: unknown;
}
