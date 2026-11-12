"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah, waLink } from "@/lib/format";
import { FREE_ONGKIR_MIN } from "@/lib/constants";
import { useShopCart } from "./ShopCartProvider";

type Variant = { id?: string; warna: string; ukuran: string; harga: number; hargaDiskon?: number | null; stok: number; gambar: string | null };

type P = {
  id: string;
  nama: string;
  kategori: string;
  brand: string | null;
  harga: number;
  hargaDiskon?: number | null;
  deskripsi: string | null;
  gambar: string[];
  ukuran: string[];
  sizeChart?: string | null;
  status: "READY" | "SOLD";
  stok?: number | null;
  variants?: Variant[];
};

const Acc = ({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) => (
  <details open={open} className="group rounded-2xl border border-gray-200 bg-white">
    <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-[600] text-gray-900 [&::-webkit-details-marker]:hidden">
      {title}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-500 transition group-open:rotate-180" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
    </summary>
    <div className="px-5 pb-5 text-sm leading-relaxed text-gray-600">{children}</div>
  </details>
);
const Info = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex items-center gap-3">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-800">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={icon} /></svg>
    </span>
    <div className="min-w-0 leading-tight">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="truncate text-[13px] font-[500] text-gray-900">{value}</p>
    </div>
  </div>
);


