import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { antri: "Antri", dikerjakan: "Dikerjakan", selesai: "Selesai", batal: "Batal" };
const badge = (s: string) =>
  s === "selesai" ? "bg-green-100 text-green-700"
  : s === "dikerjakan" ? "bg-blue-100 text-blue-700"
  : s === "antri" ? "bg-amber-100 text-amber-700"
  : s === "batal" ? "bg-red-100 text-red-600"
  : "bg-gray-100 text-gray-600";

export default async function RiwayatPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const orders = phone
    ? await prisma.sfOrder.findMany({
        where: { phone },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { resultCode: true, chosenString: true, tensionLbs: true, tensionCrossLbs: true, racket: true, stringerName: true, status: true, createdAt: true, customerName: true },
      })
    : [];

  const name = orders.find((o) => o.customerName)?.customerName ?? null;
  const selesai = orders.filter((o) => o.status === "selesai").length;
  const proses = orders.filter((o) => o.status === "antri" || o.status === "dikerjakan").length;
  const batal = orders.filter((o) => o.status === "batal").length;
  const pct = orders.length ? Math.round((selesai / orders.length) * 100) : 0;

  const cards = [
    { l: "Selesai", n: selesai, c: "text-emerald-600" },
    { l: "Sedang proses", n: proses, c: "text-amber-600" },
    { l: "Batal", n: batal, c: "text-gray-400" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      {/* Header hijau */}
      <header className="rounded-b-[2rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-10 pt-10 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Tirtonic" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight">{name ?? "Halo!"}</p>
              <p className="text-xs text-white/70">{phone ? displayPhone(phone) : "Nomor tidak valid"}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Tirtonic Stringing Room</span>
        </div>
        <div className="mt-7">
          <p className="text-4xl font-extrabold leading-none">{orders.length}</p>
          <p className="mt-1.5 text-sm text-white/80">Total stringing di Tirtonic</p>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="px-4">
          <p className="-mt-5 rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            {phone ? "Belum ada riwayat stringing untuk nomor ini." : "Nomor WhatsApp pada tautan ini tidak valid."}
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards (geser) */}
          <div className="-mt-6 px-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {cards.map((c) => (
                <div key={c.l} className="min-w-[8.5rem] flex-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">{c.l}</p>
                  <p className={`mt-1 text-2xl font-extrabold ${c.c}`}>{c.n}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ringkasan + progress */}
          <div className="mt-4 px-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">Ringkasan</h2>
              <div className="mt-3 flex items-end justify-between">
                <div><p className="text-xs text-gray-400">Total</p><p className="text-lg font-extrabold text-gray-900">{orders.length}</p></div>
                <div><p className="text-xs text-gray-400">Selesai</p><p className="text-lg font-extrabold text-primary">{selesai}</p></div>
                <div><p className="text-xs text-gray-400">Proses</p><p className="text-lg font-extrabold text-gray-900">{proses}</p></div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">{selesai} dari {orders.length} stringing selesai ({pct}%)</p>
            </div>
          </div>

          {/* Semua stringing (tabel) */}
          <div className="mt-5 px-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-bold text-gray-900">Semua stringing</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                      <th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Senar</th><th className="px-5 py-3">Tarikan</th><th className="px-5 py-3">Raket</th><th className="px-5 py-3">Stringer</th><th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.resultCode} className="border-b border-gray-50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{o.chosenString ?? "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-gray-700">{o.tensionLbs ? `${o.tensionLbs}${o.tensionCrossLbs ? `/${o.tensionCrossLbs}` : ""} lbs` : "—"}</td>
                        <td className="px-5 py-3 text-gray-700">{o.racket ?? "—"}</td>
                        <td className="px-5 py-3 text-gray-700">{o.stringerName ?? "—"}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav phone={phone} />
    </div>
  );
}

// Navbar bawah ala app. Shop → /shop; Leaderboard/Event/Search masih placeholder (fitur nyusul).
function BottomNav({ phone }: { phone: string | null }) {
  const items = [
    { key: "home", label: "Home", href: phone ? `/riwayat/${encodeURIComponent(phone)}` : "#", active: true, icon: ICONS.home },
    { key: "shop", label: "Shop", href: "/shop", active: false, icon: ICONS.shop },
    { key: "leaderboard", label: "Leaderboard", href: "#", active: false, icon: ICONS.trophy },
    { key: "event", label: "Event", href: "#", active: false, icon: ICONS.event },
    { key: "search", label: "Search", href: "#", active: false, icon: ICONS.search },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-4 z-20 mx-auto max-w-md px-4">
      <div className="flex items-stretch justify-around rounded-full border border-gray-100 bg-white/95 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className={`flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] font-semibold transition ${it.active ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
            <span>{it.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

const ICONS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  shop: <><path d="M6 2 4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6l-2-4Z" /><path d="M4 6h16" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  trophy: <><path d="M6 4h12v4a6 6 0 0 1-12 0Z" /><path d="M6 6H3v2a3 3 0 0 0 3 3" /><path d="M18 6h3v2a3 3 0 0 1-3 3" /><path d="M9 20h6" /><path d="M12 14v6" /></>,
  event: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
};
