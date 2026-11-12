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
import { EventNavLinks } from "@/components/SlidePills";
import { AjukanTrigger, AjukanSheet } from "@/components/KomunitasSheet";
import { demoRequestOptions } from "@/lib/demo-products";

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
  const active = claims.filter((_, i) => phases[i] !== "done");
  const next = [...active].filter((c) => phaseOf(c) !== "pending").sort((x, y) => +x.demoDate - +y.demoDate)[0];
  const options = await demoRequestOptions();

  const glass = "ev-glass rounded-xl";
  const fmtD = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const jam = (c: { time: string; timeEnd: string }) => (c.time ? `${c.time}${c.timeEnd ? `–${c.timeEnd}` : ""}` : "");
  const Ico = ({ d }: { d: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
  );
  const stats = [
    { l: "Total demo", n: claims.length, sub: `${nPeserta} peserta terdaftar`, d: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", hero: true },
    { l: "Menunggu ACC", n: nPending, sub: "ditinjau tim Tirtonic", d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2", tone: "bg-amber-100 text-amber-700" },
    { l: "Terjadwal / on going", n: nOngoing, sub: next ? `berikutnya ${fmtD(next.demoDate)}` : "belum ada jadwal", d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z", tone: "bg-emerald-100 text-emerald-700" },
    { l: "Selesai", n: nDone, sub: "demo terlaksana", d: "M22 11.1V12a10 10 0 1 1-5.9-9.1 M22 4 12 14l-3-3", tone: "bg-neutral-200 text-neutral-700" },
  ];

  return (
    <div className="ev-page relative min-h-screen overflow-x-clip bg-[#f7f9fb] pb-20 text-neutral-900 [letter-spacing:-0.011em]">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-lime-300/20 via-emerald-200/15 to-transparent blur-[100px]" />
        <div className="absolute -right-20 top-1/3 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-sky-300/20 via-blue-200/15 to-transparent blur-[110px]" />
      </div>

      {/* Nav kapsul */}
      <header className="sticky top-3 z-50 px-3 sm:top-5 sm:px-6">
        <div className="ev-nav mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-3 py-2 sm:px-5">
          <Link href="/event" className="flex shrink-0 items-center gap-2.5 text-sm font-[800] tracking-tight text-neutral-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
            <span className="hidden sm:inline">Tirtonic <span className="text-xs font-[500] text-neutral-500">Komunitas</span></span>
          </Link>
          <nav className="hidden md:block">
            <EventNavLinks items={[{ key: "ringkasan", label: "Ringkasan" }, { key: "penawaran", label: "Penawaran Demo" }, { key: "demo-saya", label: "Demo Saya" }]} />
          </nav>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-950">
                {community.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[11px] font-[700] text-lime-400">{community.name.slice(0, 2).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block max-w-[9rem] truncate text-xs font-[600] text-neutral-950">{community.name}</span>
                <span className="block max-w-[9rem] truncate text-[10px] text-neutral-500">@{community.instagram}</span>
              </span>
            </div>
            <form action={logoutCommunity}>
              <button aria-label="Logout" title="Logout" className="ev-pill grid h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:text-red-600">
                <Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        {/* Header */}
        <div id="ringkasan" className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-[600] tracking-tight text-neutral-950 sm:text-3xl">Halo, {community.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">Ringkasan demo & aktivitas komunitasmu.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/event" className="ev-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-[600] text-neutral-800 hover:bg-white">Lihat Event</Link>
            <AjukanTrigger className="ev-btn inline-flex items-center gap-2 rounded-full border border-white/20 bg-neutral-950 px-4 py-2 text-xs font-[600] text-white hover:bg-neutral-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              Ajukan Demo
            </AjukanTrigger>
          </div>
        </div>

        {/* Stat */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {stats.map((s) =>
            s.hero ? (
              <div key={s.l} className="ev-obsidian relative overflow-hidden rounded-xl p-5 text-white">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime-400/25 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <p className="text-xs font-[500] text-neutral-300">{s.l}</p>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-lime-400 text-neutral-950"><Ico d={s.d} /></span>
                </div>
                <p className="relative mt-2 text-3xl font-[600] tracking-tight sm:text-4xl">{s.n}</p>
                <p className="relative mt-2 text-[11px] text-neutral-400">{s.sub}</p>
              </div>
            ) : (
              <div key={s.l} className={`${glass} p-5`}>
                <div className="flex items-start justify-between">
                  <p className="text-xs font-[500] text-neutral-500">{s.l}</p>
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${s.tone}`}><Ico d={s.d} /></span>
                </div>
                <p className="mt-2 text-3xl font-[600] tracking-tight text-neutral-950 sm:text-4xl">{s.n}</p>
                <p className="mt-2 truncate text-[11px] text-neutral-500">{s.sub}</p>
              </div>
            ),
          )}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* Penawaran demo brand */}
          <section id="penawaran" className={`${glass} p-5 lg:col-span-2`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-[600] text-neutral-950">Penawaran Demo Brand</h2>
              <span className="text-xs text-neutral-500">{claimable.length} bisa diklaim</span>
            </div>
            {claimable.length === 0 && soon.length === 0 ? (
              <p className="rounded-xl bg-white/60 p-8 text-center text-sm text-neutral-400">Belum ada penawaran demo. Pantau terus ya!</p>
            ) : (
              <div className="space-y-2.5">
                {claimable.map((c) => {
                  const periode = `${c.startDate!.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${c.endDate!.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const startStr = c.startDate!.toISOString().slice(0, 10);
                  const minDate = startStr > todayStr ? startStr : todayStr;
                  const maxDate = c.endDate!.toISOString().slice(0, 10);
                  const bookings = c.claims.map((cl) => ({ date: cl.demoDate.toISOString().slice(0, 10), start: cl.time, end: cl.timeEnd }));
                  return (
                    <details key={c.id} className="group overflow-hidden rounded-xl border border-black/[0.05] bg-white/80">
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-neutral-900 to-emerald-950">
                          {c.banner ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" decoding="async" src={c.banner} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-[700] uppercase text-lime-300">{c.brand.slice(0, 4)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-[700] uppercase tracking-wider text-emerald-700">{c.brand}{c.location ? ` · ${c.location}` : ""}</p>
                          <h3 className="line-clamp-1 text-sm font-[600] text-neutral-950">{c.title}</h3>
                          <p className="text-[11px] text-neutral-500">{c.productType} · {periode}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-neutral-950 px-3 py-1.5 text-[11px] font-[600] text-white group-open:hidden">Klaim</span>
                        <span className="hidden shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-[600] text-neutral-600 group-open:inline">Tutup</span>
                      </summary>
                      <div className="border-t border-black/[0.05] p-4">
                        {c.description && <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{c.description}</p>}
                        <ClaimForm campaignId={c.id} minDate={minDate} maxDate={maxDate} bookings={bookings} />
                      </div>
                    </details>
                  );
                })}
                {soon.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-white/50 p-3 opacity-80">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-300">
                      {c.banner ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={c.banner} alt="" className="h-full w-full object-cover grayscale-[40%]" />
                      ) : (
                        <span className="text-[10px] font-[700] uppercase text-white">{c.brand.slice(0, 4)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-[700] uppercase tracking-wider text-neutral-500">{c.brand}</p>
                      <h3 className="line-clamp-1 text-sm font-[600] text-neutral-900">{c.title}</h3>
                      <p className="text-[11px] text-neutral-500">{c.productType}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-[600] text-amber-800">Coming soon</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Acara berikutnya */}
          <aside className={`${glass} flex flex-col p-5`}>
            <h2 className="text-lg font-[600] text-neutral-950">Acara Berikutnya</h2>
            {next ? (
              <div className="mt-4 flex flex-1 flex-col">
                <p className="text-[10px] font-[700] uppercase tracking-wider text-emerald-700">{next.campaign.brand}</p>
                <h3 className="mt-0.5 text-base font-[600] leading-snug text-neutral-950">{next.campaign.title}</h3>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-white/80 p-3">
                    <p className="text-[11px] text-neutral-500">Tanggal</p>
                    <p className="mt-1 text-sm font-[600] text-neutral-950">{fmtD(next.demoDate)}</p>
                    {jam(next) && <p className="text-[11px] text-neutral-500">{jam(next)}</p>}
                  </div>
                  <div className="rounded-xl bg-white/80 p-3">
                    <p className="text-[11px] text-neutral-500">Peserta</p>
                    <p className="mt-1 text-sm font-[600] text-neutral-950">
                      {next.quotaType === "open" ? `${next.participants.filter((p) => p.status === "accepted").length}/${next.quota}` : next.quota}
                    </p>
                    <p className="text-[11px] text-neutral-500">{next.quotaType === "open" ? "open · bisa join" : "closed"}</p>
                  </div>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-xs text-neutral-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-px shrink-0 text-neutral-400" aria-hidden><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
                  {next.court}
                </p>
                <div className="mt-4 space-y-2 border-t border-black/[0.06] pt-4 text-xs">
                  <p className="flex items-center justify-between"><span className="text-neutral-500">Produk diambil</span><span className={next.pickedUpAt ? "font-[600] text-emerald-700" : "text-neutral-400"}>{next.pickedUpAt ? "✓ Sudah" : "Belum"}</span></p>
                  <p className="flex items-center justify-between"><span className="text-neutral-500">Produk dikembalikan</span><span className={next.returnedAt ? "font-[600] text-emerald-700" : "text-neutral-400"}>{next.returnedAt ? "✓ Sudah" : "Belum"}</span></p>
                </div>
                <Link href={`/event/${next.id}`} className="ev-btn mt-auto inline-flex w-full items-center justify-center rounded-full bg-neutral-950 px-4 py-2.5 text-xs font-[600] text-white hover:bg-neutral-800 [margin-top:1.25rem]">Buka halaman acara</Link>
              </div>
            ) : (
              <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl bg-white/60 p-6 text-center">
                <p className="text-sm text-neutral-500">Belum ada acara terjadwal.</p>
                <p className="mt-1 text-xs text-neutral-400">Klaim penawaran demo di samping untuk mulai.</p>
              </div>
            )}
          </aside>
        </div>

        {/* Demo saya: kartu kelola (yang aktif) */}
        <section id="demo-saya" className="mt-5 grid items-start gap-5 lg:grid-cols-5">
          {active.length > 0 && (
            <div className="grid gap-4 lg:col-span-2">
              {active.map((c) => {
                const phase = phaseOf(c);
                const meta = PHASE_META[phase];
                const open = c.quotaType === "open";
                const acceptedParts = c.participants.filter((p) => p.status === "accepted");
                const pendingParts = c.participants.filter((p) => p.status === "pending");
                return (
                  <div key={c.id} className={`${glass} p-5`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-[700] uppercase tracking-wider text-emerald-700">{c.campaign.brand}</p>
                        <h3 className="mt-0.5 line-clamp-2 font-[600] leading-snug text-neutral-950">{c.campaign.title}</h3>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[600] ${meta.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                      <span>{fmtD(c.demoDate)}{jam(c) ? ` · ${jam(c)}` : ""}</span>
                      <span className="truncate">{c.court}</span>
                      <span>{open ? `Open · ${acceptedParts.length}/${c.quota}` : `Closed · ${c.quota}`}</span>
                    </div>

                    {phase !== "pending" && (
                      c.pickedUpAt ? (
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-[600] text-emerald-700">✓ Produk sudah diambil</p>
                      ) : (
                        <PickupButton token={pickupToken(c.id)} />
                      )
                    )}
                    {c.pickedUpAt && (
                      c.returnedAt ? (
                        <p className="ml-2 mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-[600] text-emerald-700">✓ Produk sudah dikembalikan</p>
                      ) : (
                        <PickupButton token={returnToken(c.id)} qrPath="return-qr" label="Kembalikan produk" hint="Tunjukkan QR ini ke admin Tirtonic saat mengembalikan produk demo ke toko." />
                      )
                    )}
                    {phase !== "pending" && <ShareInvite inviteUrl={`/api/invite/${c.id}`} eventPath={`/event/${c.id}`} title={c.campaign.title} />}

                    {open && phase !== "pending" && pendingParts.length > 0 && (
                      <div className="mt-3 rounded-xl bg-white/80 p-3">
                        <p className="mb-2 text-xs font-[600] text-neutral-700">{pendingParts.length} peserta menunggu konfirmasi</p>
                        <div className="space-y-2">
                          {pendingParts.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-[500] text-neutral-800">{p.name}</p>
                                <p className="text-xs text-neutral-400">{p.phone}</p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <form action={decideParticipant.bind(null, p.id, "accepted")}>
                                  <SubmitButton className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-[600] text-white hover:bg-neutral-800">Terima</SubmitButton>
                                </form>
                                <form action={decideParticipant.bind(null, p.id, "rejected")}>
                                  <SubmitButton className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-red-400 hover:text-red-600">Tolak</SubmitButton>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {open && acceptedParts.length > 0 && (
                      <div className="mt-3 rounded-xl border border-black/[0.05] bg-white/60 p-3">
                        <p className="mb-2 text-xs font-[600] text-neutral-700">{acceptedParts.length} peserta terdaftar</p>
                        <div className="space-y-1.5">
                          {acceptedParts.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="min-w-0 flex-1 truncate text-neutral-800">{p.name}</span>
                              <a href={`https://wa.me/${p.phone}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-emerald-700 hover:underline">{p.phone} ↗</a>
                              <form action={removeParticipant.bind(null, p.id)} className="shrink-0">
                                <button title="Hapus peserta (batal)" className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs text-neutral-400 hover:border-red-400 hover:text-red-600">Hapus</button>
                              </form>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {phase === "pending" && <p className="mt-3 text-xs text-amber-700">Menunggu persetujuan Tirtonic.</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Riwayat semua demo (tabel) */}
          <div className={`${glass} overflow-hidden ${active.length ? "lg:col-span-3" : "lg:col-span-5"}`}>
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-lg font-[600] text-neutral-950">Riwayat Demo</h2>
              <span className="text-xs text-neutral-500">{claims.length} demo</span>
            </div>
            {claims.length === 0 ? (
              <p className="px-5 pb-8 text-center text-sm text-neutral-400">Belum ada demo. Pilih kampanye brand lalu klaim untuk komunitasmu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-black/[0.05] bg-white/60 text-xs text-neutral-500">
                      <th className="px-5 py-2.5 font-[500]">Demo</th>
                      <th className="px-3 py-2.5 font-[500]">Tanggal</th>
                      <th className="px-3 py-2.5 font-[500]">Lapangan</th>
                      <th className="px-3 py-2.5 font-[500]">Peserta</th>
                      <th className="px-5 py-2.5 font-[500]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {claims.map((c) => {
                      const meta = PHASE_META[phaseOf(c)];
                      return (
                        <tr key={c.id} className="transition hover:bg-white/60">
                          <td className="px-5 py-3">
                            <Link href={`/event/${c.id}`} className="block max-w-[220px] truncate font-[500] text-neutral-950 hover:text-emerald-700">{c.campaign.title}</Link>
                            <span className="text-[11px] text-neutral-500">{c.campaign.brand}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-neutral-600">{fmtD(c.demoDate)}</td>
                          <td className="max-w-[140px] truncate px-3 py-3 text-neutral-600">{c.court}</td>
                          <td className="px-3 py-3 text-neutral-600">{c.quotaType === "open" ? `${c.participants.filter((p) => p.status === "accepted").length}/${c.quota}` : c.quota}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-[600] ${meta.chip}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
      <AjukanSheet options={options} community={{ name: community.name, waPhone: community.waPhone }} />
    </div>
  );
}
