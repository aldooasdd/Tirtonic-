// URL artikel ramah-SEO: "/articles/<slug>". Slug tersimpan unik di DB (kolom Article.slug).
// Fallback (artikel lama tanpa slug): "/articles/<id>". URL legacy "<slug>-<id>" tetap dilayani
// via articleIdFromParam lalu di-redirect ke slug kanonik.

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function articleHref(a: { id: string; slug?: string | null }): string {
  return `/articles/${a.slug || a.id}`;
}

/** Ambil id dari parameter rute legacy "<slug>-<id>" (cuid tak berisi "-" → token terakhir). */
export function articleIdFromParam(param: string): string {
  const i = param.lastIndexOf("-");
  return i >= 0 ? param.slice(i + 1) : param;
}

// ponytail: self-check. Jalankan: npx tsx src/lib/article-slug.ts
if (require.main === module) {
  if (slugify("Toko Raket Tenis di Solo!") !== "toko-raket-tenis-di-solo") throw new Error("FAIL slugify");
  if (articleHref({ id: "abc", slug: "toko-raket" }) !== "/articles/toko-raket") throw new Error("FAIL href slug");
  if (articleHref({ id: "abc", slug: null }) !== "/articles/abc") throw new Error("FAIL href fallback");
  if (articleIdFromParam("toko-raket-cmv3255a3000095qgmmn5o53p") !== "cmv3255a3000095qgmmn5o53p") throw new Error("FAIL extract");
  console.log("article-slug self-check OK");
}
