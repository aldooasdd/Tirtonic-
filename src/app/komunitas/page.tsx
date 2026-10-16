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

        {/* Penawaran demo brand — langsung klaim di sini */}
        <h2 className="mb-2.5 mt-8 text-lg font-bold text-gray-900">Penawaran demo brand</h2>
        {claimable.length === 0 && soon.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">Belum ada penawaran demo. Pantau terus ya!</p>
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
                <details key={c.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <summary className="flex cursor-pointer items-start gap-3 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primaryDark to-primary">
                      {c.banner ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.banner} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-white">{c.brand.slice(0, 4)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{c.brand}</span>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</h3>
                      <p className="mt-0.5 text-[11px] text-gray-400">{c.productType} · {periode}</p>
                    </div>
                    <span className="mt-1 shrink-0 text-xs font-bold text-primary group-open:hidden">Ajukan →</span>
                  </summary>
                  <div className="border-t border-gray-50 p-4">
                    {c.description && <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-gray-600">{c.description}</p>}
                    <ClaimForm campaignId={c.id} minDate={minDate} maxDate={maxDate} bookings={bookings} />
                  </div>
                </details>
              );
            })}

            {soon.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 opacity-80 shadow-sm">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gray-300 to-gray-400">
                  {c.banner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.banner} alt="" className="h-full w-full object-cover opacity-80" />
                  ) : (
                    <span className="text-[10px] font-bold uppercase text-white">{c.brand.slice(0, 4)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{c.brand}</span>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</h3>
                  <p className="mt-0.5 text-[11px] text-gray-400">{c.productType}</p>
                </div>
                <span className="mt-1 shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">Coming soon</span>
              </div>
            ))}
          </div>
        )}

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
              const acceptedParts = c.participants.filter((p) => p.status === "accepted");
              const accepted = acceptedParts.length;
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

                  {/* Ambil produk demo (via scan QR admin) */}
                  {phase !== "pending" && (
                    c.pickedUpAt ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        Produk sudah diambil
                      </p>
                    ) : phase !== "done" ? (
                      <PickupButton token={pickupToken(c.id)} />
                    ) : null
                  )}

                  {/* Kembalikan produk ke toko (via scan QR admin) — setelah diambil */}
                  {c.pickedUpAt && (
                    c.returnedAt ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        Produk sudah dikembalikan
                      </p>
                    ) : (
                      <PickupButton token={returnToken(c.id)} qrPath="return-qr" label="Kembalikan produk" hint="Tunjukkan QR ini ke admin Tirtonic saat mengembalikan produk demo ke toko." />
                    )
                  )}

                  {/* Undangan IG Story — acara sudah di-ACC */}
                  {phase !== "pending" && <ShareInvite inviteUrl={`/api/invite/${c.id}`} eventPath={`/event/${c.id}`} title={c.campaign.title} />}

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

                  {/* Peserta terdaftar (sudah diterima) */}
                  {open && acceptedParts.length > 0 && (
                    <div className="mt-3 rounded-xl border border-gray-100 p-3">
                      <p className="mb-2 text-xs font-bold text-gray-700">{acceptedParts.length} peserta terdaftar</p>
                      <div className="space-y-1.5">
                        {acceptedParts.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{p.name}</span>
                            <a href={`https://wa.me/${p.phone}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-primary hover:underline">{p.phone} ↗</a>
                            <form action={removeParticipant.bind(null, p.id)} className="shrink-0">
                              <button title="Hapus peserta (batal)" className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-400 hover:border-red-400 hover:text-red-600">Hapus</button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {phase === "pending" && <p className="mt-2 text-xs text-amber-600">Menunggu persetujuan Tirtonic.</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
