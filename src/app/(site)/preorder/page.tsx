import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pre-Order — Tirtonic", description: "Pesan duluan produk tenis pilihan dengan DP, barang menyusul." };

export default async function PreorderCatalog() {
  const products = await safeQuery(
    () => prisma.preorderProduct.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    []
  );

  return (
    <div className="mx-auto max-w-site px-4 py-8 lg:px-6">
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pre-Order
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Pre-Order</h1>
        <p className="mt-1 text-sm text-gray-500">Pesan duluan, bayar DP (min {rupiah(100000)}), barang menyusul. Sisa dilunasi saat barang ready.</p>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-gray-400">Belum ada produk pre-order.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <Link key={p.id} href={`/preorder/${p.id}`} className="group glass-card overflow-hidden rounded-2xl transition hover:shadow-md">
              <div className="relative aspect-square bg-gray-100">
                {p.gambar[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.gambar[0]} alt={p.nama} className="h-full w-full object-cover transition group-hover:scale-105" />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Pre-Order</span>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{p.nama}</h3>
                <p className="mt-1 font-extrabold text-primary">{rupiah(p.harga)}</p>
                {p.estimasi && <p className="mt-0.5 text-xs text-gray-400">{p.estimasi}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
