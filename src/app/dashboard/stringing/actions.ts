"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/auth";
import { notify } from "@/lib/string-finder/notify";

const requireAuth = () => requireSection("stringing");

export async function startStringing(id: string, formData: FormData) {
  requireAuth();
  const stringerName = String(formData.get("stringer") ?? "").trim();
  if (!stringerName) return; // nama stringer wajib (input juga sudah `required` di UI)
  await prisma.sfOrder.update({ where: { id }, data: { status: "dikerjakan", startedAt: new Date(), stringerName } });
  revalidatePath("/dashboard/stringing");
}

export async function finishStringing(id: string) {
  requireAuth();
  const order = await prisma.sfOrder.update({
    where: { id },
    data: { status: "selesai", finishedAt: new Date() },
    include: { branch: true },
  });
  // WA "senar siap diambil" ke customer. Kegagalan WA tak membatalkan penyelesaian.
  const ok = await notify({
    event: "selesai",
    phone: order.phone,
    code: order.resultCode,
    branch: order.branch.name,
    chosenString: order.chosenString,
    customerName: order.customerName,
  });
  if (ok) await prisma.sfOrder.update({ where: { id }, data: { notifiedDone: new Date() } });
  revalidatePath("/dashboard/stringing");
}

export async function cancelStringing(id: string) {
  requireAuth();
  await prisma.sfOrder.update({ where: { id }, data: { status: "batal" } });
  revalidatePath("/dashboard/stringing");
}

export async function deleteStringingOrder(id: string) {
  requireAuth();
  await prisma.sfOrder.delete({ where: { id } });
  revalidatePath("/dashboard/stringing");
}
