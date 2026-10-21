import { prisma } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import StringingBottomNav from "@/components/StringingBottomNav";

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

  // Jumlah stringing per bulan — 6 bulan terakhir (termasuk bulan ini).
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString("id-ID", { month: "short" }), n: 0 };
  });
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const b = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (b) b.n++;
  }
  const maxN = Math.max(1, ...months.map((x) => x.n));

  const cards = [
    { l: "Selesai", n: selesai, c: "text-emerald-600" },
    { l: "Sedang proses", n: proses, c: "text-amber-600" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      {/* Header hijau */}
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-10 pt-10 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src="/logo.png" alt="Tirtonic" className="h-11 w-11 object-contain" />
            <div>
              <p className="text-base font-bold leading-tight">{name ?? "Halo!"}</p>
              <p className="text-xs text-white/70">{phone ? displayPhone(phone) : "Nomor tidak valid"}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Tirtonic Stringing Room</span>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="px-4">
          <p className="glass-card -mt-5 rounded-2xl p-8 text-center text-sm text-gray-400">
            {phone ? "Belum ada riwayat stringing untuk nomor ini." : "Nomor WhatsApp pada tautan ini tidak valid."}
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards (geser) */}
          <div className="-mt-6 px-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {cards.map((c) => (
                <div key={c.l} className="glass-card min-w-[8.5rem] flex-1 rounded-2xl p-4">
                  <p className="text-xs text-gray-500">{c.l}</p>
                  <p className={`mt-1 text-2xl font-extrabold ${c.c}`}>{c.n}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stringing per bulan (6 bulan terakhir) */}
          <div className="mt-4 px-4">
            <div className="glass-card rounded-2xl p-5">
              <h2 className="font-bold text-gray-900">Stringing per bulan</h2>
              <div className="mt-5 flex items-end gap-2">
                {months.map((mo, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center">
                    <div className="flex h-32 w-full items-end justify-center">
                      <div
                        className="relative w-7 rounded-t-md bg-primary/30"
                        style={{ height: `${Math.max(3, Math.round((mo.n / maxN) * 100))}%` }}
                      >
                        {mo.n > 0 && (
                          <span className="absolute inset-x-0 -top-5 text-center text-[11px] font-bold text-gray-600">{mo.n}</span>
                        )}
                      </div>
                    </div>
                    <span className="mt-1.5 text-[11px] text-gray-400">{mo.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Semua stringing (tabel) */}
          <div className="mt-5 px-4">
            <div className="glass-card overflow-hidden rounded-2xl">
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

      <StringingBottomNav active="home" phone={phone} />
    </div>
  );
}
