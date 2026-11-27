import { unstable_cache } from "next/cache";
import { compareItems } from "./compare";
import type { Kat } from "./compare-shared";

/** Item lab per kategori untuk Tirtonic Match (cache 5 menit, ikut tag "bandingkan" & "products"). */
export const itemsMatch = unstable_cache(async (k: Kat) => compareItems({ kategori: k }), ["match"], { revalidate: 300, tags: ["bandingkan", "products"] });
