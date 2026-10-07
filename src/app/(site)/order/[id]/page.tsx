import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah, waLink } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string; desc: string }> = {
  PENDING: { label: "Menunggu Pembayaran", cls: "bg-amber-100 text-amber-700", desc: "Selesaikan pembayaran untuk memproses pesanan." },
  PAID: { label: "Lunas — Diproses", cls: "bg-emerald-100 text-emerald-700", desc: "Pembayaran diterima. Pesanan sedang disiapkan." },
  SHIPPED: { label: "Dikirim", cls: "bg-blue-100 text-blue-700", desc: "Pesanan sudah dikirim. Lacak resi di situs kurir." },
  CANCELLED: { label: "Dibatalkan", cls: "bg-red-100 text-red-700", desc: "Pesanan ini dibatalkan." },
};

export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await safeQuery(
    () => prisma.order.findUnique({ where: { id: params.id }, include: { items: true } }),
    null
  );
  if (!order) notFound();

  const s = STATUS[order.status] ?? STATUS.PENDING;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Invoice</p>
            <p className="text-lg font-extrabold text-gray-900">{order.invoice}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
        </div>
        <p className="mt-3 text-sm text-gray-600">{s.desc}</p>

        {order.status === "SHIPPED" && order.resi && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
            <p className="text-gray-600">Kurir: <span className="font-semibold text-gray-900">{order.kurir}</span></p>
            <p className="text-gray-600">No. Resi: <span className="font-mono font-bold text-gray-900">{order.resi}</span></p>
            <p className="mt-1 text-xs text-gray-500">Lacak nomor resi di situs/aplikasi kurir terkait.</p>
          </div>
        )}

        {order.status === "PENDING" && (
          <a href={waLink(`Halo Admin Tirtonic, saya mau konfirmasi pembayaran pesanan ${order.invoice}.`)} target="_blank" rel="noreferrer" className="btn-pill mt-4 w-full bg-primary hover:bg-primaryDark">
            Konfirmasi Pembayaran via WhatsApp
          </a>
        )}

        {/* items */}
        <div className="mt-6 border-t pt-4">
          <h2 className="mb-3 font-bold text-gray-900">Item</h2>
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 text-sm">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded border bg-gray-100">
                  {i.gambar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.gambar} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium text-gray-800">{i.nama}</p>
                  {i.varian && <p className="text-xs text-gray-500">{i.varian}</p>}
                  <p className="text-xs text-gray-500">{i.qty} × {rupiah(i.harga)}</p>
                </div>
                <span className="shrink-0 font-semibold text-gray-900">{rupiah(i.harga * i.qty)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* totals */}
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
          {order.diskon > 0 && <div className="flex justify-between font-semibold text-primary"><span>Potongan kupon{order.kupon ? ` (${order.kupon})` : ""}</span><span>−{rupiah(order.diskon)}</span></div>}
          <div className="flex justify-between text-gray-600"><span>Ongkir ({order.kurir})</span><span>{order.ongkir === 0 ? "Gratis" : rupiah(order.ongkir)}</span></div>
          <div className="flex justify-between pt-1 text-base font-extrabold text-gray-900"><span>Total</span><span>{rupiah(order.total)}</span></div>
        </div>

        {/* shipping address */}
        <div className="mt-6 border-t pt-4 text-sm text-gray-600">
          <h2 className="mb-2 font-bold text-gray-900">Dikirim ke</h2>
          <p className="font-medium text-gray-800">{order.nama} · {order.telepon}</p>
          <p>{order.alamat}</p>
          <p>{order.kota}, {order.provinsi} {order.kodePos}</p>
        </div>
      </div>

      <Link href="/shop" className="mt-4 block text-center text-sm text-gray-500 hover:text-primary">Lanjut belanja</Link>
    </div>
  );
}
