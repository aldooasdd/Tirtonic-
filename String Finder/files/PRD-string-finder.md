# PRD: Tirtonic String Finder (aplikasi terpisah)

| | |
|---|---|
| Produk | Tirtonic String Finder: aplikasi web terpisah dari website tirtonic.com |
| Fungsi | Rekomendasi 3 senar berdasarkan gaya bermain, dicetak sebagai resep untuk stringer |
| Pemilik | Aldo |
| Status | Siap diimplementasikan (Fase 1). Fase 2 menunggu data harga, stok, dan penjualan |
| Versi dokumen | 2.0, 22 September 2026 |
| Pelaksana | Claude Code, di **repo baru** |

**Perubahan v2.0 (menggantikan semua versi sebelumnya):**
- String Finder menjadi **aplikasi sendiri** dengan repo, database, dan deploy terpisah. Tidak memakai kode, database, login, maupun komponen website Tirtonic.
- Seluruh aplikasi dikunci dengan **login password** (tanpa username).
- Tampilan **hijau Rolex dan putih**. Acuan visual yang wajib diikuti: `design/prototype.html` dan screenshot di folder `design/`.
- Mode online dan WhatsApp dihapus dari Fase 1. Output satu-satunya adalah resep yang dicetak di toko.
- Keputusan teknis yang sudah disetujui: tes memakai `node --test` + `tsx`, dan tabel cabang `SfBranch` dibuat sendiri.

---

## 0. Untuk Claude Code: cara memakai dokumen ini

Baca dalam urutan ini sebelum menulis kode:

1. Dokumen ini.
2. `design/prototype.html`: prototipe yang bisa diklik (password demo: `tirtonic`) dan screenshot `design/screen-*.png`. Ini **acuan visual dan alur**: warna, tipografi, jarak, komponen, dan teks layar.
3. `reference/engine.js` dan `reference/slip.js`: implementasi acuan engine rekomendasi dan resep. Keduanya sumber kebenaran algoritma.
4. `reference/rules.json` dan `reference/questions.json`: konfigurasi awal (seed).
5. `reference/test-cases.json` dan `reference/slip-test-cases.json`: golden output yang **wajib** lolos.
6. `data/`: dataset TWU yang sudah dibersihkan.

Aturan kerja yang tidak boleh dilanggar:
- **Tidak ada LLM/AI** di aplikasi. Semua rekomendasi deterministik.
- **Perhitungan di server.** Dataset lengkap tidak boleh dikirim ke browser. Catatan: prototipe menghitung di browser hanya untuk demo, dan ini **tidak boleh ditiru**.
- **Port, jangan desain ulang.** Logika engine dan resep harus identik dengan kode acuan. Tampilan harus mengikuti prototipe.
- **Jangan mengarang data** untuk senar yang tidak punya data (bagian 7).

## 1. Ringkasan

Customer toko tenis sering bingung memilih senar. Penjaga toko menjawab berdasarkan pengalaman, sehingga sarannya tidak konsisten. Informasi dari customer ke stringer juga disampaikan lisan, sehingga mudah terlewat.

String Finder adalah aplikasi web yang dipakai di toko Tirtonic:
- Aplikasi berjalan di tablet atau laptop toko yang sudah login dengan password toko.
- Customer menjawab 7 pertanyaan dengan klik, tanpa mengetik.
- Customer mendapat 3 rekomendasi senar dengan skor kecocokan dan alasan berbasis data lab TWU String Performance Database (789 senar, 3 tensi × 3 kecepatan ayunan).
- Customer memilih satu senar (atau ketiganya kalau belum yakin), lalu **resep stringing tercetak di printer thermal** meja stringer.
- Customer menyerahkan kertas resep ke stringer.

Fase pengerjaan:
- **Fase 1 (siap dikerjakan):** rekomendasi dari seluruh data TWU, resep, cetak thermal, dan admin.
- **Fase 2:** rekomendasi hanya dari senar yang dijual dan tersedia di cabang. Tiga pilihan diberi label Terlaris, Premium, dan Paling hemat, dan ketiganya tetap harus lolos ambang kecocokan.

## 2. Masalah

- Customer tidak paham istilah teknis senar.
- Saran penjaga toko tidak konsisten dan tidak berbasis data.
- Informasi penting seperti cedera lengan atau senar sering putus sering tidak sampai ke stringer.
- Belum ada catatan kebutuhan customer untuk keputusan stok.

## 3. Tujuan dan non-tujuan

