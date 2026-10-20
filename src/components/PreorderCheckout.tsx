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

export default function PreorderCheckout({ productId, harga, variants = [], bonus = null, defaultFull = false, initialDp, initialVariantId, minDp = 100_000, dpBenefits = [], lunasBenefits = [] }: { productId: string; harga: number; nama: string; variants?: Variant[]; bonus?: Bonus; defaultFull?: boolean; initialDp?: number; initialVariantId?: string; minDp?: number; dpBenefits?: string[]; lunasBenefits?: string[] }) {
  const router = useRouter();
  const hasVariants = variants.length > 0;
  const [variantId, setVariantId] = useState<string>(initialVariantId && variants.some((v) => v.id === initialVariantId) ? initialVariantId : "");
  const [qty, setQty] = useState(1);
  const [plan, setPlan] = useState<"dp" | "lunas">(defaultFull ? "lunas" : "dp");
  const [dp, setDp] = useState(defaultFull ? 0 : Math.max(minDp, initialDp ?? minDp));
  const [metode, setMetode] = useState<"pickup" | "kirim">("pickup");
  const [cabang, setCabang] = useState("");
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (hasVariants && !variantId) return setError("Pilih varian dulu.");
    if (hasVariants && selVar && qty > selVar.stok) return setError(`Stok varian ${selVar.nama} tinggal ${selVar.stok}.`);
    if (dp < Math.max(1, minDp)) return setError(minDp > 0 ? `DP minimal ${rupiah(minDp)}.` : "Masukkan nominal DP.");
    if (dp > total) return setError("DP tidak boleh melebihi total harga.");
    if (metode === "pickup" && !cabang) return setError("Pilih cabang pengambilan dulu.");
    const fd = new FormData(e.currentTarget);
    const pickup = metode === "pickup";
    const catatanRaw = String(fd.get("catatan") || "");
    setBusy(true);
    try {
      const res = await submitPreorder({
        productId, variantId: variantId || undefined, qty, dp,
        nama: String(fd.get("nama") || ""), email: "", telepon: String(fd.get("telepon") || ""),
        alamat: pickup ? `AMBIL DI TOKO - Cabang ${cabang}` : String(fd.get("alamat") || ""),
        kota: pickup ? cabang : kota, provinsi: pickup ? "-" : provinsi,
        kodePos: "", catatan: pickup ? `[AMBIL DI TOKO - ${cabang}] ${catatanRaw}`.trim() : catatanRaw,
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

      {/* Metode pengambilan */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: "pickup" as const, title: "Pengambilan di Toko", sub: "Siap diambil saat produk tiba" },
          { key: "kirim" as const, title: "Pengiriman ke Alamat", sub: "Diantar langsung ke tujuan Anda" },
        ]).map((opt) => {
          const on = metode === opt.key;
          return (
            <button
              type="button"
              key={opt.key}
              onClick={() => setMetode(opt.key)}
              className={`rounded-xl border p-3 text-left transition ${on ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
            >
              <span className="block text-sm font-bold text-gray-900">{opt.title}</span>
              <span className="block text-xs text-gray-500">{opt.sub}</span>
            </button>
          );
        })}
      </div>

      {metode === "pickup" && (
        <select value={cabang} onChange={(e) => setCabang(e.target.value)} className={field}>
          <option value="">Pilih cabang pengambilan</option>
          <option value="Jogja">Tirtonic Jogja</option>
          <option value="Semarang">Tirtonic Semarang</option>
          <option value="Solo">Tirtonic Solo</option>
        </select>
      )}

      <input name="nama" required placeholder="Nama lengkap" className={field} />
      <input name="telepon" type="tel" inputMode="numeric" required placeholder="No. WhatsApp (08xxx)" className={field} />

      {metode === "kirim" && (
        <>
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
        </>
      )}
      <textarea name="catatan" rows={2} placeholder="Catatan (opsional)" className={field} />

      {/* Ringkasan pembayaran (plan & DP sudah dipilih di langkah sebelumnya) */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex justify-between text-sm text-gray-500"><span>Metode</span><span className="font-semibold text-gray-900">{metode === "pickup" ? `Ambil di Toko${cabang ? ` — ${cabang}` : ""}` : "Kirim ke Alamat"}</span></div>
        <div className="mt-1 flex justify-between text-sm text-gray-500"><span>Cara bayar</span><span className="font-semibold text-gray-900">{plan === "lunas" ? "Bayar Lunas" : "Down Payment"}</span></div>
        <div className="mt-2 space-y-0.5 border-t pt-2 text-sm">
          <div className="flex justify-between text-gray-500"><span>Total harga</span><span>{rupiah(total)}</span></div>
          <div className="flex justify-between font-semibold text-primary"><span>Dibayar sekarang</span><span>{rupiah(Math.min(dp, total))}</span></div>
          <div className="flex justify-between text-gray-500"><span>Sisa (saat barang ready)</span><span>{rupiah(sisa)}</span></div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn-pill w-full bg-primary hover:bg-primaryDark disabled:opacity-60">
        {busy ? "Memproses…" : `${plan === "lunas" ? "Bayar Lunas" : "Bayar DP"} ${rupiah(Math.min(dp, total))}`}
      </button>
      <p className="text-center text-xs text-gray-400">Pembayaran aman via DOKU. Konfirmasi & info pelunasan dikirim lewat WhatsApp.</p>
    </form>
  );
}
