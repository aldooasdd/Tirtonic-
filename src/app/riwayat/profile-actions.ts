"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normalizePhone } from "@/lib/string-finder/phone";

// Simpan profil member (nama + tanggal lahir). Nomor WA tak bisa diganti (identitas).
// Tanggal lahir hanya bisa diisi SEKALI — kalau sudah ada, input baru diabaikan.
export async function saveProfile(phoneRaw: string, nameRaw: string, birthdayRaw: string): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: "Nomor tidak valid." };
  const name = (nameRaw ?? "").trim().slice(0, 60);
  if (!name) return { ok: false, error: "Nama wajib diisi." };

  const existing = await prisma.member.findUnique({ where: { phone }, select: { birthday: true } }).catch(() => null);

  // Birthday hanya di-set kalau belum pernah ada (kunci sekali isi).
  let birthday: Date | undefined;
  if (!existing?.birthday && birthdayRaw) {
    const dt = new Date(birthdayRaw + "T00:00:00+07:00");
    if (!Number.isNaN(dt.getTime()) && dt.getFullYear() > 1900 && dt <= new Date()) birthday = dt;
  }

  await prisma.member.upsert({
    where: { phone },
    create: { phone, name, ...(birthday ? { birthday } : {}) },
    update: { name, ...(birthday ? { birthday } : {}) },
  });
  revalidatePath(`/riwayat/${phone}`);
  return { ok: true };
}
