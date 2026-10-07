import { Prisma } from "@prisma/client";
import { prisma, safeQuery } from "@/lib/prisma";
import ShopClient from "@/components/ShopClient";
import Footer from "@/components/Footer";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type SP = { sort?: string; size?: string; brand?: string; type?: string; q?: string; price?: string; page?: string; deal?: string };

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
  if (searchParams.price) {
    const [min, max] = searchParams.price.split("-").map((n) => (n ? parseInt(n, 10) : undefined));
    where.harga = { gte: min ?? 0, ...(max ? { lte: max } : {}) };
  }

  const [products, brandRows] = await Promise.all([
    safeQuery(
      () =>
        prisma.product.findMany({
          where,
          orderBy: orderBy(searchParams.sort),
          include: { _count: { select: { variants: true } }, variants: { select: { warna: true, ukuran: true, stok: true }, orderBy: { urutan: "asc" } } },
        }),
      []
    ),
    safeQuery(
      () => prisma.product.findMany({ where: { brand: { not: null } }, distinct: ["brand"], select: { brand: true } }),
      []
    ),
  ]);
  const brands = brandRows.map((r) => r.brand!).filter(Boolean).sort();

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

  const cards = products.map((p) => ({
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
        <ShopClient products={cards} brands={brands} q={searchParams.q} />
      </Suspense>
      <Footer />
    </>
  );
}
