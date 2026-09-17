import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import { createProduct, logout, createHeroSlide, deleteHeroSlide, createArticle } from "./actions";
import ProductForm from "@/components/ProductForm";
import ProductRowActions from "@/components/ProductRowActions";
import ArticleForm from "@/components/ArticleForm";
import ArticleRowActions from "@/components/ArticleRowActions";

export const dynamic = "force-dynamic";
// Tokopedia import via the residential proxy can take longer than the default limit.
export const maxDuration = 60;
export const metadata = { title: "Dashboard Admin — Tirtonic" };

function Stat({ label, value, tone = "gray" }: { label: string; value: number; tone?: "gray" | "green" | "red" }) {
  const tones = {
    gray: "text-gray-900",
    green: "text-primary",
    red: "text-red-500",
  };
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  if (!isAuthed()) redirect("/dasbord/login");

  const [products, slides, articles, sponsorships] = await Promise.all([
    safeQuery(() => prisma.product.findMany({ orderBy: { createdAt: "desc" } }), []),
    safeQuery(() => prisma.heroSlide.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }] }), []),
    safeQuery(() => prisma.article.findMany({ orderBy: { tanggal: "desc" } }), []),
    safeQuery(() => prisma.sponsorshipSubmission.findMany({ orderBy: { createdAt: "desc" } }), []),
  ]);

  const ready = products.filter((p) => p.status === "READY").length;
  const fmtDate = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-8 w-8" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-gray-900">Tirtonic Admin</div>
              <div className="text-[11px] text-gray-400">Kelola produk &amp; banner</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="hidden text-sm font-medium text-gray-500 hover:text-primary sm:block">
              Lihat situs ↗
            </a>
            <form action={logout}>
              <button className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-red-400 hover:text-red-600">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total Produk" value={products.length} />
          <Stat label="Ready" value={ready} tone="green" />
          <Stat label="Artikel" value={articles.length} />
          <Stat label="Hero Slide" value={slides.length} />
        </div>

        {/* add product */}
        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm" open>
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">➕ Tambah Produk</span>
            <span className="text-xs font-normal text-gray-400 group-open:hidden">klik untuk buka</span>
          </summary>
          <div className="border-t p-5">
            <ProductForm action={createProduct} />
          </div>
        </details>

        {/* add article */}
        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">📝 Tambah Artikel</span>
            <span className="text-xs font-normal text-gray-400">{articles.length} artikel</span>
          </summary>
          <div className="border-t p-5">
            <ArticleForm action={createArticle} />
          </div>
        </details>

        {/* hero banner */}
        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">🖼️ Hero Banner (Home)</span>
            <span className="text-xs font-normal text-gray-400">{slides.length} slide</span>
          </summary>
          <div className="space-y-4 border-t p-5">
            <form action={createHeroSlide} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Gambar desktop * (lebar ~2.6:1, mis. 2400×920)</label>
                <input name="gambar" type="file" accept="image/*" required className="text-sm" />
              </div>
              <div>
                <label className="label">Gambar mobile (opsional, kotak 1:1, mis. 1080×1080)</label>
                <input name="gambarMobile" type="file" accept="image/*" className="text-sm" />
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
                    <img src={s.gambar} alt="" className="h-20 w-36 rounded-lg border object-cover" />
                    {s.gambarMobile && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">+ mobile</span>
                    )}
                    <form action={deleteHeroSlide.bind(null, s.id)}>
                      <button className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">×</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        {/* sponsorship submissions */}
        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">🤝 Pengajuan Sponsorship</span>
            <span className="text-xs font-normal text-gray-400">{sponsorships.length} pengajuan</span>
          </summary>
          <div className="space-y-3 border-t p-5">
            {sponsorships.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada pengajuan sponsorship.</p>
            ) : (
              sponsorships.map((s) => (
                <div key={s.id} className="rounded-xl border p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">{s.organisasi}</span>
                    <span className="shrink-0 text-xs text-gray-400">{fmtDate(s.createdAt)}</span>
                  </div>
                  <p className="text-gray-600">
                    {s.penanggungJawab}
                    {" · "}
                    <a href={`https://wa.me/${s.noWa.replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.noWa}</a>
                    {" · "}
                    <a href={`mailto:${s.email}`} className="text-primary hover:underline">{s.email}</a>
                  </p>
                  {[s.namaEvent, s.jenisEvent.join(", "), s.tanggalEvent, s.kota].filter(Boolean).length > 0 && (
                    <p className="mt-1 text-gray-600">
                      {[s.namaEvent, s.jenisEvent.join(", "), s.tanggalEvent, s.kota].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {s.bentuk.length > 0 && (
                    <p className="mt-1 text-gray-500"><span className="text-gray-400">Bentuk:</span> {s.bentuk.join(", ")}</p>
                  )}
                  {s.ringkasan && <p className="mt-1 whitespace-pre-line text-gray-500">{s.ringkasan}</p>}
                  {s.proposalFile && (
                    <a href={s.proposalFile} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-md border px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary">
                      📎 Lihat Proposal
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </details>

        {/* product list */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Daftar Produk</h2>
            <span className="text-xs text-gray-400">{products.length} item</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Produk</th>
                  <th className="px-5 py-3 font-semibold">Kategori</th>
                  <th className="px-5 py-3 font-semibold">Harga</th>
                  <th className="px-5 py-3 font-semibold">Status / Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-gray-400">
                      Belum ada produk. Tambahkan lewat panel di atas.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="border-t transition hover:bg-gray-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {p.gambar[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.gambar[0]} alt="" className="h-11 w-11 rounded-lg border object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-gray-100 text-[9px] text-gray-300">
                              no img
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{p.nama}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p.kategori}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{rupiah(p.harga)}</td>
                      <td className="px-5 py-3">
                        <ProductRowActions id={p.id} status={p.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* article list */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Daftar Artikel</h2>
            <span className="text-xs text-gray-400">{articles.length} item</span>
          </div>
          {articles.length === 0 ? (
            <p className="px-5 py-12 text-center text-gray-400">Belum ada artikel. Tambahkan lewat panel di atas.</p>
          ) : (
            <ul className="divide-y">
              {articles.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  {a.gambar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.gambar} alt="" className="h-11 w-11 shrink-0 rounded-lg border object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-gray-100 text-[9px] text-gray-300">
                      no img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900">{a.judul}</div>
                    <div className="text-xs text-gray-400">{fmtDate(a.tanggal)}{a.tag ? ` · ${a.tag}` : ""}</div>
                  </div>
                  <ArticleRowActions id={a.id} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Perubahan status Ready/Sold langsung tercermin di halaman Shop &amp; detail produk.
        </p>
      </main>
    </div>
  );
}
