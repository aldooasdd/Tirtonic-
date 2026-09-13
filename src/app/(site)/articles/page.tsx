import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

function fmtTanggal(d: Date) {
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default async function ArticlesPage({ searchParams }: { searchParams: { page?: string } }) {
  const articles = await safeQuery(
    () => prisma.article.findMany({ orderBy: { tanggal: "desc" } }),
    []
  );

  const totalPages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, Number(searchParams.page) || 1));
  const pageArticles = articles.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const popular = articles.slice(0, 8); // ponytail: no view-count field, reuse latest as "populer"

  return (
    <>
      <div className="mx-auto max-w-site px-4 py-8">
        {/* breadcrumb */}
        <nav className="mb-6 text-xs font-semibold text-gray-500">
          <Link href="/" className="hover:text-primary">Tirtonic</Link>
          <span className="mx-2">›</span>
          <Link href="/articles" className="hover:text-primary">Blog</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">Semua Artikel</span>
        </nav>

        {articles.length === 0 ? (
          <p className="py-20 text-center text-gray-500">Belum ada artikel.</p>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            {/* main: masonry grid */}
            <div>
              <div className="gap-6 sm:columns-2 [&>*]:mb-6">
                {pageArticles.map((a) => (
                  <Link
                    key={a.id}
                    href={`/articles/${a.id}`}
                    className="group block break-inside-avoid"
                  >
                    <div className="overflow-hidden rounded-lg bg-gray-100">
                      {a.gambar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.gambar} alt={a.judul} className="w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center text-gray-300">No image</div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      {a.tag && (
                        <span className="rounded bg-primary px-2 py-0.5 font-semibold text-white">{a.tag.split(",")[0]}</span>
                      )}
                      <span>{fmtTanggal(a.tanggal)}</span>
                    </div>
                    <h3 className="mt-2 font-bold text-gray-900 group-hover:text-primary">{a.judul}</h3>
                  </Link>
                ))}
              </div>

              {/* pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2 text-sm">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <Link
                      key={n}
                      href={`/articles?page=${n}`}
                      className={`flex h-9 min-w-9 items-center justify-center rounded-md px-3 font-semibold ${
                        n === page ? "bg-primary text-white" : "border text-gray-700 hover:border-primary"
                      }`}
                    >
                      {n}
                    </Link>
                  ))}
                  {page < totalPages && (
                    <Link
                      href={`/articles?page=${page + 1}`}
                      className="flex h-9 items-center justify-center rounded-md border px-3 font-semibold text-gray-700 hover:border-primary"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* sidebar: Artikel Populer */}
            <aside>
              <h2 className="mb-4 text-xl font-extrabold text-gray-900">Artikel Populer</h2>
              <ul className="space-y-4">
                {popular.map((a) => (
                  <li key={a.id}>
                    <Link href={`/articles/${a.id}`} className="group flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {a.gambar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.gambar} alt={a.judul} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">No image</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-primary">{a.judul}</h3>
                        <p className="mt-1 text-xs text-gray-500">{fmtTanggal(a.tanggal)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
