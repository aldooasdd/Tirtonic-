import { adaStok } from "@/lib/shop-kat-db";
import "server-only";
import { prisma, safeQuery } from "@/lib/prisma";
import type { B1G1Option } from "@/components/B1G1Popup";
import { isB1G1 } from "@/lib/b1g1";

/** Semua id produk B1G1 (diskon ≥50%). Rasio tak bisa difilter Prisma → ambil kolom ringan lalu saring. */
export async function b1g1ProductIds(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { hargaDiskon: { not: null }, ...adaStok },
    select: { id: true, harga: true, hargaDiskon: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.filter((r) => isB1G1(r.harga, r.hargaDiskon)).map((r) => r.id);
}

/** Pilihan pasangan Buy 1 Get 1 (barang diskon ≥50% yang masih ada stok). */
export async function b1g1Options(): Promise<B1G1Option[]> {
  const pool = await safeQuery(
    async () => prisma.product.findMany({
      where: { id: { in: await b1g1ProductIds() } },
      include: { variants: { orderBy: { urutan: "asc" } } },
    }),
    [],
  );
  return pool
    .map((x) => ({
      id: x.id, nama: x.nama, gambar: x.gambar[0] ?? null, harga: x.harga, stok: x.stok,
      ok: x.variants.length === 0 && isB1G1(x.harga, x.hargaDiskon) && (x.stok == null || x.stok > 0),
      variants: x.variants.filter((v) => v.stok > 0 && isB1G1(v.harga, v.hargaDiskon))
        .map((v) => ({ id: v.id, label: `${v.warna}${v.ukuran ? " / " + v.ukuran : ""}`, harga: v.harga, stok: v.stok, gambar: v.gambar ?? x.gambar[0] ?? null })),
    }))
    .filter((x) => x.ok || x.variants.length > 0)
    .map(({ ok: _ok, ...x }) => x);
}
