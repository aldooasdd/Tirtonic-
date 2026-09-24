# Prompt Claude Code — Tirtonic String Finder

Jalankan satu prompt per sesi/tahap. Review dan commit setiap tahap sebelum lanjut.

## Prompt 0 — Orientasi (tanpa kode)

```
Baca docs/string-finder/README.md, docs/string-finder/PRD-string-finder.md, dan semua file di docs/string-finder/reference. Untuk file CSV di docs/string-finder/data, cukup baca header dan beberapa baris pertama.

Setelah itu pelajari repo ini dan buat laporan. Jangan menulis kode dulu. Laporan berisi:
1. Stack: versi Next.js, App Router atau Pages Router, database dan ORM/client (Prisma/Drizzle/Supabase), cara migrasi, dan test runner yang tersedia.
2. Autentikasi admin yang sudah ada, dan cara melindungi halaman serta API admin.
3. Lokasi penyimpanan nomor WhatsApp admin dan data cabang toko.
4. Design system yang sudah ada: file warna, font, dan spacing, serta komponen yang bisa dipakai ulang (layout, header, footer, menu Quick Access, tombol, kartu produk, badge, floating WhatsApp, tampilan admin).
5. Rencana implementasi tahap 1a sampai 1d dari PRD: file yang akan dibuat atau diubah, dan skema tabel yang disesuaikan dengan stack repo.
6. Bagian PRD yang bertentangan dengan kondisi repo, beserta usulan penyesuaiannya.

Tunggu persetujuan saya sebelum mulai tahap 1a.
```

## Prompt 1a — Data, engine, dan tes

```
Kerjakan tahap 1a dari docs/string-finder/PRD-string-finder.md. Belum ada UI di tahap ini.

1. Tabel dan migrasi: twu_strings, twu_measurements, sf_rules (PRD 7.4), disesuaikan dengan ORM repo.
2. scripts/import-twu.ts:
   - impor docs/string-finder/data/twu_strings_clean.csv;
   - baris dobel (string + tension_lbs + swing sama) dirata-rata;
   - simpan dataset_version;
   - seed sf_rules dari reference/rules.json sebagai versi aktif.
3. Port ke TypeScript ketat, pure function, logika identik dengan kode acuan:
   - reference/engine.js → lib/string-finder/engine.ts
   - reference/slip.js → lib/string-finder/slip.ts
4. lib/string-finder/load.ts:
   - muat dataset dan aturan aktif dari database dalam struktur yang sama dengan data/strings.json;
   - hitung persentil sekali, lalu cache di memori.
5. Unit test dengan reference/test-cases.json dan reference/slip-test-cases.json:
   - skor dengan toleransi ±0,1;
   - nama dan urutan senar identik;
   - data resep identik;
   - jalankan tes dua kali: sekali dengan data dari database hasil impor, sekali dengan data/strings.json langsung.

Tahap ini selesai kalau semua tes lulus. Laporkan hasil tes dan perintah untuk menjalankannya.
```

## Prompt 1b — Halaman customer (mode online), UI sederhana ala tirtonic.com

