# String Finder — Handoff untuk Rebuild di Website Tirtonic

Tujuan paket ini: membangun ulang **String Finder** sebagai bagian dari **website Tirtonic** (fullstack, satu Supabase), dengan **UI/UX dibuat ulang mengikuti desain website Tirtonic yang sekarang**. Logika inti (engine, kuesioner, resep) diport apa adanya — itu yang bikin hasilnya deterministik & teruji.

Baca `PRD-string-finder.md` untuk detail penuh. Dokumen ini hanya peta + keputusan rebuild + yang berubah.

---

## 1. Apa itu String Finder (inti, 1 paragraf)

Customer isi kuesioner singkat (level, swing, prioritas, lengan, dll) → **engine deterministik (TANPA AI)** menilai setiap senar dari data lab Tennis Warehouse University (TWU) menurut aturan toko → tampilkan **3 rekomendasi** → customer pilih → cetak **resep stringing** (berisi senar + tensi + kode + QR) untuk diserahkan ke stringer. Opsional: input WhatsApp → notifikasi saat pesanan masuk & selesai.

## 2. Yang DIPORT (wajib, jangan diubah logikanya)

Sumber kebenaran implementasi = TypeScript teruji di `src/lib/string-finder/`:

| File | Isi |
|---|---|
| `engine.ts` | Inti: `prepare()` (hitung persentil), `buildPlan()` (bobot dari jawaban), `scoreAll()`, `recommend()` (3 pilihan), `recommendPhase2()`/`selectPhase2()` (terlaris/premium/hemat). **Deterministik.** |
| `types.ts` | Tipe bersama (StringRow, Rules, Answers, dll). |
| `slip.ts` | `buildSlip()` + render HTML resep + kode + flag peringatan. |
| `profile.ts`, `validate.ts` | Ringkasan profil customer + validasi jawaban. |
| `dto.ts` | Bentuk data yang dikirim ke browser (hanya 3 pilihan, dataset penuh TIDAK dikirim). |
| `questions.json` | Definisi kuesioner (pertanyaan, opsi, mapping ke kondisi). |

Kebenaran engine dikunci oleh **golden tests** (port juga): `tests/engine.test.ts`, `tests/slip.test.ts`, `tests/db.test.ts`, dengan baseline `reference/test-cases.json` & `reference/slip-test-cases.json`. Kalau port benar, angka-angka ini harus sama persis.

## 3. Yang DIBUAT ULANG oleh kamu (UI/UX ikut website Tirtonic)

Semua komponen tampilan — **jangan** pakai yang lama, bikin sesuai design system website:
- Layar kuesioner, layar hasil (kartu rekomendasi), layar pratinjau/konfirmasi, layar selesai.
- Referensi alur & isi tiap layar: PRD §6.3–6.6 + `design/prototype.html` + screenshot di `design/`.
- Tampilkan di kartu hasil: nama senar, material, gauge, bar atribut (spin/power/kontrol/kenyamanan/stabilitas/awet), penjelasan, **harga (Rp)**. (Skor "kecocokan/100" sengaja TIDAK ditampilkan.)

## 4. Yang OPSIONAL / mungkin tak perlu di website

Fitur ini dari versi "perangkat di toko". Di website publik mungkin tak relevan — ambil kalau perlu:
- Login customer, pilih cabang perangkat, cetak thermal, konsол stasiun (`stasiun/`), panel admin (`admin/`).
- Kalau website sudah punya auth/admin sendiri, pakai itu; jangan duplikat.

## 5. PERUBAHAN BESAR: stok & harga disatukan dengan website

Di versi lama, harga/stok disimpan di `TwuString` dan diimpor dari CSV. **Di website: jangan duplikat.** Website jadi sumber kebenaran stok+harga; String Finder ikut.

**Desain (satu Supabase):**
1. Website punya tabel **`Product`**: `slug` (unik), `name`, `priceIdr Int`, `inStock Boolean`, `stock Int?`.
2. `TwuString` dapat kolom **`productSlug String?`** (bukan lagi `priceIdr`/`inStock` sebagai sumber). Isi dari peta alias (`data/web-strings-map.json`).
3. Saat `buildDatasetFromDb()` (lihat `load.ts`): JOIN `TwuString.productSlug → Product.slug`, ambil `priceIdr` + `inStock` live. Senar `inStock=false` tidak ikut direkomendasikan.
4. Impor CSV tinggal untuk **data lab TWU** (`web-strings-priced.csv`, abaikan kolom price/stock-nya setelah Product jadi sumber).

