"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkPassword, createSession, destroySession, isAuthed } from "@/lib/auth";
import { uploadFile, uploadFromUrl, storageConfigured } from "@/lib/storage";
import { fetchTokopedia } from "@/lib/tokopedia";
import { markOrderPaid, markOrderShipped, cancelOrder } from "@/lib/orders";

export type LoginState = { error: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pw = (formData.get("password") as string) || "";
  if (!checkPassword(pw)) return { error: "Password salah." };
  createSession();
  redirect("/dashboard");
}

export async function logout() {
  destroySession();
  redirect("/dashboard/login");
}

function requireAuth() {
  if (!isAuthed()) throw new Error("Unauthorized");
}

function revalidatePublic(productId?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/dashboard");
  if (productId) revalidatePath(`/product/${productId}`);
}

async function uploadImages(formData: FormData): Promise<string[]> {
  const files = formData.getAll("gambar").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return [];
  if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
  const urls: string[] = [];
  for (const f of files) urls.push(await uploadFile(f, "products"));
  return urls;
}

const toInt = (v: FormDataEntryValue | null) => parseInt(((v as string) || "0").replace(/\D/g, ""), 10) || 0;

/** Percent discount → a discounted price, rounded to the nearest 500. */
const applyPct = (harga: number, pct: number) =>
  pct > 0 && pct < 100 ? Math.round((harga * (1 - pct / 100)) / 500) * 500 : null;

function parseData(formData: FormData) {
  const nama = ((formData.get("nama") as string) || "").trim();
  const kategori = ((formData.get("kategori") as string) || "").trim();
  const harga = toInt(formData.get("harga"));
  const diskonPersen = Math.min(90, Math.max(0, toInt(formData.get("diskonPersen"))));
  return {
    nama,
    kategori,
    harga,
    diskonPersen,
    hargaDiskon: applyPct(harga, diskonPersen), // no-variant products use this directly
    brand: ((formData.get("brand") as string) || "").trim() || null,
    deskripsi: ((formData.get("deskripsi") as string) || "").trim() || null,
    ukuran: formData.getAll("ukuran").map(String),
    status: (formData.get("status") as string) === "SOLD" ? ("SOLD" as const) : ("READY" as const),
  };
}

type VariantInput = { warna: string; ukuran: string; harga: number; hargaDiskon: number | null; stok: number; gambar: string | null; urutan: number };

/** Parse the variant rows from the form (aligned arrays) and upload any new per-row photos.
 *  A row needs a warna + harga to count; blank rows are skipped.
 *  `pct` is the product-wide percent discount; a row's own discount price overrides it. */
async function parseVariants(formData: FormData, pct: number): Promise<VariantInput[]> {
  const warna = formData.getAll("v_warna").map(String);
  const ukuran = formData.getAll("v_ukuran").map(String);
  const harga = formData.getAll("v_harga").map(String);
  const diskon = formData.getAll("v_diskonpersen").map(String);
  const stok = formData.getAll("v_stok").map(String);
  const existing = formData.getAll("v_existingGambar").map(String);
  const files = formData.getAll("v_gambar");

  const out: VariantInput[] = [];
  for (let i = 0; i < warna.length; i++) {
    const w = (warna[i] || "").trim();
    const h = parseInt((harga[i] || "0").replace(/\D/g, ""), 10) || 0;
    if (!w || h <= 0) continue; // skip incomplete rows
    const f = files[i];
    let gambar: string | null = (existing[i] || "") || null;
    if (f instanceof File && f.size > 0) {
      if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
      gambar = await uploadFile(f, "products");
    }
    const vp = Math.min(90, Math.max(0, parseInt((diskon[i] || "0").replace(/\D/g, ""), 10) || 0));
    out.push({
      warna: w,
      ukuran: (ukuran[i] || "").trim(),
      harga: h,
      hargaDiskon: applyPct(h, vp > 0 ? vp : pct), // row % override, else product-wide %
      stok: parseInt((stok[i] || "0").replace(/\D/g, ""), 10) || 0,
      gambar,
      urutan: i,
    });
  }
  return out;
}

/** The product's headline price: the variant with the lowest effective price (discount if any),
 *  so shop sort/filter + Best Deal use the real cheapest. Else the product's own fields. */
