import type { Metadata } from "next";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import EventCard, { EventCardData } from "@/components/EventCard";
import { phaseOf } from "@/lib/event-phase";

export const revalidate = 60;
export const metadata: Metadata = { title: "Event Demo Produk — Tirtonic", description: "Jadwal demo produk brand tenis bareng komunitas se-wilayah. Lihat acara yang sedang & akan berlangsung, atau daftarkan komunitasmu." };

export default async function EventLanding() {
  const [campaigns, claims] = await Promise.all([
    safeQuery(() => prisma.demoCampaign.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 24 }), []),
    safeQuery(
      () =>
        prisma.demoClaim.findMany({
          where: { status: "accepted" },
          orderBy: { demoDate: "asc" },
          include: {
            campaign: { select: { brand: true, title: true, productType: true, banner: true } },
            community: { select: { name: true, logo: true } },
            participants: { select: { status: true } },
          },
        }),
      [],
    ),
  ]);

  // Kampanye: ACC brand → Now (siap diklaim); belum ACC → Coming soon.
  const nowCampaigns = campaigns.filter((c) => c.brandApproved);
  const soonCampaigns = campaigns.filter((c) => !c.brandApproved);

  const events: EventCardData[] = claims.map((c) => ({
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
  // Acara terjadwal (belum lewat) → Now; sudah terlaksana → Lasted event.
  const nowEvents = events.filter((e) => ["ongoing", "coming_soon"].includes(phaseOf(e)));
  const lastedEvents = events.filter((e) => phaseOf(e) === "done").reverse(); // terbaru dulu

  // Timeline per hari untuk acara di "Now" (ala Luma).
  const todayKey = new Date().toLocaleDateString("en-CA");
  const groups: { key: string; label: string; sub: string; items: EventCardData[] }[] = [];
  for (const e of nowEvents) {
    const key = e.demoDate.toLocaleDateString("en-CA");
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        label: key === todayKey ? "Hari ini" : e.demoDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        sub: e.demoDate.toLocaleDateString("id-ID", { weekday: "long" }),
        items: [],
      };
      groups.push(g);
    }
    g.items.push(e);
  }
  const nowEmpty = nowCampaigns.length === 0 && groups.length === 0;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white text-gray-900">
      {/* Blob warna di belakang — supaya efek liquid glass kebaca */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-40 h-96 w-96 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute right-0 top-[55%] h-96 w-96 rounded-full bg-emerald-300/30 blur-[130px]" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-teal-200/30 blur-[120px]" />
      </div>
      <div className="relative">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 lg:pb-16 lg:pt-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/logo.png" alt="Tirtonic" className="h-9 w-9 object-contain" />
              <span className="text-sm font-semibold tracking-tight text-gray-900">Tirtonic Event</span>
            </Link>
            <Link href="/komunitas" className="glass-btn rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:text-primary">
              Dashboard komunitas
            </Link>
          </div>

          <div className="mt-10 max-w-2xl lg:mt-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Demo produk × komunitas tenis
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              Rasakan Performa Terbaru, Langsung di Lapangan.
            </h1>
            <p className="mt-3 text-base text-gray-500 sm:text-lg">
              Program demo eksklusif perlengkapan tenis dari brand-brand ternama dunia, dihadirkan Tirtonic khusus untuk komunitas tenis di kota Anda.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {/* NOW: demo siap diklaim + acara terjadwal */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-primary">
              <span className="h-full w-full animate-ping rounded-full bg-primary" />
            </span>
            <h2 className="text-lg font-bold text-gray-900">Now</h2>
            <span className="text-sm text-gray-400">Tersedia dan sedang berlangsung</span>
          </div>

          {nowCampaigns.length > 0 && (
            <div className="mb-6">
              <p className="mb-2.5 text-sm font-semibold text-gray-500">Demo siap diklaim komunitas</p>
              <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {nowCampaigns.map((c) => (
                  <Link
                    key={c.id}
                    href="/komunitas"
                    className="group glass-card w-64 shrink-0 overflow-hidden rounded-2xl transition hover:shadow-md"
                  >
                    <div className="relative h-28 bg-gradient-to-br from-primaryDark to-primary">
                      {c.banner && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={c.banner} alt="" className="h-full w-full object-cover" />
                      )}
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">{c.brand}</span>
                    </div>
                    <div className="p-3.5">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">{c.productType}</p>
                      <span className="glass-primary mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
                        Join as komunitas
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {groups.length > 0 && (
            <div>
              {nowCampaigns.length > 0 && <p className="mb-3 text-sm font-semibold text-gray-500">Acara terjadwal</p>}
              {/* Timeline ala Luma: rail tipis + dot per hari, header tanggal, kartu di bawahnya */}
              {groups.map((g) => (
                <div key={g.key} className="relative border-l-2 border-gray-200 pb-7 pl-5 last:border-l-transparent last:pb-0 sm:pl-6">
                  <span className="absolute -left-[7px] top-0.5 h-3 w-3 rounded-full border-2 border-white bg-primary ring-1 ring-gray-200" />
                  <div className="mb-2.5 flex items-baseline gap-2">
                    <span className="text-[15px] font-bold text-gray-900">{g.label}</span>
                    <span className="text-sm capitalize text-gray-400">{g.sub}</span>
                  </div>
                  <div className="space-y-3">
                    {g.items.map((e) => <EventCard key={e.id} e={e} />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {nowEmpty && (
            <div className="glass-card rounded-2xl p-10 text-center">
              <p className="text-sm text-gray-500">Belum ada demo yang siap saat ini.</p>
              <p className="mt-1 text-sm text-gray-400">Pantau terus, atau daftarkan komunitasmu untuk mulai.</p>
            </div>
          )}
        </section>

        {/* COMING SOON: kampanye belum ACC brand */}
        {soonCampaigns.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-900">Coming Soon</h2>
              <span className="text-sm text-gray-400">Program demo berikutnya yang sedang kami persiapkan</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {soonCampaigns.map((c) => (
                <div key={c.id} className="glass-card overflow-hidden rounded-2xl">
                  <div className="relative h-28 bg-gradient-to-br from-gray-300 to-gray-400">
                    {c.banner && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async" src={c.banner} alt="" className="h-full w-full object-cover opacity-80" />
                    )}
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">{c.brand}</span>
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 backdrop-blur-sm">Menunggu brand</span>
                  </div>
                  <div className="p-3.5">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-400">{c.productType}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LASTED EVENT: demo yang sudah terlaksana */}
        {lastedEvents.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-900">Lasted event</h2>
              <span className="text-sm text-gray-400">Demo yang sudah terlaksana</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {lastedEvents.map((e) => <EventCard key={e.id} e={e} />)}
            </div>
          </section>
        )}
      </main>
      </div>
    </div>
  );
}
