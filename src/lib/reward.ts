import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWa } from "@/lib/wa";
import { wibNow, wibMonthRange, wibMonthLabel } from "@/lib/wib";

// Hadiah per peringkat Global (samakan dgn tabel PRIZES di halaman leaderboard).
const PRIZE: Record<number, string> = {
  1: "Gratis 2× Stringing Service + Overgrip + Voucher Rp 50.000",
  2: "Gratis 1× Stringing Service + Voucher Rp 50.000",
  3: "Voucher Rp 50.000",
};

const cap = (s: string | null) => (s ? s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s);
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");

/** Top 3 Global pada rentang [start, end). 1 nomor = 1 orang. Seri → yang lebih dulu capai skor. */
async function top3Global(start: Date, end: Date) {
  const orders = await prisma.sfOrder.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { phone: true, customerName: true, createdAt: true },
  });
  const map = new Map<string, { name: string | null; n: number; last: number }>();
  for (const o of orders) {
    const e = map.get(o.phone) ?? { name: null, n: 0, last: 0 };
    e.n += 1;
    e.last = Math.max(e.last, new Date(o.createdAt).getTime());
    if (!e.name && o.customerName) e.name = o.customerName;
    map.set(o.phone, e);
  }
  return [...map.entries()]
    .map(([phone, v]) => ({ phone, name: cap(v.name), n: v.n, last: v.last }))
    .sort((a, b) => b.n - a.n || a.last - b.last)
    .slice(0, 3);
}

/** Cron (jalan tiap awal bulan): tutup periode bulan lalu → buat Reward top 3 Global + WA klaim.
 *  Idempoten: upsert per (period, rank); WA cuma dikirim sekali (notifiedAt null). */
export async function runLeaderboardReward(): Promise<{ winners: number; notified: number }> {
  // Bulan lalu menurut WIB (cron jalan awal bulan 07:05 WIB).
  const { y, m } = wibNow();
  const py = m === 0 ? y - 1 : y;
  const pm = m === 0 ? 11 : m - 1;
  const { start, end } = wibMonthRange(py, pm);
  const period = `${py}-${String(pm + 1).padStart(2, "0")}`;
  const monthLabel = wibMonthLabel(py, pm);

  const winners = await top3Global(start, end);
  let notified = 0;

  for (let i = 0; i < winners.length; i++) {
    const rank = i + 1;
    const w = winners[i];
    const prize = PRIZE[rank];
    const reward = await prisma.reward.upsert({
      where: { period_rank: { period, rank } },
      update: { phone: w.phone, name: w.name },
      create: { period, rank, phone: w.phone, name: w.name, prize },
    });

    if (!reward.notifiedAt) {
      const nama = w.name ?? "Juara";
      const msg =
        `Selamat ${nama}! 🎾 Kamu Peringkat ${rank} Leaderboard Stringing Tirtonic ${monthLabel} dengan ${w.n} stringing.\n\n` +
        `Hadiahmu: ${prize}.\n\n` +
        `Tukarkan di toko cabang manapun — tunjukkan QR "Redeem Reward" di dashboardmu:\n${siteUrl()}/riwayat/${w.phone}`;
      const ok = await sendWa(w.phone, msg);
      if (ok) {
        await prisma.reward.update({ where: { id: reward.id }, data: { notifiedAt: new Date() } });
        notified++;
      }
    }
  }
  return { winners: winners.length, notified };
}
