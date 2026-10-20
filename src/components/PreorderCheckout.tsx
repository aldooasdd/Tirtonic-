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

export default function PreorderCheckout({ productId, harga, variants = [], bonus = null, defaultFull = false }: { productId: string; harga: number; nama: string; variants?: Variant[]; bonus?: Bonus; defaultFull?: boolean }) {
  const router = useRouter();
  const hasVariants = variants.length > 0;
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [dp, setDp] = useState(MIN_DP);
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

  // Mode "Bayar Lunas" dari laman detail (?lunas=1): DP otomatis = total.
  useEffect(() => { if (defaultFull) setDp(total); }, [defaultFull, total]);

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
      <input name="email" type="email" required placeholder="Email" className={field} />
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
      <input name="kodePos" inputMode="numeric" placeholder="Kode pos (opsional)" className={field} />
      <textarea name="catatan" rows={2} placeholder="Catatan (opsional)" className={field} />

      {/* DP */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <label className="text-sm font-semibold text-gray-700">Uang muka (DP) — min {rupiah(MIN_DP)}</label>
        <input
          type="number"
          min={MIN_DP}
          max={total}
          step={1000}
          value={dp}
          onChange={(e) => setDp(Math.floor(Number(e.target.value) || 0))}
          className={`${field} mt-1`}
        />
        <button type="button" onClick={() => setDp(total)} className="mt-2 text-xs font-semibold text-primary hover:underline">
          Bayar penuh (lunas){bonus ? " — dapat bonus 🎁" : ""}
        </button>
        <div className="mt-2 space-y-0.5 text-sm">
          <div className="flex justify-between text-gray-500"><span>Total harga</span><span>{rupiah(total)}</span></div>
          <div className="flex justify-between font-semibold text-primary"><span>DP dibayar sekarang</span><span>{rupiah(Math.min(dp, total))}</span></div>
          <div className="flex justify-between text-gray-500"><span>Sisa (saat barang ready)</span><span>{rupiah(sisa)}</span></div>
        </div>
      </div>

      {bonus && (
        <div className={`rounded-xl border p-3 ${sisa === 0 ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50"}`}>
          <p className="text-xs font-semibold text-gray-700">🎁 Bonus jika bayar penuh (lunas){sisa === 0 ? " — kamu dapat ini!" : ""}</p>
          <div className="mt-2 flex gap-3">
            {bonus.foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={bonus.foto} alt="" className="h-14 w-14 shrink-0 rounded-lg border object-cover" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{bonus.nama}</p>
              {bonus.deskripsi && <p className="text-xs text-gray-500">{bonus.deskripsi}</p>}
            </div>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-pill w-full bg-primary hover:bg-primaryDark disabled:opacity-60">
        {busy ? "Memproses…" : `Bayar DP ${rupiah(Math.min(dp, total))}`}
      </button>
      <p className="text-center text-xs text-gray-400">Pembayaran DP via DOKU. Konfirmasi & info pelunasan dikirim lewat WhatsApp.</p>
    </form>
  );
}
