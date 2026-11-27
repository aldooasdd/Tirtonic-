import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isKat, type Kat } from "@/lib/compare-shared";
import { itemsMatch } from "@/lib/match-data";
import MatchFind from "@/components/match/MatchFind";
import MatchOptimize from "@/components/match/MatchOptimize";
import Footer from "@/components/Footer";

const NAMA: Record<Kat, string> = { raket: "Raket", senar: "Senar", sepatu: "Sepatu" };
const JUDUL = {
  find: (k: Kat) => `Cari ${NAMA[k].toLowerCase()} tenis yang cocok dengan gayamu`,
  optimize: (k: Kat) => `Upgrade ${NAMA[k].toLowerCase()} kamu ke langkah yang tepat`,
};
const SUB = {
  find: "Jawab beberapa pertanyaan singkat. Tirtonic Match mencocokkan jawabanmu dengan data uji lab, lalu memilih 3 yang paling pas.",
  optimize: "Pilih yang kamu pakai sekarang, tentukan apa yang mau ditingkatkan. Kami cari pengganti yang naik di situ tanpa turun di aspek lain.",
};
type Mode = keyof typeof JUDUL;
const isMode = (m: string): m is Mode => m in JUDUL;

export function generateMetadata({ params }: { params: { kat: string; mode: string } }): Metadata {
  if (!isKat(params.kat) || !isMode(params.mode)) return {};
  return { title: `${JUDUL[params.mode](params.kat)} — Tirtonic Match`, description: SUB[params.mode], alternates: { canonical: `/match/${params.kat}/${params.mode}` } };
}

export default async function MatchPage({ params }: { params: { kat: string; mode: string } }) {
  const { kat, mode } = params;
  if (!isKat(kat) || !isMode(mode)) notFound();
  const items = await itemsMatch(kat);
  const lain = mode === "find" ? "optimize" : "find";
  return (
    <>
      <div className="relative overflow-x-clip bg-[#f7f9fb] [letter-spacing:-0.011em]">
        <div aria-hidden className="ev-orb -top-24 left-0 h-[300px] w-[640px] bg-gradient-to-r from-lime-300/35 via-emerald-300/25 to-sky-300/30" />
        <div aria-hidden className="ev-orb right-0 top-40 hidden h-[340px] w-[340px] bg-gradient-to-bl from-teal-200/40 to-blue-200/30 sm:block" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <Link href="/match" className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-800 hover:border-gray-900">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Tirtonic Match
            </Link>
            <Link href={`/match/${kat}/${lain}`} className="rounded-full px-3 py-1.5 font-semibold text-gray-500 hover:text-gray-950">
              {mode === "find" ? `Sudah punya ${NAMA[kat].toLowerCase()}? Upgrade →` : "Mulai dari nol? Cari yang ideal →"}
            </Link>
          </nav>
          <header className="mb-8 max-w-3xl">
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-950 sm:text-5xl">{JUDUL[mode](kat)}</h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">{SUB[mode]}</p>
          </header>
          {mode === "find" ? <MatchFind kat={kat} items={items} /> : <MatchOptimize kat={kat} items={items} />}
          <p className="mt-10 text-center text-xs text-gray-400">Data: Tirtoniclab, dihimpun dari hasil uji lab independen. Hanya produk ready dengan data lab yang direkomendasikan.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
