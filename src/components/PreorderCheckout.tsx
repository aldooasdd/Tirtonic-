"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";
import { submitPreorder } from "@/app/(site)/preorder/actions";
import wilayah from "@/lib/wilayah.json";

const PROVINSI = Object.keys(wilayah as Record<string, string[]>).sort((a, b) => a.localeCompare(b));
const MIN_DP = 100_000;

type Variant = { id: string; nama: string; harga: number; stok: number };
type Bonus = { nama: string; deskripsi: string | null; foto: string | null } | null;

export default function PreorderCheckout({ productId, harga, variants = [], bonus = null, defaultFull = false, dpBenefits = [], lunasBenefits = [] }: { productId: string; harga: number; nama: string; variants?: Variant[]; bonus?: Bonus; defaultFull?: boolean; dpBenefits?: string[]; lunasBenefits?: string[] }) {
  const router = useRouter();
  const hasVariants = variants.length > 0;
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [plan, setPlan] = useState<"dp" | "lunas">(defaultFull ? "lunas" : "dp");
  const [dp, setDp] = useState(defaultFull ? 0 : MIN_DP);
  const [provinsi, setProvinsi] = useState("");
  const [kota, setKota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selVar = variants.find((v) => v.id === variantId);
  const hargaSatuan = hasVariants ? (selVar?.harga ?? harga) : harga;
  const maxQty = hasVariants ? (selVar?.stok ?? 0) : 99;
  const total = hargaSatuan * qty;
  const kotaOptions = (wilayah as Record<string, string[]>)[provinsi] ?? [];
  const sisa = Math.max(0, total - dp);

  // Plan "lunas" → DP = total (ikut perubahan varian/qty).
  useEffect(() => { if (plan === "lunas") setDp(total); }, [plan, total]);
  const benefits = plan === "lunas" ? lunasBenefits : dpBenefits;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (hasVariants && !variantId) return setError("Pilih varian dulu.");
    if (hasVariants && selVar && qty > selVar.stok) return setError(`Stok varian ${selVar.nama} tinggal ${selVar.stok}.`);
    if (dp < MIN_DP) return setError(`DP minimal ${rupiah(MIN_DP)}.`);
    if (dp > total) return setError("DP tidak boleh melebihi total harga.");
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await submitPreorder({
        productId, variantId: variantId || undefined, qty, dp,
        nama: String(fd.get("nama") || ""), email: String(fd.get("email") || ""), telepon: String(fd.get("telepon") || ""),
        alamat: String(fd.get("alamat") || ""), kota, provinsi,
        kodePos: String(fd.get("kodePos") || ""), catatan: String(fd.get("catatan") || ""),
      });
      if (!res.ok) { setError(res.error); setBusy(false); return; }
      if (res.paymentUrl) window.location.href = res.paymentUrl;
      else router.push(`/preorder/order/${res.orderId}`);
    } catch {
      setError("Gagal membuat pesanan. Coba lagi.");
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {hasVariants && (
        <div>
          <p className="text-sm font-semibold text-gray-700">Pilih varian</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {variants.map((v) => {
              const habis = v.stok <= 0;
              const on = v.id === variantId;
              return (
                <button
                  type="button"
                  key={v.id}
                  disabled={habis}
                  onClick={() => { setVariantId(v.id); setQty(1); }}
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

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Jumlah</span>
        <div className="flex items-center rounded-full border border-gray-300">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1.5 text-lg leading-none text-gray-600">−</button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(hasVariants ? maxQty : q + 1, q + 1))} disabled={hasVariants && qty >= maxQty} className="px-3 py-1.5 text-lg leading-none text-gray-600 disabled:opacity-40">+</button>
        </div>
      </div>

      <input name="nama" required placeholder="Nama lengkap" className={field} />
      <input name="telepon" type="tel" inputMode="numeric" required placeholder="No. WhatsApp (08xxx)" className={field} />
      <textarea name="alamat" required rows={2} placeholder="Alamat lengkap" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <select required value={provinsi} onChange={(e) => { setProvinsi(e.target.value); setKota(""); }} className={field}>
          <option value="">Provinsi</option>
          {PROVINSI.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select required value={kota} onChange={(e) => setKota(e.target.value)} disabled={!provinsi} className={field}>
          <option value="">Kota/Kab.</option>
          {kotaOptions.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <textarea name="catatan" rows={2} placeholder="Catatan (opsional)" className={field} />

      {/* Pilih cara bayar (plan) */}
      <div className="rounded-2xl border bg-white p-3">
        <p className="text-base font-bold text-gray-900">Pilih cara bayar</p>
        <div className="mt-3 space-y-2">
          {([
            { key: "dp" as const, title: "Down Payment", sub: `Mulai dari ${rupiah(MIN_DP)}` },
            { key: "lunas" as const, title: "Bayar Lunas", sub: `${rupiah(total)} — sekali bayar` },
          ]).map((opt) => {
            const on = plan === opt.key;
            return (
              <button
                type="button"
                key={opt.key}
                onClick={() => { setPlan(opt.key); setDp(opt.key === "lunas" ? total : MIN_DP); }}
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

        {/* DP amount hanya untuk plan Down Payment */}
        {plan === "dp" && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-600">Nominal DP (min {rupiah(MIN_DP)})</label>
            <input
              type="number" min={MIN_DP} max={total} step={1000} value={dp}
              onChange={(e) => setDp(Math.floor(Number(e.target.value) || 0))}
              className={`${field} mt-1`}
            />
          </div>
        )}

        <div className="mt-3 space-y-0.5 border-t pt-3 text-sm">
          <div className="flex justify-between text-gray-500"><span>Total harga</span><span>{rupiah(total)}</span></div>
          <div className="flex justify-between font-semibold text-primary"><span>Dibayar sekarang</span><span>{rupiah(Math.min(dp, total))}</span></div>
          <div className="flex justify-between text-gray-500"><span>Sisa (saat barang ready)</span><span>{rupiah(sisa)}</span></div>
        </div>

        {benefits.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <p className="text-sm font-semibold text-gray-900">Benefit:</p>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">✓</span>{b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-pill w-full bg-primary hover:bg-primaryDark disabled:opacity-60">
        {busy ? "Memproses…" : `${plan === "lunas" ? "Bayar Lunas" : "Bayar DP"} ${rupiah(Math.min(dp, total))}`}
      </button>
      <p className="text-center text-xs text-gray-400">Pembayaran aman via DOKU. Konfirmasi & info pelunasan dikirim lewat WhatsApp.</p>
    </form>
  );
}
