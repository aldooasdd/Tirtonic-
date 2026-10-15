import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { createCampaign, toggleCampaign, toggleBrandApproved, deleteCampaign, decideClaim, decideCommunity } from "../actions";
import { phaseOf, PHASE_META } from "@/lib/event-phase";
import { displayPhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Event Demo — Tirtonic Admin" };

export default async function AdminEvent() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("event")) redirect("/dashboard");

  const [campaigns, claims, pendingCommunities] = await Promise.all([
    safeQuery(() => prisma.demoCampaign.findMany({ orderBy: { createdAt: "desc" } }), []),
    safeQuery(
      () =>
        prisma.demoClaim.findMany({
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          include: {
            campaign: { select: { brand: true, title: true } },
            community: { select: { name: true, instagram: true, waPhone: true } },
            participants: { select: { status: true } },
          },
        }),
      [],
    ),
    safeQuery(() => prisma.community.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } }), []),
  ]);

  const pendingClaims = claims.filter((c) => c.status === "pending");
  const otherClaims = claims.filter((c) => c.status !== "pending");
  const fmt = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const todayStr = new Date().toISOString().slice(0, 10);

  const ClaimRow = ({ c }: { c: (typeof claims)[number] }) => {
    const phase = phaseOf(c);
    const meta = PHASE_META[phase];
    const accepted = c.participants.filter((p) => p.status === "accepted").length;
    return (
      <div className="rounded-xl border p-4 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{c.campaign.brand}</span>
            <p className="mt-1 font-bold text-gray-900">{c.campaign.title}</p>
            <p className="text-xs text-gray-500">{c.community.name} · @{c.community.instagram}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>📅 {fmt(c.demoDate)}{c.time ? ` · ${c.time}` : ""}</span>
          <span>📍 {c.court}</span>
          <span>{c.quotaType === "open" ? `👥 Open · ${accepted}/${c.quota}` : `👥 Closed · ${c.quota}`}</span>
          <a href={`https://wa.me/${c.eventPicPhone}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">PIC: {displayPhone(c.eventPicPhone)} ↗</a>
        </div>
        {c.status === "pending" && (
          <div className="mt-3 flex gap-2">
            <form action={decideClaim.bind(null, c.id, "accepted")}>
              <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primaryDark">Terima</button>
            </form>
            <form action={decideClaim.bind(null, c.id, "rejected")}>
              <button className="rounded-full border px-4 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-600">Tolak</button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard" className="text-gray-400 hover:text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
            <div className="text-sm font-extrabold text-gray-900">Event Demo Produk</div>
          </div>
          <Link href="/event" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-500 hover:text-primary">Lihat landing ↗</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Komunitas baru — perlu di-ACC */}
        {pendingCommunities.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">Komunitas baru — perlu disetujui</h2>
              <span className="text-xs font-semibold text-amber-600">{pendingCommunities.length} menunggu</span>
            </div>
            <ul className="divide-y divide-amber-100">
              {pendingCommunities.map((k) => (
                <li key={k.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primaryDark to-primary">
                    {k.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={k.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-white">{k.name.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{k.name}</p>
                    <p className="text-xs text-gray-500">
                      @{k.instagram} · <a href={`https://wa.me/${k.waPhone}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">{displayPhone(k.waPhone)} ↗</a>
                    </p>
                  </div>
                  <form action={decideCommunity.bind(null, k.id, "accepted")}>
                    <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primaryDark">Setujui</button>
                  </form>
                  <form action={decideCommunity.bind(null, k.id, "rejected")}>
                    <button className="rounded-full border px-4 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-400 hover:text-red-600">Tolak</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Buat kampanye */}
        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm" open>
          <summary className="cursor-pointer px-5 py-4 font-bold text-gray-900">Buat kampanye demo</summary>
          <div className="border-t p-5">
            <form action={createCampaign} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Brand *</label>
                <input name="brand" required className="field" placeholder="Yonex" />
              </div>
              <div>
                <label className="label">Jenis produk didemokan *</label>
                <input name="productType" required className="field" placeholder="Raket Ezone 2026" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Judul *</label>
                <input name="title" required className="field" placeholder="Demo Raket Yonex Ezone Series 2026" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Deskripsi</label>
                <textarea name="description" rows={3} className="field" placeholder="Coba langsung raket terbaru Yonex..." />
              </div>
              <div>
                <label className="label">Periode mulai *</label>
                <input name="startDate" type="date" required defaultValue={todayStr} className="field" />
              </div>
              <div>
                <label className="label">Periode selesai *</label>
                <input name="endDate" type="date" required className="field" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Banner (opsional, landscape ~2:1)</label>
                <input name="gambar" type="file" accept="image/*" className="text-sm" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-green">Buat kampanye</button>
              </div>
            </form>
          </div>
        </details>

        {/* Daftar kampanye */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Kampanye</h2>
            <span className="text-xs text-gray-400">{campaigns.length} kampanye</span>
          </div>
          {campaigns.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Belum ada kampanye.</p>
          ) : (
            <ul className="divide-y">
              {campaigns.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primaryDark to-primary">
                    {c.banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.banner} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold uppercase text-white">{c.brand.slice(0, 4)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.brand} · {fmt(c.startDate)}–{fmt(c.endDate)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.brandApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {c.brandApproved ? "Now · ACC brand" : "Coming soon"}
                  </span>
                  {!c.isActive && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">Nonaktif</span>}
                  <form action={toggleBrandApproved.bind(null, c.id)}>
                    <button className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${c.brandApproved ? "bg-gray-400 hover:bg-gray-500" : "bg-primary hover:bg-primaryDark"}`}>
                      {c.brandApproved ? "Batal ACC" : "ACC Brand"}
                    </button>
                  </form>
                  <form action={toggleCampaign.bind(null, c.id)}>
                    <button className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary">
                      {c.isActive ? "Sembunyikan" : "Tampilkan"}
                    </button>
                  </form>
                  <form action={deleteCampaign.bind(null, c.id)}>
                    <button className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-500 hover:border-red-400 hover:text-red-600">Hapus</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Klaim masuk */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Pengajuan demo komunitas</h2>
            <span className="text-xs text-gray-400">{pendingClaims.length} menunggu</span>
          </div>
          <div className="space-y-3 p-5">
            {claims.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Belum ada pengajuan.</p>
            ) : (
              <>
                {pendingClaims.map((c) => <ClaimRow key={c.id} c={c} />)}
                {otherClaims.map((c) => <ClaimRow key={c.id} c={c} />)}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
