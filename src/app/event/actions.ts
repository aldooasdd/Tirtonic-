"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { phaseOf } from "@/lib/event-phase";
import { sendWa } from "@/lib/wa";

export type JoinState = { error?: string; ok?: boolean };

/** Orang umum join acara demo "open" dari web. Perlu di-ACC komunitas penyelenggara. */
export async function joinEvent(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const claimId = ((formData.get("claimId") as string) || "").trim();
  const name = ((formData.get("name") as string) || "").trim();
  const phone = normalizePhone((formData.get("phone") as string) || "");
  const sessionIndex = parseInt((formData.get("sessionIndex") as string) || "", 10);
  if (!name) return { error: "Nama wajib diisi." };
  if (!phone) return { error: "Nomor WhatsApp tidak valid (contoh: 0812xxxx)." };

  const claim = await prisma.demoClaim.findUnique({
    where: { id: claimId },
    include: {
      community: { select: { name: true, waPhone: true } },
      campaign: { select: { brand: true } },
      participants: { select: { status: true, phone: true, sessionIndex: true } },
    },
  });
  if (!claim) return { error: "Acara tidak ditemukan." };
  if (claim.quotaType !== "open") return { error: "Acara ini kuotanya tertutup, tidak menerima pendaftaran online." };
  if (!Number.isInteger(sessionIndex) || sessionIndex < 0 || sessionIndex >= claim.sessions.length) return { error: "Pilih sesi waktu dulu." };
  const phase = phaseOf(claim);
  if (phase !== "coming_soon" && phase !== "ongoing") return { error: "Pendaftaran acara ini sudah ditutup." };
  if (claim.participants.some((p) => p.phone === phone && p.status !== "rejected")) return { error: "Nomor ini sudah terdaftar di acara ini." };
  const acceptedInSession = claim.participants.filter((p) => p.sessionIndex === sessionIndex && p.status === "accepted").length;
  if (acceptedInSession >= claim.quota) return { error: "Kuota sesi ini sudah penuh, pilih sesi lain." };

  await prisma.demoParticipant.create({ data: { claimId, name, phone, sessionIndex, status: "pending" } });
  await sendWa(
    claim.community.waPhone,
    `🔔 Ada peserta baru mau join demo ${claim.campaign.brand}!\n\nNama: ${name}\nWA: ${phone}\nSesi: ${claim.sessions[sessionIndex]}\n\nTerima/tolak di dashboard komunitas: tirtonic.com/komunitas`,
  );
  revalidatePath(`/event/${claimId}`);
  revalidatePath("/komunitas");
  return { ok: true };
}
