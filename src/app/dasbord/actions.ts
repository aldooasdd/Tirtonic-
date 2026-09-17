"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkPassword, createSession, destroySession, isAuthed } from "@/lib/auth";
import { uploadFile, uploadFromUrl, storageConfigured } from "@/lib/storage";
import { fetchTokopedia } from "@/lib/tokopedia";

export type LoginState = { error: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pw = (formData.get("password") as string) || "";
  if (!checkPassword(pw)) return { error: "Password salah." };
  createSession();
  redirect("/dasbord");
}

export async function logout() {
  destroySession();
  redirect("/dasbord/login");
}

function requireAuth() {
  if (!isAuthed()) throw new Error("Unauthorized");
}

function revalidatePublic(productId?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/dasbord");
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

function parseData(formData: FormData) {
  const nama = ((formData.get("nama") as string) || "").trim();
  const kategori = ((formData.get("kategori") as string) || "").trim();
  const harga = parseInt(((formData.get("harga") as string) || "0").replace(/\D/g, ""), 10) || 0;
  return {
    nama,
    kategori,
    harga,
    brand: ((formData.get("brand") as string) || "").trim() || null,
    deskripsi: ((formData.get("deskripsi") as string) || "").trim() || null,
    ukuran: formData.getAll("ukuran").map(String),
    status: (formData.get("status") as string) === "SOLD" ? ("SOLD" as const) : ("READY" as const),
  };
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
  await prisma.product.create({ data: { ...data, gambar: [...existing, ...uploaded], sizeChart } });
  revalidatePublic();
  redirect("/dasbord");
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
};

/** Import one product from a Tokopedia link: parse fields + re-host its images to Supabase. */
export async function importFromTokopedia(url: string): Promise<ImportResult> {
  requireAuth();
  const p = await fetchTokopedia(url);
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
  return { nama: p.nama, harga: p.harga, brand: p.brand, kategori: p.kategori, deskripsi: p.deskripsi, ukuran: p.ukuran, gambar, sizeChart };
}

export async function updateProduct(id: string, formData: FormData) {
  requireAuth();
  const data = parseData(formData);
  if (!data.nama || !data.kategori) throw new Error("Nama dan kategori wajib diisi.");
  const existing = formData.getAll("existingGambar").map(String);
  const uploaded = await uploadImages(formData);
  const sizeChart = await resolveSizeChart(formData);
  await prisma.product.update({
    where: { id },
    data: { ...data, gambar: [...existing, ...uploaded], sizeChart },
  });
  revalidatePublic(id);
  redirect("/dasbord");
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
  revalidatePath("/dasbord");
  redirect("/dasbord");
}

export async function deleteHeroSlide(id: string) {
  requireAuth();
  await prisma.heroSlide.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/dasbord");
}

// ---------- Articles ----------

function revalidateArticles(id?: string) {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/dasbord");
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
  redirect("/dasbord");
}

export async function updateArticle(id: string, formData: FormData) {
  requireAuth();
  const data = parseArticle(formData);
  if (!data.judul || !data.konten) throw new Error("Judul dan konten wajib diisi.");
  const uploaded = await uploadOneImage(formData, "articles");
  const existing = ((formData.get("existingGambar") as string) || "") || null;
  await prisma.article.update({ where: { id }, data: { ...data, gambar: uploaded ?? existing } });
  revalidateArticles(id);
  redirect("/dasbord");
}

export async function deleteArticle(id: string) {
  requireAuth();
  await prisma.article.delete({ where: { id } });
  revalidateArticles(id);
}
