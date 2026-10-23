"use server";

import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";

// Cek apakah nomor pernah transaksi (stringing SfOrder atau pesanan toko Order).
// Login dashboard cuma boleh untuk nomor yang sudah pernah transaksi.
export async function userExists(rawPhone: string): Promise<boolean> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return false;
  const rest = phone.slice(2); // tanpa "62"
  const phoneVariants = [phone, "0" + rest, "+62" + rest];
  const [sf, order] = await Promise.all([
    prisma.sfOrder.count({ where: { phone } }),
    prisma.order.count({ where: { telepon: { in: phoneVariants } } }),
  ]);
  return sf + order > 0;
}
