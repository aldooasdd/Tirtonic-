import "server-only";
import { createDokuPayment, checkDokuStatus } from "@/lib/doku";
import { createMidtransPayment, checkMidtransStatus, midtransConfigured, type PayOrder } from "@/lib/midtrans";

// Gerbang bayar: Midtrans kalau key-nya terisi, selain itu DOKU (cadangan).

/** URL halaman bayar, atau null (order tetap PENDING, bisa dikonfirmasi manual). */
export function createPayment(o: PayOrder): Promise<string | null> {
  return midtransConfigured ? createMidtransPayment(o) : createDokuPayment(o);
}

/** "SUCCESS" kalau invoice lunas. Cek Midtrans dulu, lalu DOKU (invoice lama yang dibuat sebelum pindah). */
export async function checkPaymentStatus(invoice: string): Promise<string | null> {
  const mt = await checkMidtransStatus(invoice);
  if (mt === "SUCCESS") return mt;
  return (await checkDokuStatus(invoice)) ?? mt;
}

export const paymentLabel = () => (midtransConfigured ? "Midtrans" : "DOKU");
