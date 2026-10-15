"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyHash } from "@/lib/role-password";
import { createCommunitySession, destroyCommunitySession, currentCommunityId } from "@/lib/community-auth";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { uploadFile, storageConfigured } from "@/lib/storage";
import { sendWa } from "@/lib/wa";

export type FormState = { error?: string };

const cleanIg = (s: string) => s.trim().replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();

// ──────────────── Daftar / Login ────────────────

export async function registerCommunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = ((formData.get("name") as string) || "").trim();
  const instagram = cleanIg((formData.get("instagram") as string) || "");
  const waPhone = normalizePhone((formData.get("waPhone") as string) || "");
  if (!name) return { error: "Nama komunitas wajib diisi." };
  if (!instagram) return { error: "Username Instagram wajib diisi." };
  if (!waPhone) return { error: "Nomor WhatsApp tidak valid (contoh: 0812xxxx)." };

  const exists = await prisma.community.findUnique({ where: { instagram }, select: { id: true } });
  if (exists) return { error: `Komunitas dengan IG @${instagram} sudah terdaftar. Silakan login.` };

  let logo: string | null = null;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (!storageConfigured) return { error: "Upload logo belum bisa (storage belum dikonfigurasi)." };
    logo = await uploadFile(file, "communities");
  }

  // Password otomatis = instagram + 3 angka acak (dikirim via WA, hanya hash disimpan).
  const password = `${instagram}${Math.floor(100 + Math.random() * 900)}`;
  const community = await prisma.community.create({
    data: { name, instagram, waPhone, logo, passwordHash: hashPassword(password) },
  });

  createCommunitySession(community.id);
  await sendWa(
    waPhone,
    `🎾 *Pendaftaran Komunitas Tirtonic berhasil!*\n\nKomunitas: ${name}\nInstagram: @${instagram}\nWhatsApp: ${displayPhone(waPhone)}\n\n*Akses login:*\nUsername: ${instagram}\nPassword: ${password}\n\nSimpan baik-baik ya. Login di tirtonic.com/komunitas untuk klaim demo produk brand. 🚀`,
  );
  redirect("/komunitas");
}

export async function loginCommunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const instagram = cleanIg((formData.get("instagram") as string) || "");
  const password = (formData.get("password") as string) || "";
  if (!instagram || !password) return { error: "Username & password wajib diisi." };
  const c = await prisma.community.findUnique({ where: { instagram } });
  if (!c || !verifyHash(password, c.passwordHash)) return { error: "Username atau password salah." };
  createCommunitySession(c.id);
  redirect("/komunitas");
}

export async function logoutCommunity() {
  destroyCommunitySession();
  redirect("/komunitas");
}

// ──────────────── Klaim demo ────────────────

export async function claimDemo(_prev: FormState, formData: FormData): Promise<FormState> {
  const communityId = currentCommunityId();
  if (!communityId) return { error: "Sesi berakhir. Login ulang." };

  const campaignId = ((formData.get("campaignId") as string) || "").trim();
  const court = ((formData.get("court") as string) || "").trim();
  const quotaType = (formData.get("quotaType") as string) === "open" ? "open" : "closed";
  const quota = parseInt(((formData.get("quota") as string) || "").replace(/\D/g, ""), 10) || 0;
  const demoRaw = (formData.get("demoDate") as string) || "";
  const eventPicPhone = normalizePhone((formData.get("eventPicPhone") as string) || "");
  const time = ((formData.get("time") as string) || "").trim();

  const campaign = await prisma.demoCampaign.findUnique({ where: { id: campaignId }, select: { id: true, isActive: true } });
  if (!campaign || !campaign.isActive) return { error: "Kampanye demo tidak tersedia." };
  if (!court) return { error: "Lapangan tenis wajib diisi." };
  if (quota < 10) return { error: "Kuota peserta minimal 10 orang." };
  if (!demoRaw) return { error: "Tanggal demo wajib diisi." };
  const demoDate = new Date(demoRaw);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (demoDate < today) return { error: "Tanggal demo tidak boleh di masa lalu." };
  if (!eventPicPhone) return { error: "Nomor penanggung jawab acara tidak valid." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Jam sesi wajib diisi." };

  await prisma.demoClaim.create({
    data: { campaignId, communityId, court, quotaType, quota, demoDate, time, eventPicPhone, status: "pending" },
  });
  revalidatePath("/komunitas");
  revalidatePath("/dashboard/event");
  redirect("/komunitas");
}

// ──────────────── Peserta (acara open) ────────────────

/** Komunitas ACC / tolak peserta yang join acara open-nya. */
export async function decideParticipant(participantId: string, decision: "accepted" | "rejected") {
  const communityId = currentCommunityId();
  if (!communityId) return;
  // Pastikan peserta ini milik acara komunitas yang login.
  const p = await prisma.demoParticipant.findUnique({
    where: { id: participantId },
    include: { claim: { select: { communityId: true, eventPicPhone: true, campaign: { select: { brand: true } } } } },
  });
  if (!p || p.claim.communityId !== communityId) return;
  await prisma.demoParticipant.update({ where: { id: participantId }, data: { status: decision } });
  if (decision === "accepted") {
    await sendWa(p.phone, `🎾 Kamu DITERIMA ikut demo ${p.claim.campaign.brand} di Tirtonic! Sampai ketemu di lapangan ya. Info lebih lanjut akan dishare panitia.`);
  }
  revalidatePath("/komunitas");
}
