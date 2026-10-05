"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah, waLink } from "@/lib/format";
import { useFav } from "./CartProvider";
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-gray-900">
        {title}
        <span className="text-xl text-gray-400 group-open:hidden">+</span>
        <span className="hidden text-xl text-gray-400 group-open:inline">−</span>
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-gray-600">{children}</div>
    </details>
  );
}

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
  const [color, setColor] = useState(hasVar ? colors[0].warna : "");
  const [url, setUrl] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const { has, toggle } = useFav();
  const { add: addToCart } = useShopCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const fav = has(p.id);

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

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-3">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="text-primary hover:underline">Home</Link>
        <span className="mx-2">/</span>
        {p.brand ? (
          <>
            <Link href={`/shop?brand=${encodeURIComponent(p.brand)}`} className="text-primary hover:underline">{p.brand}</Link>
            <span className="mx-2">/</span>
          </>
        ) : null}
        <span className="text-gray-700">{p.nama}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {/* gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
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
          </div>
          {gallery.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIdx(i)}
                  aria-label={`Gambar ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-primary" : "w-2 bg-gray-300"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div>
          <h1 className="text-3xl font-extrabold leading-tight text-gray-900">{p.nama}</h1>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{rupiah(priceNum)}</p>
                {discounted && <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">-{pct}%</span>}
              </div>
              {discounted && <p className="text-sm text-gray-400 line-through">{rupiah(normalNum)}</p>}
            </div>
            {/* Size chart only matters for sized products (shoes); hide it otherwise. */}
            {needSize &&
              (p.sizeChart ? (
                <button type="button" onClick={() => setShowChart(true)} className="text-sm text-gray-600 underline hover:text-primary">
                  Size Chart
                </button>
              ) : (
                <a href={waLink(`Halo Admin, boleh minta size chart untuk ${p.nama}?`)} target="_blank" rel="noreferrer" className="text-sm text-gray-600 underline hover:text-primary">
                  Size Chart
                </a>
              ))}
          </div>

          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${badgeSold ? "bg-red-500" : "bg-primary"}`}>
            {badgeSold ? "Sold Out" : "Ready Stock"}
          </span>

          {hasVar && (
            <div className="mt-6 space-y-5">
              {/* Color */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Pilih warna: <span className="font-normal text-gray-600">{color}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.warna}
                      onClick={() => {
                        setColor(c.warna);
                        setSize("");
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        color === c.warna ? "border-primary bg-primary/10 text-primary" : "border-gray-300 text-gray-700 hover:border-primary"
                      }`}
                    >
                      {c.gambar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.gambar} alt="" className="h-6 w-6 rounded object-cover" />
                      )}
                      {c.warna}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size (second axis) */}
              {hasSizeAxis && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-900">
                    Pilih ukuran: <span className="font-normal text-gray-600">{size || "-"}</span>
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {sizesForColor.map((v) => {
                      const habis = v.stok <= 0;
                      return (
                        <button
                          key={v.ukuran}
                          disabled={habis}
                          onClick={() => setSize(v.ukuran)}
                          className={`min-w-[64px] rounded-lg border px-4 py-3 text-sm font-medium transition ${
                            habis
                              ? "cursor-not-allowed border-gray-200 text-gray-300 line-through"
                              : size === v.ukuran
                              ? "border-primary bg-primary text-white"
                              : "border-gray-300 text-gray-700 hover:border-primary"
                          }`}
                        >
                          {v.ukuran}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock of the chosen combo */}
              {selVariant && (
                <p className="text-sm text-gray-600">
                  Stok: <span className="font-semibold text-gray-900">{selVariant.stok}</span>
                  {selVariant.stok <= 0 && <span className="ml-2 font-semibold text-red-500">Habis</span>}
                </p>
              )}
            </div>
          )}

          {needSize && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-gray-900">Select Size</p>
              <div className="flex flex-wrap gap-3">
                {p.ukuran.map((u) => (
                  <button
                    key={u}
                    onClick={() => setSize(u)}
                    className={`min-w-[56px] rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      size === u ? "border-primary bg-primary text-white" : "border-gray-300 text-gray-700 hover:border-primary"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {ready ? (
              <>
                <button onClick={buyNow} className="btn-pill flex-1 bg-primary hover:bg-primaryDark">
                  Beli Sekarang
                </button>
                <button onClick={addItem} className="btn-pill flex-1 border border-primary bg-white text-primary hover:bg-primary/5">
                  {added ? "✓ Ditambahkan" : "+ Keranjang"}
                </button>
              </>
            ) : (
              <button disabled className="btn-pill flex-1 cursor-not-allowed bg-gray-200 text-gray-400">
                {disabledMsg}
              </button>
            )}
            <button
              onClick={() => toggle({ id: p.id, nama: p.nama, harga: priceNum, gambar: colorImg ?? p.gambar[0] ?? null })}
              aria-label="Favorit"
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-xl border transition ${
                fav ? "border-red-300 bg-red-50 text-red-500" : "border-gray-300 text-gray-600 hover:border-primary"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>

          <div className="mt-8">
            <div className="border-b py-4">
              <p className="font-semibold text-gray-900">Deskripsi Produk</p>
              {p.deskripsi ? (
                <>
                  <p
                    className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 ${
                      descOpen ? "" : "line-clamp-3"
                    }`}
                  >
                    {p.deskripsi}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDescOpen((v) => !v)}
                    className="mt-2 text-sm font-semibold text-primary hover:underline"
                  >
                    {descOpen ? "Tutup" : "Selengkapnya"}
                  </button>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-400">Belum ada deskripsi untuk produk ini.</p>
              )}

              {descOpen && (
                <div className="mt-4 rounded-lg border">
                  <div className="border-b px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                    About Tirtonic
                  </div>
                  <div className="space-y-3 p-4 text-sm text-gray-600">
                    <p>
                      Tirtonic Tennis Store adalah toko perlengkapan tenis di Jogja, Solo &amp; Semarang yang menyediakan
                      produk original dari brand resmi dan distributor terpercaya. Melayani sejak 2022, seluruh produk
                      melalui pengecekan untuk memastikan keaslian dan kondisi sesuai standar.
                    </p>
                    <p>
                      Informasi produk pada halaman ini disusun oleh tim Tirtonic berdasarkan spesifikasi brand serta
                      pemeriksaan langsung. Ada pertanyaan soal produk, keaslian, atau ketersediaan? Hubungi customer
                      service kami.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <a href={process.env.NEXT_PUBLIC_INSTAGRAM || "https://instagram.com/tirtonic"} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition hover:bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/ig-icon.png" alt="" className="h-5 w-5 object-contain" />
                      </a>
                      <a href={waLink("Halo Admin Tirtonic, saya mau tanya produk.")} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition hover:bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/wa-icon.png" alt="" className="h-6 w-6 object-contain" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {needSize && (
              <Section title="Exchange Size Warranty">
                Garansi tukar ukuran hingga 7 hari setelah pesananmu diterima. Pastikan produk masih dalam kondisi baru & lengkap.
              </Section>
            )}
            <Section title="Authentic. Trusted. Best Price.">
              Semua produk dijamin 100% original & authentic dengan harga terbaik. Tirtonic melayani sejak 2022.
            </Section>
          </div>

          {categories.length > 0 && (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wide text-gray-400">Categories</p>
              <p className="mt-1 font-semibold text-gray-800">{categories.join(", ")}</p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <span className="font-semibold text-gray-800">Bagikan</span>
            {[
              { href: share.wa, label: "WhatsApp", icon: "/wa-icon.png", size: "h-6 w-6" },
              { href: share.ig, label: "Instagram", icon: "/ig-icon.png", size: "h-5 w-5" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Bagikan ke ${s.label}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border bg-white transition hover:bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt="" className={`${s.size} object-contain`} />
              </a>
            ))}
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
            <img src={p.sizeChart} alt="Size chart" className="max-h-[90vh] w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
