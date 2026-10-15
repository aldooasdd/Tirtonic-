import type { Metadata } from "next";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { currentCommunity } from "@/lib/community-auth";
import { logoutCommunity, decideParticipant } from "./actions";
import { phaseOf, PHASE_META } from "@/lib/event-phase";
import EventTopBar from "@/components/EventTopBar";

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
    <div className="min-h-screen bg-gray-50 pb-16">
      <EventTopBar
        right={
          <form action={logoutCommunity}>
            <button className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600">Logout</button>
          </form>
        }
      />

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {/* Identitas komunitas */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white">
            {community.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={community.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">{community.name}</h1>
            <p className="text-sm text-gray-400">@{community.instagram}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className={`text-2xl font-extrabold ${s.c}`}>{s.n}</p>
              <p className="mt-0.5 text-xs font-medium text-gray-500">{s.l}</p>
            </div>
          ))}
        </div>

        <Link href="/komunitas/klaim" className="mt-5 flex items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-white shadow-sm transition hover:bg-primaryDark sm:inline-flex sm:px-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Ajukan demo baru
        </Link>

        <h2 className="mb-2.5 mt-8 text-lg font-bold text-gray-900">Demo komunitas</h2>
        {claims.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Belum ada demo. Pilih kampanye brand lalu ajukan demo untuk komunitasmu.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                    <span>📅 {tgl}{c.time ? ` · ${c.time}${c.timeEnd ? `–${c.timeEnd}` : ""}` : ""}</span>
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
      </main>
    </div>
  );
}
