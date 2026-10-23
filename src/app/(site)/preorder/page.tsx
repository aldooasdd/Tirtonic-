import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Exclusive Launch — Tirtonic", description: "Pesan duluan produk tenis pilihan dengan DP, barang menyusul." };

export default async function PreorderCatalog() {
  const products = await safeQuery(
    () => prisma.preorderProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: { where: { status: { in: ["DP_PAID", "WAITING_LUNAS", "LUNAS", "SHIPPED"] } } } } } },
    }),
    []
  );

  const daysLeft = (d: Date | null) =>
    d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="mx-auto max-w-site px-4 py-8 lg:px-6">
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Exclusive Launch
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Exclusive Launch</h1>
        <p className="mt-1 text-sm text-gray-500">Pesan duluan, bayar DP (min {rupiah(100000)}), barang menyusul. Sisa dilunasi saat barang ready.</p>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-gray-400">Belum ada produk pre-order.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <Link key={p.id} href={`/preorder/${p.id}`} className="group glass-card overflow-hidden rounded-2xl transition hover:shadow-md">
              <div className="relative aspect-square bg-gray-100">
                {p.gambar[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={p.gambar[0]} alt={p.nama} className="h-full w-full object-cover transition group-hover:scale-105" />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Exclusive Launch</span>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{p.nama}</h3>
                <p className="mt-1 font-extrabold text-primary">{rupiah(p.harga)}</p>
                {p.estimasi && <p className="mt-0.5 text-xs text-gray-400">{p.estimasi}</p>}
                {(() => { const d = daysLeft(p.launchAt); return d !== null && d > 0 ? (
                  <p className="mt-1.5 text-xs font-semibold text-gray-700">Tiba dalam {d} hari</p>
                ) : null; })()}
                {p.kuota !== null && (() => { const sisa = Math.max(0, p.kuota - p._count.orders); return (
                  <p className="mt-0.5 text-xs font-medium text-amber-600">Kuota terbatas · Sisa {sisa} unit</p>
                ); })()}
                <span className="mt-2.5 block rounded-xl bg-primary px-3 py-2 text-center text-sm font-bold text-white transition group-hover:bg-primaryDark">Reserve Now</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
