// Loader data halaman kategori shop (server). Cache 2 menit per kategori, tag "products".
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { spekKartuRaket, type Row } from "@/lib/shop-kat";
import type { ProductCardData } from "@/components/ProductCard";

/** Produk yang masih ada stoknya (status READY + minimal satu varian stok > 0, atau non-varian stok > 0 / tak terbatas). */
export const adaStok = {
  status: "READY" as const,
  OR: [
    { variants: { some: { stok: { gt: 0 } } } },
    { variants: { none: {} }, stok: { gt: 0 } },
    { variants: { none: {} }, stok: null },
  ],
};

export const rowsKategori = unstable_cache(
  async (db: string): Promise<Row[]> => {
    const ps = await prisma.product.findMany({
      where: { kategori: db, ...adaStok },
      include: {
        variants: { select: { warna: true, ukuran: true, stok: true, harga: true, hargaDiskon: true }, orderBy: { urutan: "asc" } },
        compareItems: { select: { skor: true, nilai: true, spek: true } },
      },
    });
    return ps.map((p) => ({
      id: p.id, slug: p.slug, nama: p.nama, brand: p.brand, harga: p.harga, hargaDiskon: p.hargaDiskon,
      gambar: p.gambar.slice(0, 2), status: p.status, stok: p.stok, ukuran: p.ukuran, views: p.views,
      createdAt: p.createdAt.toISOString(), atribut: (p.atribut ?? {}) as Row["atribut"], variants: p.variants,
      lab: p.compareItems.map((c) => ({ skor: c.skor, nilai: c.nilai as Record<string, number>, spek: c.spek as Record<string, string> })),
    }));
  },
  ["shop-kat-rows"],
  { revalidate: 120, tags: ["products"] }
);

/** Jumlah produk per kategori (untuk tab). */
export const jumlahKategori = unstable_cache(
  // tanpa safeQuery di dalam: kalau query gagal biarkan error supaya hasil kosong TIDAK tersimpan di cache (pemanggil sudah pakai safeQuery)
  async () => Object.fromEntries((await prisma.product.groupBy({ by: ["kategori"], where: adaStok, _count: true })).map((g) => [g.kategori, g._count])),
  ["shop-kat-jumlah"],
  { revalidate: 300, tags: ["products"] }
);

/** Chip varian untuk panel hover kartu: sumbu ukuran kalau ada, kalau tidak warna. sold = semua stok label itu 0. */
export function variantChips(vs: { warna: string; ukuran: string; stok: number }[]) {
  if (!vs.length) return [];
  const axis = vs.some((v) => v.ukuran !== "") ? (v: (typeof vs)[number]) => v.ukuran : (v: (typeof vs)[number]) => v.warna;
  const order: string[] = [];
  const grup = new Map<string, number[]>();
  for (const v of vs) {
    const k = axis(v);
    if (!k) continue;
    if (!grup.has(k)) { grup.set(k, []); order.push(k); }
    grup.get(k)!.push(v.stok);
  }
  return order.map((label) => ({ label, sold: grup.get(label)!.every((s) => s <= 0) }));
}

export const kartu = (r: Row): ProductCardData => ({
  id: r.id, slug: r.slug, nama: r.nama, harga: r.harga, hargaDiskon: r.hargaDiskon, gambar: r.gambar, status: r.status,
  fromPrice: r.variants.length > 0, varian: variantChips(r.variants), spek: spekKartuRaket(r),
});
