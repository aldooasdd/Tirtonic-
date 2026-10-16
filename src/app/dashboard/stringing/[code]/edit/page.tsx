import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { updateStringing } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Pesanan Stringing — Tirtonic" };

export default async function EditStringingPage({ params }: { params: { code: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("stringing")) redirect("/dashboard");

  const o = await safeQuery(
    () => prisma.sfOrder.findFirst({ where: { resultCode: params.code }, orderBy: { createdAt: "desc" }, include: { branch: { select: { name: true } } } }),
    null,
  );
  if (!o) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard/stringing" className="text-sm text-gray-500 hover:text-primary">← Kembali ke antrian</Link>
      <h1 className="mt-2 text-2xl font-extrabold text-primary">Edit Pesanan</h1>
      <p className="mt-1 text-sm text-gray-500">
        <span className="font-mono font-bold text-primary">{o.resultCode}</span>
        {o.branch?.name ? ` • ${o.branch.name}` : ""}
      </p>

      <form action={updateStringing.bind(null, o.id)} className="mt-5 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <label className="label">Senar</label>
          <input name="chosenString" defaultValue={o.chosenString ?? ""} className="field" placeholder="Nama senar" />
        </div>
        <div className="flex gap-3">
          <div>
            <label className="label">Tarikan Main (lbs)</label>
            <input name="tensionLbs" type="number" min={30} max={75} defaultValue={o.tensionLbs ?? ""} inputMode="numeric" className="field w-32" />
          </div>
          <div>
            <label className="label">Tarikan Cross (lbs)</label>
            <input name="tensionCrossLbs" type="number" min={30} max={75} defaultValue={o.tensionCrossLbs ?? ""} inputMode="numeric" className="field w-32" />
          </div>
        </div>
        <div>
          <label className="label">Raket</label>
          <input name="racket" defaultValue={o.racket ?? ""} className="field" placeholder="mis. Yonex Ezone 98" />
        </div>
        <div>
          <label className="label">Nama customer</label>
          <input name="customerName" defaultValue={o.customerName ?? ""} className="field" placeholder="Nama" />
        </div>
        <div>
          <label className="label">Nomor WhatsApp <span className="text-red-500">*</span></label>
          <input name="phone" defaultValue={o.phone} required inputMode="tel" className="field" placeholder="08xxxxxxxxxx" />
        </div>

        <div className="flex gap-2 pt-1">
          <button className="btn-green px-6 py-2.5">Simpan</button>
          <Link href="/dashboard/stringing" className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-400">Batal</Link>
        </div>
      </form>
    </div>
  );
}
