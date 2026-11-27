"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Item, Kat } from "@/lib/compare-shared";
import { rekomendasi, urutan, type Jawab } from "@/lib/match";
import Kartu, { Cincin } from "./Kartu";
import { waLink } from "@/lib/format";

const NAMA: Record<Kat, string> = { raket: "raket", senar: "senar", sepatu: "sepatu" };

/** Mode Find: satu pertanyaan per layar → 3 rekomendasi dengan % kecocokan. */
export default function MatchFind({ kat, items }: { kat: Kat; items: Item[] }) {
  const [j, setJ] = useState<Jawab>({});
  const [i, setI] = useState(0);
  const [edit, setEdit] = useState(false); // sedang mengubah satu jawaban dari layar hasil
  const atas = useRef<HTMLDivElement>(null);
  const daftar = urutan(kat, j);
  const selesai = daftar.every((t) => j[t.id]);
  const tampilHasil = selesai && i >= daftar.length;
  const hasil = useMemo(() => (tampilHasil ? rekomendasi(kat, j, items) : []), [tampilHasil, kat, j, items]);

  const gulir = () => requestAnimationFrame(() => atas.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const pilih = (id: string, v: string) => {
    const baru = { ...j, [id]: v };
    // ganti prioritas → buang jawaban sub-pertanyaan lama
    if (id === "prioritas") for (const k of Object.keys(baru)) if (k.startsWith("sub_") && k !== `sub_${v}`) delete baru[k];
    setJ(baru);
    const d = urutan(kat, baru);
    const lanjut = edit ? d.findIndex((t) => !baru[t.id]) : i + 1;
    setI(lanjut < 0 ? d.length : lanjut);
    if (lanjut < 0) setEdit(false);
    gulir();
  };
  const t = daftar[i];

  return (
    <div ref={atas} className="scroll-mt-24">
      {!tampilHasil && t && (
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white bg-white/80 p-5 shadow-[0_20px_45px_-25px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={i + 1} aria-valuemax={daftar.length} aria-label="Langkah kuis">
              <div className="h-full rounded-full bg-ball transition-all duration-300" style={{ width: `${((i + 1) / daftar.length) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums text-gray-500">{i + 1} / {daftar.length}</span>
          </div>
          {i > 0 && (
            <button onClick={() => { setI(i - 1); gulir(); }} className="mt-5 inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-900">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Kembali
            </button>
          )}
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">{t.teks}</h2>
          <div className={`mt-6 grid gap-3 ${t.opsi.length === 2 ? "sm:grid-cols-2" : t.opsi.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
            {t.opsi.map((o) => {
              const on = j[t.id] === o.v;
              return (
                <button
                  key={o.v}
                  onClick={() => pilih(t.id, o.v)}
                  className={`group flex ${o.hint ? "min-h-[96px]" : "min-h-[64px]"} flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-[0.99] ${on ? "border-neutral-950 bg-neutral-950 text-white" : "border-gray-200 bg-white hover:border-gray-900"}`}
                >
                  <span className="text-base font-semibold">{o.label}</span>
                  {o.hint && <span className={`mt-2 text-sm leading-snug ${on ? "text-white/70" : "text-gray-500"}`}>{o.hint}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tampilHasil && (
        <div>
          <div className="rounded-3xl border border-white bg-white/80 p-4 backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Jawaban kamu</p>
              <button onClick={() => { setJ({}); setI(0); gulir(); }} className="rounded-full bg-neutral-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800">Ulangi</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {daftar.map((q, n) => (
                <button key={q.id} onClick={() => { setI(n); setEdit(true); gulir(); }} title={`Ubah: ${q.teks}`} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200">
                  {q.opsi.find((o) => o.v === j[q.id])?.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">{hasil.length ? `${hasil.length} ${NAMA[kat]} paling cocok untukmu` : `Belum ada ${NAMA[kat]} yang pas`}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {hasil.length ? `Dipilih dari ${items.filter((x) => x.ready && Object.keys(x.nilai).length).length} ${NAMA[kat]} ready yang punya data lab Tirtoniclab.` : "Coba naikkan budget atau ubah salah satu jawaban."}
            </p>
          </div>

          {hasil.length > 0 && (
            <>
              <div className="mt-8 flex flex-wrap justify-center gap-5 [&>*]:w-full md:[&>*]:w-[calc((100%-2.5rem)/3)]">
                {hasil.map((h) => <Kartu key={h.it.id} it={h.it} kat={kat} atas={<Cincin pct={h.pct} />} alasan={h.alasan} />)}
              </div>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {hasil.length > 1 && (
                  <Link href={`/bandingkan?k=${kat}&i=${hasil.map((h) => h.it.id).join(",")}`} className="rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:border-gray-900">
                    Bandingkan {hasil.length === 2 ? "keduanya" : "ketiganya"} di Compare
                  </Link>
                )}
                <a href={waLink(`Halo Tirtonic, saya dapat rekomendasi ${NAMA[kat]} dari Tirtonic Match: ${hasil.map((h) => h.it.nama).join(", ")}. Mau tanya lebih lanjut.`)} target="_blank" rel="noopener noreferrer" className="rounded-full px-6 py-3 text-sm font-semibold text-gray-700 hover:text-gray-950">
                  Masih ragu? Tanya admin
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