**Tujuan Fase 1**
- 3 rekomendasi relevan dalam waktu kurang dari 90 detik, tanpa mengetik.
- Resep tercetak dalam 2 ketukan setelah hasil muncul.
- Stringer menerima semua informasi di satu kertas.
- Rekomendasi bisa dijelaskan dan ditelusuri ke angka lab.
- Admin bisa menyetel aturan tanpa mengubah kode.
- Tampilan profesional dan konsisten: hijau Rolex dan putih.

**Non-tujuan**
- Chatbot atau input teks.
- Akses publik dari HP customer. Fase 1 khusus perangkat toko yang sudah login.
- WhatsApp dan mode online.
- Rekomendasi hybrid. Kolom mains/crosses di resep diisi tangan oleh stringer.
- Tensi final otomatis. Tensi final ditulis stringer.
- Status pengerjaan stringing (dikerjakan/selesai/diambil).
- Integrasi dengan website tirtonic.com.
- Harga, stok, dan penjualan. Ini masuk Fase 2.

## 4. Pengguna

| Persona | Kebutuhan | Perangkat |
|---|---|---|
| Customer di toko | Tahu senar yang cocok, lalu langsung diproses | Tablet/laptop toko (sudah login) |
| Staf toko | Menyalakan aplikasi dan login sekali per perangkat | Tablet/laptop toko |
| Stringer | Informasi lengkap di satu kertas | Printer thermal di meja stringing |
| Admin (Aldo) | Mengatur aturan, cabang, stasiun cetak, dan melihat log | Laptop/PC |

## 5. Alur

### Perangkat toko (sekali di awal)
1. Staf membuka aplikasi. Layar login meminta **password saja**.
2. Setelah password benar, staf memilih cabang perangkat (Yogyakarta, Solo, atau Semarang, sesuai data `SfBranch` yang aktif).
3. Sesi berlaku 30 hari di perangkat itu. Cabang tersimpan di perangkat dan bisa diganti dari tombol cabang di header.

### Customer
1. Layar **Beranda**: judul, penjelasan singkat, tombol **Mulai**, dan panel "cara kerja" (3 langkah).
2. **7 pertanyaan**, satu per layar, dengan progress dan tombol Kembali.
3. **Hasil**: ringkasan profil, kode resep, dan 3 kartu. Tersedia tombol **Pilih senar ini** di setiap kartu, **Belum yakin? Cetak ketiganya**, **Ubah jawaban**, dan **Mulai lagi**.
4. **Pratinjau resep**, lalu tombol **Cetak resep**.
5. **Selesai**: "Resep sedang dicetak" beserta kode resep. Layar kembali ke Beranda setelah 60 detik atau saat **Selesai** ditekan.
6. Kalau tidak ada aktivitas selama 120 detik di layar pertanyaan, hasil, atau pratinjau, aplikasi kembali ke Beranda. Sesi login tetap aktif.

### Stringer
Menerima kertas, lalu mengisi tensi final, mains/crosses, raket, nama, No. HP, dan jadwal ambil. Bila perlu, stringer bisa scan QR di kertas untuk membuka detail resep (butuh login admin).

### Admin
Login dengan **password admin** (berbeda dari password toko). Admin mengelola simulator, aturan, cabang, stasiun cetak, daftar resep, dan log.

## 6. Kebutuhan fungsional

### 6.1 Login dan sesi

- **Login toko** (`/login`): satu field password dengan tombol tampilkan/sembunyikan dan tombol **Masuk**. Tampilan mengikuti prototipe (panel hijau dengan pola senar di kiri pada desktop, atau di atas pada mobile).
- **Pemeriksaan password.** Dilakukan di server terhadap env `APP_PASSWORD`. Bandingkan hash secara constant-time. Password tidak pernah dikirim balik atau disimpan di klien.
- **Sesi toko.** Cookie `httpOnly`, `secure`, `sameSite=lax`, ditandatangani dengan `SESSION_SECRET` (JWT HS256, misalnya dengan `jose`). Berlaku 30 hari.
- **Middleware.** Melindungi semua halaman dan API kecuali `/login`, `/admin/login`, `/stasiun/login`, dan aset statis.
- **Login admin** (`/admin/login`): password env `ADMIN_PASSWORD`, sesi 12 jam, scope `admin`.
- **Login stasiun** (`/stasiun/login`): password admin, sesi 30 hari, scope `station`. Scope ini hanya bisa mengakses API stasiun, supaya perangkat stasiun tidak logout setiap malam.
- **Rate limit login:** 5 percobaan gagal per 15 menit per IP. Setelah itu tolak dengan pesan yang jelas.
- **Keluar:** menghapus sesi. Mengganti `SESSION_SECRET` membuat semua sesi di semua perangkat keluar.
- **Pesan error:** "Password salah. Coba lagi." dan "Masukkan password."

