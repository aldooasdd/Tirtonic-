"use server";

import { redirect } from "next/navigation";
import { paymentLinkFor } from "@/lib/orders";

/** Lanjutkan pembayaran dari halaman pesanan. */
export async function payOrder(orderId: string) {
  const url = await paymentLinkFor(orderId).catch((e) => { console.error("payOrder gagal:", e); return null; });
  redirect(url ?? `/order/${orderId}?bayar=gagal`);
}
