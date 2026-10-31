// Batas bulan WIB (UTC+7). Server Vercel jalan UTC, jadi `new Date(y,m,1)` meleset
// ~7 jam di tepi bulan. Helper ini hitung rentang bulan WIB sebagai instant absolut.
const OFF = 7 * 3600 * 1000;

/** Komponen tanggal "sekarang" menurut WIB (y, m 0-based, d). */
export function wibNow() {
  const d = new Date(Date.now() + OFF);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

/** Rentang [start, end) bulan WIB (y, m 0-based) sebagai instant UTC. */
export function wibMonthRange(y: number, m: number) {
  return {
    start: new Date(Date.UTC(y, m, 1) - OFF),
    end: new Date(Date.UTC(y, m + 1, 1) - OFF),
  };
}

/** Label bulan (mis. "Oktober 2026") dari y + m 0-based. */
export function wibMonthLabel(y: number, m: number, opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) {
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString("id-ID", { ...opts, timeZone: "UTC" });
}
