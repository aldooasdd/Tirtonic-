# Prompt Claude Code — Tirtonic String Finder (aplikasi terpisah, PRD v2.0)

Persiapan: buat folder/repo baru `tirtonic-string-finder`, lalu salin isi bundel ini ke `docs/string-finder/` di dalamnya. Buka Claude Code di folder repo baru itu, **bukan** di repo website Tirtonic.

Jalankan satu prompt per tahap. Review dan commit setiap tahap sebelum lanjut.

## Prompt 0 — Orientasi dan rencana (tanpa kode)

```
Ini repo baru untuk aplikasi Tirtonic String Finder. Aplikasi ini terpisah dari website Tirtonic: jangan memakai kode, database, atau login website.

Baca docs/string-finder/README.md, docs/string-finder/PRD-string-finder.md (versi 2.0), semua file di docs/string-finder/reference, dan docs/string-finder/design/prototype.html beserta screenshot di docs/string-finder/design. Untuk file CSV, cukup baca header dan beberapa baris.

Keputusan yang sudah final, jangan ditanyakan lagi:
- Stack sesuai PRD bagian 8: Next.js App Router, TypeScript strict, Tailwind, Prisma + PostgreSQL (Supabase project baru), jose, qrcode, lucide-react, deploy Vercel.
- Tes: node --test + tsx.
- Tabel cabang SfBranch dibuat sendiri.
- Login password saja: APP_PASSWORD untuk toko, ADMIN_PASSWORD untuk admin dan stasiun.
- Tema terang, hijau Rolex (#006039) dan putih, dengan tampilan mengikuti prototipe.

Buat laporan singkat berisi:
1. Rencana struktur folder dan file.
2. Skema Prisma lengkap untuk Fase 1.
3. Daftar env yang dibutuhkan.
4. Rencana per tahap 1a sampai 1d.
5. Bagian PRD yang ambigu, masing-masing dengan usulan jawaban.

Jangan menulis kode dulu. Tunggu kata "mulai 1a".
```

## Prompt 1a — Scaffold, data, engine, dan tes

```
Mulai 1a sesuai PRD v2.0 bagian 9. Belum ada UI di tahap ini.

1. Scaffold Next.js (App Router, TypeScript strict, Tailwind) dan Prisma dengan skema Fase 1 (PRD 7.4). Buat migrasi dan .env.example.
2. scripts/import-twu.ts:
   - impor docs/string-finder/data/twu_strings_clean.csv;
   - baris dobel (string + tension_lbs + swing sama) dirata-rata;
   - simpan datasetVersion.
3. scripts/seed.ts:
   - SfRuleSet aktif dari reference/rules.json;
   - SfBranch Yogyakarta, Solo, Semarang (paperMm 58).
4. Port ke TypeScript, pure function, logika identik dengan kode acuan:
   - reference/engine.js → lib/string-finder/engine.ts
   - reference/slip.js → lib/string-finder/slip.ts
5. lib/string-finder/load.ts:
   - muat dataset dan aturan aktif dari database dalam struktur yang sama dengan data/strings.json;
   - hitung persentil sekali, lalu cache di memori, dengan fungsi untuk invalidate cache.
6. Tes dengan node --test + tsx memakai reference/test-cases.json dan reference/slip-test-cases.json:
   - skor dengan toleransi ±0,1;
   - nama dan urutan senar identik;
   - data resep identik;
   - jalankan dua kali: dengan data dari database dan dengan data/strings.json langsung.

Tahap ini selesai kalau semua tes lulus. Laporkan hasilnya beserta perintah untuk impor, seed, dan tes.
```

## Prompt 1b — Login, cabang, dan alur customer (UI sesuai prototipe)

