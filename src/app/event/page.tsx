import type { Metadata } from "next";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import StringingBottomNav from "@/components/StringingBottomNav";
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
  const ongoing = events.filter((e) => phaseOf(e) === "ongoing");
  const comingSoon = events.filter((e) => phaseOf(e) === "coming_soon");

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-8 pt-10 text-white">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Tirtonic" className="h-11 w-11 object-contain" />
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Event Demo Produk</span>
        </div>
        <div className="mt-6">
          <h1 className="text-2xl font-extrabold leading-tight">Demo produk bareng komunitas</h1>
          <p className="mt-1.5 text-sm text-white/80">Coba langsung raket &amp; produk brand terbaru di lapangan komunitasmu.</p>
        </div>
        <Link href="/komunitas" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition hover:bg-white/90">
          Join as komunitas
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </header>

      {/* Demo tersedia (kampanye brand) */}
      {campaigns.length > 0 && (
        <section className="mt-5 px-4">
          <h2 className="mb-2 text-sm font-bold text-gray-900">Demo tersedia untuk diklaim</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href="/komunitas"
                className="w-56 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-primary/40"
              >
                <div className="relative h-24 bg-gradient-to-br from-primaryDark to-primary">
                  {c.banner && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.banner} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">{c.brand}</span>
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</h3>
                  <p className="mt-0.5 text-[11px] text-gray-400">{c.productType}</p>
                  <span className="mt-2 inline-block text-[11px] font-bold text-primary">Klaim buat komunitasmu →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* On going */}
      {ongoing.length > 0 && (
        <section className="mt-5 px-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            <h2 className="text-sm font-bold text-gray-900">Sedang berlangsung</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ongoing.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {/* Coming soon */}
      <section className="mt-5 px-4">
        <h2 className="mb-2 text-sm font-bold text-gray-900">Coming soon</h2>
        {comingSoon.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Belum ada acara demo terjadwal. Pantau terus ya!
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {comingSoon.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        )}
      </section>

      <StringingBottomNav active="event" />
    </div>
  );
}
