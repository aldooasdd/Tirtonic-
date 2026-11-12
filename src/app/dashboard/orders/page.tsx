import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import OrderRowActions from "@/components/OrderRowActions";
import { expirePendingOrders } from "@/lib/orders";
import { PageHeader, StatCard, Icon, card, btn } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan — Tirtonic" };

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};
const LABEL: Record<string, string> = {
  PENDING: "Menunggu Bayar",
  PAID: "Lunas",
  SHIPPED: "Dikirim",
  DELIVERED: "Diterima",
  CANCELLED: "Batal",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TABS = [
  { key: "", label: "Semua" },
  { key: "PAID", label: "Perlu dikirim" },
  { key: "PENDING", label: "Belum bayar" },
  { key: "SHIPPED", label: "Dikirim" },
  { key: "DELIVERED", label: "Selesai" },
  { key: "CANCELLED", label: "Batal" },
];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("pesanan")) redirect("/dashboard");

  await expirePendingOrders(); // hapus PENDING kadaluarsa (60 menit + grace)
  const all = await safeQuery(
    () => prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
    []
  );
  const tab = TABS.some((t) => t.key === searchParams.status) ? searchParams.status! : "";
  const orders = tab ? all.filter((o) => o.status === tab) : all;
  const count = (st: string) => all.filter((o) => o.status === st).length;

  // Jumlah pesanan (bukan omzet) 12 bulan terakhir, tanpa yang batal.
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const n = all.filter((o) => o.status !== "CANCELLED" && o.createdAt.getFullYear() === d.getFullYear() && o.createdAt.getMonth() === d.getMonth()).length;
    return { label: BULAN[d.getMonth()], full: `${BULAN[d.getMonth()]} ${d.getFullYear()}`, n };
  });
  const maxN = Math.max(1, ...months.map((m) => m.n));
  const avg = Math.round(months.reduce((a, m) => a + m.n, 0) / 12);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Pesanan" desc="Pantau pesanan masuk, kemas, dan kirim — semua di satu tempat.">
        <Link href="/dashboard/preorder" className={btn}><Icon name="clock" /> Pre-Order</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard icon="box" label="Perlu Dikirim" value={count("PAID")} tone="blue" note="sudah lunas, belum ada resi" />
        <StatCard icon="wallet" label="Belum Bayar" value={count("PENDING")} note="otomatis batal 60 menit" />
        <StatCard icon="truck" label="Dikirim" value={count("SHIPPED")} tone="green" note="dalam perjalanan" />
        <StatCard icon="check" label="Selesai" value={count("DELIVERED")} tone="green" note="sudah diterima" />
      </div>

      <div className={`${card} mt-4 p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-semibold">Pesanan per Bulan</h2>
            <p className="mt-2 text-xs text-[#6B7A74]">Rata-rata per bulan</p>
            <p className="text-xl font-semibold">{avg} pesanan</p>
          </div>
          <span className="text-xs text-[#9AA6A1]">12 bulan terakhir · tanpa yang batal</span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-1.5 sm:gap-3">
          {months.map((m, i) => {
            const last = i === months.length - 1;
            return (
              <div key={m.full} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${m.full}: ${m.n} pesanan`}>
                <span className={`text-[11px] font-medium ${last ? "text-primary" : "text-transparent group-hover:text-[#6B7A74]"}`}>{m.n}</span>
                <div className="relative w-full flex-1 overflow-hidden rounded-lg bg-[#F3F5F4]">
                  <div className={`absolute inset-x-0 bottom-0 rounded-lg ${last ? "bg-primary" : "bg-[#DCE5E0] group-hover:bg-[#B9CCC2]"}`} style={{ height: `${(m.n / maxN) * 100}%` }} />
                </div>
                <span className={`text-[11px] ${last ? "font-semibold text-[#0F1F1A]" : "text-[#9AA6A1]"}`}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const n = t.key ? count(t.key) : all.length;
          const on = t.key === tab;
          return (
            <Link key={t.key} href={t.key ? `/dashboard/orders?status=${t.key}` : "/dashboard/orders"} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-[#0E3B2E] bg-[#0E3B2E] font-medium text-white" : "border-[#E6EAE8] bg-white text-[#3F4D47] hover:border-primary"}`}>
              {t.label} <span className={on ? "text-white/70" : "text-[#9AA6A1]"}>{n}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-gray-400">Belum ada pesanan{tab ? " dengan status ini" : ""}.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className={`${card} p-5`}>
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
                <OrderRowActions id={o.id} status={o.status} kurir={o.kurir} pickup={/^AMBIL DI TOKO/i.test(o.alamat)} />
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
