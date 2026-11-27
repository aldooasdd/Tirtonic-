import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { katBySlug, saring } from "@/lib/shop-kat";
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

  return (
    <>
      <ShopTabs aktif={kat.slug} jumlah={jumlah} />
      <section className="relative overflow-x-clip pb-6 pt-8 sm:pb-8 sm:pt-10 [letter-spacing:-0.011em]">
        <div aria-hidden className="ev-orb -top-24 left-0 h-[260px] w-[620px] bg-gradient-to-r from-lime-300/35 via-emerald-300/25 to-sky-300/30" />
        <div aria-hidden className="ev-orb right-6 top-0 hidden h-[300px] w-[300px] bg-gradient-to-bl from-teal-200/40 to-blue-200/30 sm:block" />
        <div className="relative mx-auto grid max-w-[1400px] gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_minmax(0,40rem)] lg:items-end lg:gap-12">
          <div className="max-w-2xl">
          <h1 className="text-4xl font-[600] leading-[1.08] tracking-[-0.03em] text-neutral-950 sm:text-5xl md:text-[56px]">{kat.judul}</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">{kat.intro}</p>
          <details className="group mt-3">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-sm font-[600] text-neutral-900 outline-none">
              <span className="group-open:hidden">Baca selengkapnya</span><span className="hidden group-open:inline">Tutup</span>
              <svg className="h-4 w-4 transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{kat.lebih}</p>
            {kat.lab && <p className="mt-2 text-[15px] text-neutral-600">Bandingkan detail sampai 4 produk di <Link href={`/bandingkan?k=${kat.lab}`} className="font-[600] text-emerald-700 underline underline-offset-2">Compare</Link>.</p>}
          </details>
          </div>
          {kat.lab && (
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-1 lg:[mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-32px),transparent)]">
              {TOP[kat.lab].map((k) => {
                const on = sort === `lab_${k}`;
                const q = new URLSearchParams(Object.entries(searchParams).filter(([a, v]) => a !== "sort" && v) as [string, string][]);
                if (!on) q.set("sort", `lab_${k}`);
                return (
                  <Link key={k} href={`/shop/${kat.slug}${q.toString() ? `?${q}` : ""}`} scroll={false} className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-[600] transition active:scale-95 ${on ? "ev-btn border border-white/20 bg-neutral-950 text-white" : "ev-pill text-neutral-800 hover:bg-white"}`}>
                    Top {k.toLowerCase()}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] px-4 pb-10">
        <div className="mt-2">
          <Suspense fallback={null}>
            <ShopKategori slug={kat.slug} grup={opsi} produk={hasil.map(kartu)} total={hasil.length} lab={!!kat.lab} />
          </Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
