// DTO yang dikirim ke browser dari /api/recommend. Hanya 3 pilihan — dataset lengkap TIDAK dikirim.
import type { AttrKey } from "./types";
import type { Explanation } from "./engine";

export interface LabMetric {
  raw: number;
  condition: string;
  exact: boolean;
}

export interface PickDTO {
  name: string;
  material: string;
  gauge: number | null;
  price: number | null;
  score: number;
  attrs: Record<AttrKey, number | null>;
  metrics: Record<"st" | "tl" | "er" | "dw" | "sp", LabMetric | null>;
  explanation: Explanation;
}

export interface RecommendResponse {
  code: string;
  condition: string;
  profile_summary: string;
  picks: PickDTO[];
}
