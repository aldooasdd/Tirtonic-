import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";
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

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-10">
        {a.tag && <span className="text-xs font-bold uppercase text-primary">{a.tag}</span>}
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900">{a.judul}</h1>
        <p className="mt-2 text-sm text-gray-500">
          By {a.penulis} · {a.tanggal.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
        {a.gambar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.gambar} alt={a.judul} className="mt-6 w-full rounded-lg object-cover" />
        )}
        <div className="prose mt-6 max-w-none whitespace-pre-line text-gray-800">{a.konten}</div>
      </article>
      <Footer />
    </>
  );
}
