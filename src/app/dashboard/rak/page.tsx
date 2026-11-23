import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { productHref } from "@/lib/product-slug";
import { PageHeader, card } from "@/components/dashboard/ui";
import RailForm from "@/components/RailForm";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { deleteRail, moveRail } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rak Raket — Tirtonic" };

export default async function RakPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("hero")) redirect("/dashboard");

  const [products, rail] = await Promise.all([
    safeQuery(() => prisma.product.findMany({ where: { kategori: "Raket Tenis" }, orderBy: { nama: "asc" }, select: { id: true, nama: true, gambar: true } }), []),
    safeQuery(() => prisma.racketRail.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }], include: { product: { select: { id: true, nama: true, slug: true, status: true, stok: true, variants: { select: { stok: true } } } } } }), []),
  ]);
  const used = new Set(rail.map((r) => r.productId));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Rak Raket" desc="Upload foto raket, pilih barangnya, lalu raket tergantung di rak. Nama dan harga ikut data produk." />
      <section className={`${card} p-5`}>
        <RailForm items={products.map((p) => ({ id: p.id, nama: p.nama, foto: p.gambar[0] ?? null, dipakai: used.has(p.id) }))} />
      </section>
      <section className={`${card} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#0F1F1A]">Di rak ({rail.length})</h2>
          <a href="/skate-test" target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Lihat rak ↗</a>
        </div>
        {rail.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada raket. Rak masih menampilkan contoh.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {rail.map((r, i) => {
              const p = r.product;
              const habis = p.status === "SOLD" || (p.variants.length ? p.variants.every((v) => v.stok <= 0) : p.stok != null && p.stok <= 0);
              return (
                <div key={r.id} className="rounded-xl border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={r.foto} alt="" className="mb-2 h-40 w-full object-contain" />
                  <a href={productHref(p)} target="_blank" rel="noreferrer" className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold text-gray-900 hover:text-primary">{p.nama}</a>
                  <p className={`mt-1 text-[11px] ${habis ? "text-red-600" : "text-green-700"}`}>{habis ? "Stok habis, tidak tampil" : "Tampil"}</p>
                  <div className="mt-2 flex items-center gap-1">
                    <form action={moveRail.bind(null, r.id, -1)}><button disabled={i === 0} aria-label="Geser ke kiri" className="h-8 w-8 rounded-full border text-sm disabled:opacity-30">‹</button></form>
                    <form action={moveRail.bind(null, r.id, 1)}><button disabled={i === rail.length - 1} aria-label="Geser ke kanan" className="h-8 w-8 rounded-full border text-sm disabled:opacity-30">›</button></form>
                    <form action={deleteRail.bind(null, r.id)} className="ml-auto"><ConfirmSubmit message={`Turunkan ${p.nama} dari rak? Produknya tidak dihapus.`} className="text-xs font-semibold text-red-600">Hapus</ConfirmSubmit></form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
