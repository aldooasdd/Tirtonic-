import "server-only";

// Ambil Ace Points pelanggan dari API Tirtonichub (lintas-repo, DB terpisah).
// Poin = Σ grandTotal nota approved sejak 1 Nov 2026 WIB ÷ 1000 (dihitung di Tirtonichub).
// Env: TIRTONICHUB_POINTS_URL (mis. https://hub.tirtonic.com/api/points) + POINTS_API_SECRET (sama dgn server Tirtonichub).
// Gagal / belum diset → 0 (dashboard tetap jalan).
export async function fetchInvoicePoints(phone: string | null): Promise<number> {
  const base = process.env.TIRTONICHUB_POINTS_URL;
  const secret = process.env.POINTS_API_SECRET;
  if (!base || !secret || !phone) return 0;
  try {
    const u = new URL(base);
    u.searchParams.set("phone", phone);
    const res = await fetch(u, { headers: { "x-points-secret": secret }, cache: "no-store" });
    if (!res.ok) return 0;
    const j = (await res.json()) as { points?: number };
    return typeof j.points === "number" && j.points >= 0 ? j.points : 0;
  } catch {
    return 0; // ponytail: diam kalau hub mati; poin 0, sisanya tetap tampil
  }
}
