"use client";
import { useMemo, useState } from "react";
import type { Item, Kat } from "@/lib/compare-shared";
import { KRITERIA, LABEL_ARAH, TUJUAN, beratRaket, upgrade, type Arah } from "@/lib/match";
import Kartu from "./Kartu";

const NAMA: Record<Kat, string> = { raket: "raket", senar: "senar", sepatu: "sepatu" };
const BERAT = [250, 260, 270, 280, 290, 300, 310, 320, 330, 340];

/** Mode Optimise: pilih yang dipakai sekarang → atur arah per kriteria → pengganti yang naik tanpa turun di sumbu lain. */
export default function MatchOptimize({ kat, items }: { kat: Kat; items: Item[] }) {
  const lab = useMemo(() => items.filter((x) => Object.keys(x.nilai).length), [items]);
  const [cur, setCur] = useState<Item | null>(null);
  const [q, setQ] = useState("");
  const [arah, setArah] = useState<Arah>({});
  const [berat, setBerat] = useState<[number, number] | null>(null);
  const cari = q.trim().toLowerCase();
  const daftar = cari ? lab.filter((x) => `${x.nama} ${x.varian}`.toLowerCase().includes(cari)).slice(0, 8) : [];
  const hasil = useMemo(() => (cur ? upgrade(cur, arah, items, kat === "raket" ? berat ?? undefined : undefined) : []), [cur, arah, items, kat, berat]);
  const adaArah = Object.values(arah).some(Boolean);

  const pilihCur = (x: Item) => {
    setCur(x); setQ(""); setArah({});
    const g = kat === "raket" ? beratRaket(x) : null;
    setBerat(g ? [Math.max(250, Math.round((g - 15) / 10) * 10), Math.min(340, Math.round((g + 15) / 10) * 10)] : null);
  };
  const Nomor = ({ n }: { n: number }) => <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ball text-sm font-bold text-gray-900">{n}</span>;

  return (
    <div className="space-y-5">
      {/* 1. Yang dipakai sekarang */}
      <section className="rounded-3xl border border-white bg-white/80 p-4 backdrop-blur-xl sm:p-6">
        <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-950"><Nomor n={1} />{NAMA[kat][0].toUpperCase() + NAMA[kat].slice(1)} yang kamu pakai sekarang</h2>
        {cur ? (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-50">
              {cur.foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cur.foto} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{cur.nama}{cur.varian && <span className="font-normal text-gray-500"> · {cur.varian}</span>}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {KRITERIA[kat].map((k) => cur.nilai[k] != null && <span key={k} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{k} <b className="text-gray-950">{cur.nilai[k]}</b></span>)}
              </div>
            </div>
            <button onClick={() => setCur(null)} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-gray-900">Ganti</button>
          </div>
        ) : (
          <div className="relative mt-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={kat === "raket" ? "Contoh: Wilson Blade, Babolat Pure Drive…" : kat === "senar" ? "Contoh: Solinco Hyper-G, Luxilon Alu Power…" : "Contoh: Asics Gel Resolution, Nike Vapor…"} className="w-full rounded-full border-2 border-ball/70 bg-white px-5 py-3.5 text-base outline-none focus:border-ball" autoFocus />
            {cari && (
              <ul className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl">
                {daftar.length ? daftar.map((x) => (
                  <li key={x.id}>
                    <button onClick={() => pilihCur(x)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gray-50">
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                        {x.foto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={x.foto} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="text-sm text-gray-900">{x.nama}{x.varian && <span className="text-gray-500"> · {x.varian}</span>}</span>
                    </button>
                  </li>
                )) : <li className="p-4 text-center text-sm text-gray-500">Belum ada di data lab kami. Coba nama lain, atau pakai mode Cari yang ideal.</li>}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        {/* 2. Mau ditingkatkan apa */}
        <section className="rounded-3xl border border-white bg-white/80 p-4 backdrop-blur-xl sm:p-6">
          <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-950"><Nomor n={2} />Mau ditingkatkan apa?</h2>
          <p className="mt-2 text-sm text-gray-500">Pilih tujuan cepat atau atur sendiri lewat slider. Hasil di sebelah langsung berubah.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TUJUAN[kat].map((t) => {
              const on = JSON.stringify(t.arah) === JSON.stringify(Object.fromEntries(Object.entries(arah).filter(([, v]) => v)));
              return <button key={t.label} onClick={() => setArah(on ? {} : t.arah)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${on ? "bg-neutral-950 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>{t.label}</button>;
            })}
          </div>
          {kat === "raket" && berat && (
            <div className="mt-5 rounded-2xl bg-ball/15 p-3.5">
              <p className="text-sm font-semibold text-gray-900">Berat (tanpa senar)</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                {[0, 1].map((n) => (
                  <select key={n} value={berat[n]} onChange={(e) => { const b: [number, number] = [...berat]; b[n] = +e.target.value; setBerat(b[0] <= b[1] ? b : [b[1], b[0]]); }} aria-label={n ? "Berat maksimal" : "Berat minimal"} className="flex-1 rounded-full border border-gray-200 bg-white px-3 py-2">
                    {BERAT.map((g) => <option key={g} value={g}>{g} g</option>)}
                  </select>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 space-y-4">
            {KRITERIA[kat].map((k) => (
              <label key={k} className="block">
                <span className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">{k}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${arah[k] ? "bg-emerald-50 font-semibold text-emerald-700" : "text-gray-400"}`}>{LABEL_ARAH[String(arah[k] ?? 0)]}</span>
                </span>
                <input type="range" min={-2} max={2} step={1} value={arah[k] ?? 0} onChange={(e) => setArah({ ...arah, [k]: +e.target.value })} className="mt-2 w-full accent-[#146b52]" />
                <span className="flex justify-between px-0.5 text-[10px] text-gray-400"><span>−−</span><span>−</span><span>=</span><span>+</span><span>++</span></span>
              </label>
            ))}
          </div>
          {adaArah && <button onClick={() => setArah({})} className="mt-5 w-full rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 hover:border-gray-900">Reset</button>}
        </section>

        {/* 3. Rekomendasi */}
        <section className="rounded-3xl border border-white bg-white/80 p-4 backdrop-blur-xl sm:p-6">
          <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-950"><Nomor n={3} />Rekomendasi pengganti</h2>
          {!cur || !adaArah ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 px-6 py-14 text-center">
              <p className="font-semibold text-gray-900">{!cur ? `Pilih ${NAMA[kat]} kamu dulu` : "Pilih yang ingin ditingkatkan"}</p>
              <p className="mt-1 text-sm text-gray-500">{!cur ? `Cari ${NAMA[kat]} yang kamu pakai di kolom atas.` : "Klik tujuan cepat atau geser slider."}</p>
            </div>
          ) : !hasil.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 px-6 py-14 text-center">
              <p className="font-semibold text-gray-900">Belum ada {NAMA[kat]} ready yang lebih baik ke arah ini</p>
              <p className="mt-1 text-sm text-gray-500">{NAMA[kat][0].toUpperCase() + NAMA[kat].slice(1)} kamu sudah kuat di sini. Coba kurangi target atau ubah arah lain.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {hasil.map((u) => (
                <Kartu key={u.it.id} it={u.it} kat={kat} atas={<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.bintang === 3 ? "bg-emerald-600 text-white" : u.bintang === 2 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{u.label}</span>}>
                  <table className="mt-4 w-full text-xs">
                    <caption className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Setelah ganti</caption>
                    <tbody>
                      {KRITERIA[kat].map((k) => {
                        const a = cur.nilai[k], b = u.it.nilai[k];
                        if (a == null || b == null) return null;
                        const d = b - a, t = arah[k];
                        return (
                          <tr key={k} className={t ? "bg-ball/15" : ""}>
                            <td className={`py-1.5 pl-2 ${t ? "rounded-l-lg font-semibold text-gray-900" : "text-gray-600"}`}>{k}</td>
                            <td className="py-1.5 text-right tabular-nums text-gray-400">{a}</td>
                            <td className="px-1 text-center text-gray-300">→</td>
                            <td className="py-1.5 tabular-nums font-semibold text-gray-900">{b}</td>
                            <td className={`py-1.5 pr-2 text-right tabular-nums ${t ? "rounded-r-lg" : ""} ${d > 0 ? "text-emerald-700" : d < 0 ? "text-red-600" : "text-gray-400"}`}>{d > 0 ? `+${d}` : d}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Kartu>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
