import "server-only";

// Lacak resi via Binderbyte (https://api.binderbyte.com/v1/track).
// Dipakai untuk kiriman yang DIBOOKING MANUAL di kurir (resi diisi admin).
// Hanya JNE / J&T / Lion yang punya API. Paxel tidak ada di Binderbyte → null,
// UI arahkan ke situs Paxel. Belum set BINDERBYTE_API_KEY → null (no-op aman).
//
// ponytail: struktur respons (data.summary/history) dari dokumentasi Binderbyte;
// kalau field berubah, sesuaikan di parseTrack(). Bisa dicek via /api/track.

const API_KEY = process.env.BINDERBYTE_API_KEY || "";

export type TrackStep = { date: string; desc: string };
export type TrackResult = {
  status: string; // status ringkas, mis. "DELIVERED" / "ON PROCESS"
  courier: string; // kode kurir
  history: TrackStep[]; // urut lama → baru (atau sebaliknya, apa adanya dari API)
};

// Label kurir bebas (diketik admin saat kirim) → kode Binderbyte.
// null = tidak didukung API (mis. Paxel) → UI pakai link situs kurir.
export function courierCode(label: string | null | undefined): string | null {
  const s = (label || "").toLowerCase();
  if (/jne/.test(s)) return "jne";
  if (/j&t|jnt|j-t|j t\b/.test(s)) return "jnt";
  if (/lion/.test(s)) return "lion";
  return null; // paxel & lainnya
}

// URL lacak publik di situs kurir — fallback untuk Paxel / kurir tanpa API.
export function courierTrackUrl(label: string | null | undefined, resi: string): string | null {
  const s = (label || "").toLowerCase();
  if (/paxel/.test(s)) return `https://paxel.co/tracking?waybill=${encodeURIComponent(resi)}`;
  if (/jne/.test(s)) return `https://www.jne.co.id/id/tracking/trace`;
  if (/lion/.test(s)) return `https://lionparcel.com/track/${encodeURIComponent(resi)}`;
  if (/j&t|jnt|j-t/.test(s)) return `https://www.jet.co.id/track?resi=${encodeURIComponent(resi)}`;
  return null;
}

export const trackingConfigured = Boolean(API_KEY);

/** Lacak resi. null kalau tidak dikonfigurasi, kurir tak didukung, atau gagal. */
export async function trackResi(label: string | null | undefined, resi: string): Promise<TrackResult | null> {
  const courier = courierCode(label);
  if (!API_KEY || !courier || !resi) return null;

  try {
    const url = `https://api.binderbyte.com/v1/track?api_key=${encodeURIComponent(API_KEY)}&courier=${courier}&awb=${encodeURIComponent(resi)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    const json = await res.json();
    if (json?.status !== 200 || !json?.data) return null;

    const summary = json.data.summary ?? {};
    const rawHistory = Array.isArray(json.data.history) ? json.data.history : [];
    const history: TrackStep[] = rawHistory.map((h: Record<string, unknown>) => ({
      date: String(h.date ?? ""),
      desc: String(h.desc ?? h.description ?? ""),
    }));
    return { status: String(summary.status ?? ""), courier, history };
  } catch {
    return null;
  }
}
