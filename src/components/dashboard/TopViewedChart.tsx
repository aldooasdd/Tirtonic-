import Link from "next/link";
import { card } from "@/components/dashboard/ui";

// Grafik batang 10 produk paling dilihat (Product.views kumulatif). Dipakai di /dashboard & /dashboard/trafik.
type P = { id: string; nama: string; kategori: string | null; views: number };

// Nama depan produk: buang awalan kategori ("Sepatu Tenis", "Raket Tenis"), ambil 4 kata pertama (2 kata masih kembar: "Nike Vapor" ×4).
function shortName(nama: string, kategori: string | null) {
  const skip = new Set((kategori ?? "").toLowerCase().split(/\s+/).concat(["tenis", "tennis"]));
  const w = nama.trim().split(/\s+/);
  let i = 0;
  while (i < w.length - 1 && skip.has(w[i].toLowerCase())) i++;
  return w.slice(i, i + 4).join(" ");
}

export default function TopViewedChart({ products }: { products: P[] }) {
  const top10 = products.filter((p) => p.views > 0).sort((a, b) => b.views - a.views).slice(0, 10);
  if (top10.length === 0) return null;
  const max = top10[0].views;
  const step = Math.max(1, Math.ceil(max / 4 / 10) * 10); // garis bantu tiap ±¼ maks, dibulatkan
  const axisMax = step * 4;
  return (
      <div className={`${card} p-5`}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold text-[#0F1F1A]">10 Produk Paling Dilihat</h2>
          <span className="hidden text-xs text-[#9AA6A1] sm:inline">jumlah kunjungan halaman produk</span>
        </div>
        <div className="mt-5 flex gap-2">
          {/* sumbu Y */}
          <div className="flex h-56 w-8 shrink-0 flex-col justify-between text-right text-[10px] text-[#9AA6A1]">
            {[4, 3, 2, 1, 0].map((k) => <span key={k} className="-translate-y-1/2 leading-none">{(step * k).toLocaleString("id-ID")}</span>)}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="absolute inset-x-0 top-0 h-56">
              {[0, 1, 2, 3, 4].map((k) => <div key={k} className="absolute inset-x-0 border-t border-[#EEF1EF]" style={{ top: `${(k / 4) * 100}%` }} />)}
            </div>
            <div className="relative flex h-56 items-end gap-1.5 sm:gap-3">
              {top10.map((p, i) => (
                <Link key={p.id} href={`/product/${p.id}`} target="_blank" className="group relative flex h-full flex-1 flex-col justify-end">
                  {i === 0 && <span className="mb-1 text-center text-[11px] font-semibold text-[#0F1F1A]">{p.views.toLocaleString("id-ID")}</span>}
                  <div className="mx-auto w-full max-w-[44px] rounded-t-[4px] bg-primary transition group-hover:bg-[#0E3B2E]" style={{ height: `${(p.views / axisMax) * 100}%` }} />
                  {/* tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-lg bg-[#0F1F1A] px-3 py-2 text-left text-white shadow-lg group-hover:block">
                    <p className="line-clamp-2 text-[11px] text-white/80">{p.nama}</p>
                    <p className="mt-0.5 text-sm font-semibold">{p.views.toLocaleString("id-ID")} dilihat</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 sm:gap-3">
              {top10.map((p, i) => (
                <div key={p.id} className="flex flex-1 flex-col items-center gap-1">
                  <span title={p.nama} className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-[#0F1F1A] sm:text-[11px]">{shortName(p.nama, p.kategori)}</span>
                  <span className="text-[10px] text-[#9AA6A1]">#{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}
