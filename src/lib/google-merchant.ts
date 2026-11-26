// Sinkron produk ke Google Merchant Center lewat Merchant API v1 (service account).
// Env: GOOGLE_MERCHANT_ID (5918641319), GOOGLE_MERCHANT_KEY (isi file JSON service account).
// ponytail: 1 produk = 1 item Google (harga termurah antar varian), bukan per varian/ukuran.
import { SignJWT, importPKCS8 } from "jose";
import { prisma } from "@/lib/prisma";
import { isB1G1 } from "@/lib/b1g1";
import { productHref } from "@/lib/product-slug";

const API = "https://merchantapi.googleapis.com";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");
const ACC = () => `accounts/${process.env.GOOGLE_MERCHANT_ID}`;

export const merchantReady = () => !!(process.env.GOOGLE_MERCHANT_ID && process.env.GOOGLE_MERCHANT_KEY);

let tok: { v: string; exp: number } | null = null;
async function token() {
  if (tok && tok.exp > Date.now() + 60_000) return tok.v;
  let key: { client_email: string; private_key: string };
  try { key = JSON.parse(process.env.GOOGLE_MERCHANT_KEY!); } catch {
    throw new Error("GOOGLE_MERCHANT_KEY di Vercel harus berisi ISI file JSON service account (diawali {\"type\": \"service_account\"), bukan nama file.");
  }
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/content" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(key.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(key.private_key, "RS256"));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Login Google gagal: ${j.error_description || j.error}`);
  tok = { v: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return tok.v;
}

async function g(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : {};
}

type P = {
  id: string; nama: string; slug: string | null; kategori: string; brand: string | null; deskripsi: string | null;
  harga: number; hargaDiskon: number | null; stok: number | null; status: string; berat: number; gambar: string[];
  variants: { harga: number; hargaDiskon: number | null; stok: number; gambar: string | null }[];
};

const jual = (harga: number, diskon: number | null) =>
  diskon != null && diskon < harga && !isB1G1(harga, diskon) ? diskon : null;
const micros = (rp: number) => ({ amountMicros: String(rp * 1_000_000), currencyCode: "IDR" });

/** Produk DB → productAttributes Merchant API (pure). */
export function toAttrs(p: P) {
  const opsi = p.variants.length ? p.variants : [{ harga: p.harga, hargaDiskon: p.hargaDiskon, stok: p.stok, gambar: null }];
  const ada = p.status !== "SOLD" && opsi.some((v) => v.stok == null || v.stok > 0);
  const pilih = (ada ? opsi.filter((v) => v.stok == null || v.stok > 0) : opsi)
    .reduce((a, b) => ((jual(b.harga, b.hargaDiskon) ?? b.harga) < (jual(a.harga, a.hargaDiskon) ?? a.harga) ? b : a));
  const sale = jual(pilih.harga, pilih.hargaDiskon);
  const foto = [...p.gambar, ...p.variants.map((v) => v.gambar).filter((x): x is string => !!x)];
  const desk = (p.deskripsi || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: p.nama.slice(0, 150),
    description: (desk || p.nama).slice(0, 5000),
    link: SITE + productHref(p),
    ...(foto[0] && { imageLink: foto[0] }),
    ...(foto.length > 1 && { additionalImageLinks: [...new Set(foto.slice(1))].slice(0, 10) }),
    availability: ada ? "IN_STOCK" : "OUT_OF_STOCK",
    price: micros(pilih.harga),
    ...(sale != null && { salePrice: micros(sale) }),
    brand: p.brand || p.nama.replace(/^(Raket|Sepatu|Senar|Tas)\s+(Tenis|Tennis)\s+/i, "").split(" ")[0],
    condition: "NEW",
    identifierExists: false,
    productTypes: [p.kategori],
    shippingWeight: { value: p.berat || 500, unit: "g" },
  };
}

async function dataSource() {
  const { dataSources = [] } = await g(`/datasources/v1/${ACC()}/dataSources`);
  const ds = dataSources.find((d: any) => d.input === "API" && d.primaryProductDataSource);
  if (!ds) throw new Error("Sumber data API belum ada di Merchant Center (Produk → Sumber data → Tambahkan produk menggunakan API).");
  const pp = ds.primaryProductDataSource;
  return { name: ds.name as string, feedLabel: (pp.feedLabel || "ID") as string, contentLanguage: (pp.contentLanguage || "id") as string };
}

async function pool<T>(xs: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) await fn(xs[i++]); }));
}

