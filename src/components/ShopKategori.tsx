"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard, { type ProductCardData } from "./ProductCard";

type Opsi = { nilai: string; label: string; jumlah: number };
type Grup = { key: string; label: string; type: "multi" | "range"; grup?: string; opsi: Opsi[]; min?: number; max?: number; step?: number; unit?: string };
const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const teksAngka = (g: Grup, n: number) => (g.key === "harga" ? rp(n) : `${n}${g.unit ? ` ${g.unit}` : ""}`);

const SORT = [
  { v: "", l: "Populer" },
  { v: "newest", l: "Terbaru" },
  { v: "price_asc", l: "Harga terendah" },
  { v: "price_desc", l: "Harga tertinggi" },
];

export default function ShopKategori({ slug, grup, produk, total, lab }: { slug: string; grup: Grup[]; produk: ProductCardData[]; total: number; lab: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [laci, setLaci] = useState(false);
  // swipe ke bawah untuk menutup bottom sheet (hanya kalau isi sudah di posisi paling atas)
  const [tarik, setTarik] = useState(0);
  const awal = useRef<number | null>(null);
  const isi = useRef<HTMLDivElement>(null);
  const geser = {
    onTouchStart: (e: React.TouchEvent) => { awal.current = (isi.current?.scrollTop ?? 0) <= 0 && !(e.target as HTMLElement).closest(".dual-range") ? e.touches[0].clientY : null; },
    onTouchMove: (e: React.TouchEvent) => { if (awal.current != null) setTarik(Math.max(0, e.touches[0].clientY - awal.current)); },
    onTouchEnd: () => { if (tarik > 100) setLaci(false); setTarik(0); awal.current = null; },
  };

  const go = (next: URLSearchParams) => router.push(`/shop/${slug}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v);
    else n.delete(k);
    go(n);
  };
  const pilih = (k: string) => (sp.get(k) || "").split(",").filter(Boolean);
  const toggle = (k: string, v: string) => {
    const s = pilih(k);
    set(k, (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]).join(",") || null);
  };
  const aktif = [...sp.keys()].filter((k) => k !== "sort").length;

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "border-primaryDark bg-primaryDark text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary"}`;

  // Pill filter aktif di atas grid (klik = hapus satu).
  const label = new Map(grup.map((g) => [g.key, g]));
  const pill: { teks: string; hapus: () => void }[] = [];
  for (const [k, v] of sp.entries()) {
    if (k === "sort") continue;
    const g = label.get(k);
    if (k === "ready") pill.push({ teks: "Ready stok", hapus: () => set(k, null) });
    else if (k === "diskon") pill.push({ teks: "Sedang diskon", hapus: () => set(k, null) });
    else if (g?.type === "range") {
      const [a, b = ""] = v.split("-");
      pill.push({ teks: `${g.label}: ${a ? teksAngka(g, +a) : "min"} – ${b ? teksAngka(g, +b) : "maks"}`, hapus: () => set(k, null) });
    }
    else if (g) for (const x of v.split(",").filter(Boolean)) pill.push({ teks: x, hapus: () => toggle(k, x) });
  }

  // Filter ber-grup sama (Spesifikasi, Data expert, Skor Tirtoniclab) digabung dalam satu bagian, seperti sidebar Extreme.
  const bagian: { judul: string; isi: Grup[] }[] = [];
  for (const g of grup) {
    const judul = g.grup ?? g.label, ada = bagian.find((b) => b.judul === judul);
    if (ada) ada.isi.push(g);
    else bagian.push({ judul, isi: [g] });
  }
  const isiGrup = (g: Grup) => g.type === "range" ? <Rentang g={g} nilai={sp.get(g.key)} ubah={(v) => set(g.key, v)} /> : (
    <div className="flex flex-wrap gap-2">
      {g.opsi.map((o) => (
        <button key={o.nilai} onClick={() => toggle(g.key, o.nilai)} className={chip(pilih(g.key).includes(o.nilai))}>
          {o.label} <span className="text-xs opacity-60">({o.jumlah})</span>
        </button>
      ))}
    </div>
  );

  const panel = (
    <div>
      <div className="flex items-baseline justify-between border-b pb-3">
        <h2 className="text-lg font-bold text-gray-900">Filter <span className="text-sm font-normal text-gray-400">· {total} produk</span></h2>
        {aktif > 0 && <button onClick={() => go(new URLSearchParams(sp.get("sort") ? { sort: sp.get("sort")! } : {}))} className="text-sm font-semibold text-primary">Hapus filter</button>}
      </div>

      {bagian.map((b, i) => (
        <Fragment key={b.judul}>
          <Bagian judul={b.judul} buka={b.isi.some((g) => g.key === "brand" || g.key === "harga" || !!sp.get(g.key))}>
            {b.isi.length === 1 && !b.isi[0].grup ? isiGrup(b.isi[0]) : (
              <div className="space-y-5">
                {b.judul === "Skor Tirtoniclab" && <p className="rounded-lg bg-ball/15 px-3 py-2 text-xs text-gray-700">Skor uji lab 0–100. Hanya produk yang punya data lab ikut tersaring.</p>}
                {b.isi.map((g) => <div key={g.key}><p className="mb-2 text-sm font-semibold text-gray-700">{g.label}</p>{isiGrup(g)}</div>)}
              </div>
            )}
          </Bagian>
          {i === 0 && (
            <Bagian judul="Ketersediaan" buka={!!(sp.get("ready") || sp.get("diskon"))}>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => set("ready", sp.get("ready") ? null : "1")} className={chip(!!sp.get("ready"))}>Ready stok</button>
                <button onClick={() => set("diskon", sp.get("diskon") ? null : "1")} className={chip(!!sp.get("diskon"))}>Sedang diskon</button>
              </div>
            </Bagian>
          )}
        </Fragment>
      ))}
    </div>
  );

  const sort = (
    <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm">
      <span className="text-gray-500">Urutkan:</span>
      <select value={sp.get("sort") || ""} onChange={(e) => set("sort", e.target.value || null)} className="cursor-pointer bg-transparent font-medium text-gray-800 outline-none">
        {SORT.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        {lab && <option value="skor">Skor Tirtoniclab</option>}
        {sp.get("sort")?.startsWith("lab_") && <option value={sp.get("sort")!}>Top {sp.get("sort")!.slice(4).toLowerCase()}</option>}
      </select>
    </label>
  );

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="hidden md:sticky md:top-24 md:block md:max-h-[calc(100vh-7rem)] md:w-64 md:shrink-0 md:self-start md:overflow-y-auto">{panel}</aside>

      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => setLaci(true)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 md:hidden">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
            Filter{aktif > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{aktif}</span>}
          </button>
          <p className="hidden text-sm text-gray-500 md:block"><span className="font-bold text-gray-900">{total}</span> produk</p>
          {sort}
        </div>
        {pill.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {pill.map((x, i) => (
              <button key={i} onClick={x.hapus} className="inline-flex items-center gap-1.5 rounded-full bg-primaryDark/5 px-3 py-1.5 text-sm font-medium text-primaryDark ring-1 ring-primaryDark/15 hover:bg-primaryDark/10">
                {x.teks}<span aria-hidden className="text-base leading-none">×</span>
              </button>
            ))}
            <button onClick={() => go(new URLSearchParams(sp.get("sort") ? { sort: sp.get("sort")! } : {}))} className="px-2 text-sm font-semibold text-gray-500 underline-offset-2 hover:underline">Hapus semua</button>
          </div>
        )}
        {produk.length ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {produk.map((p) => <ProductCard key={p.id} p={p} hoverExpand />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed py-20 text-center">
            <p className="font-semibold text-gray-900">Tidak ada produk yang cocok</p>
            <p className="mt-1 text-sm text-gray-500">Coba kurangi filter.</p>
          </div>
        )}
      </div>

      {laci && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setLaci(false)}>
          {/* bottom sheet: muncul dari bawah (.sheet-in di globals.css) */}
          <div role="dialog" aria-modal="true" aria-label="Filter" onClick={(e) => e.stopPropagation()} {...geser} style={{ transform: tarik ? `translateY(${tarik}px)` : undefined, transition: tarik ? "none" : "transform .2s" }} className="sheet-in flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="relative flex justify-center pb-1 pt-3">
              <span className="h-1.5 w-10 rounded-full bg-gray-300" />
              <button onClick={() => setLaci(false)} aria-label="Tutup" className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div ref={isi} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">{panel}</div>
            <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setLaci(false)} className="w-full rounded-full bg-neutral-950 py-3 font-semibold text-white">Lihat {total} produk</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bagian({ judul, buka = false, children }: { judul: string; buka?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(buka);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group border-b py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-900">
        {judul}
        <svg className="h-4 w-4 text-gray-400 transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

/** Slider rentang dua kenop + kotak angka. Kirim ke URL saat kenop dilepas / angka dikonfirmasi. */
function Rentang({ g, nilai, ubah }: { g: Grup; nilai: string | null; ubah: (v: string | null) => void }) {
  const lo = g.min!, hi = g.max!, st = g.step!;
  const baca = (): [number, number] => { const [a, b = ""] = (nilai || "").split("-"); return [a ? Math.max(lo, +a) : lo, b ? Math.min(hi, +b) : hi]; };
  const [v, setV] = useState(baca);
  const kini = useRef(v);
  kini.current = v;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setV(baca()), [nilai, lo, hi]);
  const kirim = () => {
    const [a, b] = [...kini.current].sort((x, y) => x - y);
    const s = `${a > lo ? a : ""}-${b < hi ? b : ""}`;
    if (s !== "-" ? s !== nilai : nilai) ubah(s === "-" ? null : s);
  };
  const pct = (n: number) => ((n - lo) / (hi - lo)) * 100;
  const [a, b] = [Math.min(...v), Math.max(...v)];
  return (
    <div>
      <div className="dual-range relative h-6">
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200" />
        <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primaryDark" style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }} />
        {[0, 1].map((i) => (
          <input key={i} type="range" min={lo} max={hi} step={st} value={v[i]} aria-label={`${g.label} ${i ? "maksimal" : "minimal"}`}
            onChange={(e) => { const n: [number, number] = [...v]; n[i] = +e.target.value; setV(n); }}
            onPointerUp={kirim} onKeyUp={kirim} onTouchEnd={kirim} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        {[a, b].map((n, i) => (
          <Fragment key={i}>
            {i === 1 && <span className="text-gray-400">–</span>}
            <input inputMode="decimal" value={g.key === "harga" ? n.toLocaleString("id-ID") : n} aria-label={`${g.label} ${i ? "maksimal" : "minimal"}`}
              onChange={(e) => { const x = +e.target.value.replace(g.key === "harga" ? /\D/g : /[^\d.]/g, ""); setV(i ? [a, x] : [x, b]); }}
              onBlur={kirim} onKeyDown={(e) => e.key === "Enter" && kirim()}
              className="w-full min-w-0 rounded-full border border-gray-200 px-3 py-1.5 text-center tabular-nums outline-none focus:border-primary" />
          </Fragment>
        ))}
        {g.key !== "harga" && g.unit && <span className="shrink-0 text-gray-500">{g.unit}</span>}
      </div>
    </div>
  );
}
