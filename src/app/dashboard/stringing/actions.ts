"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSection, sessionBranchId, currentRole } from "@/lib/auth";
import { sendWa, salam, stringingRoomLink } from "@/lib/wa";
import { normalizePhone } from "@/lib/string-finder/phone";
import { verifyRewardToken } from "@/lib/pickup-token";

const requireAuth = () => requireSection("stringing");

// Stringer per cabang cuma boleh aksi order cabangnya. Bos/admin (branchId null) bebas.
async function assertBranch(id: string) {
  const bid = sessionBranchId();
  if (!bid) return;
  const o = await prisma.sfOrder.findUnique({ where: { id }, select: { branchId: true } });
  if (o?.branchId !== bid) throw new Error("Unauthorized");
}

export async function startStringing(id: string, formData: FormData) {
  requireAuth();
  await assertBranch(id);
  const stringerName = String(formData.get("stringer") ?? "").trim();
  if (!stringerName) return; // nama stringer wajib (input juga sudah `required` di UI)
  // Hanya dari "antri" — klik dobel / request kedua tidak kirim WA lagi.
  const { count } = await prisma.sfOrder.updateMany({
    where: { id, status: "antri" },
    data: { status: "dikerjakan", startedAt: new Date(), stringerName },
  });
  if (!count) return;
  const order = await prisma.sfOrder.findUniqueOrThrow({ where: { id }, include: { branch: true } });
  // WA "senar mulai dikerjakan" + nama stringer.
  await sendWa(
    order.phone,
    `Selamat ${salam()}, kak ${order.customerName ?? ""}`.trimEnd() + `

Raket Anda dengan kode pesanan *${order.resultCode}* saat ini sedang dikerjakan oleh stringer kami, ${stringerName}.

Progres dapat dipantau di ${stringingRoomLink()}. Kami akan segera mengabari Anda setelah raket siap diambil.

Salam hangat,
${order.branch.name} 🎾`,
  );
  revalidatePath("/dashboard/stringing");
}

export async function finishStringing(id: string) {
  requireAuth();
  await assertBranch(id);
  // Hanya dari "dikerjakan" — klik dobel tidak kirim WA lagi.
  const { count } = await prisma.sfOrder.updateMany({
    where: { id, status: "dikerjakan" },
    data: { status: "selesai", finishedAt: new Date() },
  });
  if (!count) return;
  const order = await prisma.sfOrder.findUniqueOrThrow({ where: { id }, include: { branch: true } });
  // WA "senar siap diambil" ke customer. Kegagalan WA tak membatalkan penyelesaian.
  const ok = await sendWa(
    order.phone,
    `Selamat ${salam()}, kak ${order.customerName ?? ""}`.trimEnd() + `

Raket Anda dengan kode pesanan *${order.resultCode}* telah selesai dipasang dan siap diambil di ${order.branch.name}.

Silakan tunjukkan kode pesanan saat pengambilan. Kami buka setiap hari pukul 09.00 – 21.00.

Terima kasih telah mempercayakan raket Anda kepada Tirtonic. Selamat bermain!

Salam hangat,
${order.branch.name} 🎾`,
  );
  if (ok) await prisma.sfOrder.update({ where: { id }, data: { notifiedDone: new Date() } });
  revalidatePath("/dashboard/stringing");
}

// Edit detail pesanan (senar, tarikan, raket, nama, WA). Tarikan selalu disimpan lbs.
export async function updateStringing(id: string, formData: FormData) {
  requireAuth();
  await assertBranch(id);
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const tens = (k: string) => {
    const n = Number(str(k));
    return Number.isFinite(n) && n >= 30 && n <= 75 ? Math.round(n) : null;
  };
  const phone = normalizePhone(str("phone"));
  if (!phone) return; // nomor wajib valid (input juga `required`)
  await prisma.sfOrder.update({
    where: { id },
    data: {
      chosenString: str("chosenString") || null,
      tensionLbs: tens("tensionLbs"),
      tensionCrossLbs: tens("tensionCrossLbs"),
      racket: str("racket") || null,
      customerName: str("customerName") || null,
      phone,
    },
  });
  revalidatePath("/dashboard/stringing");
  redirect("/dashboard/stringing");
}

export async function cancelStringing(id: string) {
  requireAuth();
  await assertBranch(id);
  await prisma.sfOrder.update({ where: { id }, data: { status: "batal" } });
  revalidatePath("/dashboard/stringing");
}

export async function deleteStringingOrder(id: string) {
  requireAuth();
  await assertBranch(id);
  await prisma.sfOrder.delete({ where: { id } });
  revalidatePath("/dashboard/stringing");
}

/** Tukar hadiah leaderboard. Token QR dari dashboard customer, di-scan stringer.
 *  Idempoten: sekali tukar (redeemedAt). Halaman re-render baca redeemedAt. */
export async function redeemReward(token: string): Promise<void> {
  requireAuth();
  const id = verifyRewardToken(token);
  if (!id) return;
  const r = await prisma.reward.findUnique({ where: { id } });
  if (!r || r.redeemedAt) return; // sudah ditukar / tak dikenal → no-op
  const by = currentRole()?.label ?? "Stringer";
  await prisma.reward.update({ where: { id }, data: { redeemedAt: new Date(), redeemedBy: by } });
  revalidatePath(`/dashboard/stringing/reward/${token}`);
}
