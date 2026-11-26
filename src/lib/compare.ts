// Fitur /bandingkan: tipe, kriteria per kategori, warna skor, dan query bersama.
import { prisma, safeQuery } from "@/lib/prisma";
import { productHref } from "@/lib/product-slug";
import { isB1G1 } from "@/lib/b1g1";

export * from "@/lib/compare-shared";
import { tanpaGrip, type Item, type Kat } from "@/lib/compare-shared";

const namaBersih = (n: string) =>
  n.replace(/^(Promo\s+)?(Raket|Sepatu|Senar)\s+(Tenis|Tennis)\s+/i, "")
   .replace(/\s+(Tennis Racket|Racket Tennis|Tennis Shoes|Tenis Shoes|Tennis Racke)\b.*$/i, "")
   .replace(/\s+(BNIB|ORIGINAL|Original)\b/g, "").trim();

/** Semua item compare (opsional: satu kategori / id tertentu), siap dikirim ke client. */
export async function compareItems(where: { kategori?: Kat; productId?: string } = {}): Promise<Item[]> {
  const rows = await safeQuery(
    () =>
      prisma.compareItem.findMany({
        where,
        include: { product: { select: { id: true, slug: true, nama: true, gambar: true, status: true, stok: true, harga: true, hargaDiskon: true, variants: { select: { warna: true, stok: true, harga: true, hargaDiskon: true, gambar: true } } } } },
      }),
    []
  );
  return rows.map((r) => {
    const p = r.product;
    const vs = r.varian ? p.variants.filter((v) => tanpaGrip(v.warna) === r.varian) : p.variants;
    const ready = p.status !== "SOLD" && (vs.length ? vs.some((v) => v.stok > 0) : p.stok == null || p.stok > 0);
    const harga = Math.min(...(vs.length ? vs : [p]).map((v) => (v.hargaDiskon != null && v.hargaDiskon < v.harga && !isB1G1(v.harga, v.hargaDiskon) ? v.hargaDiskon : v.harga)));
    return {
      id: r.id,
      kategori: r.kategori as Kat,
      nama: namaBersih(p.nama),
      varian: r.varian,
      href: productHref(p),
      foto: vs.find((v) => v.gambar)?.gambar ?? p.gambar[0] ?? null,
      ready,
      harga,
      skor: r.skor,
      nilai: r.nilai as Record<string, number>,
      spek: r.spek as Record<string, string>,
      sumber: r.sumber,
    };
  }).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1) || a.nama.localeCompare(b.nama));
}