function headlinePrice(variants: VariantInput[], data: { harga: number; hargaDiskon: number | null }) {
  if (!variants.length) return { harga: data.harga, hargaDiskon: data.hargaDiskon };
  const eff = (v: VariantInput) => v.hargaDiskon ?? v.harga;
  const cheapest = variants.reduce((a, b) => (eff(b) < eff(a) ? b : a));
  return { harga: cheapest.harga, hargaDiskon: cheapest.hargaDiskon };
}

/** Resolve the size chart: a newly uploaded file wins, else the existing/imported URL. */
async function resolveSizeChart(formData: FormData): Promise<string | null> {
  const file = formData.get("sizeChartFile");
  if (file instanceof File && file.size > 0) {
    if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
    return uploadFile(file, "sizecharts");
  }
  return ((formData.get("sizeChartUrl") as string) || "") || null;
}

export async function createProduct(formData: FormData) {
  requireAuth();
  const data = parseData(formData);
  if (!data.nama || !data.kategori) throw new Error("Nama dan kategori wajib diisi.");
  const existing = formData.getAll("existingGambar").map(String);
  const uploaded = await uploadImages(formData);
  const sizeChart = await resolveSizeChart(formData);
  const variants = await parseVariants(formData, data.diskonPersen);
  const headline = headlinePrice(variants, data);
  await prisma.product.create({
    data: { ...data, ...headline, gambar: [...existing, ...uploaded], sizeChart, variants: { create: variants } },
  });
  revalidatePublic();
  redirect("/dashboard");
}

export type ImportResult = {
  nama: string;
  harga: number;
  brand: string | null;
  kategori: string;
  deskripsi: string | null;
  ukuran: string[];
  gambar: string[];
  sizeChart: string | null;
  variants: { warna: string; ukuran: string; harga: number; stok: number; gambar: string | null }[];
};

/** Import one product from a Tokopedia link: parse fields + re-host its images to Supabase.
 *  Returns `{ error }` on failure so the message survives Next.js production error masking. */
export async function importFromTokopedia(url: string): Promise<ImportResult | { error: string }> {
  requireAuth();
  let p;
  try {
    p = await fetchTokopedia(url);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal impor dari Tokopedia." };
  }
  const gambar: string[] = [];
  let sizeChart: string | null = null;
  if (storageConfigured) {
    for (const img of p.images) {
      try {
        gambar.push(await uploadFromUrl(img, "products"));
      } catch {
        /* skip a failed image, keep the rest */
      }
    }
    if (p.sizeChart) {
      try {
        sizeChart = await uploadFromUrl(p.sizeChart, "sizecharts");
      } catch {
        /* size chart optional */
      }
    }
  }

  // Re-host each colour's photo once, then map it onto every variant of that colour.
  const colorPhoto: Record<string, string | null> = {};
  if (storageConfigured) {
    for (const v of p.variants) {
      const key = v.warna.toLowerCase();
      if (v.gambarUrl && !(key in colorPhoto)) {
        try {
          colorPhoto[key] = await uploadFromUrl(v.gambarUrl, "products");
        } catch {
          colorPhoto[key] = null;
        }
      }
    }
  }
  const variants = p.variants.map((v) => ({
    warna: v.warna,
    ukuran: v.ukuran,
    harga: v.harga,
    stok: v.stok,
    gambar: colorPhoto[v.warna.toLowerCase()] ?? null,
  }));

  return {
    nama: p.nama,
    harga: p.harga,
    brand: p.brand,
    kategori: p.kategori,
    deskripsi: p.deskripsi,
    ukuran: p.ukuran,
    gambar,
    sizeChart,
    variants,
  };
}

export async function updateProduct(id: string, formData: FormData) {
  requireAuth();
  const data = parseData(formData);
  if (!data.nama || !data.kategori) throw new Error("Nama dan kategori wajib diisi.");
  const existing = formData.getAll("existingGambar").map(String);
  const uploaded = await uploadImages(formData);
  const sizeChart = await resolveSizeChart(formData);
  const variants = await parseVariants(formData, data.diskonPersen);
  const headline = headlinePrice(variants, data);
  await prisma.product.update({
    where: { id },
    data: {
      ...data,
      ...headline,
      gambar: [...existing, ...uploaded],
      sizeChart,
      variants: { deleteMany: {}, create: variants }, // replace the whole set
    },
  });
  revalidatePublic(id);
  redirect("/dashboard");
}

