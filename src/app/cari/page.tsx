import type { Metadata } from "next";
import PhoneSearchForm from "@/components/PhoneSearchForm";
import StringingBottomNav from "@/components/StringingBottomNav";

export const metadata: Metadata = { title: "Cari Riwayat Stringing — Tirtonic", robots: { index: false } };

export default function CariPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-10 pt-10 text-white">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Tirtonic" className="h-11 w-11 object-contain" />
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Tirtonic Stringing Room</span>
        </div>
        <div className="mt-7">
          <h1 className="text-2xl font-extrabold leading-tight">Cari riwayat</h1>
          <p className="mt-1.5 text-sm text-white/80">Masukkan nomor WhatsApp untuk lihat riwayat stringing.</p>
        </div>
      </header>

      <div className="-mt-6 px-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Nomor WhatsApp</label>
          <PhoneSearchForm />
        </div>
      </div>

      <StringingBottomNav active="search" />
    </div>
  );
}