### 6.2 Pilih cabang perangkat

- Muncul setelah login pertama di sebuah perangkat, atau saat tombol cabang di header ditekan.
- Pilihan cabang diambil dari `SfBranch` yang aktif, lalu disimpan di cookie perangkat (`sf_branch`, berisi slug).
- Server selalu memvalidasi bahwa slug ada dan aktif.

### 6.3 Kuesioner

Isi dan urutan pertanyaan **persis** mengikuti `reference/questions.json`: level, swing, priorities (maks. 2, urutan klik = prioritas), arm, change, breakage, tension.

Perilaku:
- Single-select langsung lanjut dengan jeda sekitar 250 ms.
- Multi-select:
  - pilihan ditandai angka 1 dan 2 sesuai urutan klik;
  - klik ulang membatalkan;
  - pilihan ketiga dinonaktifkan;
  - tombol **Lanjut** aktif kalau minimal ada 1 pilihan;
  - kalau kontrol dan nyaman dipilih bersamaan, tampilkan `conflict_note`.
- Teks progress: "Pertanyaan 3 dari 7". Tombol Kembali di pertanyaan pertama kembali ke Beranda.

### 6.4 Engine rekomendasi

Spesifikasi lengkap ada di `reference/engine.js`. Ringkasannya:

1. Bobot dari `base_weights`, ditambah bonus prioritas (+40 dan +20) dan penyesuaian per jawaban, lalu dinormalisasi.
2. Kondisi data dari tensi (40/51/62) dan swing (S/M/F). Nilai `tidaktahu` dianggap 51.
3. Filter keras:
   - tanpa Polyester kalau cedera, pemula, atau ayunan santai;
   - tanpa Gut kalau senar sering putus atau pemula;
   - material tidak diketahui ikut dikeluarkan kalau ada filter aktif;
   - `data_coverage = terbatas` selalu dikeluarkan.
4. Persentil per kondisi per metrik terhadap semua senar, dengan metode rata-rata peringkat.
5. Fallback ke kondisi terdekat (51F didahulukan kalau jaraknya seri), dan ditandai `exact=false`.
6. Atribut spin, control, comfort, power, stability, dan durability sesuai rumus di kode acuan.
7. Atribut prioritas tanpa data membuat senar tidak direkomendasikan. Atribut lain yang kosong diberi nilai 50.
8. Skor = Σ (bobot × atribut).
9. Urutan: skor tertinggi dulu. Kalau seri, data exact didahulukan, lalu nama A–Z.
10. Ambil 1 senar per `family`, lalu 3 teratas.

Engine berupa pure function. Persentil dihitung sekali saat dataset dimuat, lalu di-cache.

### 6.5 Halaman hasil

Mengikuti `design/screen-d-5-results.png` dan `screen-m-5-results.png`.

**Kepala halaman:** judul "3 senar yang cocok untuk Anda", kalimat ringkasan profil, dan chip "Kode resep SF-XXXX".

**Kartu.** Tiga kartu berjajar di desktop (≥1000 px) dan bertumpuk di mobile.
- Kartu 1 punya garis tepi hijau 2 px, bayangan halus, dan pita hijau "Paling cocok".
- Kartu 2 dan 3 memakai pita abu muda "Alternatif 2" dan "Alternatif 3".

**Isi setiap kartu:**
- nama senar;
- material dan gauge (format "1,30 mm");
- "Kecocokan 80/100";
- 5 baris atribut (Spin, Power, Kontrol, Nyaman, Tensi awet), masing-masing berupa garis tipis dengan isian hijau dan simpul lingkaran di nilainya, plus angka di kanan;
- kekuatan (ikon centang), kelemahan (ikon peringatan), dan catatan (ikon info) dari `explain()`, dengan template di Lampiran B;
- bagian "Lihat data lab" yang bisa dibuka (stiffness, tension loss, energy return, dwell time, spin potential, kondisi data);
- tombol **Pilih senar ini**: terisi hijau di kartu 1, outline di kartu 2 dan 3.

**Baris aksi:** **Belum yakin? Cetak ketiganya**, **Ubah jawaban** (kembali ke pertanyaan 1 dengan jawaban tersimpan), dan **Mulai lagi**.

**Catatan sumber:** "Data lab: Tennis Warehouse University String Performance Database. Skor dihitung dengan aturan toko, tanpa AI."

**Kondisi kosong:**
- Kandidat kurang dari 3: tampilkan yang ada.
- Kandidat 0: "Belum ada senar yang cocok dengan kombinasi jawaban ini. Ubah jawaban atau tanyakan langsung ke stringer kami."

