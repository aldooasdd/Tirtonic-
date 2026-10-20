import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string; desc: string }> = {
  PENDING_DP: { label: "Menunggu DP", cls: "bg-amber-100 text-amber-700", desc: "Selesaikan pembayaran DP untuk mengunci pesanan pre-order." },
  DP_PAID: { label: "DP Lunas", cls: "bg-emerald-100 text-emerald-700", desc: "DP diterima. Barang sedang disiapkan — info pelunasan dikirim via WhatsApp saat barang ready." },
  WAITING_LUNAS: { label: "Menunggu Pelunasan", cls: "bg-blue-100 text-blue-700", desc: "Barang sudah ready. Link pelunasan sisa pembayaran sudah dikirim ke WhatsApp kamu." },
  LUNAS: { label: "Lunas", cls: "bg-green-100 text-green-700", desc: "Pembayaran lunas. Pesanan segera diproses — kabar barang tiba & pengiriman dikirim via WhatsApp." },
  SHIPPED: { label: "Dikirim", cls: "bg-gray-200 text-gray-700", desc: "Pesanan sudah dikirim / siap diambil. Terima kasih sudah menjadi bagian dari Exclusive Launch!" },
  CANCELLED: { label: "Dibatalkan", cls: "bg-red-100 text-red-600", desc: "Pesanan pre-order ini dibatalkan." },
};

export default async function PreorderOrderPage({ params }: { params: { id: string } }) {
  const o = await safeQuery(() => prisma.preorderOrder.findUnique({ where: { id: params.id } }), null);
  if (!o) notFound();
  const s = STATUS[o.status] ?? STATUS.PENDING_DP;
  const sisa = o.kekurangan ?? Math.max(0, o.total - o.dp);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Invoice Pre-Order</p>
            <p className="text-lg font-extrabold text-gray-900">{o.invoice}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>
        </div>
        <p className="mt-3 text-sm text-gray-600">{s.desc}</p>

        <div className="mt-5 flex gap-3 border-t pt-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-gray-100">
            {o.gambar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={o.gambar} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{o.productNama}{o.varian ? ` (${o.varian})` : ""}</p>
            <p className="text-sm text-gray-500">{o.qty}× {rupiah(o.harga)}</p>
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between text-gray-500"><span>Total harga</span><span>{rupiah(o.total)}</span></div>
          <div className="flex justify-between text-gray-700"><span>DP dibayar</span><span className="font-semibold">{rupiah(o.dp)}</span></div>
          <div className="flex justify-between text-gray-700"><span>Sisa pembayaran</span><span className="font-semibold">{o.status === "LUNAS" || o.status === "SHIPPED" ? "Lunas ✓" : rupiah(sisa)}</span></div>
        </div>

        {o.status === "SHIPPED" && o.resi && (
          <p className="mt-4 rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">Kurir {o.kurir} · Resi: <span className="font-mono font-semibold text-gray-900">{o.resi}</span></p>
        )}

        {o.status === "WAITING_LUNAS" && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            <p>Sisa pembayaran {rupiah(sisa)}{o.batasPelunasan ? ` · batas ${new Date(o.batasPelunasan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : ""}.</p>
            {o.lunasUrl && <a href={o.lunasUrl} className="btn-pill mt-2 w-full bg-primary hover:bg-primaryDark">Lunasi Sekarang</a>}
          </div>
        )}

        <Link href="/preorder" className="btn-pill mt-6 w-full bg-primary hover:bg-primaryDark">Lihat produk pre-order lain</Link>
      </div>
    </div>
  );
}
