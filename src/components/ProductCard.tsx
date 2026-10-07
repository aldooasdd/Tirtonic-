import Link from "next/link";
import Image from "next/image";
import { rupiah } from "@/lib/format";
import HeartButton from "./HeartButton";

export type ProductCardData = {
  id: string;
  nama: string;
  harga: number;
  hargaDiskon?: number | null; // discounted price; when < harga → show cut + badge
  gambar: string[];
  status: "READY" | "SOLD";
  fromPrice?: boolean; // true → show "mulai Rp ..." (product has variants)
  deskripsi?: string | null; // dipakai di panel hover (grid shop)
};

export default function ProductCard({ p, thinPrice = false, hoverExpand = false }: { p: ProductCardData; thinPrice?: boolean; hoverExpand?: boolean }) {
  const href = `/product/${p.id}`;

  return (
    <div
      className={`group relative rounded-md bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
        hoverExpand ? "hover:z-20 hover:rounded-b-none hover:shadow-2xl" : ""
      }`}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-md">
        <Link href={href} className="block h-full w-full">
          {p.gambar[0] ? (
            <Image src={p.gambar[0]} alt={p.nama} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">No image</div>
          )}
        </Link>
        <HeartButton product={{ id: p.id, nama: p.nama, harga: p.harga, gambar: p.gambar[0] ?? null }} />
      </div>

      <Link href={href} className="block p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-normal text-gray-800 group-hover:text-primary">{p.nama}</h3>
        {p.hargaDiskon && p.hargaDiskon < p.harga ? (
          <div className="mt-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-base text-gray-900 ${thinPrice ? "font-normal" : "font-bold"}`}>{rupiah(p.hargaDiskon)}</span>
              <span className="rounded bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">-{Math.round((1 - p.hargaDiskon / p.harga) * 100)}%</span>
            </div>
            <span className="text-xs text-gray-400 line-through">{rupiah(p.harga)}</span>
          </div>
        ) : (
          <p className={`mt-1 text-base text-gray-900 ${thinPrice ? "font-thin" : "font-bold"}`}>{rupiah(p.harga)}</p>
        )}
      </Link>

      {/* Panel hover: muncul di bawah card tanpa menggeser grid (absolute top-full). */}
      {hoverExpand && (
        <div className="invisible absolute left-0 right-0 top-full z-20 rounded-b-md bg-white opacity-0 shadow-2xl transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
          <div className="border-t px-3 pb-3 pt-2">
            {p.deskripsi && <p className="line-clamp-3 text-xs leading-relaxed text-gray-500">{p.deskripsi}</p>}
            <div className="mt-2 flex items-stretch justify-around divide-x border-t pt-2 text-gray-500">
              <HeartButton product={{ id: p.id, nama: p.nama, harga: p.harga, gambar: p.gambar[0] ?? null }} className="flex flex-1 items-center justify-center py-1" />
              <Link href={href} aria-label="Lihat & tambah ke keranjang" className="flex flex-1 items-center justify-center py-1 hover:text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
