import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { rupiah } from "@/lib/format";
import CustomerTracking from "@/components/CustomerTracking";
import ReviewForm from "@/components/ReviewForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan Saya — Tirtonic" };

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

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PesananSayaPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const orders = phone
    ? await safeQuery(
        () => prisma.order.findMany({
          where: { telepon: phone },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { items: true, reviews: { select: { productNama: true, rating: true } } },
        }),
        []
      )
    : [];

  const name = orders[0]?.nama ?? null;
  // Total belanja = pesanan yang sudah dibayar (LUNAS/Dikirim/Diterima).
  const paidStatuses = new Set(["PAID", "SHIPPED", "DELIVERED"]);
  const totalBelanja = orders.filter((o) => paidStatuses.has(o.status)).reduce((s, o) => s + o.total, 0);
  const jumlahSelesai = orders.filter((o) => o.status === "DELIVERED").length;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-16">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-8 pt-9 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Tirtonic" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-base font-bold leading-tight">{name ?? "Halo!"}</p>
              <p className="text-xs text-white/70">{phone ? displayPhone(phone) : "Nomor tidak valid"}</p>
            </div>
          </div>
          <Link href="/pesanan-saya" className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Ganti nomor</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-lg font-extrabold leading-none">{rupiah(totalBelanja)}</p>
            <p className="mt-1 text-xs text-white/80">Total pembelian</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-lg font-extrabold leading-none">{orders.length}<span className="text-sm font-semibold"> pesanan</span></p>
            <p className="mt-1 text-xs text-white/80">{jumlahSelesai} selesai</p>
          </div>
        </div>
      </header>

      <div className="px-4">
        {orders.length === 0 ? (
          <p className="-mt-4 rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            {phone ? "Belum ada pesanan untuk nomor ini." : "Nomor tidak valid."}
          </p>
        ) : (
          <div className="-mt-4 space-y-4">
            {orders.map((o) => {
              const reviewed = new Set(o.reviews.map((r) => r.productNama));
              return (
                <div key={o.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-gray-900">{o.invoice}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[o.status] ?? ""}`}>{LABEL[o.status] ?? o.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{fmt(o.createdAt)}</p>

                  <ul className="mt-3 space-y-2">
                    {o.items.map((i) => (
                      <li key={i.id} className="flex gap-3 text-sm">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-gray-100">
                          {i.gambar && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={i.gambar} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800">{i.qty}× {i.nama}{i.varian ? ` (${i.varian})` : ""}</p>
                          <p className="text-xs text-gray-500">{rupiah(i.harga * i.qty)}</p>
                          {o.status === "DELIVERED" && (
                            reviewed.has(i.nama)
                              ? <p className="mt-0.5 text-xs text-amber-500">{"★".repeat(o.reviews.find((r) => r.productNama === i.nama)!.rating)}<span className="text-gray-300">{"★".repeat(5 - o.reviews.find((r) => r.productNama === i.nama)!.rating)}</span> <span className="text-gray-400">· sudah dinilai</span></p>
                              : <ReviewForm orderId={o.id} phone={phone!} productNama={i.nama} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                    <span className="text-gray-500">Total</span>
                    <span className="font-extrabold text-gray-900">{rupiah(o.total)}</span>
                  </div>

                  {(o.status === "SHIPPED" || o.status === "DELIVERED") && o.resi && (
                    <CustomerTracking orderId={o.id} kurir={o.kurir} resi={o.resi} />
                  )}
                  {o.status === "PENDING" && (
                    <Link href={`/order/${o.id}`} className="mt-2 block rounded-full border border-primary px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-primary/5">
                      Selesaikan pembayaran →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
