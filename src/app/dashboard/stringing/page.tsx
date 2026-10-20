import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can, sessionBranchId } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { displayPhone } from "@/lib/string-finder/phone";
import { startStringing, finishStringing } from "./actions";
import { logout } from "../actions";
import RacketQrPrint from "@/components/RacketQrPrint";
import BranchFilterChips from "@/components/BranchFilterChips";
import DeleteStringingButton from "@/components/DeleteStringingButton";
import CancelStringingButton from "@/components/CancelStringingButton";
import DoneStringingCard, { type DoneOrder } from "@/components/DoneStringingCard";
import SubmitButton from "@/components/SubmitButton";

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

// Daftar stringer. Tambah/hapus nama = edit baris ini.
const STRINGERS = [
  "Yopi", "Indy", "Edo", "Delfia", "Aldi",
  "Mutia", "Mawa", "Gifari", "Afi", "Lala",
  "Irvan", "Rahma", "N Taufiq", "Taufiq", "Jose",
];

// Metode pemilihan senar (3 sumber): String Finder (kuesioner) / Hybrid / Full Bed.
// condition "manual" = jalur non-rekomendasi; hybrid dikenali dari chosenString "(main)/(cross)".
function methodOf(condition: string | null | undefined, chosenString: string | null) {
  if (condition !== "manual") return { label: "String Finder", cls: "bg-indigo-100 text-indigo-700" };
  if (chosenString && /\(main\)/i.test(chosenString) && /\(cross\)/i.test(chosenString)) return { label: "Hybrid Stringing", cls: "bg-purple-100 text-purple-700" };
  return { label: "Full Bed Stringing", cls: "bg-gray-100 text-gray-600" };
}

// Tanggal & jam WIB (server Vercel jalan di UTC — tanpa timeZone jamnya meleset).
function fmt(d: Date) {
  return new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type OrderRow = Awaited<ReturnType<typeof getOrders>>[number];
function getOrders(branchId: string | null) {
  return prisma.sfOrder.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: { branch: { select: { name: true } }, result: { select: { condition: true } } },
  });
}

