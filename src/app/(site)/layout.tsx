import Navbar from "@/components/Navbar";
import { CartProvider } from "@/components/CartProvider";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Navbar />
      {/* navbar is fixed & floating; desktop needs top clearance. Mobile bottom
          clearance lives in the footer (kept black) so no white strip shows below it. */}
      <main className="sm:pt-20">{children}</main>
      <FloatingWhatsApp />
    </CartProvider>
  );
}
