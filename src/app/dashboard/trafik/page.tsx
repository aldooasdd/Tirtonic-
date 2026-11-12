import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { PageHeader, StatCard, card } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trafik — Tirtonic Admin" };

// Nama depan produk: buang awalan kategori ("Sepatu Tenis", "Raket Tenis"), ambil 4 kata pertama (2 kata masih kembar: "Nike Vapor" ×4).
function shortName(nama: string, kategori: string | null) {
  const skip = new Set((kategori ?? "").toLowerCase().split(/\s+/).concat(["tenis", "tennis"]));
  const w = nama.trim().split(/\s+/);
  let i = 0;
  while (i < w.length - 1 && skip.has(w[i].toLowerCase())) i++;
  return w.slice(i, i + 4).join(" ");
}

export default async function TrafikPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("trafik")) redirect("/dashboard");

  const products = await safeQuery(() => prisma.product.findMany({ orderBy: { views: "desc" } }), []);
  const totalViews = products.reduce((s, p) => s + (p.views || 0), 0);
  const max = products[0]?.views || 0;

  // Agregat view per kategori & brand (dari Product.views kumulatif — belum ada data per waktu).
  const sumBy = (key: (p: (typeof products)[number]) => string) => {
    const m = new Map<string, number>();
    for (const p of products) if (p.views) m.set(key(p), (m.get(key(p)) ?? 0) + p.views);
    return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  };
  const byKat = sumBy((p) => p.kategori || "Lainnya");
  const brandAll = sumBy((p) => (p.brand || "Tanpa brand").trim());
  const byBrand = brandAll.length > 8 ? [...brandAll.slice(0, 7), { label: "Lainnya", n: brandAll.slice(7).reduce((a, b) => a + b.n, 0) }] : brandAll;
  const top10 = products.filter((p) => p.views > 0).slice(0, 10);
  const step = Math.max(1, Math.ceil(max / 4 / 10) * 10); // garis bantu tiap ±¼ maks, dibulatkan
  const axisMax = step * 4;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Trafik Produk" desc="Produk paling sering dilihat di tirtonic.com." />
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          <StatCard icon="eye" label="Total dilihat" value={totalViews.toLocaleString("id-ID")} />
          <StatCard icon="box" label="Jumlah produk" value={products.length.toLocaleString("id-ID")} />
          <StatCard icon="star" label="View terpopuler" value={max.toLocaleString("id-ID")} tone="green" />
        </div>

        {top10.length > 0 && (
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
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {([["Dilihat per Kategori", byKat], ["Dilihat per Brand", byBrand]] as const).map(([title, rows]) => (
            <div key={title} className={`${card} p-5`}>
              <h2 className="text-[17px] font-semibold text-[#0F1F1A]">{title}</h2>
              {rows.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">Belum ada data.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {rows.map((r) => (
                    <li key={r.label} className="group grid grid-cols-[7.5rem_1fr_auto] items-center gap-3" title={`${r.label}: ${r.n.toLocaleString("id-ID")} dilihat (${Math.round((r.n / (totalViews || 1)) * 100)}%)`}>
                      <span className="truncate text-sm text-[#3F4D47]">{r.label}</span>
                      <div className="h-5 overflow-hidden rounded-r-[4px] bg-[#F3F5F4]">
                        <div className="h-full rounded-r-[4px] bg-primary transition group-hover:bg-[#0E3B2E]" style={{ width: `${(r.n / Math.max(1, ...rows.map((x) => x.n))) * 100}%` }} />
                      </div>
                      <span className="w-20 text-right text-xs text-[#0F1F1A]">
                        {r.n.toLocaleString("id-ID")} <span className="text-[#9AA6A1]">· {Math.round((r.n / (totalViews || 1)) * 100)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className={`overflow-hidden ${card}`}>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Peringkat Produk</h2>
            <span className="text-xs text-gray-400">50 teratas</span>
          </div>
          {products.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">Belum ada data. Angka muncul setelah ada yang membuka halaman produk.</p>
          ) : (
            <ol className="divide-y">
              {products.slice(0, 50).map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 shrink-0 text-sm font-bold text-gray-400">{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src={p.gambar[0] || ""} alt="" className="h-10 w-10 shrink-0 rounded bg-gray-100 object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${p.id}`} target="_blank" className="block truncate text-sm font-medium text-gray-900 hover:text-primary">
                      {p.nama}
                    </Link>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${max ? Math.round((p.views / max) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-gray-900">
                    {p.views.toLocaleString("id-ID")}
                    <span className="ml-1 text-xs font-normal text-gray-400">dilihat</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Angka dihitung dari kunjungan halaman produk (termasuk refresh). Untuk data pengunjung menyeluruh
          (jumlah orang, asal traffic, device), perlu diaktifkan analytics terpisah.
        </p>
    </div>
  );
}
