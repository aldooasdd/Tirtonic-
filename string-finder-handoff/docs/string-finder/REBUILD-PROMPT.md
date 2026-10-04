# Prompt siap-tempel — Rebuild String Finder di website Tirtonic

> Tempel ini ke room chat website Tirtonic. Pastikan isi `string-finder-handoff.zip` sudah diekstrak ke dalam repo website (mis. folder `string-finder-handoff/`), lalu kirim prompt ini.

---

Aku mau membangun ulang fitur **String Finder** ke dalam website Tirtonic ini (fullstack, satu Supabase yang sama). Semua materinya ada di folder `string-finder-handoff/` yang sudah aku ekstrak di repo. **Baca `string-finder-handoff/REBUILD-HANDOFF.md` lebih dulu** — itu peta lengkap + keputusan yang sudah final.

**Tujuan:** customer isi kuesioner → engine deterministik (TANPA AI) kasih 3 rekomendasi senar dari data lab TWU + aturan toko → customer pilih → (opsional) cetak resep + notifikasi WhatsApp.

**Aturan main (penting):**
1. **Port logika inti apa adanya** dari `string-finder-handoff/src/lib/string-finder/*` (engine, slip, types, dto, profile, validate, questions.json). Jangan ubah algoritmanya. Port juga `tests/*` + baseline `reference/test-cases.json` & `reference/slip-test-cases.json`, lalu jalankan tes — **harus hijau** sebagai bukti port benar.
2. **UI/UX bikin baru** mengikuti design system website Tirtonic yang sekarang (warna, font, komponen, layout). JANGAN pakai komponen lama (memang tidak aku sertakan). Alur & isi tiap layar: PRD §6.3–6.6 + `reference` prototype. Layar: kuesioner → hasil (kartu rekomendasi) → konfirmasi → selesai. Di kartu tampilkan nama, material, gauge, bar atribut, penjelasan, **harga (Rp)**. JANGAN tampilkan skor "kecocokan/100".
3. **Stok & harga satu sumber di website — jangan duplikat.** Buat tabel **`Product`** (`slug` unik, `name`, `priceIdr`, `inStock`, `stock?`) dan seed dari `string-finder-handoff/data/products-seed.json` (152 produk, slug sudah jadi). Tambah kolom `productSlug` di `TwuString` (isi dari slug yang sama). Saat `buildDatasetFromDb()` (lihat `load.ts`), JOIN `TwuString.productSlug → Product.slug` buat ambil harga+stok live. Senar `inStock=false` tidak direkomendasikan. `TwuString` TIDAK lagi menyimpan harga/stok sendiri.
4. **Impor data lab**: `TwuString`+`TwuMeasurement` dari `data/strings.json` (139 senar siap-pakai) atau impor ulang dari `data/web-strings-priced.csv` via `scripts/import-twu.ts`. Seed `SfRuleSet` dari `reference/rules.json` (v2).
5. **Supabase pooler `connection_limit=1`** → jangan query Prisma paralel (`Promise.all` bisa deadlock). Pakai await berurutan — lihat `load.ts`/`prisma.ts`.

**Kontrak API** (dipanggil UI): `POST /api/recommend` body `{answers}` → `{code, condition, profile_summary, picks[]}`; tiap pick = `{name, material, gauge, price, score, attrs{6}, metrics, explanation}`. Contoh implementasi: `src/app/api/recommend/route.ts`. Resep: `GET /api/slip/[code]?qr=1` (`render-slip.ts`).

**Opsional (ambil kalau relevan di website):** alur WhatsApp (`notify.ts` → `N8N_WEBHOOK`, event `pesanan_masuk`/`selesai`; workflow n8n+WAHA sudah ada), resep cetak, panel admin. Kalau website sudah punya auth/admin sendiri, pakai itu — jangan duplikat.

**Langkah yang aku mau:**
1. Baca `REBUILD-HANDOFF.md` + PRD, lalu kasih aku rencana singkat (file yang dibuat/diubah) sebelum mulai.
2. Setelah aku setuju: port engine + tes (buktikan hijau), buat `Product` + seed, sambungkan `load.ts` via JOIN, lalu bangun UI sesuai design website.

Mulai dari langkah 1 (baca + rencana).
