import type { Metadata } from "next";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import EventCard, { EventCardData } from "@/components/EventCard";
import { phaseOf } from "@/lib/event-phase";
import { productsForCampaigns, demoRequestOptions, AJUKAN_DEMO_ON } from "@/lib/demo-products";
import ProductRail from "@/components/ProductRail";
import { EventNavLinks, CityTabs } from "@/components/SlidePills";
import KomunitasSheet, { KomunitasTrigger, AjukanTrigger, AjukanSheet } from "@/components/KomunitasSheet";
import { currentCommunity } from "@/lib/community-auth";

export const dynamic = "force-dynamic"; // filter kota via ?kota=
export const metadata: Metadata = { title: "Event Demo Produk — Tirtonic", description: "Jadwal demo produk brand tenis bareng komunitas se-wilayah. Lihat acara yang sedang & akan berlangsung, atau daftarkan komunitasmu." };

// Gradien banner per brand (kalau kampanye tak punya foto banner).
const BRAND_BG: Record<string, [string, string]> = {
  yonex: ["from-emerald-950 via-neutral-950 to-lime-950", "text-lime-300 border-lime-300/20"],
  wilson: ["from-red-950 via-neutral-950 to-neutral-900", "text-red-300 border-red-400/20"],
  babolat: ["from-blue-950 via-neutral-950 to-indigo-950", "text-sky-300 border-sky-300/20"],
  head: ["from-neutral-900 via-stone-900 to-amber-950", "text-amber-200 border-amber-300/20"],
  prince: ["from-neutral-950 via-zinc-900 to-orange-950", "text-orange-200 border-orange-300/20"],
};
const bgOf = (brand: string) => BRAND_BG[brand.trim().toLowerCase()] ?? ["from-neutral-900 via-neutral-950 to-emerald-950", "text-emerald-200 border-emerald-300/20"];

const Pin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
);
const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);

type Camp = { id: string; brand: string; title: string; productType: string; description: string; banner: string | null; location: string | null };

/** Banner kartu: foto kampanye (kalau ada) atau slab gelap ber-gradien brand. */
function Banner({ c, badge, sub, dim }: { c: Pick<Camp, "brand" | "title" | "productType" | "banner">; badge?: string; sub?: string; dim?: boolean }) {
  const [bg, tone] = bgOf(c.brand);
  return (
    <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${bg} ${dim ? "grayscale-[35%]" : ""}`}>
      {c.banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={c.banner} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      )}
      {!c.banner && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />}
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-md border bg-black/50 px-2.5 py-1 text-[11px] font-[800] uppercase tracking-widest backdrop-blur-md ${tone}`}>{c.brand}</span>
          {badge && <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-[500] text-white/90 backdrop-blur-md">{badge}</span>}
        </div>
        {!c.banner && <div>
          <div className={`text-[11px] font-[600] uppercase tracking-wider ${tone.split(" ")[0]}`}>{c.productType}</div>
          <div className="line-clamp-2 text-lg font-[850] uppercase leading-tight tracking-tight text-white sm:text-xl">{c.title}</div>
          {sub && <div className="mt-0.5 text-[10px] font-[500] text-neutral-300">{sub}</div>}
        </div>}
      </div>
      <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full border-4 border-white/10 transition-transform duration-500 group-hover:scale-110" />
    </div>
  );
}

