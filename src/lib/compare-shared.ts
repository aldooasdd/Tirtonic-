// Bagian murni fitur /bandingkan (aman diimpor client).
export const KATEGORI = {
  raket: { label: "Raket", kriteria: ["Power", "Kontrol", "Kenyamanan", "Spin", "Toleransi", "Manuver", "Stabilitas"] },
  senar: { label: "Senar", kriteria: ["Power", "Kontrol", "Kenyamanan", "Spin", "Tahan tension", "Ketahanan"] },
  sepatu: { label: "Sepatu", kriteria: ["Kenyamanan", "Stabilitas", "Ketahanan", "Dinamis"] },
} as const;
export type Kat = keyof typeof KATEGORI;
export const isKat = (k: unknown): k is Kat => typeof k === "string" && k in KATEGORI;

export const SUMBER: Record<string, string> = {
  extreme: "Extreme Tennis",
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

/** n item paling mirip dengan `a` (jarak euclid rata-rata pada kriteria yang sama-sama ada), satu per produk, produk sendiri dibuang. */
export function mirip(a: Item, semua: Item[], n = 8): Item[] {
  const pid = (x: Item) => x.href;
  const jarak = (b: Item) => {
    const k = Object.keys(a.nilai).filter((x) => b.nilai[x] != null);
    return k.length < 3 ? Infinity : Math.sqrt(k.reduce((t, x) => t + (a.nilai[x] - b.nilai[x]) ** 2, 0) / k.length);
  };
  const lihat = new Set([pid(a)]);
  return semua
    .map((b) => ({ b, d: jarak(b) }))
    .filter((x) => x.d < Infinity)
    .sort((x, y) => x.d - y.d || Number(y.b.ready) - Number(x.b.ready))
    .filter(({ b }) => !lihat.has(pid(b)) && !!lihat.add(pid(b)))
    .slice(0, n * 2) // ponytail: dari 2n terdekat, yang ready didahulukan
    .sort((x, y) => Number(y.b.ready) - Number(x.b.ready))
    .slice(0, n)
    .map((x) => x.b);
}
