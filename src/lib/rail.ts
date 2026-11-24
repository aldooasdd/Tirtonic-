import { isB1G1 } from "@/lib/b1g1";
// Ukuran kanvas foto rak: raket tegak, tepi atas frame menempel di atas kanvas (titik kait komponen rel).
export const RAIL_W = 487;
export const RAIL_H = 1200;

/** Kanvas foto sepatu: menyamping 2:1, sol menempel di tepi bawah. */
export const SHOE_W = 1000;
export const SHOE_H = 500;

export const KATEGORI_RAK = { raket: "Raket Tenis", sepatu: "Sepatu Tenis" } as const;
export type JenisRak = keyof typeof KATEGORI_RAK;

const tanpaSepatu = (nama: string) => nama.replace(/^sepatu\s+(tenis|tennis)?\s*/i, "").replace(/\s*\b(BNIB|ORIGINAL|tennis shoes|tenis shoes|shoes|tennis|tenis)\b/gi, "").replace(/\s+/g, " ").trim() || nama;

export const railName = (nama: string) => /^sepatu\b/i.test(nama) ? tanpaSepatu(nama) : nama.replace(/^raket\s+(tenis|tennis)?\s*/i, "").replace(/\s*(tennis racket|racket tennis|raket tenis|raket tennis)\b/gi, "").trim() || nama;

/** Kotak raket (piksel alpha > 128) dari data RGBA. null = kosong. clear = bagian piksel yang transparan (0–1). */
export function alphaBox(data: Uint8ClampedArray, w: number, h: number) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1, clear = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= 128) { clear++; continue; }
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, clear: clear / (w * h) };
}

/** Kenapa foto tak bisa digantung, atau null kalau oke. */
export function railPhotoProblem(box: ReturnType<typeof alphaBox>, jenis: JenisRak = "raket"): string | null {
  if (!box) return "Fotonya kosong.";
  if (box.clear < 0.1) return "Background foto belum transparan. Hapus background-nya dulu, simpan sebagai PNG.";
  if (jenis === "sepatu") {
    if (box.w < box.h * 1.3) return "Sepatunya harus satu dan difoto dari samping.";
    if (box.w < 600) return "Foto terlalu kecil. Lebar sepatu minimal 600 piksel.";
    return null;
  }
  if (box.h < box.w * 1.8) return "Raketnya harus satu dan berdiri tegak (kepala di atas, grip di bawah).";
  if (box.h < 500) return "Foto terlalu kecil. Tinggi raket minimal 500 piksel.";
  return null;
}

/** Satu pilihan beli di popup rak: varian, atau produk itu sendiri (id null) kalau tanpa varian. */
export type RailOpsi = { id: string | null; label: string; harga: number; normal: number; b1g1: boolean; stok: number; gambar: string | null };
export type RailStok = { productId: string; nama: string; sizeChart: string | null; opsi: RailOpsi[] };

type Harga = { harga: number; hargaDiskon: number | null };
type Produk = Harga & { id: string; nama: string; kategori: string; sizeChart: string | null; status: string; stok: number | null; gambar: string[]; variants: (Harga & { id: string; warna: string; ukuran: string; stok: number; gambar: string | null })[] };

/** Harga sama dengan halaman produk: diskon ≥50% = B1G1 (harga normal), selain itu harga diskon. */
export function railStok(p: Produk): RailStok {
  const harga = (x: Harga) => {
    const b1g1 = isB1G1(x.harga, x.hargaDiskon);
    return { normal: x.harga, b1g1, harga: !b1g1 && x.hargaDiskon != null && x.hargaDiskon < x.harga ? x.hargaDiskon : x.harga };
  };
  const dijual = p.status === "READY";
  const foto = p.gambar[0] ?? null;
  const opsi = p.variants.length
    ? p.variants.map((v) => ({ id: v.id, label: [v.warna, v.ukuran].filter(Boolean).join(" / "), ...harga(v), stok: dijual ? Math.max(0, v.stok) : 0, gambar: v.gambar ?? foto }))
    : [{ id: null, label: "", ...harga(p), stok: dijual ? Math.max(0, p.stok ?? 99) : 0, gambar: foto }];
  // ukuran sepatu urut kecil → besar ("40 1/2" = 40.5); bukan angka → urutan asli
  if (p.kategori === KATEGORI_RAK.sepatu) {
    const no = (l: string) => parseFloat(l.replace(",", ".")) + (/\s1\/2/.test(l) ? 0.5 : 0);
    if (opsi.every((o) => !Number.isNaN(no(o.label)))) opsi.sort((a, b) => no(a.label) - no(b.label));
  }
  return { productId: p.id, nama: p.nama, sizeChart: p.sizeChart, opsi };
}
