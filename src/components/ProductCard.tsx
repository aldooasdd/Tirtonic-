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
};

export default function ProductCard({ p, thinPrice = false }: { p: ProductCardData; thinPrice?: boolean }) {
  const href = `/product/${p.id}`;

  return (
    <div className="group overflow-hidden rounded-md bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square">
        <Link href={href} className="block h-full w-full">
          {p.gambar[0] ? (
            <Image
              src={p.gambar[0]}
              alt={p.nama}
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              className="object-cover"
            />
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
    </div>
  );
}
