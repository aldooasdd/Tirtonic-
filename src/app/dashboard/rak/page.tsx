import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { productHref } from "@/lib/product-slug";
import { PageHeader, card } from "@/components/dashboard/ui";
import { KATEGORI_RAK, jenisRak } from "@/lib/rail";
import MerchForm from "@/components/MerchForm";
import RailForm from "@/components/RailForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { deleteRail } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rak Landing — Tirtonic" };

export default async function RakPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("hero")) redirect("/dashboard");

  const [products, rail, calon, merch] = await Promise.all([
    safeQuery(() => prisma.product.findMany({ where: { kategori: { in: Object.values(KATEGORI_RAK) } }, orderBy: { nama: "asc" }, select: { id: true, nama: true, gambar: true, kategori: true } }), []),
    safeQuery(() => prisma.racketRail.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }], include: { product: { select: { id: true, nama: true, slug: true, kategori: true, status: true, stok: true, variants: { select: { stok: true } } } } } }), []),
    safeQuery(() => prisma.product.findMany({ where: { kategori: { notIn: [KATEGORI_RAK.raket, KATEGORI_RAK.sepatu] }, status: "READY" }, orderBy: { nama: "asc" }, select: { id: true, nama: true, gambar: true, kategori: true, stok: true, variants: { select: { stok: true } } } }), []),
    safeQuery(() => prisma.merchandise.findMany({ select: { productId: true } }), []),
  ]);
  const bonus = new Set(merch.map((m) => m.productId));
  const used = new Set(rail.map((r) => r.productId));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Rak Landing" desc="Pilih raket, sepatu, atau tas, upload fotonya, pilih barangnya, lalu tampil di rak landing. Nama dan harga ikut data produk, urutan diacak otomatis." />
      <section className={`${card} p-5`}>
        <RailForm items={products.map((p) => ({ id: p.id, nama: p.nama, foto: p.gambar[0] ?? null, jenis: jenisRak(p.kategori), dipakai: used.has(p.id) }))} />
      </section>
      <section className={`${card} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#0F1F1A]">Di rak ({rail.length})</h2>
          <a href="/#rak-raket" target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Lihat rak ↗</a>
        </div>
        {rail.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada barang. Rak tidak tampil di landing.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {rail.map((r) => {
              const p = r.product;
              const habis = p.status === "SOLD" || (p.variants.length ? p.variants.every((v) => v.stok <= 0) : p.stok != null && p.stok <= 0);
              return (
                <div key={r.id} className="rounded-xl border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={r.foto} alt="" className="mb-2 h-40 w-full object-contain" />
                  <a href={productHref(p)} target="_blank" rel="noreferrer" className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold text-gray-900 hover:text-primary">{p.nama}</a>
                  <p className={`mt-1 text-[11px] ${habis ? "text-red-600" : "text-green-700"}`}>{habis ? "Stok habis, tidak tampil" : "Tampil"} · {{ raket: "Raket", sepatu: "Sepatu", tas: "Tas" }[jenisRak(p.kategori)]}</p>
                  <div className="mt-2 flex items-center gap-1">
                    <form action={deleteRail.bind(null, r.id)} className="ml-auto"><ConfirmSubmit message={`Turunkan ${p.nama} dari rak? Produknya tidak dihapus.`} className="text-xs font-semibold text-red-600">Hapus</ConfirmSubmit></form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className={`${card} p-5`}>
        <h2 className="text-[15px] font-semibold text-[#0F1F1A]">Bonus merchandise</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">Pembeli produk rak memilih 1 barang ini gratis untuk setiap produk yang dibeli.</p>
        <MerchForm items={calon.map((p) => ({ id: p.id, nama: p.nama, foto: p.gambar[0] ?? null, kategori: p.kategori, stok: p.variants.length ? p.variants.reduce((n, v) => n + Math.max(0, v.stok), 0) : p.stok, dipakai: bonus.has(p.id) }))} />
      </section>
    </div>
  );
}
