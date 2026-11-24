import { notFound, permanentRedirect } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";
import ProductDetail from "@/components/ProductDetail";
import ProductCard from "@/components/ProductCard";
import ViewBeacon from "@/components/ViewBeacon";
import { b1g1Options } from "@/lib/b1g1-db";

// ISR: halaman produk di-cache 5 menit → DB cuma dibaca sekali per 5 menit (hemat egress),
// bukan tiap kunjungan/crawler. Stok/harga telat maks 5 menit — oke buat toko.
export const revalidate = 300;

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await safeQuery(
    () =>
      prisma.product.findFirst({
        where: { OR: [{ slug: decodeURIComponent(params.id) }, { id: params.id }] },
        include: { variants: { orderBy: { urutan: "asc" } } },
      }),
    null
  );
  if (!p) notFound();
  if (p.slug && params.id !== p.slug) permanentRedirect(`/product/${p.slug}`); // link lama (id) → URL nama produk

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

  const b1g1Others = await b1g1Options(); // pilihan pasangan Buy 1 Get 1

  return (
    <>
      <ViewBeacon id={p.id} />
      <ProductDetail
        p={{
          id: p.id,
          nama: p.nama,
          kategori: p.kategori,
          brand: p.brand,
          harga: p.harga,
          hargaDiskon: p.hargaDiskon,
          varianLabel: p.varianLabel,
          deskripsi: p.deskripsi,
          gambar: p.gambar,
          ukuran: p.ukuran,
          sizeChart: p.sizeChart,
          status: p.status,
          stok: p.stok,
          variants: p.variants.map((v) => ({
            id: v.id,
            warna: v.warna,
            ukuran: v.ukuran,
            harga: v.harga,
            hargaDiskon: v.hargaDiskon,
            stok: v.stok,
            gambar: v.gambar,
          })),
        }}
        b1g1Others={b1g1Others}
      />

      {related.length > 0 && (
        <section className="mx-auto max-w-[1200px] border-t px-4 py-12">
          <h2 className="mb-8 flex items-center justify-center gap-2 text-2xl font-extrabold text-gray-900">
            Produk Terkait {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
          </h2>
          <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-2">
            {related.map((r) => (
              <div key={r.id} className="snap-item w-[160px] shrink-0 sm:w-[220px]">
                <ProductCard
                  p={{ id: r.id, slug: r.slug, nama: r.nama, harga: r.harga, hargaDiskon: r.hargaDiskon, gambar: r.gambar, status: r.status, fromPrice: r._count.variants > 0 }}
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
