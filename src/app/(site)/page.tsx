import Link from "next/link";
import PreorderHeroSlides from "@/components/PreorderHeroSlides";
import LaunchCountdown from "@/components/LaunchCountdown";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer, { Benefits } from "@/components/Footer";
import { ArticleCardData } from "@/components/ArticleCard";
import { articleHref } from "@/lib/article-slug";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import { rupiah } from "@/lib/format";
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
    <section className="mx-auto max-w-site px-4 lg:px-6 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Our Store {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
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
              <img loading="lazy" decoding="async" src={s.foto} alt={s.nama} className="h-full w-full object-cover" />
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
    <section id="stringing-room" className="scroll-mt-24 mx-auto max-w-site px-4 lg:px-6 py-2">
      <div className="mb-1.5 flex items-center gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Tirtonic Stringing Room {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
      </div>
      {/* Grid full-width: semua card tinggi sama (ngikut antrian paling banyak) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => {
          const prog = r.items.filter((i) => i.status === "dikerjakan");
          const wait = r.items.filter((i) => i.status === "antri");
          const group = (items: RoomItem[], dot: string, pulse: boolean) =>
            items.map((it) => (
              <div key={it.code} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
                {pulse ? (
                  <span className={`flex h-2 w-2 shrink-0 rounded-full ${dot}`}>
                    <span className={`h-full w-full animate-ping rounded-full ${dot}`} />
                  </span>
                ) : (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                )}
                <span className="font-mono text-sm font-bold text-white">{it.code}</span>
                {it.stringer && <span className="ml-auto truncate text-xs text-white/70">Stringer : {it.stringer}</span>}
              </div>
            ));
          return (
            <div key={r.name} className="glass-primary flex flex-col rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-white">{r.name}</h3>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-red-300">Live</span>
                </span>
              </div>
              <div className="mt-3 flex-1 space-y-3">
                {r.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/60">Belum ada antrian</p>
                ) : (
                  <>
                    {prog.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-300">On Progress</p>
                        <div className="space-y-2">{group(prog, "bg-sky-400", true)}</div>
                      </div>
                    )}
                    {wait.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-300">Waiting</p>
                        <div className="space-y-2">{group(wait, "bg-amber-400", false)}</div>
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
        Data antrian ditampilkan secara live dan diperbarui otomatis sesuai progres pengerjaan di Tirtonic Stringing Room.
      </p>
    </section>
  );
}

type BrandItem = { id: string; nama: string; foto: string };

function BrandPopular({ brands }: { brands: BrandItem[] }) {
  if (brands.length === 0) return null;
  return (
    <section className="mx-auto max-w-site px-4 lg:px-6 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Brand Popular {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
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
              <img loading="lazy" decoding="async" src={b.foto} alt={b.nama} className="h-full w-full object-cover" />
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
    <section className="mx-auto max-w-site px-4 lg:px-6 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Recommended For You {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
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
    <section className="mx-auto max-w-site px-4 lg:px-6 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          New Arrival {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
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
    <section className="mx-auto max-w-site px-4 lg:px-6 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          Best Deal {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
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
    <section className="mx-auto max-w-site px-4 lg:px-6 pb-10 pt-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          New Article {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-7 w-7" />
        </h2>
        <Link href="/articles" className="text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="text-gray-500">Belum ada artikel.</p>
      ) : (
        <div className="snap-x-carousel -mx-2 -mb-4 flex gap-4 overflow-x-auto px-2 pb-6 pt-1">
          {articles.map((a) => (
            <Link key={a.id} href={articleHref(a)} className="snap-item glass-card group flex !shadow-[0_8px_20px_-12px_rgba(17,24,39,0.25)] w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl sm:w-[260px]">
              <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                {a.gambar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={a.gambar} alt={a.judul} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">No image</div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                {a.tag && <span className="w-fit rounded bg-primary px-2 py-0.5 text-xs font-semibold text-white">{a.tag.split(",")[0]}</span>}
                <h3 className="mt-2 line-clamp-2 font-bold leading-snug text-gray-900 group-hover:text-primary">{a.judul}</h3>
                <p className="mt-auto pt-3 text-xs text-gray-500">{fmtTanggal(a.tanggal)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

type PreorderBanner = { id: string; nama: string; tagline: string | null; slogan: string | null; harga: number; gambar: string[]; bannerDesktop: string | null; bannerMobile: string | null; bannersDesktop: string[]; bannersMobile: string[]; estimasi: string | null; launchAt: Date | null; kuota: number | null; variants: { stok: number }[]; _count: { orders: number } };

// Hero pre-order di landing (ala Apple): judul + subjudul + estimasi di tengah,
// tombol Learn more + Pre-order (glass-primary hijau tua), lalu foto landscape.
function PreorderBanners({ products }: { products: PreorderBanner[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-site space-y-4 px-4 py-2 lg:px-6">
      {products.map((p) => (
        <div key={p.id} className="relative w-full overflow-hidden rounded-2xl">
          {/* Slide banner (crossfade). Fallback: banner tunggal lama → foto produk. */}
          {(() => {
            const dt = p.bannersDesktop.length ? p.bannersDesktop : (p.bannerDesktop ? [p.bannerDesktop] : p.gambar.slice(0, 1));
            const mb = p.bannersMobile.length ? p.bannersMobile : (p.bannerMobile ? [p.bannerMobile] : dt);
            return <PreorderHeroSlides desktop={dt} mobile={mb} alt={p.nama} />;
          })()}
          {/* scrim bawah (mobile) biar teks kebaca di atas foto cover */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white/80 via-white/40 to-transparent sm:hidden" />
          {/* Layout ala Apple: teks kiri-bawah, kapsul kanan-bawah. Mobile: ditumpuk. */}
          <div className="absolute inset-0 flex flex-col items-start justify-end gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-10">
            <div className="min-w-0 text-left">
              <LaunchCountdown date={p.launchAt ? p.launchAt.toISOString() : null} />
              {(() => {
                // Total unit = jumlah stok semua varian (kalau ada), selain itu kuota produk.
                const total = p.variants.length ? p.variants.reduce((s, v) => s + v.stok, 0) : p.kuota;
                return total ? (
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-gray-800 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {Math.min(p._count.orders, total)}/{total}
                  </span>
                ) : null;
              })()}
              <p className="text-sm font-semibold text-gray-800 sm:text-lg">{p.nama}</p>
              {p.slogan && <h2 className="my-px text-xl font-bold tracking-tight text-gray-900 sm:text-[2.75rem]">{p.slogan}</h2>}
              {p.estimasi && <p className="mt-2 text-xs font-light text-gray-600 sm:mt-3 sm:text-sm">{p.estimasi}</p>}
            </div>
            <Link href={`/preorder/${p.id}`} className="relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full bg-black/5 py-1.5 pl-4 pr-1.5 text-sm font-semibold text-gray-900 transition hover:brightness-105">
              {/* liquid glass: rim shadow + distorsi backdrop (SVG #container-glass) */}
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_3px_3px_0.5px_-3px_rgba(255,255,255,0.6),inset_-3px_-3px_0.5px_-3px_rgba(255,255,255,0.5),inset_0_0_6px_6px_rgba(255,255,255,0.12),0_0_12px_rgba(0,0,0,0.15)]" />
              <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-full" style={{ backdropFilter: 'url("#container-glass")' }} />
              <span className="relative z-10 px-1">{rupiah(p.harga)}</span>
              <span className="glass-primary relative z-10 rounded-full px-5 py-1.5 font-bold text-white">Pre-order</span>
            </Link>
          </div>
        </div>
      ))}
      <GlassFilter />
    </section>
  );
}

// Filter distorsi untuk efek liquid glass (dipakai via backdropFilter: url(#container-glass)).
function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden>
      <defs>
        <filter id="container-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

export default async function HomePage() {
  const [stores, articles, slides, latest, deals, popular, brands, sfBranches, sfActive, preorders] = await Promise.all([
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
    safeQuery(() => prisma.preorderProduct.findMany({ where: { isActive: true, showOnLanding: true }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, nama: true, tagline: true, slogan: true, harga: true, gambar: true, bannerDesktop: true, bannerMobile: true, bannersDesktop: true, bannersMobile: true, estimasi: true, launchAt: true, kuota: true, variants: { select: { stok: true } }, _count: { select: { orders: true } } } }), []),
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
      <div className="mx-auto max-w-site px-4 lg:px-6 pb-2 pt-8 text-center">
        <h2 className="text-xl font-extrabold text-gray-900">
          Toko Tennis Yogyakarta, Solo &amp; Semarang
        </h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Berdiri sejak 2022 • 3 Lokasi Cabang • Ribuan Customer • Bisa kirim seluruh Indonesia gratis ongkir
        </p>
      </div>
      <PreorderBanners products={preorders} />
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
