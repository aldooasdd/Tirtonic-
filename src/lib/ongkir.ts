import "server-only";

// Cek ongkir real-time via Binderbyte (key sama dengan lacak resi: BINDERBYTE_API_KEY).
// Alur: cari kelurahan/kecamatan (atau kode pos) → /v1/locations (id lokasi) → /v1/cost. Berat dalam KG.
// Asal kirim default gudang Sleman 55581; ganti lewat ONGKIR_ORIGIN_POSTAL_CODE.
// Key kosong / gagal → [] → caller pakai ongkir flat.

const KEY = process.env.BINDERBYTE_API_KEY || "";
const ORIGIN_POSTAL = process.env.ONGKIR_ORIGIN_POSTAL_CODE || "55581";
const COURIERS = "jne:jnt:lion"; // hanya JNE, J&T, Lion (permintaan toko)

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

// Id lokasi dari searchLocations dikirim dengan awalan "loc:" (format id Binderbyte tak diasumsikan).
const LOC = "loc:";

export type LocationOption = { id: string; label: string };
const searchCache = new Map<string, LocationOption[]>();

/** Cari kelurahan/kecamatan/kota (nama atau kode pos) → pilihan tujuan ongkir. */
export async function searchLocations(q: string): Promise<LocationOption[]> {
  const term = q.trim().toLowerCase().replace(/\s+/g, " ");
  if (!KEY || term.length < 3) return [];
  if (searchCache.has(term)) return searchCache.get(term)!;
  try {
    const res = await fetch(`https://api.binderbyte.com/v1/locations?api_key=${encodeURIComponent(KEY)}&search=${encodeURIComponent(term)}`, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const out: LocationOption[] = (Array.isArray(json?.data) ? json.data : [])
      .filter((d: { id?: unknown; label?: unknown }) => d?.id && d?.label)
      .slice(0, 12)
      .map((d: { id: unknown; label: unknown }) => ({ id: LOC + String(d.id), label: String(d.label) }));
    // ponytail: cache per proses, tanpa batas — istilah pencarian sedikit; batasi kalau memori naik.
    searchCache.set(term, out);
    return out;
  } catch {
    return [];
  }
}

/** destination: "loc:<id lokasi Binderbyte>" (hasil searchLocations) atau kode pos 5 digit. */
export async function getRates(destinationInput: string, items: RateItem[]): Promise<RateOption[]> {
  const raw = destinationInput.trim();
  const locId = raw.startsWith(LOC) ? raw.slice(LOC.length) : null;
  const postal = raw.replace(/\D/g, "");
  if (!KEY || (!locId && postal.length !== 5)) return [];
  try {
    const [origin, destination] = await Promise.all([locationId(ORIGIN_POSTAL), locId ?? locationId(postal)]);
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
