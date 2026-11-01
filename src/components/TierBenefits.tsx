"use client";

import { useState } from "react";

// Halaman "Manfaat Tier" — port dari mockup Stitch (stitch_member_dashboard_redesign #3).
// Token MD3 diubah ke hex (Tailwind app = v3.4 default). Ikon = Material Symbols Outlined.
// Data nyata: tier user, belanja 12 bln, saldo, status coach + kode referral. Benefit = teks.

type Props = { tier: string; spend12mo: number; balance: number; isCoach: boolean; coachCode: string | null; phone: string | null };

// Warna kartu per tier — SAMA dengan kartu dashboard (src/app/riwayat/[phone]/page.tsx).
// white = pakai teks putih di kartu.
const DCARD: Record<string, { grad: string; white: boolean }> = {
  White: { grad: "linear-gradient(135deg,#cbd5e1 0%,#94a3b8 55%,#e2e8f0 100%)", white: false },
  Signature: { grad: "linear-gradient(135deg,#a67c00 0%,#7a5a0f 55%,#caa53d 100%)", white: true },
  Prive: { grad: "linear-gradient(135deg,#18181b 0%,#000000 60%,#27272a 100%)", white: true },
  Green: { grad: "linear-gradient(135deg,#004328 0%,#005a36 45%,#006D40 100%)", white: true },
};

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

type Ben = { icon: string; title: string; desc: string };
type T = {
  key: string; tab: string; pass: string; passColor: string; full: string; level: string;
  grad: string; light: boolean; // light = teks putih
  qualifyText: string; qualify: number | null; benefits: Ben[]; footer: string;
};

