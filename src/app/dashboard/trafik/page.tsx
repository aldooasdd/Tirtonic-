import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { PageHeader, StatCard, Icon, card, btn, btnPrimary } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trafik — Tirtonic Admin" };

export default async function TrafikPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("trafik")) redirect("/dashboard");

  const products = await safeQuery(() => prisma.product.findMany({ orderBy: { views: "desc" } }), []);
  const totalViews = products.reduce((s, p) => s + (p.views || 0), 0);
  const max = products[0]?.views || 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Trafik Produk" desc="Produk paling sering dilihat di tirtonic.com." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          <StatCard icon="eye" label="Total dilihat" value={totalViews.toLocaleString("id-ID")} />
          <StatCard icon="box" label="Jumlah produk" value={products.length.toLocaleString("id-ID")} />
          <StatCard icon="star" label="View terpopuler" value={max.toLocaleString("id-ID")} tone="green" />
        </div>

        <div className={`overflow-hidden ${card}`}>
          <div className="border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Produk Terpopuler</h2>
          </div>
          {products.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">Belum ada data. Angka muncul setelah ada yang membuka halaman produk.</p>
          ) : (
            <ol className="divide-y">
              {products.map((p, i) => (
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
