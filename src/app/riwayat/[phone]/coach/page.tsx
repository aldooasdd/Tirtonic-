import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { fetchAcePoints, RP_PER_REFERRAL_ACE } from "@/lib/tirtonichub-points";
import { memberDirectory } from "@/lib/member-directory";
import StringingBottomNav from "@/components/StringingBottomNav";
import CoachShare from "@/components/CoachShare";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard Coach — Tirtonic", robots: { index: false } };

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");
const DAY = 864e5;
// Privasi murid: nama depan + inisial ("Bima K."), tanpa nomor HP.
const short = (n: string | null) => {
  const w = (n ?? "").trim().split(/\s+/).filter(Boolean);
  return w.length === 0 ? "Murid" : w.length === 1 ? w[0] : `${w[0]} ${w[1][0].toUpperCase()}.`;
};
const initials = (n: string | null) => (n ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const fmtDay = (d: Date) => {
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  const t = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return days === 0 ? `Hari ini, ${t}` : days === 1 ? `Kemarin, ${t}` : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
// Senar umum disarankan ganti ±3 bulan sekali.
const stringState = (days: number) =>
  days >= 90 ? { label: "Perlu ganti", cls: "bg-red-50 text-red-600", bar: "bg-red-500" }
  : days >= 60 ? { label: "Segera ganti", cls: "bg-amber-50 text-amber-700", bar: "bg-amber-500" }
  : { label: "Kondisi baik", cls: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-600" };

const PERKS = [
  { t: "Poin belanja 2% + 2% dari murid", d: "Rp50.000 belanja = 1 Ace, plus 2% belanja murid referral otomatis masuk saldo." },
  { t: "Kode referral khusus murid", d: "Bagikan link/QR — murid terdaftar atas nama kamu seterusnya." },
  { t: "Voucher ulang tahun & merchandise", d: "Voucher ulang tahun + paket merchandise pelatih." },
  { t: "Event & Tennis Demo Day", d: "Prioritas demo clinic raket terbaru untuk sesi latih tanding murid." },
];

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "ganti", label: "Perlu ganti senar" },
  { key: "baru", label: "Murid baru" },
] as const;

export default async function CoachPage({ params, searchParams }: { params: { phone: string }; searchParams: { tab?: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const member = phone ? await safeQuery(() => prisma.member.findUnique({ where: { phone } }), null) : null;
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans text-slate-800 antialiased">
      <div className="mx-auto max-w-md px-5 pt-10 lg:max-w-6xl lg:px-8">{children}</div>
      <StringingBottomNav active="home" phone={phone} />
    </div>
  );
  const back = <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}`} className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">← Dashboard</Link>;

  if (!phone || !member?.isCoach || !member.coachCode) {
    return shell(
      <>
        <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold tracking-tight text-emerald-900">Dashboard Coach</h1>{back}</div>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Halaman ini khusus pemegang <b>Tirtonic Green Card</b> (coach terverifikasi).
          {phone && <Link href={`/riwayat/${phone}/tier`} className="mt-3 block font-semibold text-emerald-700">Ajukan Green Card →</Link>}
        </div>
      </>,
    );
  }

  const code = member.coachCode;
  const [pts, { rows }] = await Promise.all([fetchAcePoints(phone), memberDirectory()]);
  const students = rows.filter((r) => r.referredBy === code);
  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const daysLeft = Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() - now) / DAY);

  // Stringing terakhir tiap murid.
  const sf = students.length
    ? await safeQuery(() => prisma.sfOrder.findMany({ where: { phone: { in: students.map((s) => s.phone) }, status: { not: "batal" } }, orderBy: { createdAt: "desc" } }), [])
    : [];
  const lastSf = new Map<string, (typeof sf)[number]>();
  for (const o of sf) if (!lastSf.has(o.phone)) lastSf.set(o.phone, o);

  const roster = students
    .map((s) => {
      const o = lastSf.get(s.phone);
      const at = o ? (o.finishedAt ?? o.createdAt) : null;
      return { s, o, days: at ? Math.floor((now - at.getTime()) / DAY) : null };
    })
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
  const needString = roster.filter((r) => r.days !== null && r.days >= 90);
  const newStudents = roster.filter((r) => r.s.joinedAt && r.s.joinedAt.getTime() >= monthStart);
  const tab = TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "semua";
  const shown = tab === "ganti" ? needString : tab === "baru" ? newStudents : roster;

  // Komisi per nota murid: selisih floor kumulatif → jumlahnya pas dengan total referral.
  const feed = students
    .flatMap((s) => {
      let cum = 0;
      return [...s.hub]
        .sort((a, b) => a.soldAt.localeCompare(b.soldAt))
        .map((n) => {
          const before = Math.floor(cum / RP_PER_REFERRAL_ACE);
          cum += n.grandTotal;
          return { name: short(s.name), at: new Date(n.soldAt), branch: n.branchName, pts: Math.floor(cum / RP_PER_REFERRAL_ACE) - before };
        });
    })
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);
  const spendMonth = students.reduce((a, s) => a + s.hub.filter((n) => new Date(n.soldAt).getTime() >= monthStart).reduce((x, n) => x + n.grandTotal, 0), 0);

  // Leaderboard referral bulan ini: belanja murid bulan berjalan per coach.
  const board = rows
    .filter((c) => c.isCoach && c.coachCode)
    .map((c) => {
      const st = rows.filter((r) => r.referredBy === c.coachCode);
      return { phone: c.phone, name: c.name, branch: c.branch, students: st.length, spend: st.reduce((a, s) => a + s.hub.filter((n) => new Date(n.soldAt).getTime() >= monthStart).reduce((x, n) => x + n.grandTotal, 0), 0) };
    })
    .sort((a, b) => b.spend - a.spend || b.students - a.students)
    .slice(0, 5);

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");
  const coachName = `Coach ${member.name?.split(/\s+/)[0] ?? code}`;
  const box = "rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]";
  const h2 = "text-lg font-bold tracking-tight text-slate-900";
  const eyebrow = "text-[10px] font-bold uppercase tracking-widest text-emerald-700";

  return shell(
    <>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Coach · Green Card</span>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-emerald-900 lg:text-3xl">Halo, {coachName}</h1>
          <p className="mt-0.5 text-xs text-slate-500 lg:text-sm">Pantau murid, kondisi senar mereka, dan komisi Ace Points kamu.</p>
        </div>
        {back}
      </header>

      <div className="space-y-5 lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0">
        {/* Green Card */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-600/30 bg-[linear-gradient(135deg,#004328_0%,#005a36_45%,#006D40_100%)] p-6 text-white shadow-[0_24px_48px_-12px_rgba(13,92,58,0.4)] lg:col-span-7">
          <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-emerald-300/20 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Tirtonic Ace Pass</div>
              <div className="text-lg font-bold">Green Card</div>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold backdrop-blur">● Coach aktif</span>
          </div>
          <div className="relative mt-6 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Saldo Ace Points</div>
          <div className="relative mt-1 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-extrabold tracking-tight">{num(pts.balance)}</span>
            <span className="text-xs font-bold text-emerald-200">PTS</span>
          </div>
          <div className="relative mt-1 text-sm text-emerald-100/80">Setara {rupiah(pts.rp)} · {num(pts.referral)} PTS dari murid</div>
          <div className="relative mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 font-mono text-[11px] text-emerald-100/80 backdrop-blur-md">
            <span>MEMBER {displayPhone(phone)}</span>
            <span>KODE {code}</span>
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <Link href={`/riwayat/${phone}/tukar`} className="rounded-2xl bg-white py-2.5 text-center text-xs font-bold text-emerald-900 active:scale-95">Tukar Poin</Link>
            <Link href={`/riwayat/${phone}/voucher`} className="rounded-2xl border border-white/25 py-2.5 text-center text-xs font-bold text-white active:scale-95">Voucher Belanja</Link>
          </div>
        </div>

        {/* Bagikan referral */}
        <div className={`${box} lg:col-span-5`}>
          <div className={eyebrow}>Referral murid baru</div>
          <h2 className={`${h2} mt-1`}>Undang &amp; daftarkan murid</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Murid daftar lewat link ini → kamu dapat 2% (1 Ace per {rupiah(RP_PER_REFERRAL_ACE)}) dari setiap belanja mereka di toko.</p>
          <CoachShare code={code} link={`${site}/join?ref=${code}`} coachName={coachName} />
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-3 gap-2 lg:col-span-12 lg:gap-5">
          {[
            [num(students.length), "Murid terdaftar", newStudents.length ? `+${newStudents.length} bulan ini` : null],
            [rupiah(spendMonth), "Belanja murid bulan ini", null],
            [`${num(pts.referral)} PTS`, "Komisi dari murid", null],
          ].map(([v, l, n]) => (
            <div key={l} className={`${box} !p-4`}>
              <div className="truncate text-base font-extrabold tracking-tight text-slate-900 lg:text-2xl">{v}</div>
              <div className="mt-0.5 text-[10px] text-slate-500 lg:text-xs">{l}</div>
              {n && <div className="mt-1 text-[10px] font-semibold text-emerald-700">{n}</div>}
            </div>
          ))}
        </div>

        {/* Murid & senar */}
        <section className={`${box} lg:col-span-12`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={h2}>Murid &amp; kondisi senar</h2>
              <p className="mt-0.5 text-xs text-slate-500">Dari stringing terakhir di Tirtonic. Senar idealnya diganti tiap ±3 bulan.</p>
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1 text-[11px] font-semibold">
              {TABS.map((t) => (
                <Link key={t.key} href={`?tab=${t.key}`} scroll={false} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                  {t.label} ({t.key === "ganti" ? needString.length : t.key === "baru" ? newStudents.length : roster.length})
                </Link>
              ))}
            </div>
          </div>
          {needString.length > 0 && tab !== "baru" && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
              <b>{needString.length} murid</b> sudah ≥3 bulan belum ganti senar — ingatkan saat latihan berikutnya.
            </div>
          )}
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{roster.length === 0 ? "Belum ada murid. Bagikan link referral kamu di atas." : "Tidak ada murid di kategori ini."}</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map(({ s, o, days }) => {
                const st = days === null ? null : stringState(days);
                return (
                  <div key={s.phone} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">{initials(s.name)}</span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{short(s.name)}</div>
                        <div className="text-[11px] text-slate-500">{s.branch ?? "—"}</div>
                      </div>
                    </div>
                    {st && days !== null ? (
                      <>
                        <div className="mt-3 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">{days} hari lalu</span>
                          <span className={`rounded-full px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${st.bar}`} style={{ width: `${Math.min(100, (days / 90) * 100)}%` }} /></div>
                        <dl className="mt-3 space-y-1 text-[11px]">
                          <div className="flex justify-between gap-2"><dt className="text-slate-400">Raket</dt><dd className="truncate text-right text-slate-700">{o?.racket ?? "—"}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-slate-400">Senar</dt><dd className="truncate text-right text-slate-700">{o?.chosenString ?? "—"}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-slate-400">Tension</dt><dd className="text-right text-slate-700">{o?.tensionLbs ? `${o.tensionLbs}/${o.tensionCrossLbs ?? o.tensionLbs} lbs` : "—"}</dd></div>
                        </dl>
                      </>
                    ) : (
                      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">Belum pernah stringing di Tirtonic.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Riwayat komisi */}
        <section className={`${box} lg:col-span-7`}>
          <h2 className={h2}>Riwayat komisi murid</h2>
          <p className="mt-0.5 text-xs text-slate-500">Nama disingkat &amp; detail belanja disembunyikan demi privasi murid.</p>
          {feed.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada belanja murid.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {feed.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{f.name}</div>
                    <div className="text-[11px] text-slate-500">{fmtDay(f.at)}{f.branch ? ` · ${f.branch}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm font-extrabold ${f.pts > 0 ? "text-emerald-700" : "text-slate-400"}`}>+{f.pts} PTS</div>
                    <div className="text-[10px] font-semibold text-emerald-600">Terkredit otomatis</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section className={`${box} lg:col-span-5`}>
          <div className="flex items-center justify-between">
            <div className={eyebrow}>Leaderboard referral</div>
            <span className="text-[10px] text-slate-400">Reset {daysLeft} hari lagi</span>
          </div>
          <h2 className={`${h2} mt-1`}>Coach terbaik bulan ini</h2>
          <p className="mt-0.5 text-xs text-slate-500">Diurutkan dari total belanja murid bulan berjalan.</p>
          <ol className="mt-3 space-y-2">
            {board.map((b, i) => {
              const me = b.phone === phone;
              return (
                <li key={b.phone} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${me ? "border border-emerald-300 bg-emerald-50" : "bg-slate-50"}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-400 text-white" : "bg-white text-slate-600"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">Coach {short(b.name)}{me && <span className="ml-1.5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-white">KAMU</span>}</div>
                    <div className="text-[11px] text-slate-500">{b.branch ?? "—"} · {b.students} murid</div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-700">{rupiah(b.spend)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Benefit Green */}
        <section className={`${box} lg:col-span-12`}>
          <div className={eyebrow}>Benefit Green Card</div>
          <h2 className={`${h2} mt-1`}>Hak istimewa coach aktif</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p) => (
              <div key={p.t} className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">{p.t}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{p.d}</div>
              </div>
            ))}
          </div>
          <Link href="/event" className="mt-3 inline-block text-xs font-semibold text-emerald-700">Lihat Event &amp; Demo Day →</Link>
        </section>
      </div>
    </>,
  );
}
