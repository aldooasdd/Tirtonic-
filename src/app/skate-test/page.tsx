import SkateDeckRailDemo, { type RailItem } from "@/components/ui/skate-deck-rail-demo";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import { isB1G1 } from "@/lib/b1g1";
import { productHref } from "@/lib/product-slug";
import { railName } from "@/lib/rail";

export const revalidate = 300; // stok & harga; upload dari dashboard langsung tampil (revalidatePath)

const hargaJual = (x: { harga: number; hargaDiskon: number | null }) => (x.hargaDiskon != null && x.hargaDiskon < x.harga && !isB1G1(x.harga, x.hargaDiskon) ? x.hargaDiskon : x.harga);

async function railItems(): Promise<RailItem[]> {
  const rows = await safeQuery(() => prisma.racketRail.findMany({ where: { product: { status: "READY" } }, orderBy: [{ urutan: "asc" }, { createdAt: "asc" }], include: { product: { include: { variants: { orderBy: { urutan: "asc" } } } } } }), []);
  return rows.flatMap(({ id, foto, product: p }) => {
    const ada = p.variants.filter((v) => v.stok > 0);
    if (p.variants.length ? !ada.length : p.stok != null && p.stok <= 0) return []; // habis → turun dari rak
    const harga = (ada.length ? ada : [p]).map(hargaJual);
    const min = Math.min(...harga);
    const variants = p.variants.map((v) => [v.warna, v.ukuran].filter(Boolean).join(" / "));
    return [{ id, name: railName(p.nama), series: p.brand ?? undefined, tag: `${Math.max(...harga) > min ? "Mulai " : ""}${rupiah(min)}`, image: foto, variants, href: productHref(p) }];
  });
}


export const metadata = {
  title: "Skate Deck Rail — Test",
  robots: { index: false, follow: false }, // page test, jangan di-index
};

// Halaman uji coba komponen SkateDeckRail. BUKAN bagian flow utama — tidak dilink
// dari nav/shop. Token warna shadcn (background/foreground/card/chart-*) didefinisikan
// scoped di sini supaya gak nyentuh sisa situs.
export default async function SkateTestPage() {
  const items = await railItems();
  return (
    <div id="skate-test-root">
      {/* :root supaya dialog detail (render via portal ke body) ikut kebawa var-nya */}
      <style>{`
        :root {
          --color-background: #ffffff;
          --color-foreground: #0a0a0a;
          --color-card: #ffffff;
          --color-card-foreground: #0a0a0a;
          --color-muted-foreground: #71717a;
          --color-border: #e4e4e7;
          --color-ring: #0a0a0a;
          --color-chart-1: #e76e50;
          --color-chart-2: #2a9d90;
          --color-chart-3: #274754;
          --color-chart-4: #e8c468;
          --color-chart-5: #f4a462;
        }
      `}</style>
      <SkateDeckRailDemo items={items} />
    </div>
  );
}
