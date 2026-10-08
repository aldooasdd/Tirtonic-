import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { displayPhone } from "@/lib/string-finder/phone";
import { startStringing, finishStringing, cancelStringing } from "./actions";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Antrian Stringing — Tirtonic" };

const BADGE: Record<string, string> = {
  antri: "bg-amber-100 text-amber-700",
  dikerjakan: "bg-blue-100 text-blue-700",
  selesai: "bg-emerald-100 text-emerald-700",
  batal: "bg-gray-100 text-gray-500",
};
const LABEL: Record<string, string> = {
  antri: "Antri", dikerjakan: "Dikerjakan", selesai: "Selesai", batal: "Batal",
};

function fmt(d: Date) {
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function StringingQueuePage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("stringing")) redirect("/dashboard");

  const orders = await safeQuery(
    () => prisma.sfOrder.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 }),
    [] as Awaited<ReturnType<typeof prisma.sfOrder.findMany>>
  );
  const aktif = orders.filter((o) => o.status === "antri" || o.status === "dikerjakan").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold text-primary">Antrian Stringing</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{aktif} aktif • {orders.length} total</span>
          <Link href="/dashboard/password" className="text-sm font-medium text-gray-500 hover:text-primary">Ganti sandi</Link>
          <form action={logout}>
            <button className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-red-400 hover:text-red-600">Logout</button>
          </form>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-gray-400">Belum ada antrian stringing.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const wa = displayPhone(o.phone);
            return (
              <div key={o.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${o.status === "antri" ? "border-amber-200" : "border-gray-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[o.status]}`}>{LABEL[o.status]}</span>
                      <span className="font-mono text-sm font-bold text-primary">{o.resultCode}</span>
                      <span className="text-xs text-gray-400">{fmt(o.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 font-semibold text-gray-900">{o.chosenString ?? "— (3 pilihan)"}</p>
                    <p className="text-sm text-gray-600">
                      {o.tensionLbs ? `${o.tensionLbs} lbs` : "tarikan –"}
                      {o.racket ? ` • Raket: ${o.racket}` : ""}
                    </p>
                    <p className="text-sm text-gray-500">
                      {o.customerName ? `${o.customerName} • ` : ""}
                      <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{wa}</a>
                      {o.notifiedDone ? " • WA selesai terkirim" : o.notifiedInAt ? " • WA masuk terkirim" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`/api/slip/${o.resultCode}${o.chosenRank ? `?rank=${o.chosenRank}` : ""}`} target="_blank" rel="noreferrer"
                      className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary">Resep</a>
                    {o.status === "antri" && (
                      <form action={startStringing.bind(null, o.id)}>
                        <button className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Mulai kerjakan</button>
                      </form>
                    )}
                    {o.status === "dikerjakan" && (
                      <form action={finishStringing.bind(null, o.id)}>
                        <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Tandai selesai → WA</button>
                      </form>
                    )}
                    {(o.status === "antri" || o.status === "dikerjakan") && (
                      <form action={cancelStringing.bind(null, o.id)}>
                        <button className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Batal</button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