/** Kirim produk ke Google. Tanpa `ids` = semua + hapus item Google yang produknya sudah tidak ada di DB. */
export async function syncMerchant(ids?: string[]) {
  await g(`/accounts/v1/${ACC()}/developerRegistration:registerGcp`, { method: "POST", body: "{}" }).catch(() => {}); // sekali saja; sudah terdaftar → abaikan
  const ds = await dataSource();
  const ps = await prisma.product.findMany({ where: ids && { id: { in: ids } }, include: { variants: true } });
  const gagal: string[] = [];
  let kirim = 0;
  await pool(ps, 6, async (p) => {
    try {
      await g(`/products/v1/${ACC()}/productInputs:insert?dataSource=${encodeURIComponent(ds.name)}`, {
        method: "POST",
        body: JSON.stringify({ offerId: p.id, contentLanguage: ds.contentLanguage, feedLabel: ds.feedLabel, productAttributes: toAttrs(p) }),
      });
      kirim++;
    } catch (e) { gagal.push(`${p.nama}: ${(e as Error).message}`); }
  });
  let hapus = 0;
  if (ids) return { total: ps.length, kirim, hapus, gagal };
  const ada = new Set(ps.map((p) => p.id));
  for (const x of await googleProducts()) {
    if (x.dataSource !== ds.name || ada.has(x.offerId)) continue;
    const nm = `${ACC()}/productInputs/${x.contentLanguage}~${x.feedLabel}~${x.offerId}`;
    await g(`/products/v1/${nm}?dataSource=${encodeURIComponent(ds.name)}`, { method: "DELETE" }).then(() => hapus++, (e) => gagal.push(`hapus ${x.offerId}: ${e.message}`));
  }
  return { total: ps.length, kirim, hapus, gagal };
}

/** Semua produk yang sudah diproses Google + statusnya. */
export async function googleProducts() {
  const out: any[] = [];
  let page = "";
  do {
    const j = await g(`/products/v1/${ACC()}/products?pageSize=1000${page && `&pageToken=${page}`}`);
    out.push(...(j.products || []));
    page = j.nextPageToken || "";
  } while (page);
  return out;
}

// ponytail: self-check, jalankan via tsx bila logika harga/stok berubah.
export function demo() {
  const base = { id: "x", nama: "Raket Tenis Babolat Pure Aero", slug: "a", kategori: "Raket Tenis", brand: null, deskripsi: "<p>ok</p>", harga: 100, hargaDiskon: null, stok: null, status: "READY", berat: 300, gambar: [] };
  const a = toAttrs({ ...base, variants: [{ harga: 100, hargaDiskon: 80, stok: 0, gambar: null }, { harga: 120, hargaDiskon: null, stok: 2, gambar: null }] });
  if (a.availability !== "IN_STOCK" || a.price.amountMicros !== "120000000" || "salePrice" in a) throw new Error("varian habis harusnya dilewati");
  const b = toAttrs({ ...base, hargaDiskon: 50, variants: [] }); // B1G1 → harga normal, tanpa salePrice
  if ("salePrice" in b || b.availability !== "IN_STOCK" || b.brand !== "Babolat" || b.description !== "ok") throw new Error("b1g1/brand salah");
  if (toAttrs({ ...base, stok: 0, hargaDiskon: 90, variants: [] }).salePrice?.amountMicros !== "90000000") throw new Error("sale salah");
  if (toAttrs({ ...base, status: "SOLD", variants: [] }).availability !== "OUT_OF_STOCK") throw new Error("SOLD harusnya habis");
  return "ok";
}
