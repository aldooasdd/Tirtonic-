import { notFound } from "next/navigation";
import Link from "next/link";
import PreorderGallery from "@/components/PreorderGallery";
import ReserveModal from "@/components/ReserveModal";
import ClampText from "@/components/ClampText";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PreorderDetail({ params }: { params: { id: string } }) {
  const p = await safeQuery(() => prisma.preorderProduct.findUnique({ where: { id: params.id }, select: { id: true, nama: true, harga: true, gambar: true, deskripsi: true, estimasi: true, isiBox: true, lunasBenefits: true, dpMin: true, varianLabel: true, isActive: true, variants: { orderBy: { urutan: "asc" }, select: { id: true, warna: true, ukuran: true, harga: true, stok: true } } } }), null);
  if (!p || !p.isActive) notFound();

  const dpBenefits = ["Slot reservasi aman", "Sisa dibayar setelah produk tiba"];
  const lunasBenefits = p.lunasBenefits.length ? p.lunasBenefits : ["Slot reservasi aman", "Tanpa sisa tagihan", "Prioritas pengiriman", "Gratis pasang senar", "Gratis overgrip & dampener"];
  const variantData = p.variants.map((v) => ({ id: v.id, nama: v.ukuran ? `${v.warna} / ${v.ukuran}` : v.warna, harga: v.harga, stok: v.stok }));

  return (
    <div className="mx-auto max-w-site px-4 py-8 lg:px-6">
      <Link href="/preorder" className="text-sm text-gray-500 hover:text-primary">← Semua pre-order</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* Galeri (slide) */}
        <PreorderGallery images={p.gambar} alt={p.nama} />

        {/* Info + checkout */}
        <div>
          <span className="glass-primary inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Tirtonic Exclusive Launch</span>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">{p.nama}</h1>
          <p className="mt-1 text-2xl font-extrabold text-primary">{rupiah(p.harga)}</p>
          {p.estimasi && <p className="mt-1 text-sm text-gray-500">Estimasi: {p.estimasi}</p>}
          {p.deskripsi && <ClampText text={p.deskripsi} />}

          <ReserveModal productId={p.id} harga={p.harga} minDp={p.dpMin} variants={variantData} varianLabel={p.varianLabel} dpBenefits={dpBenefits} lunasBenefits={lunasBenefits} />
        </div>
      </div>

      {p.isiBox.length > 0 && (
        <div className="mt-10 border-t pt-8">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <h2 className="text-xl font-extrabold text-gray-900">What&apos;s in the Box</h2>
            <ul className="space-y-2 text-gray-700">
              {p.isiBox.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Syarat metode pembayaran */}
      <div className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-xl font-extrabold text-gray-900">Payment Method Terms</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600">
          <li>Down Payment mulai dari Rp100.000 untuk mengamankan slot reservasi.</li>
          <li>Pelunasan dilakukan paling lambat 7 hari setelah kami menginformasikan produk tiba.</li>
          <li>Apabila pelunasan tidak dilakukan hingga batas waktu, reservasi dibatalkan dan Down Payment tidak dapat dikembalikan.</li>
          <li>Benefit bayar lunas tidak berlaku untuk pembayaran Down Payment.</li>
          <li>Estimasi kedatangan dapat berubah mengikuti jadwal dari brand; perubahan akan kami informasikan melalui WhatsApp.</li>
        </ul>
      </div>

    </div>
  );
}
