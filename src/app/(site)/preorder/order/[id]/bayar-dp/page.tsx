import { redirect } from "next/navigation";
import Link from "next/link";
import { refreshDpLink } from "@/lib/preorder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bayar DP Pre-Order — Tirtonic" };

// Buat link DP DOKU baru (anti-expired) lalu langsung arahkan ke DOKU.
export default async function BayarDpRedirectPage({ params }: { params: { id: string } }) {
  const r = await refreshDpLink(params.id);
  if (r.ok && r.url) redirect(r.url);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-extrabold text-gray-900">Pembayaran belum bisa diproses</h1>
      <p className="mt-3 text-sm text-gray-600">{r.error ?? "Link pembayaran tidak tersedia saat ini. Silakan hubungi admin."}</p>
      <Link href={`/preorder/order/${params.id}`} className="btn-pill mt-6 inline-flex bg-primary px-6 hover:bg-primaryDark">
        Lihat status pesanan
      </Link>
    </div>
  );
}
