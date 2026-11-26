// Bagian murni fitur /bandingkan (aman diimpor client).
export const KATEGORI = {
  raket: { label: "Raket", kriteria: ["Power", "Kontrol", "Kenyamanan", "Spin", "Toleransi", "Manuver", "Stabilitas"] },
  senar: { label: "Senar", kriteria: ["Power", "Kontrol", "Kenyamanan", "Spin", "Tahan tension", "Ketahanan"] },
  sepatu: { label: "Sepatu", kriteria: ["Kenyamanan", "Stabilitas", "Ketahanan", "Dinamis"] },
} as const;
export type Kat = keyof typeof KATEGORI;
export const isKat = (k: unknown): k is Kat => typeof k === "string" && k in KATEGORI;

export const SUMBER: Record<string, string> = {
  extreme: "Extreme Tennis X-Compare",
  twu: "Tennis Warehouse University",
  tw: "Tennis Warehouse",
  runrepeat: "RunRepeat",
};

export type Item = {
  id: string;
  kategori: Kat;
  nama: string;
  varian: string;
  href: string;
  foto: string | null;
  ready: boolean;
  harga: number;
  skor: number | null;
  nilai: Record<string, number>;
  spek: Record<string, string>;
  sumber: string[];
};

/** Legenda skor Tirtoniclab (0-100). */
export const tingkat = (n: number) =>
  n >= 85 ? { label: "Exceptional", cls: "bg-emerald-600 text-white" }
  : n >= 70 ? { label: "Sangat baik", cls: "bg-emerald-100 text-emerald-800" }
  : n >= 55 ? { label: "Cukup", cls: "bg-amber-100 text-amber-800" }
  : { label: "Rendah", cls: "bg-red-100 text-red-700" };


/** Nama varian tanpa ukuran grip: "100 / 300g - G2", "100L/285g (G1)", "100 / 265gr G3" → model saja. */
export const tanpaGrip = (w: string) =>
  w.replace(/\s*(-\s*G\d?|\(G?\d?\)|\bG\d)\s*$/i, "").replace(/\s*\(\)\s*$/, "").trim();
