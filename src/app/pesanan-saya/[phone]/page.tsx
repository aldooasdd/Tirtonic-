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
  const paidStatuses = new Set(["PAID", "SHIPPED", "DELIVERED"]);
  const totalBelanja = orders.filter((o) => paidStatuses.has(o.status)).reduce((s, o) => s + o.total, 0);
  const jumlahSelesai = orders.filter((o) => o.status === "DELIVERED").length;

  const stats = [
    { l: "Total pembelian", v: rupiah(totalBelanja) },
    { l: "Jumlah pesanan", v: String(orders.length) },
    { l: "Selesai", v: String(jumlahSelesai) },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-emerald-50/50 via-gray-50 to-white text-gray-900">
      {/* Blob warna di belakang — supaya efek liquid glass kebaca */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-40 h-96 w-96 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute right-0 top-[55%] h-96 w-96 rounded-full bg-emerald-300/30 blur-[130px]" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-teal-200/30 blur-[120px]" />
      </div>

      <div className="relative">
        {/* Hero */}
        <header className="relative overflow-hidden border-b border-gray-100 bg-white">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-8 sm:px-8 lg:pb-12">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Tirtonic" className="h-9 w-9 object-contain" />
                <span className="text-sm font-semibold tracking-tight text-gray-900">Tirtonic · Pesanan Saya</span>
              </Link>
              <Link href="/pesanan-saya" className="glass-btn rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:text-primary">
                Ganti nomor
              </Link>
            </div>

            <div className="mt-8 lg:mt-10">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl">
                Halo, {name ?? "Pelanggan Tirtonic"} 👋
              </h1>
              <p className="mt-1 text-sm text-gray-500">{phone ? displayPhone(phone) : "Nomor tidak valid"}</p>

              {/* Stat tiles — responsif */}
              <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-xl">
                {stats.map((s) => (
                  <div key={s.l} className="glass-card rounded-2xl px-4 py-3.5">
                    <p className="text-base font-extrabold leading-none text-gray-900 sm:text-lg">{s.v}</p>
                    <p className="mt-1.5 text-[11px] text-gray-500 sm:text-xs">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          {orders.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center text-sm text-gray-400">
              {phone ? "Belum ada pesanan untuk nomor ini." : "Nomor tidak valid."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {orders.map((o) => {
                const reviewed = new Set(o.reviews.map((r) => r.productNama));
                return (
                  <div key={o.id} className="glass-card flex flex-col rounded-2xl p-4 sm:p-5">
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
                                <img src={i.gambar} alt="" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-800">{i.qty}× {i.nama}{i.varian ? ` (${i.varian})` : ""}</p>
                              <p className="text-xs text-gray-500">{rupiah(i.harga * i.qty)}</p>
                              {o.status === "DELIVERED" && (
                                reviewed.has(i.nama)
                                  ? <p className="mt-0.5 text-xs"><span className="text-amber-400">{"★".repeat(rv!.rating)}</span><span className="text-gray-300">{"★".repeat(5 - rv!.rating)}</span> <span className="text-gray-400">· sudah dinilai</span></p>
                                  : <ReviewForm orderId={o.id} phone={phone!} productNama={i.nama} />
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
                        <Link href={`/order/${o.id}`} className="glass-primary mt-3 block rounded-full px-3 py-2 text-center text-xs font-bold transition">
                          Selesaikan pembayaran →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