export async function deleteProduct(id: string) {
  requireAuth();
  await prisma.product.delete({ where: { id } });
  revalidatePublic(id);
}

export async function setStatus(id: string, status: "READY" | "SOLD") {
  requireAuth();
  await prisma.product.update({ where: { id }, data: { status } });
  revalidatePublic(id);
}

export async function createHeroSlide(formData: FormData) {
  requireAuth();
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) throw new Error("Pilih gambar dulu.");
  const mobileFile = formData.get("gambarMobile");
  const url = await uploadFile(file, "hero");
  const mobileUrl =
    mobileFile instanceof File && mobileFile.size > 0 ? await uploadFile(mobileFile, "hero") : null;
  await prisma.heroSlide.create({
    data: {
      gambar: url,
      gambarMobile: mobileUrl,
      link: ((formData.get("link") as string) || "").trim() || null,
      urutan: parseInt((formData.get("urutan") as string) || "0", 10) || 0,
    },
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteHeroSlide(id: string) {
  requireAuth();
  await prisma.heroSlide.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/dashboard");
}

// ---------- Articles ----------

function revalidateArticles(id?: string) {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/articles/${id}`);
}

function parseArticle(formData: FormData) {
  const judul = ((formData.get("judul") as string) || "").trim();
  const konten = ((formData.get("konten") as string) || "").trim();
  const tglRaw = (formData.get("tanggal") as string) || "";
  return {
    judul,
    konten,
    tag: ((formData.get("tag") as string) || "").trim() || null,
    penulis: ((formData.get("penulis") as string) || "").trim() || "admin",
    excerpt: ((formData.get("excerpt") as string) || "").trim() || null,
    tanggal: tglRaw ? new Date(tglRaw) : new Date(),
  };
}

/** Upload a single optional image under `name="gambar"`; null if none picked. */
async function uploadOneImage(formData: FormData, folder: string): Promise<string | null> {
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
  return uploadFile(file, folder);
}

export async function createArticle(formData: FormData) {
  requireAuth();
  const data = parseArticle(formData);
  if (!data.judul || !data.konten) throw new Error("Judul dan konten wajib diisi.");
  const gambar = await uploadOneImage(formData, "articles");
  await prisma.article.create({ data: { ...data, gambar } });
  revalidateArticles();
  redirect("/dashboard");
}

export async function updateArticle(id: string, formData: FormData) {
  requireAuth();
  const data = parseArticle(formData);
  if (!data.judul || !data.konten) throw new Error("Judul dan konten wajib diisi.");
  const uploaded = await uploadOneImage(formData, "articles");
  const existing = ((formData.get("existingGambar") as string) || "") || null;
  await prisma.article.update({ where: { id }, data: { ...data, gambar: uploaded ?? existing } });
  revalidateArticles(id);
  redirect("/dashboard");
}

export async function deleteArticle(id: string) {
  requireAuth();
  await prisma.article.delete({ where: { id } });
  revalidateArticles(id);
}

export async function deleteSponsorship(id: string) {
  requireAuth();
  await prisma.sponsorshipSubmission.delete({ where: { id } });
  revalidatePath("/dashboard");
}

// ---------- Orders (admin) ----------

function revalidateOrder(id: string) {
  revalidatePath("/dashboard/orders");
  revalidatePath(`/order/${id}`);
}

/** Konfirmasi pembayaran manual (transfer) — sama efeknya dgn webhook DOKU:
 *  potong stok + kirim event "paid" ke n8n. */
export async function adminMarkPaid(id: string) {
  requireAuth();
  await markOrderPaid(id, { metodeBayar: "Manual" });
  revalidateOrder(id);
}

/** Simpan nomor resi → status DIKIRIM → kirim event "shipped" ke n8n (WA resi ke customer). */
export async function adminMarkShipped(id: string, resi: string, kurir?: string) {
  requireAuth();
  await markOrderShipped(id, resi, kurir);
  revalidateOrder(id);
}

export async function adminCancelOrder(id: string) {
  requireAuth();
  await cancelOrder(id);
  revalidateOrder(id);
}