### 6.6 Pratinjau, cetak, dan selesai

- **Pratinjau** (lihat `screen-d-6-preview.png`):
  - Di kiri, "kertas" resep dalam iframe, memakai HTML yang sama dengan hasil cetak tetapi tanpa QR admin.
  - Di kanan: judul "Periksa resep sebelum dicetak", keterangan cabang, ringkasan senar pilihan dan kode, serta tombol **Cetak resep**.
- **Cetak resep** membuat job cetak (6.8). Setelah itu tampil layar **Selesai** (`screen-d-7-done.png`) berisi:
  - ikon centang dan "Resep sedang dicetak";
  - kotak kode resep berukuran besar;
  - teks "Kalau kertas belum keluar, sebutkan kode ini ke stringer.";
  - tombol **Selesai**;
  - hitung mundur 60 detik.
- **Kalau job belum `terkirim` dalam 30 detik,** judul berubah menjadi "Resep belum tercetak" dengan teks "Tunjukkan kode ini ke stringer."
- Tombol "Cetak di perangkat ini" di prototipe **tidak** dibawa ke produksi.

### 6.7 Resep stringing (isi kertas)

Sumber kebenaran: `buildSlip()` dan `renderSlipHTML()` di `reference/slip.js`. Contoh: `reference/slip-sample-*.png`.

Isi resep, berurutan:
1. Kepala: nama toko, "Resep Senar", kode (besar), tanggal dan jam WIB, cabang.
2. Senar pilihan (atau 3 pilihan dengan instruksi "lingkari yang dipakai").
3. Tensi yang biasa dipakai, kolom tangan **Tensi final ____ lbs**, dan kolom Mains/Crosses.
4. Profil pemain.
5. Perhatian stringer (dari `rules.slip.flags`).
6. Alternatif.
7. Kolom tangan: Raket, Nama, No. HP, Ambil (tgl/jam).
8. QR ke `/admin/resep/[kode]`, lalu keterangan sumber data.

Kode resep:
- Format `SF-` + 4 karakter dari `23456789ABCDEFGHJKMNPQRSTUVWXYZ`.
- Unik di antara resep 90 hari terakhir. Kalau bentrok, buat ulang.

Aturan cetak:
- Hitam saja, font minimal 8 pt.
- Lebar area cetak 48 mm untuk kertas 58 mm, dan 72 mm untuk kertas 80 mm.
- `@page { size: <paper>mm auto; margin: 0 }`.
- Ukuran kertas diatur per cabang, default 58 mm.

### 6.8 Cetak ke printer thermal

**Arsitektur: stasiun cetak per cabang.** Satu PC/laptop di meja stringer tersambung ke printer thermal (disarankan USB dengan driver Windows) dan membuka `/stasiun`, yang login dengan scope `station`.

Alur:
1. Perangkat toko mengirim `POST /api/print-jobs { code, chosen_rank | null }`. Cabang diambil dari cookie perangkat, dan sesi toko wajib ada.
2. Server membuat job berstatus `antri`. Batasnya 10 job per 10 menit per sesi.
3. Halaman stasiun memeriksa job `antri` untuk cabangnya setiap 3 detik. Untuk setiap job:
   - ambil HTML resep lengkap dengan QR;
   - muat ke iframe tersembunyi;
   - panggil `print()`;
   - setelah event `afterprint`, tandai status `terkirim`.
4. Perangkat toko memeriksa status job untuk menampilkan layar Selesai atau pesan cadangan.

Cetak tanpa dialog: jalankan Chrome atau Edge dengan flag `--kiosk-printing`, dan jadikan printer thermal sebagai printer default.

**Tampilan stasiun:**
- status "Terhubung" dan waktu cek terakhir;
- daftar job hari ini beserta statusnya;
- tombol **Cetak ulang** dan **Tes cetak**;
- peringatan kalau ada job gagal;
- heartbeat ke server. Admin melihat "Stasiun tidak aktif" kalau tidak ada heartbeat lebih dari 60 detik.

**Status job:** `antri` → `terkirim` | `gagal` | `kedaluwarsa` (lebih dari 30 menit). Browser tidak bisa mendeteksi kertas habis, jadi kode resep selalu tampil di layar customer.

### 6.9 Admin

Semua halaman di bawah `/admin` memakai sesi admin.
- **Simulator:** pilih jawaban, lalu lihat kondisi data, bobot dalam persen, filter beserta alasannya, statistik kandidat, 20 kandidat teratas beserta atributnya, dan pratinjau resep.
- **Aturan:** editor semua nilai `rules.json`, termasuk `slip`.
  - Setiap penyimpanan membuat versi baru yang bisa dipulihkan.
  - Pratinjau 8 profil uji (aturan lama dibandingkan aturan baru) sebelum menyimpan.
  - Cache engine di-invalidate saat aturan disimpan.
