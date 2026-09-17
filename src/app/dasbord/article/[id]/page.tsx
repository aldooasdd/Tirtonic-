import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { updateArticle } from "@/app/dasbord/actions";
import ArticleForm from "@/components/ArticleForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Artikel — Tirtonic" };

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  if (!isAuthed()) redirect("/dasbord/login");

  const article = await safeQuery(() => prisma.article.findUnique({ where: { id: params.id } }), null);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dasbord" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
      <h1 className="mb-6 mt-2 text-2xl font-extrabold text-primary">Edit Artikel</h1>
      <ArticleForm action={updateArticle.bind(null, article.id)} article={article} />
    </div>
  );
}
