import "server-only";
import crypto from "crypto";

// Midtrans Snap (hosted payment page): pembeli diarahkan ke halaman bayar Midtrans,
// data kartu TIDAK pernah menyentuh web ini. Env kosong → midtransConfigured false → pakai DOKU.
// Env: MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY (belum dipakai: Snap redirect tak butuh), MIDTRANS_IS_PRODUCTION=true.

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const PROD = process.env.MIDTRANS_IS_PRODUCTION === "true";
const SNAP_URL = PROD ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";
const API_URL = PROD ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "").replace("://tirtonic.com", "://www.tirtonic.com");
// Domain kanonik (www): apex ke-redirect 308, notifikasi POST server-to-server bisa hilang.
const NOTIFY_URL = `${SITE_URL}/api/midtrans/notify`;

export const midtransConfigured = Boolean(SERVER_KEY);
const auth = () => "Basic " + Buffer.from(SERVER_KEY + ":").toString("base64");

export type PayOrder = {
  invoice: string;
  total: number;
  nama: string;
  email: string;
  telepon: string;
  id: string;
  callbackPath?: string; // halaman setelah bayar (default /order/{id})
  dueMinutes?: number; // batas bayar (menit); default 60
};

/** Buat transaksi Snap → URL halaman bayar. null kalau belum dikonfigurasi / gagal. */
export async function createMidtransPayment(o: PayOrder): Promise<string | null> {
  if (!midtransConfigured) return null;
  const body = {
    transaction_details: { order_id: o.invoice, gross_amount: Math.round(o.total) },
    customer_details: { first_name: o.nama.slice(0, 50), ...(o.email ? { email: o.email } : {}), phone: o.telepon.replace(/\D/g, "") },
    callbacks: { finish: `${SITE_URL}${o.callbackPath ?? `/order/${o.id}`}` },
    expiry: { unit: "minutes", duration: o.dueMinutes ?? 60 },
  };
  try {
    const res = await fetch(SNAP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: auth(), "X-Override-Notification": NOTIFY_URL },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as { redirect_url?: string; error_messages?: string[] };
    if (!data.redirect_url) console.error("Midtrans: tidak ada redirect_url", res.status, data.error_messages ?? data);
    return data.redirect_url ?? null;
  } catch (e) {
    console.error("createMidtransPayment gagal:", e);
    return null;
  }
}

/** Lunas menurut Midtrans? settlement, atau capture kartu yang lolos fraud check. */
export const midtransPaid = (status: string, fraud?: string | null) =>
  status === "settlement" || (status === "capture" && (!fraud || fraud === "accept"));

/** Cek status transaksi langsung (cadangan kalau notifikasi telat). "SUCCESS" kalau lunas, selain itu status asli / null. */
export async function checkMidtransStatus(invoice: string): Promise<string | null> {
  if (!midtransConfigured || !invoice) return null;
  try {
    const res = await fetch(`${API_URL}/v2/${encodeURIComponent(invoice)}/status`, {
      headers: { Accept: "application/json", Authorization: auth() },
      signal: AbortSignal.timeout(8000),
    });
    const d = (await res.json()) as { transaction_status?: string; fraud_status?: string; status_code?: string };
    if (d.status_code === "404") return "NOT_FOUND"; // pembeli belum pernah memilih metode bayar (atau invoice DOKU)
    if (!d.transaction_status) return null; // jawaban tak dikenal / key ditolak → anggap cek gagal
    return midtransPaid(d.transaction_status, d.fraud_status) ? "SUCCESS" : d.transaction_status.toUpperCase();
  } catch (e) {
    console.error("checkMidtransStatus gagal:", e);
    return null;
  }
}

/** Verifikasi notifikasi: signature_key = SHA512(order_id + status_code + gross_amount + server_key). */
export function verifyMidtransNotification(n: { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string }): boolean {
  if (!midtransConfigured || !n.order_id || !n.signature_key) return false;
  const expected = crypto.createHash("sha512").update(`${n.order_id}${n.status_code ?? ""}${n.gross_amount ?? ""}${SERVER_KEY}`).digest("hex");
  return expected.length === n.signature_key.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(n.signature_key));
}
