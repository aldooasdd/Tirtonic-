"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";
import type { CartItem } from "./ShopCartProvider";

export type B1G1Option = {
  id: string;
  nama: string;
  gambar: string | null;
  harga: number; // tanpa varian
  stok: number | null;
  variants: { id: string; label: string; harga: number; stok: number; gambar: string | null }[];
};

/** Popup liquid glass setelah "Beli Sekarang" barang B1G1: pilih 1 barang B1G1 lain (termurah gratis di checkout). */
export default function B1G1Popup({ options, onPick, onSkip }: { options: B1G1Option[]; onPick: (item: Omit<CartItem, "key">) => void; onSkip: () => void }) {
  const [sel, setSel] = useState<Record<string, string>>({});
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/30 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={onSkip}>
      <div className="sheet-in max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/60 bg-white/75 p-5 pb-8 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-[800] text-white">BUY 1 GET 1</span>
            <h3 className="mt-2 text-lg font-[700] text-neutral-950">Pilih 1 barang lagi, gratis!</h3>
            <p className="mt-0.5 text-xs text-neutral-600">Harga yang lebih murah dari tiap pasang otomatis dipotong di checkout. Promo ini tidak bisa digabung kupon/voucher.</p>
          </div>
          <button type="button" onClick={onSkip} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/80 text-neutral-600 hover:bg-white">✕</button>
        </div>

        <div className="mt-4 space-y-2.5">
          {options.length === 0 && <p className="rounded-2xl bg-white/70 p-4 text-center text-sm text-neutral-500">Belum ada barang Buy 1 Get 1 lain yang tersedia.</p>}
          {options.map((o) => {
            const hasVar = o.variants.length > 0;
            const v = hasVar ? o.variants.find((x) => x.id === sel[o.id]) : undefined;
            const harga = v?.harga ?? (hasVar ? Math.min(...o.variants.map((x) => x.harga)) : o.harga);
            return (
              <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-2.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v?.gambar || o.gambar || "/logo.png"} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-[600] text-neutral-900">{o.nama}</p>
                  <p className="text-xs text-neutral-500">{hasVar && !v ? "mulai " : ""}{rupiah(harga)}</p>
                  {hasVar && (
                    <select value={sel[o.id] ?? ""} onChange={(e) => setSel({ ...sel, [o.id]: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="" disabled>Pilih varian</option>
                      {o.variants.map((x) => <option key={x.id} value={x.id}>{x.label} · {rupiah(x.harga)}</option>)}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  disabled={hasVar && !v}
                  onClick={() => onPick({ productId: o.id, variantId: v?.id ?? null, nama: o.nama, varian: v?.label ?? null, harga, gambar: v?.gambar ?? o.gambar, qty: 1, max: v?.stok ?? o.stok ?? 99, b1g1: true })}
                  className="shrink-0 rounded-full bg-neutral-950 px-3.5 py-2 text-xs font-[700] text-white hover:bg-neutral-800 disabled:opacity-40"
                >
                  Ambil
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={onSkip} className="mt-4 w-full rounded-full border border-neutral-300 bg-white/70 py-3 text-sm font-[600] text-neutral-700 hover:bg-white">Lewati, lanjut checkout</button>
      </div>
    </div>
  );
}
