"use client";

import { useState } from "react";

// Input varian produk PO: UI sama seperti produk biasa, tanpa kolom Diskon.
// Emit field array v_warna / v_ukuran / v_harga / v_stok / v_gambar (file) agar
// server action memparsenya (lihat createPreorderProduct). Checkbox "punya varian"
// → hidden input hasVariants biar server tahu produk ini pakai varian.
type Row = { key: string; warna: string; ukuran: string; harga: string; stok: string };
let k = 0;
const newRow = (): Row => ({ key: `v${k++}`, warna: "", ukuran: "", harga: "", stok: "" });

export default function PreorderVariantInput() {
  const [has, setHas] = useState(false);
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [bulk, setBulk] = useState("");

  const set = (i: number, field: keyof Row, val: string) =>
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
                  <input name="v_warna" value={v.warna} onChange={(e) => set(i, "warna", e.target.value)} placeholder="Biru" className="field" />
                </div>
                <div>
                  <label className="label">Ukuran</label>
                  <input name="v_ukuran" value={v.ukuran} onChange={(e) => set(i, "ukuran", e.target.value)} placeholder="42 (opsional)" className="field" />
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
                <label className="text-xs text-gray-500">
                  Foto warna: <input name="v_gambar" type="file" accept="image/*" className="text-xs" />
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
          <p className="text-xs text-gray-400">
            Satu baris = satu kombinasi. Untuk warna yang punya beberapa ukuran, buat baris per ukuran dengan warna sama. Foto cukup diisi di salah satu baris tiap warna.
          </p>
        </div>
      )}
    </div>
  );
}
