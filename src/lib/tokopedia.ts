// Server-only: fetch a Tokopedia product page and parse its fields from the HTML.
// Tokopedia server-renders name/price/description/variants/images into the HTML,
// so a plain fetch + regex is enough — no headless browser needed.
// ponytail: regex over embedded JSON, not a real parser. If Tokopedia changes their
// markup this breaks loudly (fields come back empty) — re-check the selectors then.

import { KATEGORI } from "@/lib/constants";

export type ParsedProduct = {
  nama: string;
  harga: number;
  brand: string | null;
  kategori: string;
  deskripsi: string | null;
  ukuran: string[];
  images: string[];
  sizeChart: string | null;
};

const BRANDS = [
  "Asics", "Yonex", "Wilson", "Babolat", "Head", "Volkl", "Völkl", "Prince",
  "Nike", "Adidas", "Dunlop", "Tecnifibre", "Lacoste", "Diadora", "Mizuno",
  "New Balance", "Puma", "K-Swiss", "Fila",
];

function decode(s: string): string {
  return s
    .replace(/\\u002F/gi, "/")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\")
    .trim();
}

function detectKategori(nama: string): string {
  const n = nama.toLowerCase();
  if (/(sepatu|shoe|footwear)/.test(n)) return "Sepatu Tenis";
  if (/(raket|racket|racquet)/.test(n)) return "Raket Tenis";
  if (/(senar|string|grip|overgrip)/.test(n)) return "String & Grip";
  if (/(bola|ball)/.test(n)) return "Bola Tenis";
  if (/(tas|bag|backpack|apparel|kaos|topi|wristband|aksesoris)/.test(n)) return "Tas & Aksesoris";
  return KATEGORI[0];
}

export function parseTokopedia(html: string): ParsedProduct {
  // --- name: og:title, stripped of the "- <variant> di <shop> | Tokopedia" tail ---
  const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] || "";
  let nama = ogTitle.replace(/\s*\|\s*Tokopedia\s*$/i, "").replace(/\s+di\s+[^-|]+$/i, "").trim();
  // drop a trailing " - 39" style variant suffix
  nama = nama.replace(/\s*-\s*\d{2}(?:[.,]\d)?\s*$/i, "").trim();

  // --- price: numeric field in the embedded state ---
  const priceMatch = html.match(/"price":(\d{4,})/);
  const harga = priceMatch ? parseInt(priceMatch[1], 10) : 0;

  // --- description: longest "content" JSON string value ---
  let deskripsi: string | null = null;
  const contentRe = /"content":"((?:[^"\\]|\\.){40,})"/g;
  let m: RegExpExecArray | null;
  let best = "";
  while ((m = contentRe.exec(html))) if (m[1].length > best.length) best = m[1];
  if (best) deskripsi = decode(best);

  // --- sizes: numeric variant values in tennis-shoe range (35–48) ---
  const sizes = new Set<string>();
  const valRe = /"value":"(\d{2}(?:[.,]5)?)"/g;
  while ((m = valRe.exec(html))) {
    const num = parseFloat(m[1].replace(",", "."));
    if (num >= 35 && num <= 48) sizes.add(m[1].replace(".", ","));
  }

  // --- images: full media list under "URLOriginal" (signed 700px URLs; they expire,
  //     but the importer downloads them immediately so that's fine) ---
  const images: string[] = [];
  const seen = new Set<string>();
  const origRe = /"URLOriginal":"([^"]+)"/g;
  while ((m = origRe.exec(html))) {
    const u = m[1].replace(/\\u002F/gi, "/").replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
    if (!seen.has(u)) {
      seen.add(u);
      images.push(u);
    }
  }
  // fallback: cache thumbnails (older markup) if no URLOriginal present
  if (images.length === 0) {
    const imgRe = /https:\/\/images\.tokopedia\.net\/img\/cache\/\d+\/([^"\\]+?)\.(?:jpg|jpeg|png|webp)/g;
    while ((m = imgRe.exec(html))) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      images.push(`https://images.tokopedia.net/img/cache/700/${id}.jpeg`);
    }
  }

  const brand = BRANDS.find((b) => new RegExp(`\\b${b}\\b`, "i").test(nama)) || null;

  // --- size chart: dedicated Tokopedia field (fashion/shoe categories) ---
  const scRaw = html.match(/"sizeChart":"([^"]+)"/)?.[1];
  const sizeChart = scRaw ? scRaw.replace(/\\u002F/gi, "/").replace(/\\u0026/gi, "&").replace(/\\\//g, "/") : null;

  return { nama, harga, brand, kategori: detectKategori(nama), deskripsi, ukuran: [...sizes], images: images.slice(0, 10), sizeChart };
}

export async function fetchTokopedia(url: string): Promise<ParsedProduct> {
  if (!/^https?:\/\/(www\.)?tokopedia\.com\//i.test(url)) {
    throw new Error("Link harus dari tokopedia.com");
  }
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9",
    },
    // ponytail: Tokopedia is slow; give it room but cap it.
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Gagal ambil halaman (HTTP ${res.status})`);
  const html = await res.text();
  const parsed = parseTokopedia(html);
  if (!parsed.nama || !parsed.harga) {
    throw new Error("Data produk tidak terbaca — cek link, atau isi manual.");
  }
  return parsed;
}
