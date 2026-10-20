import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import { logout } from "../actions";
import PreorderOrderActions from "@/components/PreorderOrderActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pre-Order — Tirtonic" };

const BADGE: Record<string, string> = {
  PENDING_DP: "bg-amber-100 text-amber-700",
  DP_PAID: "bg-emerald-100 text-emerald-700",
  WAITING_LUNAS: "bg-blue-100 text-blue-700",
  LUNAS: "bg-green-100 text-green-700",
  SHIPPED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-red-100 text-red-600",
};
const LABEL: Record<string, string> = {
  PENDING_DP: "Menunggu DP", DP_PAID: "DP Lunas", WAITING_LUNAS: "Menunggu Pelunasan", LUNAS: "Lunas", SHIPPED: "Dikirim/Diambil", CANCELLED: "Batal",
};

function fmt(d: Date) {
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPreorder() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("pesanan")) redirect("/dashboard");

  const orders = await safeQuery(() => prisma.preorderOrder.findMany({ orderBy: { createdAt: "desc" }, take: 300 }), []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-primary">← Pesanan</Link>
          <h1 className="mt-2 text-2xl font-extrabold text-primary">Pre-Order</h1>
        </div>
        <form action={logout}>
          <button className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-red-400 hover:text-red-600">Logout</button>
        </form>
      </div>

      {/* Pesanan PO masuk */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Pesanan Pre-Order Masuk</h2>
          <span className="text-sm text-gray-400">{orders.length} pesanan</span>
        </div>
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-10 text-center text-gray-400">Belum ada pesanan pre-order.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const sisa = o.kekurangan ?? Math.max(0, o.total - o.dp);
              return (
                <div key={o.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{o.invoice}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[o.status] ?? ""}`}>{LABEL[o.status] ?? o.status}</span>
                      </div>
                      <p className="text-xs text-gray-400">{fmt(o.createdAt)}</p>
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
                      <p>{o.qty}× {o.productNama}{o.varian ? ` (${o.varian})` : ""}</p>
                      <p className="mt-1 text-xs">DP: <span className="font-semibold text-emerald-600">{rupiah(o.dp)}</span> · Sisa: <span className="font-semibold">{o.status === "LUNAS" ? "Lunas" : rupiah(sisa)}</span></p>
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-3">
                    <PreorderOrderActions id={o.id} status={o.status} defaultKekurangan={Math.max(0, o.total - o.dp)} arrived={!!o.arrivedAt || !!o.readyAt} pickup={o.alamat?.startsWith("AMBIL DI TOKO")} resi={o.resi} kurir={o.kurir} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