// Satu baris pesanan (dipakai di card cabang & card selesai).
function OrderCard({ o }: { o: OrderRow }) {
  const wa = displayPhone(o.phone);
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${o.status === "antri" ? "border-amber-200" : "border-gray-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[o.status]}`}>{LABEL[o.status]}</span>
            {o.branch?.name && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{o.branch.name}</span>}
            {o.result && (() => { const m = methodOf(o.result.condition, o.chosenString); return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>; })()}
            <span className="font-mono text-sm font-bold text-primary">{o.resultCode}</span>
            <span className="text-xs text-gray-400">{fmt(o.createdAt)}</span>
          </div>
          <p className="mt-1.5 font-semibold text-gray-900">{o.chosenString ?? "— (3 pilihan)"}</p>
          <p className="text-sm text-gray-600">
            {o.tensionLbs ? `Main ${o.tensionLbs}${o.tensionCrossLbs ? ` / Cross ${o.tensionCrossLbs}` : ""} lbs` : "tarikan –"}
            {o.racket ? ` • Raket: ${o.racket}` : ""}
            {o.stringerName ? ` • Stringer: ${o.stringerName}` : ""}
          </p>
          <p className="text-sm text-gray-500">
            {o.customerName ? `${o.customerName} • ` : ""}
            <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{wa}</a>
            {o.notifiedDone ? " • WA selesai terkirim" : o.notifiedInAt ? " • WA masuk terkirim" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RacketQrPrint phone={o.phone} label="Stiker QR" className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:opacity-50" />

          {o.status === "antri" && (
            <form action={startStringing.bind(null, o.id)} className="flex items-center gap-1.5">
              <select name="stringer" required defaultValue="" className="w-32 rounded-full border border-gray-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none">
                <option value="" disabled>Pilih stringer</option>
                {STRINGERS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <SubmitButton className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Mulai kerjakan</SubmitButton>
            </form>
          )}
          {o.status === "dikerjakan" && (
            <form action={finishStringing.bind(null, o.id)}>
              <SubmitButton className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Tandai selesai → WA</SubmitButton>
            </form>
          )}
          <Link href={`/dashboard/stringing/${o.resultCode}/edit`}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary">Edit</Link>
          {(o.status === "antri" || o.status === "dikerjakan") && <CancelStringingButton id={o.id} />}
          {(o.status === "selesai" || o.status === "batal") && <DeleteStringingButton id={o.id} />}
        </div>
      </div>
    </div>
  );
}

export default async function StringingQueuePage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("stringing")) redirect("/dashboard");

  // Stringer per cabang → cuma lihat cabangnya. Bos/admin (branchId null) → semua.
  const branchId = sessionBranchId();
  const [branches, orders] = await Promise.all([
    safeQuery(() => prisma.sfBranch.findMany({ where: { isActive: true, slug: { not: "tirtonic" }, ...(branchId ? { id: branchId } : {}) }, orderBy: { name: "asc" }, select: { id: true, name: true } }), []),
    safeQuery(() => getOrders(branchId), [] as OrderRow[]),
  ]);

  const active = orders.filter((o) => o.status === "antri" || o.status === "dikerjakan");
  const done = orders.filter((o) => o.status === "selesai" || o.status === "batal"); // batal ikut card Selesai
  // Siapkan data siap-render buat card "Selesai" (komponen client: collapse + filter cabang).
  const doneDTO: DoneOrder[] = done.map((o) => ({
    id: o.id,
    batal: o.status === "batal",
    resultCode: o.resultCode,
    branchName: o.branch?.name ?? null,
    method: o.result ? methodOf(o.result.condition, o.chosenString) : null,
    dateText: fmt(o.createdAt),
    chosenString: o.chosenString,
    tensionText: o.tensionLbs ? `Main ${o.tensionLbs}${o.tensionCrossLbs ? ` / Cross ${o.tensionCrossLbs}` : ""} lbs` : "tarikan –",
    racket: o.racket,
    stringerName: o.stringerName,
    customerName: o.customerName,
    phone: o.phone,
    waDisplay: displayPhone(o.phone),
    waNote: o.notifiedDone ? " • WA selesai terkirim" : o.notifiedInAt ? " • WA masuk terkirim" : "",
    slipHref: `/api/slip/${o.resultCode}${o.chosenRank ? `?rank=${o.chosenRank}` : o.chosenString ? `?name=${encodeURIComponent(o.chosenString)}` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold text-primary">Antrian Stringing</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{active.length} aktif • {active.length + done.length} total</span>
          <Link href="/dashboard/password" className="text-sm font-medium text-gray-500 hover:text-primary">Ganti sandi</Link>
          <form action={logout}>
            <button className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-red-400 hover:text-red-600">Logout</button>
          </form>
        </div>
      </div>

      <BranchFilterChips branches={branches} />

      {/* Card per cabang: antrian aktif + badge dikerjakan/antri — 2 kolom */}
      <div className="grid gap-5 lg:grid-cols-2">
        {branches.map((b) => {
          const list = active.filter((o) => o.branchId === b.id);
          const prog = list.filter((o) => o.status === "dikerjakan").length;
          const wait = list.filter((o) => o.status === "antri").length;
          return (
            <section key={b.id} data-branch-section={b.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-extrabold text-gray-900">{b.name}</h2>
                <div className="flex gap-2">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{prog} dikerjakan</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">{wait} antri</span>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {list.length ? list.map((o) => <OrderCard key={o.id} o={o} />) : (
                  <p className="py-6 text-center text-sm text-gray-400">Tidak ada antrian aktif.</p>
                )}
              </div>
            </section>
          );
        })}

        {/* Selesai — gabungan semua cabang (collapse + filter cabang; sebelah Solo) */}
        <DoneStringingCard orders={doneDTO} branches={branches.map((b) => b.name)} />
      </div>
    </div>
  );
}
// (grid 2 kolom: Jogja, Semarang, Solo, Selesai)
