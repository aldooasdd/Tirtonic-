import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";
import { ArticleCardData } from "@/components/ArticleCard";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import SeoBlock from "@/components/SeoBlock";
import HeroCarousel from "@/components/HeroCarousel";

function fmtTanggal(d: Date) {
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export const dynamic = "force-dynamic";

type StoreItem = { id: string; nama: string; alamat: string; jam: string | null; foto: string | null; maps: string | null };

function OurStore({ stores }: { stores: StoreItem[] }) {
  return (
    <section className="mx-auto max-w-site px-4 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Our Store {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
        <Link href="/contact" className="text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>
      {stores.length === 0 ? (
        <p className="text-gray-500">Belum ada data cabang.</p>
      ) : (
        <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-2">
          {stores.map((s) => {
            const inner = s.foto ? (
              // square 1080x1080 photo
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.foto} alt={s.nama} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col justify-end bg-gradient-to-br from-primaryDark to-primary p-5 text-white">
                <div className="text-3xl font-black uppercase drop-shadow">{s.nama}</div>
                <div className="mt-1 text-sm">{s.alamat}</div>
                <div className="mt-3 text-xs opacity-90">{s.jam}</div>
              </div>
            );
            const imgCls = "block aspect-square overflow-hidden bg-gray-100";
            return (
              <div key={s.id} className="snap-item w-[280px] shrink-0 sm:w-[320px]">
                <h3 className="mb-2 line-clamp-1 text-center text-sm font-bold text-gray-900">{s.nama}</h3>
                {s.maps ? (
                  <a href={s.maps} target="_blank" rel="noreferrer" className={imgCls}>{inner}</a>
                ) : (
                  <div className={imgCls}>{inner}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NewArrival({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-4 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          New Arrival {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
        <Link href="/shop?sort=newest" className="text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-2">
        {products.map((p) => (
          <div key={p.id} className="snap-item w-[200px] shrink-0 sm:w-[220px]">
            <ProductCard p={p} thinPrice />
          </div>
        ))}
      </div>
    </section>
  );
}

function NewArticles({ articles }: { articles: ArticleCardData[] }) {
  return (
    <section className="mx-auto max-w-site px-4 pb-10 pt-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          New Article {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
        <Link href="/articles" className="text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="text-gray-500">Belum ada artikel.</p>
      ) : (
        <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-2">
          {articles.map((a) => (
            <Link key={a.id} href={`/articles/${a.id}`} className="snap-item group block w-[240px] shrink-0 sm:w-[260px]">
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
                {a.gambar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.gambar} alt={a.judul} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">No image</div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                {a.tag && (
                  <span className="rounded bg-primary px-2 py-0.5 font-semibold text-white">{a.tag.split(",")[0]}</span>
                )}
                <span>{fmtTanggal(a.tanggal)}</span>
              </div>
              <h3 className="mt-2 line-clamp-3 font-bold text-gray-900 group-hover:text-primary">{a.judul}</h3>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  const [stores, articles, slides, latest] = await Promise.all([
    safeQuery(() => prisma.store.findMany({ orderBy: [{ urutan: "asc" }, { nama: "asc" }] }), []),
    safeQuery(() => prisma.article.findMany({ orderBy: { tanggal: "desc" }, take: 8 }), []),
    safeQuery(
      () => prisma.heroSlide.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }] }),
      []
    ),
    safeQuery(() => prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 12 }), []),
  ]);
  const arrivals = latest.map((p) => ({ id: p.id, nama: p.nama, harga: p.harga, gambar: p.gambar, status: p.status }));
  const storeItems = stores.map((s) => ({
    id: s.id,
    nama: s.nama,
    alamat: s.alamat,
    jam: s.jam,
    foto: s.foto,
    maps: s.maps,
  }));

  return (
    <>
      <HeroCarousel slides={slides.map((s) => ({ id: s.id, gambar: s.gambar, gambarMobile: s.gambarMobile, link: s.link }))} />
      <div className="mx-auto max-w-site px-4 pb-2 pt-8 text-center">
        <h2 className="text-xl font-extrabold text-gray-900">
          Toko Tennis Yogyakarta, Solo &amp; Semarang
        </h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Berdiri sejak 2016 • 3 Lokasi Cabang • Ribuan Customer • Bisa kirim seluruh Indonesia gratis ongkir
        </p>
      </div>
      <OurStore stores={storeItems} />
      <NewArrival products={arrivals} />
      <NewArticles articles={articles} />
      <SeoBlock />
      <Footer benefits />
    </>
  );
}
