"use client";

import { useEffect, useRef, useState } from "react";
import { racketLabel } from "@/lib/string-finder/racket";

// Pecah string raket tersimpan ("Nama · 100 in²") → field terpisah.
function parseRacket(str: string): { name: string; head: string } {
  const tokens = str.split("·").map((s) => s.trim()).filter(Boolean);
  let head = ""; const nameParts: string[] = [];
  for (const tok of tokens) {
    const hm = tok.match(/^(\d{2,3})\s*in²$/);
    if (hm) { head = hm[1]; continue; }
    nameParts.push(tok);
  }
  return { name: nameParts.join(" · "), head };
}

export type Question = {
  id: string;
  type: "single" | "multi";
  max?: number;
  text: string;
  helper?: string;
  options: { value: string; label: string; hint?: string }[];
  conflict_note?: { pair: string[]; text: string };
};

type Attr = "spin" | "power" | "control" | "comfort" | "stability" | "durability";
type Pick = {
  name: string;
  material: string;
  gauge: number | null;
  price: number | null;
  score: number;
  attrs: Record<Attr, number | null>;
  explanation: { strengths: { attr: Attr; text: string }[]; weakness: { attr: Attr | null; text: string }; notes: string[] };
  variants?: SenarVariant[]; // varian warna/gauge senar ini (kalau ada stok)
};
type RecResponse = { code: string; condition: string; profile_summary: string; picks: Pick[]; tension_suggestion: number; tension_note: string; racket_label: string | null; tension_racket_note: string | null; racket_string_note: string | null };

const ATTR_LABEL: Record<Attr, string> = {
  spin: "Spin", power: "Power", control: "Kontrol", comfort: "Nyaman", stability: "Stabil", durability: "Awet",
};
const ATTRS: Attr[] = ["spin", "power", "control", "comfort", "stability", "durability"];
const RANK_LABEL = ["Paling cocok", "Alternatif", "Alternatif"];


type HistItem = { code: string; senar: string | null; tension: number | null; tensionCross: number | null; racket: string | null; status: string; statusLabel: string; date: string };
type SenarVariant = { label: string; price: number | null };
type SenarCard = { name: string; material: string; gauge: number | null; price: number | null; photo: string | null; st: number | null; sp: number | null; er: number | null; variants: SenarVariant[] };