- **Cabang:** nama, slug, aktif/nonaktif, ukuran kertas, dan status stasiun. Seed awal: Yogyakarta, Solo, Semarang.
- **Resep:** cari berdasarkan kode, filter per cabang dan tanggal. Halaman detail `/admin/resep/[kode]` punya tombol **Cetak ulang** ke stasiun cabang mana pun.
- **Log:** jumlah sesi, persentase sesi yang berakhir dengan cetak, distribusi jawaban, dan 20 senar yang paling sering dipilih.

Tampilan admin memakai design system yang sama (6.10), dengan layout tabel dan form yang rapi.

### 6.10 Design system (wajib)

Acuan visual adalah `design/prototype.html`. Ringkasan token:

| Token | Nilai | Pemakaian |
|---|---|---|
| green | `#006039` | Warna utama: header, tombol utama, isian atribut, pita kartu 1 |
| green-deep | `#004A2C` | Hover tombol, panel login dan panel "cara kerja" |
| tint | `#EEF5F1` | Latar pilihan terpilih, chip kode, hover ghost |
| tint-2 / tint-3 | `#D5E7DC` / `#B2D3C0` | Garis outline hijau, cincin fokus |
| bg / surface | `#FFFFFF` | Latar halaman dan kartu |
| surface-2 | `#F5F8F6` | Pita kartu 2 dan 3, baris aksi, latar pratinjau |
| ink | `#15201A` | Teks utama |
| muted | `#56655D` | Teks sekunder (kontras ≥ 4,5:1 di atas putih) |
| line | `#E1E8E4` | Garis tepi dan pemisah |
| warn | `#8A5A00` | Ikon kelemahan |
| error | `#B3261E` | Pesan error |

- **Tema:** terang saja. Hijau Rolex dan putih adalah identitas utama. Tidak perlu mode gelap.
- **Font:** Plus Jakarta Sans (lewat `next/font/google`) dengan berat 400/500/600/700/800. Angka memakai `tabular-nums`.
- **Skala teks:**
  - judul layar: `clamp(26px, 3.6vw, 34px)`, weight 800;
  - judul Beranda: `clamp(34px, 5.2vw, 58px)`, weight 800;
  - body 16 px, teks kecil 14 px.
- **Radius:** kartu 18 px, input/opsi 12 px, elemen kecil 8 px, tombol pill.
- **Tombol:**
  - primer: hijau terisi, teks putih;
  - outline: garis tint-3, teks hijau;
  - ghost: teks hijau;
  - tinggi 52 px, atau 60 px untuk tombol besar.
- **Opsi jawaban:** tombol selebar kolom, tinggi minimal 72 px, dengan label (17 px, 700) dan hint (14 px, muted). Saat terpilih, garis tepi berwarna hijau, latar tint, dan penanda lingkaran hijau berisi centang atau angka urutan.
- **Header:** pita hijau setinggi 64 px, sticky. Kiri: wordmark "TIRTONIC" (weight 800, letter-spacing 0,3em), garis pemisah, lalu "String Finder". Kanan: tombol cabang (ikon pin) dan tombol Keluar.
- **Pola senar:** grid garis putih 1 px dengan opasitas 7,5% setiap 26 px di atas green-deep. Hanya dipakai di panel login dan panel "cara kerja" di Beranda.
- **Ikon:** SVG garis (stroke 2), misalnya dari `lucide-react`. Jangan pakai emoji.
- **Gerak:** hanya transisi masuk layar 180 ms, dengan `prefers-reduced-motion` dihormati.
- **Aksesibilitas:**
  - semua target sentuh minimal 44 px;
  - fokus terlihat (cincin tint-3);
  - opsi memakai `button` dengan `aria-pressed`;
  - progress memakai `role="progressbar"`;
  - bar atribut memakai `aria-label`;
  - judul layar menerima fokus saat berpindah layar;
  - pengumuman `aria-live` untuk hasil.
- **Responsif:** uji di 390 px (mobile), 820 px (tablet), dan 1366 px (desktop). Pada mobile, tombol Lanjut di pertanyaan multi-select dibuat sticky di bawah.

### 6.11 User stories

