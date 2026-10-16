"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { claimDemo, FormState } from "@/app/komunitas/actions";

// Lokasi lapangan: peta OpenStreetMap interaktif (Leaflet) — user klik buat naruh pin.
// Dipilih karena search-by-nama (Nominatim/Photon) sering gagal untuk lapangan kecil
// yang nggak dinamai di OSM, padahal titiknya kelihatan di peta. Gratis, tanpa API key.
// ponytail: Leaflet dimuat dari CDN (cdnjs) biar tak nambah dependency; kalau mau
// di-bundle tinggal `npm i leaflet` + import.
function loadLeaflet(): Promise<void> {
  const w = window as unknown as { __leafletPromise?: Promise<void> };
  if (w.__leafletPromise) return w.__leafletPromise;
  w.__leafletPromise = new Promise<void>((res, rej) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("leaflet load failed"));
    document.head.appendChild(s);
  });
  return w.__leafletPromise;
}

function Btn({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-green w-full py-3 disabled:opacity-60">
      {pending ? "Mengirim…" : "Ajukan demo ke Tirtonic"}
    </button>
  );
}

// Booking existing (per tanggal) untuk tandai slot Booked + jeda 1 jam.
export type Booking = { date: string; start: string; end: string };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const GAP = 60; // menit jeda minimal antar booking komunitas
// Slot per 1 jam, 06:00–22:00.
const HOURS = Array.from({ length: 22 - 6 }, (_, i) => ({ start: toHHMM((6 + i) * 60), end: toHHMM((7 + i) * 60), s: (6 + i) * 60, e: (7 + i) * 60 }));
// Daftar tanggal dalam periode kampanye (maks 90 hari).
function dateRange(min: string, max: string): string[] {
  const out: string[] = [];
  let d = new Date(min + "T00:00:00Z");
  const end = new Date(max + "T00:00:00Z");
  for (let i = 0; i < 90 && d <= end; i++) { out.push(d.toISOString().slice(0, 10)); d = new Date(d.getTime() + 86400000); }
  return out;
}

