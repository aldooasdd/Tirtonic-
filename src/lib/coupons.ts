import "server-only";
import { prisma } from "@/lib/prisma";

// Satu baris keranjang yang sudah diverifikasi harganya dari DB.
// wasDiscounted = produk ini sedang diskon (hargaDiskon < harga) → tak kena kupon.
export type CouponLine = { productId: string; harga: number; qty: number; wasDiscounted: boolean };

export type CouponResult =
  | { ok: true; code: string; diskon: number }
  | { ok: false; error: string };

/** Validasi kode kupon terhadap isi keranjang dan hitung potongannya.
 *  Aturan: kupon hanya memotong produk yang (a) tidak sedang diskon dan
 *  (b) kalau kupon dibatasi ke produk tertentu, produknya termasuk daftar. */
export async function computeCoupon(codeRaw: string, lines: CouponLine[]): Promise<CouponResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Masukkan kode kupon." };

  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { ok: false, error: "Kupon tidak valid atau sudah tidak aktif." };

  const scoped = c.productIds.length > 0;
  const eligible = lines.filter((l) => !l.wasDiscounted && (!scoped || c.productIds.includes(l.productId)));
  const base = eligible.reduce((s, l) => s + l.harga * l.qty, 0);
  if (base <= 0) {
    return {
      ok: false,
      error: scoped
        ? "Kupon ini hanya untuk produk tertentu yang tidak ada di keranjang (produk diskon tidak dihitung)."
        : "Kupon tidak berlaku — semua produk di keranjang sedang diskon.",
    };
  }

  const diskon = Math.round((base * Math.min(100, c.value)) / 100);
  return { ok: true, code, diskon };
}

// ponytail: self-check logika potongan (tanpa DB). Jalankan: npx tsx src/lib/coupons.ts
function _demo() {
  const assert = (cond: boolean, msg: string) => { if (!cond) throw new Error("FAIL: " + msg); };
  type C = { value: number; productIds: string[] };
  const calc = (c: C, lines: CouponLine[]) => {
    const scoped = c.productIds.length > 0;
    const base = lines.filter((l) => !l.wasDiscounted && (!scoped || c.productIds.includes(l.productId)))
      .reduce((s, l) => s + l.harga * l.qty, 0);
    if (base <= 0) return 0;
    return Math.round((base * Math.min(100, c.value)) / 100);
  };
  const L = (productId: string, harga: number, qty: number, wasDiscounted = false): CouponLine => ({ productId, harga, qty, wasDiscounted });

  assert(calc({ value: 10, productIds: [] }, [L("a", 100000, 2)]) === 20000, "10% dari 200k = 20k");
  assert(calc({ value: 10, productIds: [] }, [L("a", 100000, 1, true)]) === 0, "produk diskon tak kena kupon");
  assert(calc({ value: 10, productIds: ["b"] }, [L("a", 100000, 1)]) === 0, "produk di luar scope tak kena");
  assert(calc({ value: 10, productIds: ["b"] }, [L("a", 100000, 1), L("b", 200000, 1)]) === 20000, "hanya produk dalam scope dipotong");
  console.log("coupons _demo OK");
}
if (require.main === module) _demo();