```
Kerjakan 1b sesuai PRD v2.0 bagian 6.1–6.6 dan 6.10.

Auth:
- Login password saja (APP_PASSWORD), diperiksa di server dengan perbandingan constant-time.
- Sesi JWT (jose) di cookie httpOnly/secure/sameSite=lax, berlaku 30 hari.
- middleware.ts melindungi semua halaman dan API kecuali halaman login dan aset statis.
- Rate limit 5 percobaan gagal per 15 menit per IP.
- Tombol Keluar.

Alur:
- Setelah login pertama di perangkat, tampil layar pilih cabang (dari SfBranch aktif, disimpan di cookie sf_branch dan divalidasi di server).
- Lalu Beranda, 7 pertanyaan, Hasil, dan Pratinjau resep.
- POST /api/recommend menyimpan SfResult dan mengembalikan code, picks, dan profile_summary. Dataset lengkap tidak boleh dikirim ke browser.
- Pratinjau memakai GET /api/slip/[code]?rank= di dalam iframe.

Tampilan WAJIB mengikuti docs/string-finder/design/prototype.html dan screenshot di folder design:
- token warna, font Plus Jakarta Sans, skala teks, radius, tombol, opsi, header hijau, pola senar, kartu hasil (kartu 1 bertanda "Paling cocok"), dan baris atribut bergaris dengan simpul;
- teks layar sama dengan prototipe;
- tema terang saja;
- ikon dari lucide-react, tanpa emoji;
- tidak ada font, warna, atau library UI lain.

Perilaku layar:
- Pindah layar memfokuskan judul.
- Idle 120 detik di layar pertanyaan, hasil, atau pratinjau kembali ke Beranda.
- Uji di lebar 390 px, 820 px, dan 1366 px.
- Bandingkan hasilnya dengan screenshot prototipe, lalu sebutkan perbedaan yang tersisa.

Tombol "Cetak resep" untuk sementara hanya membuat job di database (stasiun dikerjakan di 1c). Tahap ini selesai kalau US-1 sampai US-4 dan US-10 terpenuhi.
```

## Prompt 1c — Cetak thermal dan stasiun

```
Kerjakan 1c sesuai PRD v2.0 bagian 6.6–6.8.

1. POST /api/print-jobs:
   - cabang diambil dari cookie perangkat;
   - batas 10 job per 10 menit per sesi;
   - job kedaluwarsa setelah 30 menit.
   GET /api/print-jobs/[id] mengembalikan status.
2. Layar Selesai sesuai prototipe:
   - tampilkan kode besar dan hitung mundur 60 detik;
   - kalau job belum terkirim dalam 30 detik, tampilkan "Resep belum tercetak. Tunjukkan kode ini ke stringer."
3. Stasiun:
   - login /stasiun/login dengan ADMIN_PASSWORD, scope station, sesi 30 hari;
   - halaman /stasiun: pilih cabang, polling job antri setiap 3 detik, iframe tersembunyi + print(), afterprint menandai terkirim;
   - heartbeat, Tes cetak, Cetak ulang, dan peringatan kalau ada job gagal;
   - tampilan mengikuti design system.
4. Resep lengkap dengan QR (qrcode, SVG) ke /admin/resep/[kode], waktu WIB, dan kertas sesuai paperMm cabang. Hasil buildSlip harus identik dengan slip-test-cases.json.
5. Tulis docs/string-finder/SETUP-PRINTER.md berisi:
   - cara menjalankan Chrome/Edge di Windows dengan --kiosk-printing;
   - cara menjadikan printer thermal sebagai printer default;
   - cara mengatur ukuran kertas 58/80 mm di driver;
   - cara membuka /stasiun otomatis saat PC menyala.

Tahap ini selesai kalau US-5 sampai US-8 terpenuhi. Kalau printer belum tersedia, uji dengan dialog print biasa.
```

## Prompt 1d — Admin

```
Kerjakan 1d sesuai PRD v2.0 bagian 6.9:
- /admin/login (ADMIN_PASSWORD, sesi 12 jam);
- simulator;
- editor aturan berversi, dengan pratinjau 8 profil uji (aturan lama dibandingkan aturan baru), fitur pulihkan versi, dan invalidate cache engine saat disimpan;
- cabang (aktif/nonaktif, ukuran kertas, status stasiun);
- daftar resep dan detail /admin/resep/[kode] dengan Cetak ulang;
- log.

Tampilan memakai design system yang sama: tabel dan form yang rapi, header hijau.

Tahap ini selesai kalau US-9 terpenuhi dan semua tes 1a masih lulus.
```
