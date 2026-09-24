# PRD: Tirtonic String Finder (Rekomendasi Senar Tenis + Resep Stringing)

| | |
|---|---|
| Produk | Website Tirtonic Tennis Store |
| Fitur | String Finder: rekomendasi 3 senar berdasarkan gaya bermain, dicetak sebagai resep untuk stringer |
| Pemilik | Aldo |
| Status | Siap diimplementasikan (Fase 1). Fase 2 menunggu data katalog, harga, dan penjualan |
| Versi dokumen | 1.2, 22 September 2026 |
| Pelaksana | Claude Code, di dalam proyek Next.js website Tirtonic |

**Perubahan v1.2:** UI dibuat sederhana dan menyatu dengan tirtonic.com (bagian 9); seed cabang mengikuti data cabang di website (Yogyakarta, Solo, Semarang).

**Perubahan v1.1:**
- Hasil rekomendasi kini menjadi **resep stringing** yang dicetak ke printer thermal di toko. Customer cukup menyerahkan kertasnya ke stringer.
- Tambahan: bagian 6.7 (isi resep), bagian 6.8 (cetak thermal), tabel cabang, dan antrean cetak.
- Tahapan, metrik, risiko, dan pertanyaan terbuka diperbarui.

---

## 0. Untuk Claude Code: cara memakai dokumen ini

Baca dalam urutan ini sebelum menulis kode:

1. Dokumen ini (PRD): tujuan, aturan, dan batasan.
2. `reference/engine.js`: implementasi acuan engine rekomendasi yang sudah diuji. Ini sumber kebenaran algoritma.
3. `reference/slip.js`: implementasi acuan resep stringing, yaitu data resep (`buildSlip`) dan template cetak (`renderSlipHTML`).
4. `reference/rules.json` dan `reference/questions.json`: konfigurasi awal (seed) untuk aturan, isi resep, dan pertanyaan.
5. `reference/test-cases.json` dan `reference/slip-test-cases.json`: golden output. Implementasi produksi **wajib** lolos semua kasus ini.
6. `data/`: dataset yang sudah dibersihkan beserta log pembersihannya.

Aturan kerja yang tidak boleh dilanggar:

- **Tidak ada LLM/AI di alur customer.** Semua input berupa klik dan semua rekomendasi dihitung deterministik dari data. Jawaban yang sama harus selalu menghasilkan rekomendasi yang sama.
- **Perhitungan di server.** Dataset lengkap TWU tidak boleh dikirim ke browser. API hanya mengembalikan hasil rekomendasi.
- **Port, jangan desain ulang.** Engine dan pembuat resep boleh ditulis ulang ke TypeScript, tetapi logika, rumus, urutan, dan tie-breaker harus identik dengan kode acuan. Kalau ada keraguan, ikuti kode acuan, bukan tafsiran dokumen.
- **Jangan mengarang data** untuk senar yang tidak punya data. Aturan data kosong ada di bagian 7.

---

## 1. Ringkasan

Customer toko tenis sering bingung memilih senar yang cocok dengan gaya bermainnya. Penjaga toko menjawab berdasarkan pengalaman, sehingga sarannya tidak konsisten dan sulit dijelaskan. Stringer juga harus menanyai ulang customer sebelum memasang senar.

String Finder adalah halaman di website Tirtonic:

- Customer menjawab 7 pertanyaan dengan klik, tanpa mengetik.
- Customer mendapat 3 rekomendasi senar dengan skor kecocokan dan alasan berbasis angka uji lab. Sumber datanya Tennis Warehouse University (TWU) String Performance Database: 789 senar, diuji pada 3 tensi dan 3 kecepatan ayunan.
- **Di toko**, customer memilih satu senar (atau ketiganya kalau belum yakin). Website lalu mencetak **resep stringing** ke printer thermal di meja stringer. Resep berisi senar pilihan, profil pemain, catatan untuk stringer, dan kolom kosong untuk tensi final, raket, dan data customer yang diisi tangan.
- **Di luar toko**, customer mengirim hasilnya ke WhatsApp admin.

Fase pengerjaan:

- **Fase 1 (dokumen ini, siap dikerjakan):** rekomendasi dari seluruh data TWU, plus resep dan cetak thermal. Hasilnya 3 senar dengan skor tertinggi dari keluarga senar yang berbeda.
- **Fase 2 (spesifikasi disiapkan):** rekomendasi hanya dari senar yang dijual Tirtonic dan ready stock. Tiga pilihan diberi label Terlaris, Premium (termahal), dan Paling hemat (termurah), dan ketiganya tetap harus lolos ambang kecocokan. Resep ditambah harga dan stok.

## 2. Masalah

- Customer tidak paham istilah teknis senar (stiffness, gauge, tension loss), sehingga sulit memilih sendiri.
- Saran penjaga toko berbeda-beda dan tidak bisa dijelaskan dengan data.
- Informasi dari customer ke stringer disampaikan lisan, sehingga mudah terlewat. Contohnya keluhan siku atau seberapa sering senar putus.
- Pilihan senar sangat banyak. Hampir 800 senar yang diuji saja sudah terlalu banyak untuk dibandingkan manual.
- Belum ada catatan kebutuhan customer yang bisa dipakai untuk keputusan stok.

## 3. Tujuan dan non-tujuan

**Tujuan Fase 1**

- Customer mendapat 3 rekomendasi relevan dalam waktu kurang dari 90 detik, tanpa mengetik.
- Di toko, resep tercetak di meja stringer dalam 2 ketukan setelah hasil muncul: "Pilih senar ini", lalu "Cetak resep".
- Stringer menerima semua informasi yang dibutuhkan di satu kertas, tanpa perlu menanyai ulang.
- Setiap rekomendasi bisa dijelaskan dan ditelusuri ke angka lab.
- Stringer bisa menyetel aturan dan isi catatan resep tanpa mengubah kode.
- Setiap sesi tercatat secara anonim untuk evaluasi dan keputusan stok.

