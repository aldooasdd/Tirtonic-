import { notFound } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";
import ProductDetail from "@/components/ProductDetail";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await safeQuery(() => prisma.product.findUnique({ where: { id: params.id } }), null);
  if (!p) notFound();

  const related = await safeQuery(
    () =>
      prisma.product.findMany({
        where: { kategori: p.kategori, id: { not: p.id } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    []
  );

  return (
    <>
      <ProductDetail
        p={{
          id: p.id,
          nama: p.nama,
          kategori: p.kategori,
          brand: p.brand,
          harga: p.harga,
          deskripsi: p.deskripsi,
          gambar: p.gambar,
          ukuran: p.ukuran,
          status: p.status,
        }}
      />

      {related.length > 0 && (
        <section className="mx-auto max-w-[1200px] border-t px-4 py-12">
          <h2 className="mb-8 text-center text-2xl font-extrabold text-gray-900">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
            {related.map((r) => (
              <ProductCard
                key={r.id}
                p={{ id: r.id, nama: r.nama, harga: r.harga, gambar: r.gambar, status: r.status }}
              />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
