import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { articleHref } from "@/lib/article-slug";

export const revalidate = 3600; // regenerate tiap 1 jam (cepat & anti-timeout; produk baru masuk ≤1 jam)

const BASE = "https://www.tirtonic.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles] = await Promise.all([
    prisma.product.findMany({ where: { status: "READY" }, select: { id: true, slug: true, updatedAt: true } }),
    prisma.article.findMany({ select: { id: true, slug: true, tanggal: true } }),
  ]);

  const staticPages = ["", "/shop", "/articles", "/string-finder", "/sponsorship", "/contact", "/kebijakan-pengembalian", "/bandingkan"].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  return [
    ...staticPages,
    ...products.map((p) => ({ url: `${BASE}/product/${p.slug || p.id}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...articles.map((a) => ({ url: `${BASE}${articleHref(a)}`, lastModified: a.tanggal, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