**Non-tujuan (di luar cakupan)**

- Input teks bebas atau chatbot.
- Rekomendasi senar hybrid (mains dan crosses berbeda). Data TWU hanya menguji satu jenis senar per stringbed. Kolom mains dan crosses di resep diisi tangan oleh stringer.
- Tensi final yang dihitung otomatis. TWU tidak memberi rekomendasi tensi. Resep hanya menampilkan tensi yang biasa dipakai customer, dan tensi final ditulis stringer.
- Antrean status pengerjaan stringing (dikerjakan/selesai/diambil). Fitur ini bisa ditambahkan kemudian.
- Transaksi dan pembayaran di website.
- Harga, stok, dan label terlaris/premium/hemat. Ini masuk Fase 2.

## 4. Pengguna

| Persona | Kebutuhan | Konteks |
|---|---|---|
| Customer di toko | Tahu senar yang cocok, lalu langsung diproses stringer | HP sendiri (scan QR di meja) atau tablet toko |
| Customer di luar toko | Tahu senar yang cocok, lalu bertanya ke toko | HP, lewat website |
| Stringer | Informasi lengkap di satu kertas, bisa mencatat tensi dan raket | Meja stringing, printer thermal |
| Admin | Menyetel aturan, mengelola cabang dan stasiun cetak, melihat log | Dashboard admin website |

## 5. Alur pengguna

### Mode toko vs mode online

- **Mode toko** aktif kalau URL berisi `cabang` dan `t` (token cabang) yang valid, misalnya `/rekomendasi-senar?cabang=yogyakarta&t=XXXX`. URL ini hanya didapat dari:
  - QR yang ditempel di meja toko, atau
  - tablet kiosk toko.

  Di mode toko, tombol utama adalah **Cetak resep**.
- **Mode online** berlaku tanpa parameter tersebut. Tombol utamanya **Kirim ke WhatsApp**. Tidak ada cetak.
- **Mode kiosk:** tambahkan `&kiosk=1` untuk tablet milik toko. Layar kembali ke awal secara otomatis 60 detik setelah cetak berhasil, atau setelah 120 detik tanpa aktivitas.

### Customer (mode toko)

1. Scan QR di meja atau pakai tablet toko, lalu tekan "Mulai".
2. Jawab 7 pertanyaan, satu per layar.
3. Lihat 3 rekomendasi. Kode resep sudah tampil, misalnya **SF-7K2Q**.
4. Tekan **Pilih senar ini** di salah satu kartu, atau **Belum yakin? Cetak ketiganya**.
5. Lihat pratinjau resep, lalu tekan **Cetak resep**.
6. Layar menampilkan: "Resep SF-7K2Q sedang dicetak di meja stringer."
7. Ambil kertas dan serahkan ke stringer.

### Customer (mode online)

Langkah 1–3 sama. Setelah itu tekan **Kirim ke WhatsApp**. Pesan berisi kode resep, profil, dan 3 senar. Kalau customer datang ke toko, admin bisa mencetak resep dari kode tersebut.

### Stringer

1. Menerima kertas dari customer.
2. Menulis tensi final, mains/crosses, raket, nama, No. HP, dan jadwal ambil.
3. Bila perlu, scan QR di kertas untuk membuka detail resep di admin (perlu login).

### Admin

Mengelola:
- stasiun cetak per cabang;
- cabang dan token QR;
- aturan dan catatan resep;
- simulator;
- daftar resep dan log.

## 6. Kebutuhan fungsional

### 6.1 Kuesioner

Isi pertanyaan, pilihan, dan teks bantu diambil **persis** dari `reference/questions.json`.

| # | id | Pertanyaan | Tipe | Nilai pilihan |
|---|---|---|---|---|
| 1 | `level` | Sudah berapa lama Anda main tenis? | single | `pemula`, `rutin`, `kompetitif` |
| 2 | `swing` | Seperti apa ayunan raket Anda? | single | `santai`, `sedang`, `cepat` |
| 3 | `priorities` | Apa yang paling ingin Anda tingkatkan? | multi, maks. 2, urutan klik = prioritas | `spin`, `power`, `control`, `comfort` |
| 4 | `arm` | Ada keluhan di lengan, siku, atau bahu? | single | `tidak`, `pegal`, `cedera` |
| 5 | `change` | Biasanya ganti senar tiap berapa lama? | single | `cepat` (<1 bln), `sedang` (1–3 bln), `lama` (>3 bln) |
| 6 | `breakage` | Senar Anda sering putus sebelum sempat diganti? | single | `sering`, `kadang`, `tidak` |
| 7 | `tension` | Berapa tensi senar yang biasa Anda pakai? | single | `rendah` (<48), `sedang` (48–55), `tinggi` (>55), `tidaktahu` |

Perilaku:

- Single-select langsung lanjut setelah dipilih, dengan jeda sekitar 250 ms.
- Pertanyaan 3:
  - butuh minimal 1 pilihan dan tombol "Lanjut";
  - pilihan ditandai angka 1 dan 2 sesuai urutan klik, dan klik ulang membatalkan;
  - setelah ada 2 pilihan, pilihan lain dinonaktifkan;
  - kalau `control` dan `comfort` dipilih bersamaan, tampilkan `conflict_note`.
- Jawaban disimpan di state klien. Tidak perlu login, dan tidak ada data pribadi yang diminta.

### 6.2 Engine rekomendasi

Spesifikasi lengkap ada di `reference/engine.js`. Ringkasannya:

1. **Rencana (buildPlan).**
   - Bobot awal dari `base_weights`.
   - Prioritas pertama +40, prioritas kedua +20.
   - Tambahkan penyesuaian dari jawaban `level`, `swing`, `arm`, `change`, dan `breakage`.
   - Nilai minimal 0, lalu dinormalisasi sehingga jumlahnya 1.
