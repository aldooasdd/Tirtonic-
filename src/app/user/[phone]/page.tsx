import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import StringingBottomNav from "@/components/StringingBottomNav";
import OrderHistory from "@/components/OrderHistory";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { antri: "Antri", dikerjakan: "Dikerjakan", selesai: "Selesai", batal: "Batal" };
const badge = (s: string) =>
  s === "selesai" ? "bg-green-100 text-green-700"
  : s === "dikerjakan" ? "bg-blue-100 text-blue-700"
  : s === "antri" ? "bg-amber-100 text-amber-700"
  : s === "batal" ? "bg-red-100 text-red-600"
  : "bg-gray-100 text-gray-600";

// Usia senar dari waktu string. 0-2 bln hijau, 2-3 bln kuning, >3 bln merah (habis).
function stringAge(createdAt: Date) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  const filled = Math.min(10, Math.max(1, Math.round((Math.min(1, days / 90)) * 10)));
  const label = days < 60 ? `${days} hari` : `${Math.round(days / 30)} bulan`;
  const { text, bar, fg } =
    days >= 90 ? { text: "Disarankan ganti senar", bar: "bg-red-500", fg: "text-red-600" }
    : days >= 60 ? { text: "Mendekati waktu ganti", bar: "bg-amber-400", fg: "text-amber-600" }
    : { text: "Kondisi optimal", bar: "bg-emerald-500", fg: "text-emerald-600" };
  return { filled, label, text, bar, fg };
}

export default async function RiwayatPage({ params, searchParams }: { params: { phone: string }; searchParams: { tab?: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const tab = searchParams.tab === "pesanan" ? "pesanan" : "stringing";
  const orders = phone
    ? await prisma.sfOrder.findMany({
        where: { phone },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { resultCode: true, chosenString: true, tensionLbs: true, tensionCrossLbs: true, racket: true, stringerName: true, status: true, createdAt: true, customerName: true, branch: { select: { name: true } } },
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

      {/* Tab Stringing | Pesanan */}
      <div className="-mt-5 px-4">
        <div className="flex gap-1 rounded-full border border-gray-100 bg-white/90 p-1 shadow-sm backdrop-blur">
          {([["stringing", "Stringing"], ["pesanan", "Pesanan"]] as const).map(([k, l]) => (
            <Link
              key={k}
              href={k === "stringing" ? `/user/${encodeURIComponent(phone ?? "")}` : `/user/${encodeURIComponent(phone ?? "")}?tab=pesanan`}
              className={`flex-1 rounded-full py-2 text-center text-sm font-semibold transition ${tab === k ? "bg-primary text-white shadow-sm" : "text-gray-500"}`}
            >
              {l}
            </Link>
          ))}
        </div>
      </div>

      {tab === "pesanan" ? (
        <div className="mt-4 px-4">
          <OrderHistory phone={phone ?? ""} />
        </div>
      ) : orders.length === 0 ? (
        <div className="px-4">
          <p className="glass-card mt-4 rounded-2xl p-8 text-center text-sm text-gray-400">
            {phone ? "Belum ada riwayat stringing untuk nomor ini." : "Nomor WhatsApp pada tautan ini tidak valid."}
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards (geser) */}
          <div className="mt-4 px-4">
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

          {/* Semua stringing */}
          <div className="mt-5 space-y-3 px-4">
            <h2 className="font-bold text-gray-900">Semua stringing</h2>
            {orders.map((o) => {
              const age = stringAge(o.createdAt);
              const fullBed = !o.tensionCrossLbs || o.tensionCrossLbs === o.tensionLbs;
              return (
                <div key={o.resultCode} className="glass-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold leading-tight text-gray-900">{[o.racket, o.chosenString].filter(Boolean).join(" · ") || "Stringing"}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    {o.branch?.name ? ` · ${o.branch.name}` : ""}
                    {o.stringerName ? ` · oleh ${o.stringerName}` : ""}
                  </p>
                  {o.tensionLbs != null && (
                    <div className="mt-3 space-y-1 text-sm">
                      {fullBed ? (
                        <div className="flex justify-between"><span className="text-gray-500">FULL BED</span><span className="font-semibold text-gray-900">{o.tensionLbs} lbs</span></div>
                      ) : (
                        <>
                          <div className="flex justify-between"><span className="text-gray-500">MAIN</span><span className="font-semibold text-gray-900">{o.tensionLbs} lbs</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">CROSS</span><span className="font-semibold text-gray-900">{o.tensionCrossLbs} lbs</span></div>
                        </>
                      )}
                    </div>
                  )}
                  {/* Usia senar: habis di 3 bulan (90 hari) -> bar penuh merah */}
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Usia senar: <span className="font-semibold text-gray-700">{age.label}</span></span>
                      <span className={`font-semibold ${age.fg}`}>{age.text}</span>
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-full ${i < age.filled ? age.bar : "bg-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <StringingBottomNav active="home" phone={phone} />
    </div>
  );
}
