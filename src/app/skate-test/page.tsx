import SkateDeckRailDemo from "@/components/ui/skate-deck-rail-demo";

export const metadata = {
  title: "Skate Deck Rail — Test",
  robots: { index: false, follow: false }, // page test, jangan di-index
};

// Halaman uji coba komponen SkateDeckRail. BUKAN bagian flow utama — tidak dilink
// dari nav/shop. Token warna shadcn (background/foreground/card/chart-*) didefinisikan
// scoped di sini supaya gak nyentuh sisa situs.
export default function SkateTestPage() {
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
        @media (prefers-color-scheme: dark) {
          :root {
            --color-background: #0a0a0a;
            --color-foreground: #fafafa;
            --color-card: #141414;
            --color-card-foreground: #fafafa;
            --color-muted-foreground: #a1a1aa;
            --color-border: #27272a;
            --color-ring: #d4d4d8;
          }
        }
      `}</style>
      <SkateDeckRailDemo />
    </div>
  );
}
