"use client";

import { useState } from "react";

// Halaman "Manfaat Tier" — dibuka saat kartu Ace diklik. Tab per tier + kartu preview + benefit.
// Benefit = teks informatif (belum fungsional). Angka tier ikut config live (Signature 30jt, Privé 100jt).

type Props = {
  tier: string; // tier user sekarang: White | Signature | Prive | Green
  spend12mo: number;
  balance: number;
  isCoach: boolean;
  coachCode: string | null;
};

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

type Benefit = { title: string; desc: string };
type TierInfo = {
  key: string;
  tab: string;
  pass: string;
  full: string;
  level: string;
  qualifyText: string;
  qualify: number | null; // rupiah; null = tak berbasis belanja (White/Green)
  benefits: Benefit[];
  footer: string;
  bg: string;
  dark: boolean;
};

const CARD: Record<string, { bg: string; dark: boolean }> = {
  White: { bg: "linear-gradient(135deg,#cbd5e1 0%,#94a3b8 55%,#e2e8f0 100%)", dark: false },
  Green: { bg: "linear-gradient(135deg,#004328 0%,#005a36 45%,#006D40 100%)", dark: true },
  Signature: { bg: "linear-gradient(135deg,#a67c00 0%,#7a5a0f 55%,#caa53d 100%)", dark: true },
  Prive: { bg: "linear-gradient(135deg,#18181b 0%,#000000 60%,#27272a 100%)", dark: true },
};

const TIERS: TierInfo[] = [
  {
    key: "White", tab: "White", pass: "WHITE PASS", full: "Tirtonic White", level: "Level 1 • Entry Level",
    qualifyText: "Kartu dasar untuk seluruh customer. Terbuka otomatis saat pendaftaran nomor WhatsApp.",
    qualify: null, ...CARD.White,
    benefits: [
      { title: "Poin Belanja Ekstra", desc: "Nilai Kembali 1% (Rp100.000 = 1 Poin Ace · 1 poin = Rp1.000)." },
      { title: "Voucher Ulang Tahun", desc: "Voucher diskon khusus di bulan hari ulang tahun member." },
    ],
    footer: "Standard Member — riwayat stringing digital, garansi raket resmi, akses matchmaking komunitas Tirtonic Ace.",
  },
  {
    key: "Green", tab: "Green", pass: "GREEN PASS", full: "Tirtonic Green", level: "Khusus Pelatih • Coach Level",
    qualifyText: "Kartu khusus pelatih tenis. Verifikasi sertifikasi / profil pelatih via tim kurasi Tirtonic.",
    qualify: null, ...CARD.Green,
    benefits: [
      { title: "Poin Belanja Ekstra & Murid", desc: "Nilai Kembali 2% (Rp50.000 = 1 Ace) + 2% dari belanja murid referral otomatis ke saldo pelatih." },
      { title: "Kode Referral Khusus Murid", desc: "Bagikan kode: diskon senar murid + poin pasif setiap mereka checkout." },
      { title: "Voucher Ulang Tahun & Merchandise", desc: "Voucher ulang tahun senilai Rp150.000 + paket merchandise pelatih eksklusif." },
      { title: "Akses Event & Tennis Demo Day", desc: "Tiket VIP demo clinic raket terbaru + alokasi raket uji coba untuk sesi latih tanding murid." },
    ],
    footer: "Benefit Dasar Semua Member — akses histori stringing & notifikasi jadwal turnamen komunitas Tirtonic.",
  },
  {
    key: "Signature", tab: "Signature", pass: "SIGNATURE", full: "Tirtonic Signature", level: "Level 3 • Eksklusif",
    qualifyText: "Belanja Rp30.000.000 dalam 12 bulan atau kumpulkan 30.000 Tirtonic Ace Points untuk membuka Signature Tier.",
    qualify: 30_000_000, ...CARD.Signature,
    benefits: [
      { title: "Poin Belanja Ekstra", desc: "Nilai Kembali ±1,5% (Rp65.000 = 1 Poin Tirtonic Ace)." },
      { title: "Gratis Jasa Stringing", desc: "Gratis 2× pasang senar per tahun di semua outlet Tirtonic." },
      { title: "Layanan Prioritas", desc: "Fast-track service & antrean khusus pelayanan via WhatsApp VIP." },
      { title: "Voucher Ulang Tahun & Hadiah", desc: "Voucher ulang tahun eksklusif Tirtonic senilai Rp250.000." },
      { title: "Akses Rilis Koleksi Awal", desc: "Early access 48 jam untuk peluncuran raket & apparel terbatas." },
    ],
    footer: "Benefit Dasar Semua Member — Tirtonic Ace Points setiap transaksi belanja & stringing di toko maupun online.",
  },
  {
    key: "Prive", tab: "Privé", pass: "BLACK CARD PASS", full: "Tirtonic Privé", level: "Tingkat Tertinggi • Ultra-Exclusive",
    qualifyText: "Belanja Rp100.000.000/tahun — atau bergabung otomatis melalui undangan eksklusif direksi (By Invitation Only).",
    qualify: 100_000_000, ...CARD.Prive,
    benefits: [
      { title: "Poin Belanja Tertinggi 2,5%", desc: "Nilai Kembali 2,5% (Rp40.000 = 1 Poin Tirtonic Ace)." },
      { title: "Gratis 6× Jasa Stringing / Tahun", desc: "Bebas pasang senar 6× per tahun — bebas pilih mesin & Master Stringer." },
      { title: "Personal Shopper & Concierge 24/7", desc: "Asisten pribadi untuk pemesanan raket impor, booking antrean darurat, konsultasi alat." },
      { title: "First Priority Drop (72 Jam Awal)", desc: "Akses 72 jam sebelum rilis edisi terbatas & kolaborasi desainer ke publik." },
      { title: "Hadiah Ulang Tahun Mewah", desc: "Paket kado premium tahunan senilai Rp1.000.000+ dikurasi tim eksekutif." },
      { title: "Express 30-Menit Restring Kilat", desc: "Garansi senar instan dalam 30 menit saat turnamen tanpa biaya surcharge." },
    ],
    footer: "Termasuk seluruh benefit dasar — poin tak kedaluwarsa selama aktif, gratis konsultasi tensi, welcome voucher.",
  },
];

