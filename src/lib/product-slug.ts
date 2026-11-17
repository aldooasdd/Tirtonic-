import { slugify } from "@/lib/article-slug";

// URL produk ramah-SEO: /product/<slug>. Produk tanpa slug → /product/<id> (route menerima keduanya).
export const productHref = (p: { id: string; slug?: string | null }) => `/product/${p.slug || p.id}`;

/** Slug unik dari nama: "nama-produk", bentrok → "nama-produk-2", dst. */
export async function uniqueProductSlug(nama: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const base = slugify(nama) || "produk";
  let s = base;
  for (let i = 2; await exists(s); i++) s = `${base}-${i}`;
  return s;
}