function SectionHead({ id, dot, kicker, sub, title, right }: { id?: string; dot: string; kicker: string; sub: string; title: string; right?: React.ReactNode }) {
  return (
    <div id={id} className="mb-8 flex scroll-mt-28 flex-col justify-between gap-4 border-b border-black/[0.07] pb-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ring-4 ${dot}`} />
          <span className="text-xs font-[600] uppercase tracking-wider text-neutral-800">{kicker}</span>
          <span className="text-xs text-neutral-400">/</span>
          <span className="text-xs font-[500] text-neutral-500">{sub}</span>
        </div>
        <h2 className="text-2xl font-[600] tracking-tight text-neutral-950 sm:text-3xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export default async function EventLanding({ searchParams }: { searchParams: { kota?: string } }) {
  const [campaigns, claims] = await Promise.all([
    safeQuery(() => prisma.demoCampaign.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 24 }), []),
    safeQuery(
      () =>
        prisma.demoClaim.findMany({
          where: { status: "accepted" },
          orderBy: { demoDate: "asc" },
          include: {
            campaign: { select: { brand: true, title: true, productType: true, banner: true, location: true } },
            community: { select: { name: true, logo: true } },
            participants: { select: { status: true } },
          },
        }),
      [],
    ),
  ]);

  // Filter kota (lokasi kampanye: Jogja / Solo / Semarang).
  const cities = Array.from(new Set(campaigns.map((c) => c.location).filter(Boolean) as string[])).sort();
  const kota = cities.includes(searchParams.kota ?? "") ? searchParams.kota! : "";
  const inCity = (loc: string | null) => !kota || loc === kota;

  // Kampanye: ACC brand → Now (siap diklaim); belum ACC → Coming soon.
  const nowCampaigns = campaigns.filter((c) => c.brandApproved && inCity(c.location));
  const soonCampaigns = campaigns.filter((c) => !c.brandApproved && inCity(c.location));

  const events = claims
    .filter((c) => inCity(c.campaign.location))
    .map((c) => ({
      id: c.id,
      court: c.court,
      lat: c.lat,
      lng: c.lng,
      quotaType: c.quotaType,
      quota: c.quota,
      demoDate: c.demoDate,
      status: c.status,
      time: c.time,
      timeEnd: c.timeEnd,
      acceptedCount: c.participants.filter((p) => p.status === "accepted").length,
      campaign: c.campaign,
      community: c.community,
    }));
  const nowEvents: EventCardData[] = events.filter((e) => ["ongoing", "coming_soon"].includes(phaseOf(e)));
  const lastedEvents = events.filter((e) => phaseOf(e) === "done").reverse(); // terbaru dulu

  // Produk yang sedang didemokan (kampanye aktif + acara terjadwal), dicocokkan brand + jenis produk.
  const demoCamps = [...nowCampaigns, ...nowEvents.map((e) => e.campaign)];
  const brands = Array.from(new Set(demoCamps.map((c) => c.brand)));
  const pool = brands.length
    ? await safeQuery(
        () =>
          prisma.product.findMany({
            where: { status: "READY", OR: brands.map((b) => ({ brand: { equals: b, mode: "insensitive" as const } })) },
            orderBy: { createdAt: "desc" },
            select: { id: true, nama: true, brand: true, kategori: true, harga: true, hargaDiskon: true, gambar: true },
          }),
        [],
      )
    : [];
  const products = productsForCampaigns(demoCamps, pool);

  const community = await currentCommunity();
  const loggedIn = !!community;
  const sortedOptions = await demoRequestOptions();
  const fmtDay = (d: Date) => d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  const glass = "ev-glass rounded-xl";
  const pill = "ev-pill";

  return (
    <div className="ev-page relative min-h-screen overflow-x-clip bg-[#f7f9fb] text-neutral-900 [letter-spacing:-0.011em]">
      {/* orb warna latar */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-lime-300/20 via-emerald-200/15 to-transparent blur-[100px]" />
        <div className="absolute -right-20 top-1/3 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-sky-300/20 via-blue-200/15 to-transparent blur-[110px]" />
        <div className="absolute bottom-10 left-10 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-lime-200/20 via-teal-100/25 to-transparent blur-[110px]" />
      </div>

      {/* Nav kapsul kaca */}
      <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-5 sm:px-6">
        <div className="ev-nav mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-[800] tracking-tight text-neutral-950 sm:text-base">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-xl object-contain" />
            <span>Tirtonic <span className="text-xs font-[500] text-neutral-500 sm:text-sm">Events</span></span>
          </Link>
          <nav className="hidden md:block">
            <EventNavLinks
              items={[
                { key: "demo-aktif", label: "Demo Aktif" },
                ...(soonCampaigns.length ? [{ key: "mendatang", label: "Mendatang" }] : []),
                ...(lastedEvents.length ? [{ key: "riwayat", label: "Riwayat" }] : []),
                ...(products.length ? [{ key: "store", label: "Produk Demo" }] : []),
              ]}
            />
          </nav>
          <div className="flex items-center gap-2">
            <KomunitasTrigger loggedIn={loggedIn} className={`${pill} hidden rounded-full px-3 py-1.5 text-xs font-[600] text-neutral-800 hover:bg-white sm:inline-flex`}>Dashboard Komunitas</KomunitasTrigger>
            <AjukanTrigger className="ev-btn inline-flex items-center rounded-full border border-white/20 bg-neutral-950 px-4 py-1.5 text-xs font-[500] text-white transition hover:bg-neutral-800 active:scale-95">Ajukan Demo</AjukanTrigger>
          </div>
        </div>
      </header>

      <main className="relative pt-24 sm:pt-28">
        {/* Hero */}
        <section className="relative pb-16 pt-12 sm:pb-28 sm:pt-20">
          <div className="ev-orb -top-40 left-1/2 h-[340px] w-[720px] -translate-x-1/2 bg-gradient-to-r from-lime-300/35 via-emerald-300/25 to-sky-300/30" />
          <div className="ev-orb right-10 top-20 h-[380px] w-[380px] bg-gradient-to-bl from-teal-200/40 to-blue-200/30" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className={`${pill} mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-[600] text-emerald-800`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              Demo produk × komunitas tenis
            </div>
            <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-[600] leading-[1.08] tracking-[-0.03em] text-neutral-950 sm:text-5xl md:text-[56px]">
              Rasakan Performa Terbaru, <br className="hidden sm:inline" />Langsung di Lapangan.
            </h1>
            <p className="mx-auto mb-9 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg md:text-xl">
              Program demo eksklusif perlengkapan tenis dari brand-brand ternama dunia, dihadirkan Tirtonic khusus untuk komunitas tenis di kota Anda.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#demo-aktif" className="ev-btn inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-neutral-900 px-6 py-3 text-sm font-[500] text-white transition hover:bg-neutral-800 active:scale-95 sm:w-auto">
                Lihat Demo Aktif
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
              </a>
              <KomunitasTrigger loggedIn={loggedIn} className={`${pill} inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-[500] text-neutral-800 transition hover:bg-white/90 active:scale-95 sm:w-auto`}>
                Cara Mengajukan Demo <span className="text-neutral-500"><Arrow /></span>
              </KomunitasTrigger>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neutral-300/60 to-transparent" />
        </section>

        {/* Filter kota */}
        <section className="relative z-20 mx-auto -mt-6 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="ev-dock flex flex-col items-stretch justify-between gap-3 rounded-2xl p-2.5 md:flex-row md:items-center">
            <CityTabs cities={cities} current={kota} />
            <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-1 pt-2 text-xs text-neutral-600 md:justify-end md:border-t-0 md:pt-0">
              <span className="flex items-center gap-1.5 font-[500] text-neutral-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-lime-600" aria-hidden><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
                {nowCampaigns.length + nowEvents.length} Demo Aktif
              </span>
              <span className="inline-block h-1 w-1 rounded-full bg-neutral-400" />
              <span className="text-neutral-500">Gratis untuk Komunitas</span>
            </div>
          </div>
        </section>

        {/* NOW: demo siap diklaim + acara terjadwal */}
        <section className="mx-auto max-w-6xl px-4 pb-2 pt-14 sm:px-6 lg:px-8">
          <SectionHead id="demo-aktif" dot="bg-lime-500 ring-lime-300/40" kicker="Now" sub="Tersedia dan sedang berlangsung" title="Demo siap diklaim komunitas" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7">
            {nowCampaigns.map((c) => (
              <KomunitasTrigger key={c.id} loggedIn={loggedIn} context={`${c.location ? c.location + " • " : ""}${c.title}`} className={`${glass} ev-lift group flex flex-col overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-black/[0.06] bg-white/70 px-4 py-2.5 backdrop-blur-md">
                  <span className="flex items-center gap-1.5 text-xs font-[600] text-neutral-900"><Pin /> {c.location ?? "Semua cabang"}</span>
                  <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-[600] text-lime-800">Siap diklaim</span>
                </div>
                <Banner c={c} sub="Tirtonic × Komunitas" />
                <div className="flex flex-grow flex-col justify-between p-6">
                  <div>
                    <p className="mb-1 text-xs font-[600] text-emerald-700">● {c.productType}</p>
                    <h3 className="mb-1.5 text-lg font-[600] leading-snug text-neutral-950">{c.title}</h3>
                    <p className="mb-5 line-clamp-3 text-xs text-neutral-500">{c.description}</p>
                  </div>
                  <span className="ev-btn inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#173f2f] px-4 py-2.5 text-xs font-[600] text-white transition group-hover:bg-[#0f2d21]">
                    Gabung sebagai komunitas <Arrow />
                  </span>
                </div>
              </KomunitasTrigger>
            ))}

            {/* Kartu ajakan */}
            {AJUKAN_DEMO_ON && <div className={`${glass} flex flex-col justify-between p-6`}>
              <div>
                <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-neutral-950 text-lime-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                </span>
                <p className="text-[11px] font-[600] uppercase tracking-wider text-neutral-500">Bawa demo ke komunitasmu</p>
                <h3 className="mt-2 text-lg font-[600] leading-snug text-neutral-950">Ingin jadwal demo mabar di lapangan komunitas Anda?</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">Daftarkan komunitas, pilih kampanye demo, tentukan tanggal & lapangan. Produk demo diambil di cabang Tirtonic terdekat.</p>
              </div>
              <AjukanTrigger className="ev-btn mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-xs font-[600] text-white hover:bg-neutral-800">
                Ajukan Demo Day Komunitas <Arrow />
              </AjukanTrigger>
            </div>}
          </div>

          {nowEvents.length > 0 && (
            <div className="mt-12">
              <h3 className="mb-4 text-sm font-[600] uppercase tracking-wider text-neutral-500">Acara terjadwal · bisa join</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {nowEvents.map((e) => (
                  <div key={e.id}>
                    <p className="mb-2 text-xs font-[600] capitalize text-neutral-500">{fmtDay(e.demoDate)}</p>
                    <EventCard e={e} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* COMING SOON */}
        {soonCampaigns.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-2 pt-16 sm:px-6 lg:px-8">
            <SectionHead id="mendatang" dot="bg-amber-400 ring-amber-300/40" kicker="Coming soon" sub="Program demo berikutnya yang sedang kami persiapkan" title="Siap Hadir di Kota Berikutnya" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7">
              {soonCampaigns.map((c) => (
                <article key={c.id} className={`${glass} group flex flex-col overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-black/[0.06] bg-white/70 px-4 py-2.5 backdrop-blur-md">
                    <span className="flex items-center gap-1.5 text-xs font-[600] text-neutral-900"><Pin /> {c.location ?? "Segera diumumkan"}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-[600] text-amber-800">Menunggu brand</span>
                  </div>
                  <Banner c={c} dim />
                  <div className="p-6">
                    <h3 className="mb-1.5 text-lg font-[600] leading-snug text-neutral-950">{c.title}</h3>
                    <p className="line-clamp-3 text-xs text-neutral-500">{c.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* RIWAYAT */}
        {lastedEvents.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-2 pt-16 sm:px-6 lg:px-8">
            <SectionHead id="riwayat" dot="bg-neutral-400 ring-neutral-300/40" kicker="Selesai digelar" sub="Arsip komunitas" title="Riwayat Demo Day Komunitas" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7">
              {lastedEvents.map((e) => (
                <Link key={e.id} href={`/event/${e.id}`} className={`${glass} ev-lift group flex flex-col overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-black/[0.06] bg-white/70 px-4 py-2.5 backdrop-blur-md">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs font-[600] text-neutral-900"><Pin /> <span className="truncate">{e.campaign.location ? `${e.campaign.location} · ` : ""}{e.court.split(/\s+/).slice(0, 3).join(" ")}</span></span>
                    <span className="shrink-0 rounded-full bg-neutral-200/80 px-2 py-0.5 text-[10px] font-[600] text-neutral-600">Selesai</span>
                  </div>
                  <Banner c={e.campaign} badge={`${e.acceptedCount} pemain mencoba`} sub={`Tirtonic × ${e.community.name}`} />
                  <div className="flex flex-grow flex-col justify-between p-6">
                    <div>
                      <p className="mb-1 text-xs font-[600] text-neutral-600">{e.demoDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                      <h3 className="mb-4 text-lg font-[600] leading-snug text-neutral-950">{e.community.name} × {e.campaign.brand}</h3>
                    </div>
                    <span className={`${pill} inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-[600] text-neutral-800 group-hover:bg-white/90`}>
                      Lihat Detail <Arrow />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* STORE */}
        {products.length > 0 && (
          <section className="mx-auto max-w-6xl border-t border-black/[0.07] px-4 py-14 sm:px-6 lg:px-8">
            <SectionHead
              id="store"
              dot="bg-emerald-600 ring-emerald-300/40"
              kicker="Tirtonic Store"
              sub="Produk yang sedang didemokan"
              title="Coba di Lapangan, Bawa Pulang dari Tirtonic"
              right={<Link href="/shop" className={`${pill} inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-[600] text-neutral-800 hover:bg-white/90`}>Kunjungi Tirtonic Store <Arrow /></Link>}
            />
            <ProductRail>
              {products.map((p) => {
                const disc = p.hargaDiskon && p.hargaDiskon < p.harga ? p.hargaDiskon : null;
                return (
                  <Link key={p.id} href={`/product/${p.id}`} className={`${glass} ev-lift group flex w-[46%] shrink-0 snap-start flex-col overflow-hidden sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)]`}>
                    <div className="relative aspect-square overflow-hidden bg-neutral-100">
                      {p.gambar[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={p.gambar[0]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      )}
                      {disc && <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-[600] text-white">-{Math.round((1 - disc / p.harga) * 100)}%</span>}
                    </div>
                    <div className="flex flex-grow flex-col p-3.5">
                      <p className="text-[10px] font-[600] uppercase tracking-wider text-neutral-500">{p.brand ?? p.kategori}</p>
                      <h3 className="mt-0.5 line-clamp-2 text-sm font-[600] leading-snug text-neutral-950">{p.nama}</h3>
                      <div className="mt-auto pt-2">
                        <p className="text-sm font-[600] text-neutral-950">{rupiah(disc ?? p.harga)}</p>
                        {disc && <p className="text-[11px] text-neutral-400 line-through">{rupiah(p.harga)}</p>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </ProductRail>
          </section>
        )}

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <div className="ev-obsidian relative overflow-hidden rounded-2xl p-8 sm:p-14">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-lime-400/20 blur-[90px]" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-[600] uppercase tracking-wider text-lime-300">● Tirtonic Community Network</span>
              <h2 className="mt-5 text-3xl font-[600] leading-tight tracking-tight text-white sm:text-4xl">Daftarkan Komunitas Tenis Anda Sekarang.</h2>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">Dapatkan akses prioritas ke demo produk terbaru dari brand tenis dunia, dan undang Tirtonic hadir di jadwal mabar rutin komunitas Anda.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <KomunitasTrigger loggedIn={loggedIn} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-[600] text-neutral-950 hover:bg-neutral-100">Daftarkan Komunitas <Arrow /></KomunitasTrigger>
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-[500] text-white hover:bg-white/10">Hubungi Tim Tirtonic</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <KomunitasSheet />
      <AjukanSheet options={sortedOptions} community={community ? { name: community.name, waPhone: community.waPhone } : null} />
    </div>
  );
}