1. **US-1 Login password saja.** Password salah ditolak dengan pesan. Password benar menyimpan sesi 30 hari. Setelah 5 kali gagal, login dibatasi.
2. **US-2 Cabang perangkat.** Dipilih sekali, tampil di header, dan bisa diganti.
3. **US-3 Menjawab tanpa mengetik.** 7 pertanyaan dengan klik, target sentuh ≥ 44 px, dan tombol Kembali mempertahankan jawaban.
4. **US-4 Tiga rekomendasi yang bisa dijelaskan.** Identik dengan golden output, dari 3 keluarga senar berbeda, dan minimal 1 kekuatan menyebut angka lab.
5. **US-5 Cetak resep.** 2 ketukan dari hasil sampai job terkirim. Pratinjau identik dengan cetakan. Dalam kondisi normal, kertas keluar maksimal 10 detik.
6. **US-6 Resep lengkap untuk stringer.** Isi identik dengan `slip-test-cases.json`, dan catatan stringer muncul sesuai aturan.
7. **US-7 Stasiun cetak otomatis.** Job tercetak maksimal 5 detik setelah dibuat, ada heartbeat, dan kegagalan terlihat.
8. **US-8 Cetak ulang dan cari resep berdasarkan kode.**
9. **US-9 Aturan berversi dengan pratinjau.** Perubahan berlaku tanpa deploy ulang.
10. **US-10 Tampilan sesuai design system.** Diperiksa dengan membandingkan screenshot prototipe di 390 px dan 1366 px.

## 7. Data

### 7.1 Sumber dan cakupan

- TWU String Performance Database, diekspor September 2026: 4.815 baris, 789 senar, 487 keluarga senar, 9 kondisi uji.
- Cakupan data per senar:
  - `lengkap` (504 senar): minimal 6 kondisi.
  - `referensi_51F` (283 senar): hanya 51 lbs / swing cepat. Dipakai dengan fallback. Korelasi peringkat antarkondisi mendukung fallback ini: stiffness 0,92–0,98, tension loss 0,94–1,00, spin 1,00.
  - `terbatas` (2 senar): tidak direkomendasikan.
- Material: Polyester 483, Nylon 231, Nylon/Polyester 18, Gut 18, Nylon/Polyurethane 17, Nylon/Zyex 11, Nylon/Polyolefin 6, Polyolefin 3, tidak diketahui 2.
- Spin potential tidak diukur untuk 71 senar.

### 7.2 File

| File | Isi |
|---|---|
| `data/twu_strings_raw.csv` | Export asli |
| `data/twu_strings_clean.csv` | Data bersih untuk impor ke database |
| `data/strings.json` | Format ringkas untuk tes |
| `data/cleaning-log.md` | Semua nilai yang diperbaiki atau dibuang |
| `data/export-twu.js` | Script browser untuk export ulang |
| `reference/build_data.py` | Pipeline pembersihan |
| `design/prototype.html`, `design/screen-*.png` | Acuan visual dan alur |

### 7.3 Aturan pembersihan (sudah diterapkan)

1. Stiffness yang menyimpang lebih dari 2× atau kurang dari 0,5× median senar yang sama dibuang (3 nilai).
2. Energy return di bawah 50% dibuang (1 nilai).
3. Tension loss polyester di bawah 12% dibuang (1 nilai).
4. Stabilization loss negatif dibuang. Kolom ini tidak dipakai engine.
5. Gauge tidak valid diambil dari nama senar (5 senar).
6. `family` = nama senar tanpa token gauge.
7. Baris dobel pada kondisi yang sama dirata-rata oleh importer sebelum memenuhi batasan unik.

### 7.4 Skema database (Prisma, PostgreSQL)

**Fase 1:**
- `TwuString`: `id`, `name` (unik), `family`, `material`, `gaugeMm`, `dataCoverage`, `datasetVersion`.
- `TwuMeasurement`: `stringId`, `tensionLbs`, `swing`, semua kolom metrik (nullable). Unik per (`stringId`, `tensionLbs`, `swing`).
- `SfRuleSet`: `id`, `version`, `config` (Json), `isActive`, `note`, `createdAt`.
- `SfBranch`: `id`, `name`, `slug` (unik), `paperMm` (58/80), `isActive`, `stationLastSeenAt`.
- `SfResult`: `code` (unik), `createdAt`, `branchId`, `answers` (Json), `condition`, `ruleVersion`, `datasetVersion`, `picks` (Json), `chosenRank` (nullable; 0 = cetak ketiganya).
- `SfPrintJob`: `id`, `resultCode`, `branchId`, `chosenRank`, `status`, `createdAt`, `sentAt`, `attempts`, `error`, `requestedBy` (device/admin).
- `SfLoginAttempt`: untuk rate limit. Atau pakai penyimpanan rate limit lain yang setara.

