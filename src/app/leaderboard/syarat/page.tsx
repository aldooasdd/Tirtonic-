import type { Metadata } from "next";
import Link from "next/link";
import StringingBottomNav from "@/components/StringingBottomNav";

export const metadata: Metadata = { title: "Syarat & Ketentuan Leaderboard — Tirtonic", robots: { index: false } };

const RULES = [
  "Periode dihitung mulai tanggal 1 hingga hari terakhir setiap bulan.",
  "Hanya stringing dengan status Selesai yang dihitung.",
  "Apabila terdapat skor yang sama, peringkat ditentukan berdasarkan yang lebih dulu mencapai skor tersebut.",
  "Pemenang diumumkan pada tanggal 1 bulan berikutnya melalui halaman Leaderboard dan WhatsApp.",
  "Hadiah dapat diklaim paling lambat 30 hari setelah pengumuman di cabang Tirtonic mana pun.",
  "Hadiah tidak dapat diuangkan atau dipindahtangankan.",
  "Tirtonic berhak membatalkan kemenangan apabila ditemukan kecurangan.",
];

export default function SyaratPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-8 pt-10 text-white">
        <Link href="/leaderboard" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Leaderboard
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight">Syarat &amp; Ketentuan</h1>
      </header>

      <div className="-mt-6 px-4">
        <ol className="glass-card space-y-3 rounded-2xl p-5 text-sm text-gray-700">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 font-bold text-primary">{i + 1}.</span>
              <span className="leading-snug">{r}</span>
            </li>
          ))}
        </ol>
      </div>

      <StringingBottomNav active="leaderboard" />
    </div>
  );
}
