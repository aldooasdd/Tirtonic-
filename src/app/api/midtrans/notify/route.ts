import { verifyMidtransNotification, midtransConfigured, midtransPaid, checkMidtransStatus } from "@/lib/midtrans";
import { settleInvoice } from "@/lib/settle-payment";

export const dynamic = "force-dynamic";

// Webhook pembayaran Midtrans (Snap). Selalu balas 200 (Midtrans menganggap non-2xx = gagal & tes URL gagal).
// Signature cocok → percaya payload. Tidak cocok (mis. key berizin terbatas tak dipakai menandatangani,
// atau notifikasi tes) → JANGAN percaya payload; tanya status langsung ke API Midtrans pakai Server Key kita.
export async function POST(req: Request) {
  if (!midtransConfigured) return Response.json({ ok: false, reason: "not_configured" });
  let n: Record<string, string> = {};
  try { n = (await req.json()) as Record<string, string>; } catch { return Response.json({ ok: false, reason: "bad_json" }); }
  if (!n.order_id) return Response.json({ ok: false, reason: "no_order_id" });

  const signed = verifyMidtransNotification(n);
  const st = signed ? null : await checkMidtransStatus(n.order_id);
  const paid = signed ? midtransPaid(n.transaction_status ?? "", n.fraud_status) : st === "SUCCESS";
  if (!signed) console.log("midtrans notify (cek API)", n.order_id, st);
  if (!paid) return Response.json({ ok: true, st: st === null ? "unknown" : "checked" }); // pending/expire/cancel/tes: abaikan

  await settleInvoice(n.order_id, { gateway: "Midtrans", metode: n.payment_type, ref: n.transaction_id, amount: Number(n.gross_amount) || undefined });
  return Response.json({ ok: true });
}
