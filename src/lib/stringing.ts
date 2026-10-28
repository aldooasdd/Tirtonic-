import { prisma } from "@/lib/prisma";
import { sendWa, salam } from "@/lib/wa";

export type CompleteResult = { ok: boolean; resultCode?: string; reason?: string };

/** Inti "tandai selesai stringing": set status selesai + kirim WA siap-ambil.
 *  Dipakai tombol dashboard (finishStringing) & endpoint scan (Tirtonichub). Tanpa auth. */
export async function completeStringing(
  id: string,
  opts: { stringerName?: string | null; onlyIfStarted?: boolean } = {},
): Promise<CompleteResult> {
  const order = await prisma.sfOrder.findUnique({ where: { id }, include: { branch: true } });
  if (!order) return { ok: false, reason: "not_found" };
  if (order.status === "selesai" || order.status === "batal") return { ok: false, reason: "already_done", resultCode: order.resultCode };
  if (opts.onlyIfStarted && order.status !== "dikerjakan") return { ok: false, reason: "not_started", resultCode: order.resultCode };

  const now = new Date();
  await prisma.sfOrder.update({
    where: { id },
    data: {
      status: "selesai",
      finishedAt: now,
      startedAt: order.startedAt ?? now, // scan bisa langsung selesai walau belum di-"Mulai"
      ...(order.stringerName ? {} : opts.stringerName ? { stringerName: opts.stringerName } : {}),
    },
  });

  // WA "senar siap diambil". Kegagalan WA tak membatalkan penyelesaian.
  const ok = await sendWa(
    order.phone,
    `Selamat ${salam()}, kak ${order.customerName ?? ""}`.trimEnd() + `

Raket Anda dengan kode pesanan *${order.resultCode}* telah selesai dipasang dan siap diambil di ${order.branch.name}.

Silakan tunjukkan kode pesanan saat pengambilan. Kami buka setiap hari pukul 09.00 – 21.00.

Terima kasih telah mempercayakan raket Anda kepada Tirtonic. Selamat bermain!

Salam hangat,
${order.branch.name} 🎾`,
  );
  if (ok) await prisma.sfOrder.update({ where: { id }, data: { notifiedDone: now } });
  return { ok: true, resultCode: order.resultCode };
}
