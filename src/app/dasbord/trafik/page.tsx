import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trafik — Tirtonic Admin" };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-2xl font-extrabold text-gray-900">{value.toLocaleString("id-ID")}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default async function TrafikPage() {
  if (!isAuthed()) redirect("/dasbord/login");

  const products = await safeQuery(() => prisma.product.findMany({ orderBy: { views: "desc" } }), []);
  const totalViews = products.reduce((s, p) => s + (p.views || 0), 0);
  const max = products[0]?.views || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-8 w-8" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-gray-900">Trafik Produk</div>
              <div className="text-[11px] text-gray-400">Produk paling sering dilihat</div>
            </div>
          </div>
          <Link
            href="/dasbord"
            className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total dilihat" value={totalViews} />
          <Stat label="Jumlah produk" value={products.length} />
          <Stat label="View terpopuler" value={max} />
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
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
                  <img src={p.gambar[0] || ""} alt="" className="h-10 w-10 shrink-0 rounded bg-gray-100 object-cover" />
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
      </main>
    </div>
  );
}
