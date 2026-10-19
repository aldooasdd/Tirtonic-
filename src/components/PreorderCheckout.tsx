"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { rupiah } from "@/lib/format";
import { submitPreorder } from "@/app/(site)/preorder/actions";
import wilayah from "@/lib/wilayah.json";

const PROVINSI = Object.keys(wilayah as Record<string, string[]>).sort((a, b) => a.localeCompare(b));
const MIN_DP = 100_000;

export default function PreorderCheckout({ productId, harga, nama: namaProduk }: { productId: string; harga: number; nama: string }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [dp, setDp] = useState(MIN_DP);
  const [provinsi, setProvinsi] = useState("");
  const [kota, setKota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = harga * qty;
  const kotaOptions = (wilayah as Record<string, string[]>)[provinsi] ?? [];
  const sisa = Math.max(0, total - dp);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (dp < MIN_DP) return setError(`DP minimal ${rupiah(MIN_DP)}.`);
    if (dp > total) return setError("DP tidak boleh melebihi total harga.");
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await submitPreorder({
        productId, qty, dp,
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
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Jumlah</span>
        <div className="flex items-center rounded-full border border-gray-300">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1.5 text-lg leading-none text-gray-600">−</button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button type="button" onClick={() => setQty((q) => q + 1)} className="px-3 py-1.5 text-lg leading-none text-gray-600">+</button>
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
        <div className="mt-2 space-y-0.5 text-sm">
          <div className="flex justify-between text-gray-500"><span>Total harga</span><span>{rupiah(total)}</span></div>
          <div className="flex justify-between font-semibold text-primary"><span>DP dibayar sekarang</span><span>{rupiah(Math.min(dp, total))}</span></div>
          <div className="flex justify-between text-gray-500"><span>Sisa (saat barang ready)</span><span>{rupiah(sisa)}</span></div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-pill w-full bg-primary hover:bg-primaryDark disabled:opacity-60">
        {busy ? "Memproses…" : `Bayar DP ${rupiah(Math.min(dp, total))}`}
      </button>
      <p className="text-center text-xs text-gray-400">Pembayaran DP via DOKU. Konfirmasi & info pelunasan dikirim lewat WhatsApp.</p>
    </form>
  );
}
