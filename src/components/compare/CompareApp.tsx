"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KATEGORI, tingkat, type Item, type Kat } from "@/lib/compare-shared";
import { rupiah } from "@/lib/format";
import Radar, { WARNA } from "./Radar";

type Pick = { id: string; judul: string; itemIds: string[] };
const MAX = 4;

export default function CompareApp({ kat, items, awal, picks }: { kat: Kat; items: Item[]; awal: string[]; picks: Pick[] }) {
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [ids, setIds] = useState(() => awal.filter((i) => byId.has(i)).slice(0, MAX));
  const [tab, setTab] = useState<"ringkas" | "skor" | "spek">("ringkas");
  const [pilih, setPilih] = useState(false);
  const [salin, setSalin] = useState(false);
  const kriteria = KATEGORI[kat].kriteria;
  const dipilih = ids.map((i) => byId.get(i)!).filter(Boolean);

  useEffect(() => {
    const q = new URLSearchParams({ k: kat, ...(ids.length && { i: ids.join(",") }) });
    window.history.replaceState(null, "", `/bandingkan?${q}`);
  }, [ids, kat]);

  const tambah = (id: string) => setIds((s) => (s.includes(id) || s.length >= MAX ? s : [...s, id]));
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) return navigator.share({ title: `Bandingkan ${KATEGORI[kat].label} — Tirtonic`, url }).catch(() => {});
    await navigator.clipboard.writeText(url);
    setSalin(true);
    setTimeout(() => setSalin(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Bandingkan {KATEGORI[kat].label}</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Bandingkan sampai {MAX} {KATEGORI[kat].label.toLowerCase()} berdasarkan data uji lab: {kriteria.join(", ").toLowerCase()}. Tanpa kesan subjektif, cuma angka.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(KATEGORI) as Kat[]).map((k) => (
          <Link key={k} href={`/bandingkan?k=${k}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${k === kat ? "bg-primaryDark text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {KATEGORI[k].label}
          </Link>
        ))}
      </div>

      {/* Slot */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: MAX }, (_, s) => {
          const it = dipilih[s];
          if (!it) {
            return (
              <button key={s} onClick={() => setPilih(true)} className="flex min-h-[120px] flex-col sm:min-h-[180px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-primary hover:text-primary">
                <span className="text-3xl leading-none">+</span>Tambah {KATEGORI[kat].label.toLowerCase()}
              </button>
            );
          }
          return (
            <div key={it.id} className="relative rounded-2xl border bg-white p-3" style={{ borderTop: `4px solid ${WARNA[s]}` }}>
              <button onClick={() => setIds((x) => x.filter((i) => i !== it.id))} aria-label="Hapus" className="absolute right-2 top-2 rounded-full bg-gray-100 px-2 text-gray-500 hover:bg-gray-200">×</button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.foto && <img src={it.foto} alt="" loading="lazy" className="mx-auto h-24 w-24 object-contain" />}
              <Link href={it.href} className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900 hover:text-primary">{it.nama}</Link>
              {it.varian && <p className="text-xs text-gray-500">{it.varian}</p>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <Skor n={it.skor} />
                {!it.ready && <span className="rounded bg-gray-200 px-1.5 text-[11px] font-semibold text-gray-600">Habis</span>}
              </div>
            </div>
          );
        })}
      </div>

      {dipilih.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button onClick={share} className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary">{salin ? "Link disalin ✓" : "Share"}</button>
          <button onClick={() => setIds([])} className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-red-400 hover:text-red-600">Reset</button>
        </div>
      )}

      {dipilih.length > 0 ? (
        <section className="mt-6 rounded-2xl border bg-white p-4 sm:p-6">
          <div className="mb-5 flex gap-1 overflow-x-auto border-b">
            {([["ringkas", "Ringkasan"], ["skor", "Skor detail"], ["spek", "Spesifikasi"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>{l}</button>
            ))}
          </div>
          {tab === "ringkas" && <Ringkas dipilih={dipilih} kriteria={kriteria} />}
          {tab === "skor" && <SkorDetail dipilih={dipilih} kriteria={kriteria} />}
          {tab === "spek" && <Spek dipilih={dipilih} />}
        </section>
      ) : (
        <>
          {picks.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-gray-900">Pilihan Tirtonic</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {picks.map((p) => (
                  <div key={p.id} className="rounded-2xl border bg-white p-4">
                    <p className="font-bold text-gray-900">{p.judul}</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {p.itemIds.map((i) => byId.get(i)).filter(Boolean).map((i) => (
                        <li key={i!.id} className="flex justify-between gap-2"><span className="truncate">{i!.nama}{i!.varian && ` · ${i!.varian}`}</span><Skor n={i!.skor} /></li>
                      ))}
                    </ul>
                    <button onClick={() => setIds(p.itemIds.filter((i) => byId.has(i)).slice(0, MAX))} className="mt-3 rounded-full bg-primaryDark px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary">Bandingkan ini</button>
                  </div>
                ))}
              </div>
            </section>
          )}
          <Ranking items={items} kriteria={kriteria} tambah={tambah} />
        </>
      )}

      <Legenda />
      <p className="mt-4 text-xs text-gray-500">Data: Tirtoniclab, dihimpun dari hasil uji lab independen.</p>

      {pilih && <Pemilih items={items} ids={ids} kat={kat} tutup={() => setPilih(false)} tambah={(id) => { tambah(id); setPilih(false); }} />}
    </div>
  );
}

function Skor({ n }: { n: number | null }) {
  if (n == null) return <span className="text-xs text-gray-400">Belum ada skor</span>;
  const t = tingkat(n);
  return <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${t.cls}`} title={t.label}>{n}</span>;
}

function Ringkas({ dipilih, kriteria }: { dipilih: Item[]; kriteria: readonly string[] }) {
  const ada = dipilih.map((it, s) => ({ it, warna: WARNA[s] })).filter((x) => Object.keys(x.it.nilai).length);
  return (
    <div className="grid items-center gap-6 md:grid-cols-2">
      <div className="flex justify-center">
        {ada.length ? <Radar kriteria={kriteria} seri={ada.map((x) => ({ nilai: x.it.nilai, warna: x.warna }))} /> : <p className="text-sm text-gray-500">Belum ada skor lab untuk pilihan ini. Lihat tab Spesifikasi.</p>}
      </div>
      <ul className="space-y-3">
        {dipilih.map((it, s) => (
          <li key={it.id} className="flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: WARNA[s] }} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{it.nama}{it.varian && <span className="font-normal text-gray-500"> · {it.varian}</span>}</span>
            <Skor n={it.skor} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkorDetail({ dipilih, kriteria }: { dipilih: Item[]; kriteria: readonly string[] }) {
  const baris = [{ k: "Skor total", v: (i: Item) => i.skor }, ...kriteria.map((k) => ({ k, v: (i: Item) => i.nilai[k] ?? null }))];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <Kepala dipilih={dipilih} />
        <tbody>
          {baris.map(({ k, v }) => {
            const nilai = dipilih.map(v);
            const top = dipilih.length > 1 ? Math.max(...nilai.map((x) => x ?? -1)) : -1;
            return (
              <tr key={k} className="border-t">
                <td className="py-3 pr-3 font-semibold text-gray-700">{k}</td>
                {nilai.map((n, s) => (
                  <td key={s} className="px-2 py-3">
                    {n == null ? <span className="text-gray-400">–</span> : (
                      <div>
                        <span className={`font-bold ${n === top ? "text-emerald-700" : "text-gray-900"}`}>{n}{n === top && " ★"}</span>
                        <div className="mt-1 h-1.5 rounded bg-gray-100"><div className="h-1.5 rounded" style={{ width: `${n}%`, background: WARNA[s] }} /></div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {dipilih.length > 1 && <p className="mt-2 text-xs text-gray-500">★ = terbaik di perbandingan ini</p>}
    </div>
  );
}

function Spek({ dipilih }: { dipilih: Item[] }) {
  const keys = [...new Set(dipilih.flatMap((i) => Object.keys(i.spek)))];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <Kepala dipilih={dipilih} />
        <tbody>
          <tr className="border-t"><td className="py-2.5 pr-3 font-semibold text-gray-700">Harga</td>{dipilih.map((i) => <td key={i.id} className="px-2 py-2.5 font-semibold">{rupiah(i.harga)}</td>)}</tr>
          <tr className="border-t"><td className="py-2.5 pr-3 font-semibold text-gray-700">Stok</td>{dipilih.map((i) => <td key={i.id} className={`px-2 py-2.5 ${i.ready ? "text-emerald-700" : "text-gray-500"}`}>{i.ready ? "Ready" : "Habis"}</td>)}</tr>
          {keys.map((k) => (
            <tr key={k} className="border-t">
              <td className="py-2.5 pr-3 font-semibold text-gray-700">{k}</td>
              {dipilih.map((i) => <td key={i.id} className="px-2 py-2.5 text-gray-800">{i.spek[k] ?? <span className="text-gray-400">–</span>}</td>)}
            </tr>
          ))}
          <tr className="border-t">
            <td />
            {dipilih.map((i) => (
              <td key={i.id} className="px-2 py-3">
                <Link href={i.href} className={`inline-block rounded-full px-3 py-1.5 text-xs font-semibold ${i.ready ? "bg-primaryDark text-white hover:bg-primary" : "border text-gray-600"}`}>{i.ready ? "Beli" : "Lihat produk"}</Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Kepala({ dipilih }: { dipilih: Item[] }) {
  return (
    <thead>
      <tr>
        <th className="w-36 py-2 text-left text-xs font-semibold text-gray-500">Kriteria</th>
        {dipilih.map((i, s) => (
          <th key={i.id} className="px-2 py-2 text-left text-xs font-semibold text-gray-900">
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: WARNA[s] }} />
            {i.nama}{i.varian && <span className="block font-normal text-gray-500">{i.varian}</span>}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Ranking({ items, kriteria, tambah }: { items: Item[]; kriteria: readonly string[]; tambah: (id: string) => void }) {
  const [k, setK] = useState<string>("Skor total");
  const nilai = (i: Item) => (k === "Skor total" ? i.skor : i.nilai[k]) ?? null;
  const top = items.filter((i) => nilai(i) != null).sort((a, b) => nilai(b)! - nilai(a)! || Number(b.ready) - Number(a.ready)).slice(0, 10);
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold text-gray-900">Ranking lab</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Skor total", ...kriteria].map((x) => (
          <button key={x} onClick={() => setK(x)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${x === k ? "bg-primaryDark text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{x === "Skor total" ? x : `Top ${x.toLowerCase()}`}</button>
        ))}
      </div>
      <ol className="mt-4 divide-y rounded-2xl border bg-white">
        {top.map((i, n) => (
          <li key={i.id} className="flex items-center gap-2 p-3 sm:gap-3">
            <span className="w-5 shrink-0 text-center font-bold text-gray-400">{n + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {i.foto && <img src={i.foto} alt="" loading="lazy" className="h-12 w-12 shrink-0 object-contain" />}
            <Link href={i.href} className="min-w-0 flex-1 hover:text-primary">
              <p className="line-clamp-2 text-sm font-semibold text-gray-900">{i.nama}</p>
              <p className="text-xs text-gray-500">{i.varian}{!i.ready && <span className="ml-1 rounded bg-gray-200 px-1 text-[11px] font-semibold">Habis</span>}</p>
            </Link>
            <Skor n={nilai(i)} />
            <button onClick={() => { tambah(i.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Tambah ke perbandingan" className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold text-gray-700 hover:border-primary hover:text-primary">+<span className="hidden sm:inline"> Bandingkan</span></button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Legenda() {
  return (
    <div className="mt-8 flex flex-wrap gap-3 text-xs text-gray-600">
      {[90, 76, 62, 48].map((n) => { const t = tingkat(n); return <span key={n} className="flex items-center gap-1.5"><span className={`rounded px-1.5 font-bold ${t.cls}`}>{n}</span>{t.label} ({n >= 85 ? "85+" : n >= 70 ? "70–84" : n >= 55 ? "55–69" : "<55"})</span>; })}
    </div>
  );
}

function Pemilih({ items, ids, kat, tutup, tambah }: { items: Item[]; ids: string[]; kat: Kat; tutup: () => void; tambah: (id: string) => void }) {
  const [q, setQ] = useState("");
  const kata = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hasil = items.filter((i) => !ids.includes(i.id) && kata.every((w) => `${i.nama} ${i.varian}`.toLowerCase().includes(w))).slice(0, 60);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={tutup}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b p-3">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${KATEGORI[kat].label.toLowerCase()}…`} className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary" />
          <button onClick={tutup} className="px-2 text-2xl leading-none text-gray-400" aria-label="Tutup">×</button>
        </div>
        <ul className="overflow-y-auto">
          {hasil.map((i) => (
            <li key={i.id}>
              <button onClick={() => tambah(i.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.foto ? <img src={i.foto} alt="" loading="lazy" className="h-10 w-10 shrink-0 object-contain" /> : <span className="h-10 w-10 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{i.nama}</span>
                  <span className="text-xs text-gray-500">{i.varian}{!i.ready && " · Habis"}</span>
                </span>
                <Skor n={i.skor} />
              </button>
            </li>
          ))}
          {!hasil.length && <li className="p-6 text-center text-sm text-gray-500">Tidak ketemu.</li>}
        </ul>
      </div>
    </div>
  );
}
