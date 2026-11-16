import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import JoinEventForm from "@/components/JoinEventForm";
import ShareInvite from "@/components/ShareInvite";
import ShareLinkButton from "@/components/ShareLinkButton";
import { phaseOf, PHASE_META } from "@/lib/event-phase";
import { hubDemoPhotos } from "@/lib/demo-photos";
import PhotoSlider from "@/components/PhotoSlider";
import { eventDescription } from "@/lib/event-ai";

export const revalidate = 60;

async function getEvent(id: string) {
  return safeQuery(
    () =>
      prisma.demoClaim.findFirst({
        where: { id, status: "accepted" },
        include: {
          campaign: true,
          community: { select: { name: true, logo: true, instagram: true } },
          participants: { select: { status: true } },
        },
      }),
    null,
  );
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const e = await getEvent(params.id);
  if (!e) return {};
  const title = `Demo ${e.campaign.brand} — ${e.community.name} | Tirtonic`;
  const description = e.campaign.description.slice(0, 155);
  // Preview link (WA/IG) pakai gambar undangan acara.
  return { title, description, openGraph: { title, description, images: [`/api/invite/${params.id}`] } };
}

const I = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
  up: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m18 15-6-6-6 6" /></svg>,
  pin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>,
  ext: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  racket: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><ellipse cx="14" cy="9" rx="6" ry="7" transform="rotate(35 14 9)" /><path d="m9 14-6 7" /></svg>,
  gift: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>,
  warn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>,
};

