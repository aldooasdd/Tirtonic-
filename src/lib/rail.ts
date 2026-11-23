// Ukuran kanvas foto rak: raket tegak, tepi atas frame menempel di atas kanvas (titik kait komponen rel).
export const RAIL_W = 487;
export const RAIL_H = 1200;

export const railName = (nama: string) => nama.replace(/^raket\s+(tenis|tennis)?\s*/i, "").replace(/\s*(tennis racket|raket tenis|raket tennis)\b/gi, "").trim() || nama;

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
