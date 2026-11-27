import Link from "next/link";
import { KATS } from "@/lib/shop-kat";

/** Bar kategori shop gaya dock kaca (sama dengan filter kota di /event). Kategori kosong disembunyikan. */
export default function ShopTabs({ aktif, jumlah }: { aktif?: string; jumlah: Record<string, number> }) {
  const pil = (on: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-[600] transition active:scale-95 ${on ? "liquid-tab-on text-white" : "text-neutral-700 hover:bg-white/50 hover:text-neutral-950"}`;
  return (
    <div className="relative z-20 mx-auto mt-4 max-w-[1400px] px-4 sm:px-6">
      {/* warna di belakang kaca supaya efek liquid glass kelihatan */}
      <div aria-hidden className="pointer-events-none absolute inset-x-10 inset-y-1 -z-10 rounded-full bg-gradient-to-r from-lime-300/50 via-emerald-200/40 to-sky-300/50 blur-2xl" />
      <div className="liquid-tabs rounded-full p-1.5">
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