```
Kerjakan tahap 1b dari PRD: halaman /rekomendasi-senar (mode online) dan API rekomendasi.

API:
- POST /api/string-finder/recommend sesuai PRD bagian 8.
- Validasi input terhadap reference/questions.json.
- Buat tabel sf_results, simpan hasil beserta kode resep, lalu kembalikan code, mode, picks, dan profile_summary.
- Browser hanya boleh menerima data 3 senar yang direkomendasikan, bukan dataset lengkap.

UI (PRD bagian 9). Wajib sederhana dan terlihat seperti bagian dari tirtonic.com:
- Pakai layout, header, footer, floating WhatsApp, font, warna, radius, dan komponen tombol/kartu yang sudah ada di repo.
- Jangan menambah font, warna, library UI, gradien, atau ilustrasi baru.
- Latar putih dan ruang kosong cukup. Animasi hanya transisi singkat antarlayar, dan prefers-reduced-motion dihormati.

Layar:
- Layar awal: judul "Cari senar yang pas untuk Anda", satu kalimat penjelasan, tombol Mulai.
- Pertanyaan:
  - satu per layar, teks dan pilihan persis dari questions.json;
  - pilihan berupa tombol besar selebar layar (tinggi minimal 44 px) dengan label dan hint kecil;
  - progress bar tipis dengan teks "3 dari 7", dan tombol Kembali;
  - aturan pertanyaan 3 sesuai PRD 6.1.
- Hasil:
  - ringkasan profil satu kalimat dan kode resep;
  - 3 kartu, bertumpuk di mobile dan berjajar di desktop, dengan kartu 1 bertanda "Paling cocok";
  - isi kartu sesuai PRD 6.3, termasuk bar atribut horizontal berlabel, bagian "Lihat data lab" yang bisa dibuka, dan tombol "Pilih senar ini".
- Setelah memilih:
  - pratinjau resep memakai renderSlipHTML di dalam iframe, tanpa QR admin;
  - tombol "Kirim ke WhatsApp" memakai nomor dari konfigurasi WhatsApp yang sudah ada, dengan pesan sesuai PRD 6.3;
  - tombol "Ubah jawaban" dan "Mulai lagi".

Titik masuk: tambahkan tautan "Rekomendasi Senar" di menu Quick Access dan di halaman kategori string (kalau ada).

Uji di lebar 375 px dan di desktop. Tahap ini selesai kalau US-1, US-2, dan US-8 terpenuhi. Laporkan cara saya mengecek hasilnya di lokal.
```

## Prompt 1c — Mode toko, resep, dan cetak thermal

```
Kerjakan tahap 1c dari PRD (bagian 6.7 dan 6.8): mode toko, resep stringing, dan cetak ke printer thermal.

1. Tabel sf_branches dan sf_print_jobs.
   - Seed cabang dari data cabang yang sudah ada di repo. Kalau tidak ada, pakai Yogyakarta, Solo, dan Semarang.
   - paper_mm default 58, bisa diubah per cabang.
2. Mode toko: /rekomendasi-senar?cabang=<slug>&t=<token>.
   - Kalau token valid, tombol utama menjadi "Cetak resep", ditambah "Belum yakin? Cetak ketiganya".
   - Parameter &kiosk=1 mengaktifkan auto reset sesuai PRD.
3. API print-jobs:
   - wajib token cabang;
   - rate limit 3 job per 10 menit per perangkat/IP;
   - job kedaluwarsa setelah 30 menit;
   - endpoint status untuk customer, termasuk pesan cadangan kalau resep belum tercetak setelah 30 detik.
4. Halaman admin, memakai tampilan admin yang sudah ada:
   - Stasiun cetak: polling 3 detik, iframe tersembunyi + print(), afterprint menandai status terkirim, heartbeat, tombol tes cetak, tombol cetak ulang.
   - Daftar dan detail resep di /admin/string-finder/resep/[kode], lengkap dengan QR.
   - Pengaturan cabang: token bisa di-generate ulang, ukuran kertas bisa diubah, dan ada tombol cetak poster QR ukuran A5.
5. Resep:
   - pakai lib/string-finder/slip.ts, hasilnya harus identik dengan slip-test-cases.json;
   - QR dibuat sebagai SVG di server;
   - waktu memakai WIB.
6. Tulis docs/string-finder/SETUP-PRINTER.md berisi:
   - cara menjalankan Chrome/Edge di Windows dengan --kiosk-printing;
   - cara menjadikan printer thermal sebagai printer default;
   - cara mengatur ukuran kertas di driver printer;
   - cara membuka halaman stasiun cetak otomatis saat PC menyala.

Tahap ini selesai kalau US-3 sampai US-7 terpenuhi. Kalau printer belum tersedia, uji dengan dialog print biasa.
```

## Prompt 1d — Admin: simulator, aturan, log

```
Kerjakan tahap 1d dari PRD (bagian 6.4):
- simulator;
- editor aturan berversi, dengan pratinjau 8 profil uji (aturan lama dibandingkan aturan baru) dan fitur pulihkan versi;
- ringkasan log.

Saat aturan disimpan, cache engine harus di-invalidate. Tampilan mengikuti admin yang sudah ada dan tetap sederhana.

Tahap ini selesai kalau US-9 terpenuhi dan semua tes tahap 1a masih lulus.
```