export default async function EventDetail({ params }: { params: { id: string } }) {
  const e = await getEvent(params.id);
  if (!e) notFound();

  const phase = phaseOf(e);
  const meta = PHASE_META[phase];
  const open = e.quotaType === "open";
  const accepted = e.participants.filter((p) => p.status === "accepted").length;
  const sisa = Math.max(0, e.quota - accepted);
  const pct = e.quota > 0 ? Math.min(100, Math.round((accepted / e.quota) * 100)) : 0;
  const hari = e.demoDate.toLocaleDateString("id-ID", { weekday: "long" });
  const bulan = e.demoDate.toLocaleDateString("id-ID", { month: "short" }).toUpperCase();
  const tanggal = e.demoDate.getDate();
  const tahun = e.demoDate.getFullYear();
  const jam = `${e.time}${e.timeEnd ? ` – ${e.timeEnd}` : ""} WIB`;
  const canJoin = open && (phase === "coming_soon" || phase === "ongoing") && sisa > 0;
  const produk = `${e.campaign.brand} ${e.campaign.productType}`;
  // Foto dokumentasi komunitas (setelah demo) → slider di hero menggantikan banner.
  const photos = e.returnedAt ? ((await hubDemoPhotos([e.id]))?.[e.id] ?? []) : [];
  const about = await eventDescription(e.id, {
    judulKampanye: e.campaign.title,
    brand: e.campaign.brand,
    produk: e.campaign.productType,
    infoProduk: e.campaign.description,
    komunitas: e.community.name,
    kota: e.campaign.location,
    lapangan: e.court,
    hari: e.demoDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    jam,
    fase: phase === "done" ? "sudah selesai" : phase === "ongoing" ? "berlangsung hari ini" : "akan datang",
    kuota: e.quota,
    pesertaDiterima: accepted,
    fotoKegiatan: photos.length,
    voucher: `Rp 50.000 khusus ${produk}`,
  });

  // Peta (tanpa API key). Punya koordinat (dari saran OSM) → embed OpenStreetMap + marker; selain itu embed Google by teks.
  const hasGeo = e.lat != null && e.lng != null;
  const mapsQuery = encodeURIComponent(hasGeo ? `${e.lat},${e.lng}` : e.court);
  const d = 0.004; // ~400 m
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const mapEmbed = hasGeo
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${e.lng! - d},${e.lat! - d},${e.lng! + d},${e.lat! + d}&layer=mapnik&marker=${e.lat},${e.lng}`
    : `https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`;

  const card = "ev-glass rounded-3xl";
  const closedMsg = open ? (phase === "done" ? "Acara ini sudah selesai." : "Kuota peserta sudah penuh.") : "Acara ini khusus anggota komunitas penyelenggara — pendaftaran online tidak dibuka.";

  // Tanggal + kapasitas (dipakai di HP setelah hero, dan di kolom kanan desktop)
  const InfoTiles = (
    <div className="grid grid-cols-2 gap-3">
      <div className="ev-pill rounded-2xl p-3.5">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-neutral-950 text-white">
            <span className="text-[9px] font-[700] leading-none">{bulan}</span>
            <span className="text-base font-[800] leading-none">{tanggal}</span>
          </div>
          <span className="text-[11px] text-neutral-400">{tahun}</span>
        </div>
        <p className="mt-3 text-[11px] capitalize text-neutral-500">{hari}</p>
        <p className="text-[13px] font-[700] text-neutral-950">{jam}</p>
      </div>
      <div className="ev-pill rounded-2xl p-3.5">
        <div className="flex items-start justify-between gap-1">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">{I.users}</div>
          {open && phase !== "done" && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-[700] ${sisa ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-600 ring-1 ring-red-200"}`}>{sisa ? `Sisa ${sisa} slot` : "Penuh"}</span>
          )}
        </div>
        <p className="mt-3 text-[11px] text-neutral-500">Kapasitas sesi</p>
        <p className="text-[13px] font-[700] text-neutral-950">{open ? `${accepted} / ${e.quota} terisi` : `${e.quota} orang`}</p>
      </div>
    </div>
  );

  return (
    <div className="ev-page relative min-h-screen overflow-x-clip bg-[radial-gradient(130%_90%_at_50%_-10%,#ffffff_0%,#f1f5f9_45%,#e2e8f0_100%)] pb-28 text-neutral-900 [letter-spacing:-0.011em] lg:pb-12">
      <div className="ev-orb -left-24 top-24 h-80 w-80 bg-emerald-200/50" />
      <div className="ev-orb -right-20 top-[40%] h-96 w-96 bg-sky-200/40" />

      {/* Nav kapsul */}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <div className="ev-nav mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/event" className="inline-flex shrink-0 items-center gap-1 text-sm font-[500] text-neutral-700 hover:text-neutral-950">{I.back} Semua Acara</Link>
            <span className="hidden h-5 w-px bg-neutral-200 sm:block" />
            <Link href="/event" className="hidden items-center gap-2 sm:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
              <span className="text-xs font-[700] uppercase tracking-wider text-neutral-800">Tirtonic Events</span>
            </Link>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-[700] uppercase tracking-wide ring-1 ring-black/5 ${meta.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <div className="flex items-center gap-2">
            <ShareLinkButton path={`/event/${e.id}`} title={e.campaign.title} className="ev-pill inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-[600] text-neutral-700 hover:bg-white" />
            {canJoin && <a href="#daftar" className="ev-btn hidden items-center gap-1.5 rounded-xl bg-[#173f2f] px-4 py-2 text-xs font-[700] uppercase tracking-wide text-white hover:bg-[#0f2d21] lg:inline-flex">Daftar Sesi</a>}
          </div>
        </div>
      </header>

      <main className="relative mx-auto mt-5 max-w-6xl px-3 sm:px-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        {/* ───────── Kolom kiri ───────── */}
        <div className="space-y-4 lg:col-span-8 lg:space-y-5">
          {/* Hero */}
          <section className={`${card} p-3.5 sm:p-5`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-[800] uppercase tracking-widest text-neutral-900 ring-1 ring-black/10">{e.campaign.brand}</span>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-[700] uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">Demo Day {tahun}</span>
              {e.campaign.location && <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-[700] text-sky-800 ring-1 ring-sky-200">📍 {e.campaign.location}</span>}
              <span className="ml-auto rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-[700] uppercase tracking-wide text-white">Official Event</span>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-emerald-950 ring-1 ring-black/5">
              {photos.length ? (
                <PhotoSlider photos={photos} className="absolute inset-0" dotsClass="top-3" />
              ) : e.campaign.banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.campaign.banner} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-[800] uppercase tracking-widest text-white/90">{e.campaign.brand}</span>
              )}
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl bg-black/45 px-3 py-2 text-white backdrop-blur-md">
                <span className="flex min-w-0 items-center gap-2 text-xs"><span className="opacity-80">{I.racket}</span><span className="truncate"><span className="block text-[10px] text-white/70">Produk demo</span><b className="font-[600]">{e.campaign.productType}</b></span></span>
                {open && phase !== "done" && <span className="shrink-0 rounded-lg bg-emerald-500/90 px-2 py-1 text-[10px] font-[700]">Sisa {sisa} slot</span>}
                {photos.length > 0 && <span className="shrink-0 rounded-lg bg-white/20 px-2 py-1 text-[10px] font-[700]">📷 {photos.length} foto kegiatan</span>}
              </div>
            </div>
            <div className="px-1 pt-4">
              <p className="text-[11px] font-[600] uppercase tracking-wider text-neutral-500">{e.campaign.productType} • Community gathering</p>
              <h1 className="mt-1.5 text-2xl font-[700] leading-tight tracking-tight text-neutral-950 sm:text-3xl">{e.campaign.title}</h1>
              <div className="mt-4 flex items-center gap-3 border-t border-black/[0.06] pt-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.community.logo || "/logo.png"} alt="" className={e.community.logo ? "h-full w-full object-cover" : "h-5 w-5 object-contain"} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-[600] uppercase tracking-wider text-neutral-400">Diselenggarakan oleh</p>
                  <p className="flex items-center gap-1.5 truncate text-sm font-[600] text-neutral-900">
                    <span className="truncate">{e.community.name} × Tirtonic Tennis Store</span>
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sky-500 text-white">{I.check}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* HP: tanggal + kapasitas langsung setelah hero */}
          <div className="lg:hidden">{InfoTiles}</div>

          {/* Lokasi */}
          <section className={`${card} p-4 sm:p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">{I.pin}</span>
                <div className="min-w-0">
                  <h2 className="font-[700] text-neutral-950">Lokasi Lapangan</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">{e.court}</p>
                </div>
              </div>
              <a href={gmaps} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-[700] text-emerald-700 hover:underline">Buka Google Maps {I.ext}</a>
            </div>
            <div className="relative mt-4 overflow-hidden rounded-2xl ring-1 ring-black/5">
              <iframe title={`Peta ${e.court}`} src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-56 w-full sm:h-64" />
              <a href={gmaps} target="_blank" rel="noreferrer" className="ev-pill absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-[600] text-neutral-900">Petunjuk Arah {I.ext}</a>
            </div>
          </section>

          {/* Tentang */}
          <section className={`${card} p-4 sm:p-6`}>
            <h2 className="flex items-center gap-2 text-lg font-[700] text-neutral-950"><span className="h-5 w-1 rounded-full bg-emerald-600" />Tentang Demo Day</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{about}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="ev-pill flex gap-3 rounded-2xl p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700">{I.racket}</span>
                <p className="text-xs leading-relaxed text-neutral-600"><span className="block text-[11px] text-neutral-400">Produk yang dicoba</span><b className="font-[600] text-emerald-700">{produk}</b> — coba langsung gratis di lapangan.</p>
              </div>
              <div className="ev-pill flex gap-3 rounded-2xl p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">{I.gift}</span>
                <p className="text-xs leading-relaxed text-neutral-600"><span className="block text-[11px] text-amber-600">Hadiah peserta</span>Peserta terdaftar dapat <b className="font-[600] text-emerald-700">voucher Rp 50.000</b> khusus produk ini setelah demo selesai.</p>
              </div>
            </div>
            {canJoin && sisa <= 5 && (
              <p className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-[500] text-amber-800 ring-1 ring-amber-200">{I.warn} Kuota tinggal {sisa}. Segera daftar sebelum habis!</p>
            )}
          </section>
        </div>

        {/* ───────── Kolom kanan (desktop sticky) / formulir di HP ───────── */}
        <aside className="mt-4 space-y-4 lg:sticky lg:top-24 lg:col-span-4 lg:mt-0">
          <section className={`${card} p-4 sm:p-5`}>
            <div className="hidden lg:block">{InfoTiles}</div>
            {open && (
              <div className="mt-0 lg:mt-4">
                <div className="mb-1.5 flex justify-between text-[11px]">
                  <span className="font-[600] text-neutral-700">Status ketersediaan</span>
                  <span className={sisa ? "font-[600] text-emerald-700" : "font-[600] text-red-600"}>{sisa ? `${sisa} slot tersedia` : "Penuh"}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200/70"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} /></div>
              </div>
            )}
            <div id="daftar" className="mt-5 border-t border-black/[0.06] pt-5">
              <h2 className="text-center font-[700] text-neutral-950 lg:text-left">Formulir Registrasi Sesi</h2>
              {canJoin ? (
                <>
                  <p className="mb-4 mt-1 text-center text-xs text-neutral-500 lg:text-left">Daftar di bawah untuk ikut sesi ini. Panitia akan mengonfirmasi via WhatsApp.</p>
                  <JoinEventForm claimId={e.id} />
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500"><span className="text-emerald-600">{I.check}</span>Gratis demo • Konfirmasi via WhatsApp</p>
                </>
              ) : (
                <p className="mt-2 rounded-2xl bg-neutral-100 px-4 py-3 text-center text-sm text-neutral-600">{closedMsg}</p>
              )}
            </div>
          </section>

          {phase !== "done" && (
            <section className={`${card} p-4 sm:p-5`}>
              <p className="font-[700] text-neutral-950">Ajak Teman Main</p>
              <p className="mt-0.5 text-xs text-neutral-500">Bagikan undangan ini ke Instagram Story atau grup WhatsApp kamu.</p>
              <ShareInvite inviteUrl={`/api/invite/${e.id}`} eventPath={`/event/${e.id}`} title={e.campaign.title} />
            </section>
          )}
        </aside>
      </main>

      <footer className="relative mt-10 text-center text-[11px] text-neutral-400">© {tahun} Tirtonic Tennis Store • Demo produk × komunitas tenis</footer>

      {/* HP: kapsul melayang di bawah → ke formulir */}
      <div className="fixed inset-x-0 bottom-3 z-50 px-3 lg:hidden">
        <div className="ev-dock mx-auto flex max-w-md items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2">
          <div className="min-w-0">
            <p className="text-[10px] font-[700] uppercase tracking-wide text-neutral-400">{canJoin ? "Slot tersedia" : "Pendaftaran"}</p>
            <p className={`truncate text-sm font-[700] ${canJoin ? "text-emerald-700" : "text-neutral-600"}`}>{canJoin ? `Sisa ${sisa} kuota` : phase === "done" ? "Acara selesai" : open ? "Kuota penuh" : "Khusus anggota"}</p>
          </div>
          {canJoin ? (
            <a href="#daftar" className="ev-btn inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-950 px-5 py-3 text-sm font-[700] text-white active:scale-95">Daftar Sekarang {I.up}</a>
          ) : (
            <Link href="/event" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-5 py-3 text-sm font-[600] text-neutral-700">Acara lain {I.arrow}</Link>
          )}
        </div>
      </div>
    </div>
  );
}
