// Buy 1 Get 1: barang diskon ≥ 50% tidak lagi dijual diskon — tampil harga normal & masuk promo B1G1.
// Tiap 2 unit B1G1 di keranjang: yang lebih murah gratis. Tidak bisa digabung kupon/voucher.
// Pure (dipakai server & client).

export const isB1G1 = (harga: number, hargaDiskon: number | null | undefined) =>
  hargaDiskon != null && harga > 0 && hargaDiskon <= harga / 2;

/** Unit gratis: semua unit B1G1 diurut termahal→termurah, dipasangkan; unit ke-2 tiap pasangan gratis.
 *  Return total potongan + jumlah unit gratis per key baris. */
export function b1g1Free<T extends { key: string; harga: number; qty: number; b1g1?: boolean }>(lines: T[]) {
  const units = lines.filter((l) => l.b1g1).flatMap((l) => Array.from({ length: l.qty }, () => ({ key: l.key, harga: l.harga })));
  units.sort((a, b) => b.harga - a.harga);
  const freeQty: Record<string, number> = {};
  let total = 0;
  for (let i = 1; i < units.length; i += 2) {
    total += units[i].harga;
    freeQty[units[i].key] = (freeQty[units[i].key] ?? 0) + 1;
  }
  return { total, freeQty, unpaired: units.length % 2 === 1 };
}

// ponytail: self-check — node -e 'require("./b1g1").demo()' tidak perlu; jalankan via tsx bila logika berubah.
export function demo() {
  const r = b1g1Free([
    { key: "a", harga: 300, qty: 1, b1g1: true },
    { key: "b", harga: 100, qty: 1, b1g1: true },
    { key: "c", harga: 200, qty: 2, b1g1: true },
    { key: "d", harga: 999, qty: 1 },
  ]);
  // urut: 300,200,200,100 → gratis 200 (c) & 100 (b)
  if (r.total !== 300 || r.freeQty.c !== 1 || r.freeQty.b !== 1 || r.unpaired) throw new Error("b1g1 salah");
  if (!isB1G1(100, 50) || isB1G1(100, 51) || isB1G1(100, null)) throw new Error("isB1G1 salah");
  return "ok";
}
