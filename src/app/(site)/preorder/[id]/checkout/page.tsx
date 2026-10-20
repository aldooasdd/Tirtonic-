import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import PreorderCheckout from "@/components/PreorderCheckout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout Pre-Order — Tirtonic" };

export default async function PreorderCheckoutPage({ params, searchParams }: { params: { id: string }; searchParams: { lunas?: string; dp?: string } }) {
  const defaultFull = searchParams.lunas === "1";
  const initialDp = Number(searchParams.dp) > 0 ? Math.floor(Number(searchParams.dp)) : undefined;
  const p = await safeQuery(
    () => prisma.preorderProduct.findUnique({ where: { id: params.id }, include: { variants: { orderBy: { urutan: "asc" } } } }),
    null
  );
  if (!p || !p.isActive) notFound();
  const variantData = p.variants.map((v) => ({ id: v.id, nama: v.ukuran ? `${v.warna} / ${v.ukuran}` : v.warna, harga: v.harga, stok: v.stok }));
  const dpBenefits = ["Slot reservasi aman", "Sisa dibayar setelah produk tiba"];
  const lunasBenefits = p.lunasBenefits.length ? p.lunasBenefits : ["Slot reservasi aman", "Tanpa sisa tagihan", "Prioritas pengiriman", "Gratis pasang senar", "Gratis overgrip & dampener"];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-6">
      <Link href={`/preorder/${p.id}`} className="text-sm text-gray-500 hover:text-primary">← Kembali ke produk</Link>
      <h1 className="mt-3 text-2xl font-extrabold text-gray-900">Checkout Exclusive Launch</h1>

      {/* Ringkasan produk */}
      <div className="mt-4 flex gap-3 rounded-2xl border bg-white p-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-gray-100">
          {p.gambar[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={p.gambar[0]} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{p.nama}</p>
          <p className="text-primary font-bold">{rupiah(p.harga)}</p>
          {p.estimasi && <p className="text-xs text-gray-400">{p.estimasi}</p>}
        </div>
      </div>

      <div className="mt-5">
        <PreorderCheckout
          productId={p.id}
          harga={p.harga}
          nama={p.nama}
          variants={variantData}
          defaultFull={defaultFull}
          initialDp={initialDp}
          minDp={p.dpMin}
          dpBenefits={dpBenefits}
          lunasBenefits={lunasBenefits}
        />
      </div>
    </div>
  );
}
