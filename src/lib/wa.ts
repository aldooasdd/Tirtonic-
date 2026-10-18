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

// Sapaan sesuai jam (WIB): pagi ≤12:00, siang ≤15:00, sore ≤18:00, selebihnya malam.
export function salam(now = new Date()): string {
  const [h, m] = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour12: false }).split(":").map(Number);
  const t = h * 60 + m;
  if (t >= 5 * 60 && t <= 12 * 60) return "pagi";
  if (t > 12 * 60 && t <= 15 * 60) return "siang";
  if (t > 15 * 60 && t <= 18 * 60) return "sore";
  return "malam";
}

// Link papan antrian Stringing Room di landing (tanpa https biar ringkas di WA).
export function stringingRoomLink(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/^https?:\/\//, "") + "/#stringing-room";
}
