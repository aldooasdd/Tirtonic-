import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { salam } from "@/lib/wa";
import { fetchAcePoints } from "@/lib/tirtonichub-points";
import StringingBottomNav from "@/components/StringingBottomNav";
import OrderHistory from "@/components/OrderHistory";
import EditProfileSheet from "@/components/EditProfileSheet";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { antri: "Antri", dikerjakan: "Dikerjakan", selesai: "Selesai", batal: "Batal" };
const badge = (s: string) =>
  s === "selesai" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
  : s === "dikerjakan" ? "bg-blue-50 text-blue-700 border-blue-200"
  : s === "antri" ? "bg-amber-50 text-amber-700 border-amber-200"
  : s === "batal" ? "bg-red-50 text-red-600 border-red-200"
  : "bg-slate-100 text-slate-600 border-slate-200";

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

// Usia senar dari waktu string. 0-2 bln hijau, 2-3 bln kuning, >3 bln merah (habis).
function stringAge(createdAt: Date) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  const filled = Math.min(8, Math.max(1, Math.round((Math.min(1, days / 90)) * 8)));
  const label = days < 60 ? `${days} hari` : `${Math.round(days / 30)} bulan`;
  const { text, bar, fg } =
    days >= 90 ? { text: "Disarankan ganti senar", bar: "bg-red-500", fg: "text-red-600" }
    : days >= 60 ? { text: "Mendekati waktu ganti", bar: "bg-amber-400", fg: "text-amber-600" }
    : { text: "Kondisi optimal", bar: "bg-emerald-600", fg: "text-emerald-700" };
  return { filled, label, text, bar, fg, days };
}

// Buang token jenis raket lama (Power/Spin/Control, bisa "Spin + Control") dari label tersimpan.
const JENIS = /^(power|spin|control)(\s*\+\s*(power|spin|control))*$/i;
function cleanRacket(r: string | null): string | null {
  if (!r) return r;
  const parts = r.split("·").map((p) => p.trim()).filter((p) => p && !JENIS.test(p));
  return parts.join(" · ") || null;
}

