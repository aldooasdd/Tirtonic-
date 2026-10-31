"use server";

import { prisma } from "@/lib/prisma";

// Cek kode kupon (tanpa keranjang) → deskripsi validitas untuk ditampilkan ke member.
export async function checkCoupon(codeRaw: string): Promise<{ ok: boolean; desc?: string; error?: string }> {
  const code = (codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Masukkan kode." };
  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { ok: false, error: "Kupon tidak valid atau tidak aktif." };
  const disc = c.type === "amount" ? `Potongan Rp ${c.value.toLocaleString("id-ID")}` : `Diskon ${c.value}%`;
  const scope = c.productIds.length || c.categories.length ? "produk tertentu" : "semua produk";
  return { ok: true, desc: `${code}: ${disc} untuk ${scope}. Pakai di checkout atau kasir.` };
}
