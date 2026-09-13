"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { KATEGORI, SHOE_SIZES } from "@/lib/constants";

type ProductInput = {
  id: string;
  nama: string;
  kategori: string;
  brand: string | null;
  harga: number;
  deskripsi: string | null;
  ukuran: string[];
  gambar: string[];
  status: "READY" | "SOLD";
};

function SaveBtn({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green disabled:opacity-60">
      {pending ? "Menyimpan..." : edit ? "Simpan Perubahan" : "Tambah Produk"}
    </button>
  );
}

export default function ProductForm({
  action,
  product,
}: {
  action: (fd: FormData) => void | Promise<void>;
  product?: ProductInput;
}) {
  const edit = Boolean(product);
  const [kategori, setKategori] = useState(product?.kategori || KATEGORI[0]);
  const isShoe = kategori === "Sepatu Tenis";

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nama Produk *</label>
          <input name="nama" required defaultValue={product?.nama} className="field" />
        </div>
        <div>
          <label className="label">Kategori *</label>
          <select
            name="kategori"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="field"
          >
            {KATEGORI.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Brand</label>
          <input name="brand" defaultValue={product?.brand || ""} className="field" />
        </div>
        <div>
          <label className="label">Harga (Rp) *</label>
          <input name="harga" type="number" required defaultValue={product?.harga} className="field" />
        </div>
      </div>

      <div>
        <label className="label">Deskripsi</label>
        <textarea name="deskripsi" rows={3} defaultValue={product?.deskripsi || ""} className="field" />
      </div>

      {isShoe && (
        <div>
          <label className="label">Ukuran tersedia</label>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
            {SHOE_SIZES.map((s) => (
              <label key={s} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="ukuran"
                  value={s}
                  defaultChecked={product?.ukuran.includes(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label">Status Stok</label>
        <select name="status" defaultValue={product?.status || "READY"} className="field w-40">
          <option value="READY">Ready</option>
          <option value="SOLD">Sold</option>
        </select>
      </div>

      <div>
        <label className="label">Gambar (bisa pilih beberapa)</label>
        {edit && product!.gambar.length > 0 && (
          <div className="mb-2 flex gap-2">
            {product!.gambar.map((g) => (
              <span key={g} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g} alt="" className="h-16 w-16 border object-contain" />
                <input type="hidden" name="existingGambar" value={g} />
              </span>
            ))}
          </div>
        )}
        <input name="gambar" type="file" accept="image/*" multiple className="text-sm" />
        {edit && <p className="mt-1 text-xs text-gray-400">Gambar baru akan ditambahkan ke gambar lama.</p>}
      </div>

      <SaveBtn edit={edit} />
    </form>
  );
}
