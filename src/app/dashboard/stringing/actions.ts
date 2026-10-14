"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/auth";
import { notify } from "@/lib/string-finder/notify";

const requireAuth = () => requireSection("stringing");

// Ambil hanya merek + headsize dari field racket (buang jenis Power/Spin/Control).
function racketMerkHead(racket: string | null): string | null {
  if (!racket) return null;
  const isJenis = (s: string) => /^(Power|Spin|Control)( \+ (Power|Spin|Control))*$/.test(s);
  const kept = racket.split(" · ").map((s) => s.trim()).filter((s) => s && !isJenis(s));
  return kept.join(" · ") || null;
}

export async function startStringing(id: string, formData: FormData) {
  requireAuth();
  const stringerName = String(formData.get("stringer") ?? "").trim();
  if (!stringerName) return; // nama stringer wajib (input juga sudah `required` di UI)
  const order = await prisma.sfOrder.update({
    where: { id },
    data: { status: "dikerjakan", startedAt: new Date(), stringerName },
    include: { branch: true },
  });
  // WA "senar mulai dikerjakan" + nama stringer. Tanpa estimasi & resep — cuma merek + headsize.
  await notify({
    event: "dikerjakan",
    phone: order.phone,
    code: order.resultCode,
    branch: order.branch.name,
    customerName: order.customerName,
    racket: racketMerkHead(order.racket),
    stringerName,
  });
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
