"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { KATEGORI, SHOE_SIZES } from "@/lib/constants";
import { importFromTokopedia } from "@/app/dasbord/actions";

type ProductInput = {
  id: string;
  nama: string;
  kategori: string;
  brand: string | null;
  harga: number;
  deskripsi: string | null;
  ukuran: string[];
  gambar: string[];
  sizeChart?: string | null;
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

  // Controlled fields so the Tokopedia importer can fill them in.
  const [nama, setNama] = useState(product?.nama || "");
  const [kategori, setKategori] = useState(product?.kategori || KATEGORI[0]);
  const [brand, setBrand] = useState(product?.brand || "");
  const [harga, setHarga] = useState(product?.harga ? String(product.harga) : "");
  const [deskripsi, setDeskripsi] = useState(product?.deskripsi || "");
  const [ukuran, setUkuran] = useState<string[]>(product?.ukuran || []);
  const [images, setImages] = useState<string[]>(product?.gambar || []); // existing + imported URLs
  const [sizeChart, setSizeChart] = useState<string | null>(product?.sizeChart ?? null);
  const isShoe = kategori === "Sepatu Tenis";

  // Importer UI state
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleUkuran = (s: string) =>
    setUkuran((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  async function handleImport() {
    if (!url.trim()) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const d = await importFromTokopedia(url.trim());
      if ("error" in d) {
        setImportMsg({ ok: false, text: d.error });
        return;
      }
      setNama(d.nama);
      setKategori(d.kategori);
      setBrand(d.brand || "");
      setHarga(String(d.harga));
      setDeskripsi(d.deskripsi || "");
      setUkuran(d.ukuran);
      setImages((prev) => [...prev, ...d.gambar]);
      if (d.sizeChart) setSizeChart(d.sizeChart);
      setImportMsg({
        ok: true,
        text: `Berhasil: ${d.nama} · ${d.gambar.length} foto${d.ukuran.length ? ` · ${d.ukuran.length} size` : ""}${d.sizeChart ? " · size chart ✓" : ""}. Cek lalu simpan.`,
      });
    } catch (e) {
      setImportMsg({ ok: false, text: e instanceof Error ? e.message : "Gagal impor." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tokopedia importer */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <label className="label">Impor cepat dari link Tokopedia</label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tokopedia.com/tirtonic/..."
            className="field flex-1"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !url.trim()}
            className="btn-green shrink-0 disabled:opacity-60"
          >
            {importing ? "Mengambil..." : "Ambil data"}
          </button>
        </div>
        {importMsg && (
          <p className={`mt-2 text-xs ${importMsg.ok ? "text-primary" : "text-red-600"}`}>{importMsg.text}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">Nama, harga, deskripsi, size &amp; foto akan terisi otomatis. Kamu masih bisa edit sebelum simpan.</p>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nama Produk *</label>
            <input name="nama" required value={nama} onChange={(e) => setNama(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label">Kategori *</label>
            <select name="kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className="field">
              {KATEGORI.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Brand</label>
            <input name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label">Harga (Rp) *</label>
            <input name="harga" type="number" required value={harga} onChange={(e) => setHarga(e.target.value)} className="field" />
          </div>
        </div>

        <div>
          <label className="label">Deskripsi</label>
          <textarea name="deskripsi" rows={4} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className="field" />
        </div>

        {isShoe && (
          <div>
            <label className="label">Ukuran tersedia</label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {SHOE_SIZES.map((s) => (
                <label key={s} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="ukuran" value={s} checked={ukuran.includes(s)} onChange={() => toggleUkuran(s)} />
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
          {images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {images.map((g) => (
                <span key={g} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g} alt="" className="h-16 w-16 border object-contain" />
                  <input type="hidden" name="existingGambar" value={g} />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((x) => x !== g))}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                    aria-label="Hapus gambar"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input name="gambar" type="file" accept="image/*" multiple className="text-sm" />
          <p className="mt-1 text-xs text-gray-400">Gambar baru akan ditambahkan ke gambar di atas.</p>
        </div>

        <div>
          <label className="label">Size Chart (muncul sebagai popup di halaman produk)</label>
          {sizeChart && (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sizeChart} alt="" className="h-20 w-20 rounded-lg border object-cover" />
              <input type="hidden" name="sizeChartUrl" value={sizeChart} />
              <button type="button" onClick={() => setSizeChart(null)} className="text-xs text-red-500 hover:underline">
                Hapus size chart
              </button>
            </div>
          )}
          <input name="sizeChartFile" type="file" accept="image/*" className="text-sm" />
          <p className="mt-1 text-xs text-gray-400">Otomatis terisi saat impor dari Tokopedia. Upload di sini untuk ganti/isi manual.</p>
        </div>

        <SaveBtn edit={edit} />
      </form>
    </div>
  );
}
