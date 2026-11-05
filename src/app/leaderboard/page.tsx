import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { wibNow, wibMonthRange, wibMonthLabel } from "@/lib/wib";
import StringingBottomNav from "@/components/StringingBottomNav";
import MyRank from "@/components/MyRank";
import CountdownPeriode from "@/components/CountdownPeriode";
import CekHadiahLink from "@/components/CekHadiahLink";

// Hadiah per peringkat (samakan dgn src/lib/reward.ts).
const PRIZE: Record<number, string> = {
  1: "Gratis 2× Stringing Service + Overgrip + Voucher Rp 50.000",
  2: "Gratis 1× Stringing Service + Voucher Rp 50.000",
  3: "Voucher Rp 50.000",
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hall of Fame — Tirtonic", robots: { index: false } };

// Kapital awal tiap kata (privasi + rapi): "angga" -> "Angga".
const cap = (s: string | null) => (s ? s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s);

type Row = { phone: string; name: string | null; n: number; last: number; photo: string | null; verified: boolean };

// Centang terverifikasi (profil lengkap: nama + tgl lahir diisi di dashboard).
function Check({ cls }: { cls: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${cls} shrink-0`} aria-label="Terverifikasi">
      <circle cx="12" cy="12" r="11" fill="#0d5c3a" />
      <path d="M7 12.5l3.2 3L17 8.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Avatar: foto profil member kalau ada, selain itu logo.
function Avatar({ photo, cls }: { photo: string | null; cls: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return photo
    ? <img loading="lazy" decoding="async" src={photo} alt="" className={`${cls} rounded-full object-cover`} />
    // eslint-disable-next-line @next/next/no-img-element
    : <img loading="lazy" decoding="async" src="/logo.png" alt="" className={`${cls} object-contain`} />;
}

export default async function LeaderboardPage({ searchParams }: { searchParams: { ym?: string } }) {
  // Bulan yang dilihat: dari ?ym=YYYY-MM, default bulan ini (WIB). Tidak boleh ke masa depan.
  const { y: curY, m: curM } = wibNow();
  let y = curY, m = curM;
  const ymMatch = searchParams.ym?.match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    const yy = Number(ymMatch[1]);
    const mi = Number(ymMatch[2]) - 1;
    if (mi >= 0 && mi <= 11 && (yy < curY || (yy === curY && mi <= curM))) { y = yy; m = mi; }
  }
  const { start, end } = wibMonthRange(y, m);
  const bulanLong = wibMonthLabel(y, m);

  const isCurrent = y === curY && m === curM;
  const msLeft = end.getTime() - Date.now();
  const ymViewed = `${y}-${String(m + 1).padStart(2, "0")}`;

  // Navigasi bulan (ym dihilangkan kalau bulan ini).
  const mkUrl = (yy: number, mm: number) => {
    const p = new URLSearchParams();
    if (!(yy === curY && mm === curM)) p.set("ym", `${yy}-${String(mm + 1).padStart(2, "0")}`);
    const qs = p.toString();
    return qs ? `/leaderboard?${qs}` : "/leaderboard";
  };
  const prev = new Date(y, m - 1, 1);
  const next = new Date(y, m + 1, 1);
  const canNext = next <= new Date(curY, curM, 1);

  const orders = await prisma.sfOrder.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { phone: true, customerName: true, createdAt: true },
  });

  // 1 nomor = 1 orang; hitung jumlah stringing. `last` = kapan skor dicapai (tie-break).
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
    .map(([phone, v]) => ({ phone, name: cap(v.name), n: v.n, last: v.last, photo: null as string | null, verified: false }))
    .sort((a, b) => b.n - a.n || a.last - b.last)
    .slice(0, 10);

  // Pakai nama + foto profil dari dashboard member (kalau sudah diisi), override data nota.
  if (rows.length) {
    const members = await prisma.member.findMany({
      where: { phone: { in: rows.map((r) => r.phone) } },
      select: { phone: true, name: true, photo: true, birthday: true },
    });
    const mem = new Map(members.map((mm) => [mm.phone, mm]));
    for (const r of rows) {
      const mm = mem.get(r.phone);
      if (mm?.name) r.name = cap(mm.name);
      if (mm?.photo) r.photo = mm.photo;
      r.verified = !!(mm?.name && mm?.birthday); // profil lengkap = centang
    }
  }

  const top1 = rows[0];
  const second = rows[1];
  const third = rows[2];
  const rest = rows.slice(3);

  const tabBase = "flex-1 rounded-xl py-1.5 px-2 text-center text-[12px] tracking-tight transition";
  const liveLabel = isCurrent ? "Live Race" : "Final";

  return (
    <div className="mx-auto min-h-screen max-w-md overflow-x-hidden bg-[#f6f7fa] pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/[0.04] bg-[#f6f7fa]/85 px-5 pb-3 pt-10 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight text-[#0d5c3a]">Leaderboard</span>
          <Link href="/leaderboard/pemenang" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#0d5c3a] active:opacity-60">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0d5c3a]" />
            Arsip Resmi
          </Link>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-5 pt-3">
        {/* Title block */}
        <div className="flex items-start justify-between pt-1">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0d5c3a] shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0d5c3a]" />
              Tirtonic Ace Series
            </div>
            <h1 className="text-[30px] font-bold leading-none tracking-tight text-slate-900">Hall of Fame</h1>
            <p className="mt-1 text-[13px] font-normal tracking-tight text-slate-500">Juara Global &amp; Rekor Bulanan Klub</p>
          </div>
          <Link href="/leaderboard/pemenang" aria-label="Arsip pemenang" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-white/90 via-slate-100/80 to-slate-200/90 text-amber-500 shadow-sm backdrop-blur-md active:scale-95">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c1.92-.35 3.48-1.78 3.9-3.96C19.18 11.63 21 9.55 21 7V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" /></svg>
          </Link>
        </div>

        {/* Countdown + navigasi bulan */}
        <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 via-[#0d5c3a] to-emerald-950 p-3.5 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {isCurrent && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-tight text-emerald-100/90">{isCurrent ? "Musim Berjalan" : "Musim Selesai"}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                <Link href={mkUrl(prev.getFullYear(), prev.getMonth())} aria-label="Bulan sebelumnya" className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 hover:bg-white/15">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </Link>
                <span className="min-w-[7.5rem] text-center text-[13px] font-bold tracking-tight">{bulanLong}</span>
                {canNext ? (
                  <Link href={mkUrl(next.getFullYear(), next.getMonth())} aria-label="Bulan berikutnya" className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 hover:bg-white/15">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center text-white/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </span>
                )}
              </div>
            </div>
            {isCurrent && msLeft > 0
              ? <CountdownPeriode deadline={end.toISOString()} />
              : <span className="shrink-0 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-bold text-white/80">Periode Final</span>}
          </div>
        </section>

        {/* Segment tabs */}
        <div className="flex items-center gap-1 rounded-2xl border border-white/80 bg-white/60 p-1 shadow-sm backdrop-blur-xl">
          <span className={`${tabBase} border border-slate-100 bg-white font-semibold text-[#0d5c3a] shadow-sm`}>Musim Aktif</span>
          <a href="#klasemen" className={`${tabBase} font-medium text-slate-600 hover:text-slate-900`}>Top 10 Live</a>
          <Link href="/leaderboard/syarat" className={`${tabBase} font-medium text-slate-600 hover:text-slate-900`}>Hadiah</Link>
          <Link href="/leaderboard/syarat" className={`${tabBase} font-medium text-slate-600 hover:text-slate-900`}>Aturan Poin</Link>
        </div>

        {/* Reward claim notice */}
        <div className="flex items-center justify-between rounded-3xl border border-white/90 bg-white/70 p-3.5 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0d5c3a] text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <p className="text-[12px] font-semibold leading-tight text-slate-900">Klaim Voucher &amp; Hadiah Otomatis</p>
              <p className="mt-0.5 text-[11px] font-normal text-[#0d5c3a]">Voucher aktif otomatis tersedia di profil Anda</p>
            </div>
          </div>
          <CekHadiahLink className="shrink-0 rounded-lg border border-emerald-200/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0d5c3a] shadow-sm hover:bg-slate-50" />
        </div>

        {/* Klasemen Top 10 */}
        <section id="klasemen" className="relative rounded-3xl border border-white/80 bg-gradient-to-br from-white/90 via-slate-50/80 to-white/95 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-black/[0.05] pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isCurrent && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0d5c3a]" />
              </span>
              <h2 className="text-[17px] font-bold leading-tight tracking-tight text-slate-900">Klasemen Top 10{isCurrent ? " Berjalan" : ""}</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#0d5c3a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0d5c3a]" />{liveLabel}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada stringing di {bulanLong}.</p>
          ) : (
            <>
              {/* Top 1 */}
              <div className="relative flex flex-col items-center pb-3 pt-4 text-center">
                <div className="relative mb-2.5">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 p-1 shadow-md">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
                      <Avatar photo={top1.photo} cls={top1.photo ? "h-full w-full" : "h-12 w-12"} />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-300 to-amber-500 text-[11px] font-bold text-white shadow-sm">1</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[18px] font-bold tracking-tight text-slate-900">{top1.name ?? "Tanpa nama"}</h3>
                  {top1.verified && <Check cls="h-4 w-4" />}
                  <span className="rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">Pemimpin Klasemen</span>
                </div>
                <p className="mt-0.5 text-[12px] font-normal text-slate-500">Posisi #1 Musim {bulanLong} • {top1.n} Stringing</p>
                <div className="mt-3 rounded-xl border border-slate-200/60 bg-white px-3 py-1 text-center shadow-sm">
                  <span className="block text-[10px] font-semibold uppercase tracking-tight text-slate-400">Total Raket</span>
                  <span className="text-[14px] font-bold text-slate-900">{top1.n} Stringing</span>
                </div>
                <div className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-100/70 to-amber-50 p-2.5 text-[12px] font-semibold text-amber-800 shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <span className="tracking-tight">Hadiah #1: {PRIZE[1]}</span>
                </div>
              </div>

              {/* Juara 2 & 3 */}
              {(second || third) && (
                <div className="grid grid-cols-2 gap-2.5 border-t border-black/[0.04] pt-3">
                  {second && (
                    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-3 shadow-sm backdrop-blur-md">
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-600">2</span>
                        <span className="text-[10px] font-medium text-slate-400">Runner-up</span>
                      </div>
                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-primary/5 shadow-sm">
                          <Avatar photo={second.photo} cls={second.photo ? "h-full w-full" : "h-6 w-6"} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="flex items-center gap-1 text-[13px] font-bold leading-tight tracking-tight text-slate-800"><span className="truncate">{second.name ?? "Tanpa nama"}</span>{second.verified && <Check cls="h-3.5 w-3.5" />}</h4>
                          <p className="text-[11px] font-semibold text-slate-600">{second.n} stringing</p>
                        </div>
                      </div>
                      <div className="mt-1 border-t border-slate-100 pt-1.5 text-[10px] font-medium text-[#0d5c3a]">🎁 {PRIZE[2]}</div>
                    </div>
                  )}
                  {third && (
                    <div className="flex flex-col justify-between rounded-2xl border border-orange-200/60 bg-white/80 p-3 shadow-sm backdrop-blur-md">
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-orange-200/70 bg-orange-50 text-[10px] font-bold text-orange-800">3</span>
                        <span className="text-[10px] font-medium text-slate-400">Podium 3</span>
                      </div>
                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-primary/5 shadow-sm">
                          <Avatar photo={third.photo} cls={third.photo ? "h-full w-full" : "h-6 w-6"} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="flex items-center gap-1 text-[13px] font-bold leading-tight tracking-tight text-slate-800"><span className="truncate">{third.name ?? "Tanpa nama"}</span>{third.verified && <Check cls="h-3.5 w-3.5" />}</h4>
                          <p className="text-[11px] font-semibold text-slate-600">{third.n} stringing</p>
                        </div>
                      </div>
                      <div className="mt-1 border-t border-slate-100 pt-1.5 text-[10px] font-medium text-amber-800">🎟 {PRIZE[3]}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Peringkat 4-10 */}
              {rest.length > 0 && (
                <div className="mt-3.5 border-t border-black/[0.04] pt-3">
                  <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Peringkat 4 - 10</div>
                  <div className="space-y-1.5">
                    {rest.map((r, i) => (
                      <div key={r.phone} className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/70 p-2.5 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{i + 4}</span>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-primary/5 shadow-sm">
                            <Avatar photo={r.photo} cls={r.photo ? "h-full w-full" : "h-5 w-5"} />
                          </div>
                          <div className="min-w-0">
                            <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight text-slate-900"><span className="truncate">{r.name ?? "Tanpa nama"}</span>{r.verified && <Check cls="h-3.5 w-3.5" />}</span>
                            <span className="text-[10px] font-normal text-slate-500">{r.n} stringing</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Posisi viewer (pakai nomor HP tersimpan) */}
        <MyRank loc="global" ym={ymViewed} />
      </main>

      <StringingBottomNav active="leaderboard" />
    </div>
  );
}
