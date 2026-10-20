"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { rupiah } from "@/lib/format";

type Variant = { id: string; nama: string; harga: number; stok: number };

// Tombol Reserve Now di detail PO → buka modal pilih varian + plan (DP / Lunas),
// lalu lanjut ke halaman checkout sesuai pilihan.
export default function ReserveModal({ productId, harga, dpBenefits, lunasBenefits, minDp = 100_000, variants = [] }: {
  productId: string; harga: number; dpBenefits: string[]; lunasBenefits: string[]; minDp?: number; variants?: Variant[];
}) {
  const router = useRouter();
  const hasVariants = variants.length > 0;
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [plan, setPlan] = useState<"dp" | "lunas">("dp");
  const [dp, setDp] = useState(minDp || 0);
  const [err, setErr] = useState("");
  const selVar = variants.find((v) => v.id === variantId);
  const hargaEff = hasVariants ? (selVar?.harga ?? harga) : harga;
  const benefits = plan === "lunas" ? lunasBenefits : dpBenefits;
  const bayar = plan === "lunas" ? hargaEff : Math.min(Math.max(dp, minDp), hargaEff);
  const kurang = Math.max(0, hargaEff - bayar);

  function go() {
    if (hasVariants && !variantId) return setErr("Pilih varian dulu.");
    const q = new URLSearchParams();
    if (plan === "lunas") q.set("lunas", "1"); else q.set("dp", String(bayar));
    if (variantId) q.set("variant", variantId);
    router.push(`/preorder/${productId}/checkout?${q.toString()}`);
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

            {hasVariants && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700">Pilih varian</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const habis = v.stok <= 0;
                    const on = v.id === variantId;
                    return (
                      <button
                        type="button" key={v.id} disabled={habis}
                        onClick={() => { setVariantId(v.id); setErr(""); }}
                        className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary/10 font-semibold text-primary" : "border-gray-300 text-gray-700"} ${habis ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                      >
                        {v.nama}{habis ? " (habis)" : ""}
                      </button>
                    );
                  })}
                </div>
                {selVar && <p className="mt-1.5 text-xs text-gray-400">{rupiah(selVar.harga)} · stok {selVar.stok}</p>}
              </div>
            )}

            <div className="mt-4 space-y-2">
              {([
                { key: "dp" as const, title: "Down Payment", sub: minDp > 0 ? `Mulai dari ${rupiah(minDp)}` : "Nominal bebas" },
                { key: "lunas" as const, title: "Bayar Lunas", sub: `${rupiah(hargaEff)} — sekali bayar` },
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
                <label className="text-xs font-semibold text-gray-600">Nominal DP {minDp > 0 ? `(mulai dari ${rupiah(minDp)})` : "(bebas)"}</label>
                <input
                  type="text" inputMode="numeric" value={dp ? String(dp) : ""}
                  onChange={(e) => setDp(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            )}

            <div className="mt-4 space-y-0.5 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-500"><span>Total harga</span><span>{rupiah(hargaEff)}</span></div>
              <div className="flex justify-between font-semibold text-primary"><span>Dibayar sekarang</span><span>{rupiah(bayar)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Kurang (saat barang ready)</span><span>{rupiah(kurang)}</span></div>
            </div>

            {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

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
