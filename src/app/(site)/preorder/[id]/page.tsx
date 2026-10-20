import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PreorderDetail({ params }: { params: { id: string } }) {
  const p = await safeQuery(() => prisma.preorderProduct.findUnique({ where: { id: params.id }, select: { id: true, nama: true, harga: true, gambar: true, deskripsi: true, estimasi: true, isiBox: true, lunasBenefits: true, isActive: true } }), null);
  if (!p || !p.isActive) notFound();

  const DP_MIN = 100_000;
  const dpBenefits = ["Slot reservasi aman", "Sisa dibayar setelah produk tiba"];
  const lunasBenefits = p.lunasBenefits.length ? p.lunasBenefits : ["Slot reservasi aman", "Tanpa sisa tagihan", "Prioritas pengiriman", "Gratis pasang senar", "Gratis overgrip & dampener"];

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

      {/* Pilihan pembayaran: Bayar DP vs Bayar Lunas */}
      <div className="mt-10 border-t pt-8">
        <h2 className="mb-5 text-xl font-extrabold text-gray-900">Payment Method</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <PayCard
            href={`/preorder/${p.id}/checkout`}
            title="Down Payment"
            priceTop={`Mulai dari ${rupiah(DP_MIN)}`}
            priceSub="atau 30% dari harga"
            btnText="Reserve Now"
            benefits={dpBenefits}
          />
          <PayCard
            href={`/preorder/${p.id}/checkout?lunas=1`}
            title="Bayar Lunas"
            priceTop={rupiah(p.harga)}
            priceSub="harga penuh, sekali bayar"
            btnText="Reserve Now"
            benefits={lunasBenefits}
          />
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">Pembayaran aman via DOKU. Langsung checkout, tanpa keranjang.</p>
      </div>
    </div>
  );
}

// Kartu pilihan bayar: liquid glass, header hijau tua glass + daftar benefit.
function PayCard({ href, title, priceTop, priceSub, btnText, benefits }: {
  href: string; title: string; priceTop: string; priceSub: string; btnText: string; benefits: string[];
}) {
  return (
    <div className="rounded-3xl border border-white/50 bg-white/40 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
      <div className="rounded-2xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur-md">
        <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-3 text-3xl font-extrabold leading-none text-gray-900">{priceTop}</p>
        <p className="mt-1 text-xs text-gray-400">{priceSub}</p>
        <Link href={href} className="glass-primary mt-4 block rounded-full py-2.5 text-center text-sm font-bold text-white transition hover:brightness-110">
          {btnText}
        </Link>
      </div>
      <ul className="space-y-2 px-2 py-4 text-sm text-gray-700">
        {benefits.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">✓</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
