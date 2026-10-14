"use client";

import { useEffect, useState } from "react";
import { RACKET_TYPES, racketLabel, type RacketType } from "@/lib/string-finder/racket";

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
  const [phase, setPhase] = useState<"intro" | "identify" | "choice" | "dashboard" | "quiz" | "loading" | "results" | "order" | "catalog" | "done">("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [rec, setRec] = useState<RecResponse | null>(null);
  const [askTeam, setAskTeam] = useState(false); // gate password "Tirtonic Team"
  const [teamPw, setTeamPw] = useState("");
  const [err, setErr] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  // Konsep raket: customer isi head size (in²) + jenis raket (power/spin/control).
  const [racketHead, setRacketHead] = useState("");
  const [racketTypes, setRacketTypes] = useState<RacketType[]>([]);
  const [tension, setTension] = useState(""); // Main
  const [tensionCross, setTensionCross] = useState(""); // Cross
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistItem[] | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  // "Pilih senar sendiri": katalog semua senar + senar yang dipilih manual (di luar 3 rekomendasi).
  const [manualPick, setManualPick] = useState<SenarCard | null>(null);
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
    setRacketTypes([]); setAskTeam(false); setTeamPw("");
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
  const racketStr = racketLabel({ head: Number.isFinite(headNum) ? headNum : null, types: racketTypes.length ? racketTypes : null });

  const q = questions[step];

  function startQuiz() {
    if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; }
    setErr("");
    setPhase("quiz");
    setStep(0);
  }

  // "Tirtonic Team": kasir pilih senar manual (tanpa mesin rekomendasi).
  // Bikin kode order minimal dulu, lalu langsung ke katalog senar.
  async function startManual() {
    if (teamPw.trim() !== "123") { setErr("Password Tirtonic Team salah."); return; }
    if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; }
    setErr(""); setPhase("loading");
    try {
      const res = await fetch("/api/sf/manual", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai.");
      setRec({ code: data.code, condition: "manual", profile_summary: "", picks: [], tension_suggestion: data.tension_suggestion ?? 50, tension_note: "", racket_label: null, tension_racket_note: null, racket_string_note: null });
      await openCatalog();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setPhase("choice");
    }
  }

  async function loadHistoryAndContinue() {
    if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; }
    setErr("");
    setHistLoading(true);
    try {
      const res = await fetch(`/api/sf/history?phone=${encodeURIComponent(wa)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nomor WhatsApp tidak valid.");
      setHistory(data.history as HistItem[]);
      if (!nama.trim() && data.lastName) setNama(data.lastName as string);
      setPhase("dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setHistLoading(false);
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
        body: JSON.stringify({ answers, racketHead: Number.isFinite(headNum) ? headNum : null, racketType: racketTypes }),
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
  function applyTension(material: string) {
    if (!rec) return;
    const sug = Math.max(40, rec.tension_suggestion - (/poly/i.test(material) ? 2 : 0));
    setTension(String(sug));
    setTensionCross(String(Math.max(40, sug - 2)));
  }

  async function openCatalog() {
    setErr("");
    setPhase("catalog");
    if (catalog) return;
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
    applyTension(pick.material);
    setPhase("order");
  }

  async function submitOrder() {
    if (!rec || !selected) return;
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch("/api/sf/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: rec.code, chosenRank: manualPick ? undefined : (chosen! + 1), chosenString: selected.name, price: selected.price ?? undefined, phone: wa, customerName: nama, racket: racketStr ?? undefined, tensionLbs: tension ? parseInt(tension, 10) : undefined, tensionCrossLbs: tensionCross ? parseInt(tensionCross, 10) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pesanan.");
      setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
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
          <h1 className="text-2xl font-extrabold text-gray-900">Sebelum mulai</h1>
          <p className="mt-2 text-sm text-gray-600">Isi nama & nomor WhatsApp. Kami pakai untuk mengabari saat senar selesai, dan menampilkan riwayat stringing kamu sebelumnya.</p>

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
            <div>
              <label className="label">Jenis raket <span className="text-gray-400">(opsional)</span></label>
              <div className="flex flex-wrap gap-2">
                {RACKET_TYPES.map((t) => {
                  const on = racketTypes.includes(t.key);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setRacketTypes((cur) => (on ? cur.filter((x) => x !== t.key) : [...cur, t.key]))}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        on ? "border-primary bg-primary text-white" : "border-gray-300 text-gray-700 hover:border-primary"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-400">Boleh pilih lebih dari satu (mis. Spin + Control). Memengaruhi rekomendasi senar & tarikan.</p>
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="space-y-2">
              <button onClick={() => { if (!wa.trim()) { setErr("Isi nomor WhatsApp dulu ya."); return; } setErr(""); setPhase("choice"); }} disabled={!wa.trim()} className="btn-green w-full py-3 disabled:opacity-40">
                Langsung cari senar →
              </button>
              <button onClick={loadHistoryAndContinue} disabled={histLoading || !wa.trim()} className="w-full rounded-full border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                {histLoading ? "Mengecek…" : "Lihat riwayat stringing"}
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
        <div className="mx-auto max-w-md">
          <button onClick={() => { setPhase("identify"); setErr(""); }} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Kembali</button>
          <h1 className="text-2xl font-extrabold text-gray-900">Mau pakai yang mana?</h1>
          <p className="mt-2 text-gray-600">Pilih cara menentukan senar.</p>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

          <div className="mt-6 space-y-3">
            <button
              onClick={startQuiz}
              className="block w-full rounded-2xl border-2 border-primary bg-primary/5 px-6 py-5 text-left transition hover:bg-primary/10"
            >
              <p className="text-lg font-extrabold text-primary">String Finder</p>
              <p className="mt-1 text-sm text-gray-600">Jawab beberapa pertanyaan, dapat 3 rekomendasi senar yang pas. Untuk customer.</p>
            </button>

            {askTeam ? (
              <div className="rounded-2xl border-2 border-gray-300 px-6 py-5">
                <p className="text-lg font-extrabold text-gray-900">Tirtonic Team</p>
                <p className="mt-1 text-sm text-gray-600">Masukkan password untuk lanjut pilih senar sendiri.</p>
                <input
                  type="password"
                  value={teamPw}
                  onChange={(e) => setTeamPw(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") startManual(); }}
                  autoFocus
                  placeholder="Password"
                  className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
                <button onClick={startManual} className="btn-green mt-3 w-full py-2.5">Lanjut →</button>
              </div>
            ) : (
              <button
                onClick={() => { setErr(""); setAskTeam(true); }}
                className="block w-full rounded-2xl border-2 border-gray-300 px-6 py-5 text-left transition hover:border-gray-400 hover:bg-gray-50"
              >
                <p className="text-lg font-extrabold text-gray-900">Tirtonic Team</p>
                <p className="mt-1 text-sm text-gray-600">Langsung pilih senar sendiri dari katalog, tanpa mesin rekomendasi. Untuk kasir.</p>
              </button>
            )}
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
                      setManualPick(null); // kembali ke rekomendasi, batalkan pilih-sendiri
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

          <div className="mt-8 text-center">
            <button onClick={() => { setPhase("quiz"); setStep(0); }} className="text-sm font-semibold text-gray-500 hover:text-gray-900">Ulangi kuesioner</button>
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
          <button onClick={() => setPhase(rec.picks.length ? "results" : "catalog")} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Ganti pilihan</button>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Senar pilihanmu{manualPick ? " (pilih sendiri)" : ""}</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">{p.name}</h2>
            <p className="text-sm text-gray-500">{p.material}{p.gauge ? ` • ${p.gauge} mm` : ""}</p>
            {racketStr ? <p className="mt-1 text-sm text-gray-500">Raket: <span className="font-medium text-gray-700">{racketStr}</span></p> : null}

            <div className="mt-5 space-y-3">
              <div>
                <label className="label">Tarikan senar (lbs)</label>
                <div className="flex gap-3">
                  <div>
                    <input value={tension} onChange={(e) => setTension(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="field w-28" placeholder="Main" />
                    <p className="mt-1 text-center text-xs font-medium text-gray-500">Main</p>
                  </div>
                  <div>
                    <input value={tensionCross} onChange={(e) => setTensionCross(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="field w-28" placeholder="Cross" />
                    <p className="mt-1 text-center text-xs font-medium text-gray-500">Cross</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Sudah kami isi otomatis (Cross biasanya 2 lbs lebih rendah dari Main) — {rec.tension_note}. Kamu bisa ubah sesuai selera.
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

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button onClick={submitOrder} disabled={submitting || !wa.trim()} className="btn-green flex-1 py-3 disabled:opacity-40">
                {submitting ? "Mengirim…" : "Mulai stringing"}
              </button>
              <button onClick={openCatalog} disabled={submitting} className="flex-1 rounded-full border border-primary py-3 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-40">
                Pilih senar sendiri
              </button>
            </div>
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
          <button onClick={() => setPhase(selected ? "order" : "choice")} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Kembali</button>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Pilih senar sendiri</h1>
          <p className="mt-1 text-gray-600">Semua senar di toko. Pilih satu, lalu langsung lanjut stringing.</p>
          <input
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Cari nama atau bahan senar…"
            className="field mt-4 w-full max-w-md"
          />
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
            Senar <strong>{p.name}</strong>{tension ? <> · tarikan <strong>Main {tension}{tensionCross ? ` / Cross ${tensionCross}` : ""} lbs</strong></> : null}{racketStr ? <> · raket <strong>{racketStr}</strong></> : null}.
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