2. **Kondisi data.** Tensi dipetakan ke 40/51/62 lbs, swing ke S/M/F, menghasilkan kode seperti `51M`. Nilai `tidaktahu` dianggap 51.
3. **Filter keras.**
   - Keluarkan Polyester kalau `arm=cedera`, `level=pemula`, atau `swing=santai`.
   - Keluarkan Gut kalau `breakage=sering` atau `level=pemula`.
   - Kalau ada filter material aktif, material "Tidak diketahui" ikut dikeluarkan.
   - `data_coverage = terbatas` selalu dikeluarkan.
4. **Persentil.**
   - Hitung persentil 0–100 per kondisi per metrik terhadap **semua** senar yang punya nilai di kondisi itu, sebelum filter.
   - Metode rata-rata peringkat: `p = ((i + j) / 2) / (n − 1) × 100`, dengan i..j adalah posisi 0-based dari nilai yang seri.
   - Metrik: `st` stiffness, `tl` tension loss %, `er` energy return %, `dw` dwell time, `sp` spin potential.
   - Persentil gauge dihitung global.
5. **Fallback kondisi.**
   - Kalau senar tidak punya nilai di kondisi customer, pakai kondisi terdekat.
   - Jarak = selisih indeks tensi + selisih indeks swing. Kalau seri, 51F didahulukan.
   - Tandai metrik tersebut `exact=false`.
6. **Atribut** (0–100, makin tinggi makin baik):
   - spin = persentil sp
   - control = persentil st
   - comfort = 0,7 × (100 − persentil st) + 0,3 × persentil dw. Kalau dw kosong, pakai 100 − persentil st.
   - power = 0,5 × persentil er + 0,5 × (100 − persentil st)
   - stability = 100 − persentil tl
   - durability = persentil gauge
7. **Data kosong.**
   - Kalau atribut prioritas customer tidak punya data, senar **tidak boleh** direkomendasikan.
   - Atribut lain yang kosong diberi nilai netral 50.
8. **Skor** = Σ (bobot × atribut).
9. **Urutan.** Skor tertinggi dulu. Kalau seri: data exact didahulukan, lalu nama A–Z.
10. **Pilihan akhir.** Ambil 1 senar terbaik per `family`, lalu 3 teratas.

Engine harus murni (pure function). Persentil dihitung sekali saat dataset dimuat, lalu di-cache.

### 6.3 Halaman hasil

- **Ringkasan profil** dalam satu kalimat, dan **kode resep** (misalnya SF-7K2Q). Kode dibuat saat hasil disimpan.
- **Tiga kartu rekomendasi**, berurutan 1–3. Kartu nomor 1 ditampilkan lebih menonjol. Setiap kartu berisi:
  - nama, material, dan gauge (mm);
  - skor "Kecocokan 80/100";
  - 5 bar atribut (Spin, Power, Kontrol, Nyaman, Tensi awet) dengan label teks;
  - maksimal 2 kekuatan dan 1 kelemahan dari `explain()`, dengan template di Lampiran B;
  - catatan data (kalau ada);
  - bagian yang bisa dibuka "Lihat data lab" (stiffness, tension loss, energy return, dwell time, spin potential, dan kondisi data yang dipakai);
  - tombol **Pilih senar ini**.
- **Tautan "Belum yakin? Cetak ketiganya"**, hanya di mode toko.
- **Layar pratinjau** setelah memilih: tampilan resep sama persis dengan yang akan dicetak (skala layar).
  - Mode toko: tombol **Cetak resep**.
  - Mode online: tombol **Kirim ke WhatsApp**. Pesannya berisi kode resep, senar pilihan, dan profil. Contoh: "Halo Tirtonic, kode resep saya SF-7K2Q. Senar pilihan: …. Profil: …. Apakah tersedia?"
- **Tombol "Ubah jawaban" dan "Mulai lagi".**
- **Keterangan sumber:** "Data lab: Tennis Warehouse University String Performance Database."
- **Kondisi kosong:**
  - Kandidat kurang dari 3: tampilkan yang ada.
  - Kandidat 0: "Belum ada senar yang cocok dengan kombinasi jawaban ini. Ubah jawaban atau tanyakan langsung ke stringer kami."

### 6.4 Admin

Semua halaman admin dilindungi autentikasi admin yang sudah ada.

- **Simulator** (`/admin/string-finder`). Dari jawaban yang dipilih, tampilkan:
  - kondisi data, bobot dalam persen, dan filter beserta alasannya;
  - statistik kandidat;
  - 20 kandidat teratas beserta 6 atribut dan penanda exact atau estimasi;
  - pratinjau resep.
- **Editor aturan.** Semua nilai `rules.json`, termasuk bagian `slip`: catatan untuk stringer dan kolom isian tangan.
  - Setiap penyimpanan membuat versi baru yang bisa dipulihkan.
  - Pratinjau sebelum simpan: 8 profil uji dengan aturan lama dibandingkan aturan baru.
- **Cabang.**
  - Kelola nama, slug, ukuran kertas (58/80 mm), dan token QR. Token bisa di-generate ulang, dan token lama langsung tidak berlaku.
  - Tombol **Cetak poster QR** (A5) untuk meja toko. Isinya QR ke URL mode toko dan teks "Cari senar yang pas untuk Anda".
- **Stasiun cetak** (`/admin/string-finder/stasiun-cetak?cabang=…`). Lihat bagian 6.8.
- **Daftar resep.** Cari berdasarkan kode, filter per cabang dan tanggal.
  - Halaman detail (`/admin/string-finder/resep/[kode]`, tujuan QR di kertas) menampilkan hasil lengkap.
  - Tombol **Cetak ulang** mengirim job ke stasiun cabang tersebut.
- **Ringkasan log:**
  - jumlah sesi per mode;
  - persentase sesi toko yang berakhir dengan cetak;
  - distribusi jawaban;
  - 20 senar yang paling sering dipilih customer.

