"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rupiah, waLink } from "@/lib/format";
import { useFav } from "./CartProvider";

type P = {
  id: string;
  nama: string;
  kategori: string;
  brand: string | null;
  harga: number;
  deskripsi: string | null;
  gambar: string[];
  ukuran: string[];
  sizeChart?: string | null;
  status: "READY" | "SOLD";
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
  const [active, setActive] = useState(0);
  const [size, setSize] = useState("");
  const [url, setUrl] = useState("");
  const [showChart, setShowChart] = useState(false);
  const { has, toggle } = useFav();
  const fav = has(p.id);

  useEffect(() => setUrl(window.location.href), []);

  const sold = p.status === "SOLD";
  const needSize = p.ukuran.length > 0;
  const ready = !sold && (!needSize || size);

  const orderMsg = `Halo Admin Tirtonic, saya mau pesan: ${p.nama}${size ? ` (ukuran ${size})` : ""}. Apakah masih ready?`;
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
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            {p.gambar[active] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.gambar[active]} alt={p.nama} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">No image</div>
            )}
          </div>
          {p.gambar.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {p.gambar.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
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
            <p className="text-2xl font-bold text-gray-900">{rupiah(p.harga)}</p>
            {p.sizeChart ? (
              <button type="button" onClick={() => setShowChart(true)} className="text-sm text-gray-600 underline hover:text-primary">
                Size Chart
              </button>
            ) : (
              <a href={waLink(`Halo Admin, boleh minta size chart untuk ${p.nama}?`)} target="_blank" rel="noreferrer" className="text-sm text-gray-600 underline hover:text-primary">
                Size Chart
              </a>
            )}
          </div>

          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${sold ? "bg-red-500" : "bg-primary"}`}>
            {sold ? "Sold Out" : "Ready Stock"}
          </span>

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

          <div className="mt-6 flex gap-3">
            {ready ? (
              <a href={waLink(orderMsg)} target="_blank" rel="noreferrer" className="btn-pill flex-1 bg-primary hover:bg-primaryDark">
                Buy Now
              </a>
            ) : (
              <button disabled className="btn-pill flex-1 cursor-not-allowed bg-gray-200 text-gray-400">
                {sold ? "Stok Habis" : "Pilih ukuran dulu"}
              </button>
            )}
            <button
              onClick={() => toggle({ id: p.id, nama: p.nama, harga: p.harga, gambar: p.gambar[0] ?? null })}
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
            <Section title="Deskripsi Produk">
              {p.deskripsi ? (
                <p className="whitespace-pre-line">{p.deskripsi}</p>
              ) : (
                <p className="text-gray-400">Belum ada deskripsi untuk produk ini.</p>
              )}

              <div className="mt-4 rounded-lg border">
                <div className="border-b px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                  About Tirtonic
                </div>
                <div className="space-y-3 p-4 text-sm text-gray-600">
                  <p>
                    Tirtonic Tennis Store adalah toko perlengkapan tenis di Yogyakarta &amp; Solo yang menyediakan
                    produk original dari brand resmi dan distributor terpercaya. Melayani sejak 2016, seluruh produk
                    melalui pengecekan untuk memastikan keaslian dan kondisi sesuai standar.
                  </p>
                  <p>
                    Informasi produk pada halaman ini disusun oleh tim Tirtonic berdasarkan spesifikasi brand serta
                    pemeriksaan langsung. Ada pertanyaan soal produk, keaslian, atau ketersediaan? Hubungi customer
                    service kami.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <a href={process.env.NEXT_PUBLIC_INSTAGRAM || "https://instagram.com/tirtonic"} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">📷</a>
                    <a href="https://www.tiktok.com/@tirtonic" target="_blank" rel="noreferrer" aria-label="TikTok" className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">♪</a>
                    <a href="https://youtube.com/@tirtonic" target="_blank" rel="noreferrer" aria-label="YouTube" className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">▶</a>
                  </div>
                </div>
              </div>
            </Section>
            <Section title="Exchange Size Warranty">
              Garansi tukar ukuran hingga 7 hari setelah pesananmu diterima. Pastikan produk masih dalam kondisi baru & lengkap.
            </Section>
            <Section title="Authentic. Trusted. Best Price.">
              Semua produk dijamin 100% original & authentic dengan harga terbaik. Tirtonic melayani sejak 2016.
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
