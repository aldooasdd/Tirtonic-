import { Prisma } from "@prisma/client";
import { prisma, safeQuery } from "@/lib/prisma";
import ShopClient from "@/components/ShopClient";
import Footer from "@/components/Footer";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type SP = { sort?: string; size?: string; brand?: string; type?: string; q?: string; price?: string; page?: string };

const PER_PAGE = 12;

function orderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { harga: "asc" };
    case "price_desc":
      return { harga: "desc" };
    case "newest":
      return { createdAt: "desc" };
    default:
      return { createdAt: "desc" }; // featured ~ newest for now
  }
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const where: Prisma.ProductWhereInput = {};
  if (searchParams.type) where.kategori = searchParams.type;
  if (searchParams.brand) where.brand = searchParams.brand;
  if (searchParams.size) where.ukuran = { has: searchParams.size };
  if (searchParams.q) where.nama = { contains: searchParams.q, mode: "insensitive" };
  if (searchParams.price) {
    const [min, max] = searchParams.price.split("-").map((n) => (n ? parseInt(n, 10) : undefined));
    where.harga = { gte: min ?? 0, ...(max ? { lte: max } : {}) };
  }

  const total = await safeQuery(() => prisma.product.count({ where }), 0);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, parseInt(searchParams.page || "1", 10) || 1));

  const [products, brandRows] = await Promise.all([
    safeQuery(
      () =>
        prisma.product.findMany({
          where,
          orderBy: orderBy(searchParams.sort),
          skip: (page - 1) * PER_PAGE,
          take: PER_PAGE,
        }),
      []
    ),
    safeQuery(
      () => prisma.product.findMany({ where: { brand: { not: null } }, distinct: ["brand"], select: { brand: true } }),
      []
    ),
  ]);
  const brands = brandRows.map((r) => r.brand!).filter(Boolean).sort();
  const cards = products.map((p) => ({
    id: p.id,
    nama: p.nama,
    harga: p.harga,
    gambar: p.gambar,
    status: p.status,
  }));

  return (
    <>
      <Suspense fallback={null}>
        <ShopClient products={cards} brands={brands} q={searchParams.q} currentPage={page} totalPages={totalPages} />
      </Suspense>
      <Footer />
    </>
  );
}