**Kunci join = `slug`** (deterministik dari nama senar, mis. `babolat-rpm-blast-orange-16-130`). Bukan nama (rawan casing), bukan SKU manual. Bootstrap otomatis dari peta alias.

> Urutan: tabel `Product` harus ada dulu, baru String Finder JOIN ke situ. Butuh `products-seed.json` (slug, name, priceIdr, inStock) dari `web-pricing.json` + peta alias — minta ke sesi ini kalau belum dibuat.

## 6. Kontrak API (yang dipanggil UI)

`POST /api/recommend` — body `{ answers }` → `{ code, condition, profile_summary, picks[] }`.
`picks[i]` = `{ name, material, gauge, price, score, attrs{6}, metrics{st,tl,er,dw,sp}, explanation{strengths,weakness,notes} }`.
Lihat `dto.ts` + `src/app/api/recommend/route.ts` (contoh: simpan `SfResult`, buat `code`, ambil cabang). Resep: `GET /api/slip/[code]?qr=1` (lihat `render-slip.ts`).

Alur WhatsApp (opsional): `src/lib/string-finder/notify.ts` POST ke `N8N_WEBHOOK` (event `pesanan_masuk`/`selesai`), `phone.ts` normalisasi nomor. Workflow n8n sudah ada (WAHA).

## 7. Skema DB (Prisma) — lihat `prisma/schema.prisma`

Inti: `TwuString` (+ `measurements`), `TwuMeasurement`, `SfRuleSet` (aturan berversi, aktif), `SfResult` (hasil tersimpan + kode), `SfOrder` (pesanan + status + WA), `SfBranch`. Di website: tambah `Product` + `TwuString.productSlug`, buang `priceIdr`/`inStock` dari `TwuString` setelah migrasi.

## 8. Data (totals)

- `data/strings.json` — **dataset siap-pakai engine**: 139 senar in-stock, 9 kondisi (tensi×swing), tiap senar punya slice metrik per kondisi. Ini yang di-`prepare()`.
- `data/web-strings-priced.csv` — sumber impor mentah: **152 senar**, kolom lab TWU + `price_idr` + `in_stock`. (480 grup ukur setelah rata-rata; 47 senar `tanpa_data` = hanya harga, tak direkomendasikan; 13 habis stok.)
- `data/web-pricing.json` — harga+stok per senar hasil ambil dari website (152 entri).
- `data/web-strings-map.json` — peta alias **produk web (123) ↔ senar TWU** (76 cocok, 47 tanpa data). Dasar `productSlug`.
- `data/twu_strings_clean.csv` / `twu_strings_raw.csv` — dump TWU penuh (arsip).
- `reference/rules.json` — aturan toko berversi (bobot, filter, mapping kondisi, selection, slip). v2, exclude_coverage `["terbatas","tanpa_data"]`.
- `reference/questions.json` — kuesioner.
- `reference/test-cases.json`, `slip-test-cases.json` — golden baseline.
- `reference/engine.js`, `slip.js` — implementasi referensi JS (padanan TS).

## 9. Langkah rebuild (saran urut)

1. Port `src/lib/string-finder/*` + `reference/*.json` + `tests/*` apa adanya. Jalankan tes → harus hijau (bukti port benar).
2. Buat tabel `Product` di website, seed dari `products-seed.json`. Tambah `TwuString.productSlug`.
3. Impor data lab: `strings.json`/CSV → `TwuString` + `TwuMeasurement`. Seed `SfRuleSet` dari `rules.json`.
4. Sambungkan `load.ts` baca harga/stok via JOIN ke `Product`.
5. Bangun UI (kuesioner/hasil/konfirmasi/selesai) sesuai design website, panggil `/api/recommend`.
6. (Opsional) Alur WhatsApp + resep cetak.

Catatan penting (dari pengalaman): Supabase pooler `connection_limit=1` → **jangan query Prisma paralel** (`Promise.all` bisa deadlock), pakai await berurutan. Lihat `load.ts`/`prisma.ts`.
