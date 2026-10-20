import { redirect } from "next/navigation";
import Link from "next/link";
import { normalizePhone } from "@/lib/string-finder/phone";

export const metadata = { title: "Pesanan Saya — Tirtonic" };

// Cek pesanan tanpa login: cukup nomor HP yang dipakai saat checkout.
async function cek(fd: FormData) {
  "use server";
  const phone = normalizePhone(String(fd.get("telepon") || ""));
  if (!phone) redirect("/pesanan-saya?e=1");
  redirect(`/pesanan-saya/${phone}`);
}

export default function CekPesananPage({ searchParams }: { searchParams: { e?: string } }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white px-5 text-gray-900">
      {/* Blob warna di belakang — supaya efek liquid glass kebaca */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-40 h-96 w-96 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute right-0 top-[55%] h-96 w-96 rounded-full bg-emerald-300/30 blur-[130px]" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-teal-200/30 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="glass-card rounded-3xl p-7 sm:p-8">
          <Link href="/" className="flex items-center justify-center gap-2.5 transition hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src="/logo.png" alt="Tirtonic" className="h-11 w-11 object-contain" />
          </Link>
          <h1 className="mt-4 text-center text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">Cek Pesanan Saya</h1>
          <p className="mt-1.5 text-center text-sm text-gray-500">Masukkan nomor WhatsApp yang kamu pakai saat belanja.</p>

          <form action={cek} className="mt-6 space-y-3">
            <input
              name="telepon"
              type="tel"
              inputMode="numeric"
              required
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-xl border border-gray-300 bg-white/70 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            {searchParams.e && <p className="text-xs text-red-600">Nomor tidak valid. Coba lagi.</p>}
            <button type="submit" className="glass-primary w-full rounded-xl px-4 py-3 text-sm font-bold transition">
              Lihat Pesanan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
