"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWa } from "@/lib/wa";
import { verifyRewardToken } from "@/lib/pickup-token";

const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
const hashCode = (code: string) => crypto.createHmac("sha256", secret).update("rewardotp:" + code).digest("hex");
const eq = (a: string, b: string) => {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

// Item hadiah = teks prize dipisah " + ".
export const prizeItems = (prize: string) => prize.split(" + ").map((s) => s.trim()).filter(Boolean);

async function load(token: string) {
  const id = verifyRewardToken(token);
  if (!id) return null;
  const reward = await prisma.reward.findUnique({ where: { id } });
  return reward && !reward.redeemedAt ? reward : null;
}

/** Kirim OTP klaim ke WA pemenang. Throttle 1 menit. */
export async function requestRewardOtp(token: string): Promise<{ ok: boolean; error?: string }> {
  const reward = await load(token);
  if (!reward) return { ok: false, error: "Hadiah tidak valid atau sudah ditukar." };
  const now = Date.now();
  // Masih ada OTP dikirim <1 menit lalu (exp > now + 9 menit) → tahan.
  if (reward.claimOtpExp && reward.claimOtpExp.getTime() > now + 9 * 60_000) {
    return { ok: false, error: "Kode baru saja dikirim. Coba lagi sebentar." };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.reward.update({
    where: { id: reward.id },
    data: { claimOtpHash: hashCode(code), claimOtpExp: new Date(now + 10 * 60_000), claimOtpTries: 0 },
  });
  const ok = await sendWa(reward.phone, `Kode klaim hadiah Tirtonic kamu: ${code}\nBerlaku 10 menit. Jangan bagikan ke siapa pun.`);
  if (!ok) return { ok: false, error: "Gagal kirim WA. Coba lagi." };
  return { ok: true };
}

/** Verifikasi OTP. Sukses → izinkan pilih item. */
export async function verifyRewardOtp(token: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const reward = await load(token);
  if (!reward) return { ok: false, error: "Hadiah tidak valid atau sudah ditukar." };
  if (!reward.claimOtpHash || !reward.claimOtpExp || reward.claimOtpExp.getTime() < Date.now()) {
    return { ok: false, error: "Kode kadaluarsa. Minta kode baru." };
  }
  if (reward.claimOtpTries >= 5) return { ok: false, error: "Terlalu banyak percobaan. Minta kode baru." };
  if (!eq(hashCode((code || "").trim()), reward.claimOtpHash)) {
    await prisma.reward.update({ where: { id: reward.id }, data: { claimOtpTries: { increment: 1 } } });
    return { ok: false, error: "Kode salah." };
  }
  await prisma.reward.update({
    where: { id: reward.id },
    data: { claimVerified: new Date(), claimOtpHash: null, claimOtpExp: null, claimOtpTries: 0 },
  });
  return { ok: true };
}

/** Simpan item hadiah terpilih (butuh OTP terverifikasi <30 menit). */
export async function saveRewardItems(token: string, items: string[]): Promise<{ ok: boolean; error?: string }> {
  const reward = await load(token);
  if (!reward) return { ok: false, error: "Hadiah tidak valid atau sudah ditukar." };
  if (!reward.claimVerified || reward.claimVerified.getTime() < Date.now() - 30 * 60_000) {
    return { ok: false, error: "Verifikasi OTP dulu." };
  }
  const valid = prizeItems(reward.prize);
  const chosen = valid.filter((v) => items.includes(v));
  if (chosen.length === 0) return { ok: false, error: "Pilih minimal satu hadiah." };
  await prisma.reward.update({ where: { id: reward.id }, data: { claimItems: chosen.join(" + ") } });
  return { ok: true };
}
