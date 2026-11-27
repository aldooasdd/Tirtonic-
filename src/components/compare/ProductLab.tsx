"use client";
import { useState } from "react";
import Link from "next/link";
import { KATEGORI, tingkat, type Item } from "@/lib/compare-shared";
import Radar, { WARNA } from "./Radar";

/** Data lab di halaman produk: radar + skor + spesifikasi utama + tombol Bandingkan. */
export default function ProductLab({ items }: { items: Item[] }) {
  const [n, setN] = useState(0);
  const it = items[n];
  const kriteria = KATEGORI[it.kategori].kriteria;
  const ada = Object.keys(it.nilai).length > 0;
  const spek = Object.entries(it.spek).slice(0, 10);
  return (
    <section className="mx-auto max-w-[1200px] border-t px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/compare-logo.png" alt="Compare" width={1160} height={262} className="h-8 w-auto sm:h-10" />
          </h2>
          <p className="mt-2 text-sm text-gray-500">Skor Tirtoniclab dari data uji lab, bukan kesan subjektif.</p>
        </div>
        <Link href={`/bandingkan?k=${it.kategori}&i=${it.id}`} className="rounded-full bg-primaryDark px-5 py-2 text-sm font-semibold text-white hover:bg-primary">Bandingkan dengan lainnya</Link>
      </div>
      {items.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((x, i) => (
            <button key={x.id} onClick={() => setN(i)} className={`rounded-full px-3 py-1 text-sm font-semibold ${i === n ? "bg-primaryDark text-white" : "bg-gray-100 text-gray-700"}`}>{x.varian || "Semua"}</button>
          ))}
        </div>
      )}
      <div className="mt-6 grid items-start gap-8 md:grid-cols-2">
        <div className="flex flex-col items-center">
          {it.skor != null && (
            <p className="mb-2 flex items-center gap-2 text-sm text-gray-600">Skor Tirtoniclab <span className={`rounded-md px-2 py-0.5 text-lg font-bold ${tingkat(it.skor).cls}`}>{it.skor}</span><span>{tingkat(it.skor).label}</span></p>
          )}
          {ada ? <Radar kriteria={kriteria} seri={[{ nilai: it.nilai, warna: WARNA[0] }]} /> : <p className="py-10 text-sm text-gray-500">Skor lab belum tersedia, spesifikasi di samping.</p>}
        </div>
        <div>
          {ada && (
            <ul className="mb-5 space-y-2">
              {kriteria.map((k) => it.nilai[k] != null && (
                <li key={k} className="flex items-center gap-3 text-sm">
                  <span className="w-28 text-gray-600">{k}</span>
                  <span className="h-2 flex-1 rounded bg-gray-100"><span className="block h-2 rounded bg-primary" style={{ width: `${it.nilai[k]}%` }} /></span>
                  <span className="w-8 text-right font-bold">{it.nilai[k]}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {spek.map(([k, v]) => (
              <div key={k} className="border-b pb-1.5"><dt className="text-xs text-gray-500">{k}</dt><dd className="font-semibold text-gray-900">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-gray-400">Data: Tirtoniclab, dihimpun dari hasil uji lab independen.</p>
        </div>
      </div>
    </section>
  );
}
