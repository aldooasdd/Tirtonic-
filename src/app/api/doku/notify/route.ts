import { verifyDokuNotification, dokuConfigured } from "@/lib/doku";
import { settleInvoice } from "@/lib/settle-payment";

export const dynamic = "force-dynamic";

// Ack yang DOKU harapkan (200 + body ini) supaya notifikasi dianggap sukses.
const ACK = { responseCode: "2000000", responseMessage: "Successful" };

// Webhook pembayaran DOKU. DOKU mem-POST ke sini setelah pembayaran.
// Begitu DOKU dikonfigurasi (env terisi), notifikasi diverifikasi lalu order → LUNAS
// (stok dipotong + event dikirim ke n8n). Sebelum itu, endpoint tetap aman (no-op).
export async function POST(req: Request) {
  const raw = await req.text();

  // Parse awal (buat log) — tak memengaruhi verifikasi yang pakai raw.
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(raw) as Record<string, unknown>; } catch { /* body non-JSON */ }
  const order = (data.order ?? {}) as Record<string, unknown>;
  const transaction = (data.transaction ?? {}) as Record<string, unknown>;
  const service = (data.service ?? data.channel ?? {}) as Record<string, unknown>;
  const invoice = String(order.invoice_number ?? data.invoice_number ?? "");
  const status = String(transaction.status ?? data.status ?? "").toUpperCase();
  if (!dokuConfigured) return Response.json({ ok: false, reason: "not_configured" });
  if (!verifyDokuNotification(req.headers, raw, new URL(req.url).pathname)) {
    return Response.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
  }
  if (!invoice) return Response.json({ ok: false, reason: "no_invoice" }, { status: 400 });

  // Hanya proses pembayaran sukses; status lain diabaikan.
  if (status && status !== "SUCCESS" && status !== "PAID") {
    return Response.json(ACK);
  }

  const ref = String(transaction.original_request_id ?? transaction.id ?? "") || undefined;
  await settleInvoice(invoice, { gateway: "DOKU", metode: String(service.id ?? service.payment_method_type ?? ""), ref, amount: Number(order.amount ?? 0) });
  return Response.json(ACK);
}
