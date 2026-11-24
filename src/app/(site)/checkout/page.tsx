"use client";

import { b1g1Free, b1g1OngkirQty } from "@/lib/b1g1";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useShopCart } from "@/components/ShopCartProvider";
import { rupiah } from "@/lib/format";
import { submitCheckout, applyCoupon, checkRates, checkMemberVoucher, findLocations } from "./actions";
import type { LocationOption, RateOption } from "@/lib/ongkir";
import { FREE_ONGKIR_MIN } from "@/lib/constants";
import wilayah from "@/lib/wilayah.json";

const PROVINSI = Object.keys(wilayah as Record<string, string[]>).sort((a, b) => a.localeCompare(b));

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useShopCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [metode, setMetode] = useState<"pickup" | "kirim">("pickup");
  const [cabang, setCabang] = useState("");
  const [provinsi, setProvinsi] = useState("");
  const [kota, setKota] = useState("");
  const kotaOptions = (wilayah as Record<string, string[]>)[provinsi] ?? [];

  // Kupon
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; diskon: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  // Voucher demo otomatis dari nomor HP
  const [phone, setPhone] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; label: string; diskon: number } | null>(null);

  // Ongkir (Binderbyte)
  // Tujuan: cari kelurahan/kecamatan (nama atau kode pos) → pilih → id lokasi Binderbyte.
  const [lokasiQ, setLokasiQ] = useState("");
  const [lokasiOpts, setLokasiOpts] = useState<LocationOption[]>([]);
  const [lokasiBusy, setLokasiBusy] = useState(false);
  const [lokasi, setLokasi] = useState<LocationOption | null>(null);
  const kodePos = lokasi?.label.match(/(\d{5})\)?\s*$/)?.[1] ?? "";
  const [rates, setRates] = useState<RateOption[] | null>(null);
  const [chosenId, setChosenId] = useState("");
  const [ratesBusy, setRatesBusy] = useState(false);
  const [ratesMsg, setRatesMsg] = useState<string | null>(null);


  useEffect(() => setMounted(true), []);
  // Kode pos / isi keranjang berubah → tarif lama tak berlaku.
  useEffect(() => { setRates(null); setChosenId(""); }, [lokasi, subtotal]);
  // Ketik ≥3 huruf → cari lokasi (debounce, hemat kuota Binderbyte).
  useEffect(() => {
    const q = lokasiQ.trim();
    if (lokasi || q.length < 3) { setLokasiOpts([]); return; }
    setLokasiBusy(true);
    const t = setTimeout(() => {
      findLocations(q).then(setLokasiOpts).catch(() => setLokasiOpts([])).finally(() => setLokasiBusy(false));
    }, 450);
    return () => { clearTimeout(t); setLokasiBusy(false); };
  }, [lokasiQ, lokasi]);
  // Lokasi dipilih → langsung cek ongkir.
  useEffect(() => { if (lokasi) void onCheckRates(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lokasi]);
  // Isi keranjang berubah → kupon lama tidak valid lagi, reset preview.
  useEffect(() => { setCoupon(null); setCouponMsg(null); }, [subtotal]);
  // Cek voucher demo milik nomor ini (ulang kalau keranjang berubah).
  useEffect(() => {
    if (phone.replace(/\D/g, "").length < 9) { setVoucher(null); return; }
    const t = setTimeout(() => {
      checkMemberVoucher({ phone, items: items.map((x) => ({ productId: x.productId, variantId: x.variantId, qty: x.qty, gift: x.gift })) })
        .then((v) => setVoucher(v ? { code: v.code, label: v.label, diskon: v.diskon } : null))
        .catch(() => setVoucher(null));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, subtotal]);

  async function onApplyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const res = await applyCoupon({ code, items: items.map((x) => ({ productId: x.productId, variantId: x.variantId, qty: x.qty, gift: x.gift })) });
      if (res.ok) { setCoupon({ code: res.code, diskon: res.diskon }); setCouponMsg(null); }
      else { setCoupon(null); setCouponMsg(res.error); }
    } catch {
      setCoupon(null);
      setCouponMsg("Gagal cek kupon. Coba lagi.");
    } finally {
      setCouponBusy(false);
    }
  }

  async function onCheckRates() {
    if (!lokasi) return;
    setRatesBusy(true);
    setRatesMsg(null);
    try {
      // Kode pos dari label lokasi (jalur yang terbukti di Binderbyte); id lokasi hanya cadangan.
      const opts = await checkRates(kodePos || lokasi.id, items.map((x) => ({ productId: x.productId, variantId: x.variantId, qty: x.qty, gift: x.gift })));
      setRates(opts);
      setChosenId(opts[0]?.id ?? "");
      if (!opts.length) setRatesMsg("Ongkir tidak ditemukan untuk lokasi ini. Coba pilih kelurahan / kecamatan lain.");
    } catch {
      setRatesMsg("Gagal cek ongkir. Coba lagi.");
    } finally {
      setRatesBusy(false);
    }
  }

  const b1 = b1g1Free(items); // Buy 1 Get 1: termurah tiap pasang gratis (server hitung ulang)
  const hasB1 = items.some((x) => x.b1g1);
  const [agreeB1, setAgreeB1] = useState(false);
  const diskon = Math.min(subtotal, b1.total + (coupon?.diskon ?? 0) + (voucher?.diskon ?? 0));
  const belanja = Math.max(0, subtotal - diskon);
  // B1G1: tanpa gratis ongkir; ongkir × jumlah barang B1G1 hanya untuk tarif flat (tarif kurir sudah dihitung dari total berat).
  const flatRates = !!rates?.length && rates.every((r) => r.id.startsWith("flat::"));
  const ongkirQty = flatRates ? b1g1OngkirQty(items) : 1;
  const freeOngkir = !hasB1 && belanja >= FREE_ONGKIR_MIN;
  const chosen = rates?.find((r) => r.id === chosenId) ?? null;
  const ongkir = metode === "pickup" || freeOngkir ? 0 : (chosen?.cost ?? 0) * ongkirQty;
  const total = belanja + ongkir;

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
    if (metode === "pickup" && !cabang) { setError("Pilih cabang pengambilan dulu."); return; }
    if (metode === "kirim" && !chosen) { setError("Pilih lokasi tujuan & kurir dulu."); return; }
    if (hasB1 && !agreeB1) {
      setError("Centang persetujuan Ketentuan Produk Stok Akhir dulu.");
      document.getElementById("ketentuan-b1g1")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const fd = new FormData(e.currentTarget);
    const pickup = metode === "pickup";
    const catatanRaw = String(fd.get("catatan") || "");
    setSubmitting(true);
    try {
      const res = await submitCheckout({
        nama: String(fd.get("nama") || ""),
        email: "",
        telepon: String(fd.get("telepon") || ""),
        alamat: pickup ? `AMBIL DI TOKO - Cabang ${cabang}` : String(fd.get("alamat") || ""),
        kota: pickup ? cabang : kota,
        provinsi: pickup ? "-" : provinsi,
        catatan: pickup ? `[AMBIL DI TOKO - ${cabang}] ${catatanRaw}`.trim() : catatanRaw,
        kupon: coupon?.code,
        pickup,
        kodePos: pickup ? undefined : kodePos || undefined,
        lokasiId: pickup ? undefined : lokasi?.id,
        shippingCourier: pickup ? undefined : chosen?.id,
        items: items.map((x) => ({ productId: x.productId, variantId: x.variantId, qty: x.qty, gift: x.gift })),
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
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 font-bold text-gray-900">Data Penerima</h2>
            <div className="space-y-3">
              {/* Metode: ambil di toko / kirim */}
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "pickup" as const, title: "Pengambilan di Toko", sub: "Siap diambil di cabang" },
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
                <select value={cabang} onChange={(e) => setCabang(e.target.value)} className="field">
                  <option value="">Pilih cabang pengambilan</option>
                  <option value="Jogja">Tirtonic Jogja</option>
                  <option value="Semarang">Tirtonic Semarang</option>
                  <option value="Solo">Tirtonic Solo</option>
                </select>
              )}

              <input name="nama" required placeholder="Nama lengkap" className="field" autoComplete="name" />
              <input name="telepon" required inputMode="tel" placeholder="No. WhatsApp (08xxx)" className="field" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {voucher && <p className="mt-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">🎁 Voucher demo kamu otomatis dipakai: {voucher.label} (−{rupiah(voucher.diskon)})</p>}

              {metode === "kirim" && (
                <>
                  <textarea name="alamat" required rows={2} className="field" placeholder="Alamat lengkap" autoComplete="street-address" />
                  <div className="grid grid-cols-2 gap-2">
                    <select required value={provinsi} onChange={(e) => { setProvinsi(e.target.value); setKota(""); }} className="field">
                      <option value="">Provinsi</option>
                      {PROVINSI.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select required value={kota} onChange={(e) => setKota(e.target.value)} disabled={!provinsi} className="field disabled:bg-gray-100 disabled:text-gray-400">
                      <option value="">Kota/Kab.</option>
                      {kotaOptions.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </>
              )}
              <textarea name="catatan" rows={2} className="field" placeholder="Catatan (opsional)" />
            </div>
          </div>

          {metode === "kirim" && (
            <div className="glass-card space-y-3 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900">Pengiriman</h2>
              <div className={`rounded-xl p-3 text-sm font-semibold ${freeOngkir ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-800"}`}>
                {hasB1
                  ? "Ada barang Buy 1 Get 1: ongkir dihitung per barang sesuai berat dan tidak berlaku gratis ongkir."
                  : freeOngkir
                  ? "Selamat! Pesanan kamu dapat gratis ongkir."
                  : `Belanja ${rupiah(FREE_ONGKIR_MIN - belanja)} lagi untuk gratis ongkir (min. ${rupiah(FREE_ONGKIR_MIN)}).`}
              </div>
              <div className="relative">
                {lokasi ? (
                  <div className="field flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-gray-900">{lokasi.label}</span>
                    <button type="button" onClick={() => { setLokasi(null); setLokasiQ(""); setRates(null); }} className="shrink-0 text-xs font-semibold text-primary">Ganti</button>
                  </div>
                ) : (
                  <input
                    value={lokasiQ}
                    onChange={(e) => setLokasiQ(e.target.value)}
                    placeholder="Cari kelurahan / kecamatan tujuan (mis. Condongcatur)"
                    className="field w-full"
                    autoComplete="off"
                  />
                )}
                {!lokasi && lokasiQ.trim().length >= 3 && (
                  <div className="mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm" /* inline, bukan melayang: kartu glass di bawah tak menutupinya */>
                    {lokasiBusy && !lokasiOpts.length ? (
                      <p className="px-4 py-3 text-sm text-gray-500">Mencari…</p>
                    ) : lokasiOpts.length ? (
                      lokasiOpts.map((o) => (
                        <button key={o.id} type="button" onClick={() => setLokasi(o)} className="block w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-primary/5">
                          {o.label}
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-500">Lokasi tidak ditemukan. Coba nama kelurahan, kecamatan, atau kode pos.</p>
                    )}
                  </div>
                )}
              </div>
              {ratesBusy && <p className="text-sm text-gray-500">Mengecek ongkir…</p>}
              {ratesMsg && <p className="text-sm text-red-600">{ratesMsg}</p>}
              {rates && rates.length > 0 && (
                <div className="space-y-2">
                  {rates.map((r) => (
                    <label key={r.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${chosenId === r.id ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="shipping" checked={chosenId === r.id} onChange={() => setChosenId(r.id)} className="accent-primary" />
                        <span>
                          {r.label}
                          {r.etd && <span className="ml-1 text-xs text-gray-400">({r.etd})</span>}
                        </span>
                      </span>
                      {freeOngkir ? (
                        <span className="text-right"><s className="mr-1 text-xs text-gray-400">{rupiah(r.cost)}</s><span className="font-semibold text-primary">Gratis</span></span>
                      ) : (
                        <span className="text-right font-semibold text-gray-900">
                          {ongkirQty > 1 && <span className="mr-1 text-xs font-normal text-gray-400">{rupiah(r.cost)} × {ongkirQty} =</span>}
                          {rupiah(r.cost * ongkirQty)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {hasB1 && (
            <div id="ketentuan-b1g1" className={`glass-card scroll-mt-24 rounded-2xl p-5 text-xs leading-relaxed text-gray-500 backdrop-blur-md transition ${error && !agreeB1 ? "ring-2 ring-red-400" : "ring-1 ring-black/[0.04]"}`}>
              <p className="mb-1.5 text-sm font-[600] text-gray-700">Ketentuan Produk Stok Akhir</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Produk Buy 1 Get 1 merupakan stok akhir dan dijual dalam kondisi apa adanya.</li>
                <li>Produk dapat memiliki ketidaksempurnaan kosmetik, antara lain yellowing, noda ringan, bekas lem, goresan halus, atau kotak rusak, yang tidak memengaruhi fungsi produk.</li>
                <li>Produk tidak dapat ditukar, dikembalikan, atau di-refund dengan alasan kondisi kosmetik, ukuran, maupun perubahan keputusan.</li>
                <li>Jika terdapat kerusakan yang membuat produk tidak dapat digunakan (misalnya sol lepas atau jahitan robek) dan diketahui saat produk diterima, silakan hubungi kami maksimal 1×24 jam setelah barang diterima dengan menyertakan video unboxing.</li>
              </ol>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/50 p-3 text-gray-600">
                <input type="checkbox" checked={agreeB1} onChange={(e) => setAgreeB1(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                <span>Saya memahami bahwa produk Buy 1 Get 1 adalah <b className="font-[600] text-gray-700">stok akhir</b>, dapat memiliki ketidaksempurnaan kosmetik seperti yellowing yang tidak memengaruhi fungsi, dan <b className="font-[600] text-gray-700">tidak dapat ditukar atau dikembalikan</b>.</span>
              </label>
            </div>
          )}
        </div>

        <div className="md:sticky md:top-24 md:self-start">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 font-bold text-gray-900">Ringkasan Pesanan</h2>
            <ul className="space-y-3">
              {items.map((x) => (
                <li key={x.key} className="flex gap-3 text-sm">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border bg-gray-100">
                    {x.gambar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async" src={x.gambar} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-800 px-1 text-[10px] font-bold text-white">{x.qty}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-gray-800">{x.nama}</p>
                    {x.varian && <p className="text-xs text-gray-500">{x.varian}</p>}
                    {x.gift && <span className="mt-0.5 inline-block rounded bg-primary px-1.5 py-0.5 text-[9px] font-[800] text-white">BONUS</span>}
                    {x.b1g1 && <span className="mt-0.5 inline-block rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-[800] text-white">BUY 1 GET 1</span>}
                  </div>
                  {x.gift ? (
                    <span className="shrink-0 text-right">
                      {!!x.normal && <span className="block text-xs text-gray-400 line-through">{rupiah(x.normal * x.qty)}</span>}
                      <span className="block font-semibold text-primary">GRATIS</span>
                    </span>
                  ) : b1.freeQty[x.key] ? (
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-gray-400 line-through">{rupiah(x.harga * b1.freeQty[x.key])}</span>
                      <span className="block font-semibold text-red-600">{x.qty > b1.freeQty[x.key] ? rupiah(x.harga * (x.qty - b1.freeQty[x.key])) : "GRATIS"}</span>
                    </span>
                  ) : (
                    <span className="shrink-0 font-semibold text-gray-900">{rupiah(x.harga * x.qty)}</span>
                  )}
                </li>
              ))}
            </ul>

            {/* Kupon */}
            <div className="mt-4 border-t pt-4">
              <label className="label" htmlFor="kupon">Punya kupon?</label>
              <div className="flex gap-2">
                <input
                  id="kupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onApplyCoupon(); } }}
                  placeholder="mis. HEMAT10"
                  className="field flex-1 uppercase"
                  autoCapitalize="characters"
                />
                <button type="button" onClick={onApplyCoupon} disabled={couponBusy || !couponCode.trim()} className="btn-pill border border-primary bg-white px-4 text-primary hover:bg-primary/5 disabled:opacity-50">
                  {couponBusy ? "..." : "Pakai"}
                </button>
              </div>
              {couponMsg && <p className="mt-1.5 text-xs text-red-600">{couponMsg}</p>}
              {coupon && (
                <p className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">✓ Kupon {coupon.code} dipakai</span>
                  <button type="button" onClick={() => { setCoupon(null); setCouponCode(""); }} className="text-gray-400 underline hover:text-gray-600">hapus</button>
                </p>
              )}
            </div>

            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{rupiah(subtotal)}</span>
              </div>
              {b1.total > 0 && (
                <div className="flex justify-between font-semibold text-red-600">
                  <span>Buy 1 Get 1</span>
                  <span>−{rupiah(b1.total)}</span>
                </div>
              )}
              {b1.unpaired && <p className="text-[11px] text-amber-600">Pasangkan dengan barang Buy 1 Get 1 yang harganya berbeda (selisih maksimal Rp 500.000) supaya yang lebih murah gratis. Tanpa pasangan yang sesuai, barang dibayar penuh.</p>}
              {coupon && (
                <div className="flex justify-between font-semibold text-primary">
                  <span>Potongan kupon ({coupon.code})</span>
                  <span>−{rupiah(coupon.diskon)}</span>
                </div>
              )}
              {voucher && (
                <div className="flex justify-between font-semibold text-primary">
                  <span>Voucher demo ({voucher.code})</span>
                  <span>−{rupiah(voucher.diskon)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Ongkir</span>
                {metode === "pickup" ? (
                  <span>—</span>
                ) : freeOngkir ? (
                  <span className="font-semibold text-primary">Gratis</span>
                ) : (
                  <span>{chosen ? `${ongkirQty > 1 ? `${ongkirQty} × ${rupiah(chosen.cost)} = ` : ""}${rupiah(ongkir)}` : "Pilih lokasi"}</span>
                )}
              </div>
              <div className="flex justify-between pt-1 text-base font-extrabold text-gray-900">
                <span>Total</span>
                <span>{rupiah(total)}</span>
              </div>
            </div>


            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting} className="glass-primary btn-pill mt-4 w-full disabled:opacity-60">
              {submitting ? "Memproses..." : "Buat Pesanan & Bayar"}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">Kamu akan diarahkan ke halaman pembayaran yang aman.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
