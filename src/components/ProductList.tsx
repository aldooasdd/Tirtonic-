"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";
import ProductRowActions from "./ProductRowActions";

type P = { id: string; nama: string; kategori: string; harga: number; status: "READY" | "SOLD"; gambar: string[]; habis?: boolean };

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "ready", label: "Ready" },
  { key: "habis", label: "Habis" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

export default function ProductList({ products }: { products: P[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const query = q.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (filter === "habis" && !p.habis) return false;
    if (filter === "ready" && p.habis) return false;
    if (query && !(p.nama.toLowerCase().includes(query) || p.kategori.toLowerCase().includes(query))) return false;
    return true;
  });
  const habisCount = products.filter((p) => p.habis).length;

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-gray-900">Daftar Produk</h2>
          <div className="flex rounded-full border p-0.5 text-xs font-semibold">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1 transition ${filter === f.key ? "bg-primary text-white" : "text-gray-500 hover:text-primary"}`}
              >
                {f.label}
                {f.key === "habis" && habisCount > 0 ? ` (${habisCount})` : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk / kategori…"
            className="w-64 rounded-full border border-gray-300 px-4 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <span className="whitespace-nowrap text-xs text-gray-400">{filtered.length}/{products.length} item</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Produk</th>
              <th className="px-5 py-3 font-semibold">Kategori</th>
              <th className="px-5 py-3 font-semibold">Harga</th>
              <th className="px-5 py-3 font-semibold">Status / Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-gray-400">
                  {products.length === 0 ? "Belum ada produk. Tambahkan lewat panel di atas." : query ? `Tidak ada produk cocok "${q}".` : filter === "habis" ? "Tidak ada produk yang habis." : "Tidak ada produk."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t transition hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.gambar[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.gambar[0]} alt="" className="h-11 w-11 rounded-lg border object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-gray-100 text-[9px] text-gray-300">
                          no img
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{p.nama}</span>
                      {p.habis && <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">HABIS</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.kategori}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{rupiah(p.harga)}</td>
                  <td className="px-5 py-3">
                    <ProductRowActions id={p.id} status={p.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
