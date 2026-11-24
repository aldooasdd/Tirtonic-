"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { liveRail, railB1G1, railMerch } from "@/app/skate-test/actions";
import B1G1Popup, { type B1G1Option } from "./B1G1Popup";
import MerchPopup from "./MerchPopup";
import { useShopCart, type CartItem } from "./ShopCartProvider";
import { b1g1PairOk } from "@/lib/b1g1";
import { rupiah } from "@/lib/format";
import type { RailStok } from "@/lib/rail";

const REFRESH_MS = 15_000;
type Mode = "beli" | "keranjang";

/** Isi popup rak: varian + stok live, harga, beli langsung / keranjang. `awal` = data cache sampai stok live datang. */
export default function RailBuy({ awal, href }: { awal: RailStok; href: string }) {
  const [data, setData] = useState(awal);
  const [siap, setSiap] = useState(false); // stok sudah dicek (atau cek gagal → pakai data cache, checkout tetap memvalidasi)
  const [pilih, setPilih] = useState<string | null>(null);
  const [info, setInfo] = useState("");
  const [pasangan, setPasangan] = useState<B1G1Option[] | null>(null);
  const [merch, setMerch] = useState<{ mode: Mode; opsi: B1G1Option[] } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const { add, items } = useShopCart();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let hidup = true;
    const cek = async () => {
      if (document.hidden) return;
      try {
        const d = await liveRail(awal.productId);
        if (hidup) setData(d ?? { ...awal, opsi: awal.opsi.map((o) => ({ ...o, stok: 0 })) });
      } catch {}
      if (hidup) setSiap(true);
    };
    cek();
    const t = setInterval(cek, REFRESH_MS);
    document.addEventListener("visibilitychange", cek);
    return () => { hidup = false; clearInterval(t); document.removeEventListener("visibilitychange", cek); };
  }, [awal]);

  // Pilihan pembeli tidak dipindah diam-diam: kalau stoknya habis, tetap terpilih tapi tombol mati.
  const v = data.opsi.find((o) => o.id === pilih) ?? data.opsi.find((o) => o.stok > 0) ?? data.opsi[0];
  const bervarian = v.id !== null;
  const bisa = siap && !sibuk && v.stok > 0;

  const key = `${data.productId}::${v.id ?? ""}`;
  const sudah = items.find((x) => x.key === key)?.qty ?? 0;

  // Langkah 1: tawarkan bonus merchandise (1 per unit produk rak) sebelum barang masuk keranjang.
  const mulai = async (mode: Mode) => {
    if (mode === "keranjang" && sudah >= v.stok) { setInfo(`Semua stok (${v.stok}) sudah di keranjang.`); return; }
    const tambah = mode === "keranjang" || !sudah ? 1 : 0; // beli langsung: sudah di keranjang → jangan digandakan
    const unitRak = items.reduce((n, x) => n + (!x.gift && (x.rak || x.key === key) ? x.qty : 0), 0) + tambah;
    const bonus = items.reduce((n, x) => n + (x.gift ? x.qty : 0), 0);
    setSibuk(true);
    let opsi: B1G1Option[] = [];
    if (unitRak > bonus) {
      // stok bonus dikurangi yang sudah ada di keranjang
      const dipakai = (p: string, va: string | null) => items.reduce((n, x) => n + (x.productId === p && x.variantId === va ? x.qty : 0), 0);
      try {
        opsi = (await railMerch())
          .map((o) => ({ o, variants: o.variants.filter((x) => x.stok > dipakai(o.id, x.id)) }))
          .filter(({ o, variants }) => (o.variants.length ? variants.length > 0 : o.stok == null || o.stok > dipakai(o.id, null)))
          .map(({ o, variants }) => ({ ...o, variants }));
      } catch {}
    }
    setSibuk(false);
    if (opsi.length) setMerch({ mode, opsi });
    else lanjut(mode);
  };
  // Langkah 2: masuk keranjang (+ bonus), lalu checkout bila beli langsung.
  const lanjut = async (mode: Mode, gift?: Omit<CartItem, "key">) => {
    setMerch(null);
    const tambah = mode === "keranjang" || !sudah ? 1 : 0;
    add({ productId: data.productId, variantId: v.id, nama: data.nama, varian: v.label || null, harga: v.harga, gambar: v.gambar, qty: tambah, max: v.stok, b1g1: v.b1g1, rak: true });
    if (gift) add(gift);
    if (mode === "keranjang") { setInfo(gift ? "Masuk keranjang + bonus." : "Masuk keranjang."); return; }
    const unit = items.filter((x) => x.b1g1).reduce((n, x) => n + x.qty, 0) + tambah;
    setSibuk(true);
    if (v.b1g1 && unit % 2 === 1) {
      try { setPasangan(await railB1G1()); setSibuk(false); return; } catch {}
    }
    router.push("/checkout");
  };

  return (
    <div ref={root} className="flex w-full flex-col gap-3">
      {bervarian && (
        <div role="group" aria-label={awal.sizeChart ? "Pilih ukuran" : "Pilih varian"} className="flex flex-wrap gap-1.5">
          {data.opsi.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={o.stok <= 0}
              aria-pressed={o.id === v.id}
              onClick={() => { setPilih(o.id); setInfo(""); }}
              className={`min-h-10 rounded-full border px-3.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${o.stok <= 0 ? "cursor-not-allowed border-white/60 bg-white/30 text-zinc-500 line-through" : o.id === v.id ? "border-primary bg-primary text-white" : "border-white/80 bg-white/65 text-zinc-900 hover:bg-white"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-lg font-semibold tabular-nums">{rupiah(v.harga)}</span>
        {v.harga < v.normal && <s className="text-sm tabular-nums text-zinc-600">{rupiah(v.normal)}</s>}
        {v.b1g1 && <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white">BUY 1 GET 1</span>}
      </div>
      <p data-stok aria-live="polite" className="text-sm text-zinc-700">
        {!siap ? "Mengecek stok…" : v.stok <= 0 ? "Stok habis" : v.stok >= 99 ? "Stok tersedia" : `Stok ${v.stok}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!bisa} onClick={() => mulai("beli")} className="min-h-11 flex-1 whitespace-nowrap rounded-full bg-primary px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-primaryDark focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {sibuk ? "Memproses…" : "Beli langsung"}
        </button>
        <button type="button" disabled={!bisa} onClick={() => mulai("keranjang")} className="min-h-11 flex-1 whitespace-nowrap rounded-full border border-primary bg-white/70 px-5 text-sm font-medium text-primary outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          + Keranjang
        </button>
      </div>
      <div className="flex min-h-5 flex-wrap items-center gap-x-3 text-xs text-zinc-700">
        {data.sizeChart && <a href={data.sizeChart} target="_blank" rel="noreferrer" className="underline underline-offset-2">Size chart</a>}
        <Link href={href} className="underline underline-offset-2">Detail produk</Link>
        <Link href="/cart" className="underline underline-offset-2">Lihat keranjang{items.length ? ` (${items.reduce((n, x) => n + x.qty, 0)})` : ""}</Link>
        <span role="status" className="font-medium text-primary">{info}</span>
      </div>
      {/* portal ke dialog: keluar dari kolom ber-transform, tapi tetap di dalam jebakan fokus dialog */}
      {merch && root.current?.closest("[role=dialog]") && createPortal(
        <MerchPopup options={merch.opsi} onPick={(g) => lanjut(merch.mode, g)} onSkip={() => lanjut(merch.mode)} onClose={() => setMerch(null)} />,
        root.current.closest("[role=dialog]")!,
      )}
      {pasangan && root.current?.closest("[role=dialog]") && createPortal(
        <B1G1Popup
          options={pasangan
            .filter((o) => o.id !== data.productId)
            .map((o) => ({ o, variants: o.variants.filter((x) => b1g1PairOk(x.harga, v.harga)) }))
            .filter(({ o, variants }) => variants.length > 0 || (o.variants.length === 0 && b1g1PairOk(o.harga, v.harga)))
            .map(({ o, variants }) => ({ ...o, variants }))}
          onPick={(it) => { add(it); router.push("/checkout"); }}
          onSkip={() => router.push("/checkout")}
          onClose={() => setPasangan(null)}
        />,
        root.current.closest("[role=dialog]")!,
      )}
    </div>
  );
}
