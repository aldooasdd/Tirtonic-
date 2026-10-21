import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // halaman privat/transaksional & API tak perlu diindeks
      disallow: ["/dashboard", "/checkout", "/cart", "/order", "/api", "/user"],
    },
    sitemap: "https://www.tirtonic.com/sitemap.xml",
  };
}
