import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PreorderDetail({ params }: { params: { id: string } }) {
  const p = await safeQuery(() => prisma.preorderProduct.findUnique({ where: { id: params.id }, select: { id: true, nama: true, harga: true, gambar: true, deskripsi: true, estimasi: true, isiBox: true, lunasBenefits: true, isActive: true } }), null);
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
              <img loading="lazy" decoding="async" src={p.gambar[0]} alt={p.nama} className="h-full w-full object-cover" />
            )}
          </div>
          {p.gambar.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {p.gambar.slice(1, 5).map((g, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" key={i} src={g} alt="" className="aspect-square w-full rounded-lg border object-cover" />
              ))}
            </div>
          )}
        </div>

        {/* Info + checkout */}
        <div>
          <span className="glass-primary inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Tirtonic Exclusive Launch</span>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">{p.nama}</h1>
          <p className="mt-1 text-2xl font-extrabold text-primary">{rupiah(p.harga)}</p>
          {p.estimasi && <p className="mt-1 text-sm text-gray-500">Estimasi: {p.estimasi}</p>}
          {p.deskripsi && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600">{p.deskripsi}</p>}

          <Link href={`/preorder/${p.id}/checkout`} className="glass-primary mt-6 block rounded-full py-3 text-center text-sm font-bold text-white transition hover:brightness-110">
            Reserve Now
          </Link>
          <p className="mt-2 text-center text-xs text-gray-400">Pembayaran aman via DOKU. Langsung checkout, tanpa keranjang.</p>
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
