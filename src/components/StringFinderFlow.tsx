"use client";

import { useState } from "react";

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
};
type RecResponse = { code: string; condition: string; profile_summary: string; picks: Pick[]; tension_suggestion: number; tension_note: string };

const ATTR_LABEL: Record<Attr, string> = {
  spin: "Spin", power: "Power", control: "Kontrol", comfort: "Nyaman", stability: "Stabil", durability: "Awet",
};
const ATTRS: Attr[] = ["spin", "power", "control", "comfort", "stability", "durability"];
const RANK_LABEL = ["Paling cocok", "Alternatif", "Alternatif"];

const rupiah = (n: number | null) => (n == null ? "—" : "Rp" + n.toLocaleString("id-ID"));

type HistItem = { code: string; senar: string | null; tension: number | null; racket: string | null; status: string; statusLabel: string; date: string };

export default function StringFinderFlow({ questions }: { questions: Question[] }) {
  const [phase, setPhase] = useState<"intro" | "identify" | "quiz" | "loading" | "results" | "order" | "done">("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [rec, setRec] = useState<RecResponse | null>(null);
  const [err, setErr] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [racket, setRacket] = useState("");
  const [tension, setTension] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<HistItem[] | null>(null);
  const [histLoading, setHistLoading] = useState(false);

  const q = questions[step];

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
      if (!racket.trim() && data.lastRacket) setRacket(data.lastRacket as string);
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
        body: JSON.stringify({ answers }),
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

  async function submitOrder() {
    if (!rec || chosen == null) return;
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch("/api/sf/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: rec.code, chosenRank: chosen + 1, phone: wa, customerName: nama, racket, tensionLbs: tension ? parseInt(tension, 10) : undefined }),
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
            Jawab 7 pertanyaan singkat, lalu kami tunjukkan 3 senar paling cocok lengkap dengan harga. Rekomendasi diambil
            dari hasil penelitian Tennis Warehouse University String Performance Database, yang disesuaikan dengan kebutuhan mainmu.
          </p>
          <button onClick={() => setPhase("identify")} className="btn-green mt-8 px-8 py-3 text-base">Mulai</button>
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
            {err && <p className="text-sm text-red-600">{err}</p>}

            {history === null ? (
              <button onClick={loadHistoryAndContinue} disabled={histLoading || !wa.trim()} className="btn-green w-full py-3 disabled:opacity-40">
                {histLoading ? "Mengecek…" : "Lanjut"}
              </button>
            ) : (
              <button onClick={() => { setPhase("quiz"); setStep(0); }} className="btn-green w-full py-3">
                Mulai cari rekomendasi →
              </button>
            )}
          </div>

          {history !== null && (
            <div className="mt-5">
              <h2 className="text-sm font-bold text-gray-900">Riwayat stringing kamu</h2>
              {history.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400">Belum ada riwayat untuk nomor ini.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {history.map((h) => (
                    <div key={h.code} className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">{h.senar ?? "—"}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {h.tension ? `${h.tension} lbs` : "tarikan –"}
                          {h.racket ? ` • ${h.racket}` : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(h.date).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} • {h.code}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{h.statusLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {rec.picks.map((p, i) => (
              <div key={p.name} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${i === 0 ? "border-primary ring-1 ring-primary" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i === 0 ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>{RANK_LABEL[i]}</span>
                  <span className="text-lg font-extrabold text-primary">{rupiah(p.price)}</span>
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

                <button
                  onClick={() => {
                    setChosen(i);
                    // saran tarikan dari server, dikurangi 2 lbs kalau senar polyester (main lebih enak)
                    const poly = /poly/i.test(p.material);
                    const sug = Math.max(40, rec.tension_suggestion - (poly ? 2 : 0));
                    setTension(String(sug));
                    setPhase("order");
                  }}
                  className={`mt-5 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition ${i === 0 ? "btn-green" : "border border-primary text-primary hover:bg-primary/5"}`}
                >
                  Pilih senar ini
                </button>
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
  if (phase === "order" && rec && chosen != null) {
    const p = rec.picks[chosen];
    return (
      <Shell>
        <div className="mx-auto max-w-md">
          <button onClick={() => setPhase("results")} className="mb-4 text-sm font-semibold text-gray-500 hover:text-gray-900">← Ganti pilihan</button>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Senar pilihanmu</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">{p.name}</h2>
            <p className="text-sm text-gray-500">{p.material}{p.gauge ? ` • ${p.gauge} mm` : ""} • <span className="font-semibold text-primary">{rupiah(p.price)}</span></p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="label">Jenis raket <span className="text-gray-400">(opsional)</span></label>
                <input value={racket} onChange={(e) => setRacket(e.target.value)} className="field" placeholder="mis. Yonex Ezone 100, Babolat Pure Drive" />
              </div>
              <div>
                <label className="label">Tarikan senar (lbs)</label>
                <input value={tension} onChange={(e) => setTension(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="field w-32" placeholder="lbs" />
                <p className="mt-1 text-xs text-gray-400">
                  Saran kami <span className="font-semibold text-primary">{rec.tension_suggestion} lbs</span> — {rec.tension_note}. Kamu bisa ubah sesuai selera.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Konfirmasi dikirim ke WhatsApp <span className="font-semibold text-gray-900">{wa || "—"}</span>
              {nama ? ` • a.n. ${nama}` : ""}
            </div>

            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

            <button onClick={submitOrder} disabled={submitting || !wa.trim()} className="btn-green mt-5 w-full py-3 disabled:opacity-40">
              {submitting ? "Mengirim…" : "Mulai stringing"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- DONE ----------
  if (phase === "done" && rec && chosen != null) {
    const p = rec.picks[chosen];
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">✅</div>
          <h1 className="mt-5 text-2xl font-extrabold text-gray-900">Pesanan diterima!</h1>
          <p className="mt-2 text-gray-600">
            Senar <strong>{p.name}</strong>{tension ? <> · tarikan <strong>{tension} lbs</strong></> : null}{racket ? <> · raket <strong>{racket}</strong></> : null} sedang disiapkan. Kami kabari lewat WhatsApp begitu selesai dipasang.
          </p>
          <div className="mt-5 inline-block rounded-xl border border-dashed border-gray-300 px-6 py-3">
            <p className="text-xs text-gray-500">Kode resep</p>
            <p className="text-2xl font-extrabold tracking-wider text-primary">{rec.code}</p>
          </div>
          <div className="mt-6">
            <a href={`/api/slip/${rec.code}?rank=${chosen + 1}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">Lihat / cetak resep →</a>
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
