import { notFound } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";
import ProductDetail from "@/components/ProductDetail";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await safeQuery(
    () =>
      prisma.product.findUnique({
        where: { id: params.id },
        include: { variants: { orderBy: { urutan: "asc" } } },
      }),
    null
  );
  if (!p) notFound();

  // Count the view — fire-and-forget so it never blocks or breaks the page render.
  prisma.product.update({ where: { id: p.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const related = await safeQuery(
    () =>
      prisma.product.findMany({
        where: { kategori: p.kategori, id: { not: p.id } },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { _count: { select: { variants: true } } },
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
          hargaCoret: p.hargaCoret,
          deskripsi: p.deskripsi,
          gambar: p.gambar,
          ukuran: p.ukuran,
          sizeChart: p.sizeChart,
          status: p.status,
          variants: p.variants.map((v) => ({
            warna: v.warna,
            ukuran: v.ukuran,
            harga: v.harga,
            hargaCoret: v.hargaCoret,
            stok: v.stok,
            gambar: v.gambar,
          })),
        }}
      />

      {related.length > 0 && (
        <section className="mx-auto max-w-[1200px] border-t px-4 py-12">
          <h2 className="mb-8 flex items-center justify-center gap-2 text-2xl font-extrabold text-gray-900">
            Produk Terkait {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-7 w-7" />
          </h2>
          <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-2">
            {related.map((r) => (
              <div key={r.id} className="snap-item w-[160px] shrink-0 sm:w-[220px]">
                <ProductCard
                  p={{ id: r.id, nama: r.nama, harga: r.harga, hargaCoret: r.hargaCoret, gambar: r.gambar, status: r.status, fromPrice: r._count.variants > 0 }}
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
