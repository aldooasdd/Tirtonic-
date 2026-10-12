import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BASE = "https://www.tirtonic.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles] = await Promise.all([
    prisma.product.findMany({ where: { status: "READY" }, select: { id: true, updatedAt: true } }),
    prisma.article.findMany({ select: { id: true, tanggal: true } }),
  ]);

  const staticPages = ["", "/shop", "/articles", "/string-finder", "/sponsorship", "/contact"].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  return [
    ...staticPages,
    ...products.map((p) => ({ url: `${BASE}/product/${p.id}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...articles.map((a) => ({ url: `${BASE}/articles/${a.id}`, lastModified: a.tanggal, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
