import Link from "next/link";
import Reveal from "./Reveal";

const IC = "h-8 w-8";
const ICONS: Record<string, React.ReactNode> = {
  smile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={IC}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  return: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={IC}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={IC}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" />
    </svg>
  ),
  award: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={IC}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={IC}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
};

const BENEFITS = [
  { icon: "smile", title: "Garansi Puas", desc: "Kami garansi Anda puas dengan setiap produk berkualitas kami." },
  { icon: "return", title: "7 Hari Pengembalian", desc: "Belanja dengan tenang di berbagai cabang kami." },
  { icon: "globe", title: "Gratis Ongkir Seluruh Indonesia", desc: "Pengiriman aman dan cepat ke seluruh Indonesia." },
  { icon: "award", title: "100% Authentic", desc: "Seluruh produk dijamin asli (authentic) dengan garansi uang kembali." },
];

export default function Footer({ benefits = false }: { benefits?: boolean }) {
  return (
    <footer className="mt-16 border-t">
      {benefits && (
        <div className="bg-gray-50">
          <div className="mx-auto grid max-w-site gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, idx) => (
              <Reveal key={b.title} delay={idx * 90} className="flex flex-col items-center text-center">
                <div className="mb-3 text-[#2b3a42]">{ICONS[b.icon]}</div>
                <div className="mb-1 font-semibold text-[#2b3a42]">{b.title}</div>
                <p className="text-sm text-gray-500">{b.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      )}
      <div className="bg-black text-white">
        <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-300 sm:flex-row">
          <nav className="flex gap-6">
            <Link href="/contact">Terms and Conditions</Link>
            <Link href="/contact">Return policy</Link>
            <Link href="/contact">Stores</Link>
          </nav>
          <span className="flex items-center gap-2 font-semibold text-white">
            © Tirtonic
          </span>
        </div>
      </div>
    </footer>
  );
}
