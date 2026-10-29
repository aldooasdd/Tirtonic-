import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import EventManager from "@/components/EventManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo / Diskon — Tirtonic" };

export default async function PromoPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("produk")) redirect("/dashboard");

  const products = await safeQuery(
    () => prisma.product.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, harga: true, hargaDiskon: true, gambar: true, kategori: true, brand: true, eventAktif: true, eventCarousel: true, diskonPersen: true },
    }),
    []
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
      <h1 className="mb-1 mt-2 text-2xl font-extrabold text-primary">Promo / Diskon</h1>
      <p className="mb-6 text-sm text-gray-500">Pilih barang yang ikut promo, set potongan (%), opsional tampilkan di carousel landing. Potongan langsung berlaku di shop & checkout.</p>
      <EventManager products={products} />
    </div>
  );
}
