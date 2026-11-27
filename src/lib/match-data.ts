import { unstable_cache } from "next/cache";
import { compareItems } from "./compare";
import type { Kat } from "./compare-shared";

const cache = unstable_cache(async (k: Kat) => compareItems({ kategori: k }), ["match"], { revalidate: 300, tags: ["bandingkan", "products"] });

/** Item lab per kategori untuk Tirtonic Match (cache 5 menit, ikut tag "bandingkan" & "products").
 *  compareItems mengembalikan [] kalau query gagal; hasil kosong jangan dipercaya dari cache, ambil ulang langsung. */
export async function itemsMatch(k: Kat) {
  const r = await cache(k);
  return r.length ? r : compareItems({ kategori: k });
}
