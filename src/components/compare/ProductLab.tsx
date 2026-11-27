"use client";
import { useState } from "react";
import Link from "next/link";
import { KATEGORI, tingkat, type Item } from "@/lib/compare-shared";
import { rupiah } from "@/lib/format";
import Radar, { WARNA } from "./Radar";

/** Data lab di halaman produk: radar + skor + spesifikasi utama + tombol Bandingkan. */
export default function ProductLab({ items, serupa = [] }: { items: Item[]; serupa?: Item[] }) {
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
            <img src="/compare-logo.png?v=2" alt="Compare" width={1292} height={258} className="h-8 w-auto sm:h-10" />
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

      {serupa.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-gray-900">{JUDUL_SERUPA[it.kategori]}</h3>
              <p className="text-sm text-gray-500">Karakter skornya paling mirip dengan produk ini.</p>
            </div>
          </div>
          <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {serupa.map((s) => {
              const t = s.skor != null ? tingkat(s.skor) : null;
              return (
                <div key={s.id} className="flex w-[200px] shrink-0 snap-start flex-col rounded-2xl border bg-white p-3 sm:w-[220px]">
                  <Link href={s.href} className="group block">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                      {s.foto && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.foto} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                      )}
                      {t && <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-sm font-bold ${t.cls}`}>{s.skor}</span>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900">{s.nama}</p>
                  </Link>
                  <p className="mt-1 text-sm text-gray-700">{s.ready ? rupiah(s.harga) : <span className="text-gray-400">Sold out</span>}</p>
                  <Link href={`/bandingkan?k=${it.kategori}&i=${it.id},${s.id}`} className="mt-auto pt-3 text-center">
                    <span className="block rounded-full border border-gray-300 py-2 text-xs font-semibold text-gray-800 hover:border-gray-900">Bandingkan</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

const JUDUL_SERUPA: Record<string, string> = { raket: "Raket serupa", senar: "Senar serupa", sepatu: "Sepatu serupa" };
