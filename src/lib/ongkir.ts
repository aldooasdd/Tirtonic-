import "server-only";

// Cek ongkir real-time via Binderbyte (key sama dengan lacak resi: BINDERBYTE_API_KEY).
// Alur: kode pos → /v1/locations (id lokasi) → /v1/cost. Berat dalam KG.
// Asal kirim default gudang Sleman 55581; ganti lewat ONGKIR_ORIGIN_POSTAL_CODE.
// Key kosong / gagal → [] → caller pakai ongkir flat.

const KEY = process.env.BINDERBYTE_API_KEY || "";
const ORIGIN_POSTAL = process.env.ONGKIR_ORIGIN_POSTAL_CODE || "55581";
const COURIERS = process.env.ONGKIR_COURIERS || "jne:jnt:sicepat:anteraja:lion:pos:ninja:ide:sap";

export const ongkirConfigured = Boolean(KEY);

export type RateOption = { id: string; label: string; cost: number; etd: string | null };
export type RateItem = { weight: number; quantity: number }; // weight gram per item

const locCache = new Map<string, string | null>();

// Kode pos → id lokasi Binderbyte (mis. "village_17602"). Ambil hasil pertama.
async function locationId(postal: string): Promise<string | null> {
  if (locCache.has(postal)) return locCache.get(postal)!;
  const res = await fetch(`https://api.binderbyte.com/v1/locations?api_key=${encodeURIComponent(KEY)}&search=${postal}`, { signal: AbortSignal.timeout(8000) });
  const json = await res.json();
  const id: string | null = Array.isArray(json?.data) && json.data[0]?.id ? String(json.data[0].id) : null;
  locCache.set(postal, id);
  return id;
}

export async function getRates(destinationPostal: string, items: RateItem[]): Promise<RateOption[]> {
  const dest = destinationPostal.replace(/\D/g, "");
  if (!KEY || dest.length !== 5) return [];
  try {
    const [origin, destination] = await Promise.all([locationId(ORIGIN_POSTAL), locationId(dest)]);
    if (!origin || !destination) return [];
    const grams = items.reduce((s, i) => s + Math.max(1, i.weight) * Math.max(1, i.quantity), 0);
    const kg = Math.max(1, Math.ceil(grams / 1000)); // kurir bulatkan ke atas per kg
    const body = new URLSearchParams({ api_key: KEY, origin, destination, weight: String(kg), courier: COURIERS });
    const res = await fetch("https://api.binderbyte.com/v1/cost", { method: "POST", body, signal: AbortSignal.timeout(10000) });
    const json = await res.json();
    const results: Record<string, unknown>[] = Array.isArray(json?.data?.results) ? json.data.results : [];
    return results.flatMap((r) =>
      (Array.isArray(r.costs) ? (r.costs as Record<string, unknown>[]) : []).map((c) => ({
        id: `${String(c.code ?? r.code)}::${String(c.service ?? "")}`,
        label: `${String(c.code ?? r.code).toUpperCase()} ${String(c.service ?? "")}`.trim(),
        cost: Number(c.price ?? 0),
        etd: c.estimated ? String(c.estimated).replace(/day/, "hari") : null,
      })),
    ).filter((o) => o.cost > 0);
  } catch (e) {
    console.error("binderbyte ongkir gagal:", e);
    return [];
  }
}
