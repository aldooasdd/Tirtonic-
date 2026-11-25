"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/auth";
import { bagTag, jenisRak, validBag } from "@/lib/rail";
import { uploadFile, storageConfigured } from "@/lib/storage";

function refresh() {
  revalidatePath("/dashboard/rak");
  revalidatePath("/skate-test");
  revalidatePath("/");
}

/** Pasang foto ke produk. Produk yang sudah ada di rak → fotonya diganti. */
export async function saveRail(fd: FormData): Promise<{ error?: string }> {
  requireSection("hero");
  const productId = String(fd.get("productId") || "");
  const file = fd.get("gambar");
  if (!(file instanceof File) || !file.size) return { error: "Pilih foto dulu." };
  if (!["image/webp", "image/png"].includes(file.type) || file.size > 1_000_000) return { error: "Format atau ukuran foto tidak cocok." };
  if (!storageConfigured) return { error: "Penyimpanan foto belum dikonfigurasi." };
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { kategori: true } });
  if (!p) return { error: "Pilih barangnya dulu." };
  let tag = "";
  if (jenisRak(p.kategori) === "tas") {
    const [ratio, x, y, grip] = String(fd.get("tas") || "").split(",").map(Number);
    const bag = validBag({ ratio, x, y, grip });
    if (!bag) return { error: "Titik gantung tas tidak terbaca. Upload ulang fotonya." };
    tag = bagTag(bag);
  }
  try {
    const last = await prisma.racketRail.aggregate({ _max: { urutan: true } }); // cek tabel dulu sebelum upload
    const foto = (await uploadFile(file, "rak")) + tag;
    await prisma.racketRail.upsert({ where: { productId }, update: { foto }, create: { productId, foto, urutan: (last._max.urutan ?? 0) + 1 } });
  } catch (e) {
    console.error("saveRail gagal:", e);
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  refresh();
  return {};
}

export async function deleteRail(id: string) {
  requireSection("hero");
  await prisma.racketRail.deleteMany({ where: { id } });
  refresh();
}

/** Daftar / hapus barang bonus merchandise. */
export async function setMerch(productId: string, on: boolean): Promise<{ error?: string }> {
  requireSection("hero");
  try {
    if (on) await prisma.merchandise.upsert({ where: { productId }, update: {}, create: { productId } });
    else await prisma.merchandise.deleteMany({ where: { productId } });
  } catch (e) {
    console.error("setMerch gagal:", e);
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  revalidatePath("/dashboard/rak");
  return {};
}
