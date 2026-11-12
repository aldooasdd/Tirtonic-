import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import EventManager from "@/components/EventManager";
import { PageHeader } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo / Diskon — Tirtonic" };

export default async function PromoPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("produk")) redirect("/dashboard");

  const products = await safeQuery(
    () => prisma.product.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, harga: true, hargaDiskon: true, gambar: true, kategori: true, brand: true, eventAktif: true, eventCarousel: true, diskonPersen: true, eventNama: true },
    }),
    []
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Promo / Diskon" desc="Pilih barang yang ikut promo, set potongan (%), opsional tampilkan di carousel landing. Potongan langsung berlaku di shop & checkout." />
      <EventManager products={products} />
    </div>
  );
}
