"use client";

import { useState } from "react";

// Input varian produk PO: UI sama seperti produk biasa (editable per-baris), tanpa
// kolom Diskon (PreorderVariant tak punya hargaDiskon). Emit field array
// v_warna / v_ukuran / v_harga / v_stok / v_existingGambar (foto lama) / v_gambar (file)
// — server align per index (lihat parsePreorderVariants). Checkbox "punya varian"
// → hidden hasVariants. Saat edit, varian lama di-preload lewat defaultVariants.
type Row = { key: string; warna: string; ukuran: string; harga: string; stok: string; gambar: string | null };
type DefaultVariant = { warna: string; ukuran: string | null; harga: number; stok: number; gambar: string | null };
let k = 0;
const newRow = (): Row => ({ key: `v${k++}`, warna: "", ukuran: "", harga: "", stok: "", gambar: null });

export default function PreorderVariantInput({ defaultLabel = "", defaultVariants = [] }: { defaultLabel?: string; defaultVariants?: DefaultVariant[] }) {
  const init: Row[] = defaultVariants.map((v) => ({
    key: `v${k++}`, warna: v.warna, ukuran: v.ukuran ?? "", harga: String(v.harga), stok: String(v.stok), gambar: v.gambar,
  }));
  const [has, setHas] = useState(init.length > 0);
  const [label, setLabel] = useState(defaultLabel);
  const [rows, setRows] = useState<Row[]>(init.length ? init : [newRow()]);
  const [bulk, setBulk] = useState("");

  const set = (i: number, field: keyof Row, val: string | null) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const applyBulk = () => {
    const v = bulk.replace(/\D/g, "");
    if (v) setRows((prev) => prev.map((r) => ({ ...r, harga: v })));
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <label className="flex items-center gap-2 font-semibold text-gray-900">
        <input type="checkbox" checked={has} onChange={(e) => setHas(e.target.checked)} />
        Produk punya varian (warna / ukuran)
      </label>
      {has && <input type="hidden" name="hasVariants" value="1" />}

      {has && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Nama atribut varian</label>
            <input name="varianLabel" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Warna / Ukuran / Edisi" className="field" />
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-primary/5 p-3">
            <div className="flex-1">
              <label className="label">Set harga semua varian (Rp)</label>
              <input type="number" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="mis. 150000" className="field" />
            </div>
            <button type="button" onClick={applyBulk} className="btn-green shrink-0">Terapkan ke semua</button>
          </div>

          {rows.map((v, i) => (
            <div key={v.key} className="rounded-lg border bg-gray-50 p-3">
              <div className="grid gap-2 sm:grid-cols-4">
                <div>
                  <label className="label">Warna *</label>
                  <input name="v_warna" value={v.warna} onChange={(e) => set(i, "warna", e.target.value)} placeholder="mis. Hijau" className="field" />
                </div>
                <div>
                  <label className="label">Ukuran / Size</label>
                  <input name="v_ukuran" value={v.ukuran} onChange={(e) => set(i, "ukuran", e.target.value)} placeholder="mis. L / 42" className="field" />
                </div>
                <div>
                  <label className="label">Harga (Rp) *</label>
                  <input name="v_harga" type="number" value={v.harga} onChange={(e) => set(i, "harga", e.target.value)} placeholder="174000" className="field" />
                </div>
                <div>
                  <label className="label">Stok</label>
                  <input name="v_stok" type="number" value={v.stok} onChange={(e) => set(i, "stok", e.target.value)} placeholder="16" className="field" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                {v.gambar ? (
                  <span className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={v.gambar} alt="" className="h-12 w-12 rounded border object-contain" />
                    <input type="hidden" name="v_existingGambar" value={v.gambar} />
                    <button type="button" onClick={() => set(i, "gambar", null)} className="text-xs text-red-500 hover:underline">Hapus foto</button>
                  </span>
                ) : (
                  <input type="hidden" name="v_existingGambar" value="" />
                )}
                <label className="text-xs text-gray-500">
                  Foto varian: <input name="v_gambar" type="file" accept="image/*" className="text-xs" />
                </label>
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="ml-auto text-xs font-semibold text-red-500 hover:underline">
                    Hapus baris
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setRows((prev) => [...prev, newRow()])} className="rounded-full border px-4 py-2 text-sm font-semibold text-primary hover:border-primary">
            + Tambah varian
          </button>
          <p className="text-xs text-gray-400">Satu baris = satu kombinasi warna/ukuran. Tiap baris wajib ada warna + harga.</p>
        </div>
      )}
    </div>
  );
}
