"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normalizePhone } from "@/lib/string-finder/phone";

// Daftar Green Card (coach). Masuk antrian "pending" → admin acc di /dashboard/member.
export async function submitCoachApplication(phoneRaw: string, nameRaw: string, clubRaw: string, proof: string): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: "Nomor tidak valid." };
  const name = (nameRaw ?? "").trim().slice(0, 60);
  const club = (clubRaw ?? "").trim().slice(0, 80);
  if (!name) return { ok: false, error: "Nama wajib diisi." };
  if (!club) return { ok: false, error: "Club wajib diisi." };
  if (!/^data:image\/jpeg;base64,/.test(proof || "") || proof.length > 900_000) {
    return { ok: false, error: "Foto bukti tidak valid / terlalu besar." };
  }

  const [member, pending] = await Promise.all([
    prisma.member.findUnique({ where: { phone }, select: { isCoach: true } }),
    prisma.coachApplication.findFirst({ where: { phone, status: "pending" }, select: { id: true } }),
  ]);
  if (member?.isCoach) return { ok: false, error: "Kamu sudah terdaftar sebagai coach." };
  if (pending) return { ok: false, error: "Pengajuan kamu masih diproses." };

  await prisma.coachApplication.create({ data: { phone, name, club, proof } });
  revalidatePath(`/riwayat/${phone}/tier`);
  revalidatePath("/dashboard/member");
  return { ok: true };
}
