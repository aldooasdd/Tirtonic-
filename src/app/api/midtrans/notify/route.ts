import { verifyMidtransNotification, midtransConfigured, midtransPaid } from "@/lib/midtrans";
import { settleInvoice } from "@/lib/settle-payment";

export const dynamic = "force-dynamic";

// Webhook pembayaran Midtrans (Snap). Signature diverifikasi; hanya status lunas yang diproses.
// Midtrans menganggap sukses kalau dibalas HTTP 200.
export async function POST(req: Request) {
  if (!midtransConfigured) return Response.json({ ok: false, reason: "not_configured" });
  let n: Record<string, string> = {};
  try { n = (await req.json()) as Record<string, string>; } catch { return Response.json({ ok: false, reason: "bad_json" }, { status: 400 }); }
  if (!verifyMidtransNotification(n)) return Response.json({ ok: false, reason: "invalid_signature" }, { status: 401 });

  if (!midtransPaid(n.transaction_status ?? "", n.fraud_status)) return Response.json({ ok: true }); // pending/expire/cancel: abaikan
  await settleInvoice(n.order_id, { gateway: "Midtrans", metode: n.payment_type, ref: n.transaction_id, amount: Number(n.gross_amount) || undefined });
  return Response.json({ ok: true });
}
