import "server-only";

/**
 * Kirim event ke n8n (yang meneruskan ke WhatsApp). Opsional: kalau N8N_WEBHOOK belum diset,
 * fungsi ini diam saja tanpa error — jadi antrian stringing tetap jalan tanpa WA.
 * Kegagalan jaringan tidak boleh menggagalkan aksi utama (buat pesanan / tandai selesai).
 */
export type NotifyEvent = "pesanan_masuk" | "selesai";

export interface NotifyPayload {
  event: NotifyEvent;
  phone: string; // 62xxxx
  code: string; // kode resep
  branch: string;
  chosenString?: string | null;
  etaMinutes?: number;
  customerName?: string | null;
}

export async function notify(payload: NotifyPayload): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK;
  if (!url) return false; // belum dikonfigurasi — lewati
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // jangan menggantung request utama terlalu lama
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
