import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import PreorderCheckout from "@/components/PreorderCheckout";

export const dynamic = "force-dynamic";

export default async function PreorderDetail({ params }: { params: { id: string } }) {
  const p = await safeQuery(() => prisma.preorderProduct.findUnique({ where: { id: params.id } }), null);
  if (!p || !p.isActive) notFound();

  return (
    <div className="mx-auto max-w-site px-4 py-8 lg:px-6">
      <Link href="/preorder" className="text-sm text-gray-500 hover:text-primary">← Semua pre-order</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* Galeri */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border bg-gray-100">
            {p.gambar[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.gambar[0]} alt={p.nama} className="h-full w-full object-cover" />
            )}
          </div>
          {p.gambar.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {p.gambar.slice(1, 5).map((g, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={g} alt="" className="aspect-square w-full rounded-lg border object-cover" />
              ))}
            </div>
          )}
        </div>

        {/* Info + checkout */}
        <div>
          <span className="inline-flex rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Pre-Order</span>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">{p.nama}</h1>
          <p className="mt-1 text-2xl font-extrabold text-primary">{rupiah(p.harga)}</p>
          {p.estimasi && <p className="mt-1 text-sm text-gray-500">Estimasi: {p.estimasi}</p>}
          {p.deskripsi && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600">{p.deskripsi}</p>}

          <div className="mt-6">
            <PreorderCheckout productId={p.id} harga={p.harga} nama={p.nama} />
          </div>
        </div>
      </div>
    </div>
  );
}
