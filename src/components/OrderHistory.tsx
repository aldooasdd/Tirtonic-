import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import CustomerTracking from "@/components/CustomerTracking";
import ReviewForm from "@/components/ReviewForm";
import PaymentCountdown from "@/components/PaymentCountdown";
import { expirePendingOrders, PAY_WINDOW_MIN } from "@/lib/orders";

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};
const LABEL: Record<string, string> = {
  PENDING: "Menunggu Bayar", PAID: "Lunas — Diproses", SHIPPED: "Dikirim", DELIVERED: "Diterima", CANCELLED: "Batal",
};
const fmt = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

// Daftar pesanan toko (shop) milik satu nomor HP. Dipakai di dashboard gabungan /riwayat/[phone].
export default async function OrderHistory({ phone }: { phone: string }) {
  await expirePendingOrders();
  // telepon disimpan apa adanya saat checkout (0xxx / +62xxx / 62xxx) → cari semua varian.
  const rest = phone.slice(2); // tanpa "62"
  const phoneVariants = [phone, "0" + rest, "+62" + rest];
  const orders = await safeQuery(
    () => prisma.order.findMany({
      where: { telepon: { in: phoneVariants } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true, reviews: { select: { productNama: true, rating: true } } },
    }),
    []
  );

  if (orders.length === 0) {
    return <p className="glass-card rounded-2xl p-8 text-center text-sm text-gray-400">Belum ada pesanan untuk nomor ini.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const reviewed = new Set(o.reviews.map((r) => r.productNama));
        return (
          <div key={o.id} className="glass-card flex flex-col rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-gray-900">{o.invoice}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[o.status] ?? ""}`}>{LABEL[o.status] ?? o.status}</span>
            </div>
            <p className="text-xs text-gray-400">{fmt(o.createdAt)}</p>

            <ul className="mt-3 space-y-2">
              {o.items.map((i) => {
                const rv = o.reviews.find((r) => r.productNama === i.nama);
                return (
                  <li key={i.id} className="flex gap-3 text-sm">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                      {i.gambar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={i.gambar} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">{i.qty}× {i.nama}{i.varian ? ` (${i.varian})` : ""}</p>
                      <p className="text-xs text-gray-500">{rupiah(i.harga * i.qty)}</p>
                      {o.status === "DELIVERED" && (
                        reviewed.has(i.nama)
                          ? <p className="mt-0.5 text-xs"><span className="text-amber-400">{"★".repeat(rv!.rating)}</span><span className="text-gray-300">{"★".repeat(5 - rv!.rating)}</span> <span className="text-gray-400">· sudah dinilai</span></p>
                          : <ReviewForm orderId={o.id} phone={phone} productNama={i.nama} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-extrabold text-gray-900">{rupiah(o.total)}</span>
            </div>

            <div className="mt-auto">
              {(o.status === "SHIPPED" || o.status === "DELIVERED") && o.resi && (
                <CustomerTracking orderId={o.id} kurir={o.kurir} resi={o.resi} />
              )}
              {o.status === "PENDING" && (
                <div className="mt-3">
                  <PaymentCountdown deadline={new Date(o.createdAt.getTime() + PAY_WINDOW_MIN * 60_000).toISOString()} className="mb-2 text-center" />
                  <Link href={`/order/${o.id}`} className="glass-primary block rounded-full px-3 py-2 text-center text-xs font-bold transition">
                    Selesaikan pembayaran →
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
