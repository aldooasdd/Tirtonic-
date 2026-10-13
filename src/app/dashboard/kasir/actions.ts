"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/auth";

export async function markPaid(id: string) {
  requireSection("kasir");
  await prisma.sfOrder.update({ where: { id }, data: { paidAt: new Date() } });
  revalidatePath("/dashboard/kasir");
  revalidatePath("/dashboard/stringing");
}

// Batalkan status lunas (kalau kasir salah pencet).
export async function unmarkPaid(id: string) {
  requireSection("kasir");
  await prisma.sfOrder.update({ where: { id }, data: { paidAt: null } });
  revalidatePath("/dashboard/kasir");
  revalidatePath("/dashboard/stringing");
}
