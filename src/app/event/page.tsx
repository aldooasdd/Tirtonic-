import type { Metadata } from "next";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import EventCard, { EventCardData } from "@/components/EventCard";
import { phaseOf } from "@/lib/event-phase";

export const revalidate = 60;
export const metadata: Metadata = { title: "Event Demo Produk — Tirtonic", description: "Jadwal demo produk brand tenis bareng komunitas se-wilayah. Lihat acara yang sedang & akan berlangsung, atau daftarkan komunitasmu." };

export default async function EventLanding() {
  const [campaigns, claims] = await Promise.all([
    safeQuery(() => prisma.demoCampaign.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 12 }), []),
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

  const events: EventCardData[] = claims.map((c) => ({
    id: c.id,
    court: c.court,
    quotaType: c.quotaType,
    quota: c.quota,
    demoDate: c.demoDate,
    status: c.status,
    acceptedCount: c.participants.filter((p) => p.status === "accepted").length,
    campaign: c.campaign,
    community: c.community,
  }));
  // Feed: on going + coming soon, diurut tanggal, dikelompokkan per hari (timeline ala Luma).
  const feed = events.filter((e) => ["ongoing", "coming_soon"].includes(phaseOf(e)));
  const todayKey = new Date().toLocaleDateString("en-CA");
  const groups: { key: string; label: string; sub: string; items: EventCardData[] }[] = [];
  for (const e of feed) {
    const key = e.demoDate.toLocaleDateString("en-CA");
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        label: key === todayKey ? "Hari ini" : e.demoDate.toLocaleDateString("id-ID", { day: "numeric", month: "long" }),
        sub: e.demoDate.toLocaleDateString("id-ID", { weekday: "long" }),
        items: [],
      };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 lg:pb-16 lg:pt-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Tirtonic" className="h-9 w-9 object-contain" />
              <span className="text-sm font-semibold tracking-tight text-gray-900">Tirtonic Event</span>
            </Link>
            <Link href="/komunitas" className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:border-primary/40 hover:text-primary">
              Dashboard komunitas
            </Link>
          </div>

          <div className="mt-10 max-w-2xl lg:mt-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Demo produk × komunitas tenis
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              Coba produk brand terbaru, langsung di lapangan.
            </h1>
            <p className="mt-3 text-base text-gray-500 sm:text-lg">
              Demo raket &amp; perlengkapan tenis dari brand ternama bareng komunitasmu se-wilayah.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {/* Demo tersedia untuk diklaim */}
        {campaigns.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-bold text-gray-900">Demo tersedia untuk diklaim</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  href="/komunitas"
                  className="w-64 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="relative h-28 bg-gradient-to-br from-primaryDark to-primary">
                    {c.banner && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.banner} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">{c.brand}</span>
                  </div>
                  <div className="p-3.5">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-400">{c.productType}</p>
                    <span className="mt-2 inline-block text-xs font-semibold text-primary">Klaim buat komunitasmu →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Timeline acara */}
        <h2 className="mb-5 text-lg font-bold text-gray-900">Acara</h2>
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">Belum ada acara demo terjadwal.</p>
            <p className="mt-1 text-sm text-gray-400">Pantau terus, atau daftarkan komunitasmu untuk mulai.</p>
          </div>
        ) : (
          <div>
            {groups.map((g) => (
              <div key={g.key} className="flex gap-4 sm:gap-6">
                <div className="w-20 shrink-0 pt-0.5 sm:w-32">
                  <p className="text-sm font-bold text-gray-900">{g.label}</p>
                  <p className="text-xs capitalize text-gray-400">{g.sub}</p>
                </div>
                <div className="relative flex-1 border-l border-gray-200 pb-8 pl-5 last:border-l-transparent sm:pl-6">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-gray-50" />
                  <div className="space-y-3">
                    {g.items.map((e) => <EventCard key={e.id} e={e} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
