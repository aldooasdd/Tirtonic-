/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ponytail: Vercel Image Optimization kena limit kuota (HTTP 402 OPTIMIZED_IMAGE_
    // REQUEST_PAYMENT_REQUIRED) → gambar baru gagal render. Lewati optimizer, muat
    // langsung dari Supabase (file-nya publik & 200 OK). Hidupkan lagi (hapus unoptimized)
    // kalau sudah upgrade plan Vercel / kuota optimization-nya cukup.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
