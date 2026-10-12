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
  metadataBase: new URL("https://tirtonic.com"),
  title: "Tirtonic Tennis Store — Toko Spesialis Tenis Jogja, Solo & Semarang",
  description:
    "Toko spesialis tenis original terlengkap di Jogja, Solo, dan Semarang: raket, sepatu, senar, tas, grip, bola dari brand terbaik dunia. Pengiriman ke seluruh Indonesia.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Tirtonic Tennis Store",
    url: "https://tirtonic.com",
    title: "Tirtonic Tennis Store — Toko Spesialis Tenis Jogja, Solo & Semarang",
    description:
      "Toko spesialis tenis original terlengkap di Jogja, Solo, dan Semarang.",
    images: ["/logo.png"],
  },
};

// Sinyal ke Google untuk "site name" (nama brand ganti URL) + logo + kotak search.
// Sitelinks (Jogja/Solo/dst) tetap Google yang tentukan sendiri, tak bisa dipaksa.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tirtonic.com/#org",
      name: "Tirtonic Tennis Store",
      alternateName: "Tirtonic",
      url: "https://tirtonic.com",
      logo: "https://tirtonic.com/logo.png",
    },
    {
      "@type": "WebSite",
      "@id": "https://tirtonic.com/#website",
      name: "Tirtonic Tennis Store",
      alternateName: "Tirtonic",
      url: "https://tirtonic.com",
      publisher: { "@id": "https://tirtonic.com/#org" },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://tirtonic.com/shop?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={poppins.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
