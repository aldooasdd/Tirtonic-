import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma, safeQuery } from "@/lib/prisma";
import ShopClient from "@/components/ShopClient";
import Footer from "@/components/Footer";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const PER = 48;

// Cache hasil query per-kombinasi filter (120 dtk). Tanpa ini tiap kunjungan
// nge-query 500+ produk ke Supabase (Tokyo) → respon ~5 dtk & egress boros.
// Argumen diserialisasi jadi cache key otomatis oleh unstable_cache.
const getShopProducts = unstable_cache(
  async (whereJson: string, sort: string | undefined, page: number) => {
    const where = JSON.parse(whereJson) as Prisma.ProductWhereInput;
    return prisma.product.findMany({
      where,
      orderBy: orderBy(sort),
      take: PER + 1,
      skip: (page - 1) * PER,
      include: { _count: { select: { variants: true } }, variants: { select: { warna: true, ukuran: true, stok: true }, orderBy: { urutan: "asc" } } },
    });
  },
  ["shop-products"],
  { revalidate: 120, tags: ["products"] }
);

const getShopBrands = unstable_cache(
  async () => {
    const rows = await prisma.product.findMany({ where: { brand: { not: null } }, distinct: ["brand"], select: { brand: true } });
    return rows.map((r) => r.brand!).filter(Boolean).sort();
  },
  ["shop-brands"],
  { revalidate: 300, tags: ["products"] }
);

type SP = { sort?: string; size?: string; brand?: string; type?: string; q?: string; price?: string; page?: string; deal?: string; event?: string };

function orderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { harga: "asc" };
    case "price_desc":
      return { harga: "desc" };
    case "newest":
      return { createdAt: "desc" };
    default:
      return { views: "desc" }; // populer = paling sering dikunjungi
  }
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const where: Prisma.ProductWhereInput = {};
  if (searchParams.type) where.kategori = { in: searchParams.type.split(",").filter(Boolean) };
  if (searchParams.brand) where.brand = searchParams.brand;
  if (searchParams.size) where.ukuran = { has: searchParams.size };
  if (searchParams.q) where.nama = { contains: searchParams.q, mode: "insensitive" };
  if (searchParams.deal) where.hargaDiskon = { not: null }; // hanya barang diskon (Best Deal)
  if (searchParams.event) where.eventAktif = true; // hanya barang yang lagi event/promo
  if (searchParams.price) {
    const [min, max] = searchParams.price.split("-").map((n) => (n ? parseInt(n, 10) : undefined));
    where.harga = { gte: min ?? 0, ...(max ? { lte: max } : {}) };
  }

  // Sembunyikan produk yang benar-benar habis: status SOLD, semua varian stok 0,
  // atau non-varian stok 0. Produk dengan minimal satu varian ready tetap tampil.
  where.status = "READY";
  where.OR = [
    { variants: { some: { stok: { gt: 0 } } } }, // ada varian yang masih ada stok
    { variants: { none: {} }, stok: { gt: 0 } }, // non-varian, stok > 0
    { variants: { none: {} }, stok: null }, // non-varian, stok tak terbatas
  ];

  // Pagination server-side: 48/halaman (+1 buat deteksi halaman berikutnya).
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);

  const [products, brands] = await Promise.all([
    safeQuery(() => getShopProducts(JSON.stringify(where), searchParams.sort, page), []),
    safeQuery(() => getShopBrands(), []),
  ]);

  // Label varian untuk panel hover: pakai sumbu ukuran kalau ada, kalau tidak
  // pakai warna (mis. sepatu, warna = ukuran). sold = semua stok label itu 0.
  const variantChips = (vs: { warna: string; ukuran: string; stok: number }[]) => {
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
  };

  const hasMore = products.length > PER;
  const pageItems = products.slice(0, PER);
  const cards = pageItems.map((p) => ({
    id: p.id,
    nama: p.nama,
    harga: p.harga,
    hargaDiskon: p.hargaDiskon,
    gambar: p.gambar,
    status: p.status,
    fromPrice: p._count.variants > 0,
    varian: variantChips(p.variants),
  }));

  return (
    <>
      <Suspense fallback={null}>
        <ShopClient products={cards} brands={brands} q={searchParams.q} page={page} hasMore={hasMore} />
      </Suspense>
      <Footer />
    </>
  );
}
