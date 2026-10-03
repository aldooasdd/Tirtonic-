/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Supabase Storage serves images with `no-cache`; routing them through next/image
    // optimizes + caches them on Vercel's CDN and compresses to AVIF/WebP.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
