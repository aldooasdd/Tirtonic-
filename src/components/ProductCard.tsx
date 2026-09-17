import Link from "next/link";
import { rupiah } from "@/lib/format";
import HeartButton from "./HeartButton";

export type ProductCardData = {
  id: string;
  nama: string;
  harga: number;
  gambar: string[];
  status: "READY" | "SOLD";
};

export default function ProductCard({ p, thinPrice = false }: { p: ProductCardData; thinPrice?: boolean }) {
  const href = `/product/${p.id}`;

  return (
    <div className="group overflow-hidden rounded-md bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square">
        <Link href={href} className="block h-full w-full">
          {p.gambar[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.gambar[0]} alt={p.nama} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">No image</div>
          )}
        </Link>
        <HeartButton product={{ id: p.id, nama: p.nama, harga: p.harga, gambar: p.gambar[0] ?? null }} />
      </div>

      <Link href={href} className="block p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-normal text-gray-800 group-hover:text-primary">{p.nama}</h3>
        <p className={`mt-1 text-base text-gray-900 ${thinPrice ? "font-thin" : "font-bold"}`}>{rupiah(p.harga)}</p>
      </Link>
    </div>
  );
}
