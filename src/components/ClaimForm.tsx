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

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full py-3 disabled:opacity-60">
      {pending ? "Mengirim…" : "Ajukan demo ke Tirtonic"}
    </button>
  );
}

export default function ClaimForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useFormState<FormState, FormData>(claimDemo, {});
  const [quotaType, setQuotaType] = useState<"closed" | "open">("open");
  const [court, setCourt] = useState("");
  const [suggests, setSuggests] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const pickedRef = useRef(false);

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

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Tanggal sesi *</label>
          <input name="demoDate" required type="date" className="field" />
        </div>
        <div>
          <label className="label">Jam sesi *</label>
          <input name="time" required type="time" defaultValue="08:00" className="field" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-gray-400">1 pengajuan = 1 sesi. Mau beberapa sesi? Ajukan lagi dengan jam berbeda.</p>

      <div>
        <label className="label">Nomor WhatsApp penanggung jawab acara *</label>
        <input name="eventPicPhone" required inputMode="numeric" className="field" placeholder="0812xxxxxxxx" />
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Btn />
    </form>
  );
}
