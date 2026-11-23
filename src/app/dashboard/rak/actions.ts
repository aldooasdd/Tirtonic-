"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/auth";
import { uploadFile, storageConfigured } from "@/lib/storage";

function refresh() {
  revalidatePath("/dashboard/rak");
  revalidatePath("/skate-test");
}

/** Pasang foto ke produk. Produk yang sudah ada di rak → fotonya diganti. */
export async function saveRail(fd: FormData): Promise<{ error?: string }> {
  requireSection("hero");
  const productId = String(fd.get("productId") || "");
  const file = fd.get("gambar");
  if (!(file instanceof File) || !file.size) return { error: "Pilih foto dulu." };
  if (!["image/webp", "image/png"].includes(file.type) || file.size > 1_000_000) return { error: "Format atau ukuran foto tidak cocok." };
  if (!storageConfigured) return { error: "Penyimpanan foto belum dikonfigurasi." };
  if (!(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) return { error: "Pilih barangnya dulu." };
  try {
    const last = await prisma.racketRail.aggregate({ _max: { urutan: true } }); // cek tabel dulu sebelum upload
    const foto = await uploadFile(file, "rak");
    await prisma.racketRail.upsert({ where: { productId }, update: { foto }, create: { productId, foto, urutan: (last._max.urutan ?? 0) + 1 } });
  } catch (e) {
    console.error("saveRail gagal:", e);
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  refresh();
  return {};
}

/** Tukar posisi dengan tetangga (dir -1 = maju). */
export async function moveRail(id: string, dir: 1 | -1) {
  requireSection("hero");
  const rows = await prisma.racketRail.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await prisma.$transaction(rows.map((r, k) => prisma.racketRail.update({ where: { id: r.id }, data: { urutan: k + 1 } })));
  refresh();
}

export async function deleteRail(id: string) {
  requireSection("hero");
  await prisma.racketRail.deleteMany({ where: { id } });
  refresh();
}
