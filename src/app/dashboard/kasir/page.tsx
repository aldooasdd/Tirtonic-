import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { displayPhone } from "@/lib/string-finder/phone";
import { markPaid, unmarkPaid } from "./actions";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kasir — Tirtonic" };

const rupiah = (n: number | null | undefined) => (n == null ? "—" : "Rp" + n.toLocaleString("id-ID"));

function fmt(d: Date) {
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Order = Awaited<ReturnType<typeof prisma.sfOrder.findMany>>[number];

function OrderCard({ o, highlight }: { o: Order; highlight?: boolean }) {
  const wa = displayPhone(o.phone);
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${highlight ? "border-primary ring-1 ring-primary" : o.paidAt ? "border-emerald-200" : "border-red-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary">{o.resultCode}</span>
            <span className="text-xs text-gray-400">{fmt(o.createdAt)}</span>
            {o.paidAt
              ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">LUNAS</span>
              : <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">BELUM LUNAS</span>}
          </div>
          <p className="mt-1.5 font-semibold text-gray-900">{o.chosenString ?? "—"}</p>
          <p className="text-sm text-gray-600">
            {o.tensionLbs ? `Main ${o.tensionLbs}${o.tensionCrossLbs ? ` / Cross ${o.tensionCrossLbs}` : ""} lbs` : "tarikan –"}
            {o.racket ? ` • ${o.racket}` : ""}
          </p>
          <p className="text-sm text-gray-500">{o.customerName ? `${o.customerName} • ` : ""}{wa}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-extrabold text-primary">{rupiah(o.price)}</p>
          {o.paidAt ? (
            <form action={unmarkPaid.bind(null, o.id)}>
              <button className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-red-400 hover:text-red-600">Batalkan lunas</button>
            </form>
          ) : (
            <form action={markPaid.bind(null, o.id)}>
              <button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Tandai LUNAS</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function KasirPage({ searchParams }: { searchParams: { code?: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("kasir")) redirect("/dashboard");

  const code = (searchParams.code ?? "").trim().toUpperCase();

  const [found, unpaid] = await safeQuery(
    () => Promise.all([
      code
        ? prisma.sfOrder.findMany({ where: { resultCode: code }, orderBy: { createdAt: "desc" }, take: 10 })
        : Promise.resolve([] as Order[]),
      prisma.sfOrder.findMany({ where: { paidAt: null, status: { in: ["antri", "dikerjakan"] } }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]),
    [[], []] as [Order[], Order[]]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold text-primary">Kasir — Pembayaran Stringing</h1>
        </div>
        <form action={logout}>
          <button className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-red-400 hover:text-red-600">Logout</button>
        </form>
      </div>

      {/* Cari pakai kode resep */}
      <form method="GET" className="mb-6 flex gap-2">
        <input
          name="code"
          defaultValue={code}
          placeholder="Masukkan kode resep (mis. SF-AB12)"
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm uppercase focus:border-primary focus:outline-none"
          autoFocus
        />
        <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90">Cari</button>
      </form>

      {code && (
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Hasil untuk “{code}”</h2>
          {found.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-gray-400">Tidak ada pesanan dengan kode ini.</p>
          ) : (
            <div className="space-y-3">{found.map((o) => <OrderCard key={o.id} o={o} highlight />)}</div>
          )}
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold text-gray-500">Belum lunas ({unpaid.length})</h2>
      {unpaid.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-gray-400">Semua pesanan sudah lunas. 🎉</p>
      ) : (
        <div className="space-y-3">{unpaid.map((o) => <OrderCard key={o.id} o={o} />)}</div>
      )}
    </div>
  );
}
