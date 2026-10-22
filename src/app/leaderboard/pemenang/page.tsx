import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StringingBottomNav from "@/components/StringingBottomNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pemenang Sebelumnya — Tirtonic", robots: { index: false } };

const cap = (s: string | null) => s ? s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s;
const medalColor = (r: number) => r === 1 ? "text-amber-400" : r === 2 ? "text-gray-400" : "text-orange-400";

// Hall of Fame: Juara Global tiap bulan yang sudah lewat (12 bulan terakhir).
export default async function PemenangPage() {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  const orders = await prisma.sfOrder.findMany({
    where: { createdAt: { gte: start, lt: thisMonth } },
    select: { phone: true, customerName: true, createdAt: true },
  });

  // Kelompokkan per bulan (YYYY-M) -> per nomor HP.
  const byMonth = new Map<string, Map<string, { name: string | null; n: number; last: number }>>();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const mm = byMonth.get(key) ?? new Map();
    const e = mm.get(o.phone) ?? { name: null, n: 0, last: 0 };
    e.n += 1;
    e.last = Math.max(e.last, d.getTime());
    if (!e.name && o.customerName) e.name = o.customerName;
    mm.set(o.phone, e);
    byMonth.set(key, mm);
  }

  const months = [...byMonth.entries()]
    .map(([key, mm]) => {
      const [yy, mi] = key.split("-").map(Number);
      const top3 = [...mm.values()]
        .sort((a, b) => b.n - a.n || a.last - b.last)
        .slice(0, 3)
        .map((v) => ({ name: cap(v.name), n: v.n }));
      return { label: new Date(yy, mi, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" }), sort: yy * 12 + mi, top3 };
    })
    .sort((a, b) => b.sort - a.sort);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-8 pt-10 text-white">
        <Link href="/leaderboard" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Leaderboard
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight">Pemenang Sebelumnya</h1>
        <p className="mt-1.5 text-sm text-white/80">Juara Global tiap bulan</p>
      </header>

      {months.length === 0 ? (
        <div className="-mt-6 px-4">
          <p className="glass-card rounded-2xl p-8 text-center text-sm text-gray-400">Belum ada pemenang bulan sebelumnya.</p>
        </div>
      ) : (
        <div className="-mt-6 space-y-3 px-4">
          {months.map((mo) => (
            <div key={mo.label} className="glass-card rounded-2xl p-4">
              <p className="font-bold text-gray-900">{mo.label}</p>
              <div className="mt-3 space-y-2">
                {mo.top3.map((w, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <svg viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 shrink-0 ${medalColor(i + 1)}`}>
                      <path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.2 1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2L8.8 6.5 11 6.2l1-2Z" />
                    </svg>
                    <span className="w-4 shrink-0 font-bold text-gray-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">{w.name ?? "Tanpa nama"}</span>
                    <span className="shrink-0 text-gray-500">{w.n} stringing</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <StringingBottomNav active="leaderboard" />
    </div>
  );
}
