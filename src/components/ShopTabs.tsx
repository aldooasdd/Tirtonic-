import Link from "next/link";
import { KATS } from "@/lib/shop-kat";

/** Bar kategori di atas shop. Kategori tanpa produk disembunyikan. */
export default function ShopTabs({ aktif, jumlah }: { aktif?: string; jumlah: Record<string, number> }) {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        <Link href="/shop" className={`whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-bold sm:text-base ${!aktif ? "border-primary text-gray-900" : "border-transparent text-gray-600 hover:text-gray-900"}`}>Semua</Link>
        {KATS.filter((k) => jumlah[k.db]).map((k) => (
          <Link key={k.slug} href={`/shop/${k.slug}`} className={`whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-bold sm:text-base ${aktif === k.slug ? "border-primary text-gray-900" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
            {k.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
