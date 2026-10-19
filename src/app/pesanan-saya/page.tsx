import { redirect } from "next/navigation";
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Tirtonic" className="mx-auto h-12 w-12 object-contain" />
        <h1 className="mt-4 text-center text-xl font-extrabold text-gray-900">Cek Pesanan Saya</h1>
        <p className="mt-1 text-center text-sm text-gray-500">Masukkan nomor WhatsApp yang kamu pakai saat belanja.</p>
        <form action={cek} className="mt-5 space-y-3">
          <input
            name="telepon"
            type="tel"
            inputMode="numeric"
            required
            placeholder="08xxxxxxxxxx"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {searchParams.e && <p className="text-xs text-red-600">Nomor tidak valid. Coba lagi.</p>}
          <button type="submit" className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primaryDark">
            Lihat Pesanan
          </button>
        </form>
      </div>
    </div>
  );
}
