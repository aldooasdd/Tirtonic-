import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer, { Benefits } from "@/components/Footer";
import { ArticleCardData } from "@/components/ArticleCard";
import { articleHref } from "@/lib/article-slug";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import SeoBlock from "@/components/SeoBlock";
import HeroCarousel from "@/components/HeroCarousel";

function fmtTanggal(d: Date) {
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// ISR: beranda di-cache 2 menit → hemat egress DB (gak query tiap kunjungan/crawler).
export const revalidate = 120;

type StoreItem = { id: string; nama: string; alamat: string; jam: string | null; foto: string | null; maps: string | null };

function OurStore({ stores }: { stores: StoreItem[] }) {
  return (
    <section className="mx-auto max-w-site px-4 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Our Store {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
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

// Papan antrian stringing publik: hanya kode + status (TANPA nama/HP/raket/senar).
type RoomItem = { code: string; status: string; stringer: string | null };
type Room = { name: string; items: RoomItem[] };

function StringingRoom({ rooms }: { rooms: Room[] }) {
  if (rooms.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-4 py-2">
      <div className="mb-1.5 flex items-center gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Tirtonic Stringing Room {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
      </div>
      {/* Grid full-width: semua card tinggi sama (ngikut antrian paling banyak) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => {
          const prog = r.items.filter((i) => i.status === "dikerjakan");
          const wait = r.items.filter((i) => i.status === "antri");
          const group = (items: RoomItem[], dot: string, pulse: boolean) =>
            items.map((it) => (
              <div key={it.code} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
                {pulse ? (
                  <span className={`flex h-2 w-2 shrink-0 rounded-full ${dot}`}>
                    <span className={`h-full w-full animate-ping rounded-full ${dot}`} />
                  </span>
                ) : (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                )}
                <span className="font-mono text-sm font-bold text-primary">{it.code}</span>
                {it.stringer && <span className="ml-auto truncate text-xs text-gray-500">Stringer : {it.stringer}</span>}
              </div>
            ));
          return (
            <div key={r.name} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-gray-900">{r.name}</h3>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-red-600">Live</span>
                </span>
              </div>
              <div className="mt-3 flex-1 space-y-3">
                {r.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">Belum ada antrian</p>
                ) : (
                  <>
                    {prog.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-600">On Progress</p>
                        <div className="space-y-2">{group(prog, "bg-blue-500", true)}</div>
                      </div>
                    )}
                    {wait.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-600">Waiting</p>
                        <div className="space-y-2">{group(wait, "bg-amber-500", false)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Data antrean ditampilkan secara live dan diperbarui otomatis sesuai progres pengerjaan di Tirtonic Stringing Room.
      </p>
    </section>
  );
}

type BrandItem = { id: string; nama: string; foto: string };

function BrandPopular({ brands }: { brands: BrandItem[] }) {
  if (brands.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-4 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Brand Popular {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
        <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-2">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/shop?q=${encodeURIComponent(b.nama)}`}
            className="snap-item group block w-[240px] shrink-0 sm:w-[280px]"
          >
            <p className="mb-2 text-center text-sm font-bold uppercase text-gray-900">{b.nama}</p>
            <div className="aspect-[3/2] overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.foto} alt={b.nama} className="h-full w-full object-cover" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ForYou({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-4 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Recommended For You {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
        <Link href="/shop?sort=popular" className="text-sm font-semibold text-primary hover:underline">
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

function BestDeal({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-4 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Best Deal {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
        <Link href="/shop?deal=1" className="text-sm font-semibold text-primary hover:underline">
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
            <Link key={a.id} href={articleHref(a)} className="snap-item group block w-[240px] shrink-0 sm:w-[260px]">
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
  const [stores, articles, slides, latest, deals, popular, brands, sfBranches, sfActive] = await Promise.all([
    safeQuery(() => prisma.store.findMany({ orderBy: [{ urutan: "asc" }, { nama: "asc" }] }), []),
    safeQuery(() => prisma.article.findMany({ orderBy: { tanggal: "desc" }, take: 8 }), []),
    safeQuery(
      () => prisma.heroSlide.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }] }),
      []
    ),
    safeQuery(() => prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { _count: { select: { variants: true } } } }), []),
    safeQuery(() => prisma.product.findMany({ where: { hargaDiskon: { not: null } }, orderBy: { updatedAt: "desc" }, take: 16, include: { _count: { select: { variants: true } } } }), []),
    safeQuery(() => prisma.product.findMany({ where: { status: "READY", views: { gt: 0 } }, orderBy: { views: "desc" }, take: 12, include: { _count: { select: { variants: true } } } }), []),
    safeQuery(() => prisma.popularBrand.findMany({ orderBy: [{ urutan: "asc" }, { nama: "asc" }] }), []),
    safeQuery(() => prisma.sfBranch.findMany({ where: { isActive: true, slug: { not: "tirtonic" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }), []),
    safeQuery(() => prisma.sfOrder.findMany({ where: { status: { in: ["antri", "dikerjakan"] } }, orderBy: { createdAt: "asc" }, select: { resultCode: true, status: true, branchId: true, stringerName: true } }), []),
  ]);
  const toCard = (p: (typeof latest)[number]) => ({ id: p.id, nama: p.nama, harga: p.harga, hargaDiskon: p.hargaDiskon, gambar: p.gambar, status: p.status, fromPrice: p._count.variants > 0 });
  const arrivals = latest.map(toCard);
  const forYou = popular.map(toCard);
  // only keep real discounts (diskon < harga), cap at 12
  const bestDeals = deals.filter((p) => p.hargaDiskon != null && p.hargaDiskon < p.harga).slice(0, 12).map(toCard);
  const storeItems = stores.map((s) => ({
    id: s.id,
    nama: s.nama,
    alamat: s.alamat,
    jam: s.jam,
    foto: s.foto,
    maps: s.maps,
  }));
  // Papan antrian per cabang: dikerjakan dulu, lalu antri (FIFO). Hanya kode + status.
  const stringingRooms: Room[] = sfBranches.map((b) => {
    const list = sfActive
      .filter((o) => o.branchId === b.id)
      .sort((a, z) => (a.status === z.status ? 0 : a.status === "dikerjakan" ? -1 : 1));
    return { name: b.name, items: list.map((o) => ({ code: o.resultCode, status: o.status, stringer: o.stringerName })) };
  });

  return (
    <>
      <HeroCarousel slides={slides.map((s) => ({ id: s.id, gambar: s.gambar, gambarMobile: s.gambarMobile, link: s.link }))} />
      <div className="mx-auto max-w-site px-4 pb-2 pt-8 text-center">
        <h2 className="text-xl font-extrabold text-gray-900">
          Toko Tennis Yogyakarta, Solo &amp; Semarang
        </h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Berdiri sejak 2022 • 3 Lokasi Cabang • Ribuan Customer • Bisa kirim seluruh Indonesia gratis ongkir
        </p>
      </div>
      <ForYou products={forYou} />
      <BrandPopular brands={brands.map((b) => ({ id: b.id, nama: b.nama, foto: b.foto }))} />
      <BestDeal products={bestDeals} />
      <NewArrival products={arrivals} />
      <Benefits />
      <OurStore stores={storeItems} />
      <StringingRoom rooms={stringingRooms} />
      <NewArticles articles={articles} />
      <SeoBlock />
      <Footer />
    </>
  );
}
