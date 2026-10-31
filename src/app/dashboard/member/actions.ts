"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/auth";
import { normalizePhone } from "@/lib/string-finder/phone";

// Kode coach: huruf dari nama + 3 angka. Dipakai sebagai kode referral (Green).
function genCode(seed: string): string {
  const base = seed.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5) || "COACH";
  return base + Math.floor(100 + Math.random() * 900);
}

export async function saveMember(formData: FormData) {
  requireSection("member");
  const phone = normalizePhone((formData.get("phone") as string) || "");
  if (!phone) throw new Error("Nomor WhatsApp tidak valid.");
  const name = ((formData.get("name") as string) || "").trim() || null;
  const isCoach = formData.get("isCoach") === "on";
  const invitedPrive = formData.get("invitedPrive") === "on";
  const referredByRaw = ((formData.get("referredBy") as string) || "").trim().toUpperCase() || null;
  const birthdayRaw = ((formData.get("birthday") as string) || "").trim();
  const birthday = birthdayRaw ? new Date(birthdayRaw) : null;
  let coachCode = ((formData.get("coachCode") as string) || "").trim().toUpperCase() || null;

  const existing = await prisma.member.findUnique({ where: { phone } });
  if (isCoach && !coachCode) coachCode = existing?.coachCode ?? genCode(name ?? phone);
  if (!isCoach) coachCode = null; // bukan coach → tak punya kode
  // Cegah merujuk diri sendiri.
  const referredBy = referredByRaw && referredByRaw === coachCode ? null : referredByRaw;

  await prisma.member.upsert({
    where: { phone },
    create: { phone, name, isCoach, coachCode, invitedPrive, referredBy, birthday },
    update: { name, isCoach, coachCode, invitedPrive, referredBy, birthday },
  });
  revalidatePath("/dashboard/member");
  revalidatePath(`/riwayat/${phone}`);
}

// Daftarkan semua orang yang pernah stringing (SfOrder) atau belanja web (Order) jadi Member.
// Tak menimpa member yang sudah ada (flag coach/referral tetap). Poin tetap dari transaksi.
export async function importMembers() {
  requireSection("member");
  const [sf, ord] = await Promise.all([
    prisma.sfOrder.findMany({ select: { phone: true, customerName: true }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ select: { telepon: true, nama: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const map = new Map<string, string | null>(); // phone 62xxxx → nama (yang pertama ketemu)
  for (const o of sf) {
    const p = normalizePhone(o.phone || "");
    if (p && !map.has(p)) map.set(p, o.customerName || null);
  }
  for (const o of ord) {
    const p = normalizePhone(o.telepon || "");
    if (p && !map.has(p)) map.set(p, o.nama || null);
  }
  const existing = new Set((await prisma.member.findMany({ select: { phone: true } })).map((m) => m.phone));
  const toCreate = [...map].filter(([p]) => !existing.has(p)).map(([phone, name]) => ({ phone, name }));
  if (toCreate.length) await prisma.member.createMany({ data: toCreate, skipDuplicates: true });
  revalidatePath("/dashboard/member");
}

export async function deleteMember(formData: FormData) {
  requireSection("member");
  const phone = (formData.get("phone") as string) || "";
  await prisma.member.delete({ where: { phone } }).catch(() => {});
  revalidatePath("/dashboard/member");
}
