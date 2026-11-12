import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { PageHeader, StatCard, card } from "@/components/dashboard/ui";
import TopViewedChart from "@/components/dashboard/TopViewedChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trafik — Tirtonic Admin" };

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

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Trafik Produk" desc="Produk paling sering dilihat di tirtonic.com." />
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          <StatCard icon="eye" label="Total dilihat" value={totalViews.toLocaleString("id-ID")} />
          <StatCard icon="box" label="Jumlah produk" value={products.length.toLocaleString("id-ID")} />
          <StatCard icon="star" label="View terpopuler" value={max.toLocaleString("id-ID")} tone="green" />
        </div>

        <TopViewedChart products={products} />

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
