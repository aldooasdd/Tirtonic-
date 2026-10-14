// URL artikel ramah-SEO: "/articles/<judul-slug>-<id>". ID (cuid, tanpa tanda hubung)
// selalu jadi token terakhir, jadi tetap unik & URL lama "/articles/<id>" masih valid.

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function articleHref(a: { id: string; judul: string }): string {
  const s = slugify(a.judul);
  return s ? `/articles/${s}-${a.id}` : `/articles/${a.id}`;
}

/** Ambil id dari parameter rute (token setelah tanda hubung terakhir; cuid tak berisi "-"). */
export function articleIdFromParam(param: string): string {
  const i = param.lastIndexOf("-");
  return i >= 0 ? param.slice(i + 1) : param;
}

// ponytail: self-check. Jalankan: npx tsx src/lib/article-slug.ts
if (require.main === module) {
  const a = { id: "cmv1ovitu0000ia4fvhi6xjab", judul: "Toko Tenis di Semarang Dekat Simpang Lima!" };
  const href = articleHref(a);
  if (href !== "/articles/toko-tenis-di-semarang-dekat-simpang-lima-cmv1ovitu0000ia4fvhi6xjab") throw new Error("FAIL href: " + href);
  if (articleIdFromParam(href.split("/").pop()!) !== a.id) throw new Error("FAIL extract slug-id");
  if (articleIdFromParam(a.id) !== a.id) throw new Error("FAIL extract bare id (URL lama)");
  console.log("article-slug self-check OK");
}
