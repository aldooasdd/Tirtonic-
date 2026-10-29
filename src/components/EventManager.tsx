"use client";

import { useMemo, useState } from "react";
import { applyEvent, clearEvent } from "@/app/dashboard/actions";
import { rupiah } from "@/lib/format";

type P = {
  id: string; nama: string; harga: number; hargaDiskon: number | null; gambar: string[];
  kategori: string; brand: string | null; eventAktif: boolean; eventCarousel: boolean; diskonPersen: number; eventNama: string | null;
};

export default function EventManager({ products }: { products: P[] }) {
  const [q, setQ] = useState("");
  const [kat, setKat] = useState("");
  const kategoris = useMemo(() => [...new Set(products.map((p) => p.kategori))].sort(), [products]);
  const aktif = products.filter((p) => p.eventAktif);

  const list = products.filter((p) => {
    if (kat && p.kategori !== kat) return false;
    if (q && !p.nama.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {aktif.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-3 text-sm font-bold text-gray-900">Lagi event ({aktif.length})</p>
          <div className="space-y-2">
            {aktif.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.gambar[0]} alt="" className="h-10 w-10 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.nama}</p>
                  <p className="text-xs text-gray-500">{p.eventNama ? `${p.eventNama} · ` : ""}-{p.diskonPersen}% → {p.hargaDiskon ? rupiah(p.hargaDiskon) : rupiah(p.harga)}{p.eventCarousel ? " · di carousel" : ""}</p>
                </div>
                <form action={clearEvent.bind(null, p.id)}>
                  <button className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Hapus</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <form action={applyEvent} className="space-y-4">
        <div>
          <label className="label">Nama promo / event</label>
          <input name="eventNama" placeholder="mis. Promo Akhir Tahun" className="field" />
          <p className="mt-1 text-xs text-gray-400">Jadi judul carousel di landing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" className="field flex-1 min-w-[180px]" />
          <select value={kat} onChange={(e) => setKat(e.target.value)} className="field w-auto">
            <option value="">Semua kategori</option>
            {kategoris.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <div className="max-h-[360px] space-y-1 overflow-y-auto rounded-xl border p-2">
          {list.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-400">Tidak ada produk.</p>
          ) : list.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
              <input type="checkbox" name="eventIds" value={p.id} defaultChecked={p.eventAktif} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.gambar[0]} alt="" className="h-10 w-10 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{p.nama}</p>
                <p className="text-xs text-gray-400">{p.kategori}{p.brand ? ` · ${p.brand}` : ""} · {rupiah(p.harga)}</p>
              </div>
              {p.eventAktif && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">EVENT</span>}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl bg-primary/5 p-4">
          <div>
            <label className="label">Potongan (%)</label>
            <input name="diskonPersen" type="number" min={1} max={90} required placeholder="mis. 20" className="field w-32" />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-gray-700">
            <input type="checkbox" name="eventCarousel" /> Tampilkan di carousel landing
          </label>
          <button className="btn-green ml-auto">Terapkan Event</button>
        </div>
        <p className="text-xs text-gray-400">Produk tercentang di-set diskon segini. Centang yang sudah event tetap dipertahankan; uncheck TIDAK menghapus event — pakai tombol &quot;Hapus&quot; di atas.</p>
      </form>
    </div>
  );
}
