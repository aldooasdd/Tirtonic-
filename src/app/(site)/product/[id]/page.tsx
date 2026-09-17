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
        take: 12,
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
          sizeChart: p.sizeChart,
          status: p.status,
        }}
      />

      {related.length > 0 && (
        <section className="mx-auto max-w-[1200px] border-t px-4 py-12">
          <h2 className="mb-8 text-center text-2xl font-extrabold text-gray-900">Produk Terkait</h2>
          <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-2">
            {related.map((r) => (
              <div key={r.id} className="snap-item w-[160px] shrink-0 sm:w-[220px]">
                <ProductCard
                  p={{ id: r.id, nama: r.nama, harga: r.harga, gambar: r.gambar, status: r.status }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
