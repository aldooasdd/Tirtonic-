import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { katBySlug, saring, readyRow } from "@/lib/shop-kat";
import { rowsKategori, jumlahKategori, kartu } from "@/lib/shop-kat-db";
import { safeQuery } from "@/lib/prisma";
import ShopTabs from "@/components/ShopTabs";
import ShopKategori from "@/components/ShopKategori";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";
type SP = Record<string, string | undefined>;

export function generateMetadata({ params }: { params: { kategori: string } }): Metadata {
  const k = katBySlug(params.kategori);
  return k ? { title: `${k.judul} — Tirtonic`, description: k.intro, alternates: { canonical: `/shop/${k.slug}` } } : {};
}

const TOP: Record<string, string[]> = {
  raket: ["Power", "Kontrol", "Spin", "Kenyamanan", "Manuver", "Stabilitas"],
  senar: ["Power", "Kontrol", "Spin", "Kenyamanan", "Tahan tension"],
  sepatu: ["Kenyamanan", "Stabilitas", "Ketahanan", "Dinamis"],
};

export default async function KategoriPage({ params, searchParams }: { params: { kategori: string }; searchParams: SP }) {
  const kat = katBySlug(params.kategori);
  if (!kat) notFound();
  const [rows, jumlah] = await Promise.all([safeQuery(() => rowsKategori(kat.db), []), safeQuery(() => jumlahKategori(), {})]);
  const { hasil, opsi } = saring(kat, rows, searchParams);
  const sort = searchParams.sort || "";
  const siap = rows.filter(readyRow).length;

  return (
    <>
      <section className="relative overflow-x-clip bg-gradient-to-b from-[#f7f9fb] to-white pb-8 pt-8 sm:pb-12 sm:pt-14 [letter-spacing:-0.011em]">
        <div aria-hidden className="ev-orb -top-32 left-1/2 h-[300px] w-[680px] -translate-x-1/2 bg-gradient-to-r from-lime-300/35 via-emerald-300/25 to-sky-300/30" />
        <div aria-hidden className="ev-orb right-6 top-24 hidden h-[300px] w-[300px] bg-gradient-to-bl from-teal-200/40 to-blue-200/30 sm:block" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="ev-pill mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-[600] text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            {siap} ready · {rows.length} produk
          </div>
          <h1 className="text-4xl font-[600] leading-[1.08] tracking-[-0.03em] text-neutral-950 sm:text-5xl md:text-[56px]">{kat.judul}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">{kat.intro}</p>
          <details className="group mx-auto mt-3 max-w-2xl">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-sm font-[600] text-neutral-900 outline-none">
              <span className="group-open:hidden">Baca selengkapnya</span><span className="hidden group-open:inline">Tutup</span>
              <svg className="h-4 w-4 transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </summary>
            <p className="mt-3 text-left text-[15px] leading-relaxed text-neutral-600 sm:text-center">{kat.lebih}</p>
            {kat.lab && <p className="mt-2 text-[15px] text-neutral-600">Bandingkan detail sampai 4 produk di <Link href={`/bandingkan?k=${kat.lab}`} className="font-[600] text-emerald-700 underline underline-offset-2">Compare</Link>.</p>}
          </details>
          {kat.lab && (
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {TOP[kat.lab].map((k) => {
                const on = sort === `lab_${k}`;
                const q = new URLSearchParams(Object.entries(searchParams).filter(([a, v]) => a !== "sort" && v) as [string, string][]);
                if (!on) q.set("sort", `lab_${k}`);
                return (
                  <Link key={k} href={`/shop/${kat.slug}${q.toString() ? `?${q}` : ""}`} scroll={false} className={`rounded-full px-4 py-2 text-sm font-[600] transition active:scale-95 ${on ? "ev-btn border border-white/20 bg-neutral-950 text-white" : "ev-pill text-neutral-800 hover:bg-white"}`}>
                    Top {k.toLowerCase()}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ShopTabs aktif={kat.slug} jumlah={jumlah} />

      <div className="mx-auto max-w-[1600px] px-4 pb-10">
        <div className="mt-8">
          <Suspense fallback={null}>
            <ShopKategori slug={kat.slug} grup={opsi} produk={hasil.map(kartu)} total={hasil.length} lab={!!kat.lab} />
          </Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