// gradient + benefit per tier (persis mockup). Green (coach) di akhir, sesudah Black Card.
const TIERS: T[] = [
  {
    key: "White", tab: "White", pass: "WHITE PASS", passColor: "#004328", full: "Tirtonic White", level: "Level 1 • Entry Level",
    grad: "linear-gradient(135deg,#ffffff 0%,#f1effa 55%,#d8d6e3 100%)", light: false,
    qualifyText: "Kartu dasar untuk seluruh customer dalam ekosistem Tirtonic Ace. Terbuka otomatis saat pendaftaran nomor WhatsApp.",
    qualify: null,
    benefits: [
      { icon: "loyalty", title: "Poin Belanja Ekstra", desc: "Nilai Kembali 1% (Rp100.000 = 1 Poin Ace / 1 poin = Rp1.000)." },
      { icon: "cake", title: "Voucher Ulang Tahun", desc: "Voucher diskon khusus di bulan hari ulang tahun member." },
    ],
    footer: "Standard Member Privilege — track record riwayat stringing digital, garansi raket resmi, akses matchmaking komunitas Tirtonic Ace.",
  },
  {
    key: "Signature", tab: "Signature", pass: "SIGNATURE", passColor: "#4a3708", full: "Tirtonic Signature", level: "Level 3 • Eksklusif",
    grad: "linear-gradient(135deg,#edd89a 0%,#c6a355 55%,#8d6924 100%)", light: false,
    qualifyText: "Belanja Rp30.000.000 dalam 12 bulan atau kumpulkan 30.000 Tirtonic Ace Points untuk membuka Signature Tier.",
    qualify: 30_000_000,
    benefits: [
      { icon: "loyalty", title: "Poin Belanja Ekstra", desc: "Nilai Kembali ±1,5% (Rp65.000 = 1 Poin Tirtonic Ace)." },
      { icon: "build_circle", title: "Gratis Jasa Stringing", desc: "Gratis 2× pasang senar per tahun di semua outlet Tirtonic." },
      { icon: "support_agent", title: "Layanan Prioritas", desc: "Fast-track service & antrean khusus pelayanan via WhatsApp VIP." },
      { icon: "cake", title: "Voucher Ulang Tahun & Hadiah", desc: "Voucher ulang tahun eksklusif Tirtonic senilai Rp250.000." },
      { icon: "local_activity", title: "Akses Rilis Koleksi Awal", desc: "Early access 48 jam untuk peluncuran raket & apparel terbatas." },
    ],
    footer: "Benefit Dasar Semua Member — Tirtonic Ace Points setiap transaksi belanja & stringing di toko maupun online.",
  },
  {
    key: "Prive", tab: "Privé", pass: "BLACK CARD PASS", passColor: "#ffffff", full: "Tirtonic Privé", level: "Tingkat Tertinggi • Ultra-Exclusive",
    grad: "linear-gradient(135deg,#0b1326 0%,#111827 55%,#040812 100%)", light: true,
    qualifyText: "Belanja Rp100.000.000 dalam 12 bulan untuk membuka tier tertinggi Tirtonic Privé.",
    qualify: 100_000_000,
    benefits: [
      { icon: "diamond", title: "Poin Belanja Tertinggi 2,5%", desc: "Nilai Kembali 2,5% (Rp40.000 = 1 Poin Tirtonic Ace / 1 poin = Rp1.000)." },
      { icon: "build_circle", title: "Gratis 6× Jasa Stringing / Tahun", desc: "Bebas pasang senar 6× per tahun di seluruh workshop (bebas pilih mesin & Master Stringer)." },
      { icon: "support_agent", title: "Personal Shopper & Concierge 24/7", desc: "Asisten pribadi untuk pemesanan raket impor, booking antrean darurat, konsultasi alat turnamen." },
      { icon: "rocket_launch", title: "First Priority Drop (72 Jam Awal)", desc: "Akses prioritas 72 jam sebelum rilis edisi terbatas & kolaborasi desainer ke publik." },
      { icon: "redeem", title: "Hadiah Ulang Tahun Mewah", desc: "Paket kado premium tahunan senilai Rp1.000.000+ dikurasi langsung tim eksekutif Tirtonic." },
      { icon: "bolt", title: "Express 30-Menit Restring Kilat", desc: "Garansi pengerjaan senar instan dalam 30 menit saat turnamen tanpa biaya surcharge." },
    ],
    footer: "Termasuk seluruh benefit dasar — poin tak kedaluwarsa selama aktif, gratis konsultasi tensi senar, welcome voucher.",
  },
  {
    key: "Green", tab: "Green", pass: "GREEN PASS", passColor: "#ffffff", full: "Tirtonic Green", level: "Khusus Pelatih • Coach Level",
    grad: "linear-gradient(135deg,#1b5e39 0%,#0d5c3a 55%,#04331c 100%)", light: true,
    qualifyText: "Kartu khusus pelatih tenis. Verifikasi sertifikasi / profil pelatih aktif melalui tim kurasi resmi Tirtonic.",
    qualify: null,
    benefits: [
      { icon: "currency_exchange", title: "Poin Belanja Ekstra & Murid", desc: "Nilai Kembali 2% (Rp50.000 = 1 Ace) + 2% dari belanja murid referral otomatis ke saldo pelatih." },
      { icon: "share", title: "Kode Referral Khusus Murid", desc: "Bagikan kode unik: diskon senar murid + poin pasif setiap mereka checkout." },
      { icon: "cake", title: "Voucher Ulang Tahun & Merchandise", desc: "Voucher ulang tahun senilai Rp150.000 + paket merchandise pelatih eksklusif." },
      { icon: "stadium", title: "Akses Event & Tennis Demo Day", desc: "Tiket VIP demo clinic raket terbaru + alokasi raket uji coba untuk sesi latih tanding murid." },
    ],
    footer: "Benefit Dasar Semua Member — akses histori stringing & riwayat tensi raket, notifikasi jadwal turnamen komunitas Tirtonic.",
  },
];

