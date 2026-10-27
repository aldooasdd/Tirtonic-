import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StringingBottomNav from "@/components/StringingBottomNav";
import MyRank from "@/components/MyRank";
import CountdownPeriode from "@/components/CountdownPeriode";

// Hadiah per peringkat (urutan index = rank).
const PRIZES: Record<number, { t: string; d: string; cls: string; tc: string }> = {
  1: { t: "Peringkat 1", d: "Gratis 2× Stringing Service + Overgrip + Voucher Rp 50.000", cls: "bg-amber-50", tc: "text-amber-600" },
  2: { t: "Peringkat 2", d: "Gratis 1× Stringing Service + Voucher Rp 50.000", cls: "bg-gray-50", tc: "text-gray-500" },
  3: { t: "Peringkat 3", d: "Voucher Rp 50.000", cls: "bg-orange-50", tc: "text-orange-600" },
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard Stringing — Tirtonic", robots: { index: false } };

const LOCS = new Set(["jogja", "solo", "semarang"]);
// Kapital awal tiap kata (privasi + rapi): "angga" -> "Angga".
const cap = (s: string | null) => s ? s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s;
// Warna badge rank: emas / perak / perunggu.
const rankStyle = (r: number) =>
  r === 1 ? "bg-amber-400 text-white"
  : r === 2 ? "bg-gray-300 text-gray-700"
  : r === 3 ? "bg-orange-400 text-white"
  : "bg-gray-100 text-gray-500";

type Row = { phone: string; name: string | null; n: number; last: number };

function Medal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.2 1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2L8.8 6.5 11 6.2l1-2Z" />
    </svg>
  );
}

