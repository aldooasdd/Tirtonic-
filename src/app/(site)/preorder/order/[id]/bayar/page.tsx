import { redirect } from "next/navigation";
import Link from "next/link";
import { refreshPelunasanLink } from "@/lib/preorder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pelunasan Pre-Order — Tirtonic" };

// Laman pelunasan: buat link DOKU baru (nominal sisa) lalu langsung arahkan ke DOKU.
export default async function PelunasanRedirectPage({ params }: { params: { id: string } }) {
  const r = await refreshPelunasanLink(params.id);
  if (r.ok && r.url) redirect(r.url); // langsung ke halaman bayar DOKU

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-extrabold text-gray-900">Pelunasan belum bisa diproses</h1>
      <p className="mt-3 text-sm text-gray-600">
        {r.error ?? "Link pembayaran tidak tersedia saat ini. Silakan hubungi admin untuk cara pelunasan."}
      </p>
      <Link href={`/preorder/order/${params.id}`} className="btn-pill mt-6 inline-flex bg-primary px-6 hover:bg-primaryDark">
        Lihat status pesanan
      </Link>
    </div>
  );
}