const RANK: Record<string, number> = { White: 0, Signature: 1, Prive: 2 };
const Icon = ({ n, className }: { n: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className ?? ""}`}>{n}</span>
);

export default function TierBenefits({ tier, spend12mo, balance, isCoach, coachCode, phone }: Props) {
  const [sel, setSel] = useState(TIERS.some((t) => t.key === tier) ? tier : "White");
  const info = TIERS.find((t) => t.key === sel) ?? TIERS[0];
  const L = info.light;

  const userRank = RANK[tier] ?? 0;
  const owned = info.key === "White" ? true : info.key === "Green" ? isCoach : userRank >= (RANK[info.key] ?? 99);
  const pct = info.qualify ? Math.max(0, Math.min(100, Math.round((spend12mo / info.qualify) * 100))) : 100;
  const sisa = info.qualify ? Math.max(0, info.qualify - spend12mo) : 0;

  const ink = L ? "text-white" : "text-[#1a1b22]";
  const inkSub = L ? "text-white/70" : "text-[#404942]";
  const inkFaint = L ? "text-white/55" : "text-[#707971]";
  const selIdx = TIERS.findIndex((t) => t.key === sel);

  // Kartu: warna + ink mengikuti kartu dashboard.
  const dc = DCARD[info.key] ?? DCARD.White;
  const W = dc.white;
  const cInk = W ? "text-white" : "text-[#1a1b22]";
  const cSub = W ? "text-white/70" : "text-[#404942]";
  const cFaint = W ? "text-white/55" : "text-[#707971]";

  return (
    <div className="space-y-6">
      {/* Material Symbols font (hoisted ke head oleh Next) */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
      <style>{`.material-symbols-outlined{font-variation-settings:'FILL'0,'wght'400,'GRAD'0,'opsz'24;line-height:1;vertical-align:middle;}`}</style>

      {/* Pills tier */}
      <div className="flex items-center justify-between rounded-full bg-[#eeedf7] p-1 shadow-sm">
        {TIERS.map((t) => {
          const active = sel === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSel(t.key)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-[13px] font-semibold tracking-tight transition ${active ? "bg-white text-[#004328] shadow-sm" : "text-[#404942]"}`}
            >
              {t.key === tier && <span className="h-2 w-2 rounded-full bg-[#006d40]" />}
              <span>{t.tab}</span>
            </button>
          );
        })}
      </div>

      {/* Kartu member */}
      <div className="flex flex-col items-center">
        <div className={`relative flex aspect-[1.586/1] w-full max-w-sm flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-xl ${W ? "border-white/15" : "border-slate-300"}`} style={{ background: dc.grad }}>
          <div className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-2xl ${W ? "bg-white/10" : "bg-white/40"}`} />
          <svg className={`pointer-events-none absolute inset-0 h-full w-full ${W ? "opacity-[0.12]" : "opacity-[0.07]"}`} fill="none" viewBox="0 0 320 200" stroke="currentColor" aria-hidden>
            <rect x="20" y="16" width="280" height="168" strokeWidth="2" />
            <line x1="160" x2="160" y1="16" y2="184" strokeWidth="2" />
            <line x1="56" x2="56" y1="16" y2="184" strokeWidth="1.5" />
            <line x1="264" x2="264" y1="16" y2="184" strokeWidth="1.5" />
            <line x1="56" x2="264" y1="100" y2="100" strokeWidth="1.5" />
          </svg>

          {/* atas: chip + brand + badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-8 rounded-md border border-amber-300/40 bg-gradient-to-br from-amber-200/90 via-amber-300/70 to-yellow-500/80 p-0.5 shadow-sm">
                <div className="grid h-full w-full grid-cols-2 gap-0.5 rounded-[3px] border border-black/20 p-0.5">
                  <div className="border-r border-black/20" />
                  <div />
                </div>
              </div>
              <div>
                <span className={`block text-[10px] font-bold uppercase leading-none tracking-widest ${cFaint}`}>Tirtonic Ace</span>
                <span className={`text-lg font-extrabold leading-tight tracking-tight ${cInk}`}>{info.full.replace(/^Tirtonic /, "")} Card Pass</span>
              </div>
            </div>
            <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_8px_-2px_rgba(0,0,0,0.15)] ${owned ? (W ? "border-white/25 bg-white/15 text-white" : "border-white/60 bg-white/25 text-[#007444]") : "border-white/15 bg-black/25 text-white/85"}`}>
              {owned && <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${W ? "bg-white" : "bg-[#006d40]"}`} />}
              {owned ? "ACTIVE" : "LOCKED"}
            </span>
          </div>

          {/* bawah: Club Member ID */}
          <div className="relative z-10">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${cFaint}`}>Club Member ID</div>
            <div className={`mt-0.5 font-mono text-sm font-semibold tracking-wider ${cInk}`}>{phone ?? "—"}</div>
          </div>
        </div>
        {/* dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {TIERS.map((t, i) => (
            <span key={t.key} className={`h-1.5 rounded-full transition-all ${i === selIdx ? "w-6 bg-[#004328]" : "w-1.5 bg-[#e3e1ec]"}`} />
          ))}
        </div>
      </div>

      {/* Status + kualifikasi */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#d1e7dd] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#0c1f19]">{info.level}</span>
          {owned && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#006d40]"><Icon n="check_circle" className="text-[15px]" />Aktif</span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#004328]">{info.full}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#404942]">{info.qualifyText}</p>
        </div>

        {info.qualify && !owned && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-[#404942]">Progres Kualifikasi</span>
              <span className="font-bold text-[#004328]">{rupiah(spend12mo)} / {rupiah(info.qualify)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#e3e1ec]">
              <div className="h-full rounded-full bg-[#006d40] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#707971]">
              <span>{info.level.split(" • ")[0]}</span>
              <span>{pct}% • Kurang {rupiah(sisa)}</span>
            </div>
          </div>
        )}
        {info.key === "Green" && !isCoach && (
          <div className="flex items-start gap-2.5 rounded-xl bg-[#f4f2fd] p-2.5">
            <Icon n="verified_user" className="mt-0.5 shrink-0 text-[20px] text-[#006d40]" />
            <p className="text-[11px] leading-normal text-[#404942]">Butuh verifikasi lisensi pelatih via tim kurasi Tirtonic untuk mengklaim <strong className="font-semibold text-[#1a1b22]">Green Card</strong>.</p>
          </div>
        )}
      </section>

      {/* Benefit */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[17px] font-bold text-[#1a1b22]">Keuntungan {info.tab}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${owned ? "bg-[#7afbb1] text-[#007444]" : "bg-[#eeedf7] text-[#707971]"}`}>{info.benefits.length} Hak Istimewa</span>
        </div>
        {info.benefits.map((b) => (
          <div key={b.title} className={`flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ${owned ? "" : "opacity-80"}`}>
            <div className="flex items-center gap-3.5 pr-2">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${owned ? "bg-[#7afbb1] text-[#007444]" : "bg-[#e3e1ec] text-[#707971]"}`}>
                <Icon n={owned ? b.icon : "lock"} className="text-[20px]" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[#1a1b22]">{b.title}</div>
                <div className="mt-0.5 text-[13px] text-[#404942]">{b.desc}</div>
              </div>
            </div>
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${owned ? "bg-[#004328] text-white" : "bg-[#eeedf7] text-[#707971]"}`}>
              <Icon n={owned ? "check" : "lock"} className="text-[16px]" />
            </div>
          </div>
        ))}
      </section>

      {/* Benefit dasar */}
      <section className="flex items-start gap-3 rounded-2xl bg-[#d1e7dd]/40 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#004328] text-white">
          <Icon n="verified" className="text-[18px]" />
        </div>
        <p className="text-[13px] leading-normal text-[#1a1b22]">{info.footer}</p>
      </section>

      <p className="px-1 pb-2 text-center text-[11px] text-[#707971]">Saldo kamu: <span className="font-bold text-[#404942]">{balance.toLocaleString("id-ID")} Ace</span> · benefit bersifat informatif, klaim menyusul.</p>
    </div>
  );
}