### 6.5 Log anonim

Setiap hasil yang ditampilkan disimpan di `sf_results` (lihat 7.4), berisi:
- kode resep, waktu, mode, dan cabang;
- jawaban dan kondisi data;
- versi aturan dan versi dataset;
- 3 senar beserta skornya;
- senar yang dipilih;
- apakah WhatsApp diklik.

Jangan menyimpan IP secara permanen (hanya boleh untuk rate limit sementara), identitas, atau data pribadi lain. Data pribadi customer hanya ada di kertas, ditulis tangan.

### 6.6 User stories

**US-1. Menjawab tanpa mengetik**
Sebagai customer, saya ingin menjawab hanya dengan klik.
- 7 pertanyaan bisa diselesaikan tanpa keyboard.
- Target klik minimal 44×44 px.
- Tombol kembali mempertahankan jawaban.

**US-2. Mendapat 3 rekomendasi yang bisa dijelaskan**
- Hasil identik dengan golden output.
- Setiap kartu punya minimal 1 kekuatan yang menyebut angka lab.
- Tiga senar dari keluarga berbeda.

**US-3. Mencetak resep untuk stringer (mode toko)**
Sebagai customer di toko, saya ingin memilih senar lalu mendapat kertas untuk diberikan ke stringer.
- Dari halaman hasil sampai job cetak terkirim cukup 2 ketukan.
- Pratinjau identik dengan hasil cetak.
- Kode resep tampil di layar.
- Dalam kondisi normal, kertas keluar maksimal 10 detik setelah "Cetak resep" ditekan.

**US-4. Resep yang lengkap untuk stringer**
Sebagai stringer, saya ingin semua informasi ada di satu kertas.
- Isi resep sesuai 6.7 dan identik dengan `slip-test-cases.json`.
- Catatan stringer muncul sesuai aturan.
- Ada kolom isian untuk tensi final, mains/crosses, raket, nama, No. HP, dan jadwal ambil.
- QR membuka detail resep (setelah login admin).

**US-5. Stasiun cetak otomatis**
Sebagai admin, saya ingin printer di tiap cabang mencetak otomatis tanpa dioperasikan.
- Job baru tercetak maksimal 5 detik setelah dibuat, selama halaman stasiun terbuka.
- Status job diperbarui.
- Kegagalan terlihat di stasiun.
- Admin melihat peringatan kalau stasiun tidak aktif lebih dari 60 detik.

**US-6. Cetak ulang dan cari resep**
- Resep bisa dicari berdasarkan kode dan dicetak ulang ke stasiun cabang mana pun.

**US-7. Mencegah cetak iseng**
- Token cabang tidak valid menghasilkan 403.
- Lebih dari 3 job per 10 menit dari perangkat yang sama menghasilkan 429 dengan pesan yang jelas.
- Job berumur lebih dari 30 menit tidak dicetak otomatis.

**US-8. Terhubung lewat WhatsApp (mode online)**
- Tombol membuka WhatsApp admin dengan pesan otomatis berisi kode resep.
- Klik tercatat.

**US-9. Menyetel aturan tanpa developer**
- Perubahan aturan dan catatan resep berlaku tanpa deploy ulang.
- Ada pratinjau 8 profil uji.
- Versi lama bisa dipulihkan.

**US-10. Memperbarui dataset**
- Lewat script: jalankan `data/export-twu.js`, lalu `reference/build_data.py`, lalu impor.
- Versi dataset tercatat.

### 6.7 Resep stringing (isi kertas)

Sumber kebenaran: `buildSlip()` dan `renderSlipHTML()` di `reference/slip.js`. Contoh tampilan: `reference/slip-sample-pilih-satu.png` dan `reference/slip-sample-tiga-pilihan.png`.

Urutan isi:

1. **Kepala:** "TIRTONIC TENNIS STORE", "Resep Senar", kode resep (besar), tanggal dan jam (WIB), nama cabang.
2. **Senar.**
   - Mode **pilih satu:** "Senar pilihan customer" dengan nama senar (besar), material, gauge, skor kecocokan, dan sorotan berupa nilai atribut prioritas customer (misalnya "Spin 99, Kontrol 98").
   - Mode **tiga pilihan:** "Pilihan senar (lingkari yang dipakai)" dengan 3 senar lengkap.
3. **Tensi.**
   - "Biasa dipakai customer: 48–55 lbs".
   - Kolom tangan **Tensi final ____ lbs** (besar).
   - Kolom tangan Mains ____ Crosses ____.
4. **Profil pemain:** level, ayunan, prioritas, lengan, ganti senar, senar putus.
5. **Perhatian stringer** (hanya muncul kalau ada). Catatan dari `rules.slip.flags`, dipilih berdasarkan jawaban dan data senar. Aturan awal:

   | Kondisi | Catatan |
   |---|---|
   | arm = cedera | Customer sedang cedera lengan. Prioritaskan kenyamanan saat menentukan tensi. |
   | arm = pegal | Lengan customer kadang pegal setelah main lama. |
   | tension = tidaktahu | Customer tidak tahu tensinya. Cek tensi senar lama atau tanyakan dulu. |
   | change = lama **dan** atribut stability senar < 35 | Tensi senar ini cepat turun, padahal customer jarang ganti senar. Sarankan ganti lebih rutin. |
   | breakage = sering **dan** gauge senar < 1,25 mm | Gauge tipis dan customer sering putus senar. Tawarkan gauge lebih tebal bila ada. |
   | data senar estimasi (bukan exact) | Data lab kondisi customer belum ada; rekomendasi memakai data 51 lbs / swing cepat. |

   Catatan dihitung dari senar pilihan. Di mode tiga pilihan, catatan dihitung dari ketiganya lalu duplikatnya dibuang. Stringer bisa menambah atau mengubah catatan dari admin, misalnya catatan tensi untuk polyester menurut kebiasaan toko.
