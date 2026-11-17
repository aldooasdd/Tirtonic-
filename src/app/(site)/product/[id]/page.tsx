import { notFound } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";
import ProductDetail from "@/components/ProductDetail";
import ProductCard from "@/components/ProductCard";
import ViewBeacon from "@/components/ViewBeacon";
import type { B1G1Option } from "@/components/B1G1Popup";
import { isB1G1 } from "@/lib/b1g1";

// ISR: halaman produk di-cache 5 menit → DB cuma dibaca sekali per 5 menit (hemat egress),
// bukan tiap kunjungan/crawler. Stok/harga telat maks 5 menit — oke buat toko.
export const revalidate = 300;

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

  // Pilihan pasangan Buy 1 Get 1 (barang diskon ≥50% yang masih ada stok).
  const b1Pool = await safeQuery(
    () => prisma.product.findMany({
      where: { status: "READY", OR: [{ hargaDiskon: { not: null } }, { variants: { some: { hargaDiskon: { not: null } } } }] },
      include: { variants: { orderBy: { urutan: "asc" } } },
      take: 60,
    }),
    [],
  );
  const b1g1Others: B1G1Option[] = b1Pool
    .map((x) => ({
      id: x.id, nama: x.nama, gambar: x.gambar[0] ?? null, harga: x.harga, stok: x.stok,
      ok: x.variants.length === 0 && isB1G1(x.harga, x.hargaDiskon) && (x.stok == null || x.stok > 0),
      variants: x.variants.filter((v) => v.stok > 0 && isB1G1(v.harga, v.hargaDiskon))
        .map((v) => ({ id: v.id, label: `${v.warna}${v.ukuran ? " / " + v.ukuran : ""}`, harga: v.harga, stok: v.stok, gambar: v.gambar ?? x.gambar[0] ?? null })),
    }))
    .filter((x) => x.ok || x.variants.length > 0)
    .map(({ ok: _ok, ...x }) => x);

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
                  p={{ id: r.id, nama: r.nama, harga: r.harga, hargaDiskon: r.hargaDiskon, gambar: r.gambar, status: r.status, fromPrice: r._count.variants > 0 }}
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
