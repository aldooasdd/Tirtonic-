"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";

// Klaim kode promo (Coupon global) → masuk jadi voucher MILIK member ini.
export async function claimVoucher(phoneRaw: string, codeRaw: string): Promise<{ ok: boolean; desc?: string; error?: string }> {
  const phone = normalizePhone(phoneRaw || "");
  if (!phone) return { ok: false, error: "Nomor tidak valid." };
  const code = (codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Masukkan kode." };
  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { ok: false, error: "Kode tidak valid atau tidak aktif." };
  const dup = await prisma.memberVoucher.findFirst({ where: { phone, code, source: "promo" } });
  if (dup) return { ok: false, error: "Kode ini sudah kamu klaim." };
  const label = c.type === "amount" ? `Potongan Rp ${c.value.toLocaleString("id-ID")}` : `Diskon ${c.value}%`;
  await prisma.memberVoucher.create({ data: { phone, code, label, type: c.type, value: c.value, source: "promo" } });
  revalidatePath(`/riwayat/${phone}/voucher`);
  return { ok: true, desc: `${label} ditambahkan ke voucher kamu.` };
}
