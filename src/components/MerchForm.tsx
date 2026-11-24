"use client";

import { useState, useTransition } from "react";
import { setMerch } from "@/app/dashboard/rak/actions";

type Item = { id: string; nama: string; foto: string | null; kategori: string; stok: number | null; dipakai: boolean };

/** Pilih barang yang boleh diambil gratis oleh pembeli produk rak. */
export default function MerchForm({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const found = items.filter((x) => !x.dipakai && words.every((w) => `${x.nama} ${x.kategori}`.toLowerCase().includes(w)));
  const dipakai = items.filter((x) => x.dipakai);
  const ubah = (id: string, on: boolean) => start(async () => {
    setErr("");
    const r = await setMerch(id, on).catch(() => ({ error: "Gagal menyimpan. Coba lagi." }));
    if (r.error) setErr(r.error);
  });
  const baris = (x: Item) => (
    <li key={x.id} className="flex items-center gap-3 border-b px-3 py-2 text-sm last:border-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {x.foto ? <img loading="lazy" src={x.foto} alt="" className="size-9 shrink-0 rounded-lg border object-cover" /> : <span className="size-9 shrink-0 rounded-lg border bg-gray-50" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{x.nama}</span>
        <span className={`block text-xs ${x.stok === 0 ? "text-red-600" : "text-gray-500"}`}>{x.kategori} · {x.stok == null ? "stok tak dibatasi" : x.stok > 0 ? `stok ${x.stok}` : "stok habis, tidak tampil"}</span>
      </span>
      <button type="button" disabled={busy} onClick={() => ubah(x.id, !x.dipakai)} className={`min-h-9 shrink-0 rounded-full border px-4 text-xs font-semibold disabled:opacity-50 ${x.dipakai ? "border-red-200 text-red-600" : "border-primary text-primary hover:bg-primary hover:text-white"}`}>{x.dipakai ? "Hapus" : "Jadikan bonus"}</button>
    </li>
  );
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="min-w-0">
        <label className="label" htmlFor="merch-cari">Cari barang</label>
        <input id="merch-cari" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama atau kategori, mis. kaos kaki" className="field" autoComplete="off" />
        <ul className="mt-2 max-h-72 overflow-y-auto rounded-xl border">
          {found.length === 0 && <li className="p-4 text-sm text-gray-400">Tidak ada barang yang cocok.</li>}
          {found.slice(0, 60).map(baris)}
          {found.length > 60 && <li className="p-3 text-xs text-gray-500">{found.length - 60} barang lain, persempit pencarian.</li>}
        </ul>
      </div>
      <div className="min-w-0">
        <p className="label">Bonus aktif ({dipakai.length})</p>
        <ul className="max-h-80 overflow-y-auto rounded-xl border">
          {dipakai.length === 0 ? <li className="p-4 text-sm text-gray-400">Belum ada. Popup bonus tidak muncul.</li> : dipakai.map(baris)}
        </ul>
        {err && <p role="status" className="mt-2 text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
