"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";
import type { B1G1Option } from "./B1G1Popup";
import type { CartItem } from "./ShopCartProvider";

/** Popup kaca sebelum produk rak masuk keranjang: pilih 1 bonus merchandise. */
export default function MerchPopup({ options, onPick, onSkip, onClose }: { options: B1G1Option[]; onPick: (item: Omit<CartItem, "key">) => void; onSkip: () => void; onClose: () => void }) {
  const [sel, setSel] = useState<Record<string, string>>({});
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/30 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={onClose}>
      <div className="sheet-in max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/60 bg-white/75 p-5 pb-8 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-[700] text-neutral-950">Pilih bonus merchandise</h3>
            <p className="mt-0.5 text-sm text-neutral-600">Gratis 1 barang untuk pembelian ini.</p>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="Tutup pilihan bonus" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-neutral-600 hover:bg-white">✕</button>
        </div>
        <div className="mt-4 space-y-2.5">
          {options.map((o) => {
            const hasVar = o.variants.length > 0;
            const v = !hasVar ? undefined : o.variants.length === 1 ? o.variants[0] : o.variants.find((x) => x.id === sel[o.id]);
            const harga = v?.harga ?? (hasVar ? Math.min(...o.variants.map((x) => x.harga)) : o.harga);
            return (
              <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-2.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v?.gambar || o.gambar || "/logo.png"} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-[600] text-neutral-900">{o.nama}</p>
                  <p className="text-xs text-neutral-600"><s>{rupiah(harga)}</s> <b className="text-primary">Gratis</b></p>
                  {o.variants.length > 1 && (
                    <select aria-label={`Varian ${o.nama}`} value={sel[o.id] ?? ""} onChange={(e) => setSel({ ...sel, [o.id]: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs">
                      <option value="" disabled>Pilih varian</option>
                      {o.variants.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  disabled={hasVar && !v}
                  onClick={() => onPick({ productId: o.id, variantId: v?.id ?? null, nama: o.nama, varian: v?.label || null, harga: 0, normal: harga, gambar: v?.gambar ?? o.gambar, qty: 1, max: v?.stok ?? o.stok ?? 99, gift: true })}
                  className="min-h-10 shrink-0 rounded-full bg-primary px-4 text-xs font-[700] text-white hover:bg-primaryDark disabled:opacity-40"
                >
                  Pilih
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={onSkip} className="mt-4 w-full rounded-full border border-neutral-300 bg-white/70 py-3 text-sm font-[600] text-neutral-700 hover:bg-white">Lanjut tanpa bonus</button>
      </div>
    </div>
  );
}
