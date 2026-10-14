import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StringingBottomNav from "@/components/StringingBottomNav";
import LeaderboardLocation from "@/components/LeaderboardLocation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard Stringing — Tirtonic", robots: { index: false } };

const LOCS = new Set(["jogja", "solo", "semarang"]);
// Warna badge rank: emas / perak / perunggu.
const rankStyle = (r: number) =>
  r === 1 ? "bg-amber-400 text-white"
  : r === 2 ? "bg-gray-300 text-gray-700"
  : r === 3 ? "bg-orange-400 text-white"
  : "bg-gray-100 text-gray-500";

type Row = { phone: string; name: string | null; n: number };

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
    <Link href={`/riwayat/${encodeURIComponent(row.phone)}`} className="flex flex-1 flex-col items-center">
      <div className="relative">
        <div className={`flex items-center justify-center rounded-full bg-primary/5 ring-4 ${ring} ${big ? "h-20 w-20" : "h-16 w-16"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className={big ? "h-12 w-12 object-contain" : "h-10 w-10 object-contain"} />
        </div>
        <span className={`absolute -top-1.5 right-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ring-2 ring-gray-50 ${rankStyle(rank)}`}>{rank}</span>
      </div>
      <p className="mt-2 w-full truncate text-center text-sm font-bold text-gray-900">{nama}</p>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-sm font-bold text-gray-800 shadow-sm">
        <Medal className={`h-3.5 w-3.5 ${rank === 1 ? "text-amber-400" : rank === 2 ? "text-gray-400" : "text-orange-400"}`} />
        {row.n}
      </span>
    </Link>
  );
}

export default async function LeaderboardPage({ searchParams }: { searchParams: { loc?: string } }) {
  const loc = searchParams.loc && LOCS.has(searchParams.loc) ? searchParams.loc : "global";

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const bulan = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const orders = await prisma.sfOrder.findMany({
    where: { createdAt: { gte: start, lt: end }, ...(loc !== "global" ? { branch: { slug: loc } } : {}) },
    select: { phone: true, customerName: true },
  });

  // 1 nomor = 1 orang; hitung jumlah stringing bulan ini.
  const map = new Map<string, { name: string | null; n: number }>();
  for (const o of orders) {
    const e = map.get(o.phone) ?? { name: null, n: 0 };
    e.n += 1;
    if (!e.name && o.customerName) e.name = o.customerName;
    map.set(o.phone, e);
  }
  const rows: Row[] = [...map.entries()]
    .map(([phone, v]) => ({ phone, name: v.name, n: v.n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 30);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Urutan podium: #2 kiri, #1 tengah, #3 kanan.
  const podium = [top3[1], top3[0], top3[2]].map((row, idx) => ({ row, rank: [2, 1, 3][idx] })).filter((x) => x.row);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-10 pt-10 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Tirtonic" className="h-11 w-11 object-contain" />
          </div>
          <LeaderboardLocation value={loc} />
        </div>
        <div className="mt-6">
          <h1 className="text-2xl font-extrabold leading-tight">Leaderboard</h1>
          <p className="mt-1.5 text-sm text-white/80">Paling banyak stringing · {bulan}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="-mt-6 px-4">
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Belum ada stringing bulan ini.
          </p>
        </div>
      ) : (
        <>
          {/* Podium 3 teratas */}
          <div className="mt-4 px-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-center gap-3">
                {podium.map((p) => <PodiumSlot key={p.row!.phone} row={p.row!} rank={p.rank} />)}
              </div>
            </div>
          </div>

          {/* Peringkat 4+ */}
          {rest.length > 0 && (
            <div className="mt-4 px-4">
              <div className="space-y-2">
                {rest.map((r, i) => {
                  const nama = r.name ?? "Tanpa nama";
                  return (
                    <Link
                      key={r.phone}
                      href={`/riwayat/${encodeURIComponent(r.phone)}`}
                      className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-primary/40"
                    >
                      <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-400">{i + 4}</span>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
                      </div>
                      <p className="min-w-0 flex-1 truncate font-semibold text-gray-900">{nama}</p>
                      <span className="shrink-0 rounded-full border border-gray-200 px-3 py-0.5 text-sm font-bold text-gray-800">{r.n}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <StringingBottomNav active="leaderboard" />
    </div>
  );
}
