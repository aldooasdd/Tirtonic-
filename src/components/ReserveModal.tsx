"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { rupiah } from "@/lib/format";

const MIN_DP = 100_000;

// Tombol Reserve Now di detail PO → buka modal pemilih plan (DP / Lunas),
// lalu lanjut ke halaman checkout sesuai plan.
export default function ReserveModal({ productId, harga, dpBenefits, lunasBenefits }: {
  productId: string; harga: number; dpBenefits: string[]; lunasBenefits: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"dp" | "lunas">("dp");
  const [dp, setDp] = useState(MIN_DP);
  const benefits = plan === "lunas" ? lunasBenefits : dpBenefits;
  const bayar = plan === "lunas" ? harga : Math.min(Math.max(dp, MIN_DP), harga);
  const kurang = Math.max(0, harga - bayar);

  function go() {
    router.push(`/preorder/${productId}/checkout${plan === "lunas" ? "?lunas=1" : `?dp=${bayar}`}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-primary mt-6 block w-full rounded-full py-3 text-center text-sm font-bold text-white transition hover:brightness-110"
      >
        Reserve Now
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">Pembayaran aman via DOKU. Langsung checkout, tanpa keranjang.</p>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900">Pilih cara bayar</h3>
            <p className="mt-1 text-sm text-gray-500">Pilih salah satu metode pembayaran.</p>

            <div className="mt-4 space-y-2">
              {([
                { key: "dp" as const, title: "Down Payment", sub: `Mulai dari ${rupiah(MIN_DP)}` },
                { key: "lunas" as const, title: "Bayar Lunas", sub: `${rupiah(harga)} — sekali bayar` },
              ]).map((opt) => {
                const on = plan === opt.key;
                return (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => setPlan(opt.key)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${on ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <span>
                      <span className="block text-sm font-bold text-gray-900">{opt.title}</span>
                      <span className="block text-xs text-gray-500">{opt.sub}</span>
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-primary" : "border-gray-300"}`}>
                      {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {benefits.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-semibold text-gray-900">Benefit:</p>
                <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="mt-0.5 text-primary">✓</span>{b.replace(/^[\s✓✔•\-]+/, "")}</li>
                  ))}
                </ul>
              </div>
            )}

            {plan === "dp" && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-gray-600">Nominal DP (mulai dari {rupiah(MIN_DP)})</label>
                <input
                  type="number" min={MIN_DP} max={harga} step={1000} value={dp}
                  onChange={(e) => setDp(Math.floor(Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            )}

            <div className="mt-4 space-y-0.5 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-500"><span>Total harga</span><span>{rupiah(harga)}</span></div>
              <div className="flex justify-between font-semibold text-primary"><span>Dibayar sekarang</span><span>{rupiah(bayar)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Kurang (saat barang ready)</span><span>{rupiah(kurang)}</span></div>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-full border border-gray-300 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
                Close
              </button>
              <button type="button" onClick={go} className="glass-primary flex-1 rounded-full py-3 text-sm font-bold text-white transition hover:brightness-110">
                Reserve Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
