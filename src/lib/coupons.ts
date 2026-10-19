import "server-only";
import { prisma } from "@/lib/prisma";

// Satu baris keranjang yang sudah diverifikasi harganya dari DB.
// wasDiscounted dipertahankan di tipe (caller masih mengisinya) tapi tak lagi
// memengaruhi kupon — produk diskon kini tetap kena kupon.
export type CouponLine = { productId: string; harga: number; qty: number; wasDiscounted: boolean };

export type CouponResult =
  | { ok: true; code: string; diskon: number }
  | { ok: false; error: string };

/** Validasi kode kupon terhadap isi keranjang dan hitung potongannya.
 *  Aturan: kalau kupon dibatasi ke produk tertentu, hanya produk itu yang dipotong.
 *  Produk yang sedang diskon TETAP kena kupon. */
export async function computeCoupon(codeRaw: string, lines: CouponLine[]): Promise<CouponResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Masukkan kode kupon." };

  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { ok: false, error: "Kupon tidak valid atau sudah tidak aktif." };

  const byProduct = c.productIds.length > 0;
  const byCat = c.categories.length > 0;
  const scoped = byProduct || byCat;

  // Kalau kupon dibatasi kategori, ambil kategori tiap produk di keranjang dari DB
  // (produk baru di kategori itu otomatis ikut kena).
  let catOf = new Map<string, string>();
  if (byCat) {
    const prods = await prisma.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      select: { id: true, kategori: true },
    });
    catOf = new Map(prods.map((p) => [p.id, p.kategori]));
  }

  const eligible = lines.filter((l) =>
    !scoped ||
    (byProduct && c.productIds.includes(l.productId)) ||
    (byCat && c.categories.includes(catOf.get(l.productId) ?? ""))
  );
  const base = eligible.reduce((s, l) => s + l.harga * l.qty, 0);
  if (base <= 0) {
    return {
      ok: false,
      error: scoped
        ? "Kupon ini hanya untuk produk/kategori tertentu yang tidak ada di keranjang."
        : "Kupon tidak berlaku untuk keranjang ini.",
    };
  }

  // Potongan: persen (dibatasi 100%) atau nominal rupiah (dibatasi ke base).
  const diskon = c.type === "amount"
    ? Math.min(c.value, base)
    : Math.round((base * Math.min(100, c.value)) / 100);
  return { ok: true, code, diskon };
}

// ponytail: self-check logika potongan (tanpa DB). Jalankan: npx tsx src/lib/coupons.ts
function _demo() {
  const assert = (cond: boolean, msg: string) => { if (!cond) throw new Error("FAIL: " + msg); };
  type C = { type?: string; value: number; productIds: string[] };
  const calc = (c: C, lines: CouponLine[]) => {
    const scoped = c.productIds.length > 0;
    const base = lines.filter((l) => !scoped || c.productIds.includes(l.productId))
      .reduce((s, l) => s + l.harga * l.qty, 0);
    if (base <= 0) return 0;
    return c.type === "amount" ? Math.min(c.value, base) : Math.round((base * Math.min(100, c.value)) / 100);
  };
  const L = (productId: string, harga: number, qty: number, wasDiscounted = false): CouponLine => ({ productId, harga, qty, wasDiscounted });

  assert(calc({ value: 10, productIds: [] }, [L("a", 100000, 2)]) === 20000, "10% dari 200k = 20k");
  assert(calc({ value: 10, productIds: [] }, [L("a", 100000, 1, true)]) === 10000, "produk diskon kini tetap kena kupon");
  assert(calc({ value: 10, productIds: ["b"] }, [L("a", 100000, 1)]) === 0, "produk di luar scope tak kena");
  assert(calc({ value: 10, productIds: ["b"] }, [L("a", 100000, 1), L("b", 200000, 1)]) === 20000, "hanya produk dalam scope dipotong");
  assert(calc({ type: "amount", value: 25000, productIds: [] }, [L("a", 100000, 1)]) === 25000, "nominal 25k");
  assert(calc({ type: "amount", value: 150000, productIds: [] }, [L("a", 100000, 1)]) === 100000, "nominal dibatasi ke base");
  console.log("coupons _demo OK");
}
if (require.main === module) _demo();
