import { spekKartuRaket, type Row } from "@/lib/shop-kat";
import { adaStok } from "@/lib/shop-kat-db";
import { isB1G1 } from "@/lib/b1g1";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma, safeQuery } from "@/lib/prisma";
import ShopClient from "@/components/ShopClient";
import Footer from "@/components/Footer";
import { Suspense } from "react";
import { DISKON_RANGES } from "@/lib/constants";
import { variantChips, jumlahKategori } from "@/lib/shop-kat-db";
import ShopTabs from "@/components/ShopTabs";

export const dynamic = "force-dynamic";

// Cache hasil query per-kombinasi filter (120 dtk). Tanpa ini tiap kunjungan
// nge-query semua produk ke Supabase (Tokyo) → respon lambat & egress boros.
// Argumen diserialisasi jadi cache key otomatis oleh unstable_cache.
// Semua produk 1 halaman (tanpa pagination).
const getShopProducts = unstable_cache(
  async (whereJson: string, sort: string | undefined) => {
    const where = JSON.parse(whereJson) as Prisma.ProductWhereInput;
    return prisma.product.findMany({
      where,
      orderBy: orderBy(sort),
      include: { _count: { select: { variants: true } }, variants: { select: { warna: true, ukuran: true, stok: true }, orderBy: { urutan: "asc" } }, compareItems: { select: { spek: true } } },
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

type SP = { sort?: string; size?: string; brand?: string; type?: string; q?: string; price?: string; page?: string; deal?: string; b1g1?: string; event?: string; diskon?: string };

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
  // Size: ukuran produk, atau varian yang masih ada stok (sepatu sering simpan ukuran di kolom warna).
  if (searchParams.size) {
    const sz = searchParams.size;
    const alt = [sz, sz.replace(/^(\d+)\.5$/, "$1 1/2")]; // sebagian varian ditulis "40 1/2"
    where.AND = [{ OR: [
      { variants: { none: {} }, ukuran: { has: sz } }, // non-varian: daftar ukuran produk
      { variants: { some: { stok: { gt: 0 }, OR: [{ ukuran: { in: alt } }, { warna: { in: alt } }] } } }, // varian: ukuran itu masih ada stok
    ] }];
  }
  if (searchParams.q) where.nama = { contains: searchParams.q, mode: "insensitive" };
  if (searchParams.deal || searchParams.b1g1) where.hargaDiskon = { not: null }; // hanya barang diskon (Best Deal / B1G1 disaring di bawah)
  if (searchParams.event) where.eventAktif = true; // hanya barang yang lagi event/promo
  if (searchParams.price) {
    const [min, max] = searchParams.price.split("-").map((n) => (n ? parseInt(n, 10) : undefined));
    where.harga = { gte: min ?? 0, ...(max ? { lte: max } : {}) };
  }

  // Sembunyikan produk yang benar-benar habis: status SOLD, semua varian stok 0,
  // atau non-varian stok 0. Produk dengan minimal satu varian ready tetap tampil.
  Object.assign(where, adaStok);

  const [products, brands, jumlah] = await Promise.all([
    safeQuery(() => getShopProducts(JSON.stringify(where), searchParams.sort), []),
    safeQuery(() => getShopBrands(), []),
    safeQuery(() => jumlahKategori(), {}),
  ]);

  // Diskon (%) per produk dari harga coret; filter ?diskon= dihitung di sini (semua produk sudah termuat).
  const pct = (p: { harga: number; hargaDiskon: number | null }) => (p.hargaDiskon && p.hargaDiskon < p.harga ? Math.round((1 - p.hargaDiskon / p.harga) * 100) : 0);
  const diskonCounts = Object.fromEntries(DISKON_RANGES.map((r) => [r.value, products.filter((p) => { const d = pct(p); return d >= r.min && d <= r.max; }).length]));
  const dr = DISKON_RANGES.find((r) => r.value === searchParams.diskon);
  const shown = (dr ? products.filter((p) => { const d = pct(p); return d >= dr.min && d <= dr.max; }) : products)
    .filter((p) => (searchParams.b1g1 ? isB1G1(p.harga, p.hargaDiskon) : searchParams.deal ? !isB1G1(p.harga, p.hargaDiskon) : true));

  const cards = shown.map((p) => ({
    id: p.id,
    slug: p.slug,
    nama: p.nama,
    harga: p.harga,
    hargaDiskon: p.hargaDiskon,
    gambar: p.gambar,
    status: p.status,
    fromPrice: p._count.variants > 0,
    varian: variantChips(p.variants),
    spek: p.kategori === "Raket Tenis" ? spekKartuRaket({ nama: p.nama, variants: p.variants as Row["variants"], lab: p.compareItems.map((c) => ({ skor: null, nilai: {}, spek: c.spek as Record<string, string> })) }) : undefined,
  }));

  return (
    <>
      <ShopTabs jumlah={jumlah} />
      <Suspense fallback={null}>
        <ShopClient products={cards} brands={brands} diskonCounts={diskonCounts} q={searchParams.q} page={1} hasMore={false} tanpaFilter />
      </Suspense>
      <Footer />
    </>
  );
}