**Fase 2 (tambahan):**
- `SfProduct`: `id`, `twuStringId`, `name`, `pricePerSet`, `sold90d`, `isActive`.
- `SfStock`: `productId`, `branchId`, `qty`.
- Kelola lewat admin dan impor CSV.

## 8. Teknis

- **Repo baru:** `tirtonic-string-finder`.
- **Stack:** Next.js (versi stabil terbaru, App Router), TypeScript strict, Tailwind CSS (token dari 6.10 dijadikan theme), Prisma + PostgreSQL (project Supabase **baru**, terpisah dari database website), `jose` untuk sesi, `qrcode` untuk QR SVG, dan `lucide-react` untuk ikon. Deploy di Vercel.
- **Env:** `DATABASE_URL`, `APP_PASSWORD`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `APP_BASE_URL`. Sediakan `.env.example`.
- **Struktur:**
  - `lib/string-finder/engine.ts`, `slip.ts`, `load.ts` (muat dari DB, lalu cache), `auth.ts`, `ratelimit.ts`.
  - `middleware.ts`.
  - API:
    - `POST /api/auth/login`, `POST /api/auth/logout`
    - `POST /api/admin/auth/login`, `POST /api/station/auth/login`
    - `GET /api/branches`
    - `POST /api/recommend` (simpan `SfResult`, lalu kembalikan code, picks, dan profile_summary; tanpa dataset lengkap)
    - `GET /api/slip/[code]?rank=` (HTML pratinjau tanpa QR)
    - `POST /api/print-jobs`, `GET /api/print-jobs/[id]`
    - stasiun: `GET /api/station/jobs`, `PATCH /api/station/jobs/[id]`, `POST /api/station/heartbeat`, `GET /api/station/slip/[code]`
    - admin: simulator, aturan, cabang, resep, dan log.
  - Halaman:
    - `/login`, `/cabang`, `/` (Beranda + alur kuesioner sampai selesai)
    - `/stasiun/login`, `/stasiun`
    - `/admin/login`, `/admin`, `/admin/aturan`, `/admin/cabang`, `/admin/resep`, `/admin/resep/[kode]`, `/admin/log`
  - `scripts/import-twu.ts`, `scripts/seed.ts` (aturan dari `rules.json` dan cabang Yogyakarta, Solo, Semarang).
- **Tes:** `node --test` + `tsx`.
  - Golden engine dan resep dijalankan dengan data dari database dan dengan `data/strings.json`.
  - Tes auth: password salah/benar, rate limit, middleware.
  - Tes API: validasi input dan status job.
- **Performa:** `/api/recommend` p95 di bawah 300 ms. Job tercetak di bawah 5 detik.
- Tanpa dependensi AI/LLM.

## 9. Tahapan

| Tahap | Isi | Selesai jika |
|---|---|---|
| 1a | Scaffold repo, Prisma + migrasi, impor data, seed, port engine dan resep, golden test | Semua golden lulus |
| 1b | Login password + sesi + middleware, pilih cabang, Beranda, kuesioner, hasil, dan pratinjau sesuai prototipe | US-1 sampai US-4 dan US-10 |
| 1c | Job cetak, stasiun cetak, layar Selesai dan cadangan, detail resep + QR, panduan printer | US-5 sampai US-8 |
| 1d | Admin: simulator, aturan berversi, cabang, resep, log | US-9 |
| 1e | Validasi dengan stringer (20 kasus) dan uji operasional di cabang selama 1 minggu | Minimal 80% kasus: minimal 2 dari 3 rekomendasi layak; kegagalan cetak di bawah 3% |
| 2 | Produk, harga, stok, penjualan; mode Terlaris/Premium/Hemat | Bagian 11 |

## 10. Metrik keberhasilan (target awal)

- Penyelesaian (Mulai → hasil) minimal 70%.
- Median waktu sampai hasil di bawah 90 detik.
- Minimal 60% sesi berakhir dengan resep tercetak.
- Kegagalan cetak di bawah 3%.
- Kesesuaian dengan stringer sesuai kriteria tahap 1e.

## 11. Fase 2: Terlaris, Premium, Paling hemat

Implementasi acuan: `recommendPhase2()` dan `selectPhase2()`. Kasus uji: `fase2-contoh-A-F`.

1. Saring senar yang punya `SfProduct` aktif dan stok di cabang perangkat lebih dari 0. Lalu ambil 1 per keluarga.
2. **Kelompok cocok** = skor ≥ 85% × skor tertinggi. Kalau isinya kurang dari 3, longgarkan 5 poin demi 5 poin sampai batas 75%. Kalau tetap kurang, tampilkan yang ada.
3. Pilih berurutan, dan senar yang sudah terpilih tidak ikut lagi:
   - **Terlaris:** `sold90d` tertinggi.
   - **Premium:** harga per set tertinggi.
   - **Paling hemat:** harga per set terendah.
   - Kalau seri, skor kecocokan yang lebih tinggi menang.
