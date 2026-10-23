"use client";

import { useState } from "react";

// Cetak stiker QR raket ke printer label NIIMBOT lewat Web Bluetooth
// (niimbluelib). HANYA jalan di Chrome Android. QR membuka /riwayat/<nomor>.
//
// ponytail: ukuran label dikunci 50×20mm, dimensi dot dihitung dari dpi printer
// yang benar-benar kesambung (203 vs 300dpi beda jauh) + dibatasi lebar printhead.
// Dulu di-hardcode 591px/300dpi → di printer 203dpi konten jadi ~74mm (kebesaran,
// kepotong). TASK & ARAH tetap hardcode ke nilai yang TERBUKTI nyetak — auto-detect
// (getPrintTaskType/printDirection) pernah bikin cetakan blank (arah ke-rotate "left").
const LABEL_MM = { w: 40, h: 20 };
const DENSITY = 3; // 1–5; naikkan kalau hasil tipis
const FALLBACK_DPI = 203; // kalau dpi model tak terdeteksi (B-series umumnya 203dpi)
const PRINT_DIRECTION: "top" | "left" = "top"; // putar kalau orientasi kebalik
const PRINT_TASK = "D110M_V4" as const; // task yang kepakai pas print pertama berhasil

export default function RacketQrPrint({ phone, branch, className, label = "Cetak stiker QR raket" }: { phone: string; branch?: string | null; className?: string; label?: string }) {
  // ponytail: semua cabang 50×20mm. Jogja 40mm bikin stiker blank di printer — balik 50mm.
  void branch;
  const labelWmm = LABEL_MM.w;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  async function print() {
    setBusy(true); setErr(false); setMsg("Menyambungkan ke printer…");
    let client: Awaited<ReturnType<typeof connect>> | undefined;
    try {
      const nb = await import("@mmote/niimbluelib");
      client = nb.instantiateClient("bluetooth");
      await client.connect(); // memunculkan pemilih perangkat Web Bluetooth

      // Ukuran canvas ikut dpi printer yang kesambung; task & arah tetap hardcode.
      const meta = client.getModelMetadata();
      const dpi = meta?.dpi ?? FALLBACK_DPI;

      setMsg("Mencetak…");
      const canvas = await buildLabel(phone, dpi, labelWmm, meta?.printheadPixels);
      const encoded = nb.ImageEncoder.encodeCanvas(canvas, nb.PageColorType.SingleColor, PRINT_DIRECTION);
      const printTask = client.protocol.newPrintTask(PRINT_TASK, {
        totalPages: 1,
        statusPollIntervalMs: 100,
        statusTimeoutMs: 8_000,
        pageColor: nb.PageColorType.SingleColor,
        density: DENSITY,
      });
      await printTask.printInit();
      await printTask.printPage(encoded, 1);
      await printTask.waitForPageFinished();
      await printTask.waitForFinished();
      await printTask.printEnd();
      await client.disconnect();
      setMsg("Stiker tercetak ✓");
    } catch (e) {
      setErr(true);
      setMsg(e instanceof Error ? e.message : "Gagal mencetak. Pastikan printer nyala, Bluetooth aktif, dan pakai Chrome Android.");
      try { await client?.disconnect(); } catch { /* abaikan */ }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        onClick={print}
        disabled={busy}
        className={className ?? "rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"}
      >
        {busy ? "Memproses…" : label}
      </button>
      {msg && <span className={`text-xs ${err ? "text-red-600" : "text-gray-400"}`}>{msg}</span>}
    </span>
  );
}

// hanya untuk inferensi tipe client (niimbluelib di-import dinamis)
async function connect() {
  const nb = await import("@mmote/niimbluelib");
  return nb.instantiateClient("bluetooth");
}

const mm2dots = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);

// Gambar label 50×20mm: QR di kiri, kolom kanan (logo + teks 3 baris) rata kiri.
// Dimensi & layout diskalakan dari dpi printer; referensi layout = 236 dot tinggi.
async function buildLabel(phone: string, dpi: number, widthMm: number, headPx?: number): Promise<HTMLCanvasElement> {
  let w = mm2dots(widthMm, dpi);
  const h = mm2dots(LABEL_MM.h, dpi);
  if (headPx && w > headPx) w = headPx; // jangan lebihi lebar printhead

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // Skala layout relatif tinggi referensi 236 dot (desain lama @300dpi/20mm).
  const s = h / 236;
  const M = Math.round(24 * s); // margin aman tiap sisi
  const gapX = Math.round(26 * s); // jarak QR ↔ kolom kanan
  const gapY = Math.round(12 * s); // jarak logo ↔ teks
  const lineH = Math.round(28 * s);
  const fontPx = Math.round(22 * s);
  const logoShrink = Math.round(22 * s);

  // QR kiri, isi tinggi label, center vertikal
  const QRCode = (await import("qrcode")).default;
  const qrSize = h - M * 2;
  const qrCanvas = document.createElement("canvas");
  const url = `${window.location.origin}/riwayat/${encodeURIComponent(phone)}`;
  await QRCode.toCanvas(qrCanvas, url, { width: qrSize, margin: 1, errorCorrectionLevel: "M" });
  ctx.drawImage(qrCanvas, M, Math.round((h - qrSize) / 2), qrSize, qrSize);

  // Kolom kanan: logo + teks, semua rata kiri di kolom.
  const colX = M + qrSize + gapX;
  const colW = w - colX - M;
  const logo = await loadImage("/logo-wordmark.png");
  const logoW = Math.max(1, colW - logoShrink);
  const logoH = Math.round(logoW / (logo.width / logo.height));
  const lines = ["Scan QR untuk", "semua detail", "informasimu"];
  const stackH = logoH + gapY + lines.length * lineH;
  let y = Math.round((h - stackH) / 2);

  ctx.drawImage(logo, colX, y, logoW, logoH);
  y += logoH + gapY;
  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `${fontPx}px Arial`;
  for (const ln of lines) {
    ctx.fillText(ln, colX, y);
    y += lineH;
  }

  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
