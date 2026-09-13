"use client";

import { useState } from "react";

// Two-column SEO content with expand/collapse, replicating the old home page.
export default function SeoBlock() {
  const [open, setOpen] = useState(false);

  return (
    <section id="tentang" className="mx-auto max-w-site px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        {/* left column */}
        <div className={`relative space-y-4 text-sm leading-relaxed text-gray-700 ${open ? "" : "max-h-[420px] overflow-hidden"}`}>
          <h2 className="text-lg font-bold text-gray-900">
            Tirtonic Tennis Store – Toko Perlengkapan Tenis di Yogyakarta &amp; Solo
          </h2>
          <p>
            Tirtonic Tennis Store adalah toko perlengkapan tenis di Yogyakarta dan Solo yang menyediakan
            produk-produk original berkualitas serta melayani pengiriman ke seluruh wilayah Indonesia. Kalau
            Anda sedang membutuhkan sepatu tenis, raket, string, tas, grip, bola, maupun kebutuhan tenis lainnya,
            maka Tirtonic Tennis Store merupakan pilihan yang paling tepat.
          </p>
          <h3 className="font-bold text-gray-900">Tennis Store di Yogyakarta dan Solo</h3>
          <p>
            Tirtonic Tennis Store berdiri sejak tahun 2016 dan telah melayani ribuan pelanggan yang puas. Sebagai
            toko perlengkapan tenis original, kami menyediakan berbagai koleksi terbaru hingga edisi terbatas.
            Store Tirtonic saat ini terdapat di Yogyakarta dan Solo, dengan produk yang semuanya Authentic Guaranteed.
          </p>
          <h3 className="font-bold text-gray-900">Lokasi dan Cabang</h3>
          <ul className="list-inside list-disc">
            <li><strong>Yogyakarta</strong> — Jl. Malioboro No.123, Yogyakarta (10.00–22.00)</li>
            <li><strong>Solo</strong> — Solo Paragon Mall, Lt.1 Unit A-07, Solo (10.00–22.00)</li>
          </ul>
          <h3 className="font-bold text-gray-900">Keuntungan Belanja</h3>
          <ol className="list-inside list-decimal">
            <li><strong>Toko Fisik</strong> – Bisa mencoba langsung produk dan mendapat pelayanan ramah.</li>
            <li><strong>Koleksi Lengkap</strong> – Sepatu, raket, string, tas, grip, bola, dari brand populer.</li>
            <li><strong>100% Authentic</strong> – Semua produk dijamin asli.</li>
            <li><strong>Harga Kompetitif</strong> – Harga terbaik.</li>
            <li><strong>Limited Edition</strong> – Produk eksklusif.</li>
          </ol>
          {!open && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>

        {/* right column */}
        <div className={`relative space-y-4 text-sm leading-relaxed text-gray-700 ${open ? "" : "max-h-[420px] overflow-hidden"}`}>
          <h2 className="text-lg font-bold text-gray-900">Koleksi Produk Tirtonic Tennis Store</h2>
          <p>
            Tirtonic Tennis Store memiliki beragam koleksi perlengkapan tenis untuk menyesuaikan kebutuhan Anda.
            Berikut adalah kategori produk yang kami sediakan:
          </p>
          <p><strong>1. Sepatu Tenis</strong> — Tersedia sepatu tenis dari brand ternama untuk mendukung kenyamanan dan performa di lapangan, baik hard court maupun clay court.</p>
          <p><strong>2. Raket Tenis</strong> — Berbagai pilihan raket dari level beginner hingga professional player.</p>
          <p><strong>3. String &amp; Grip</strong> — String dengan berbagai tipe (control, power, spin) serta grip berkualitas.</p>
          <p><strong>4. Tas &amp; Aksesoris</strong> — Tas tenis, topi, wristband, dan aksesoris lain.</p>
          <p><strong>5. Bola Tenis</strong> — Bola tenis untuk latihan maupun pertandingan resmi.</p>
          <h3 className="font-bold text-gray-900">Cara Belanja Di Tirtonic Tennis Store</h3>
          <p>
            Anda bisa langsung mengunjungi toko kami di Yogyakarta dan Solo, atau melakukan pemesanan melalui
            website dan marketplace resmi. Setelah pemesanan dilakukan, kami akan segera mengirimkan produk ke alamat Anda.
          </p>
          {!open && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button onClick={() => setOpen((v) => !v)} className="btn-pill">
          {open ? "Sembunyikan Konten" : "Tampilkan Selengkapnya"}
        </button>
      </div>
    </section>
  );
}
