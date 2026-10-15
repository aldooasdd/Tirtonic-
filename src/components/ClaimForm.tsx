"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { claimDemo, FormState } from "@/app/komunitas/actions";

// Autocomplete lokasi: Google Places (New) kalau ada API key, selain itu fallback Photon/OSM (gratis).
const GKEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Label tempat dari hasil Photon (OpenStreetMap).
type Place = { properties: Record<string, string> };
function placeLabel(p: Record<string, string>): string {
  const head = p.name || [p.street, p.housenumber].filter(Boolean).join(" ");
  const rest = [p.city || p.county || p.district, p.state, p.country].filter(Boolean);
  return [head, ...rest].filter(Boolean).join(", ");
}

// Muat Google Maps JS (Places lib) sekali, lalu ambil library 'places'.
// ponytail: pakai importLibrary (API baru) — classic Autocomplete sudah dibatasi untuk key baru.
async function loadGooglePlaces(): Promise<any> {
  const w = window as any;
  if (!w.__gmapsPromise) {
    w.__gmapsPromise = new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&v=weekly&libraries=places&loading=async`;
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error("gmaps load failed"));
      document.head.appendChild(s);
    });
  }
  await w.__gmapsPromise;
  return w.google.maps.importLibrary("places");
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
  const [suggests, setSuggests] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const pickedRef = useRef(false);
  const [date, setDate] = useState(minDate);
  const [sel, setSel] = useState<number[]>([]); // index HOURS yang dipilih

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

  // Autocomplete lokasi (debounce). Google Places kalau ada key, else Photon/OSM. Dibias ke Indonesia.
  useEffect(() => {
    if (pickedRef.current) { pickedRef.current = false; return; }
    const q = court.trim();
    if (q.length < 3) { setSuggests([]); return; }
    let active = true;
    const t = setTimeout(async () => {
      try {
        let labels: string[] = [];
        if (GKEY) {
          const places = await loadGooglePlaces();
          const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: q,
            includedRegionCodes: ["id"],
            language: "id",
            region: "id",
          });
          labels = (suggestions || []).map((s: any) => s.placePrediction?.text?.text).filter(Boolean);
        } else {
          const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`);
          const data: { features?: Place[] } = await r.json();
          labels = (data.features || []).map((f) => placeLabel(f.properties)).filter(Boolean);
        }
        if (!active) return;
        setSuggests(Array.from(new Set(labels)).slice(0, 6));
        setShowSug(true);
      } catch { /* ponytail: abaikan error jaringan/quota — input manual tetap jalan */ }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [court]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="quotaType" value={quotaType} />

      <div className="relative">
        <label className="label">Lapangan tenis *</label>
        <input
          name="court"
          required
          autoComplete="off"
          value={court}
          onChange={(e) => setCourt(e.target.value)}
          onFocus={() => suggests.length > 0 && setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          className="field"
          placeholder="Ketik nama lapangan / GOR / kota…"
        />
        {showSug && suggests.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            {suggests.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickedRef.current = true; setCourt(s); setShowSug(false); }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-primary/5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-primary"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
                  <span>{s}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-gray-400">Pilih dari saran lokasi biar akurat di peta.</p>
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
