"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkPassword, createSession, destroySession, isAuthed } from "@/lib/auth";
import { uploadFile, storageConfigured } from "@/lib/storage";

export type LoginState = { error: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pw = (formData.get("password") as string) || "";
  if (!checkPassword(pw)) return { error: "Password salah." };
  createSession();
  redirect("/admin");
}

export async function logout() {
  destroySession();
  redirect("/admin/login");
}

function requireAuth() {
  if (!isAuthed()) throw new Error("Unauthorized");
}

function revalidatePublic(productId?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
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

export async function createProduct(formData: FormData) {
  requireAuth();
  const data = parseData(formData);
  if (!data.nama || !data.kategori) throw new Error("Nama dan kategori wajib diisi.");
  const gambar = await uploadImages(formData);
  await prisma.product.create({ data: { ...data, gambar } });
  revalidatePublic();
  redirect("/admin");
}

export async function updateProduct(id: string, formData: FormData) {
  requireAuth();
  const data = parseData(formData);
  if (!data.nama || !data.kategori) throw new Error("Nama dan kategori wajib diisi.");
  const existing = formData.getAll("existingGambar").map(String);
  const uploaded = await uploadImages(formData);
  await prisma.product.update({
    where: { id },
    data: { ...data, gambar: [...existing, ...uploaded] },
  });
  revalidatePublic(id);
  redirect("/admin");
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
  const [url] = await Promise.all([uploadFile(file, "hero")]);
  await prisma.heroSlide.create({
    data: {
      gambar: url,
      link: ((formData.get("link") as string) || "").trim() || null,
      urutan: parseInt((formData.get("urutan") as string) || "0", 10) || 0,
    },
  });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteHeroSlide(id: string) {
  requireAuth();
  await prisma.heroSlide.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
}
