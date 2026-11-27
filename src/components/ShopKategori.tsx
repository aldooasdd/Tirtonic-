"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard, { type ProductCardData } from "./ProductCard";

type Opsi = { nilai: string; label: string; jumlah: number };
type Grup = { key: string; label: string; type: "multi" | "min"; lab: boolean; opsi: Opsi[] };

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
  const [harga, setHarga] = useState(() => (sp.get("harga") || "-").split("-"));
  useEffect(() => setHarga((sp.get("harga") || "-").split("-")), [sp]);

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
    if (k === "harga") { const [a, b] = v.split("-"); pill.push({ teks: `Rp ${a ? (+a).toLocaleString("id-ID") : "0"} – ${b ? `Rp ${(+b).toLocaleString("id-ID")}` : "∞"}`, hapus: () => set("harga", null) }); }
    else if (k === "ready") pill.push({ teks: "Ready stok", hapus: () => set(k, null) });
    else if (k === "diskon") pill.push({ teks: "Sedang diskon", hapus: () => set(k, null) });
    else if (g?.type === "min") pill.push({ teks: `${g.label} ${v}+`, hapus: () => set(k, null) });
    else if (g) for (const x of v.split(",").filter(Boolean)) pill.push({ teks: x, hapus: () => toggle(k, x) });
  }

  const panel = (
    <div>
      <div className="flex items-baseline justify-between border-b pb-3">
        <h2 className="text-lg font-bold text-gray-900">Filter <span className="text-sm font-normal text-gray-400">· {total} produk</span></h2>
        {aktif > 0 && <button onClick={() => go(new URLSearchParams(sp.get("sort") ? { sort: sp.get("sort")! } : {}))} className="text-sm font-semibold text-primary">Hapus filter</button>}
      </div>

      <Bagian judul="Harga" buka>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); set("harga", harga[0] || harga[1] ? `${harga[0] || ""}-${harga[1] || ""}` : null); }}
        >
          <input inputMode="numeric" placeholder="Min" value={harga[0] ?? ""} onChange={(e) => setHarga([e.target.value.replace(/\D/g, ""), harga[1]])} className="w-full rounded-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
          <span className="text-gray-400">–</span>
          <input inputMode="numeric" placeholder="Max" value={harga[1] ?? ""} onChange={(e) => setHarga([harga[0], e.target.value.replace(/\D/g, "")])} className="w-full rounded-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
          <button className="rounded-full bg-primaryDark px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary">OK</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => set("ready", sp.get("ready") ? null : "1")} className={chip(!!sp.get("ready"))}>Ready stok</button>
          <button onClick={() => set("diskon", sp.get("diskon") ? null : "1")} className={chip(!!sp.get("diskon"))}>Sedang diskon</button>
        </div>
      </Bagian>

      {grup.filter((g) => !g.lab).map((g) => (
        <Bagian key={g.key} judul={g.label} buka={g.key === "brand" || !!sp.get(g.key)}>
          <div className="flex flex-wrap gap-2">
            {g.opsi.map((o) => (
              <button key={o.nilai} onClick={() => toggle(g.key, o.nilai)} className={chip(pilih(g.key).includes(o.nilai))}>
                {o.label} <span className="text-xs opacity-60">({o.jumlah})</span>
              </button>
            ))}
          </div>
        </Bagian>
      ))}

      {grup.some((g) => g.lab) && (
        <Bagian judul="Skor Tirtoniclab" buka={grup.some((g) => g.lab && sp.get(g.key))}>
          <p className="mb-3 rounded-lg bg-ball/15 px-3 py-2 text-xs text-gray-700">Skor uji lab 0–100. Hanya produk yang punya data lab ikut tersaring.</p>
          <div className="space-y-3">
            {grup.filter((g) => g.lab).map((g) => (
              <div key={g.key}>
                <p className="mb-1.5 text-sm font-semibold text-gray-700">{g.label}</p>
                <div className="flex flex-wrap gap-2">
                  {g.opsi.map((o) => (
                    <button key={o.nilai} onClick={() => set(g.key, sp.get(g.key) === o.nilai ? null : o.nilai)} className={chip(sp.get(g.key) === o.nilai)}>
                      {o.label} <span className="text-xs opacity-60">({o.jumlah})</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Bagian>
      )}
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
          <div role="dialog" aria-modal="true" aria-label="Filter" onClick={(e) => e.stopPropagation()} className="sheet-in flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="relative flex justify-center pb-1 pt-3">
              <span className="h-1.5 w-10 rounded-full bg-gray-300" />
              <button onClick={() => setLaci(false)} aria-label="Tutup" className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">{panel}</div>
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
