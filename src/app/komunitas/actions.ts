"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyHash } from "@/lib/role-password";
import { createCommunitySession, destroyCommunitySession, currentCommunityId } from "@/lib/community-auth";
import { normalizePhone } from "@/lib/string-finder/phone";
import { uploadFile, storageConfigured } from "@/lib/storage";
import { sendWa } from "@/lib/wa";

export type FormState = { error?: string; ok?: boolean };

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

  // Akun baru harus di-ACC admin dulu. Password dibuat & dikirim saat admin meng-ACC.
  await prisma.community.create({
    data: { name, instagram, waPhone, logo, status: "pending" },
  });
  revalidatePath("/dashboard/event");
  await sendWa(
    waPhone,
    `🎾 *Pendaftaran Komunitas Tirtonic diterima!*\n\nKomunitas: ${name}\nInstagram: @${instagram}\n\nAkun kamu sedang *ditinjau admin Tirtonic*. Password untuk login akan dikirim ke WhatsApp ini begitu disetujui. 🙏`,
  );
  return { ok: true };
}

export async function loginCommunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = (formData.get("password") as string) || "";
  if (!password) return { error: "Password wajib diisi." };
  // Password = instagram+3digit (unik per komunitas). Cocokkan ke semua komunitas.
  // ponytail: O(n) scan — aman selama komunitas sedikit; pakai index kalau sudah ribuan.
  const communities = await prisma.community.findMany({ where: { status: "accepted" } });
  const c = communities.find((x) => x.passwordHash && verifyHash(password, x.passwordHash));
  if (!c) return { error: "Password salah, atau akun belum disetujui admin." };
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
  const timeEnd = ((formData.get("timeEnd") as string) || "").trim();

  const campaign = await prisma.demoCampaign.findUnique({ where: { id: campaignId }, select: { id: true, isActive: true, startDate: true, endDate: true } });
  if (!campaign || !campaign.isActive) return { error: "Kampanye demo tidak tersedia." };
  if (!campaign.startDate || !campaign.endDate) return { error: "Kampanye belum siap diklaim (periode belum ditentukan)." };
  if (!court) return { error: "Lapangan tenis wajib diisi." };
  if (quota < 10) return { error: "Kuota peserta minimal 10 orang." };
  if (!demoRaw) return { error: "Tanggal demo wajib diisi." };
  if (!/^\d{2}:\d{2}$/.test(time) || !/^\d{2}:\d{2}$/.test(timeEnd)) return { error: "Jam mulai & selesai wajib diisi." };
  if (timeEnd <= time) return { error: "Jam selesai harus setelah jam mulai." };
  if (!eventPicPhone) return { error: "Nomor penanggung jawab acara tidak valid." };

  // Tanggal wajib dalam periode kampanye (dan tidak di masa lalu).
  const demoDate = new Date(demoRaw);
  const todayStr = new Date().toISOString().slice(0, 10);
  const startStr = campaign.startDate.toISOString().slice(0, 10);
  const endStr = campaign.endDate.toISOString().slice(0, 10);
  if (demoRaw < todayStr) return { error: "Tanggal demo tidak boleh di masa lalu." };
  if (demoRaw < startStr || demoRaw > endStr) {
    const fmt = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    return { error: `Tanggal harus dalam periode demo: ${fmt(startStr)} – ${fmt(endStr)}.` };
  }

  // Anti double-booking: satu campaign + tanggal sama, rentang jam tidak boleh tumpang-tindih dgn booking lain (pending/accepted).
  // Overlap: mulaiBaru < selesaiLama && mulaiLama < selesaiBaru. ponytail: cek di app, race kembar nyaris mustahil di form manual.
  const sameDay = await prisma.demoClaim.findMany({
    where: { campaignId, demoDate, status: { not: "rejected" } },
    select: { time: true, timeEnd: true },
  });
  const bentrok = sameDay.find((b) => time < (b.timeEnd || "99:99") && (b.time || "") < timeEnd);
  if (bentrok) return { error: `Jam ${bentrok.time}–${bentrok.timeEnd} di tanggal itu sudah dibooking komunitas lain. Pilih jam/tanggal lain.` };

  await prisma.demoClaim.create({
    data: { campaignId, communityId, court, quotaType, quota, demoDate, time, timeEnd, eventPicPhone, status: "pending" },
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
