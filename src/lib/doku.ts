import "server-only";
import crypto from "crypto";

// Integrasi DOKU Checkout (hosted payment page). Pembeli diarahkan ke halaman
// bayar DOKU, jadi data kartu TIDAK pernah menyentuh web ini.
//
// Belum punya akun DOKU? Biarkan env kosong → createDokuPayment() mengembalikan
// null, dan order tetap PENDING (bisa dikonfirmasi manual admin). Begitu env diisi,
// alur bayar otomatis aktif tanpa ubah kode.
//
// Env: DOKU_CLIENT_ID, DOKU_SECRET_KEY, DOKU_BASE_URL (default sandbox).

const CLIENT_ID = process.env.DOKU_CLIENT_ID || "";
const SECRET_KEY = process.env.DOKU_SECRET_KEY || "";
const BASE_URL = (process.env.DOKU_BASE_URL || "https://api-sandbox.doku.com").replace(/\/$/, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");
// URL notifikasi harus domain kanonik (www) — apex tirtonic.com ke-redirect 308,
// DOKU tak mengikuti redirect pada POST server-to-server → notifikasi hilang.
const NOTIFY_URL = SITE_URL.replace("://tirtonic.com", "://www.tirtonic.com") + "/api/doku/notify";

export const dokuConfigured = Boolean(CLIENT_ID && SECRET_KEY);

const PATH = "/checkout/v1/payment";

function sha256Base64(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("base64");
}
function hmacBase64(s: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(s, "utf8").digest("base64");
}

/** Signature DOKU = HMACSHA256=base64(hmac(secret, stringToSign)). */
function signature(requestId: string, timestamp: string, target: string, rawBody: string): string {
  const digest = sha256Base64(rawBody);
  const stringToSign =
    `Client-Id:${CLIENT_ID}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${target}\n` +
    `Digest:${digest}`;
  return `HMACSHA256=${hmacBase64(stringToSign)}`;
}

type DokuOrder = {
  invoice: string;
  total: number;
  nama: string;
  email: string;
  telepon: string;
  id: string;
  callbackPath?: string; // halaman tujuan setelah bayar (default /order/{id}); PO pakai /preorder/order/{id}
  dueMinutes?: number; // batas bayar (menit); default 60
};

/** Buat pembayaran di DOKU → kembalikan URL halaman bayar untuk redirect.
 *  null kalau DOKU belum dikonfigurasi atau gagal (order tetap bisa dibayar manual). */
export async function createDokuPayment(order: DokuOrder): Promise<string | null> {
  if (!dokuConfigured) return null;

  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().split(".")[0] + "Z";
  const callback = order.callbackPath ?? `/order/${order.id}`;
  const body = JSON.stringify({
    order: {
      amount: order.total,
      invoice_number: order.invoice,
      currency: "IDR",
      callback_url: `${SITE_URL}${callback}`,
    },
    payment: { payment_due_date: order.dueMinutes ?? 60 },
    customer: { name: order.nama, email: order.email, phone: order.telepon.replace(/\D/g, "") },
    // Paksa HTTP notification ke endpoint kita (gak tergantung setelan per-channel di dashboard DOKU).
    additional_info: { override_notification_url: NOTIFY_URL },
  });

  try {
    const res = await fetch(`${BASE_URL}${PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Id": CLIENT_ID,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: signature(requestId, timestamp, PATH, body),
      },
      body,
    });
    const data = await res.json();
    // ponytail: shape bisa beda tergantung produk DOKU yang dipilih; ambil url bayar yang ada.
    const url = data?.response?.payment?.url || data?.payment?.url || null;
    if (!url) console.error("DOKU: tidak ada payment url di respons:", data);
    return url;
  } catch (e) {
    console.error("createDokuPayment gagal:", e);
    return null;
  }
}

/** Cek status transaksi langsung ke DOKU (tanpa webhook). Return status uppercase | null.
 *  Dipakai halaman order saat customer balik dari DOKU — reliable walau notifikasi tak masuk. */
export async function checkDokuStatus(invoice: string): Promise<string | null> {
  if (!dokuConfigured || !invoice) return null;
  const path = `/orders/v1/status/${invoice}`;
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().split(".")[0] + "Z";
  // GET tanpa body → stringToSign tanpa baris Digest.
  const stringToSign =
    `Client-Id:${CLIENT_ID}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${path}`;
  const sig = `HMACSHA256=${hmacBase64(stringToSign)}`;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Client-Id": CLIENT_ID, "Request-Id": requestId, "Request-Timestamp": timestamp, Signature: sig },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    const status = (data as Record<string, unknown>)?.transaction && typeof (data as { transaction?: { status?: unknown } }).transaction?.status !== "undefined"
      ? (data as { transaction: { status: unknown } }).transaction.status
      : (data as { status?: unknown }).status ?? null;
    if (!status) console.error("checkDokuStatus: status kosong", data);
    return status ? String(status).toUpperCase() : null;
  } catch (e) {
    console.error("checkDokuStatus gagal:", e);
    return null;
  }
}

/** Verifikasi signature notifikasi (webhook) dari DOKU. */
export function verifyDokuNotification(headers: Headers, rawBody: string, requestPath?: string): boolean {
  if (!dokuConfigured) return false;
  const requestId = headers.get("Request-Id") || "";
  const timestamp = headers.get("Request-Timestamp") || "";
  // DOKU menandatangani dgn Request-Target = path endpoint notifikasi. Pakai path
  // request asli (anti-salah kalau di belakang redirect/domain), fallback ke header.
  const target = headers.get("Request-Target") || requestPath || "/api/doku/notify";
  const got = headers.get("Signature") || "";
  const expected = signature(requestId, timestamp, target, rawBody);
  const ok = got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  if (!ok) console.error("DOKU notify signature mismatch", { target, requestId, timestamp, got, expected, baseUrl: BASE_URL });
  return ok;
}
