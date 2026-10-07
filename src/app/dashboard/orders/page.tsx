import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import OrderRowActions from "@/components/OrderRowActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan — Tirtonic" };

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};
const LABEL: Record<string, string> = {
  PENDING: "Menunggu Bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  CANCELLED: "Batal",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function OrdersPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("pesanan")) redirect("/dashboard");

  const orders = await safeQuery(
    () => prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
    []
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold text-primary">Pesanan</h1>
        </div>
        <span className="text-sm text-gray-400">{orders.length} pesanan</span>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-gray-400">Belum ada pesanan.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{o.invoice}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[o.status] ?? ""}`}>{LABEL[o.status] ?? o.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{fmtDate(o.createdAt)}</p>
                </div>
                <span className="text-lg font-extrabold text-gray-900">{rupiah(o.total)}</span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">{o.nama}</p>
                  <p>
                    <a href={`https://wa.me/${o.telepon.replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{o.telepon}</a>
                    {" · "}
                    <a href={`mailto:${o.email}`} className="text-primary hover:underline">{o.email}</a>
                  </p>
                  <p className="mt-1">{o.alamat}, {o.kota}, {o.provinsi} {o.kodePos}</p>
                  {o.catatan && <p className="mt-1 text-gray-500">Catatan: {o.catatan}</p>}
                </div>
                <div className="text-sm text-gray-600">
                  <ul className="space-y-0.5">
                    {o.items.map((i) => (
                      <li key={i.id}>{i.qty}× {i.nama}{i.varian ? ` (${i.varian})` : ""}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-gray-400">Ongkir {o.kurir}: {o.ongkir === 0 ? "Gratis" : rupiah(o.ongkir)}</p>
                  {o.diskon > 0 && <p className="mt-1 text-xs font-semibold text-primary">Kupon {o.kupon}: −{rupiah(o.diskon)}</p>}
                  {o.resi && <p className="mt-1">Resi: <span className="font-mono font-semibold text-gray-900">{o.resi}</span></p>}
                </div>
              </div>

              <div className="mt-4 border-t pt-3">
                <OrderRowActions id={o.id} status={o.status} kurir={o.kurir} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
