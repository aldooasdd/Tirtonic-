import { prisma } from "@/lib/prisma";
import { verifyDokuNotification, dokuConfigured } from "@/lib/doku";
import { markOrderPaid } from "@/lib/orders";
import { markPreorderDpPaid, markPreorderLunas } from "@/lib/preorder";

export const dynamic = "force-dynamic";

// Webhook pembayaran DOKU. DOKU mem-POST ke sini setelah pembayaran.
// Begitu DOKU dikonfigurasi (env terisi), notifikasi diverifikasi lalu order → LUNAS
// (stok dipotong + event dikirim ke n8n). Sebelum itu, endpoint tetap aman (no-op).
export async function POST(req: Request) {
  const raw = await req.text();
  console.log("DOKU notify RAW", { headers: Object.fromEntries(req.headers), body: raw.slice(0, 2000) });

  if (!dokuConfigured) {
    // Belum disetel — terima saja biar DOKU tidak retry terus.
    return Response.json({ ok: false, reason: "not_configured" });
  }
  if (!verifyDokuNotification(req.headers, raw, new URL(req.url).pathname)) {
    return Response.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  const order = (data.order ?? {}) as Record<string, unknown>;
  const transaction = (data.transaction ?? {}) as Record<string, unknown>;
  const service = (data.service ?? data.channel ?? {}) as Record<string, unknown>;

  const invoice = String(order.invoice_number ?? data.invoice_number ?? "");
  const status = String(transaction.status ?? data.status ?? "").toUpperCase();
  console.log("DOKU notify", { invoice, status });
  if (!invoice) return Response.json({ ok: false, reason: "no_invoice" }, { status: 400 });

  // Hanya proses pembayaran sukses; status lain diabaikan.
  if (status && status !== "SUCCESS" && status !== "PAID") {
    return Response.json({ ok: true, ignored: status });
  }

  const ref = String(transaction.original_request_id ?? transaction.id ?? "") || undefined;

  const found = await prisma.order.findUnique({ where: { invoice } });
  if (found) {
    await markOrderPaid(found.id, {
      metodeBayar: String(service.id ?? service.payment_method_type ?? "") || undefined,
      paymentRef: ref,
    });
    return Response.json({ ok: true });
  }

  // Pre-order: invoice bisa untuk DP (invoice) atau pelunasan (invoiceLunas).
  const poDp = await prisma.preorderOrder.findUnique({ where: { invoice }, select: { id: true } });
  if (poDp) { await markPreorderDpPaid(poDp.id, ref); return Response.json({ ok: true }); }
  const poLunas = await prisma.preorderOrder.findUnique({ where: { invoiceLunas: invoice }, select: { id: true } });
  if (poLunas) { await markPreorderLunas(invoice, ref); return Response.json({ ok: true }); }

  console.warn("DOKU notify: invoice tidak cocok order apa pun", { invoice });
  return Response.json({ ok: true });
}