6. **Alternatif** (mode pilih satu): 2 senar lain beserta skornya.
7. **Kolom tangan** dari `rules.slip.handwritten_fields`: Raket, Nama, No. HP, Ambil (tgl/jam).
8. **QR** ke `/admin/string-finder/resep/[kode]`, lalu keterangan sumber data.

Aturan kode resep:
- Format `SF-` + 4 karakter dari alfabet tanpa karakter ambigu (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`).
- Harus unik di antara resep 90 hari terakhir. Kalau bentrok, buat ulang.

Aturan cetak:
- Hitam saja, tanpa abu-abu atau warna.
- Font minimal 8 pt. Nama senar, kode, dan tensi final dicetak tebal.
- Pemisah berupa garis putus-putus.
- Lebar area cetak 48 mm untuk kertas 58 mm, dan 72 mm untuk kertas 80 mm.
- `@page { size: 58mm auto; margin: 0 }`.
- Tampilan wajib dites di printer yang dipakai toko.

### 6.8 Cetak ke printer thermal

**Arsitektur: stasiun cetak per cabang.** Printer disambung ke satu perangkat di meja stringer, sebaiknya PC atau laptop Windows dengan printer thermal USB. Perangkat itu membuka halaman stasiun cetak yang selalu menyala. Semua permintaan cetak, baik dari HP customer maupun tablet kiosk, masuk ke antrean server lalu dicetak oleh stasiun cabangnya. Dengan pola ini, HP customer tidak perlu tersambung ke printer.

Alur:

1. Customer menekan **Cetak resep**. Klien mengirim `POST /api/string-finder/print-jobs` berisi `{ code, chosen_rank | null, cabang, token }`.
2. Server memvalidasi token cabang dan rate limit, lalu membuat job berstatus `antri`.
3. Halaman stasiun (login admin) memeriksa job `antri` untuk cabangnya setiap 3 detik. Untuk setiap job:
   - ambil HTML resep dari server (`renderSlipHTML` + QR SVG);
   - muat ke iframe tersembunyi;
   - panggil `print()`;
   - setelah event `afterprint`, tandai status `terkirim`.
4. Halaman customer memeriksa status job.
   - Kalau `terkirim`: "Resep SF-7K2Q sudah dicetak di meja stringer."
   - Kalau belum terkirim dalam 30 detik: "Resep belum tercetak. Tunjukkan kode SF-7K2Q ke stringer." Stringer bisa membuka dan mencetak manual dari admin.

**Cetak tanpa dialog.** Jalankan Chrome atau Edge di perangkat stasiun dengan flag `--kiosk-printing`, dan jadikan printer thermal sebagai printer default. Dengan begitu `print()` langsung mencetak. Tanpa flag ini, dialog print muncul dan staf cukup menekan Print. Ini bisa dipakai sebagai cadangan.

**Tampilan stasiun:**
- Indikator "Terhubung" dan waktu cek terakhir.
- Daftar job hari ini beserta statusnya.
- Tombol **Cetak ulang** per job.
- Tombol **Tes cetak**.
- Peringatan jelas kalau ada job gagal.
- Stasiun mengirim heartbeat. Admin melihat "Stasiun tidak aktif" kalau tidak ada heartbeat lebih dari 60 detik.

**Status job:** `antri` → `terkirim` | `gagal` | `kedaluwarsa` (lebih dari 30 menit tanpa dicetak).

Catatan: browser tidak bisa mendeteksi kertas habis. Status `terkirim` berarti sudah dikirim ke printer, bukan dijamin keluar. Karena itu kode resep selalu tampil di layar customer.

**Keamanan:**
- Endpoint pembuatan job butuh token cabang yang valid.
- Rate limit 3 job per 10 menit per perangkat/IP.
- Job kedaluwarsa setelah 30 menit.
- Endpoint stasiun dan detail resep hanya untuk admin.

**Opsi teknis lanjutan (bukan Fase 1):**
- ESC/POS langsung lewat WebUSB atau Web Serial, untuk kontrol penuh tanpa driver.
- Printer cloud (misalnya Star CloudPRNT atau Epson Server Direct Print), tanpa perlu perangkat stasiun.
- Tablet Android dengan printer Bluetooth umumnya butuh aplikasi print service tambahan. Kombinasi ini wajib dites sebelum dipakai.

## 7. Data

### 7.1 Sumber dan cakupan

- Sumber: TWU String Performance Database, diekspor dengan semua filter "All" (September 2026).
- Isi: 4.815 baris, 789 senar, 487 keluarga senar. Kondisi uji: 40/51/62 lbs × swing Slow/Medium/Fast.
- Cakupan data per senar (`data_coverage`):
  - `lengkap` (504 senar): minimal 6 dari 9 kondisi.
  - `referensi_51F` (283 senar): hanya 51 lbs / swing cepat, sebagian besar senar yang lebih baru. Dipakai dengan fallback. Korelasi peringkat antarkondisi mendukung fallback ini: Spearman stiffness 0,92–0,98, tension loss 0,94–1,00, spin potential 1,00.
  - `terbatas` (2 senar): tidak direkomendasikan.
- Material: Polyester 483, Nylon 231, Nylon/Polyester 18, Gut 18, Nylon/Polyurethane 17, Nylon/Zyex 11, Nylon/Polyolefin 6, Polyolefin 3, tidak diketahui 2.
- Spin potential tidak diukur untuk 71 senar.

### 7.2 File di bundel

| File | Isi |
|---|---|
| `data/twu_strings_raw.csv` | Export asli, tidak diubah |
| `data/twu_strings_clean.csv` | Data bersih, format panjang, kolom snake_case, plus `family` dan `data_coverage`. **Dipakai untuk impor ke database** |
| `data/strings.json` | Format ringkas untuk engine acuan dan tes |
| `data/cleaning-log.md` | Setiap nilai yang diubah atau dibuang, beserta alasannya |
| `data/dataset-stats.json` | Statistik dataset |
| `data/export-twu.js` | Script browser untuk export ulang dari TWU |
| `reference/build_data.py` | Pipeline pembersihan (Python, pandas) |
| `reference/slip.js`, `slip-sample-*.html/.png` | Resep stringing: kode acuan, template, dan contoh tampilan |

### 7.3 Aturan pembersihan (sudah diterapkan)

1. Stiffness yang menyimpang lebih dari 2× atau kurang dari 0,5× median senar yang sama dibuang (3 nilai).
2. Energy return di bawah 50% dibuang (1 nilai).
3. Tension loss polyester di bawah 12% dibuang (1 nilai, Toroline A5).
4. Stabilization loss negatif dibuang. Kolom ini tidak dipakai engine.
5. Gauge nominal tidak valid (0 atau 16) diambil dari nama senar (5 senar).
6. `family` = nama senar tanpa token gauge, misalnya "Babolat RPM Blast 17/1.25" → "babolat rpm blast".
7. Nama senar yang sama pada kondisi yang sama dirata-rata di `strings.json`. Di `twu_strings_clean.csv` baris dobel tetap ada, jadi importer wajib merata-ratakannya sebelum memenuhi batasan unik database.

### 7.4 Skema database (usulan)

**Fase 1:**

- `twu_strings`: `id`, `name` (unik), `family`, `material`, `gauge_mm`, `data_coverage`, `dataset_version`.
- `twu_measurements`: `string_id`, `tension_lbs`, `swing`, semua kolom metrik (nullable). Unik per (`string_id`, `tension_lbs`, `swing`).
- `sf_rules`: `id`, `version`, `config` (JSON sesuai `rules.json`), `is_active`, `created_at`, `note`.
- `sf_branches`: `id`, `name`, `slug`, `print_token`, `paper_mm` (58/80), `is_active`, `station_last_seen_at`.
- `sf_results`: `code` (unik), `created_at`, `mode` (toko/online), `branch_id` (nullable), `answers` (JSON), `condition`, `rules_version`, `dataset_version`, `picks` (JSON), `chosen_rank` (nullable; 0 = cetak ketiganya), `whatsapp_clicked`.
- `sf_print_jobs`: `id`, `result_code`, `branch_id`, `chosen_rank`, `status` (antri/terkirim/gagal/kedaluwarsa), `created_at`, `sent_at`, `attempts`, `error`, `requested_by` (customer/admin).

**Fase 2 (tambahan):**

- `string_product_map`: `twu_string_id` ↔ `product_id`.
- Di produk: `price_per_set` (per set, bukan reel) dan `sold_90d`. Stok per cabang memakai data stok website.

## 8. Teknis

- **Lokasi:** proyek Next.js website Tirtonic, memakai database proyek tersebut.
- **Struktur yang disarankan** (contoh untuk App Router; sesuaikan kalau proyek memakai Pages Router):
  - `lib/string-finder/engine.ts`: port `reference/engine.js`, pure function.
  - `lib/string-finder/slip.ts`: port `reference/slip.js` (`buildSlip`, `renderSlipHTML`).
  - `lib/string-finder/load.ts`: memuat dataset dan aturan aktif, menghitung persentil, lalu menyimpannya di cache memori. Cache di-invalidate saat data atau aturan berubah.
  - `POST /api/string-finder/recommend`: jawaban + (opsional) cabang dan token → menyimpan `sf_results`, lalu mengembalikan `{ code, mode, picks, profile_summary }`. Input divalidasi terhadap `questions.json`; input tidak valid menghasilkan 400.
  - `POST /api/string-finder/print-jobs` dan `GET /api/string-finder/print-jobs/[id]` (status job untuk customer).
  - `GET /api/string-finder/slip/[code]?rank=`: HTML pratinjau resep untuk customer, **tanpa QR admin**.
  - Admin:
    - `GET /api/admin/string-finder/print-jobs?cabang=&status=antri`
    - `PATCH /api/admin/string-finder/print-jobs/[id]`
    - `POST /api/admin/string-finder/stations/heartbeat`
    - `GET /api/admin/string-finder/slip/[code].html`
  - Halaman: `/rekomendasi-senar`, `/admin/string-finder` (simulator), `…/stasiun-cetak`, `…/resep/[kode]`, `…/cabang`, `…/aturan`.
  - `scripts/import-twu.ts`: impor `twu_strings_clean.csv`.
- **QR:** di-generate di server sebagai SVG, misalnya dengan paket `qrcode`.
- **Waktu:** semua waktu di resep memakai WIB (Asia/Jakarta).
- **Keamanan data:** respons publik hanya berisi 3 pilihan. Endpoint debug dan stasiun hanya untuk admin.
- **Performa:** API p95 di bawah 300 ms. Job tercetak di bawah 5 detik setelah dibuat.
- **Tes:**
  - Unit test engine dengan `test-cases.json` (toleransi skor ±0,1; nama dan urutan identik).
  - Unit test resep dengan `slip-test-cases.json` (identik).
  - Tes API: validasi input, token, dan rate limit.
  - Uji cetak nyata di printer tiap cabang.
  - Kalau aturan seed diubah secara sengaja, golden diperbarui dengan `node reference/make-tests.js` dan `node reference/make-slip-sample.js`.
- **Tanpa dependensi AI/LLM** dan tanpa biaya API per sesi.

## 9. Desain dan UX

- **Sederhana dan menyatu dengan tirtonic.com.** Pakai layout, header, footer, tombol WhatsApp mengambang, font, warna, radius, dan komponen (tombol, kartu produk, badge) yang **sudah ada di repo**. Jangan menambah font, warna, library UI, atau ilustrasi baru.
- Latar putih, ruang kosong cukup, tanpa gradien dan dekorasi. Animasi hanya transisi singkat antarlayar, dan `prefers-reduced-motion` dihormati.
- Mobile first. Uji di lebar 375 px dan di desktop.
- **Layar awal:** judul "Cari senar yang pas untuk Anda", satu kalimat penjelasan, dan tombol **Mulai**.
- **Pertanyaan:**
  - satu pertanyaan per layar;
  - pilihan berupa tombol besar selebar layar (tinggi minimal 44 px) dengan label dan hint kecil;
  - progress bar tipis dengan teks "3 dari 7";
  - tombol **Kembali**.
- **Hasil:**
  - 3 kartu bertumpuk di mobile dan berjajar di desktop;
  - kartu nomor 1 diberi penanda "Paling cocok";
  - bar atribut berupa bar horizontal sederhana dengan label teks.
- **Pratinjau resep** memakai HTML yang sama dengan hasil cetak.
- **Titik masuk:** menu Quick Access dan halaman kategori string.
- **Halaman admin** (stasiun cetak, cabang, aturan, simulator) memakai tampilan admin yang sudah ada.
- **Aksesibilitas:** kontras minimal 4,5:1, fokus keyboard terlihat, `button` dengan `aria-pressed` untuk pilihan, dan bar atribut berlabel teks.
- **Bahasa:** Indonesia, kalimat sederhana. Istilah teknis hanya di "Lihat data lab" dan di resep.

## 10. Tahapan

| Tahap | Isi | Selesai jika |
|---|---|---|
| 1a | Impor data, port engine dan resep ke TS, unit test golden | Semua golden lulus |
| 1b | API rekomendasi, UI kuesioner + hasil, mode online + WhatsApp | US-1, US-2, US-8 |
| 1c | Resep dan cetak: cabang + token + poster QR, pratinjau, antrean, stasiun cetak, detail/cetak ulang | US-3 sampai US-7, dites dengan printer asli |
| 1d | Admin: simulator, editor aturan berversi, ringkasan log | US-9 |
| 1e | Validasi dengan stringer (20 kasus nyata) dan uji operasional di dua cabang selama 1 minggu | Minimal 80% kasus: minimal 2 dari 3 rekomendasi dinilai layak; kegagalan cetak di bawah 3% |
| 2 | Katalog, harga, stok, penjualan; mode Terlaris/Premium/Hemat; harga dan stok di resep | Lihat bagian 12 |

## 11. Metrik keberhasilan (target awal, dievaluasi setelah 1 bulan)

- Tingkat penyelesaian (mulai → melihat hasil) minimal 70%.
- Median waktu sampai hasil di bawah 90 detik.
- Mode toko: minimal 60% sesi berakhir dengan resep tercetak.
- Kegagalan cetak (tidak terkirim dalam 30 detik) di bawah 3%.
- Mode online: klik WhatsApp minimal 15% sesi.
- Kesesuaian dengan stringer sesuai kriteria tahap 1e.
- API p95 di bawah 300 ms.

## 12. Fase 2: Terlaris, Premium, Paling hemat

Implementasi acuan: `recommendPhase2()` dan `selectPhase2()`. Kasus uji: `fase2-contoh-A-F`.

1. Jalankan engine sampai langkah urutan.
2. Saring senar yang terpetakan ke produk Tirtonic **dan** ready stock di cabang customer. Mode online memakai stok di cabang mana pun. Lalu ambil 1 per keluarga.
3. **Kelompok cocok** = skor ≥ 85% × skor tertinggi.
   - Kalau isinya kurang dari 3, longgarkan 5 poin demi 5 poin sampai batas 75%.
   - Kalau tetap kurang, tampilkan yang ada.
4. Pilih berurutan, dan senar yang sudah terpilih tidak ikut lagi:
   - **Terlaris:** `sold_90d` tertinggi.
   - **Premium:** `price_per_set` tertinggi.
   - **Paling hemat:** `price_per_set` terendah.
   - Kalau seri, skor kecocokan yang lebih tinggi menang.
5. Kalau senar dengan skor tertinggi tidak terpilih, tampilkan catatan "Paling sesuai dengan profil Anda: …".
6. Setiap kartu tetap menampilkan skor kecocokan, harga, dan stok per cabang.
7. Resep menampilkan label dan harga senar pilihan.
8. Pertanyaan budget **tidak** ditambahkan.

## 13. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Hak penggunaan data TWU | Perhitungan internal, sumber dicantumkan, database lengkap tidak diekspos. Cek syarat penggunaan TWU sebelum go-live |
| Printer/driver tidak cocok dengan cetak dari browser (terutama tablet Android + printer Bluetooth) | Utamakan printer thermal USB + PC/laptop Windows. Uji printer sebelum membeli dalam jumlah banyak. Dialog print manual sebagai cadangan |
| Halaman stasiun tertutup atau perangkat tidur | Heartbeat dan peringatan di admin; kode resep selalu tampil di layar customer; cetak manual dari admin |
| Kertas habis atau printer mati (tidak terdeteksi browser) | Pesan cadangan di layar customer setelah 30 detik; tombol Cetak ulang di stasiun |
| Cetak iseng dari luar toko | Token cabang di QR (bisa diganti), rate limit, job kedaluwarsa |
| Hasil berbeda dari kebiasaan stringer (contoh: prioritas spin + jarang ganti senar → multifilament nylon mengalahkan polyester karena tensinya lebih awet) | Tahap 1e; bobot bisa disetel; simulator menunjukkan alasannya |
| Control diwakili stiffness saja | Penyederhanaan yang dicatat; bisa ditambah metrik lain setelah validasi |
| Fase 1 merekomendasikan senar yang tidak dijual Tirtonic | Disengaja untuk uji coba; stringer menawarkan pengganti; log jadi bahan keputusan stok; diselesaikan di Fase 2 |
| 283 senar hanya punya data 51F | Fallback berbasis korelasi tinggi; ditandai di kartu dan di resep |

## 14. Asumsi dan dependensi

- Website Tirtonic (Next.js + database) sudah berjalan, dengan autentikasi admin dan konfigurasi nomor WhatsApp admin.
- Setiap cabang punya satu perangkat stasiun (PC/laptop) yang terhubung internet dan printer thermal dengan driver terpasang.
- Data cabang mengikuti website. Saat ini tirtonic.com menyebut Yogyakarta, Solo, dan Semarang; cabang yang belum aktif cukup dinonaktifkan di tabel cabang.
- Stringer bersedia membantu validasi dan mengisi kolom tangan di resep.

## 15. Pertanyaan terbuka

1. Printer thermal yang dipakai: ukuran kertas (58 atau 80 mm) dan koneksi (USB/Bluetooth/LAN)? Perangkat apa yang jadi stasiun di tiap cabang?
2. Customer mengisi lewat HP sendiri (QR di meja), tablet toko, atau keduanya? Keduanya sudah didukung; yang perlu diputuskan adalah mana yang disiapkan duluan.
3. Apakah kolom tangan di resep sudah pas (Raket, Nama, No. HP, Ambil), atau ada yang perlu ditambah, misalnya pola senar atau pre-stretch?
4. Catatan stringer apa lagi yang ingin ditambahkan sebagai aturan awal?
5. Sumber angka penjualan untuk Fase 2: POS, spreadsheet, atau input manual?
6. Harga di Fase 2: per set saja, atau termasuk jasa pasang?
7. Perlu aturan maksimal 1 senar per merek di 3 rekomendasi?
8. Route final halaman dan penempatan menu di website.

---

## Lampiran A. Aturan awal (seed, dari `rules.json`)

Bobot dasar: spin 10, power 10, control 10, comfort 10, stability 10, durability 5. Bonus prioritas: pertama +40, kedua +20.

| Jawaban | Penyesuaian bobot |
|---|---|
| level = pemula | comfort +10, power +10 |
| level = kompetitif | control +5, stability +5 |
| swing = santai | power +10 |
| swing = cepat | control +10 |
| arm = pegal | comfort +15 |
| arm = cedera | comfort +35 |
| change = cepat (<1 bln) | stability −5 |
| change = sedang (1–3 bln) | stability +10 |
| change = lama (>3 bln) | stability +25 |
| breakage = sering | durability +25 |
| breakage = kadang | durability +10 |

Filter keras: tanpa Polyester jika cedera, pemula, atau ayunan santai. Tanpa Gut jika senar sering putus atau pemula. Catatan resep ada di bagian 6.7.

## Lampiran B. Template teks penjelasan (halaman hasil)

Angka persen dibulatkan dan dibatasi 1–99. Desimal memakai koma.

Kekuatan:
- spin: "Potensi spin lebih tinggi dari {p}% senar yang diuji (nilai {sp})."
- comfort: "Lebih lembut dari {100−p_st}% senar yang diuji (stiffness {st} lb/in)."
- control: "Lebih kaku dari {p_st}% senar, jadi arah bola lebih mudah dijaga (stiffness {st} lb/in)."
- power: "Mengembalikan energi lebih baik dari {p_er}% senar (energy return {er}%)."
  Varian kalau kelenturan lebih dominan dan comfort tidak ikut tampil: "Lentur (lebih lembut dari {100−p_st}% senar), membantu bola melaju lebih jauh."
- stability: "Tensinya lebih awet dari {100−p_tl}% senar (tension loss {tl}%)."
- durability: "Lebih tebal dari {p_g}% senar ({g} mm), jadi lebih tahan putus."

Kelemahan:
- spin: "Potensi spin di bawah rata-rata (lebih rendah dari {100−p}% senar)."
- comfort: "Cukup kaku (lebih kaku dari {p_st}% senar). Perhatikan kalau lengan mudah pegal."
- control: "Senarnya lembut, jadi bola cenderung melaju lebih jauh dan butuh kontrol dari ayunan."
- power: "Power di bawah rata-rata; kedalaman bola lebih banyak bergantung pada ayunan Anda."
- stability: "Tensi turun cukup cepat (tension loss {tl}%), sebaiknya diganti lebih rutin."
- durability: "Gauge tipis ({g} mm), lebih cepat putus kalau sering topspin."
- Tanpa kelemahan: "Tidak ada kelemahan menonjol untuk kebutuhan Anda."

Catatan:
- "Data lab untuk tensi dan ayunan Anda belum tersedia; dihitung dari pengujian {tensi} lbs, swing {lambat/sedang/cepat}."
- "Potensi spin senar ini tidak diukur di data lab."

Aturan pemilihan teks:
- **Kekuatan:** atribut berbobot ≥ 10% diurutkan menurut bobot × nilai. Ambil yang nilainya ≥ 60, maksimal 2. Kalau tidak ada, ambil 1 atribut bernilai tertinggi.
- **Kelemahan:** atribut bernilai < 35 yang bukan kekuatan. Durability hanya dihitung kalau bobotnya ≥ 10%. Urutkan menurut max(bobot, 5%) × (50 − nilai), lalu ambil 1.

## Lampiran C. Contoh hasil (dari golden output)

Profil: kompetitif, ayunan cepat, prioritas spin lalu kontrol, tidak ada keluhan, ganti senar 1–3 bulan, kadang putus, tensi sedang. Kondisi data: 51F.

| # | Senar | Skor |
|---|---|---|
| 1 | Tecnifibre Black Code 4S 16 (1.30) | 79,9 |
| 2 | Gamma Ocho 16 (1.30) | 78,1 |
| 3 | Signum Pro Plasma HEXtreme 16 (1.30) | 76,9 |

Resep untuk profil ini (customer memilih nomor 1): `reference/slip-sample-pilih-satu.png`. Contoh mode tiga pilihan untuk customer dengan cedera lengan: `reference/slip-sample-tiga-pilihan.png`.
