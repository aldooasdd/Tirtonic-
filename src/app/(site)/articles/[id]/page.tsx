import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import Link from "next/link";
import Footer from "@/components/Footer";
import { MiniMarkdown } from "@/lib/mini-markdown";
import { articleHref, articleIdFromParam } from "@/lib/article-slug";

// ISR: artikel di-cache 5 menit → hemat egress DB.
export const revalidate = 300;

// Param bisa: slug baru, slug-id legacy, atau id murni (URL lama). Coba slug dulu, lalu id.
async function getArticle(param: string) {
  const bySlug = await safeQuery(() => prisma.article.findUnique({ where: { slug: param } }), null);
  if (bySlug) return bySlug;
  const id = articleIdFromParam(param);
  return safeQuery(() => prisma.article.findUnique({ where: { id } }), null);
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const a = await getArticle(params.id);
  if (!a) return {};
  const desc = (a.excerpt || a.konten).replace(/\s+/g, " ").trim().slice(0, 155);
  const canonical = articleHref(a);
  return {
    title: `${a.judul} — Tirtonic`,
    description: desc,
    alternates: { canonical },
    openGraph: { title: a.judul, description: desc, type: "article", url: canonical, images: a.gambar ? [a.gambar] : [] },
  };
}

export default async function ArticleDetail({ params }: { params: { id: string } }) {
  const a = await getArticle(params.id);
  if (!a) notFound();

  // Paksa ke URL kanonik "/articles/<judul-slug>-<id>" (URL lama / slug basi → 308).
  const canonical = articleHref(a);
  if (`/articles/${params.id}` !== canonical) permanentRedirect(canonical);

  // ponytail: "populer" = artikel terbaru lain (belum ada hitungan view); tambah kolom views kalau perlu ranking asli.
  const popular = await safeQuery(
    () => prisma.article.findMany({
      where: { id: { not: a.id } },
      orderBy: { tanggal: "desc" },
      take: 5,
      select: { id: true, slug: true, judul: true, gambar: true, tanggal: true },
    }),
    [],
  );
  const tgl = (d: Date) => d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <div className="mx-auto grid max-w-site gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
        <article className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">{a.judul}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {a.tag && <><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{a.tag}</span><span>•</span></>}
            <span>{tgl(a.tanggal)}</span>
            <span>• By {a.penulis}</span>
          </div>
          {a.gambar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={a.gambar} alt={a.judul} className="mt-6 w-full rounded-lg object-cover" />
          )}
          <div className="mt-2 text-gray-800"><MiniMarkdown text={a.konten} /></div>
        </article>

        {/* Artikel populer — desktop saja */}
        {popular.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <h2 className="text-xl font-extrabold text-gray-900">Artikel Populer</h2>
              <ul className="mt-4 space-y-5">
                {popular.map((p) => (
                  <li key={p.id}>
                    <Link href={articleHref(p)} className="group flex gap-3">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {p.gambar && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img loading="lazy" decoding="async" src={p.gambar} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-3 text-sm font-semibold leading-snug text-gray-900 group-hover:text-primary">{p.judul}</p>
                        <p className="mt-1 text-xs text-gray-400">{tgl(p.tanggal)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
      <Footer />
    </>
  );
}