function PodiumSlot({ row, rank }: { row: Row; rank: number }) {
  const nama = row.name ?? "Tanpa nama";
  const big = rank === 1;
  const ring = rank === 1 ? "ring-amber-400" : rank === 2 ? "ring-gray-300" : "ring-orange-400";
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative">
        <div className={`flex items-center justify-center rounded-full bg-primary/5 ring-4 ${ring} ${big ? "h-20 w-20" : "h-16 w-16"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className={big ? "h-12 w-12 object-contain" : "h-10 w-10 object-contain"} />
        </div>
        <span className={`absolute -top-1.5 right-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ring-2 ring-gray-50 ${rankStyle(rank)}`}>{rank}</span>
      </div>
      <p className="mt-2 w-full truncate text-center text-sm font-bold text-gray-900">{nama}</p>
      <span className="mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-bold text-gray-800 shadow-sm">
        <Medal className={`h-3 w-3 ${rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-400" : "text-orange-400"}`} />
        {row.n} stringing
      </span>
    </div>
  );
}

export default async function LeaderboardPage({ searchParams }: { searchParams: { loc?: string; ym?: string } }) {
  const loc = searchParams.loc && LOCS.has(searchParams.loc) ? searchParams.loc : "global";

  // Bulan yang dilihat: dari ?ym=YYYY-MM, default bulan ini. Tidak boleh ke masa depan.
  const real = new Date();
  const curY = real.getFullYear();
  const curM = real.getMonth();
  let y = curY, m = curM;
  const ymMatch = searchParams.ym?.match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    const yy = Number(ymMatch[1]);
    const mi = Number(ymMatch[2]) - 1;
    if (mi >= 0 && mi <= 11 && (yy < curY || (yy === curY && mi <= curM))) { y = yy; m = mi; }
  }
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);
  const bulanShort = start.toLocaleDateString("id-ID", { month: "short", year: "numeric" });

  // Countdown periode (hanya bulan berjalan).
  const isCurrent = y === curY && m === curM;
  const msLeft = end.getTime() - real.getTime();
  const ymViewed = `${y}-${String(m + 1).padStart(2, "0")}`;

  // URL ke leaderboard dgn lokasi + bulan tertentu (ym dihilangkan kalau bulan ini).
  const mkUrl = (locV: string, yy: number, mm: number) => {
    const p = new URLSearchParams();
    if (locV !== "global") p.set("loc", locV);
    if (!(yy === curY && mm === curM)) p.set("ym", `${yy}-${String(mm + 1).padStart(2, "0")}`);
    const qs = p.toString();
    return qs ? `/leaderboard?${qs}` : "/leaderboard";
  };
  const prev = new Date(y, m - 1, 1);
  const next = new Date(y, m + 1, 1);
  const canNext = next <= new Date(curY, curM, 1);

  const orders = await prisma.sfOrder.findMany({
    where: { createdAt: { gte: start, lt: end }, ...(loc !== "global" ? { branch: { slug: loc } } : {}) },
    select: { phone: true, customerName: true, createdAt: true },
  });

  // 1 nomor = 1 orang; hitung jumlah stringing bulan ini. `last` = kapan skor dicapai (tie-break).
  const map = new Map<string, { name: string | null; n: number; last: number }>();
  for (const o of orders) {
    const e = map.get(o.phone) ?? { name: null, n: 0, last: 0 };
    e.n += 1;
    e.last = Math.max(e.last, new Date(o.createdAt).getTime());
    if (!e.name && o.customerName) e.name = o.customerName;
    map.set(o.phone, e);
  }
  // Seri (skor sama): yang lebih dulu mencapai skor (last lebih awal) menang.
  const rows: Row[] = [...map.entries()]
    .map(([phone, v]) => ({ phone, name: cap(v.name), n: v.n, last: v.last }))
    .sort((a, b) => b.n - a.n || a.last - b.last)
    .slice(0, 10);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Urutan podium: #2 kiri, #1 tengah, #3 kanan.
  const podium = [top3[1], top3[0], top3[2]].map((row, idx) => ({ row, rank: [2, 1, 3][idx] })).filter((x) => x.row);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-8 pt-10 text-white">
        <div className="flex items-start justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="Tirtonic" className="h-11 w-11 object-contain" />
          {/* Pilih bulan (pojok kanan atas) */}
          <div className="flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-1">
            <Link
              href={mkUrl(loc, prev.getFullYear(), prev.getMonth())}
              aria-label="Bulan sebelumnya"
              className="flex h-6 w-6 items-center justify-center rounded-full text-white/90 hover:bg-white/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
            <span className="min-w-[4.5rem] text-center text-xs font-bold">{bulanShort}</span>
            {canNext ? (
              <Link
                href={mkUrl(loc, next.getFullYear(), next.getMonth())}
                aria-label="Bulan berikutnya"
                className="flex h-6 w-6 items-center justify-center rounded-full text-white/90 hover:bg-white/20"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            ) : (
              <span className="flex h-6 w-6 items-center justify-center text-white/25">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </span>
            )}
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">Leaderboard</h1>
            <p className="mt-1.5 text-sm text-white/80">Top Stringer of the Month</p>
          </div>
          {loc === "global" && isCurrent && msLeft > 0 && (
            <CountdownPeriode deadline={end.toISOString()} dark />
          )}
        </div>
        {/* Switch lokasi */}
        <div className="mt-5 flex gap-1 rounded-full bg-white/15 p-1">
          {[
            { v: "global", label: "Global" },
            { v: "jogja", label: "Jogja" },
            { v: "solo", label: "Solo" },
            { v: "semarang", label: "Semarang" },
          ].map((o) => (
            <Link
              key={o.v}
              href={mkUrl(o.v, y, m)}
              className={`flex-1 rounded-full py-1.5 text-center text-xs font-semibold transition ${o.v === loc ? "bg-white text-primary shadow-sm" : "text-white/80 hover:text-white"}`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="-mt-6 px-4">
          <p className="glass-card rounded-2xl p-8 text-center text-sm text-gray-400">
            Belum ada stringing di {bulanShort}.
          </p>
        </div>
      ) : (
        <>
          {/* Podium 3 teratas */}
          <div className="mt-4 px-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-end justify-center gap-3">
                {podium.map((p) => <PodiumSlot key={p.row!.phone} row={p.row!} rank={p.rank} />)}
              </div>
            </div>
          </div>

          {/* Kartu hadiah Juara 2 · 1 · 3 (urut samakan podium) — hanya Global */}
          {loc === "global" && (
            <div className="mt-3 px-4">
              <div className="grid grid-cols-3 divide-x divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
                {[2, 1, 3].map((r) => (
                  <div key={r} className={`px-3 py-4 text-center ${PRIZES[r].cls}`}>
                    <p className={`text-xs font-extrabold tracking-wide ${PRIZES[r].tc}`}>{PRIZES[r].t}</p>
                    <p className="mt-1.5 text-xs leading-snug text-gray-700">{PRIZES[r].d}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peringkat 4+ */}
          {rest.length > 0 && (
            <div className="mt-4 px-4">
              <div className="space-y-2">
                {rest.map((r, i) => {
                  const nama = r.name ?? "Tanpa nama";
                  return (
                    <div
                      key={r.phone}
                      className="glass-card flex items-center gap-3 rounded-2xl p-3"
                    >
                      <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-400">{i + 4}</span>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-6 w-6 object-contain" />
                      </div>
                      <p className="min-w-0 flex-1 truncate font-semibold text-gray-900">{nama}</p>
                      <span className="shrink-0 rounded-full border border-gray-200 px-3 py-0.5 text-sm font-bold text-gray-800">{r.n} stringing</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Posisi viewer (pakai nomor HP tersimpan) */}
          <MyRank loc={loc} ym={ymViewed} />

          {/* Footer link */}
          <div className="mt-6 px-4 text-center text-sm font-semibold text-primary">
            <Link href="/leaderboard/syarat" className="hover:underline">Syarat &amp; Ketentuan</Link>
            <span className="mx-2 text-gray-300">·</span>
            <Link href="/leaderboard/pemenang" className="hover:underline">Pemenang Sebelumnya</Link>
          </div>
        </>
      )}

      <StringingBottomNav active="leaderboard" />
    </div>
  );
}
