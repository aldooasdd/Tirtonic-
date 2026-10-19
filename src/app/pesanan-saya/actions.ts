"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";

export type ReviewState = { error?: string; ok?: boolean };

// Simpan penilaian produk. Publik (tanpa login) → diverifikasi ketat:
// order harus milik nomor HP itu DAN sudah DELIVERED. Dobel dicegah @@unique.
export async function submitReview(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const orderId = String(fd.get("orderId") || "");
  const productNama = String(fd.get("productNama") || "").trim();
  const phone = normalizePhone(String(fd.get("phone") || ""));
  const rating = Math.round(Number(fd.get("rating") || 0));
  const komentar = String(fd.get("komentar") || "").trim().slice(0, 500) || null;

  if (!orderId || !productNama || !phone) return { error: "Data tidak lengkap." };
  if (rating < 1 || rating > 5) return { error: "Pilih rating 1–5 bintang." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { telepon: true, status: true, items: { select: { productId: true, nama: true } } },
  });
  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (normalizePhone(order.telepon) !== phone) return { error: "Nomor tidak cocok dengan pesanan." };
  if (order.status !== "DELIVERED") return { error: "Hanya pesanan yang sudah diterima bisa dinilai." };
  const item = order.items.find((i) => i.nama === productNama);
  if (!item) return { error: "Produk tidak ada di pesanan ini." };

  try {
    await prisma.review.create({
      data: { orderId, productId: item.productId, productNama, rating, komentar },
    });
  } catch {
    return { error: "Produk ini sudah kamu nilai." }; // unique (orderId, productNama)
  }

  revalidatePath(`/pesanan-saya/${phone}`);
  return { ok: true };
}
