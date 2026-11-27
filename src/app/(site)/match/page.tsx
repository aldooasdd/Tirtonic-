import type { Metadata } from "next";
import Link from "next/link";
import type { Kat } from "@/lib/compare-shared";
import { itemsMatch } from "@/lib/match-data";
import { rupiah } from "@/lib/format";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Tirtonic Match — Cari Raket, Senar & Sepatu Tenis yang Cocok",
  description: "Jawab beberapa pertanyaan singkat, dapat 3 raket, senar, atau sepatu tenis yang paling cocok dengan gaya mainmu. Berdasarkan data uji lab, bukan opini.",
  alternates: { canonical: "/match" },
};

const KAT: { k: Kat; judul: string; find: string; opt: string }[] = [
  { k: "raket", judul: "Raket", find: "Level, postur, gaya main, dan prioritas jadi 3 raket paling pas", opt: "Pilih yang mau naik: power, kontrol, spin, kenyamanan" },
  { k: "senar", judul: "Senar", find: "Frekuensi main, keluhan lengan, dan gaya pukulan jadi 3 senar paling pas", opt: "Cari yang lebih bertenaga, terkontrol, atau awet" },
  { k: "sepatu", judul: "Sepatu", find: "Lapangan, lebar kaki, dan gaya gerak jadi 3 sepatu paling pas", opt: "Cari yang lebih nyaman, stabil, awet, atau lincah" },
];

const LANGKAH = [
  { judul: "Cari yang ideal", isi: "Tiap jawaban memberi bobot ke kriteria lab, misalnya power, kontrol, spin, kenyamanan, toleransi, manuver, dan stabilitas untuk raket. Produk dengan nilai tinggi di kriteria yang kamu butuhkan naik ke atas. Yang tidak cocok dengan batasanmu, seperti berat raket, keluhan lengan, atau lebar kaki, otomatis turun." },
  { judul: "Upgrade dari yang sekarang", isi: "Produkmu dibandingkan dengan semua kandidat, kriteria per kriteria. Yang direkomendasikan adalah yang naik di arah yang kamu minta tanpa banyak turun di aspek lain." },
  { judul: "Tanpa titipan brand", isi: "Tidak ada produk terbaik untuk semua orang, yang ada paling cocok untukmu. Rekomendasi hanya dari produk ready, tanpa memihak brand mana pun." },
];
const BAR = ["Power", "Kontrol", "Spin", "Kenyamanan"];

export default async function MatchLanding() {
  // berurutan, bukan Promise.all: 3 query paralel bisa kehabisan koneksi DB lalu salah satunya kosong
  const data = [];
  for (const x of KAT) {
    const it = (await itemsMatch(x.k)).filter((i) => Object.keys(i.nilai).length);
    data.push({ ...x, it, n: it.length, foto: it.find((i) => i.ready && i.foto)?.foto ?? null });
  }
  const total = data.reduce((t, x) => t + x.n, 0);
  // contoh kartu hasil: raket ready dengan skor lab tertinggi (data asli, bukan persen karangan)
  const contoh = data[0].it.filter((i) => i.ready && i.foto && i.skor != null && BAR.every((k) => i.nilai[k] != null)).sort((a, b) => b.skor! - a.skor!)[0];
  // foto kartu Raket jangan sama dengan foto contoh di hero
  if (contoh && data[0].foto === contoh.foto) data[0].foto = data[0].it.find((i) => i.ready && i.foto && i.foto !== contoh.foto)?.foto ?? data[0].foto;

  return (
    <>
      <div className="bg-[#f7f9fb] sm:-mt-20 sm:pt-20">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
          <header className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,24rem)]">
            <div>
              <h1>
                <span className="sr-only">Tirtonic Match</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/match-logo.png?v=2" alt="" width={1040} height={256} className="h-12 w-auto sm:h-16" />
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
                Cari raket, senar, dan sepatu tenis yang cocok dengan level, gaya, dan kebutuhanmu. Dihitung dari skor uji lab, bukan opini atau titipan brand.
              </p>
              <dl className="mt-8 flex gap-12">
                {[[String(total), "Produk dianalisis"], ["17", "Kriteria diukur"]].map(([a, b]) => (
                  <div key={b}>
                    <dd className="text-3xl font-medium tabular-nums text-neutral-950">{a}</dd>
                    <dt className="mt-1 text-sm text-neutral-500">{b}</dt>
                  </div>
                ))}
              </dl>
            </div>

            {contoh && (
              <figure className="rounded-3xl border border-neutral-900/[0.08] bg-white p-3">
                <Link href="/match/raket/find" className="block">
                  <div className="aspect-[16/10] overflow-hidden rounded-xl bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={contoh.foto!} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="px-2 pb-2 pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-950">{contoh.nama}</p>
                        <p className="mt-0.5 text-sm tabular-nums text-neutral-500">{rupiah(contoh.harga)}</p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="block text-2xl font-medium tabular-nums text-neutral-950">{contoh.skor}</span>
                        <span className="block text-xs text-neutral-500">Skor lab</span>
                      </p>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {BAR.map((k) => (
                        <li key={k} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm">
                          <span className="text-neutral-600">{k}</span>
                          <span className="h-1.5 rounded-full bg-neutral-100"><span className="block h-1.5 rounded-full bg-primary" style={{ width: `${contoh.nilai[k]}%` }} /></span>
                          <span className="text-right tabular-nums text-neutral-950">{contoh.nilai[k]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
                <figcaption className="border-t border-neutral-900/[0.06] px-2 pt-3 text-xs text-neutral-500">Contoh kartu hasil kuis raket</figcaption>
              </figure>
            )}
          </header>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {data.map((x) => (
              <section key={x.k} className="flex flex-col overflow-hidden rounded-3xl border border-neutral-900/[0.08] bg-white">
                <div className="aspect-[16/10] bg-neutral-100">
                  {x.foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.foto} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <h2 className="px-5 pb-4 pt-5 text-2xl font-medium text-neutral-950">{x.judul}</h2>
                <div className="mt-auto space-y-2 px-3 pb-3">
                  <Link href={`/match/${x.k}/find`} className="group block rounded-xl bg-neutral-950 p-4 text-white transition-colors hover:bg-neutral-800">
                    <span className="flex items-center justify-between font-medium">Cari {x.judul.toLowerCase()} ideal <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span></span>
                    <span className="mt-1 block min-h-10 text-sm leading-5 text-white/70">{x.find}</span>
                  </Link>
                  <Link href={`/match/${x.k}/optimize`} className="group block rounded-xl border border-neutral-900/[0.1] p-4 transition-colors hover:border-neutral-900/40">
                    <span className="flex items-center justify-between font-medium text-neutral-950">Upgrade dari yang sekarang <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span></span>
                    <span className="mt-1 block min-h-10 text-sm leading-5 text-neutral-500">{x.opt}</span>
                  </Link>
                </div>
              </section>
            ))}
          </div>

          <section className="mt-20 grid gap-8 lg:grid-cols-[16rem_1fr]">
            <h2 className="text-2xl font-medium text-neutral-950">Cara kerjanya</h2>
            <ol className="grid gap-8 sm:grid-cols-3">
              {LANGKAH.map((l) => (
                <li key={l.judul}>
                  <p className="flex items-center gap-2 font-medium text-neutral-950"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ball" />{l.judul}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{l.isi}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
      {/* flow-root: margin atas footer tidak bocor jadi pita putih di bawah latar halaman */}
      <div className="flow-root bg-[#f7f9fb]"><Footer /></div>
    </>
  );
}

export const dynamic = "force-dynamic";
