import { prisma } from "@/lib/prisma";
import { sendWa, salam } from "@/lib/wa";

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");

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

  // Kirim WA dulu — baru tandai selesai kalau WA sukses kekirim.
  const msg =
    `Selamat ${salam()}, kak ${order.customerName ?? ""}`.trimEnd() + `

Raket Anda dengan kode pesanan *${order.resultCode}* telah selesai dipasang dan siap diambil di ${order.branch.name}.

Silakan tunjukkan kode pesanan saat pengambilan. Kami buka setiap hari pukul 09.00 – 21.00.

Riwayat stringing Anda, termasuk jenis senar dan tension yang dipakai, dapat dilihat kapan saja melalui:
${siteUrl()}/riwayat/${order.phone}

Atau masuk di tirtonic.com menggunakan nomor WhatsApp Anda.

Terima kasih telah mempercayakan raket Anda kepada Tirtonic. Selamat bermain!

Salam hangat,
${order.branch.name} 🎾`;
  const sent = await sendWa(order.phone, msg);
  if (!sent) return { ok: false, reason: "wa_failed", resultCode: order.resultCode };

  const now = new Date();
  await prisma.sfOrder.update({
    where: { id },
    data: {
      status: "selesai",
      finishedAt: now,
      startedAt: order.startedAt ?? now, // scan bisa langsung selesai walau belum di-"Mulai"
      notifiedDone: now,
      ...(order.stringerName ? {} : opts.stringerName ? { stringerName: opts.stringerName } : {}),
    },
  });
  return { ok: true, resultCode: order.resultCode };
}
