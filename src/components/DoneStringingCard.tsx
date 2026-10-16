"use client";

import { useState } from "react";
import Link from "next/link";
import RacketQrPrint from "@/components/RacketQrPrint";
import DeleteStringingButton from "@/components/DeleteStringingButton";

export type DoneOrder = {
  id: string;
  resultCode: string;
  branchName: string | null;
  method: { label: string; cls: string } | null;
  dateText: string;
  chosenString: string | null;
  tensionText: string;
  racket: string | null;
  stringerName: string | null;
  customerName: string | null;
  phone: string;
  waDisplay: string;
  waNote: string;
  slipHref: string;
};

// Card "Selesai" yang bisa dibuka-tutup + filter cabang, biar gak kepanjangan.
export default function DoneStringingCard({ orders, branches }: { orders: DoneOrder[]; branches: string[] }) {
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<string | null>(null);
  const list = branch ? orders.filter((o) => o.branchName === branch) : orders;

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <h2 className="text-base font-extrabold text-gray-900">
          Selesai <span className="font-normal text-gray-400">— semua cabang</span>
        </h2>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{orders.length} selesai</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      {open && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {[{ v: null as string | null, n: "Semua" }, ...branches.map((b) => ({ v: b, n: b }))].map((t) => {
              const active = t.v === branch;
              return (
                <button
                  key={t.n}
                  onClick={() => setBranch(t.v)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? "border-primary bg-primary text-white" : "border-gray-300 text-gray-500 hover:border-primary hover:text-primary"}`}
                >
                  {t.n}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-3">
            {list.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Belum ada yang selesai.</p>
            ) : (
              list.map((o) => (
                <div key={o.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Selesai</span>
                        {o.branchName && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{o.branchName}</span>}
                        {o.method && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.method.cls}`}>{o.method.label}</span>}
                        <span className="font-mono text-sm font-bold text-primary">{o.resultCode}</span>
                        <span className="text-xs text-gray-400">{o.dateText}</span>
                      </div>
                      <p className="mt-1.5 font-semibold text-gray-900">{o.chosenString ?? "— (3 pilihan)"}</p>
                      <p className="text-sm text-gray-600">
                        {o.tensionText}
                        {o.racket ? ` • Raket: ${o.racket}` : ""}
                        {o.stringerName ? ` • Stringer: ${o.stringerName}` : ""}
                      </p>
                      <p className="text-sm text-gray-500">
                        {o.customerName ? `${o.customerName} • ` : ""}
                        <a href={`https://wa.me/${o.phone}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{o.waDisplay}</a>
                        {o.waNote}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={o.slipHref} target="_blank" rel="noreferrer" className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary">Resep</a>
                      <RacketQrPrint phone={o.phone} label="Stiker QR" className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:opacity-50" />
                      <Link href={`/dashboard/stringing/${o.resultCode}/edit`} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary">Edit</Link>
                      <DeleteStringingButton id={o.id} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
