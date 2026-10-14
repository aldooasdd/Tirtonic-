import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StringingBottomNav from "@/components/StringingBottomNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard Stringing — Tirtonic", robots: { index: false } };

// Peringkat rank 1-3: emas / perak / perunggu, sisanya abu.
const rankStyle = (r: number) =>
  r === 1 ? "bg-amber-400 text-white"
  : r === 2 ? "bg-gray-300 text-gray-700"
  : r === 3 ? "bg-orange-400 text-white"
  : "bg-gray-100 text-gray-500";

export default async function LeaderboardPage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const bulan = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const orders = await prisma.sfOrder.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { phone: true, customerName: true },
  });

  // Hitung jumlah stringing per nomor (1 nomor = 1 orang).
  const map = new Map<string, { name: string | null; n: number }>();
  for (const o of orders) {
    const e = map.get(o.phone) ?? { name: null, n: 0 };
    e.n += 1;
    if (!e.name && o.customerName) e.name = o.customerName;
    map.set(o.phone, e);
  }
  const rows = [...map.entries()]
    .map(([phone, v]) => ({ phone, name: v.name, n: v.n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 30);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-10 pt-10 text-white">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Tirtonic" className="h-11 w-11 object-contain" />
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Tirtonic Stringing Room</span>
        </div>
        <div className="mt-7">
          <h1 className="text-2xl font-extrabold leading-tight">Leaderboard</h1>
          <p className="mt-1.5 text-sm text-white/80">Paling banyak stringing · {bulan}</p>
        </div>
      </header>

      <div className="-mt-6 px-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Belum ada stringing bulan ini.
          </p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r, i) => {
              const rank = i + 1;
              const nama = r.name ?? "Tanpa nama";
              return (
                <Link
                  key={r.phone}
                  href={`/riwayat/${encodeURIComponent(r.phone)}`}
                  className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm transition hover:border-primary/40 ${rank === 1 ? "border-amber-200" : "border-gray-100"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${rankStyle(rank)}`}>{rank}</span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {nama.trim().charAt(0).toUpperCase()}
                  </div>
                  <p className="min-w-0 flex-1 truncate font-semibold text-gray-900">{nama}</p>
                  <span className="shrink-0 text-sm font-bold text-primary">{r.n}×</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <StringingBottomNav active="leaderboard" />
    </div>
  );
}
