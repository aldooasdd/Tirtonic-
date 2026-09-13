# Tirtonic Tennis Store

Katalog produk tenis + saluran pemesanan via WhatsApp. Next.js (App Router) + Postgres (Prisma) + Supabase Storage.

## Halaman

Publik: Home `/`, Shop `/shop`, Product Detail `/product/[id]`, Articles `/articles` + `/articles/[id]`, Sponsorship `/sponsorship`, Contact/Link Hub `/contact`.
Admin: Login `/admin/login`, Dashboard stok `/admin`, Edit produk `/admin/product/[id]`.

## Setup

1. **Buat project Supabase**, lalu buat **bucket Storage bernama `tirtonic`** dan set **Public**.
2. Salin env: `cp .env.example .env` dan isi:
   - `DATABASE_URL` (pooled, tambah `?pgbouncer=true&connection_limit=1`) & `DIRECT_URL` (port 5432) — dari Supabase > Database.
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — dari Supabase > API.
   - `ADMIN_PASSWORD`, `SESSION_SECRET` (`openssl rand -hex 32`).
   - `NEXT_PUBLIC_ADMIN_WA` (format `62...`).
3. Buat tabel & seed cabang:
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. Jalankan: `npm run dev` (http://localhost:3000).

## Alur

- **Customer:** Shop → produk → detail → "Pesan via WhatsApp" (buka WA dengan nama produk otomatis). Tidak ada checkout di website.
- **Admin:** `/admin/login` (password) → dashboard → toggle Ready/Sold, tambah/edit/hapus produk. Perubahan langsung tampil di halaman publik (semua halaman publik `force-dynamic`, baca DB tiap request).

## Catatan implementasi

- Auth: 1 admin via `ADMIN_PASSWORD` env + cookie ber-HMAC (`SESSION_SECRET`). Tanpa tabel user.
- "Real-time" stok = halaman publik dirender per-request (bukan websocket).
- Data produk & artikel mulai kosong; diisi lewat dashboard (produk) / manual DB (artikel — belum ada CRUD, di luar scope Fase 1).
- Gambar produk & file proposal sponsorship diupload ke Supabase Storage (butuh env terisi).
