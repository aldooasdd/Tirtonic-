import Navbar from "@/components/Navbar";
import { CartProvider } from "@/components/CartProvider";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Navbar />
      {/* navbar is fixed & floating: pad bottom on mobile, top on desktop */}
      <main className="pb-24 sm:pb-0 sm:pt-20">{children}</main>
      <FloatingWhatsApp />
    </CartProvider>
  );
}
