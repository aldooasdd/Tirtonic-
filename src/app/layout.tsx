import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tirtonic Tennis Store — Toko Perlengkapan Tenis Yogyakarta & Solo",
  description:
    "Tirtonic Tennis Store: sepatu tenis, raket, string, tas, grip, bola. Produk original & authentic, pengiriman seluruh Indonesia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
