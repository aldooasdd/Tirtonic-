import { isB1G1 } from "@/lib/b1g1";
// Ukuran kanvas foto rak: raket tegak, tepi atas frame menempel di atas kanvas (titik kait komponen rel).
export const RAIL_W = 487;
export const RAIL_H = 1200;

export const railName = (nama: string) => nama.replace(/^raket\s+(tenis|tennis)?\s*/i, "").replace(/\s*(tennis racket|racket tennis|raket tenis|raket tennis)\b/gi, "").trim() || nama;

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
export function railPhotoProblem(box: ReturnType<typeof alphaBox>): string | null {
  if (!box) return "Fotonya kosong.";
  if (box.clear < 0.1) return "Background foto belum transparan. Hapus background-nya dulu, simpan sebagai PNG.";
  if (box.h < box.w * 1.8) return "Raketnya harus satu dan berdiri tegak (kepala di atas, grip di bawah).";
  if (box.h < 500) return "Foto terlalu kecil. Tinggi raket minimal 500 piksel.";
  return null;
}

/** Satu pilihan beli di popup rak: varian, atau produk itu sendiri (id null) kalau tanpa varian. */
export type RailOpsi = { id: string | null; label: string; harga: number; normal: number; b1g1: boolean; stok: number; gambar: string | null };
export type RailStok = { productId: string; nama: string; opsi: RailOpsi[] };

type Harga = { harga: number; hargaDiskon: number | null };
type Produk = Harga & { id: string; nama: string; status: string; stok: number | null; gambar: string[]; variants: (Harga & { id: string; warna: string; ukuran: string; stok: number; gambar: string | null })[] };

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
  return { productId: p.id, nama: p.nama, opsi };
}