export default function ClaimForm({ campaignId, minDate, maxDate, bookings }: { campaignId: string; minDate: string; maxDate: string; bookings: Booking[] }) {
  const [state, action] = useFormState<FormState, FormData>(claimDemo, {});
  const [quotaType, setQuotaType] = useState<"closed" | "open">("open");
  const [court, setCourt] = useState("");
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [area, setArea] = useState("");
  const [areaMsg, setAreaMsg] = useState("");
  const [date, setDate] = useState(minDate);
  const [sel, setSel] = useState<number[]>([]); // index HOURS yang dipilih

  const mapEl = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const dates = dateRange(minDate, maxDate);
  const dayBlocks = bookings.filter((b) => b.date === date && b.start && b.end).map((b) => ({ s: toMin(b.start), e: toMin(b.end) }));
  // Status slot: "booked" (bentrok langsung), "buffer" (dalam jeda 1 jam), "free".
  const slotStatus = (sl: { s: number; e: number }): "booked" | "buffer" | "free" => {
    if (dayBlocks.some((b) => sl.s < b.e && sl.e > b.s)) return "booked";
    if (dayBlocks.some((b) => sl.s < b.e + GAP && sl.e > b.s - GAP)) return "buffer";
    return "free";
  };
  const selSorted = [...sel].sort((a, b) => a - b);
  const contiguous = sel.length > 0 && selSorted[selSorted.length - 1] - selSorted[0] + 1 === sel.length;
  const timeStart = sel.length ? HOURS[selSorted[0]].start : "";
  const timeEnd = sel.length ? HOURS[selSorted[selSorted.length - 1]].end : "";
  const toggleSlot = (i: number) => setSel((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  // Init peta Leaflet sekali. Klik peta → taruh/geser pin → simpan koordinat.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (cancelled || !L || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current).setView([-7.7956, 110.3695], 12); // default: Yogyakarta
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else markerRef.current = L.marker([lat, lng]).addTo(map);
        setCoord({ lat, lng });
      });
      mapRef.current = map;
    }).catch(() => { /* ponytail: kalau Leaflet gagal load, input nama tetap jalan */ });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Cari area/jalan untuk GESER peta cepat (Nominatim). Bukan buat nemu lapangannya —
  // user tetap klik titik lapangan sendiri setelah peta pindah ke area itu.
  async function searchArea() {
    const q = area.trim();
    if (!q || !mapRef.current) return;
    setAreaMsg("Mencari…");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(q)}`);
      const d: { lat: string; lon: string }[] = await r.json();
      if (d[0]) { mapRef.current.setView([+d[0].lat, +d[0].lon], 17); setAreaMsg(""); }
      else setAreaMsg("Area tak ketemu — geser peta manual aja.");
    } catch { setAreaMsg("Gagal mencari — geser peta manual aja."); }
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="quotaType" value={quotaType} />
      <input type="hidden" name="lat" value={coord?.lat ?? ""} />
      <input type="hidden" name="lng" value={coord?.lng ?? ""} />

      <div>
        <label className="label">Lapangan tenis *</label>
        <input
          name="court"
          required
          value={court}
          onChange={(e) => setCourt(e.target.value)}
          className="field"
          placeholder="Nama lapangan (mis. Lapangan Tenis Sinduadi)"
        />

        {/* Cari area buat geser peta, lalu klik titik lapangan */}
        <div className="mt-2 flex gap-2">
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchArea(); } }}
            className="field"
            placeholder="Cari area/jalan buat geser peta…"
          />
          <button type="button" onClick={searchArea} className="shrink-0 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:border-primary/50 hover:text-primary">Cari</button>
        </div>
        {areaMsg && <p className="mt-1 text-xs text-gray-400">{areaMsg}</p>}

        <div ref={mapEl} className="mt-2 h-60 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100" />
        {coord ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
            Titik lokasi tersimpan. Klik lagi di peta kalau mau pindah.
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">Klik lokasi lapangan di peta buat naruh pin (biar akurat, nggak harus ada namanya di peta).</p>
        )}
      </div>

      <div>
        <label className="label">Tipe kuota peserta *</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setQuotaType("open")}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${quotaType === "open" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200"}`}
          >
            <span className="block font-bold text-gray-900">Open</span>
            <span className="block text-xs text-gray-500">Orang bisa join dari web</span>
          </button>
          <button
            type="button"
            onClick={() => setQuotaType("closed")}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${quotaType === "closed" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200"}`}
          >
            <span className="block font-bold text-gray-900">Closed</span>
            <span className="block text-xs text-gray-500">Kuota fix dari komunitas</span>
          </button>
        </div>
      </div>

      <div>
        <label className="label">{quotaType === "open" ? "Maksimal peserta *" : "Jumlah peserta *"}</label>
        <input name="quota" required type="number" min={10} defaultValue={10} className="field" />
        <p className="mt-1 text-xs text-gray-400">Minimal 10 orang (untuk sesi ini).</p>
      </div>

      {/* nilai dikirim lewat hidden input (dari pilihan slot) */}
      <input type="hidden" name="demoDate" value={date} />
      <input type="hidden" name="time" value={timeStart} />
      <input type="hidden" name="timeEnd" value={timeEnd} />

      <div>
        <label className="label">Tanggal sesi *</label>
        {/* Date tabs ala booking lapangan */}
        <div className="mt-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dates.map((d) => {
            const dt = new Date(d + "T00:00:00Z");
            const active = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => { setDate(d); setSel([]); }}
                className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition ${active ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-600 hover:border-primary/40"}`}
              >
                <span className={`text-[10px] font-semibold uppercase ${active ? "text-white/80" : "text-gray-400"}`}>{dt.toLocaleDateString("id-ID", { weekday: "short", timeZone: "UTC" })}</span>
                <span className="text-sm font-bold leading-tight">{dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Pilih jam sesi *</label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {HOURS.map((sl, i) => {
            const st = slotStatus(sl);
            const picked = sel.includes(i);
            const locked = st !== "free";
            return (
              <button
                key={sl.start}
                type="button"
                disabled={locked}
                onClick={() => toggleSlot(i)}
                className={`rounded-xl border px-2 py-2 text-center transition ${
                  locked
                    ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                    : picked
                      ? "border-primary bg-primary text-white"
                      : "border-gray-200 text-gray-700 hover:border-primary/50"
                }`}
              >
                <span className={`block text-[10px] ${picked ? "text-white/80" : "text-gray-400"}`}>60 Menit</span>
                <span className="block text-sm font-bold leading-tight">{sl.start} – {sl.end}</span>
                <span className={`block text-[10px] font-semibold ${picked ? "text-white/90" : locked ? "text-gray-400" : "text-primary"}`}>
                  {st === "booked" ? "Booked" : st === "buffer" ? "Jeda 1 jam" : picked ? "Dipilih" : "Tersedia"}
                </span>
              </button>
            );
          })}
        </div>
        {sel.length > 0 ? (
          contiguous ? (
            <p className="mt-2 text-xs font-semibold text-primary">Sesi dipilih: {timeStart} – {timeEnd} ({sel.length} jam)</p>
          ) : (
            <p className="mt-2 text-xs font-semibold text-red-600">Pilih slot yang bersambung (tanpa loncat), ya.</p>
          )
        ) : (
          <p className="mt-2 text-xs text-gray-400">Klik satu atau beberapa jam yang bersambung. Slot Booked/Jeda terkunci.</p>
        )}
      </div>

      <div>
        <label className="label">Nomor WhatsApp penanggung jawab acara *</label>
        <input name="eventPicPhone" required inputMode="numeric" className="field" placeholder="0812xxxxxxxx" />
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Btn disabled={!contiguous} />
    </form>
  );
}
