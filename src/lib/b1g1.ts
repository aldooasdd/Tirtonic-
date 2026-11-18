// Buy 1 Get 1: barang diskon ≥ 50% tidak lagi dijual diskon — tampil harga normal & masuk promo B1G1.
// Aturan owner (18 Nov 2026): barang gratis maksimal 50% harga barang yang dibayar (gratis ≤ dibayar ÷ 2),
// supaya barang mahal & murah keluar berbarengan. Tidak bisa digabung kupon/voucher. Pure (server & client).

export const isB1G1 = (harga: number, hargaDiskon: number | null | undefined) =>
  hargaDiskon != null && harga > 0 && hargaDiskon <= harga / 2;

/** Dua harga boleh dipasangkan B1G1: yang murah ≤ 50% yang mahal. */
export const b1g1PairOk = (a: number, b: number) => Math.min(a, b) * 2 <= Math.max(a, b);

/** Pasangkan unit B1G1 sebanyak mungkin: urut termurah→termahal, separuh termurah jadi calon gratis,
 *  tiap calon dipasang dgn unit berikutnya yang harganya ≥ 2× (two-pointer, jumlah pasangan maksimal).
 *  blocked = ada ≥ 2 unit yang tak dapat pasangan (1 unit sisa dari jumlah ganjil tetap boleh, bayar penuh). */
export function b1g1Free<T extends { key: string; harga: number; qty: number; b1g1?: boolean }>(lines: T[]) {
  const units = lines.filter((l) => l.b1g1).flatMap((l) => Array.from({ length: l.qty }, () => ({ key: l.key, harga: l.harga })));
  units.sort((a, b) => a.harga - b.harga);
  const n = units.length;
  const freeQty: Record<string, number> = {};
  let total = 0, pairs = 0;
  for (let i = 0, j = Math.ceil(n / 2); i < Math.floor(n / 2) && j < n; j++) {
    if (!b1g1PairOk(units[i].harga, units[j].harga)) continue;
    total += units[i].harga;
    freeQty[units[i].key] = (freeQty[units[i].key] ?? 0) + 1;
    pairs++;
    i++;
  }
  const left = n - pairs * 2;
  return { total, freeQty, unpaired: left > 0, blocked: left >= 2 };
}

export const B1G1_BLOCK_MSG = "Barang Buy 1 Get 1 belum berpasangan: barang gratis maksimal 50% dari harga barang yang dibayar. Ganti salah satu barangnya.";

/** Ongkir B1G1: dikali jumlah unit B1G1 saja (2 barang B1G1 = ×2; barang biasa tidak ikut dihitung),
 *  dan tidak dapat gratis ongkir. Tanpa B1G1 → ×1. */
export const b1g1OngkirQty = (lines: { qty: number; b1g1?: boolean }[]) =>
  Math.max(1, lines.reduce((s, l) => s + (l.b1g1 ? l.qty : 0), 0));

// ponytail: self-check — node -e 'require("./b1g1").demo()' tidak perlu; jalankan via tsx bila logika berubah.
export function demo() {
  const f = (...hs: number[]) => b1g1Free(hs.map((h, i) => ({ key: "k" + i, harga: h, qty: 1, b1g1: true })));
  // contoh owner
  if (f(1_000_000, 500_000).total !== 500_000) throw new Error("1jt+500rb harusnya 500rb gratis");
  if (f(2_000_000, 1_000_000).total !== 1_000_000) throw new Error("2jt+1jt harusnya 1jt gratis");
  const no = f(1_000_000, 900_000);
  if (no.total !== 0 || !no.blocked) throw new Error("1jt+900rb harusnya diblokir");
  const odd = f(1_000_000, 400_000, 300_000); // 1 pasang (300rb gratis), 400rb sisa → boleh
  if (odd.total !== 300_000 || odd.blocked || !odd.unpaired) throw new Error("ganjil harusnya boleh");
  if (f(800_000).blocked) throw new Error("1 barang sendiri harusnya boleh");
  // jumlah pasangan maksimal: 100,250,500,600 → (100,500)? two-pointer: (100,500),(250,600) = 350 gratis
  const mx = f(600_000, 500_000, 250_000, 100_000);
  if (mx.total !== 350_000 || mx.unpaired) throw new Error("pasangan maksimal salah");
  if (!b1g1PairOk(600_000, 300_000) || b1g1PairOk(600_000, 300_001)) throw new Error("batas 50% salah");
  if (b1g1OngkirQty([{ qty: 2, b1g1: true }, { qty: 3 }]) !== 2 || b1g1OngkirQty([{ qty: 4 }]) !== 1) throw new Error("ongkir b1g1 salah");
  if (!isB1G1(100, 50) || isB1G1(100, 51) || isB1G1(100, null)) throw new Error("isB1G1 salah");
  return "ok";
}
