import type { Metadata } from "next";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { currentCommunity } from "@/lib/community-auth";
import { logoutCommunity, decideParticipant, removeParticipant } from "./actions";
import { phaseOf, PHASE_META } from "@/lib/event-phase";
import EventTopBar from "@/components/EventTopBar";
import ClaimForm from "@/components/ClaimForm";
import PickupButton from "@/components/PickupButton";
import ShareInvite from "@/components/ShareInvite";
import { pickupToken, returnToken } from "@/lib/pickup-token";
import SubmitButton from "@/components/SubmitButton";
import ParticipantAdmin from "@/components/ParticipantAdmin";
import DemoPhotoUpload from "@/components/DemoPhotoUpload";
import DemoPhotoBadge from "@/components/DemoPhotoBadge";
import CommunityVerify from "@/components/CommunityVerify";
import { communityChecklist, isVerifiedCommunity } from "@/lib/community-verified";
import { hubDemoPhotos } from "@/lib/demo-photos";
import { EventNavLinks } from "@/components/SlidePills";
import { AjukanSheet } from "@/components/KomunitasSheet";
import { demoRequestOptions, AJUKAN_DEMO_ON } from "@/lib/demo-products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Komunitas — Tirtonic", robots: { index: false } };

export default async function KomunitasHome() {
  const community = await currentCommunity();

  // ── Belum login: pilihan daftar / login ──
  if (!community) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EventTopBar right={<Link href="/event" className="text-sm font-medium text-gray-500 transition hover:text-primary">Semua event</Link>} />
        <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Untuk komunitas tenis
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl">Join as komunitas</h1>
          <p className="mt-3 max-w-xl text-base text-gray-500">Bawa demo produk brand tenis ke komunitasmu. Daftarkan komunitas atau login untuk mulai.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Link href="/komunitas/daftar" className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
              </div>
              <p className="text-lg font-bold text-gray-900">Daftar komunitas baru</p>
              <p className="mt-0.5 text-sm text-gray-500">Isi data komunitas → password login dikirim via WhatsApp.</p>
            </Link>
            <Link href="/komunitas/login" className="group block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
              </div>
              <p className="text-lg font-bold text-gray-900">Sudah punya akun</p>
              <p className="mt-0.5 text-sm text-gray-500">Login pakai username Instagram &amp; password.</p>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Sudah login: dashboard ──
  const claims = await safeQuery(
    () =>
      prisma.demoClaim.findMany({
        where: { communityId: community.id, status: { not: "rejected" } }, // history ditolak disembunyikan
        orderBy: { demoDate: "desc" },
        include: {
          campaign: { select: { brand: true, title: true } },
          participants: { orderBy: { createdAt: "asc" } },
        },
      }),
    [],
  );

  // Penawaran demo brand: bisa diklaim (brandApproved) + coming soon (belum ACC brand).
  const campaigns = await safeQuery(
    () =>
      prisma.demoCampaign.findMany({
        where: { isActive: true },
        orderBy: [{ brandApproved: "desc" }, { createdAt: "desc" }],
        include: { claims: { where: { status: { not: "rejected" } }, select: { demoDate: true, time: true, timeEnd: true } } },
      }),
    [],
  );
  const claimable = campaigns.filter((c) => c.brandApproved && c.startDate && c.endDate);
  const soon = campaigns.filter((c) => !c.brandApproved);

  const phases = claims.map((c) => phaseOf(c));
  const nPending = phases.filter((p) => p === "pending").length;
  const nOngoing = phases.filter((p) => p === "ongoing" || p === "coming_soon").length;
  const nDone = phases.filter((p) => p === "done").length;
  const nPeserta = claims.reduce((n, c) => n + c.participants.filter((p) => p.status === "accepted").length, 0);
  // Kartu kelola: belum selesai, atau sudah dikembalikan tapi foto kegiatan belum diunggah.
  // Foto kegiatan dari PC server (hub). null = hub tak terjangkau → anggap tidak ada yang tertunggak.
  const returnedIds = claims.filter((c) => c.returnedAt).map((c) => c.id);
  const hubPhotos = returnedIds.length ? await hubDemoPhotos(returnedIds) : {};
  const photosOf = (id: string) => hubPhotos?.[id] ?? [];
  const owesPhoto = (c: { id: string; returnedAt: Date | null }) => !!hubPhotos && !!c.returnedAt && photosOf(c.id).length === 0;
  const active = claims.filter((c, i) => phases[i] !== "done" || owesPhoto(c));
  const owed = claims.find(owesPhoto);
  const next = [...active].filter((c) => phaseOf(c) !== "pending").sort((x, y) => +x.demoDate - +y.demoDate)[0];
  const options = AJUKAN_DEMO_ON ? await demoRequestOptions() : {};

  const verified = isVerifiedCommunity(community);
  const glass = "ev-glass rounded-3xl";
  const fmtD = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const jam = (c: { time: string; timeEnd: string }) => (c.time ? `${c.time}${c.timeEnd ? `–${c.timeEnd}` : ""}` : "");
  const Ico = ({ d, s = 18 }: { d: string; s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
  );
  const P = {
    cal: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
    bolt: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
    check: "M22 11.1V12a10 10 0 1 1-5.9-9.1 M22 4 12 14l-3-3",
    pin: "M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z M12 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
    ext: "M15 3h6v6 M10 14 21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
    plus: "M12 5v14 M5 12h14",
    arrow: "M5 12h14 M12 5l7 7-7 7",
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    gift: "M3 8h18v4H3z M12 8v13 M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7 M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5",
    ball: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M5 5.5c3 2 4.5 4 4.5 6.5S8 16.5 5 18.5 M19 5.5c-3 2-4.5 4-4.5 6.5s1.5 4.5 4.5 6.5",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  };
  const stats = [
    { l: "Total demo", n: claims.length, sub: `${nPeserta} peserta terdaftar`, d: P.cal, hero: true, tone: "", dot: "" },
    { l: "Menunggu ACC", n: nPending, sub: "Ditinjau tim Tirtonic", d: P.clock, tone: "bg-amber-50 text-amber-600 ring-amber-200", dot: "bg-neutral-300" },
    { l: "Terjadwal / on-going", n: nOngoing, sub: next ? `Berikutnya ${fmtD(next.demoDate)}` : "Belum ada jadwal", d: P.bolt, tone: "bg-emerald-50 text-emerald-600 ring-emerald-200", dot: "bg-emerald-500" },
    { l: "Selesai / terlaksana", n: nDone, sub: "Demo sukses terlaksana", d: P.check, tone: "bg-neutral-100 text-neutral-500 ring-neutral-200", dot: "bg-neutral-300" },
  ];
  const nextAcc = next ? next.participants.filter((p) => p.status === "accepted").length : 0;
  const nextMeta = next ? PHASE_META[phaseOf(next)] : null;
  const pill = (ok: boolean, yes: string, no: string, warn = false) => (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-[600] ${ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : warn ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "bg-neutral-100 text-neutral-700"}`}>{ok ? yes : no}</span>
  );
  const tabs = [
    { key: "ringkasan", label: "Ringkasan", d: P.grid },
    { key: "penawaran", label: "Penawaran", d: P.gift },
    { key: "demo-saya", label: "Demo Saya", d: P.ball },
  ];

  return (
    <div className="ev-page relative min-h-screen overflow-x-clip bg-[radial-gradient(130%_90%_at_50%_-10%,#ffffff_0%,#f1f5f9_45%,#e2e8f0_100%)] pb-28 text-neutral-900 [letter-spacing:-0.011em] md:pb-12">
      <div className="ev-orb -left-24 top-24 h-80 w-80 bg-emerald-200/50" />
      <div className="ev-orb -right-20 top-[45%] h-96 w-96 bg-sky-200/40" />

      {/* Nav kapsul */}
      <header className="sticky top-3 z-50 px-3 sm:top-4 sm:px-6">
        <div className="ev-nav mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
          <Link href="/event" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#173f2f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
            </span>
            <span className="text-base font-[700] tracking-tight text-neutral-950">Tirtonic</span>
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-[700] uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200 sm:inline">Komunitas</span>
          </Link>
          <nav className="hidden md:block">
            <EventNavLinks items={tabs.map(({ key, label }) => ({ key, label: key === "penawaran" ? "Penawaran Demo" : label }))} />
          </nav>
          <div className="flex min-w-0 items-center gap-2">
            <div className="ev-pill flex min-w-0 items-center gap-2 rounded-xl py-1 pl-1 pr-2 sm:pr-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#173f2f]">
                {community.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[11px] font-[700] text-white">{community.name.slice(0, 2).toUpperCase()}</span>
                )}
              </span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="flex max-w-[10rem] items-center gap-1 truncate text-xs font-[700] text-neutral-950">{community.name}{verified && <span title="Terverifikasi" className="text-sky-500">✓</span>}</span>
                <span className="block max-w-[10rem] truncate text-[10px] text-neutral-500">@{community.instagram}</span>
              </span>
              {!verified && <CommunityVerify checklist={communityChecklist(community)} />}
              <form action={logoutCommunity}>
                <button aria-label="Logout" title="Logout" className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-red-50 hover:text-red-600">
                  <Ico d={P.logout} s={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-3 pt-7 sm:px-6 sm:pt-9">
        {/* Sapaan */}
        <div id="ringkasan" className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-[700] tracking-tight text-neutral-950 sm:text-4xl">Halo, {community.name}{verified && <span title="Terverifikasi" className="ml-2 inline-grid h-6 w-6 place-items-center rounded-full bg-sky-500 align-middle text-xs font-[800] text-white sm:h-8 sm:w-8 sm:text-base">✓</span>} 👋</h1>
            <p className="mt-1 text-sm text-neutral-500">Ringkasan demo &amp; aktivitas komunitasmu di Tirtonic.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link href="/event" className="ev-pill inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-[600] text-neutral-800 hover:bg-white"><Ico d={P.ext} s={15} /> Halaman Publik</Link>
            <a href="#penawaran" className="ev-btn inline-flex items-center justify-center gap-2 rounded-xl bg-[#173f2f] px-4 py-2.5 text-sm font-[700] text-white hover:bg-[#0f2d21]"><Ico d={P.plus} s={15} /> Buat Event</a>
          </div>
        </div>

        {/* Statistik */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {stats.map((s) =>
            s.hero ? (
              <div key={s.l} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#173f2f] to-[#0c241a] p-4 text-white shadow-xl shadow-emerald-950/20 sm:p-5">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-[600] uppercase tracking-wider text-white/80">{s.l}</p>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-lime-300 ring-1 ring-white/15"><Ico d={s.d} /></span>
                </div>
                <p className="mt-1 text-3xl font-[700] sm:text-4xl">{s.n}</p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px]">
                  <span className="flex items-center gap-1.5 truncate"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400" />{s.sub}</span>
                  {next && <span className="hidden truncate text-white/60 sm:inline">{next.campaign.brand}</span>}
                </div>
              </div>
            ) : (
              <div key={s.l} className={`${glass} p-4 sm:p-5`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-[600] uppercase tracking-wider text-neutral-500">{s.l}</p>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${s.tone}`}><Ico d={s.d} /></span>
                </div>
                <p className="mt-1 text-3xl font-[700] text-neutral-950 sm:text-4xl">{s.n}</p>
                <p className="mt-4 flex items-center gap-1.5 truncate border-t border-black/[0.06] pt-3 text-[11px] text-neutral-500"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />{s.sub}</p>
              </div>
            ),
          )}
        </div>

        {/* Acara berikutnya */}
        <section className={`${glass} mt-5 p-5 sm:p-7`}>
          {next && nextMeta ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_17rem] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-neutral-950 px-2.5 py-1 text-[10px] font-[700] uppercase tracking-wider text-white">Acara berikutnya</span>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-[700] uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">{next.campaign.brand}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-[600] ${nextMeta.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${nextMeta.dot}`} />{nextMeta.label}</span>
                </div>
                <h2 className="mt-4 text-xl font-[700] leading-tight tracking-tight text-neutral-950 sm:text-3xl">{next.campaign.title}</h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-neutral-600">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-600"><Ico d={P.pin} s={15} /></span>{next.court}</span>
                  <span className="flex items-center gap-1.5"><span className="text-emerald-600"><Ico d={P.cal} s={15} /></span>{fmtD(next.demoDate)}{jam(next) ? ` • ${jam(next)} WIB` : ""}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <span className="ev-pill flex flex-col gap-1 rounded-xl px-3 py-2 text-xs text-neutral-500 sm:flex-row sm:items-center sm:gap-2">Status pengambilan: {pill(!!next.pickedUpAt, "Sudah diambil", "Belum diambil", true)}</span>
                  <span className="ev-pill flex flex-col gap-1 rounded-xl px-3 py-2 text-xs text-neutral-500 sm:flex-row sm:items-center sm:gap-2">Status pengembalian: {pill(!!next.returnedAt, "Sudah", "Belum")}</span>
                </div>
              </div>
              <div className="lg:border-l lg:border-black/[0.06] lg:pl-7">
                <div className="ev-pill rounded-2xl p-4 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:[backdrop-filter:none] lg:[border:none]">
                  <p className="text-[11px] font-[600] uppercase tracking-wider text-neutral-400 lg:text-right">Kapasitas slot</p>
                  <p className="mt-1 text-lg font-[700] text-neutral-950 lg:text-right"><span className="text-emerald-700">{nextAcc}</span> / {next.quota} slot terisi</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200/80"><div className="h-full rounded-full bg-[#173f2f]" style={{ width: `${next.quota ? Math.max(4, Math.min(100, Math.round((nextAcc / next.quota) * 100))) : 0}%` }} /></div>
                  <p className="mt-1.5 text-[11px] font-[500] text-emerald-700 lg:text-right">{next.quotaType === "open" ? "Open — siap didaftar member" : "Closed — peserta dari komunitas"}</p>
                </div>
                <Link href={`/event/${next.id}`} className="ev-btn mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-[700] text-white hover:bg-neutral-800">Buka Halaman Acara <Ico d={P.arrow} s={16} /></Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Ico d={P.cal} /></span>
              <p className="mt-3 font-[600] text-neutral-900">Belum ada acara terjadwal</p>
              <p className="mt-1 text-sm text-neutral-500">Klaim penawaran demo brand di bawah untuk mulai.</p>
            </div>
          )}
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-12">
          {/* Penawaran demo brand */}
          <section id="penawaran" className="min-w-0 lg:col-span-7">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-[700] text-neutral-950">Penawaran Demo Brand <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-[700] text-emerald-700 ring-1 ring-emerald-200">{claimable.length} bisa diklaim</span></h2>
                <p className="mt-0.5 text-xs text-neutral-500">Bawa demo raket &amp; sepatu resmi brand ternama ke sesi main komunitasmu.</p>
              </div>
            </div>
            {owed && (
              <p className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Upload foto kegiatan demo <b>{owed.campaign.title}</b> dulu (lewat badge 📷 di Riwayat Demo) sebelum klaim demo baru.
              </p>
            )}
            {claimable.length === 0 && soon.length === 0 ? (
              <p className={`${glass} p-8 text-center text-sm text-neutral-400`}>Belum ada penawaran demo. Pantau terus ya!</p>
            ) : (
              <div className="space-y-3">
                {claimable.map((c) => {
                  const periode = `${c.startDate!.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${c.endDate!.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const startStr = c.startDate!.toISOString().slice(0, 10);
                  const minDate = startStr > todayStr ? startStr : todayStr;
                  const maxDate = c.endDate!.toISOString().slice(0, 10);
                  const bookings = c.claims.map((cl) => ({ date: cl.demoDate.toISOString().slice(0, 10), start: cl.time, end: cl.timeEnd }));
                  return (
                    <details key={c.id} className={`${glass} group overflow-hidden open:ring-2 open:ring-emerald-600/40`}>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 sm:flex-nowrap [&::-webkit-details-marker]:hidden">
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-emerald-950 ring-1 ring-black/5">
                          {c.banner ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" decoding="async" src={c.banner} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-[800] uppercase text-lime-300">{c.brand.slice(0, 4)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-[800] uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">{c.brand}{c.location ? ` • ${c.location}` : ""}</span>
                            <span className="text-[11px] text-neutral-400">{periode}</span>
                          </div>
                          <h3 className="mt-1 line-clamp-2 text-[15px] font-[700] leading-snug text-neutral-950">{c.title}</h3>
                          <p className="mt-0.5 text-[11px] text-neutral-500">{c.productType}</p>
                        </div>
                        <span className="w-full shrink-0 rounded-xl bg-neutral-950 px-4 py-2.5 text-center text-xs font-[700] text-white group-open:hidden sm:ml-auto sm:w-auto sm:py-2">Klaim Demo</span>
                        <span className="hidden w-full shrink-0 rounded-xl bg-neutral-100 px-4 py-2.5 text-center text-xs font-[700] text-neutral-600 group-open:block sm:ml-auto sm:w-auto sm:py-2">Tutup</span>
                      </summary>
                      <div className="border-t border-black/[0.06] p-4">
                        {c.description && <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{c.description}</p>}
                        <ClaimForm campaignId={c.id} minDate={minDate} maxDate={maxDate} bookings={bookings} />
                      </div>
                    </details>
                  );
                })}
                {soon.map((c) => (
                  <div key={c.id} className={`${glass} flex flex-wrap items-center gap-3 p-4 opacity-80 sm:flex-nowrap`}>
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-neutral-300">
                      {c.banner ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={c.banner} alt="" className="h-full w-full object-cover grayscale-[40%]" />
                      ) : (
                        <span className="text-[10px] font-[800] uppercase text-white">{c.brand.slice(0, 4)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-[800] uppercase tracking-wide text-neutral-600 ring-1 ring-neutral-200">{c.brand}{c.location ? ` • ${c.location}` : " • Nasional"}</span>
                      <h3 className="mt-1 line-clamp-2 text-[15px] font-[700] leading-snug text-neutral-700">{c.title}</h3>
                      <p className="mt-0.5 text-[11px] text-neutral-400">{c.productType}</p>
                    </div>
                    <span className="w-full shrink-0 rounded-xl bg-amber-50 px-4 py-2.5 text-center text-xs font-[700] text-amber-700 ring-1 ring-amber-200 sm:ml-auto sm:w-auto sm:py-2">Coming Soon</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Demo saya: kartu kelola + riwayat */}
          <section id="demo-saya" className="min-w-0 space-y-5 lg:col-span-5">
            {active.map((c) => {
              const phase = phaseOf(c);
              const meta = PHASE_META[phase];
              const open = c.quotaType === "open";
              const acceptedParts = c.participants.filter((p) => p.status === "accepted");
              const pendingParts = c.participants.filter((p) => p.status === "pending");
              const waitParts = c.participants.filter((p) => p.status === "waitlist"); // urut daftar (createdAt asc)
              const slotFull = acceptedParts.length >= c.quota;
              return (
                <div key={c.id} className={`${glass} p-5`}>
                  <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-md bg-neutral-950 px-2 py-0.5 text-[10px] font-[800] uppercase text-white">{c.campaign.brand}</span>
                      <span className="truncate text-sm font-[600] text-neutral-800">Demo {phase === "pending" ? "Diajukan" : "Berjalan"}</span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[600] ${meta.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-[700] leading-snug text-neutral-950">{c.campaign.title}</h3>
                  <p className="mt-1 text-xs text-neutral-500">{fmtD(c.demoDate)}{jam(c) ? ` • ${jam(c)}` : ""} • {c.court} • {open ? `Open: ${acceptedParts.length}/${c.quota}` : `Closed: ${c.quota}`}</p>

                  {phase !== "pending" && (
                    c.pickedUpAt ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-[600] text-emerald-700">✓ Produk sudah diambil</p>
                    ) : owed && owed.id !== c.id ? (
                      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Upload foto kegiatan demo sebelumnya dulu untuk bisa ambil produk.</p>
                    ) : (
                      <PickupButton token={pickupToken(c.id)} />
                    )
                  )}
                  {c.pickedUpAt && (
                    c.returnedAt ? (
                      <>
                        <p className="ml-2 mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-[600] text-emerald-700">✓ Produk sudah dikembalikan</p>
                        <DemoPhotoUpload claimId={c.id} photos={photosOf(c.id)} />
                      </>
                    ) : (
                      <PickupButton token={returnToken(c.id)} qrPath="return-qr" label="Kembalikan produk" hint="Tunjukkan QR ini ke admin Tirtonic saat mengembalikan produk demo ke toko." />
                    )
                  )}
                  {phase !== "pending" && <ShareInvite inviteUrl={`/api/invite/${c.id}`} eventPath={`/event/${c.id}`} title={c.campaign.title} />}

                  {open && phase !== "pending" && pendingParts.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-amber-50/70 p-3 ring-1 ring-amber-200">
                      <p className="mb-2 text-xs font-[700] text-amber-800">{pendingParts.length} peserta menunggu konfirmasi</p>
                      <div className="space-y-2">
                        {pendingParts.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-[600] text-neutral-800">{p.name}</p>
                              <p className="text-xs text-neutral-500">{p.phone}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <form action={decideParticipant.bind(null, p.id, "accepted")}>
                                <SubmitButton className="rounded-lg bg-neutral-950 px-3 py-1.5 text-xs font-[600] text-white hover:bg-neutral-800">Terima</SubmitButton>
                              </form>
                              <form action={decideParticipant.bind(null, p.id, "rejected")}>
                                <SubmitButton className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500 hover:border-red-400 hover:text-red-600">Tolak</SubmitButton>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {open && phase !== "pending" && waitParts.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-200">
                      <p className="text-xs font-[700] text-sky-800">⏳ Waiting list · {waitParts.length} orang</p>
                      <p className="mb-2 mt-0.5 text-[11px] text-sky-700">{slotFull ? "Slot penuh — tambah slot dulu (tombol +) untuk menerima dari antrean." : "Ada slot kosong — terima untuk langsung masuk jadi peserta."}</p>
                      <div className="space-y-2">
                        {waitParts.map((p, i) => (
                          <div key={p.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-[600] text-neutral-800"><span className="mr-1 text-xs text-sky-600">#{i + 1}</span>{p.name}</p>
                              <p className="text-xs text-neutral-500">{p.phone}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <form action={decideParticipant.bind(null, p.id, "accepted")}>
                                <SubmitButton className={`rounded-lg px-3 py-1.5 text-xs font-[600] text-white ${slotFull ? "pointer-events-none bg-neutral-300" : "bg-neutral-950 hover:bg-neutral-800"}`}>Terima</SubmitButton>
                              </form>
                              <form action={decideParticipant.bind(null, p.id, "rejected")}>
                                <SubmitButton className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500 hover:border-red-400 hover:text-red-600">Tolak</SubmitButton>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {open && acceptedParts.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.05]">
                      <p className="mb-2 text-xs font-[700] text-neutral-700">{acceptedParts.length} peserta terdaftar</p>
                      <div className="space-y-1.5">
                        {acceptedParts.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate text-neutral-800">{p.name}</span>
                            <a href={`https://wa.me/${p.phone}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-emerald-700 hover:underline">{p.phone} ↗</a>
                            <form action={removeParticipant.bind(null, p.id)} className="shrink-0">
                              <button title="Hapus peserta (batal)" className="rounded-lg border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-400 hover:border-red-400 hover:text-red-600">Hapus</button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {open && phase !== "pending" && phase !== "done" && !c.returnedAt && <ParticipantAdmin claimId={c.id} quota={c.quota} accepted={acceptedParts.length} />}
                  {phase === "pending" && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Menunggu persetujuan tim Tirtonic.</p>}
                </div>
              );
            })}

            {/* Riwayat */}
            <div className={`${glass} overflow-hidden`}>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-[700] text-neutral-950">Riwayat Demo Komunitas</h2>
                <span className="text-xs text-neutral-400">{claims.length} total demo</span>
              </div>
              {claims.length === 0 ? (
                <p className="px-5 pb-8 text-center text-sm text-neutral-400">Belum ada demo. Pilih kampanye brand lalu klaim untuk komunitasmu.</p>
              ) : (
                <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
                  {claims.map((c) => {
                    const meta = PHASE_META[phaseOf(c)];
                    return (
                      <li key={c.id} className="px-5 py-3.5 transition hover:bg-white/60">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/event/${c.id}`} className="block truncate text-sm font-[600] text-neutral-950 hover:text-emerald-700">{c.campaign.title}</Link>
                            <p className="mt-0.5 text-[11px] text-neutral-500">{c.campaign.brand} • {fmtD(c.demoDate)} • {c.quotaType === "open" ? `${c.participants.filter((p) => p.status === "accepted").length}/${c.quota}` : c.quota} peserta</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-[600] ${meta.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
                            {c.returnedAt && <DemoPhotoBadge claimId={c.id} photos={photosOf(c.id)} title={c.campaign.title} />}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="relative mx-auto mt-12 max-w-6xl border-t border-black/[0.06] px-3 pt-5 text-center text-[11px] text-neutral-400 sm:px-6 sm:text-left">© {new Date().getFullYear()} Tirtonic Tennis Store • Program demo komunitas</footer>

      {/* HP: navbar kapsul melayang */}
      <nav className="fixed inset-x-0 bottom-3 z-50 px-3 md:hidden">
        <div className="ev-dock mx-auto flex max-w-md items-center justify-around rounded-full px-2 py-1.5">
          {tabs.map((t) => (
            <a key={t.key} href={`#${t.key}`} className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-[600] text-neutral-600 active:bg-white/80">
              <Ico d={t.d} s={19} />
              {t.label}
            </a>
          ))}
        </div>
      </nav>
      {AJUKAN_DEMO_ON && <AjukanSheet options={options} community={{ name: community.name, waPhone: community.waPhone }} />}
    </div>
  );
}
