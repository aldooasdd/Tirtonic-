"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useShopCart } from "@/components/ShopCartProvider";
import { rupiah } from "@/lib/format";
import { submitCheckout } from "./actions";
import wilayah from "@/lib/wilayah.json";

const PROVINSI = Object.keys(wilayah as Record<string, string[]>).sort((a, b) => a.localeCompare(b));

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useShopCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [provinsi, setProvinsi] = useState("");
  const [kota, setKota] = useState("");
  const kotaOptions = (wilayah as Record<string, string[]>)[provinsi] ?? [];

  useEffect(() => setMounted(true), []);

  const total = subtotal; // gratis ongkir

  if (mounted && items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 text-center">
        <p className="text-gray-500">Keranjang kosong.</p>
        <Link href="/shop" className="btn-green mt-4">Mulai belanja</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await submitCheckout({
        nama: String(fd.get("nama") || ""),
        email: String(fd.get("email") || ""),
        telepon: String(fd.get("telepon") || ""),
        alamat: String(fd.get("alamat") || ""),
        kota: String(fd.get("kota") || ""),
        provinsi: String(fd.get("provinsi") || ""),
        catatan: String(fd.get("catatan") || ""),
        items: items.map((x) => ({ productId: x.productId, variantId: x.variantId, qty: x.qty })),
      });
      if (!res.ok) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      clear();
      if (res.paymentUrl) window.location.href = res.paymentUrl;
      else router.push(`/order/${res.orderId}`);
    } catch {
      setError("Gagal membuat pesanan. Coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <h1 className="mb-6 text-2xl font-extrabold text-gray-900">Checkout</h1>

      <form onSubmit={onSubmit} className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">Data Penerima</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="nama">Nama lengkap *</label>
                <input id="nama" name="nama" required className="field" autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="telepon">No. WhatsApp *</label>
                <input id="telepon" name="telepon" required inputMode="tel" placeholder="08xxxxxxxxxx" className="field" autoComplete="tel" />
              </div>
              <div>
                <label className="label" htmlFor="email">Email *</label>
                <input id="email" name="email" type="email" required className="field" autoComplete="email" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="alamat">Alamat lengkap *</label>
                <textarea id="alamat" name="alamat" required rows={2} className="field" placeholder="Jalan, nomor rumah, RT/RW, kecamatan" autoComplete="street-address" />
              </div>
              <div>
                <label className="label" htmlFor="provinsi">Provinsi *</label>
                <select id="provinsi" name="provinsi" required value={provinsi} onChange={(e) => { setProvinsi(e.target.value); setKota(""); }} className="field">
                  <option value="" disabled>Pilih provinsi</option>
                  {PROVINSI.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="kota">Kota / Kabupaten *</label>
                <select id="kota" name="kota" required value={kota} onChange={(e) => setKota(e.target.value)} disabled={!provinsi} className="field disabled:bg-gray-100 disabled:text-gray-400">
                  <option value="" disabled>{provinsi ? "Pilih kota / kabupaten" : "Pilih provinsi dulu"}</option>
                  {kotaOptions.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="catatan">Catatan (opsional)</label>
                <input id="catatan" name="catatan" className="field" placeholder="mis. warna alternatif, patokan alamat" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm font-semibold text-primary">
            🚚 Gratis ongkir ke seluruh Indonesia
          </div>
        </div>

        <div className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">Ringkasan Pesanan</h2>
            <ul className="space-y-3">
              {items.map((x) => (
                <li key={x.key} className="flex gap-3 text-sm">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border bg-gray-100">
                    {x.gambar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={x.gambar} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-800 px-1 text-[10px] font-bold text-white">{x.qty}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-gray-800">{x.nama}</p>
                    {x.varian && <p className="text-xs text-gray-500">{x.varian}</p>}
                  </div>
                  <span className="shrink-0 font-semibold text-gray-900">{rupiah(x.harga * x.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{rupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Ongkir</span>
                <span className="font-semibold text-primary">Gratis</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-extrabold text-gray-900">
                <span>Total</span>
                <span>{rupiah(total)}</span>
              </div>
            </div>

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-pill mt-4 w-full bg-primary hover:bg-primaryDark disabled:opacity-60">
              {submitting ? "Memproses..." : "Buat Pesanan & Bayar"}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">Kamu akan diarahkan ke halaman pembayaran yang aman.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
