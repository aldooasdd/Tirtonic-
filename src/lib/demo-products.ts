// Tombol "Ajukan Demo" disembunyikan dulu (komunitas belum paham alurnya) — set true untuk buka lagi.
export const AJUKAN_DEMO_ON = false;

// Cocokkan produk katalog dengan kampanye demo (brand + jenis produk, mis. "Raket Ezone Espresso Brown 2026").
// ponytail: cocok kata kunci sederhana — kalau sering meleset, tambah relasi produk ↔ kampanye di admin.
const KAT: Record<string, string> = { raket: "Raket Tenis", sepatu: "Sepatu Tenis", senar: "String", string: "String", tas: "Tas", grip: "Grip", bola: "Bola Tenis", baju: "Apparel", apparel: "Apparel", topi: "Topi" };
const SKIP = new Set(["tenis", "tennis", "demo", "day", "tirtonic", "komunitas", "x", "&", "dan"]);

type P = { nama: string; brand: string | null; kategori: string };

export function demoMatcher(brand: string, productType: string) {
  const b = brand.trim().toLowerCase();
  const words = productType.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
  const kat = words.map((w) => KAT[w]).find(Boolean);
  const bw = new Set(b.split(/[\s-]+/));
  const model = words.filter((w) => !KAT[w] && !SKIP.has(w) && !bw.has(w) && w !== b && !/^20\d\d$/.test(w));
  const base = (p: P) => (p.brand ?? "").trim().toLowerCase() === b && (!kat || p.kategori === kat);
  const strict = (p: P) => base(p) && model.every((w) => p.nama.toLowerCase().includes(w));
  return { base, strict };
}

/** Produk untuk daftar kampanye: model persis dulu, kalau kosong → brand + kategori. Urut per kampanye, tanpa duplikat. */
export function productsForCampaigns<T extends P & { id: string }>(campaigns: { brand: string; productType: string }[], products: T[], limit = 12): T[] {
  const out = new Map<string, T>();
  for (const c of campaigns) {
    const m = demoMatcher(c.brand, c.productType);
    const hit = products.filter(m.strict);
    for (const p of hit.length ? hit : products.filter(m.base)) out.set(p.id, p);
  }
  return [...out.values()].slice(0, limit);
}

/** Pilihan form Ajukan Demo: brand → kategori yang boleh diajukan (daftar tetap dari toko). */
export const DEMO_REQUEST_OPTIONS: Record<string, string[]> = {
  Yonex: ["Raket", "Sepatu"],
  Head: ["Raket", "Sepatu"],
  Wilson: ["Raket", "Sepatu"],
  Solinco: ["Raket"],
  Volkl: ["Raket"],
  Babolat: ["Raket"],
  Asics: ["Sepatu"],
  Adidas: ["Sepatu"],
  Dunlop: ["Raket"],
  "K-Swiss": ["Sepatu"],
  Lacoste: ["Sepatu"],
  Mizuno: ["Sepatu"],
  Nike: ["Sepatu"],
  Prince: ["Raket"],
  Tecnifibre: ["Raket"],
};
export async function demoRequestOptions() {
  return DEMO_REQUEST_OPTIONS;
}

if (process.argv[1]?.endsWith("demo-products.ts")) {
  const ps = [
    { id: "1", nama: "Yonex Ezone 100 Espresso Brown 2026", brand: "Yonex", kategori: "Raket Tenis" },
    { id: "2", nama: "Yonex Ezone 98 Blue", brand: "Yonex", kategori: "Raket Tenis" },
    { id: "3", nama: "Sepatu K-Swiss Hypercourt", brand: "K-Swiss", kategori: "Sepatu Tenis" },
    { id: "4", nama: "Baju K-Swiss Polo", brand: "K-Swiss", kategori: "Apparel" },
  ];
  const r = productsForCampaigns([{ brand: "Yonex", productType: "Raket Ezone Espresso Brown 2026" }, { brand: "K-Swiss", productType: "Sepatu K-Swiss" }], ps);
  console.assert(r.map((p) => p.id).join() === "1,3", r.map((p) => p.id).join());
  console.log("ok", r.map((p) => p.id));
}
