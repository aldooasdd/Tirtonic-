import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import JoinEventForm from "@/components/JoinEventForm";
import { phaseOf, PHASE_META } from "@/lib/event-phase";

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
  return { title: `Demo ${e.campaign.brand} — ${e.community.name} | Tirtonic`, description: e.campaign.description.slice(0, 155) };
}

export default async function EventDetail({ params }: { params: { id: string } }) {
  const e = await getEvent(params.id);
  if (!e) notFound();

  const phase = phaseOf(e);
  const meta = PHASE_META[phase];
  const open = e.quotaType === "open";
  const accepted = e.participants.filter((p) => p.status === "accepted").length;
  const sisa = Math.max(0, e.quota - accepted);
  const hari = e.demoDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const bulan = e.demoDate.toLocaleDateString("id-ID", { month: "short" }).toUpperCase();
  const tanggal = e.demoDate.getDate();
  const canJoin = open && (phase === "coming_soon" || phase === "ongoing") && sisa > 0;

  // Google Maps dari teks lapangan (tanpa API key).
  const mapsQuery = encodeURIComponent(e.court);
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const mapsEmbed = `https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`;

  const Tile = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) => (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
        {sub && <p className="truncate text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <Link href="/event" className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Semua acara
        </Link>

        <div className="mt-5 lg:grid lg:grid-cols-5 lg:gap-8">
          {/* Kiri: cover + about */}
          <div className="lg:col-span-3">
            <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-primaryDark to-primary">
              {e.campaign.banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.campaign.banner} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold uppercase tracking-widest text-white/90">{e.campaign.brand}</span>
              )}
            </div>

            {e.campaign.description && (
              <div className="mt-6">
                <h2 className="mb-2 border-b border-gray-200 pb-2 text-sm font-bold text-gray-700">Tentang demo</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{e.campaign.description}</p>
              </div>
            )}

            {/* Lokasi lapangan (Google Maps) */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between border-b border-gray-200 pb-2">
                <h2 className="text-sm font-bold text-gray-700">Lokasi</h2>
                <a href={mapsLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">Buka di Google Maps ↗</a>
              </div>
              <p className="mb-3 text-sm text-gray-600">{e.court}</p>
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <iframe
                  title={`Peta ${e.court}`}
                  src={mapsEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-56 w-full"
                />
              </div>
            </div>
          </div>

          {/* Kanan: judul + info + registrasi */}
          <aside className="mt-6 space-y-5 lg:mt-0 lg:col-span-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{e.campaign.brand}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-gray-900 lg:text-3xl">{e.campaign.title}</h1>
              <p className="mt-1 text-sm text-gray-400">{e.campaign.productType}</p>

              <div className="mt-4 flex items-center gap-2.5 border-t border-gray-100 pt-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/5">
                  {e.community.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.community.logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Diselenggarakan oleh</p>
                  <p className="text-sm font-semibold text-gray-900">{e.community.name} <span className="font-normal text-gray-400">@{e.community.instagram}</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-[9px] font-bold uppercase leading-none text-primary">{bulan}</span>
                  <span className="text-base font-extrabold leading-none text-gray-900">{tanggal}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{hari}</p>
                  <p className="text-xs text-gray-400">Jam {e.time}</p>
                </div>
              </div>
              <a href={mapsLink} target="_blank" rel="noreferrer" className="group flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary">{e.court}</p>
                  <p className="truncate text-xs text-gray-400">Lapangan tenis · lihat di Maps ↗</p>
                </div>
              </a>
              <Tile
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                title={open ? `Open · ${accepted}/${e.quota} terisi` : `Closed · ${e.quota} orang`}
                sub={open ? `Sisa ${sisa} slot untuk umum` : "Khusus anggota komunitas"}
              />
            </div>

            {/* Registrasi */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <p className="text-sm font-bold text-gray-900">Registrasi</p>
              </div>
              <div className="p-4">
                {canJoin ? (
                  <>
                    <p className="mb-3 text-sm text-gray-500">Daftar di bawah untuk ikut sesi ini. Panitia komunitas akan konfirmasi via WhatsApp.</p>
                    <JoinEventForm claimId={e.id} />
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    {open
                      ? phase === "done"
                        ? "Acara ini sudah selesai."
                        : "Kuota peserta sudah penuh."
                      : "Acara ini khusus anggota komunitas penyelenggara — pendaftaran online tidak dibuka."}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
