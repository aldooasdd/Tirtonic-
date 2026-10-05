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
  title: "Tirtonic Tennis Store — Toko Spesialis Tenis Jogja, Solo & Semarang",
  description:
    "Toko spesialis tenis original terlengkap di Jogja, Solo, dan Semarang: raket, sepatu, senar, tas, grip, bola dari brand terbaik dunia. Pengiriman ke seluruh Indonesia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
