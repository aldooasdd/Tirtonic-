"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchAcePoints } from "@/lib/tirtonichub-points";
import { normalizePhone } from "@/lib/string-finder/phone";
import { redeemToken, verifyRedeemToken } from "@/lib/pickup-token";
import { requireSection, currentRole } from "@/lib/auth";

const ACE_VALUE = 1000; // 1 Ace = Rp1.000
const MIN_REDEEM = 50; // minimal tukar (dokumen Member Card)

// Pembeli generate penukaran poin → QR untuk kasir. Poin belum dipotong (status pending).
export async function createRedemption(
  phoneRaw: string,
  points: number,
  kind: "kasir" | "stringing",
  note?: string,
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const phone = normalizePhone(phoneRaw || "");
  if (!phone) return { ok: false, error: "Nomor tidak valid." };
  const p = Math.floor(points);
  if (!Number.isFinite(p) || p < MIN_REDEEM) return { ok: false, error: `Minimal tukar ${MIN_REDEEM} poin.` };
  const ace = await fetchAcePoints(phone);
  if (p > ace.balance) return { ok: false, error: "Poin tidak cukup." };
  const r = await prisma.pointRedemption.create({ data: { phone, points: p, rupiah: p * ACE_VALUE, kind, note: note || null } });
  revalidatePath(`/riwayat/${phone}/tukar`);
  revalidatePath(`/riwayat/${phone}`);
  return { ok: true, token: redeemToken(r.id) };
}

// Kasir scan QR → konfirmasi. Baru di sini poin dipotong (status used).
export async function confirmRedemption(token: string) {
  requireSection("stringing");
  const id = verifyRedeemToken(token);
  if (!id) throw new Error("Token tidak valid.");
  const r = await prisma.pointRedemption.findUnique({ where: { id } });
  if (!r) throw new Error("Penukaran tidak ditemukan.");
  if (r.status === "used") return; // idempoten
  const ace = await fetchAcePoints(r.phone);
  if (r.points > ace.balance) throw new Error("Poin pelanggan tidak cukup.");
  await prisma.pointRedemption.update({ where: { id }, data: { status: "used", usedAt: new Date(), usedBy: currentRole()?.label ?? null } });
  revalidatePath(`/dashboard/stringing/redeem/${token}`);
}
