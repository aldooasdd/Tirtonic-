// Buy 1 Get 1: barang diskon ≥ 50% tidak lagi dijual diskon — tampil harga normal & masuk promo B1G1.
// Tiap 2 unit B1G1 di keranjang dengan HARGA BERBEDA: yang lebih murah gratis (harga sama tidak bisa). Tidak bisa digabung kupon/voucher.
// Pure (dipakai server & client).

export const isB1G1 = (harga: number, hargaDiskon: number | null | undefined) =>
  hargaDiskon != null && harga > 0 && hargaDiskon <= harga / 2;

/** Unit gratis: semua unit B1G1 diurut termahal→termurah, dipasangkan; unit ke-2 tiap pasangan gratis.
 *  Return total potongan + jumlah unit gratis per key baris. */
export function b1g1Free<T extends { key: string; harga: number; qty: number; b1g1?: boolean }>(lines: T[]) {
  const units = lines.filter((l) => l.b1g1).flatMap((l) => Array.from({ length: l.qty }, () => ({ key: l.key, harga: l.harga })));
  units.sort((a, b) => b.harga - a.harga);
  // Pasangan wajib beda harga (harga sama tidak bisa dipasangkan). Greedy: termahal dipasang dgn unit berikutnya yang lebih murah.
  const used = new Array(units.length).fill(false);
  const freeQty: Record<string, number> = {};
  let total = 0;
  for (let i = 0; i < units.length; i++) {
    if (used[i]) continue;
    const j = units.findIndex((u, k) => k > i && !used[k] && u.harga < units[i].harga);
    if (j < 0) continue;
    used[i] = used[j] = true;
    total += units[j].harga;
    freeQty[units[j].key] = (freeQty[units[j].key] ?? 0) + 1;
  }
  return { total, freeQty, unpaired: used.some((u) => !u) };
}

// ponytail: self-check — node -e 'require("./b1g1").demo()' tidak perlu; jalankan via tsx bila logika berubah.
export function demo() {
  const r = b1g1Free([
    { key: "a", harga: 300, qty: 1, b1g1: true },
    { key: "b", harga: 100, qty: 1, b1g1: true },
    { key: "c", harga: 200, qty: 2, b1g1: true },
    { key: "d", harga: 999, qty: 1 },
  ]);
  // urut: 300,200,200,100 → (300,200) gratis 200, (200,100) gratis 100
  if (r.total !== 300 || r.freeQty.c !== 1 || r.freeQty.b !== 1 || r.unpaired) throw new Error("b1g1 salah");
  const same = b1g1Free([{ key: "x", harga: 500, qty: 2, b1g1: true }]); // harga sama → tak dapat
  if (same.total !== 0 || !same.unpaired) throw new Error("harga sama harusnya tidak dipasangkan");
  if (!isB1G1(100, 50) || isB1G1(100, 51) || isB1G1(100, null)) throw new Error("isB1G1 salah");
  return "ok";
}
