import "server-only";
import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/lib/orders";
import { markPreorderDpPaid, markPreorderLunas } from "@/lib/preorder";
import { sendWa } from "@/lib/wa";

const ADMIN_WA = "6285163215511"; // sama dgn nomor admin di lib/format.ts

/** Invoice lunas (dari notifikasi gerbang bayar) → pesanan toko / DP / pelunasan PO jadi lunas.
 *  Invoice tak dikenal → kabari admin (jangan diam-diam hilang). */
export async function settleInvoice(invoice: string, info: { gateway: string; metode?: string; ref?: string; amount?: number }): Promise<void> {
  const found = await prisma.order.findUnique({ where: { invoice } });
  if (found) {
    await markOrderPaid(found.id, { metodeBayar: info.metode || undefined, paymentRef: info.ref });
    return;
  }
  // Pre-order: invoice bisa untuk DP (invoice) atau pelunasan (invoiceLunas).
  const poDp = await prisma.preorderOrder.findUnique({ where: { invoice }, select: { id: true } });
  if (poDp) return void (await markPreorderDpPaid(poDp.id, info.ref));
  const poLunas = await prisma.preorderOrder.findUnique({ where: { invoiceLunas: invoice }, select: { id: true } });
  if (poLunas) return void (await markPreorderLunas(invoice, info.ref));

  console.error(`${info.gateway} notify: invoice tidak ditemukan`, invoice);
  await sendWa(ADMIN_WA, `⚠️ Pembayaran ${info.gateway} LUNAS tapi pesanan tidak ada di web.\nInvoice: ${invoice}${info.amount ? `\nNominal: Rp ${info.amount.toLocaleString("id-ID")}` : ""}\nCek dashboard ${info.gateway} & hubungi customer.`).catch(() => false);
}
