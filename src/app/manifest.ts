import type { MetadataRoute } from "next";

// PWA manifest: biar /stringer bisa "Add to Home Screen" dan kebuka fullscreen
// (standalone, tanpa address bar Chrome) buat kiosk stringer di toko.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tirtonic Stringer",
    short_name: "Stringer",
    start_url: "/stringer",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#146b52",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
