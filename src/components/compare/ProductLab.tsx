"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { KATEGORI, tingkat, type Item } from "@/lib/compare-shared";
import { rupiah } from "@/lib/format";
import Radar, { WARNA } from "./Radar";

/** Data lab di halaman produk: radar + skor + spesifikasi utama + tombol Bandingkan. */
export default function ProductLab({ items, serupa = [] }: { items: Item[]; serupa?: Item[] }) {
  const [n, setN] = useState(0);
  const [lawan, setLawan] = useState<Item | null>(null);
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
          {ada ? <Radar kriteria={kriteria} seri={[{ nilai: it.nilai, warna: "#146b52" }]} /> : <p className="py-10 text-sm text-gray-500">Skor lab belum tersedia, spesifikasi di samping.</p>}
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
        <div className="mt-12 rounded-3xl bg-gray-50 p-4 sm:p-6">
          <h3 className="mb-4 text-base font-bold text-gray-900">{JUDUL_SERUPA[it.kategori]}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serupa.map((s) => <Serupa key={s.id} s={s} onCompare={() => setLawan(s)} />)}
          </div>
        </div>
      )}
      {lawan && <Banding a={it} b={lawan} tutup={() => setLawan(null)} />}
    </section>
  );
}

const JUDUL_SERUPA: Record<string, string> = { raket: "Raket serupa", senar: "Senar serupa", sepatu: "Sepatu serupa" };

/** Satu produk serupa: foto, nama, harga, tombol compare. */
function Serupa({ s, onCompare }: { s: Item; onCompare: () => void }) {
  const t = s.skor != null ? tingkat(s.skor) : null;
  // Seluruh kartu bisa diklik ke detail produk (link "stretched"); tombol + di atasnya tetap untuk compare.
  return (
    <div className="group relative flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white">
        {s.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.foto} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        )}
        {t && <span className={`absolute left-1 top-1 rounded px-1.5 text-[11px] font-bold ${t.cls}`}>{s.skor}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={s.href} className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 after:absolute after:inset-0 after:rounded-2xl">{s.nama}</Link>
        <p className="mt-0.5 text-sm text-gray-600">{s.ready ? rupiah(s.harga) : <span className="text-gray-400">Sold out</span>}</p>
      </div>
      <button onClick={onCompare} aria-label="Bandingkan" title="Bandingkan" className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-gray-900 hover:text-gray-900">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

/** Hasil compare langsung (popup) produk ini vs produk serupa: radar + legenda + skor per kriteria. */
function Banding({ a, b, tutup }: { a: Item; b: Item; tutup: () => void }) {
  const kriteria = KATEGORI[a.kategori].kriteria;
  const dua = [a, b];
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && tutup();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [tutup]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={tutup}>
      <div role="dialog" aria-modal="true" aria-label="Hasil perbandingan" onClick={(e) => e.stopPropagation()} className="sheet-in max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Perbandingan</h3>
          <button onClick={tutup} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div className="flex justify-center"><Radar kriteria={kriteria} seri={dua.map((x, i) => ({ nilai: x.nilai, warna: WARNA[i] }))} /></div>
          <ul className="space-y-3">
            {dua.map((x, i) => (
              <li key={x.id} className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: WARNA[i] }} />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-gray-900">{x.nama}</span>
                  {x.varian && <span className="text-gray-500"> · {x.varian}</span>}
                </span>
                {x.skor != null && <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${tingkat(x.skor).cls}`}>{x.skor}</span>}
              </li>
            ))}
          </ul>
        </div>
        <table className="mt-5 w-full text-sm">
          <tbody>
            {kriteria.map((k) => {
              const [va, vb] = dua.map((x) => x.nilai[k]);
              if (va == null && vb == null) return null;
              return (
                <tr key={k} className="border-t">
                  <td className="py-2 text-gray-600">{k}</td>
                  {[va, vb].map((v, i) => (
                    <td key={i} className={`w-16 py-2 text-right tabular-nums ${v != null && v === Math.max(va ?? -1, vb ?? -1) ? "font-bold" : "text-gray-500"}`} style={{ color: v != null && v === Math.max(va ?? -1, vb ?? -1) ? WARNA[i] : undefined }}>{v ?? "–"}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href={b.href} className="flex-1 rounded-full border border-gray-300 py-3 text-center text-sm font-semibold text-gray-800 hover:border-gray-900">Lihat {b.nama}</Link>
          <Link href={`/bandingkan?k=${a.kategori}&i=${a.id},${b.id}`} className="flex-1 rounded-full bg-neutral-950 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800">Buka detail di Compare</Link>
        </div>
      </div>
    </div>
  );
}
