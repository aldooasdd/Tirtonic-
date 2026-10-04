# Setup Printer Thermal & Stasiun Cetak

Panduan menyiapkan satu PC/laptop di meja stringer supaya resep keluar otomatis
di printer thermal, tanpa dialog cetak.

## Ringkasan alur

1. Perangkat toko (tablet/HP kasir) menjawab kuesioner → tekan **Cetak resep**.
2. Server membuat *job* cetak untuk cabang perangkat itu.
3. PC stasiun di cabang membuka halaman **/stasiun**, mengecek job tiap 3 detik,
   lalu mencetaknya otomatis ke printer thermal.

Satu stasiun = satu cabang = satu printer.

## 1. Printer thermal

- Disarankan printer thermal **USB** dengan driver Windows (mis. 58 mm atau 80 mm).
- Pasang driver bawaan printer, colok USB, pastikan muncul di **Windows →
  Settings → Bluetooth & devices → Printers & scanners**.
- **Jadikan printer thermal sebagai printer default** (klik printer → *Set as default*).
  Windows tidak boleh mengubah default ini otomatis: matikan
  *"Let Windows manage my default printer"*.

## 2. Ukuran kertas di driver

- Buka **Printing preferences** printer thermal.
- Set ukuran kertas **58 mm** atau **80 mm** sesuai kertas yang dipakai.
- Set margin ke 0 kalau ada opsinya.
- Ukuran kertas ini juga diatur per cabang di **Admin → Cabang** (default 58 mm),
  agar lebar cetak resep pas.

## 3. Cetak tanpa dialog (kiosk printing)

Jalankan Chrome atau Edge dengan flag `--kiosk-printing`. Dengan flag ini,
`window.print()` langsung mencetak ke printer default tanpa memunculkan dialog.

**Chrome (Windows):** klik kanan shortcut Chrome → *Properties* → tambahkan di
akhir kolom **Target**:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://tirtonic-string-finder.vercel.app/stasiun
```

**Edge (Windows):**

```
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=https://tirtonic-string-finder.vercel.app/stasiun
```

`--app=URL` membuka tanpa address bar (mode aplikasi). Boleh juga tanpa `--app`,
cukup buka URL /stasiun biasa.

## 4. Login & pilih cabang

1. Buka **/stasiun** → login pakai **password admin**.
2. Pilih **cabang** stasiun ini (mis. Semarang). Pilihan tersimpan di perangkat.
3. Layar menampilkan **"Terhubung"** dan waktu cek terakhir. Stasiun siap.

Tekan **Tes cetak** untuk memastikan printer & kertas benar sebelum jam buka.

## 5. Buka /stasiun otomatis saat PC menyala

Agar stasiun langsung jalan setelah PC dinyalakan:

1. Tekan `Win + R`, ketik `shell:startup`, Enter → folder **Startup** terbuka.
2. Salin **shortcut** Chrome/Edge yang sudah diberi flag `--kiosk-printing`
   (langkah 3) ke folder Startup itu.
3. (Opsional) Set Windows **auto-login** agar tidak perlu ketik password Windows.

Sesi login stasiun bertahan 30 hari, jadi tidak perlu login ulang tiap hari.

## Troubleshooting

- **Kertas tidak keluar tapi status "Terhubung":** cek printer default = thermal,
  dan Chrome/Edge dijalankan dengan `--kiosk-printing`.
- **Muncul dialog cetak:** flag `--kiosk-printing` belum aktif (shortcut salah,
  atau Chrome sudah terbuka dari shortcut lain). Tutup semua jendela Chrome dulu.
- **Resep gagal (badge merah):** tekan **Cetak ulang** pada baris job, atau cek
  koneksi & kertas. Admin melihat **"Stasiun tidak aktif"** kalau tidak ada
  heartbeat > 60 detik.
- **Lebar cetak tidak pas:** samakan ukuran kertas driver dengan setelan cabang
  di Admin → Cabang (58/80 mm).
