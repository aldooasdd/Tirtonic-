import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import { createProduct, logout, createHeroSlide, deleteHeroSlide } from "./actions";
import ProductForm from "@/components/ProductForm";
import ProductRowActions from "@/components/ProductRowActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard Admin — Tirtonic" };

export default async function AdminDashboard() {
  if (!isAuthed()) redirect("/admin/login");

  const [products, slides] = await Promise.all([
    safeQuery(() => prisma.product.findMany({ orderBy: { createdAt: "desc" } }), []),
    safeQuery(() => prisma.heroSlide.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }] }), []),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-primary">Dashboard Stok</h1>
        <form action={logout}>
          <button className="text-sm text-gray-500 hover:text-red-600">Logout</button>
        </form>
      </div>

      <details className="mb-6 rounded-xl border p-4">
        <summary className="cursor-pointer font-semibold text-gray-900">🖼️ Hero Banner (Home)</summary>
        <div className="mt-4 space-y-4">
          <form action={createHeroSlide} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Gambar banner *</label>
              <input name="gambar" type="file" accept="image/*" required className="text-sm" />
            </div>
            <div>
              <label className="label">Link (opsional)</label>
              <input name="link" placeholder="/shop" className="field w-40" />
            </div>
            <div>
              <label className="label">Urutan</label>
              <input name="urutan" type="number" defaultValue={0} className="field w-20" />
            </div>
            <button className="btn-green">Tambah Slide</button>
          </form>

          {slides.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada banner. Home memakai banner default.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {slides.map((s) => (
                <div key={s.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.gambar} alt="" className="h-20 w-36 rounded border object-cover" />
                  <form action={deleteHeroSlide.bind(null, s.id)}>
                    <button className="absolute right-1 top-1 rounded-full bg-red-500 px-2 text-xs font-bold text-white">×</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      <details className="mb-8 rounded-xl border p-4">
        <summary className="cursor-pointer font-semibold text-gray-900">+ Tambah Produk</summary>
        <div className="mt-4">
          <ProductForm action={createProduct} />
        </div>
      </details>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-3">Produk</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Status / Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  Belum ada produk. Tambahkan di atas.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.gambar[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.gambar[0]} alt="" className="h-10 w-10 border object-contain" />
                      ) : (
                        <div className="h-10 w-10 border bg-gray-100" />
                      )}
                      <span className="font-medium text-gray-900">{p.nama}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{p.kategori}</td>
                  <td className="p-3 text-gray-600">{rupiah(p.harga)}</td>
                  <td className="p-3">
                    <ProductRowActions id={p.id} status={p.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Ubah status Ready/Sold langsung tercermin di halaman Shop & detail produk.
      </p>
    </div>
  );
}