// chosenString: "X (main) / Y (cross)" (hybrid) atau satu nama senar (full bed).
function parseStrings(cs: string | null) {
  if (!cs) return { main: null, cross: null, hybrid: false };
  const m = cs.match(/^(.*?)\s*\(main\)\s*\/\s*(.*?)\s*\(cross\)\s*$/i);
  if (m) return { main: m[1].trim(), cross: m[2].trim(), hybrid: true };
  return { main: cs.trim(), cross: null, hybrid: false };
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

  // Ace Points: tier + saldo dihitung di Tirtonichub (per-tier, belanja 12 bln, sejak 1 Nov 2026).
  const pts = await fetchAcePoints(phone);

  // Profil member (nama + ultah) untuk edit profil + centang "profil lengkap".
  const member = phone ? await safeQuery(() => prisma.member.findUnique({ where: { phone }, select: { name: true, birthday: true } }), null) : null;
  const displayName = member?.name ?? name;
  const birthdayISO = member?.birthday ? member.birthday.toISOString().slice(0, 10) : null;
  const profileComplete = !!(member?.name && member?.birthday);

  // Warna kartu per tier (dokumen Member Card). dark = kartu gelap → teks putih.
  const CARD: Record<string, { bg: string; dark: boolean }> = {
    White: { bg: "linear-gradient(135deg,#cbd5e1 0%,#94a3b8 55%,#e2e8f0 100%)", dark: false },
    Signature: { bg: "linear-gradient(135deg,#a67c00 0%,#7a5a0f 55%,#caa53d 100%)", dark: true },
    Prive: { bg: "linear-gradient(135deg,#18181b 0%,#000000 60%,#27272a 100%)", dark: true },
    Green: { bg: "linear-gradient(135deg,#004328 0%,#005a36 45%,#006D40 100%)", dark: true },
  };
  const card = CARD[pts.tier] ?? CARD.White;
  const d = card.dark;
  const ink = d ? "text-white" : "text-slate-900";
  const inkSub = d ? "text-white/80" : "text-slate-600";
  const inkFaint = d ? "text-white/60" : "text-slate-500";

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
  const totalThisWindow = months.reduce((a, b) => a + b.n, 0);

  // Hadiah leaderboard yang belum ditukar (kalau ada) → kartu Redeem Reward.
  const reward = phone
    ? await safeQuery(() => prisma.reward.findFirst({ where: { phone, redeemedAt: null }, orderBy: { createdAt: "desc" } }), null)
    : null;

  const initial = (displayName ?? "T").trim().charAt(0).toUpperCase() || "T";
  const greeting = `Selamat ${salam()}`;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] pb-28 font-sans text-slate-800 antialiased">
      {/* ======= Header: profil + switch (switch tepat di bawah header, ikut layar stringing) ======= */}
      <header className="relative z-10 px-5 pb-1 pt-10">
        <div className="mb-5 flex items-center gap-3.5">
          <div className="relative h-11 w-11 flex-shrink-0 rounded-2xl bg-gradient-to-tr from-emerald-700 via-emerald-500 to-teal-300 p-[1.5px] shadow-sm">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-emerald-50">
              <span className="text-lg font-extrabold tracking-tight text-emerald-800">{initial}</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[11px] font-semibold uppercase leading-none tracking-wider text-slate-400">{greeting}</span>
            <h1 className="flex items-center gap-1.5 text-xl font-bold leading-tight tracking-tight text-slate-900">
              <span>{displayName ?? "Halo!"}</span>
              {profileComplete && (
                <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" aria-label="Profil lengkap"><circle cx="12" cy="12" r="11" fill="#3b82f6" /><path d="M7 12.5l3.2 3L17 8.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-mono tracking-tight">{phone ? displayPhone(phone) : "Nomor tidak valid"}</span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-emerald-700">Tirtonic Member</span>
            </div>
          </div>
          <div className="ml-auto self-start">
            <EditProfileSheet phone={phone ?? ""} name={member?.name ?? ""} birthdayISO={birthdayISO} waDisplay={phone ? displayPhone(phone) : ""} tierLabel={pts.tierLabel} />
          </div>
        </div>

        {/* Segmented switch */}
        <nav className="flex items-center rounded-2xl bg-slate-200/70 p-1 backdrop-blur-xl">
          {([["stringing", "Stringing"], ["pesanan", "Pesanan Toko"]] as const).map(([k, l]) => {
            const activeTab = tab === k;
            return (
              <Link
                key={k}
                href={k === "stringing" ? `/riwayat/${encodeURIComponent(phone ?? "")}` : `/riwayat/${encodeURIComponent(phone ?? "")}?tab=pesanan`}
                className={`flex-1 rounded-[12px] px-3 py-2 text-center text-xs font-semibold tracking-tight transition ${activeTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/40 hover:text-slate-900"}`}
              >
                {l}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="relative z-10 space-y-4 px-5 pt-4">
        {/* ======= Kartu Tirtonic Ace (loyalty) ======= */}
        <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}/tier`} className={`relative flex aspect-[1.586/1] flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-[0_24px_48px_-12px_rgba(13,92,58,0.4)] ${ink} ${d ? "border-white/15" : "border-slate-300"}`} style={{ background: card.bg }}>
          <div className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-2xl ${d ? "bg-white/10" : "bg-white/40"}`} />
          <svg className={`pointer-events-none absolute inset-0 h-full w-full ${d ? "opacity-[0.12]" : "opacity-[0.07]"}`} fill="none" viewBox="0 0 320 200" stroke="currentColor" aria-hidden>
            <rect x="20" y="16" width="280" height="168" strokeWidth="2" />
            <line x1="160" x2="160" y1="16" y2="184" strokeWidth="2" />
            <line x1="56" x2="56" y1="16" y2="184" strokeWidth="1.5" />
            <line x1="264" x2="264" y1="16" y2="184" strokeWidth="1.5" />
            <line x1="56" x2="264" y1="100" y2="100" strokeWidth="1.5" />
          </svg>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-8 rounded-md border border-amber-300/40 bg-gradient-to-br from-amber-200/90 via-amber-300/70 to-yellow-500/80 p-0.5 shadow-sm">
                <div className="grid h-full w-full grid-cols-2 gap-0.5 rounded-[3px] border border-black/20 p-0.5">
                  <div className="border-r border-black/20" />
                  <div />
                </div>
              </div>
              <div>
                <span className={`block text-[10px] font-bold uppercase leading-none tracking-widest ${inkFaint}`}>Tirtonic Ace</span>
                <span className={`text-lg font-extrabold leading-tight tracking-tight ${ink}`}>{pts.tierLabel.replace(/^Tirtonic /, "")} Pass</span>
              </div>
            </div>
            <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_8px_-2px_rgba(0,0,0,0.15)] ${d ? "border-white/25 bg-white/15 text-white" : "border-white/60 bg-white/25 text-[#007444]"}`}>
              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${d ? "bg-white" : "bg-[#006d40]"}`} />ACTIVE
            </span>
          </div>

          <div className="relative z-10">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${inkFaint}`}>Saldo Ace Points</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className={`font-mono text-3xl font-extrabold tracking-tight ${ink}`}>{pts.balance.toLocaleString("id-ID")}</span>
              <span className={`text-xs font-bold tracking-wide ${inkSub}`}>PTS</span>
            </div>
            <div className={`mt-0.5 text-[11px] font-medium ${inkSub}`}>Setara {rupiah(pts.rp)}</div>
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <div>
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${inkFaint}`}>Club Member ID</div>
              <div className={`mt-0.5 font-mono text-sm font-semibold tracking-wider ${ink}`}>{phone ? displayPhone(phone) : "—"}</div>
            </div>
            <span className={`flex items-center gap-1 text-[11px] font-medium ${inkSub}`}>Manfaat tier<span aria-hidden>›</span></span>
          </div>
        </Link>

        {/* Tier progress — di bawah card */}
        <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}/tier`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-medium">{pts.nextTier ? `Menuju ${pts.nextTierLabel}` : "Tier tertinggi tercapai"}</span>
            <span className="font-mono font-bold text-slate-900">{pts.pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300" style={{ width: `${pts.pct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>{pts.nextTier ? `Belanja ${rupiah(pts.spendToNext)} lagi` : "Benefit penuh aktif"}</span>
            {pts.nextBenefit && <span>Benefit: {pts.nextBenefit}</span>}
          </div>
        </Link>

        {/* Tombol aksi — di bawah card */}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}/tukar`} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition active:scale-95">Tukar Poin</Link>
          <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}/voucher`} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition active:scale-95">Voucher Belanja</Link>
        </div>

        {/* Reward leaderboard (kalau ada) */}
        {reward && (
          <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}/reward`} id="reward" className="flex items-center gap-3.5 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition active:scale-[0.99]">
            <span className="text-2xl">🏆</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">Kamu Peringkat {reward.rank}!</p>
              <p className="truncate text-sm text-gray-600">{reward.redeemedAt ? "Hadiah sudah diklaim" : "Klaim hadiahmu — ketuk di sini"}</p>
            </div>
            <span className="text-lg text-slate-400">›</span>
          </Link>
        )}

        {tab === "pesanan" ? (
          <OrderHistory phone={phone ?? ""} />
        ) : orders.length === 0 ? (
          <p className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-400 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
            {phone ? "Belum ada riwayat stringing untuk nomor ini." : "Nomor WhatsApp pada tautan ini tidak valid."}
          </p>
        ) : (
          <>
            {/* Stat cards */}
            <section className="grid grid-cols-2 gap-3">
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Selesai</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">✓</div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold tracking-tight text-slate-900">{selesai}</span>
                  <span className="text-xs font-medium text-slate-500">raket</span>
                </div>
              </article>
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sedang Proses</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono text-3xl font-extrabold tracking-tight ${proses ? "text-slate-900" : "text-slate-400"}`}>{proses}</span>
                  <span className="text-xs font-medium text-slate-400">raket</span>
                </div>
                <p className="mt-2 text-[11px] font-medium text-slate-500">{proses ? "Sedang dikerjakan" : "Antrean senggang"}</p>
              </article>
            </section>

            {/* Grafik per bulan */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">Stringing per bulan</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Aktivitas restringing 6 bulan terakhir</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Total {totalThisWindow} Raket</span>
              </div>
              <div className="flex h-32 items-end justify-between gap-3 border-b border-slate-200 px-2 pt-2">
                {months.map((mo, i) => {
                  const top = mo.n === maxN && mo.n > 0;
                  const h = mo.n > 0 ? Math.max(12, Math.round((mo.n / maxN) * 80)) : 6;
                  return (
                    <div key={i} className="relative flex flex-1 flex-col items-center gap-2">
                      {mo.n > 0 && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">{mo.n}</div>
                      )}
                      <div className="flex h-20 w-full items-end justify-center">
                        <div className={`w-7 rounded-t-lg ${top ? "bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-500 shadow-md" : mo.n > 0 ? "bg-emerald-500/40" : "bg-slate-100"}`} style={{ height: `${h}px` }} />
                      </div>
                      <span className={`text-[11px] font-medium ${top ? "font-bold text-slate-900" : "text-slate-400"}`}>{mo.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Semua stringing */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1 pt-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Semua stringing</h2>
              </div>
              {orders.map((o) => {
                const age = stringAge(o.createdAt);
                const s = parseStrings(o.chosenString);
                const r = cleanRacket(o.racket) || o.chosenString || "Stringing";
                const hm = r.match(/^(.*?)\s*·\s*(\d{2,3}\s*in²)$/);
                const tension = o.tensionLbs != null
                  ? `${o.tensionLbs}${o.tensionCrossLbs && o.tensionCrossLbs !== o.tensionLbs ? ` / ${o.tensionCrossLbs}` : ""}`
                  : null;
                return (
                  <article key={o.resultCode} className="space-y-3.5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-extrabold leading-tight text-slate-900">{hm ? hm[1] : r}</h3>
                        {hm && <p className="mt-0.5 text-xs font-medium text-slate-500">{hm[2]}</p>}
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${badge(o.status)}`}>
                        {o.status === "dikerjakan" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />}
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2 text-[11px] font-medium text-slate-500">
                      <span>{new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {o.branch?.name && <><span className="text-slate-300">•</span><span>{o.branch.name}</span></>}
                      {o.stringerName && <><span className="text-slate-300">•</span><span>Stringer: <strong className="text-slate-800">{o.stringerName}</strong></span></>}
                    </div>

                    {tension && (
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="inline-block rounded-md border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">{s.hybrid ? "Hybrid" : "Full Bed"}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tension</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 flex-1 truncate text-xs text-slate-900" title={s.main ?? ""}><strong className="font-bold">Main :</strong> {s.main ?? "—"}</p>
                            <span className="shrink-0 font-mono text-sm font-extrabold tracking-tight text-slate-900">{o.tensionLbs ?? "—"}<span className="text-[10px] font-normal text-slate-500"> lbs</span></span>
                          </div>
                          {s.hybrid && (
                            <div className="flex items-center justify-between gap-3">
                              <p className="min-w-0 flex-1 truncate text-xs text-slate-900" title={s.cross ?? ""}><strong className="font-bold">Cross :</strong> {s.cross ?? "—"}</p>
                              <span className="shrink-0 font-mono text-sm font-extrabold tracking-tight text-slate-900">{o.tensionCrossLbs ?? o.tensionLbs ?? "—"}<span className="text-[10px] font-normal text-slate-500"> lbs</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Usia senar: <strong className="font-bold text-slate-900">{age.label}</strong></span>
                        <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${age.fg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${age.bar}`} />{age.text}
                        </span>
                      </div>
                      <div className="grid h-2 grid-cols-8 gap-1.5">
                        {Array.from({ length: 8 }, (_, i) => (
                          <div key={i} className={`h-full rounded-full ${i < age.filled ? age.bar : "bg-slate-200"}`} />
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </main>

      <StringingBottomNav active="home" phone={phone} />
    </div>
  );
}
