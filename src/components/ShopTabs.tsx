import Link from "next/link";
import { KATS } from "@/lib/shop-kat";

/** Bar kategori di atas shop. Kategori tanpa produk disembunyikan. */
export default function ShopTabs({ aktif, jumlah }: { aktif?: string; jumlah: Record<string, number> }) {
  const tab = (on: boolean) =>
    `relative whitespace-nowrap px-3 py-4 text-[15px] font-semibold transition sm:px-4 ${on ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}`;
  const garis = <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-ball sm:inset-x-4" />;
  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-[1600px] overflow-x-auto px-2 [scrollbar-width:none] lg:justify-center">
        <Link href="/shop" className={tab(!aktif)}>Semua{!aktif && garis}</Link>
        {KATS.filter((k) => jumlah[k.db]).map((k) => (
          <Link key={k.slug} href={`/shop/${k.slug}`} className={tab(aktif === k.slug)}>
            {k.label}
            {aktif === k.slug && garis}
          </Link>
        ))}
      </div>
    </nav>
  );
}
