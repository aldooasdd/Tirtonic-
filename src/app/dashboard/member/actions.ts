"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/auth";
import { normalizePhone } from "@/lib/string-finder/phone";
import { sendWa } from "@/lib/wa";

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

export async function deleteMember(formData: FormData) {
  requireSection("member");
  const phone = (formData.get("phone") as string) || "";
  await prisma.member.delete({ where: { phone } }).catch(() => {});
  revalidatePath("/dashboard/member");
}

// Acc / tolak pengajuan Green Card dari halaman Manfaat Tier.
export async function reviewCoachApplication(formData: FormData) {
  requireSection("member");
  const id = (formData.get("id") as string) || "";
  const approve = formData.get("decision") === "approve";
  const app = await prisma.coachApplication.findUnique({ where: { id } });
  if (!app || app.status !== "pending") return;

  if (approve) {
    const existing = await prisma.member.findUnique({ where: { phone: app.phone } });
    const coachCode = existing?.coachCode ?? genCode(app.name);
    await prisma.$transaction([
      prisma.member.upsert({
        where: { phone: app.phone },
        create: { phone: app.phone, name: app.name, isCoach: true, coachCode },
        update: { isCoach: true, coachCode, name: existing?.name || app.name },
      }),
      prisma.coachApplication.update({ where: { id }, data: { status: "approved" } }),
    ]);
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");
    await sendWa(
      app.phone,
      `Halo Coach ${app.name}! 🎾\n\nSelamat, pengajuan *Tirtonic Green Card* kamu sudah disetujui. Kamu sekarang resmi jadi *Member Coach* Tirtonic.\n\nKode referral kamu: *${coachCode}*\nBagikan ke murid — kamu dapat bonus Ace Points dari belanja mereka.\n\nCek benefit kamu: ${site}/riwayat/${app.phone}/tier`,
    );
  } else {
    await prisma.coachApplication.update({ where: { id }, data: { status: "rejected" } });
  }
  revalidatePath("/dashboard/member");
  revalidatePath(`/riwayat/${app.phone}`);
  revalidatePath(`/riwayat/${app.phone}/tier`);
}
