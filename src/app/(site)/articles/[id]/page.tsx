import { notFound } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function ArticleDetail({ params }: { params: { id: string } }) {
  const a = await safeQuery(() => prisma.article.findUnique({ where: { id: params.id } }), null);
  if (!a) notFound();

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
