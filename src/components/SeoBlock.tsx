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
            Tirtonic Tennis Store – Toko Spesialis Tenis di Jogja, Solo &amp; Semarang
          </h2>
          <p>
            Tirtonic Tennis Store adalah toko spesialis khusus tenis di Jogja, Solo, dan Semarang yang menyediakan
            perlengkapan tenis original, terlengkap, terbesar dan berkualitas. Tersedia raket tenis, sepatu tenis,
            senar tenis, tas tenis, grip tenis, hingga bola tenis dari brand-brand terbaik dunia. Kami juga melayani
            pengiriman ke seluruh wilayah Indonesia. Kalau Anda sedang mencari toko raket tennis dan sepatu tenis
            original dengan pilihan lengkap, Tirtonic Tennis Store adalah tempat yang paling tepat.
          </p>
          <h3 className="font-bold text-gray-900">Tennis Store Terlengkap di Yogyakarta dan Jawa Tengah</h3>
          <p>
            Tirtonic Tennis Store berdiri sejak 2022 dan telah melayani ribuan pelanggan, dari pemain pemula hingga
            pemain turnamen. Sebagai toko khusus tenis, kami hanya fokus menyediakan perlengkapan tenis yang lengkap,
            original, dan terbaru. Kini Tirtonic memiliki tiga cabang: toko tenis Tirtonic di Jogja (Palagan), toko
            tenis Tirtonic di Solo (Manahan), dan toko tenis Tirtonic di Semarang (Simpang Lima).
          </p>
          <p>
            Brand yang tersedia di Tirtonic antara lain Wilson, HEAD, Yonex, Babolat, Prince, Tecnifibre, Solinco,
            Volkl, Mizuno, Dunlop, MSV, Toalson, Tourna, Grapplesnake, Signum Pro, Isospeed, Deshibeli, Mayami,
            Toroline, ReString, Luxilon, Ibuki, Slazenger, Lacoste, K-Swiss, Asics, Nike, Adidas, dan New Balance,
            termasuk rilisan terbaru dan edisi terbatas.
          </p>
          <h3 className="font-bold text-gray-900">Lokasi dan Jam Buka Tirtonic Tennis Store</h3>
          <p>
            Untuk Anda yang ingin melihat dan mencoba langsung raket atau sepatu tenis, silakan kunjungi cabang
            Tirtonic terdekat. Semua cabang buka setiap hari, pukul 09.00 – 21.00.
          </p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong>Tirtonic Tennis Store Jogja (Headquarters)</strong> — Jl. Sedan Asri No.84, Waras, Sariharjo,
              Kec. Ngaglik, Kab. Sleman, DIY 55581 (area Palagan). WhatsApp: 0851-6321-5511
            </li>
            <li>
              <strong>Tirtonic Tennis Store Solo</strong> — Jl. Samratulangi No.20, Kerten, Kec. Laweyan, Kota
              Surakarta, Jawa Tengah 57143 (dekat Manahan). WhatsApp: 0851-7984-8167
            </li>
            <li>
              <strong>Tirtonic Tennis Store Semarang</strong> — Jl. Pekunden Dalam No.19C, RW.09, Pekunden, Kec.
              Semarang Tengah, Kota Semarang, Jawa Tengah 50241 (dekat Simpang Lima). WhatsApp: 0851-6321-5511
            </li>
          </ul>
          {!open && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>

        {/* right column */}
        <div className={`relative space-y-4 text-sm leading-relaxed text-gray-700 ${open ? "" : "max-h-[420px] overflow-hidden"}`}>
          <h2 className="text-lg font-bold text-gray-900">Keuntungan Belanja di Toko Tenis Tirtonic</h2>
          <ol className="list-inside list-decimal space-y-2">
            <li><strong>Toko Fisik di Tiga Kota</strong> — Datang langsung ke toko kami di Jogja, Solo, atau Semarang untuk melihat koleksi, merasakan berat dan grip raket, serta mencoba sepatu tenis sebelum membeli.</li>
            <li><strong>Produk 100% Original</strong> — Semua raket, sepatu, dan perlengkapan tenis dijamin original dan bisa diperiksa langsung kualitasnya di toko.</li>
            <li><strong>Khusus Perlengkapan Tenis</strong> — Tirtonic bukan toko olahraga umum. Karena fokus di tenis, pilihan raket, sepatu, dan senar kami jauh lebih lengkap.</li>
            <li><strong>Pelayanan dari Staf yang Paham Tenis</strong> — Staf kami siap membantu memilih raket sesuai gaya bermain, menentukan ukuran grip, dan memilih sepatu untuk jenis lapangan Anda.</li>
            <li><strong>Garansi Tukar Ukuran</strong> — Belanja sepatu tenis tanpa khawatir; kalau ukurannya kurang pas bisa ditukar sesuai ketentuan yang berlaku.</li>
            <li><strong>Koleksi Terbaru dan Edisi Terbatas</strong> — Selalu ada rilisan terbaru dari Wilson, HEAD, Yonex, Lacoste, dan brand lainnya, termasuk edisi terbatas yang paling dicari.</li>
            <li><strong>Kirim ke Seluruh Indonesia</strong> — Tidak sempat ke toko? Pesan lewat website tirtonic.com atau WhatsApp dan pesanan segera kami kirim ke alamat tujuan.</li>
          </ol>
          <h3 className="font-bold text-gray-900">Cara Belanja di Tirtonic Tennis Store</h3>
          <p>
            Untuk pemesanan online, kunjungi tirtonic.com atau hubungi WhatsApp kami. Untuk mencoba dan membeli
            langsung, kunjungi toko tenis Tirtonic di Jogja, Solo, dan Semarang.
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
