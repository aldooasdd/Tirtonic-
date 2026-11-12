"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";

// Murid daftar lewat link referral coach (/join?ref=KODE). referredBy cuma diisi sekali — tak bisa dibajak coach lain.
export async function joinReferral(_: string | null, formData: FormData): Promise<string | null> {
  const phone = normalizePhone((formData.get("phone") as string) || "");
  const code = ((formData.get("ref") as string) || "").trim().toUpperCase();
  const name = ((formData.get("name") as string) || "").trim().slice(0, 60) || null;
  if (!phone) return "Nomor WhatsApp tidak valid.";
  const coach = code ? await prisma.member.findFirst({ where: { coachCode: code, isCoach: true }, select: { phone: true } }) : null;
  if (!coach) return "Kode coach tidak ditemukan.";
  if (coach.phone === phone) return "Tidak bisa memakai kode sendiri.";
  const m = await prisma.member.findUnique({ where: { phone } });
  if (m?.referredBy && m.referredBy !== code) return "Nomor ini sudah terdaftar dengan coach lain.";
  await prisma.member.upsert({
    where: { phone },
    create: { phone, name, referredBy: code },
    update: { referredBy: code, ...(m?.name ? {} : { name }) },
  });
  redirect(`/riwayat/${phone}`);
}
