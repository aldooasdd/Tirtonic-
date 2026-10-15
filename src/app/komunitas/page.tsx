import type { Metadata } from "next";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { currentCommunity } from "@/lib/community-auth";
import StringingBottomNav from "@/components/StringingBottomNav";
import { logoutCommunity, decideParticipant } from "./actions";
import { phaseOf, PHASE_META } from "@/lib/event-phase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Komunitas — Tirtonic", robots: { index: false } };

export default async function KomunitasHome() {
  const community = await currentCommunity();

  // ── Belum login: pilihan daftar / login ──
  if (!community) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
        <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-12 pt-12 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Tirtonic" className="h-12 w-12 object-contain" />
          <h1 className="mt-5 text-2xl font-extrabold leading-tight">Join as komunitas</h1>
          <p className="mt-1.5 text-sm text-white/80">Bawa demo produk brand tenis ke komunitasmu. Daftarkan komunitas atau login untuk mulai.</p>
        </header>
        <div className="-mt-6 space-y-3 px-4">
          <Link href="/komunitas/daftar" className="block rounded-2xl bg-primary p-5 text-white shadow-sm transition hover:bg-primaryDark">
            <p className="text-lg font-bold">Daftar komunitas baru</p>
            <p className="mt-0.5 text-sm text-white/80">Isi data komunitas → password login dikirim via WhatsApp.</p>
          </Link>
          <Link href="/komunitas/login" className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary/40">
            <p className="text-lg font-bold text-gray-900">Sudah punya akun</p>
            <p className="mt-0.5 text-sm text-gray-500">Login pakai username Instagram &amp; password.</p>
          </Link>
          <Link href="/event" className="block pt-2 text-center text-sm font-semibold text-primary">← Lihat semua event dulu</Link>
        </div>
        <StringingBottomNav active="event" />
      </div>
    );
  }

  // ── Sudah login: dashboard ──
  const claims = await safeQuery(
    () =>
      prisma.demoClaim.findMany({
        where: { communityId: community.id },
        orderBy: { demoDate: "desc" },
        include: {
          campaign: { select: { brand: true, title: true } },
          participants: { orderBy: { createdAt: "asc" } },
        },
      }),
    [],
  );

  const phases = claims.map((c) => phaseOf(c));
  const nPending = phases.filter((p) => p === "pending").length;
  const nOngoing = phases.filter((p) => p === "ongoing").length;
  const nDone = phases.filter((p) => p === "done").length;

  const stats = [
    { l: "Total demo", n: claims.length, c: "text-gray-900" },
    { l: "Menunggu", n: nPending, c: "text-amber-600" },
    { l: "On going", n: nOngoing, c: "text-primary" },
    { l: "Selesai", n: nDone, c: "text-gray-400" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-8 pt-10 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
              {community.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
              )}
            </div>
            <div>
              <p className="text-base font-bold leading-tight">{community.name}</p>
              <p className="text-xs text-white/70">@{community.instagram}</p>
            </div>
          </div>
          <form action={logoutCommunity}>
            <button className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25">Logout</button>
          </form>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.l} className="rounded-xl bg-white/10 p-2.5 text-center">
              <p className="text-xl font-extrabold">{s.n}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-white/80">{s.l}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="-mt-5 px-4">
        <Link href="/komunitas/klaim" className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-white shadow-sm transition hover:bg-primaryDark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Ajukan demo baru
        </Link>
      </div>

      <section className="mt-5 px-4">
        <h2 className="mb-2 text-sm font-bold text-gray-900">Demo komunitas</h2>
        {claims.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Belum ada demo. Pilih kampanye brand lalu ajukan demo untuk komunitasmu.
          </p>
        ) : (
          <div className="space-y-3">
            {claims.map((c) => {
              const phase = phaseOf(c);
              const meta = PHASE_META[phase];
              const tgl = c.demoDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
              const open = c.quotaType === "open";
              const accepted = c.participants.filter((p) => p.status === "accepted").length;
              const pendingParts = c.participants.filter((p) => p.status === "pending");

              return (
                <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{c.campaign.brand}</span>
                      <h3 className="mt-1.5 line-clamp-2 font-bold leading-snug text-gray-900">{c.campaign.title}</h3>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>📅 {tgl}</span>
                    <span>📍 {c.court}</span>
                    <span>{open ? `👥 Open · ${accepted}/${c.quota}` : `👥 Closed · ${c.quota}`}</span>
                  </div>

                  {/* Peserta menunggu konfirmasi (acara open) */}
                  {open && phase !== "done" && phase !== "pending" && pendingParts.length > 0 && (
                    <div className="mt-3 rounded-xl bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-bold text-gray-700">{pendingParts.length} peserta menunggu konfirmasi</p>
                      <div className="space-y-2">
                        {pendingParts.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.phone}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <form action={decideParticipant.bind(null, p.id, "accepted")}>
                                <button className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primaryDark">Terima</button>
                              </form>
                              <form action={decideParticipant.bind(null, p.id, "rejected")}>
                                <button className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 hover:border-red-400 hover:text-red-600">Tolak</button>
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {phase === "pending" && <p className="mt-2 text-xs text-amber-600">Menunggu persetujuan Tirtonic.</p>}
                  {phase === "rejected" && <p className="mt-2 text-xs text-red-500">Pengajuan ditolak Tirtonic.</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <StringingBottomNav active="event" />
    </div>
  );
}