export default function StringFinderFlow({ questions }: { questions: Question[] }) {
  const [phase, setPhase] = useState<"intro" | "identify" | "choice" | "dashboard" | "quiz" | "loading" | "results" | "order" | "catalog" | "own" | "hybrid" | "done">("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [rec, setRec] = useState<RecResponse | null>(null);
  const [err, setErr] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  // Konsep raket: customer isi head size (in²).
  const [racketHead, setRacketHead] = useState("");
  const [racketName, setRacketName] = useState(""); // merk/tipe raket, diketik manual
  const [tension, setTension] = useState(""); // Main (dalam satuan `unit`)
  const [tensionCross, setTensionCross] = useState(""); // Cross (dalam satuan `unit`)
  const [unit, setUnit] = useState<"lbs" | "kg">("lbs"); // satuan tampilan tarikan; disimpan selalu lbs
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [history, setHistory] = useState<HistItem[] | null>(null);
  // Profil pelanggan dari nomor WA (kalau pernah stringing di sini) → tampilkan raket lamanya.
  const [lookupPhone, setLookupPhone] = useState(""); // input cek riwayat (container atas)
  const [profile, setProfile] = useState<{ count: number; lastName: string | null; rackets: string[] } | null>(null);
  useEffect(() => {
    const digits = lookupPhone.replace(/\D/g, "");
    if (digits.length < 9) { setProfile(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sf/history?phone=${encodeURIComponent(lookupPhone)}`, { signal: ctrl.signal });
        if (!res.ok) { setProfile(null); return; }
        const d = await res.json();
        if (!d.count) { setProfile(null); return; }
        // Raket unik dari riwayat (urut terbaru dulu).
        const rackets = [...new Set((d.history as HistItem[]).map((h) => h.racket).filter(Boolean) as string[])];
        setProfile({ count: d.count, lastName: d.lastName ?? null, rackets });
      } catch { /* abaikan */ }
    }, 500);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [lookupPhone]);

  // Isi field dari string raket tersimpan (dipakai saat klik chip raket).
  function fillRacket(racket: string) {
    const r = parseRacket(racket);
    setRacketName(r.name);
    setRacketHead(r.head);
  }
  // "Pilih senar sendiri": katalog semua senar + senar yang dipilih manual (di luar 3 rekomendasi).
  const [manualPick, setManualPick] = useState<SenarCard | null>(null);
  // Jalur manual non-rekomendasi: "hybrid" (main+cross beda senar). null = full bed / pilih katalog.
  const [manualKind, setManualKind] = useState<"hybrid" | null>(null);
  const [hybridMain, setHybridMain] = useState("");
  const [hybridCross, setHybridCross] = useState("");
  const [catalogManual, setCatalogManual] = useState(""); // nama senar yg gak ada di katalog (ketik manual)
  const [catalog, setCatalog] = useState<SenarCard[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  // Kiosk mode (stand toko, ?kiosk=1): fullscreen + auto-reset tiap selesai.
  const [kiosk, setKiosk] = useState(false);
  const [resetIn, setResetIn] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("kiosk")) return;
    setKiosk(true);
    document.documentElement.classList.add("kiosk");
    return () => document.documentElement.classList.remove("kiosk");
  }, []);

  // Bersihkan semua state → layar awal (data customer sebelumnya tidak tersisa).
  function resetAll() {
    setPhase("intro"); setStep(0); setAnswers({}); setRec(null); setErr("");
    setChosen(null); setNama(""); setWa(""); setRacketHead("");
    setTension(""); setHistory(null); setManualPick(null); setCatalogSearch("");
    setRacketName("");
    setManualKind(null); setHybridMain(""); setHybridCross(""); setCatalogManual(""); setUnit("lbs");
  }

  // Auto-reset 10 dtk setelah selesai, biar siap untuk customer berikutnya.
  useEffect(() => {
    if (phase !== "done") { setResetIn(0); return; }
    setResetIn(10);
    const t = setInterval(() => setResetIn((n) => {
      if (n <= 1) { clearInterval(t); resetAll(); return 0; }
      return n - 1;
    }), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Label raket untuk disimpan & ditampilkan, mis. "Power · 100 in²".
  const headNum = parseInt(racketHead, 10);
  const racketLbl = racketLabel({ head: Number.isFinite(headNum) ? headNum : null });
  // Raket final: merk/tipe manual + label turunan (head/jenis), digabung.
  const racketStr = [racketName.trim() || null, racketLbl].filter(Boolean).join(" · ") || null;

  const q = questions[step];

  function startQuiz() {
    if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; }
    setErr("");
    setPhase("quiz");
    setStep(0);
  }

  // "Full Bed Stringing": pilih satu senar dari katalog (tanpa mesin rekomendasi, tanpa password).
  // Bikin kode order minimal dulu, lalu langsung ke katalog senar.
  async function startManual() {
    if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; }
    setErr(""); setPhase("loading");
    try {
      const res = await fetch("/api/sf/manual", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "fullbed" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai.");
      setRec({ code: data.code, condition: "manual", profile_summary: "", picks: [], tension_suggestion: data.tension_suggestion ?? 50, tension_note: "", racket_label: null, tension_racket_note: null, racket_string_note: null });
      setManualKind(null);
      await openCatalog();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setPhase("choice");
    }
  }

  // Senar yang tidak ada di katalog: customer/kasir ketik namanya manual, lalu ke order.
  function pickManualName() {
    const name = catalogManual.trim();
    if (!name) { setErr("Tulis nama senarnya dulu ya."); return; }
    setErr("");
    pickManual({ name, material: "Di luar katalog", gauge: null, price: null, photo: null, st: null, sp: null, er: null, variants: [] });
  }

  // "Hybrid": main & cross beda senar. Gabung jadi satu chosenString "X (main) / Y (cross)".
  // Tarikan main/cross sudah ada di layar order. Konsep datanya sama (pakai /api/sf/manual).
  async function startHybrid() {
    if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; }
    if (!hybridMain.trim() || !hybridCross.trim()) { setErr("Isi senar main & cross dulu ya."); return; }
    setErr(""); setPhase("loading");
    try {
      const res = await fetch("/api/sf/manual", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "hybrid" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai.");
      const sug = data.tension_suggestion ?? 50;
      setRec({ code: data.code, condition: "manual", profile_summary: "", picks: [], tension_suggestion: sug, tension_note: "", racket_label: null, tension_racket_note: null, racket_string_note: null });
      setManualPick({ name: `${hybridMain.trim()} (main) / ${hybridCross.trim()} (cross)`, material: "Hybrid", gauge: null, price: null, photo: null, st: null, sp: null, er: null, variants: [] });
      setManualKind("hybrid");
      setTension(String(sug)); setTensionCross(String(Math.max(40, sug - 2)));
      setPhase("order");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setPhase("hybrid");
    }
  }

  function setSingle(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }
  function toggleMulti(id: string, value: string, max: number) {
    setAnswers((a) => {
      const cur = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      if (cur.includes(value)) return { ...a, [id]: cur.filter((x) => x !== value) };
      if (cur.length >= max) return a;
      return { ...a, [id]: [...cur, value] };
    });
  }

  const answered = (() => {
    const v = answers[q?.id];
    if (!q) return false;
    return q.type === "multi" ? Array.isArray(v) && v.length >= 1 : typeof v === "string";
  })();

  async function submit() {
    setPhase("loading");
    setErr("");
    try {
      const res = await fetch("/api/sf/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, racketHead: Number.isFinite(headNum) ? headNum : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghitung rekomendasi.");
      setRec(data);
      setPhase("results");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setPhase("quiz");
    }
  }

  // Senar yang dipakai pesanan: manual (katalog) menang; selainnya rekomendasi ke-`chosen`.
  const selected: SenarCard | null = manualPick
    ? manualPick
    : rec && chosen != null
      ? { name: rec.picks[chosen].name, material: rec.picks[chosen].material, gauge: rec.picks[chosen].gauge, price: rec.picks[chosen].price, photo: null, st: null, sp: null, er: null, variants: [] }
      : null;

  // Isi otomatis tarikan sesuai material (poly dimainkan −2 lbs), dari saran server.
  // Tarikan selalu diisi/disimpan dalam lbs; `unit` cuma tampilan. Konversi saat ganti satuan.
  const LB_PER_KG = 2.20462;
  const tensionToLbs = (v: string) => { const n = parseFloat(v); if (!Number.isFinite(n)) return undefined; return unit === "kg" ? Math.round(n * LB_PER_KG) : Math.round(n); };
  function changeUnit(next: "lbs" | "kg") {
    if (next === unit) return;
    const conv = (v: string) => { const n = parseFloat(v); if (!Number.isFinite(n)) return v; return next === "kg" ? String(Math.round((n / LB_PER_KG) * 2) / 2) : String(Math.round(n * LB_PER_KG)); };
    setTension((v) => conv(v)); setTensionCross((v) => conv(v)); setUnit(next);
  }
  // Ketik tarikan: kg boleh desimal, lbs angka saja.
  const onTension = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    set(unit === "kg" ? raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1") : raw.replace(/\D/g, ""));
  };

  function applyTension(material: string) {
    if (!rec) return;
    const sug = Math.max(40, rec.tension_suggestion - (/poly/i.test(material) ? 2 : 0));
    setTension(String(sug));
    setTensionCross(String(Math.max(40, sug - 2)));
  }

  async function openCatalog() {
    setErr("");
    setPhase("catalog");
    // Selalu fetch fresh — biar ganti nama/stok produk di dashboard langsung kebaca (realtime).
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/sf/strings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat katalog senar.");
      setCatalog(data.strings as SenarCard[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setCatalogLoading(false);
    }
  }

  function pickManual(card: SenarCard, variant?: SenarVariant) {
    const pick: SenarCard = variant
      ? { ...card, name: `${card.name} — ${variant.label}`, price: variant.price ?? card.price, variants: [] }
      : card;
    setManualPick(pick);
    setManualKind(null);
    applyTension(pick.material);
    setPhase("order");
  }

  async function submitOrder() {
    if (!rec || !selected || submitLock.current) return;
    submitLock.current = true; // ref: kunci langsung, state baru kebaca setelah render
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch("/api/sf/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: rec.code, chosenRank: manualPick ? undefined : (chosen! + 1), chosenString: selected.name, price: selected.price ?? undefined, phone: wa, customerName: nama, racket: racketStr ?? undefined, tensionLbs: tensionToLbs(tension), tensionCrossLbs: tensionToLbs(tensionCross) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pesanan.");
      setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  // ---------- INTRO ----------
  if (phase === "intro") {
    return (
      <Shell>
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">String Finder</span>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">Temukan senar tenis yang pas</h1>
          <p className="mt-3 text-gray-600">
            Jawab 7 pertanyaan singkat, lalu kami tunjukkan 3 senar paling cocok,
            disesuaikan dengan kebutuhan mainmu.
          </p>
          <button
            onClick={() => {
              if (kiosk) document.documentElement.requestFullscreen?.().catch(() => {});
              setPhase("identify");
            }}
            className="btn-green mt-8 px-8 py-3 text-base"
          >
            Mulai
          </button>
          <p className="mt-3 text-xs text-gray-400">Gratis • sekitar 1 menit</p>
        </div>
      </Shell>
    );
  }

  // ---------- IDENTIFY (nama + WhatsApp + riwayat) ----------
  if (phase === "identify") {
    return (
      <Shell>
        <div className="mx-auto max-w-md">
          <button onClick={() => { setPhase("intro"); setHistory(null); }} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Kembali</button>
          <h1 className="text-2xl font-extrabold text-gray-900">Detail Pelanggan & Raket</h1>
          <p className="mt-2 text-sm text-gray-600">Masukkan nomor WhatsApp Anda untuk menerima kabar saat raket siap diambil dan melihat riwayat stringing sebelumnya.</p>

          {/* Cek riwayat: input nomor sendiri → klik raket lama → isi form di bawah. */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="label">Cek riwayat pelanggan <span className="text-gray-400">(nomor WhatsApp)</span></label>
            <input
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              inputMode="tel"
              className="field"
              placeholder="08xxxxxxxxxx"
            />
            {lookupPhone.replace(/\D/g, "").length >= 9 && (
              profile && profile.rackets.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs text-gray-500">Pernah stringing {profile.count}× di sini. Klik raket yang mau di-restring — data di bawah terisi otomatis.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.rackets.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setWa(lookupPhone); if (profile.lastName) setNama(profile.lastName); fillRacket(r); }}
                        className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">Belum ada riwayat untuk nomor ini.</p>
              )
            )}
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <label className="label">Nama <span className="text-gray-400">(opsional)</span></label>
              <input value={nama} onChange={(e) => setNama(e.target.value)} className="field" placeholder="Nama kamu" />
            </div>
            <div>
              <label className="label">Nomor WhatsApp <span className="text-red-500">*</span></label>
              <input value={wa} onChange={(e) => { setWa(e.target.value); setHistory(null); }} inputMode="tel" className="field" placeholder="08xxxxxxxxxx" />
            </div>
            <div>
              <label className="label">Raket <span className="text-gray-400">(opsional, merk/tipe)</span></label>
              <input value={racketName} onChange={(e) => setRacketName(e.target.value)} className="field" placeholder="mis. Yonex Ezone 98" />
            </div>
            <div>
              <label className="label">Head size raket <span className="text-gray-400">(opsional, in²)</span></label>
              <input
                value={racketHead}
                onChange={(e) => setRacketHead(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                onBlur={() => setRacketHead((v) => (v ? String(Math.min(120, Math.max(95, parseInt(v, 10)))) : v))}
                inputMode="numeric"
                className="field"
                placeholder="95–120"
              />
              <p className="mt-1 text-xs text-gray-400">Umumnya 95–120 in². Lihat di frame/gagang raket.</p>
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="space-y-2">
              <button onClick={() => { if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; } setErr(""); setPhase("choice"); }} disabled={!wa.trim()} className="btn-green w-full py-3 disabled:opacity-40">
                Langsung cari senar →
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- CHOICE (String Finder vs Tirtonic Team) ----------
  if (phase === "choice") {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl">
          <button onClick={() => { setPhase("identify"); setErr(""); }} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Kembali</button>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Pilih Metode Pemilihan Senar</h1>
          <p className="mt-2 text-gray-600">Gunakan rekomendasi otomatis atau pilih langsung dari katalog.</p>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* BESAR: String Finder */}
            <button
              onClick={startQuiz}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primaryDark p-7 text-left text-white shadow-lg transition hover:shadow-xl lg:col-span-2 lg:row-span-2 lg:p-9"
            >
              <span className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <span className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl font-extrabold leading-tight lg:text-4xl">String Finder</h2>
                <p className="mt-2 max-w-sm text-sm text-white/80 lg:text-base">Jawab beberapa pertanyaan, dapat 3 rekomendasi senar paling pas — disesuaikan cara mainmu. Untuk customer.</p>
              </div>
              <div className="relative mt-7 w-full max-w-xs space-y-2">
                {[{ l: "Paling cocok", w: 92 }, { l: "Alternatif", w: 78 }, { l: "Alternatif", w: 64 }].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-white/80" />
                    <span className="text-xs font-semibold">{r.l}</span>
                    <span className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-white/20">
                      <span className="block h-full rounded-full bg-white/80" style={{ width: `${r.w}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              <span className="relative mt-7 inline-flex items-center gap-2 text-sm font-bold">
                Mulai kuesioner
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </button>

            {/* Hybrid String */}
            <button
              onClick={() => { setErr(""); setHybridMain(""); setHybridCross(""); setPhase("hybrid"); }}
              className="group flex flex-col rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M21 3 13 11" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l6 6" /></svg>
              </span>
              <p className="mt-3 text-base font-extrabold text-gray-900">Hybrid Stringing</p>
              <p className="mt-1 text-sm text-gray-600">Dua jenis senar berbeda untuk main dan cross. Misalnya poliester untuk spin, dipadu multifilamen untuk kenyamanan.</p>
            </button>

            {/* Full Bed Stringing */}
            <button
              onClick={startManual}
              className="group flex flex-col rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" /></svg>
              </span>
              <p className="mt-3 text-base font-extrabold text-gray-900">Full Bed Stringing</p>
              <p className="mt-1 text-sm text-gray-600">Satu jenis senar untuk semua. Pilihan paling umum.</p>
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- DASHBOARD (riwayat stringing per nomor) ----------
  if (phase === "dashboard") {
    const h = history ?? [];
    const selesai = h.filter((x) => x.status === "selesai").length;
    const proses = h.filter((x) => x.status === "antri" || x.status === "dikerjakan").length;
    const badge = (s: string) =>
      s === "selesai" ? "bg-green-100 text-green-700"
      : s === "dikerjakan" ? "bg-blue-100 text-blue-700"
      : s === "antri" ? "bg-amber-100 text-amber-700"
      : s === "batal" ? "bg-red-100 text-red-600"
      : "bg-gray-100 text-gray-600";
    return (
      <Shell>
        <div className="mx-auto max-w-4xl">
          <button onClick={() => { setPhase("identify"); setHistory(null); }} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Ganti nomor</button>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">{wa}</p>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Halo{nama ? `, ${nama}` : ""}! 👋</h1>
            </div>
            <div className="flex gap-2">
              <a href={`/riwayat/${encodeURIComponent(wa)}`} target="_blank" rel="noreferrer" className="rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Dashboard lengkap ↗</a>
              <button onClick={() => { setPhase("quiz"); setStep(0); }} className="btn-green px-5 py-2.5">+ Cari rekomendasi senar</button>
            </div>
          </div>

          {/* stat ringkas */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { n: h.length, l: "Total stringing" },
              { n: selesai, l: "Selesai" },
              { n: proses, l: "Sedang proses" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-2xl font-extrabold text-gray-900">{s.n}</p>
                <p className="mt-0.5 text-xs text-gray-500">{s.l}</p>
              </div>
            ))}
          </div>

          {/* tabel riwayat */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">Riwayat stringing</h2>
            </div>
            {h.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Belum ada riwayat untuk nomor ini. Yuk cari rekomendasi senar pertamamu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                      <th className="px-5 py-3">Tanggal</th>
                      <th className="px-5 py-3">Senar</th>
                      <th className="px-5 py-3">Tarikan</th>
                      <th className="px-5 py-3">Raket</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.map((x) => (
                      <tr key={x.code} className="border-b border-gray-50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 text-gray-500">
                          {new Date(x.date).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-900">{x.senar ?? "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-gray-700">{x.tension ? `${x.tension}${x.tensionCross ? `/${x.tensionCross}` : ""} lbs` : "—"}</td>
                        <td className="px-5 py-3 text-gray-700">{x.racket ?? "—"}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge(x.status)}`}>{x.statusLabel}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- LOADING ----------
  if (phase === "loading") {
    return (
      <Shell>
        <div className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="mt-4 text-gray-600">Menghitung rekomendasi…</p>
        </div>
      </Shell>
    );
  }

  // ---------- QUIZ ----------
  if (phase === "quiz") {
    const cur = answers[q.id];
    const multiSel = Array.isArray(cur) ? cur : [];
    const showConflict = q.conflict_note && q.conflict_note.pair.every((p) => multiSel.includes(p));
    return (
      <Shell>
        <div className="mx-auto max-w-xl">
          {/* progress */}
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-xs font-medium text-gray-500">
              <span>Pertanyaan {step + 1} dari {questions.length}</span>
              <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900">{q.text}</h2>
          {q.helper && <p className="mt-1 text-sm text-gray-500">{q.helper}</p>}

          <div className="mt-5 space-y-2.5">
            {q.options.map((o) => {
              const isMulti = q.type === "multi";
              const selected = isMulti ? multiSel.includes(o.value) : cur === o.value;
              const order = isMulti ? multiSel.indexOf(o.value) : -1;
              return (
                <button
                  key={o.value}
                  onClick={() => (isMulti ? toggleMulti(q.id, o.value, q.max ?? 2) : setSingle(q.id, o.value))}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                    selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    selected ? "border-primary bg-primary text-white" : "border-gray-300 text-transparent"
                  }`}>
                    {isMulti && selected ? order + 1 : "✓"}
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900">{o.label}</span>
                    {o.hint && <span className="block text-sm text-gray-500">{o.hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {showConflict && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{q.conflict_note!.text}</p>}
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => (step === 0 ? setPhase("identify") : setStep((s) => s - 1))}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              ← Kembali
            </button>
            {step < questions.length - 1 ? (
              <button disabled={!answered} onClick={() => setStep((s) => s + 1)} className="btn-green px-8 disabled:opacity-40">Lanjut</button>
            ) : (
              <button disabled={!answered} onClick={submit} className="btn-green px-8 disabled:opacity-40">Lihat rekomendasi</button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- RESULTS ----------
  if (phase === "results" && rec) {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">3 senar yang cocok untukmu</h1>
            <p className="mx-auto mt-2 max-w-2xl text-gray-600">{rec.profile_summary}</p>
            {rec.racket_label && rec.racket_string_note ? (
              <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
                Disesuaikan dengan raket <span className="font-medium text-gray-700">{rec.racket_label}</span> — {rec.racket_string_note}.
              </p>
            ) : null}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {rec.picks.map((p, i) => (
              <div key={p.name} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${i === 0 ? "border-primary ring-1 ring-primary" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i === 0 ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>{RANK_LABEL[i]}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold leading-tight text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500">{p.material}{p.gauge ? ` • ${p.gauge} mm` : ""}</p>

                <div className="mt-4 space-y-1.5">
                  {ATTRS.map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs text-gray-500">{ATTR_LABEL[k]}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${p.attrs[k] ?? 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {p.explanation.strengths.map((s) => (
                    <p key={s.attr} className="text-gray-700"><span className="font-semibold text-primary">+ {ATTR_LABEL[s.attr]}:</span> {s.text}</p>
                  ))}
                  {p.explanation.weakness.attr && (
                    <p className="text-gray-500"><span className="font-semibold">− {ATTR_LABEL[p.explanation.weakness.attr]}:</span> {p.explanation.weakness.text}</p>
                  )}
                  {p.explanation.notes.map((n, j) => <p key={j} className="text-xs text-gray-400">{n}</p>)}
                </div>

                {p.variants && p.variants.length ? (
                  <div className="mt-auto pt-4">
                    <p className="text-xs font-medium text-gray-500">Pilih warna/varian:</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.variants.map((v) => (
                        <button
                          key={v.label}
                          onClick={() => pickManual({ name: p.name, material: p.material, gauge: p.gauge, price: p.price, photo: null, st: null, sp: null, er: null, variants: [] }, v)}
                          className="rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                        >
                          {v.label || "Pilih"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setChosen(i);
                      setManualPick(null); setManualKind(null); // kembali ke rekomendasi, batalkan pilih-sendiri
                      // saran tarikan dari server; senar polyester dimainkan lebih enak −2 lbs
                      const poly = /poly/i.test(p.material);
                      const sug = Math.max(40, rec.tension_suggestion - (poly ? 2 : 0));
                      setTension(String(sug)); // Main
                      setTensionCross(String(Math.max(40, sug - 2))); // Cross biasanya −2
                      setPhase("order");
                    }}
                    className={`mt-auto w-full rounded-full px-4 py-2.5 text-sm font-semibold transition ${i === 0 ? "btn-green" : "border border-primary text-primary hover:bg-primary/5"}`}
                  >
                    Pilih senar ini
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button onClick={() => { setPhase("quiz"); setStep(0); }} className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-gray-400 hover:text-gray-900">← Ulangi kuesioner</button>
            <button onClick={openCatalog} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Pilih senar sendiri →</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- ORDER (pilih + WhatsApp) ----------
  if (phase === "order" && rec && selected) {
    const p = selected;
    return (
      <Shell>
        <div className="mx-auto max-w-md">
          <button onClick={() => setPhase(manualKind === "hybrid" ? "hybrid" : rec.picks.length ? "results" : "catalog")} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Ganti pilihan</button>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Senar pilihanmu{manualPick ? (manualKind === "hybrid" ? " (hybrid)" : " (pilih sendiri)") : ""}</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">{p.name}</h2>
            <p className="text-sm text-gray-500">{p.material}{p.gauge ? ` • ${p.gauge} mm` : ""}</p>
            {racketStr ? <p className="mt-1 text-sm text-gray-500">Raket: <span className="font-medium text-gray-700">{racketStr}</span></p> : null}

            <div className="mt-5 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Tarikan senar ({unit})</label>
                  <div className="inline-flex rounded-lg border border-gray-300 p-0.5 text-xs font-semibold">
                    {(["lbs", "kg"] as const).map((u) => (
                      <button key={u} type="button" onClick={() => changeUnit(u)} className={`rounded-md px-3 py-1 transition ${unit === u ? "bg-primary text-white" : "text-gray-600 hover:text-gray-900"}`}>
                        {u === "lbs" ? "LBS" : "Kg"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-1 flex gap-3">
                  <div>
                    <input value={tension} onChange={onTension(setTension)} inputMode="decimal" className="field w-28" placeholder="Main" />
                    <p className="mt-1 text-center text-xs font-medium text-gray-500">Main ({unit})</p>
                  </div>
                  <div>
                    <input value={tensionCross} onChange={onTension(setTensionCross)} inputMode="decimal" className="field w-28" placeholder="Cross" />
                    <p className="mt-1 text-center text-xs font-medium text-gray-500">Cross ({unit})</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Sudah kami isi otomatis (Cross biasanya sedikit lebih rendah dari Main) — {rec.tension_note}. Kamu bisa ubah sesuai selera.
                </p>
                {rec.racket_label && rec.tension_racket_note ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Disesuaikan dengan raket <span className="font-medium text-gray-700">{rec.racket_label}</span> — {rec.tension_racket_note}.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Konfirmasi dikirim ke WhatsApp <span className="font-semibold text-gray-900">{wa || "—"}</span>
              {nama ? ` • a.n. ${nama}` : ""}
            </div>

            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

            <div className="mt-5">
              <button onClick={submitOrder} disabled={submitting || !wa.trim()} className="btn-green w-full py-3 disabled:opacity-40">
                {submitting ? "Mengirim…" : "Mulai stringing"}
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- HYBRID (main & cross beda senar) ----------
  if (phase === "hybrid") {
    return (
      <Shell>
        <div className="mx-auto max-w-md">
          <button onClick={() => { setPhase("choice"); setErr(""); }} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Kembali</button>
          <h1 className="text-2xl font-extrabold text-gray-900">Hybrid String</h1>
          <p className="mt-2 text-sm text-gray-600">Pasang senar berbeda untuk main & cross. Tulis senar tiap sisi, lalu atur tarikan main & cross di langkah berikutnya.</p>
          <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <label className="label">Senar Main <span className="text-red-500">*</span></label>
              <input value={hybridMain} onChange={(e) => setHybridMain(e.target.value)} autoFocus className="field" placeholder="mis. Luxilon ALU Power 125" />
            </div>
            <div>
              <label className="label">Senar Cross <span className="text-red-500">*</span></label>
              <input value={hybridCross} onChange={(e) => setHybridCross(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") startHybrid(); }} className="field" placeholder="mis. Babolat VS Touch 130" />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button onClick={startHybrid} disabled={!hybridMain.trim() || !hybridCross.trim()} className="btn-green w-full py-3 disabled:opacity-40">Lanjut → atur tarikan</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- KATALOG (pilih senar sendiri) ----------
  if (phase === "catalog") {
    const term = catalogSearch.trim().toLowerCase();
    const list = (catalog ?? []).filter((s) => !term || s.name.toLowerCase().includes(term) || s.material.toLowerCase().includes(term));
    return (
      <Shell>
        <div className="mx-auto max-w-5xl">
          <button onClick={() => setPhase(selected ? "order" : rec && rec.picks.length ? "results" : "choice")} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Kembali</button>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Pilih senar sendiri</h1>
          <p className="mt-1 text-gray-600">Semua senar di toko. Pilih satu, lalu langsung lanjut stringing.</p>
          <input
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Cari nama atau bahan senar…"
            className="field mt-4 w-full max-w-md"
          />
          {/* Senar di luar katalog: ketik manual (capsule) */}
          <div className="mt-3 flex w-full max-w-md items-center gap-2 rounded-full border border-gray-300 bg-white py-1 pl-4 pr-1 focus-within:border-primary">
            <input
              value={catalogManual}
              onChange={(e) => setCatalogManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") pickManualName(); }}
              placeholder="Senar tidak ada di katalog? Ketik di sini…"
              className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
            <button onClick={pickManualName} disabled={!catalogManual.trim()} className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40">Pakai</button>
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          {catalogLoading ? (
            <p className="mt-10 text-center text-gray-400">Memuat katalog senar…</p>
          ) : list.length === 0 ? (
            <p className="mt-10 text-center text-gray-400">Senar tidak ditemukan.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {list.map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-md"
                >
                  <div className="aspect-square w-full bg-gray-50">
                    {s.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photo} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-300">Tanpa foto</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="text-sm font-bold leading-tight text-gray-900">{s.name}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{s.material}{s.gauge ? ` • ${s.gauge} mm` : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                      {s.st != null && <span>Kekakuan {Math.round(s.st)}</span>}
                      {s.sp != null && <span>Spin {Math.round(s.sp)}</span>}
                      {s.er != null && <span>Energi {Math.round(s.er)}%</span>}
                    </div>
                    {s.variants.length ? (
                      <div className="mt-auto pt-2">
                        <p className="text-[11px] font-medium text-gray-500">Pilih varian/gauge:</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {s.variants.map((v) => (
                            <button
                              key={v.label}
                              onClick={() => pickManual(s, v)}
                              className="rounded-full border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary hover:text-white"
                            >
                              {v.label || "Pilih"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => pickManual(s)} className="btn-green mt-auto py-1.5 text-center text-xs">Pilih senar ini</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ---------- DONE ----------
  if (phase === "done" && rec && selected) {
    const p = selected;
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-extrabold text-gray-900">Pesanan diterima!</h1>
          <p className="mt-2 text-gray-600">
            Senar <strong>{p.name}</strong>{tension ? <> · tarikan <strong>Main {tension}{tensionCross ? ` / Cross ${tensionCross}` : ""} {unit}</strong></> : null}{racketStr ? <> · raket <strong>{racketStr}</strong></> : null}.
          </p>

          {/* Kode pesanan — buat referensi & ambil raket */}
          <div className="mt-5 rounded-2xl border-2 border-primary bg-primary/5 px-6 py-5">
            <p className="text-sm font-semibold text-primary">Kode pesananmu</p>
            <p className="mt-1 text-3xl font-extrabold tracking-wider text-primary">{rec.code}</p>
            <p className="mt-1 text-xs text-gray-500">Simpan kode ini untuk ambil raket.</p>
          </div>

          <div className="mt-4 rounded-xl bg-green-50 px-5 py-3 text-sm text-green-800">
            Detail resep juga sudah dikirim ke WhatsApp <strong>{wa}</strong>. Kami kabari lagi begitu senar selesai dipasang.
          </div>
          <div className="mt-8">
            <button onClick={resetAll} className="rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-700">
              Selesai — mulai dari awal
            </button>
            <p className="mt-3 text-xs text-gray-400">Otomatis kembali ke awal dalam {resetIn} detik</p>
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-site px-4 py-10 sm:py-14">{children}</section>;
}
