import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { salam } from "@/lib/wa";
import { rewardToken } from "@/lib/pickup-token";
import StringingBottomNav from "@/components/StringingBottomNav";
import RewardClaimCatalog from "@/components/RewardClaimCatalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reward Top Stringer — Tirtonic", robots: { index: false } };

const CLAIM_DAYS = 14; // masa berlaku klaim sejak hadiah dibuat
const DAY = 86400000;
const items = (prize: string) => prize.split(" + ").map((s) => s.trim()).filter(Boolean);
const first = (n: string | null) => (n ? n.trim().split(/\s+/)[0] : null);
const fmtDate = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default async function RewardPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));

  // Hadiah pengguna: ambil yang terbaru untuk nomor ini.
  const reward = phone
    ? await safeQuery(() => prisma.reward.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } }), null)
    : null;

  // Semua pemenang di periode yang sama (buat struktur hadiah 3 peringkat).
  const periodRewards = reward
    ? await safeQuery(() => prisma.reward.findMany({ where: { period: reward.period }, orderBy: { rank: "asc" } }), [])
    : [];

  const name = reward?.name ?? null;
  const initial = (name ?? "T").trim().charAt(0).toUpperCase() || "T";
  const greeting = `Selamat ${salam()}`;

  const expiresAt = reward ? new Date(new Date(reward.createdAt).getTime() + CLAIM_DAYS * DAY) : null;
  const sisaHari = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / DAY)) : 0;
  const expired = !reward || !!reward.redeemedAt || (expiresAt ? expiresAt.getTime() < Date.now() : true);
  const periodLabel = reward ? new Date(reward.createdAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" }) : "";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] pb-28 font-sans text-slate-800 antialiased">
      <header className="relative z-10 px-5 pb-1 pt-10">
        <div className="mb-4 flex items-center gap-3.5">
          <div className="relative h-11 w-11 flex-shrink-0 rounded-2xl bg-gradient-to-tr from-emerald-700 via-emerald-500 to-teal-300 p-[1.5px] shadow-sm">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-emerald-50">
              <span className="text-lg font-extrabold tracking-tight text-emerald-800">{initial}</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[11px] font-semibold uppercase leading-none tracking-wider text-slate-400">{greeting}</span>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900">{name ?? "Halo!"}</h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-mono tracking-tight">{phone ? displayPhone(phone) : "Nomor tidak valid"}</span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-emerald-700">Tirtonic Member</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-emerald-900">Klaim Hadiah Top Stringer</h2>
          {reward && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">🏅 {periodLabel}</span>}
        </div>
        <p className="mt-1 text-xs text-slate-500">Apresiasi khusus peringkat terpilih Top Stringer of the Month.</p>
      </header>

      <main className="relative z-10 space-y-5 px-5 pt-4">
        {!reward ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
            {phone ? "Belum ada hadiah untuk nomor ini." : "Nomor tidak valid."}
            <div className="mt-3">
              <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}`} className="text-xs font-semibold text-emerald-700">← Kembali ke dashboard</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 p-5 text-white shadow-[0_24px_48px_-12px_rgba(13,92,58,0.4)] bg-[linear-gradient(135deg,#064e3b_0%,#0d5c3a_45%,#043321_100%)]">
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border-[10px] border-white/5" />
              <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl" />
              <div className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-md">🏆 Terpilih: Peringkat #{reward.rank}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${expired ? "border-white/20 bg-white/10 text-emerald-100/70" : "border-emerald-300/30 bg-emerald-400/20 text-emerald-100"}`}>
                    <span className={`h-2 w-2 rounded-full ${expired ? "bg-slate-300" : "animate-pulse bg-emerald-300"}`} />
                    {reward.redeemedAt ? "Sudah diklaim" : expired ? "Kadaluarsa" : "Siap diklaim"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200/80">Paket Hak Milik Pemenang</span>
                  <h3 className="mt-0.5 text-lg font-bold leading-snug tracking-tight">{reward.prize}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-100/80">
                    🗓️ Berlaku s/d <strong className="font-semibold text-white">{expiresAt ? fmtDate(expiresAt) : "—"}</strong>
                    {!expired && ` (Sisa ${sisaHari} hari)`}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-emerald-100/90 backdrop-blur-sm">
                  ✓ Terverifikasi dari data mesin elektronik &amp; transaksi stringing Tirtonic
                </div>
                <a href="#katalog" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-emerald-500 py-3 text-sm font-bold text-emerald-950 shadow-[0_4px_16px_rgba(16,185,129,0.35)] active:scale-[0.98]">
                  🎁 {expired ? "Lihat hadiah" : `Klaim Hadiah Peringkat ${reward.rank}`}
                </a>
              </div>
            </div>

            {/* Struktur hadiah */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight text-slate-900">🏆 Struktur Hadiah Periode {periodLabel}</h3>
                <span className="text-[11px] font-medium text-slate-400">Leaderboard</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                {[1, 2, 3].map((rk) => {
                  const r = periodRewards.find((x) => x.rank === rk);
                  const mine = rk === reward.rank;
                  const medal = rk === 1 ? "🥇" : rk === 2 ? "🥈" : "🥉";
                  return (
                    <div key={rk} className={`relative flex flex-col justify-between p-3 ${mine ? "border-b-2 border-emerald-600 bg-emerald-50/50" : "bg-white"}`}>
                      {mine && <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Anda</span>}
                      <div>
                        <span className="flex items-center gap-1 text-[12px] font-bold text-slate-600">Peringkat {rk} <span className="text-xs">{medal}</span></span>
                        <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-800">{r?.prize ?? "—"}</p>
                      </div>
                      <div className="mt-2 border-t border-slate-100 pt-1 text-[10px] font-medium">
                        {!r ? <span className="text-slate-400">—</span>
                          : mine ? <span className="text-emerald-700">{r.redeemedAt ? "Sudah diklaim" : "Tersedia"}</span>
                          : <span className="text-slate-500">{r.redeemedAt ? "Sudah diklaim" : `Milik ${first(r.name) ?? "pemenang"}`}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Katalog + klaim */}
            {reward.redeemedAt ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-medium text-emerald-800">
                Hadiah sudah ditukar pada {fmtDate(reward.redeemedAt)}. Terima kasih!
              </div>
            ) : (
              <RewardClaimCatalog token={rewardToken(reward.id)} rank={reward.rank} items={items(reward.prize)} phone={reward.phone} expired={expired} />
            )}

            {/* Panduan */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">ℹ️ Panduan Pengambilan Hadiah</div>
              <ol className="space-y-2.5 text-xs leading-snug text-slate-600">
                <li className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">1</span><span><strong className="text-slate-800">Jasa pasang gratis:</strong> otomatis masuk kuota booking, atau tunjukkan saat serahkan raket di outlet Tirtonic.</span></li>
                <li className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">2</span><span><strong className="text-slate-800">Voucher belanja:</strong> otomatis aktif di tab voucher checkout toko online, atau dipindai di meja kasir.</span></li>
                <li className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">3</span><span><strong className="text-slate-800">Hadiah fisik:</strong> diambil langsung di outlet atau disertakan dalam paket ekspedisi raketmu.</span></li>
              </ol>
            </section>
          </>
        )}
      </main>

      <StringingBottomNav active="leaderboard" phone={phone} />
    </div>
  );
}
