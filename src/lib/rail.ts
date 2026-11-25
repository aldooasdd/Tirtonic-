import { isB1G1 } from "@/lib/b1g1";
// Ukuran kanvas foto rak: raket tegak, tepi atas frame menempel di atas kanvas (titik kait komponen rel).
export const RAIL_W = 487;
export const RAIL_H = 1200;

/** Kanvas foto sepatu: menyamping 2:1, sol menempel di tepi bawah. */
export const SHOE_W = 1000;
export const SHOE_H = 500;

export const KATEGORI_RAK = { raket: "Raket Tenis", sepatu: "Sepatu Tenis", tas: "Tas" } as const;
export type JenisRak = keyof typeof KATEGORI_RAK;
export const jenisRak = (kategori: string): JenisRak => (kategori === KATEGORI_RAK.sepatu ? "sepatu" : kategori === KATEGORI_RAK.tas ? "tas" : "raket");

/** Tas: rasio foto, titik ikat tali (x, y = atas handle), tebal handle; semua 0–1. grip 0 = tanpa lubang handle. */
export type BagInfo = { ratio: number; x: number; y: number; grip: number };
/** Info tas disimpan di ujung URL foto (#tas=…), jadi tak perlu kolom baru. */
export const bagTag = (b: BagInfo) => `#tas=${[b.ratio, b.x, b.y, b.grip].map((n) => n.toFixed(4)).join(",")}`;
export function bagFrom(foto: string): { url: string; bag: BagInfo | null } {
  const [url, tag] = foto.split("#tas=");
  const n = (tag ?? "").split(",").map(Number);
  return { url, bag: n.length === 4 ? validBag({ ratio: n[0], x: n[1], y: n[2], grip: n[3] }) : null };
}
export function validBag(b: BagInfo): BagInfo | null {
  const ok = [b.ratio, b.x, b.y, b.grip].every(Number.isFinite) && b.ratio > 0.3 && b.ratio < 4 && b.x >= 0.1 && b.x <= 0.9 && b.y >= 0 && b.y < 0.8 && b.grip >= 0 && b.grip <= 0.3;
  return ok ? b : null;
}

/** Bersihkan foto transparan di tempat: kabut di tepi dibuang, serpihan kecil dihapus. */
export function bersihkan(data: Uint8ClampedArray, w: number, h: number) {
  const N = w * h;
  let kabut = 0;
  for (let k = 0; k < N; k++) { const a = data[k * 4 + 3]; if (a > 12 && a < 235) kabut++; }
  const berkabut = kabut / N > 0.03;
  const batas = berkabut ? 235 : 12;
  let m = new Uint8Array(N);
  for (let k = 0; k < N; k++) m[k] = data[k * 4 + 3] >= batas ? 1 : 0;
  const geser = (src: Uint8Array, tebal: boolean) => {
    const o = new Uint8Array(N);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      const n = src[k] + src[k - 1] + src[k + 1] + src[k - w] + src[k + w];
      o[k] = tebal ? (n > 0 ? 1 : 0) : n === 5 ? 1 : 0;
    }
    return o;
  };
  if (berkabut) m = geser(geser(geser(m, false), false), true);
  // hanya bagian besar yang dipertahankan
  const label = new Int32Array(N), stack = new Int32Array(N);
  const luas = [0];
  for (let s = 0; s < N; s++) {
    if (!m[s] || label[s]) continue;
    const id = luas.length;
    let top = 0, n = 0;
    stack[top++] = s; label[s] = id;
    while (top) {
      const c = stack[--top]; n++;
      const x = c % w;
      if (x > 0 && m[c - 1] && !label[c - 1]) { label[c - 1] = id; stack[top++] = c - 1; }
      if (x < w - 1 && m[c + 1] && !label[c + 1]) { label[c + 1] = id; stack[top++] = c + 1; }
      if (c >= w && m[c - w] && !label[c - w]) { label[c - w] = id; stack[top++] = c - w; }
      if (c < N - w && m[c + w] && !label[c + w]) { label[c + w] = id; stack[top++] = c + w; }
    }
    luas.push(n);
  }
  let besar = 0;
  for (const n of luas) if (n > besar) besar = n;
  const ikut = (k: number) => label[k] > 0 && luas[label[k]] >= besar * 0.01;
  if (!berkabut) { for (let k = 0; k < N; k++) if (!ikut(k)) data[k * 4 + 3] = 0; return; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // tepi dihaluskan 3×3
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h && ikut(Y * w + X)) n++;
    }
    data[(y * w + x) * 4 + 3] = Math.round((n / 9) * 255);
  }
}

/** Titik ikat tali dari foto tas yang sudah dipotong pas. Tanpa x → cari sendiri: tengah bagian paling atas. */
export function cariHandle(data: Uint8ClampedArray, w: number, h: number, x?: number): BagInfo {
  const isi = (X: number, Y: number) => data[(Y * w + X) * 4 + 3] > 128;
  if (x == null) {
    // bagian atas bisa lebih dari satu (mis. dua tali bahu): pakai potongan terlebar, seri → yang paling dekat tengah
    const baris = Math.min(h - 1, Math.round(h * 0.02));
    let best = { skor: -1, c: w / 2 };
    for (let X = 0; X < w; X++) {
      if (!isi(X, baris)) continue;
      const a = X;
      while (X < w && isi(X, baris)) X++;
      const c = (a + X - 1) / 2;
      const skor = (X - a) / w - Math.abs(c / w - 0.5) * 0.5;
      if (skor > best.skor) best = { skor, c };
    }
    x = best.c / w;
  }
  x = Math.min(0.9, Math.max(0.1, x));
  const X = Math.min(w - 1, Math.round(x * w));
  let y0 = 0;
  while (y0 < h - 1 && !isi(X, y0)) y0++;
  let y1 = y0;
  while (y1 < h && isi(X, y1)) y1++;
  let lubang = 0;
  while (y1 + lubang < h && !isi(X, y1 + lubang)) lubang++;
  const tebal = (y1 - y0) / h;
  const berlubang = y1 + lubang < h && lubang >= h * 0.012 && tebal <= 0.3; // di bawah lubang harus ada badan tas
  return { ratio: w / h, x, y: y0 / h, grip: berlubang ? Math.max(0.008, tebal) : 0 };
}

const tanpaSepatu = (nama: string) => nama.replace(/^sepatu\s+(tenis|tennis)?\s*/i, "").replace(/\s*\b(BNIB|ORIGINAL|tennis shoes|tenis shoes|shoes|tennis|tenis)\b/gi, "").replace(/\s+/g, " ").trim() || nama;

export const railName = (nama: string) => /^sepatu\b/i.test(nama) ? tanpaSepatu(nama) : /^tas\b/i.test(nama) ? nama.replace(/^tas\s+(tenis|tennis|raket)?\s*(tenis|tennis)?\s*/i, "").replace(/\s*\b(BNIB|ORIGINAL|tennis bag|tas tenis|tas raket)\b/gi, "").trim() || nama : nama.replace(/^raket\s+(tenis|tennis)?\s*/i, "").replace(/\s*(tennis racket|racket tennis|raket tenis|raket tennis)\b/gi, "").trim() || nama;

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
  if (jenis === "tas") return Math.max(box.w, box.h) < 500 ? "Foto terlalu kecil. Sisi terpanjang tas minimal 500 piksel." : null;
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
