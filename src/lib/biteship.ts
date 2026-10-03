import "server-only";

// Cek ongkir real-time lewat Biteship (satu API, banyak kurir).
// Belum punya akun? Biarkan env kosong → biteshipConfigured = false, dan sistem
// otomatis pakai ongkir flat (SHIPPING_OPTIONS) sebagai fallback.
//
// Env: BITESHIP_API_KEY, BITESHIP_ORIGIN_POSTAL_CODE (kode pos gudang/toko),
//      BITESHIP_COURIERS (opsional, default daftar kurir umum).

const KEY = process.env.BITESHIP_API_KEY || "";
const ORIGIN = process.env.BITESHIP_ORIGIN_POSTAL_CODE || "";
const COURIERS = process.env.BITESHIP_COURIERS || "jne,jnt,sicepat,anteraja,pos,ninja,wahana,lion,ide,sap";

export const biteshipConfigured = Boolean(KEY && ORIGIN);

export type RateOption = { id: string; label: string; cost: number; etd: string | null };
export type RateItem = { name: string; value: number; weight: number; quantity: number };

export async function getRates(destinationPostal: string, items: RateItem[]): Promise<RateOption[]> {
  if (!biteshipConfigured) return [];
  const dest = destinationPostal.replace(/\D/g, "");
  if (dest.length < 5) return [];

  try {
    const res = await fetch("https://api.biteship.com/v1/rates/couriers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: KEY },
      body: JSON.stringify({
        origin_postal_code: Number(ORIGIN),
        destination_postal_code: Number(dest),
        couriers: COURIERS,
        items: items.map((i) => ({ name: i.name, value: i.value, weight: Math.max(1, i.weight), quantity: i.quantity })),
      }),
    });
    const data = await res.json();
    const pricing: unknown[] = Array.isArray(data?.pricing) ? data.pricing : [];
    return pricing.map((raw) => {
      const p = raw as Record<string, unknown>;
      const code = String(p.courier_code ?? "");
      const service = String(p.courier_service_code ?? p.courier_service_name ?? "");
      return {
        id: `${code}::${service}`,
        label: `${String(p.courier_name ?? code)} — ${String(p.courier_service_name ?? service)}`,
        cost: Number(p.price ?? 0),
        etd: (p.duration as string) ?? (p.shipment_duration_range as string) ?? null,
      };
    }).filter((o) => o.cost > 0);
  } catch (e) {
    console.error("biteship getRates gagal:", e);
    return [];
  }
}
