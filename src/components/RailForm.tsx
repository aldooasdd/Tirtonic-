"use client";

import { useEffect, useRef, useState } from "react";
import { saveRail } from "@/app/dashboard/rak/actions";
import { BAG_W, BagHang } from "@/components/ui/bag-hang";
import { RAIL_W, RAIL_H, SHOE_W, SHOE_H, alphaBox, bersihkan, cariHandle, railPhotoProblem, type BagInfo, type JenisRak } from "@/lib/rail";

const TINGGI = 250; // tinggi pratinjau tas (px)
type Item = { id: string; nama: string; foto: string | null; dipakai: boolean; jenis: JenisRak };

/** Potong area kosong, samakan ukuran, kompres. Raket: tepi atas frame pas di atas kanvas (kait). Sepatu: sol pas di bawah kanvas (plat). */
const TAS_MAX = 1000;
type Siap = { file: File; piksel?: ImageData; tas?: BagInfo };

async function prepare(file: File, jenis: JenisRak): Promise<Siap> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, (jenis === "tas" ? 1600 : 2400) / Math.max(img.width, img.height));
  const src = document.createElement("canvas");
  src.width = Math.round(img.width * k);
  src.height = Math.round(img.height * k);
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, src.width, src.height);
  img.close();
  const px = sctx.getImageData(0, 0, src.width, src.height);
  if (jenis === "tas") { bersihkan(px.data, px.width, px.height); sctx.putImageData(px, 0, 0); }
  const box = alphaBox(px.data, src.width, src.height);
  const problem = railPhotoProblem(box, jenis);
  if (problem || !box) throw new Error(problem ?? "Fotonya kosong.");
  const out = document.createElement("canvas");
  const t = Math.min(1, TAS_MAX / Math.max(box.w, box.h));
  const [W, H] = jenis === "tas" ? [Math.round(box.w * t), Math.round(box.h * t)] : jenis === "sepatu" ? [SHOE_W, SHOE_H] : [RAIL_W, RAIL_H];
  out.width = W;
  out.height = H;
  const scale = Math.min(W / box.w, H / box.h);
  const w = box.w * scale;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, box.x, box.y, box.w, box.h, (W - w) / 2, jenis === "sepatu" ? H - box.h * scale : 0, w, box.h * scale);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/webp", 0.88)); // Safari lama: jatuh ke PNG
  if (!blob) throw new Error("Foto gagal diproses.");
  const hasil = new File([blob], blob.type === "image/webp" ? `${jenis}.webp` : `${jenis}.png`, { type: blob.type });
  if (jenis !== "tas") return { file: hasil };
  const piksel = ctx.getImageData(0, 0, W, H);
  return { file: hasil, piksel, tas: cariHandle(piksel.data, W, H) };
}