export default function ProductDetail({ p }: { p: P }) {
  const variants = p.variants || [];
  const hasVar = variants.length > 0;
  const hasSizeAxis = variants.some((v) => v.ukuran !== "");
  // unique colors in order, each with its first available photo
  const colors = variants.reduce<{ warna: string; gambar: string | null }[]>((acc, v) => {
    const found = acc.find((c) => c.warna === v.warna);
    if (!found) acc.push({ warna: v.warna, gambar: v.gambar });
    else if (!found.gambar && v.gambar) found.gambar = v.gambar;
    return acc;
  }, []);

  const [active, setActive] = useState(0);
  const [size, setSize] = useState("");
  // Default: warna/ukuran pertama yang masih ada stok (bukan yang habis).
  const firstInStock = colors.find((c) => variants.some((v) => v.warna === c.warna && v.stok > 0)) ?? colors[0];
  const [color, setColor] = useState(hasVar ? firstInStock.warna : "");
  const [url, setUrl] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const { add: addToCart } = useShopCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setUrl(window.location.href), []);
  // when the color changes, its photo becomes first — jump the gallery back to the start
  useEffect(() => {
    setActive(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [color]);

  const scrollToIdx = (i: number) => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  // keep the active dot in sync while the user swipes the gallery
  const onGalleryScroll = () => {
    const el = scrollerRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const stokHabis = !hasVar && p.stok != null && p.stok <= 0; // produk non-varian dengan stok 0
  const sold = p.status === "SOLD" || stokHabis;
  const needSize = !hasVar && p.ukuran.length > 0; // shoe sizes, only when there are no variants

  // variant selection
  const sizesForColor = variants.filter((v) => v.warna === color);
  // warna habis = semua varian warna itu stoknya 0 (buat sepatu, warna = ukuran)
  const colorSold = (warna: string) => variants.filter((v) => v.warna === warna).every((v) => v.stok <= 0);
  const selVariant = hasVar
    ? hasSizeAxis
      ? variants.find((v) => v.warna === color && v.ukuran === size)
      : variants.find((v) => v.warna === color)
    : undefined;
  const colorImg = hasVar ? colors.find((c) => c.warna === color)?.gambar ?? null : null;
  const gallery = colorImg ? [colorImg, ...p.gambar.filter((g) => g !== colorImg)] : p.gambar;

  // price shown: selected variant, else "mulai dari" cheapest, else plain product price
  // effective price = discount if set, else normal. Headline follows the cheapest variant until one is picked.
  const eff = (v: Variant) => v.hargaDiskon ?? v.harga;
  const cheapestVar = hasVar ? variants.reduce((a, b) => (eff(b) < eff(a) ? b : a)) : null;
  const base = selVariant ?? cheapestVar;
  const normalNum = hasVar ? base?.harga ?? 0 : p.harga;
  const diskonNum = hasVar ? base?.hargaDiskon ?? null : p.hargaDiskon ?? null;
  const discounted = diskonNum != null && diskonNum < normalNum;
  const priceNum = discounted ? diskonNum! : normalNum;
  const pct = discounted ? Math.round((1 - diskonNum! / normalNum) * 100) : 0;

  const ready = hasVar
    ? !sold && !!selVariant && selVariant.stok > 0
    : !sold && (!needSize || !!size);

  // Badge "Ready Stock" / "Sold Out" ikut ketersediaan: produk di-set SOLD,
  // atau semua varian habis, atau varian yang dipilih stoknya 0.
  const anyInStock = hasVar ? variants.some((v) => v.stok > 0) : !sold;
  const badgeSold = sold || (hasVar && (!anyInStock || (!!selVariant && selVariant.stok <= 0)));

  const addItem = () => {
    if (!ready) return;
    addToCart({
      productId: p.id,
      variantId: selVariant?.id ?? null,
      nama: p.nama,
      varian: hasVar ? `${color}${hasSizeAxis && size ? " / " + size : ""}` : needSize && size ? size : null,
      harga: priceNum,
      gambar: colorImg ?? p.gambar[0] ?? null,
      qty: 1,
      max: hasVar ? selVariant?.stok ?? 1 : p.stok ?? 99,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  const buyNow = () => {
    if (!ready) return;
    addItem();
    router.push("/checkout");
  };

  const disabledMsg = sold
    ? "Stok Habis"
    : hasVar
    ? !selVariant
      ? "Pilih varian dulu"
      : "Stok Habis"
    : "Pilih ukuran dulu";
  const share = {
    wa: `https://wa.me/?text=${encodeURIComponent(p.nama + " " + url)}`,
    ig: process.env.NEXT_PUBLIC_INSTAGRAM || "https://instagram.com/tirtonic",
  };
  const categories = [p.brand, p.kategori].filter(Boolean) as string[];

  const pill = (on: boolean, habis: boolean) =>
    `rounded-full px-5 py-3 text-sm font-[500] transition ${
      habis ? "cursor-not-allowed bg-gray-50 text-gray-300 line-through" : on ? "bg-neutral-950 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-3">
      <nav className="mb-5 flex items-center gap-3 text-sm text-gray-500">
        <button type="button" onClick={() => router.back()} aria-label="Kembali" className="grid h-8 w-8 place-items-center rounded-full text-gray-800 transition hover:bg-gray-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
        </button>
        <Link href="/" className="hover:text-gray-900">Home</Link>
        <span className="text-gray-300">›</span>
        {p.brand ? (
          <>
            <Link href={`/shop?brand=${encodeURIComponent(p.brand)}`} className="hover:text-gray-900">{p.brand}</Link>
            <span className="text-gray-300">›</span>
          </>
        ) : null}
        <span className="truncate text-gray-700">Detail produk</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-10">
        {/* gallery */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-gray-100">
            {gallery.length > 0 ? (
              <div
                ref={scrollerRef}
                onScroll={onGalleryScroll}
                className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {gallery.map((g, i) => (
                  <div key={g + i} className="relative h-full w-full shrink-0 snap-center">
                    <Image src={g} alt={p.nama} fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" priority={i === 0} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">No image</div>
            )}

            {/* progress bar ala story */}
            {gallery.length > 1 && (
              <div className="pointer-events-none absolute inset-x-5 top-4 flex gap-1.5">
                {gallery.map((_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i === active ? "bg-white" : "bg-white/40"}`} />
                ))}
              </div>
            )}

            {/* thumbnail di bawah, di atas foto */}
            {gallery.length > 1 && (
              <div className="absolute inset-x-3 bottom-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {gallery.map((g, i) => (
                  <button
                    key={g + i}
                    type="button"
                    onClick={() => scrollToIdx(i)}
                    aria-label={`Gambar ${i + 1}`}
                    className={`relative aspect-[5/4] w-[calc((100%-1rem)/3)] shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition ${i === active ? "border-white shadow-lg" : "border-transparent opacity-80 hover:opacity-100"}`}
                  >
                    <Image src={g} alt="" fill sizes="200px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/shop?type=${encodeURIComponent(p.kategori)}`} className="rounded-full border border-gray-200 px-3.5 py-1 text-xs text-gray-700 hover:border-gray-400">{p.kategori}</Link>
            <span className={`rounded-full px-3 py-1 text-xs font-[600] ${badgeSold ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
              {badgeSold ? "Sold Out" : "Ready Stock"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-[600] leading-tight tracking-tight text-gray-900 sm:text-3xl">{p.nama}</h1>

          <div className="mt-3 flex items-end gap-2.5">
            <p className="text-2xl font-[600] text-gray-900">{rupiah(priceNum)}</p>
            {discounted && (
              <>
                <p className="pb-0.5 text-sm text-gray-400 line-through">{rupiah(normalNum)}</p>
                <span className="mb-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-[600] text-white">-{pct}%</span>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-600">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            <span>Gratis ongkir untuk belanja min. <b className="font-[600] text-gray-900">{rupiah(FREE_ONGKIR_MIN)}</b> · bisa ambil di toko</span>
          </div>

          {hasVar && (
            <div className="mt-6 space-y-5">
              <div>
                <p className="mb-2.5 text-sm text-gray-500">
                  {!hasSizeAxis && /sepatu/i.test(p.kategori) ? "Pilih ukuran" : "Pilih warna"}: <span className="text-gray-900">{color}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const habis = colorSold(c.warna);
                    return (
                      <button
                        key={c.warna}
                        disabled={habis}
                        onClick={() => {
                          setColor(c.warna);
                          setSize("");
                        }}
                        className={`${pill(color === c.warna, habis)} flex items-center gap-2 ${c.gambar ? "py-2 pl-2" : ""}`}
                      >
                        {c.gambar && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img loading="lazy" decoding="async" src={c.gambar} alt="" className="h-7 w-7 rounded-full object-cover" />
                        )}
                        {c.warna}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasSizeAxis && (
                <div>
                  <p className="mb-2.5 text-sm text-gray-500">
                    Pilih ukuran: <span className="text-gray-900">{size || "-"}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sizesForColor.map((v) => (
                      <button key={v.ukuran} disabled={v.stok <= 0} onClick={() => setSize(v.ukuran)} className={`${pill(size === v.ukuran, v.stok <= 0)} min-w-[64px]`}>
                        {v.ukuran}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selVariant && (
                <p className="text-sm text-gray-500">
                  Stok: <span className="text-gray-900">{selVariant.stok}</span>
                  {selVariant.stok <= 0 && <span className="ml-2 text-red-500">Habis</span>}
                </p>
              )}
            </div>
          )}

          {needSize && (
            <div className="mt-6">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-sm text-gray-500">Pilih ukuran</p>
                {p.sizeChart ? (
                  <button type="button" onClick={() => setShowChart(true)} className="text-xs text-gray-600 underline hover:text-gray-900">Size Chart</button>
                ) : (
                  <a href={waLink(`Halo Admin, boleh minta size chart untuk ${p.nama}?`)} target="_blank" rel="noreferrer" className="text-xs text-gray-600 underline hover:text-gray-900">Size Chart</a>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {p.ukuran.map((u) => (
                  <button key={u} disabled={sold} onClick={() => setSize(u)} className={`${pill(size === u, sold)} min-w-[64px]`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {ready ? (
              <>
                <button onClick={buyNow} className="flex-1 rounded-full bg-neutral-950 py-3.5 text-sm font-[600] text-white transition hover:bg-neutral-800 active:scale-[0.99]">
                  Beli Sekarang
                </button>
                <button
                  onClick={addItem}
                  aria-label="Tambah ke keranjang"
                  title="Tambah ke keranjang"
                  className={`grid h-[50px] shrink-0 place-items-center rounded-full border transition ${added ? "w-auto border-emerald-600 bg-emerald-50 px-4 text-xs font-[600] text-emerald-700" : "w-[50px] border-gray-300 text-gray-800 hover:border-gray-900"}`}
                >
                  {added ? (
                    "✓ Masuk keranjang"
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /><path d="M15 10h-4M13 8v4" /></svg>
                  )}
                </button>
              </>
            ) : (
              <button disabled className="flex-1 cursor-not-allowed rounded-full bg-gray-100 py-3.5 text-sm font-[500] text-gray-400">
                {disabledMsg}
              </button>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <Acc title="Deskripsi Produk" open>
              {p.deskripsi ? (
                <>
                  <p className={`whitespace-pre-line ${descOpen ? "" : "line-clamp-4"}`}>{p.deskripsi}</p>
                  <button type="button" onClick={() => setDescOpen((v) => !v)} className="mt-2 text-sm font-[600] text-gray-900 hover:underline">
                    {descOpen ? "Tutup" : "Selengkapnya"}
                  </button>
                </>
              ) : (
                <p className="text-gray-400">Belum ada deskripsi untuk produk ini.</p>
              )}
            </Acc>

            <Acc title="Pengiriman" open>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-1">
                <Info icon="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z M7 7h.01" label="Diskon" value={discounted ? `Hemat ${pct}%` : "Harga normal"} />
                <Info icon="M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8" label="Garansi" value="100% Original" />
                <Info icon="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2 M15 18H9 M19 18h2a1 1 0 0 0 1-1v-3.7l-4-5.3H14 M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" label="Kurir" value="JNE · J&T · Lion" />
                <Info icon="M3 9l1.5-5h15L21 9 M3 9v11h18V9 M3 9h18 M9 20v-6h6v6" label="Ambil di toko" value="Jogja · Solo · Semarang" />
              </div>
            </Acc>

            {needSize && (
              <Acc title="Garansi Tukar Ukuran">
                Garansi tukar ukuran hingga 7 hari setelah pesananmu diterima. Pastikan produk masih dalam kondisi baru &amp; lengkap.
              </Acc>
            )}

            <Acc title="Tentang Tirtonic">
              <p>
                Tirtonic Tennis Store adalah toko perlengkapan tenis di Jogja, Solo &amp; Semarang yang menyediakan produk original dari brand resmi dan
                distributor terpercaya. Melayani sejak 2022, seluruh produk melalui pengecekan untuk memastikan keaslian dan kondisi sesuai standar.
              </p>
              <div className="mt-3 flex gap-2">
                <a href={share.ig} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border bg-white transition hover:bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/ig-icon.png" alt="" className="h-5 w-5 object-contain" />
                </a>
                <a href={waLink("Halo Admin Tirtonic, saya mau tanya produk.")} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full border bg-white transition hover:bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/wa-icon.png" alt="" className="h-6 w-6 object-contain" />
                </a>
              </div>
            </Acc>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            {categories.length > 0 && <p className="text-gray-500">{categories.join(" · ")}</p>}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Bagikan</span>
              {[
                { href: share.wa, label: "WhatsApp", icon: "/wa-icon.png", size: "h-6 w-6" },
                { href: share.ig, label: "Instagram", icon: "/ig-icon.png", size: "h-5 w-5" },
              ].map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noreferrer" aria-label={`Bagikan ke ${x.label}`} className="flex h-9 w-9 items-center justify-center rounded-full border bg-white transition hover:bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src={x.icon} alt="" className={`${x.size} object-contain`} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showChart && p.sizeChart && (
        <div
          onClick={() => setShowChart(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
        >
          <div className="relative max-h-[90vh] max-w-lg" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowChart(false)}
              aria-label="Tutup"
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-700 shadow"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={p.sizeChart} alt="Size chart" className="max-h-[90vh] w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