4. Kalau senar dengan skor tertinggi tidak terpilih, tampilkan "Paling sesuai dengan profil Anda: …".
5. Kartu dan resep menampilkan label, harga, dan stok cabang. Skor kecocokan tetap ditampilkan.

## 12. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Hak penggunaan data TWU | Perhitungan internal, sumber dicantumkan, database tidak diekspos, aplikasi dikunci password. Cek syarat penggunaan TWU |
| Password toko bocor | Rate limit login, ganti `APP_PASSWORD` + `SESSION_SECRET` untuk mengeluarkan semua perangkat, password admin terpisah |
| Printer tidak cocok untuk cetak dari browser (terutama tablet Android + Bluetooth) | Utamakan printer USB + PC/laptop Windows sebagai stasiun; uji sebelum membeli |
| Stasiun tertutup atau perangkat tidur | Heartbeat dan peringatan di admin; kode resep selalu tampil; cetak ulang dari admin |
| Kertas habis (tidak terdeteksi browser) | Pesan cadangan setelah 30 detik; cetak ulang |
| Hasil berbeda dari kebiasaan stringer | Tahap 1e; bobot bisa disetel; simulator menunjukkan alasan |
| Fase 1 merekomendasikan senar yang tidak dijual | Disengaja untuk uji coba; stringer menawarkan pengganti; log jadi bahan keputusan stok; selesai di Fase 2 |
| 283 senar hanya punya data 51F | Fallback berbasis korelasi tinggi, ditandai di kartu dan di resep |

## 13. Pertanyaan terbuka

1. Printer thermal yang dipakai: 58 atau 80 mm, dan koneksi USB/Bluetooth/LAN? Perangkat stasiun di tiap cabang apa?
2. Cabang Semarang sudah aktif?
3. Kolom tangan di resep sudah pas, atau perlu ditambah (misalnya pola senar atau pre-stretch)?
4. Catatan stringer tambahan apa yang ingin dijadikan aturan awal?
5. Fase 2: sumber angka penjualan (POS, spreadsheet, atau manual), dan apakah harga per set termasuk jasa pasang?
6. Domain aplikasi (misalnya `senar.tirtonic.com`).

---

## Lampiran A. Aturan awal (`rules.json`)

Bobot dasar: spin 10, power 10, control 10, comfort 10, stability 10, durability 5. Bonus prioritas: +40 dan +20.

| Jawaban | Penyesuaian |
|---|---|
| level = pemula | comfort +10, power +10 |
| level = kompetitif | control +5, stability +5 |
| swing = santai | power +10 |
| swing = cepat | control +10 |
| arm = pegal | comfort +15 |
| arm = cedera | comfort +35 |
| change = cepat | stability −5 |
| change = sedang | stability +10 |
| change = lama | stability +25 |
| breakage = sering | durability +25 |
| breakage = kadang | durability +10 |

Filter keras dan catatan stringer ada di `rules.json` (`hard_filters`, `slip.flags`).

## Lampiran B. Template teks penjelasan

Persen dibulatkan dan dibatasi 1–99. Desimal memakai koma.

Kekuatan:
- spin: "Potensi spin lebih tinggi dari {p}% senar yang diuji (nilai {sp})."
- comfort: "Lebih lembut dari {100−p_st}% senar yang diuji (stiffness {st} lb/in)."
- control: "Lebih kaku dari {p_st}% senar, jadi arah bola lebih mudah dijaga (stiffness {st} lb/in)."
- power: "Mengembalikan energi lebih baik dari {p_er}% senar (energy return {er}%)."
  Varian kelenturan: "Lentur (lebih lembut dari {100−p_st}% senar), membantu bola melaju lebih jauh."
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

Aturan pemilihan teks: kode acuan `explain()`.

## Lampiran C. Contoh hasil (golden)

Profil kompetitif, ayunan cepat, prioritas spin lalu kontrol, tanpa keluhan, ganti senar 1–3 bulan, kadang putus, tensi sedang (kondisi 51F):

| # | Senar | Skor |
|---|---|---|
| 1 | Tecnifibre Black Code 4S 16 (1.30) | 79,9 |
| 2 | Gamma Ocho 16 (1.30) | 78,1 |
| 3 | Signum Pro Plasma HEXtreme 16 (1.30) | 76,9 |
