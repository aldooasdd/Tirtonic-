import "server-only";

// Kirim pesan WA bebas lewat n8n (event "pesan" → node WAHA kirim `message` apa adanya).
// Kalau N8N_WEBHOOK belum diset → diam saja (aksi utama tetap jalan tanpa WA).
export async function sendWa(phone: string, message: string): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "pesan", phone, message }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
