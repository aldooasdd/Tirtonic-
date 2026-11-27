import Link from "next/link";
import { KATS } from "@/lib/shop-kat";

/** Bar kategori shop gaya dock kaca (sama dengan filter kota di /event). Kategori kosong disembunyikan. */
export default function ShopTabs({ aktif, jumlah }: { aktif?: string; jumlah: Record<string, number> }) {
  const pil = (on: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-[600] transition active:scale-95 ${on ? "bg-neutral-950 text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)]" : "text-neutral-600 hover:bg-white hover:text-neutral-950"}`;
  return (
    <div className="relative z-20 mx-auto mt-4 max-w-[1400px] px-4 sm:px-6">
      <div className="ev-dock rounded-2xl p-2">
        <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&>:first-child]:ml-auto [&>:last-child]:mr-auto">
          <Link href="/shop" className={pil(!aktif)}>Semua</Link>
          {KATS.filter((k) => jumlah[k.db]).map((k) => (
            <Link key={k.slug} href={`/shop/${k.slug}`} className={pil(aktif === k.slug)}>{k.label}</Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
