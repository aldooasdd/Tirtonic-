import Link from "next/link";

export type ArticleCardData = {
  id: string;
  judul: string;
  tag: string | null;
  penulis: string;
  tanggal: Date;
  gambar: string | null;
  excerpt: string | null;
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function ArticleCard({ a, compact = false }: { a: ArticleCardData; compact?: boolean }) {
  return (
    <div className="flex flex-col border bg-white">
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        {a.gambar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.gambar} alt={a.judul} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {compact && a.tag && (
          <span className="mb-2 w-fit rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {a.tag.split(",")[0]}
          </span>
        )}
        <h3 className="text-base font-bold text-gray-900">{a.judul}</h3>
        {!compact && (
          <p className="mt-2 text-xs text-gray-500">
            👤 By {a.penulis} · 📅 {fmtDate(a.tanggal)}
            {a.tag ? ` · 🏷️ ${a.tag}` : ""}
          </p>
        )}
        {compact && <p className="mt-1 text-xs text-gray-500">{fmtDate(a.tanggal)}</p>}
        {a.excerpt && <p className="mt-2 line-clamp-3 text-sm text-gray-600">{a.excerpt}</p>}
        <div className="mt-auto pt-4">
          <Link href={`/articles/${a.id}`} className={compact ? "text-sm font-semibold text-primary" : "btn-green"}>
            {compact ? "Read More" : "Baca selengkapnya.."}
          </Link>
        </div>
      </div>
    </div>
  );
}
