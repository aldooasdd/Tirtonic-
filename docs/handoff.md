# Handoff — Tirtonic Tennis Store

## Tujuan
Rebuild website **Tirtonic Tennis Store** dari nol dengan **Next.js 14 (App Router) + Prisma + PostgreSQL**, mereplikasi tampilan situs lama se-persis mungkin (PRD: `/Users/a1/Downloads/PRD_Tirtonic_Tennis_Store.md`).

Scope fase ini:
- Halaman publik: Home, Shop/Catalog, Product Detail, Articles, Sponsorship, Contact/Link Hub.
- Admin: Login (password sederhana) + Dashboard update stok Ready/Sold real-time + CRUD produk/artikel/hero/store.
- Tombol pesan → WhatsApp (`wa.me` + pesan otomatis nama produk). **Tidak ada** checkout/transaksi di situs.
- Mulai dari data kosong.

Target akhir: situs siap deploy ke produksi (Supabase Postgres + Storage), tampilan match referensi.

## Sudah selesai
- **Scaffold penuh** semua halaman publik + admin, semua route berfungsi.
- **Admin**: login cookie-based (HMAC via `SESSION_SECRET`, `ADMIN_PASSWORD`), dashboard CRUD produk/artikel/store/hero via Server Actions, toggle stok Ready/Sold.
- **Home**: HeroCarousel (multi-slide, input via dashboard), subtitle "Toko Tennis Yogyakarta, Solo & Semarang", Our Store (carousel 4 slot foto 1080×1080 → link Gmaps), New Arrival, New Article, footer benefit strip.
- **Shop**: live search dari navbar, filter merek bisa hide/show (di full-web + filter = 5 kolom, patokan layout tetap — responsif menambah/mengurangi kolom bukan mengubah ukuran card), pagination windowed, sort.
- **Product Detail**: breadcrumb, gallery + dots, size select, Buy Now via WA, collapsible (Deskripsi Produk + About Tirtonic), Related Products, Categories, Share.
- **Favorites** (bukan cart): React Context + localStorage (`tirtonic_favorites`), drawer slide-over dengan order WA. Ikon hati + badge count di navbar.
- **Navbar**: floating pill hijau, auto-hide saat scroll, pindah ke bawah + center pada mode HP, search capsul di dalam navbar.
- **Scroll-reveal**: efek muncul satu per satu **hanya** di footer benefit strip (stagger `delay={idx*90}`). Sengaja TIDAK di section home lain.
- Font Poppins (next/font) + override weight (semibold/bold diturunkan agar tidak terlalu tebal).
- Verifikasi terakhir: `npx tsc --noEmit` lolos, halaman render penuh.

## File yang disentuh
Kunci (bukan daftar lengkap; semua di `src/`):
- `src/app/(site)/page.tsx` — Home page (Hero, subtitle, OurStore, NewArrival, NewArticles, SeoBlock, Footer).
- `src/app/globals.css` — Poppins var, override font-weight, `.reveal`, `.snap-x-carousel`, component classes (`.btn-*`, `.field`, `.label`).
- `src/components/Navbar.tsx` — floating navbar + search + favorites.
- `src/components/Footer.tsx` — footer + benefit strip (satu-satunya pemakai `Reveal`).
- `src/components/Reveal.tsx` — client wrapper IntersectionObserver (threshold 0.12) untuk scroll-reveal.
- `src/components/HeroCarousel.tsx` — hero full-bleed di bawah navbar, rounded, multi-slide.
- `src/components/ShopClient.tsx` — logika filter show/hide, grid responsif, pagination, sort.
- `src/components/ProductCard.tsx` — card produk (foto full-bleed, HeartButton, nama, harga).
- `src/components/HeartButton.tsx` — tombol favorit (SVG hati).
- `src/components/CartProvider.tsx` — store Favorites + FavDrawer (alias `useFav`/`useCart`).
- `src/components/ProductDetail.tsx` — halaman detail produk.
- `src/components/Logo.tsx` — logo → landing.
- `src/lib/prisma.ts` — client Prisma + `safeQuery` (graceful DB-error).
- `prisma/schema.prisma` — Product, Article, Store (foto/maps/urutan), SponsorshipSubmission, HeroSlide, enum StockStatus. (Tanpa tabel Admin — single admin via env.)
- `prisma/seed.ts` — seed 4 store (Visit Us, Solo, Yogyakarta, Semarang).
- `.env` — nilai dev lokal (gitignored).

## Keputusan teknis
- **Next.js App Router + Server Components** default; Client Components (`"use client"`) hanya di yang butuh interaktivitas (navbar, shop, favorites, reveal, detail gallery). Alasan: minim JS ke client.
- **Prisma + Postgres**; lokal via Docker `tirtonic-pg` port **5433**, produksi Supabase. Alasan sesuai PRD.
- **Supabase Storage** untuk upload gambar (produk/hero/store). Belum aktif lokal — butuh env.
- **Server Actions** untuk semua mutasi (login, CRUD). Alasan: tanpa API route terpisah.
- **Single-admin auth via cookie HMAC** (`SESSION_SECRET` + `ADMIN_PASSWORD`), **tanpa tabel Admin**. Alasan: cukup untuk 1 admin, hindari over-engineering.
- **Favorites, bukan cart** (localStorage). Order lewat WA, tanpa transaksi in-site — sesuai PRD.
- **CSS scroll-snap** untuk carousel (tanpa library). `IntersectionObserver` untuk reveal.
- **`force-dynamic` + `safeQuery`** di halaman DB-driven agar tidak crash saat DB down/kosong.
- **Layout patokan**: full-web + filter = 5 kolom; responsif = tambah/kurang kolom, ukuran card tetap.
- **WhatsApp**: satu nomor default via env (`wa.me`).
- **Reveal hanya di footer** (keputusan eksplisit user: "jangan semuanya. yang ini aja").

## Belum selesai / masalah terbuka
- **Data kosong**: belum ada produk/artikel/hero nyata. Perlu diinput lewat dashboard.
- **Foto Our Store** (4 × 1080×1080) + link Google Maps: user akan kirim menyusul.
- **Supabase credentials** (DATABASE_URL produksi + Storage keys): belum ada. Upload gambar belum bisa diuji lokal tanpa env Storage.
- **Deploy produksi**: belum dilakukan.
- Catatan: error console "Unexpected token section" / "cards is not defined" yang sempat muncul adalah **stale Fast-Refresh cache**, BUKAN bug kode — sudah beres dengan `rm -rf .next` + restart. Jika muncul lagi, lakukan hal yang sama.

## Langkah berikutnya
1. Terima dari user: 4 foto Our Store (1080×1080) + link Gmaps → input via dashboard store.
2. Terima Supabase credentials → isi `.env` produksi (DATABASE_URL, SUPABASE_URL, SUPABASE keys, SESSION_SECRET, ADMIN_PASSWORD, WA number).
3. Jalankan `prisma migrate deploy` + `prisma db seed` di DB produksi.
4. Uji upload gambar (produk/hero/store) end-to-end setelah Storage aktif.
5. Input konten awal (produk + artikel + hero slide) lewat dashboard.
6. Deploy (Vercel/host pilihan) + verifikasi semua halaman + alur WA order.
7. QA responsif final (HP/tablet/desktop) + `npx tsc --noEmit` + build produksi (`next build`).

## Cara jalan lokal
```bash
docker start tirtonic-pg   # atau buat container Postgres port 5433
npx prisma migrate dev
npx prisma db seed
npm run dev
```