export default function RailForm({ items }: { items: Item[] }) {
  const [jenis, setJenis] = useState<JenisRak>("raket");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Item | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [piksel, setPiksel] = useState<ImageData | null>(null);
  const [tas, setTas] = useState<BagInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const found = items.filter((x) => x.jenis === jenis && words.every((w) => x.nama.toLowerCase().includes(w)));

  async function onFile(f?: File) {
    setMsg(null);
    setFile(null); setTas(null); setPiksel(null);
    if (!f) return;
    setBusy(true);
    try { const r = await prepare(f, jenis); setFile(r.file); setPiksel(r.piksel ?? null); setTas(r.tas ?? null); } catch (e) { setMsg({ ok: false, text: e instanceof Error && e.name === "Error" ? e.message : "File ini bukan gambar yang bisa dibaca." }); if (input.current) input.current.value = ""; }
    setBusy(false);
  }

  function ganti(j: JenisRak) {
    if (j === jenis) return;
    setJenis(j); setFile(null); setTas(null); setPiksel(null); setPicked(null); setQ(""); setMsg(null);
    if (input.current) input.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !picked) return setMsg({ ok: false, text: !file ? "Pilih foto dulu." : "Pilih barangnya dulu." });
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("gambar", file);
    fd.set("productId", picked.id);
    if (tas) fd.set("tas", [tas.ratio, tas.x, tas.y, tas.grip].join(","));
    try {
      const r = await saveRail(fd);
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: `${picked.nama} sudah masuk rak.` });
        setFile(null); setTas(null); setPiksel(null); setPicked(null); setQ("");
        if (input.current) input.current.value = "";
      }
    } catch { setMsg({ ok: false, text: "Gagal menyimpan. Coba lagi." }); }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div role="group" aria-label="Jenis barang" className="flex gap-2 md:col-span-2">
        {(["raket", "sepatu", "tas"] as const).map((j) => (
          <button key={j} type="button" disabled={busy} aria-pressed={jenis === j} onClick={() => ganti(j)} className={`min-h-10 rounded-full border px-5 text-sm font-semibold transition-colors ${jenis === j ? "border-primary bg-primary text-white" : "bg-white text-gray-700 hover:border-primary"}`}>{{ raket: "Raket", sepatu: "Sepatu", tas: "Tas" }[j]}</button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="rail-foto">1. Foto {jenis}</label>
        <label htmlFor="rail-foto" className="flex h-72 cursor-pointer items-center justify-center rounded-2xl border border-dashed bg-gray-50 p-3 text-center text-xs text-gray-500 hover:border-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && tas ? (
            <span className="relative block" style={{ width: BAG_W * TINGGI, height: TINGGI * 0.9 }}><BagHang h={TINGGI} ax={(BAG_W * TINGGI) / 2} ay={TINGGI * 0.04} image={preview} bag={tas} hidden={false} bagRef={() => {}} /></span>
          ) : preview ? <img src={preview} alt={`Pratinjau ${jenis}`} className="h-full w-full object-contain" /> : busy ? "Memproses…" : "Klik untuk pilih foto"}
        </label>
        {tas && piksel && (
          <div className="mt-3">
            <label htmlFor="rail-titik" className="text-xs font-semibold text-gray-700">Titik gantung</label>
            <input id="rail-titik" type="range" min={0.1} max={0.9} step={0.005} value={tas.x} onChange={(e) => setTas(cariHandle(piksel.data, piksel.width, piksel.height, Number(e.target.value)))} className="mt-1 w-full accent-primary" />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{tas.grip > 0 ? "Tali melingkar di handle." : "Tidak ada lubang di titik ini, tali masuk ke belakang tas."}</span>
              <button type="button" onClick={() => setTas(cariHandle(piksel.data, piksel.width, piksel.height))} className="shrink-0 font-semibold text-primary">Otomatis</button>
            </div>
          </div>
        )}
        <input ref={input} id="rail-foto" type="file" accept="image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="mt-2 text-xs text-gray-500">{jenis === "raket" ? "PNG background transparan, satu raket tegak dari depan." : jenis === "tas" ? "PNG background transparan, satu tas tegak dari depan, celah handle kosong. Kabut tipis di tepi dibersihkan otomatis." : "PNG background transparan, satu sepatu dari samping, ujung menghadap kiri."} Tepi kosong dipotong otomatis.</p>
      </div>
      <div className="min-w-0">
        <label className="label" htmlFor="rail-cari">2. Pilih barang</label>
        <input id="rail-cari" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari nama ${jenis}`} className="field" autoComplete="off" />
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border">
          {found.length === 0 && <p className="p-4 text-sm text-gray-400">Tidak ada barang yang cocok.</p>}
          {found.map((x) => (
            <button key={x.id} type="button" aria-pressed={picked?.id === x.id} onClick={() => setPicked(x)} className={`flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-0 ${picked?.id === x.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-gray-50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.foto ? <img loading="lazy" src={x.foto} alt="" className="size-9 shrink-0 rounded-lg border object-cover" /> : <span className="size-9 shrink-0 rounded-lg border bg-gray-50" />}
              <span className="min-w-0 flex-1 truncate">{x.nama}</span>
              {x.dipakai && <span className="shrink-0 text-xs font-normal text-gray-400">sudah di rak</span>}
            </button>
          ))}
        </div>
        {picked?.dipakai && <p className="mt-2 text-xs text-amber-700">Barang ini sudah di rak. Menyimpan akan mengganti fotonya.</p>}
        {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
        <button disabled={busy} className="btn-green mt-4 disabled:cursor-wait disabled:opacity-60">{busy ? "Memproses…" : "Pasang di rak"}</button>
      </div>
    </form>
  );
}