const RANK: Record<string, number> = { White: 0, Signature: 1, Prive: 2 };

export default function TierBenefits({ tier, spend12mo, balance, isCoach, coachCode }: Props) {
  const [sel, setSel] = useState(TIERS.some((t) => t.key === tier) ? tier : "White");
  const info = TIERS.find((t) => t.key === sel) ?? TIERS[0];
  const d = info.dark;

  // Apakah user sudah punya tier ini (benefit aktif vs terkunci).
  const userRank = RANK[tier] ?? 0;
  const owned =
    info.key === "White" ? true : info.key === "Green" ? isCoach : userRank >= (RANK[info.key] ?? 99);

  // Progress kualifikasi: White entry, Green by verifikasi, lainnya belanja/qualify.
  const pct = info.qualify ? Math.max(0, Math.min(100, Math.round((spend12mo / info.qualify) * 100))) : 100;
  const sisa = info.qualify ? Math.max(0, info.qualify - spend12mo) : 0;

  const ink = d ? "text-white" : "text-slate-900";
  const inkSub = d ? "text-white/70" : "text-slate-600";
  const inkFaint = d ? "text-white/55" : "text-slate-500";

  return (
    <div className="space-y-4">
      {/* Tab tier */}
      <div className="flex gap-1.5 rounded-full bg-slate-100 p-1">
        {TIERS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSel(t.key)}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition ${sel === t.key ? "bg-white text-emerald-900 shadow-sm" : "text-slate-500"}`}
          >
            {t.tab}
            {t.key === tier && <span className="ml-1 text-emerald-500">•</span>}
          </button>
        ))}
      </div>

      {/* Kartu preview */}
      <div className="relative overflow-hidden rounded-3xl border p-5 shadow-[0_24px_48px_-12px_rgba(13,92,58,0.4)]" style={{ background: info.bg }}>
        <div className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-2xl ${d ? "bg-white/10" : "bg-white/40"}`} />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className={`block text-[10px] font-bold uppercase tracking-widest ${inkFaint}`}>Tirtonic Ace</span>
            <span className={`text-xl font-extrabold tracking-tight ${ink}`}>{info.pass}</span>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${owned ? (d ? "bg-white/20 text-white" : "bg-emerald-600 text-white") : "bg-black/30 text-white/80"}`}>
            {owned ? "ACTIVE" : info.key === "Prive" ? "BY INVITATION" : "LOCKED"}
          </span>
        </div>
        <div className="relative z-10 mt-8 flex items-end justify-between">
          <span className={`text-sm font-semibold ${ink}`}>{info.full}</span>
          <span className={`text-[11px] ${inkSub}`}>VALID THRU 10/27</span>
        </div>
        {info.key === "Green" && coachCode && (
          <div className={`relative z-10 mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${d ? "bg-black/25 text-white" : "bg-white/50 text-slate-800"}`}>
            <span className={inkFaint}>Kode Referral:</span>
            <span className="font-mono font-bold">{coachCode}</span>
          </div>
        )}
      </div>

      {/* Status + progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{info.level}</span>
          {owned && <span className="text-[11px] font-semibold text-emerald-600">✓ Aktif</span>}
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">{info.full}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{info.qualifyText}</p>

        {info.qualify && !owned && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium">Progres Kualifikasi</span>
              <span className="font-mono font-bold text-emerald-700">{rupiah(spend12mo)} / {rupiah(info.qualify)} ({pct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">Sisa {rupiah(sisa)} lagi untuk membuka tier ini.</p>
          </div>
        )}
        {info.key === "Green" && !isCoach && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Butuh verifikasi pelatih via tim kurasi Tirtonic untuk membuka Green Card.</p>
        )}
      </div>

      {/* Daftar benefit */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-extrabold text-slate-900">Keuntungan {info.tab}</h3>
          <span className="text-xs font-semibold text-emerald-700">{info.benefits.length} Hak Istimewa</span>
        </div>
        {info.benefits.map((b) => (
          <div key={b.title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">{b.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{b.desc}</p>
            </div>
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${owned ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>
              {owned ? "✓" : "🔒"}
            </span>
          </div>
        ))}
      </div>

      {/* Footer benefit dasar */}
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm leading-relaxed text-slate-600">{info.footer}</p>
      </div>

      <p className="px-1 pb-2 text-center text-[11px] text-slate-400">Saldo kamu: <span className="font-bold text-slate-600">{balance.toLocaleString("id-ID")} Ace</span> · Benefit bersifat informatif, klaim menyusul.</p>
    </div>
  );
}
