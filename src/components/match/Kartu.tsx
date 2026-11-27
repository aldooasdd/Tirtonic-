import Link from "next/link";
import { rupiah } from "@/lib/format";
import type { Item, Kat } from "@/lib/compare-shared";
import { KRITERIA } from "@/lib/match";

// Spek ringkas yang ditampilkan per kategori (kunci = nama spek di CompareItem.spek).
const SPEK: Record<Kat, [string, string][]> = {
  raket: [["Berat tanpa senar", "Berat"], ["Head size", "Head"], ["Pola senar", "Pola"], ["Balance", "Balance"]],
  senar: [["Tipe", "Tipe"], ["Gauge", "Gauge"], ["Bahan", "Bahan"]],
  sepatu: [["Lapangan", "Lapangan"], ["Lebar kaki", "Lebar kaki"], ["Berat (lab)", "Berat"]],
};
/** Ringkas nilai spek: head size jadi "100 in²", balance jadi cm, berat oz jadi gram. */
const pendek = (k: string, v: string) => {
  if (k === "Head size") { const m = v.match(/([\d.]+)\s*in/) ?? v.match(/\(([\d.]+)\s*in/) ?? v.match(/^(\d{2,3})$/); return m ? `${m[1]} in²` : v; }
  return v.replace(/^[\d.]+\s*in \/ ([\d.]+)\s*cm.*$/, "$1 cm").replace(/^[\d.]+\s*oz\s*\((\d+g)\)$/, "$1");
};

/** Lingkaran persen kecocokan. */
export function Cincin({ pct }: { pct: number }) {
  const r = 22, k = 2 * Math.PI * r;
  return (
    <span className="relative grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur" aria-label={`${pct}% cocok`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="#146b52" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(k * pct) / 100} ${k}`} />
      </svg>
      <span className="text-sm font-bold tabular-nums text-gray-900">{pct}<span className="text-[10px]">%</span></span>
    </span>
  );
}

/** Kartu produk hasil Match: foto, nama, harga, alasan, spek, bar skor lab. `atas` = badge di pojok foto. */
export default function Kartu({ it, kat, atas, alasan, children }: { it: Item; kat: Kat; atas?: React.ReactNode; alasan?: string; children?: React.ReactNode }) {
  const spek = SPEK[kat].filter(([k]) => it.spek[k]);
  return (
    <article className="flex flex-col rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_20px_45px_-25px_rgba(15,23,42,0.15)] sm:p-5">
      <Link href={it.href} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-gray-50">
        {it.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.foto} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        {atas && <span className="absolute right-3 top-3">{atas}</span>}
      </Link>
      <Link href={it.href} className="mt-4 line-clamp-2 text-base font-semibold leading-snug text-gray-900 hover:underline">
        {it.nama}{it.varian && <span className="font-normal text-gray-500"> · {it.varian}</span>}
      </Link>
      <p className="mt-1 text-lg font-bold text-gray-900">{rupiah(it.harga)}</p>
      {alasan && <p className="mt-3 rounded-2xl bg-gray-50 px-3.5 py-2.5 text-sm leading-relaxed text-gray-600">{alasan}</p>}
      {spek.length > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {spek.slice(0, 3).map(([k, l]) => (
            <div key={k} className="rounded-xl border border-gray-100 px-1 py-2">
              <dt className="text-[11px] text-gray-500">{l}</dt>
              <dd className="truncate text-xs font-semibold text-gray-900">{pendek(k, it.spek[k])}</dd>
            </div>
          ))}
        </dl>
      )}
      {children ?? (
        <ul className="mt-4 space-y-2">
          {KRITERIA[kat].map((k) => it.nilai[k] != null && (
            <li key={k} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="text-gray-600">{k}</span>
              <span className="h-1.5 rounded-full bg-gray-100"><span className="block h-1.5 rounded-full bg-primary" style={{ width: `${it.nilai[k]}%` }} /></span>
              <span className="text-right font-semibold tabular-nums text-gray-900">{it.nilai[k]}</span>
            </li>
          ))}
        </ul>
      )}
      <Link href={it.href} className="mt-5 rounded-full bg-neutral-950 py-3 text-center text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99]">Lihat produk</Link>
    </article>
  );
}
