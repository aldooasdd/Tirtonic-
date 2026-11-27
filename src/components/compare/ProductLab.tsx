"use client";
import { useState } from "react";
import Link from "next/link";
import { KATEGORI, tingkat, type Item } from "@/lib/compare-shared";
import { rupiah } from "@/lib/format";
import { useShopCart, type CartItem } from "../ShopCartProvider";
import Radar, { WARNA } from "./Radar";

/** Data lab di halaman produk: radar + skor + spesifikasi utama + tombol Bandingkan. */
export type Serupa = Item & { beli: Omit<CartItem, "key"> | null };

export default function ProductLab({ items, serupa = [] }: { items: Item[]; serupa?: Serupa[] }) {
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
        <div className="mt-12 rounded-3xl bg-gray-50 p-4 sm:p-6">
          <h3 className="mb-4 text-base font-bold text-gray-900">{JUDUL_SERUPA[it.kategori]}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {serupa.map((s) => <Serupa key={s.id} s={s} kategori={it.kategori} ini={it.id} />)}
          </div>
        </div>
      )}
    </section>
  );
}

const JUDUL_SERUPA: Record<string, string> = { raket: "Raket serupa", senar: "Senar serupa", sepatu: "Sepatu serupa" };

/** Satu produk serupa: foto, nama, harga, tombol keranjang & compare. */
function Serupa({ s, kategori, ini }: { s: Serupa; kategori: string; ini: string }) {
  const { add } = useShopCart();
  const [ok, setOk] = useState(false);
  const t = s.skor != null ? tingkat(s.skor) : null;
  const tombol = "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-gray-900 hover:text-gray-900";
  const cart = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
  return (
    <div className="flex items-center gap-3">
      <Link href={s.href} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white">
        {s.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        {t && <span className={`absolute left-1 top-1 rounded px-1.5 text-[11px] font-bold ${t.cls}`}>{s.skor}</span>}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={s.href} className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 hover:underline">{s.nama}</Link>
        <p className="mt-0.5 text-sm text-gray-600">{s.ready ? rupiah(s.harga) : <span className="text-gray-400">Sold out</span>}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        {s.beli ? (
          <button onClick={() => { add(s.beli!); setOk(true); setTimeout(() => setOk(false), 1500); }} aria-label="Tambah ke keranjang" title="Tambah ke keranjang" className={`${tombol} ${ok ? "border-emerald-600 text-emerald-700" : ""}`}>
            {ok ? "✓" : cart}
          </button>
        ) : s.ready ? (
          <Link href={s.href} aria-label="Pilih varian lalu tambah ke keranjang" title="Pilih varian" className={tombol}>{cart}</Link>
        ) : null}
        <Link href={`/bandingkan?k=${kategori}&i=${ini},${s.id}`} aria-label="Bandingkan" title="Bandingkan" className={tombol}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </Link>
      </div>
    </div>
  );
}
