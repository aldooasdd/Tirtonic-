"use client";

import { useState } from "react";

// Cetak stiker QR raket ke printer label NIIMBOT B21-PRO lewat Web Bluetooth
// (niimbluelib). HANYA jalan di Chrome Android. QR membuka /riwayat/<nomor>.
//
// ponytail: knob hardware di bawah ini perlu dituning langsung di printer —
// kalau hasil cetak kebalik/kepotong/ukuran salah, ubah di sini, bukan di logika.
const LABEL = { w: 295, h: 177 }; // dots: label 2,5×1,5 cm @300dpi (25mm×11.81 ≈ 295, 15mm ≈ 177)
const PRINT_DIRECTION: "top" | "left" = "top"; // putar kalau orientasi kebalik
const DENSITY = 3; // 1–5; naikkan kalau hasil tipis
// Nama "task" cetak (bukan nama model). B21-PRO pakai D110M_V4 (per contoh resmi
// niimblue). Kalau gagal/kosong, coba "B21_V1" atau "B1".
const PRINT_TASK = "D110M_V4" as const;

export default function RacketQrPrint({ phone, className, label = "Cetak stiker QR raket" }: { phone: string; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  async function print() {
    setBusy(true); setErr(false); setMsg("Menyambungkan ke printer…");
    try {
      const canvas = await buildLabel(phone);
      const nb = await import("@mmote/niimbluelib");
      const client = nb.instantiateClient("bluetooth");
      await client.connect(); // memunculkan pemilih perangkat Web Bluetooth
      setMsg("Mencetak…");
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

// Gambar label 2,5×1,5cm: QR di kiri (isi tinggi), logo di kanan. Tanpa teks.
async function buildLabel(phone: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL.w;
  canvas.height = LABEL.h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LABEL.w, LABEL.h);

  const M = 12; // margin aman tiap sisi

  // QR kiri, isi tinggi label, center vertikal
  const QRCode = (await import("qrcode")).default;
  const qrSize = LABEL.h - M * 2; // ~153 dots (~13mm)
  const qrCanvas = document.createElement("canvas");
  const url = `${window.location.origin}/riwayat/${encodeURIComponent(phone)}`;
  await QRCode.toCanvas(qrCanvas, url, { width: qrSize, margin: 1, errorCorrectionLevel: "M" });
  ctx.drawImage(qrCanvas, M, Math.round((LABEL.h - qrSize) / 2), qrSize, qrSize);

  // Logo di kanan, isi sisa lebar, center vertikal
  const x = M + qrSize + 12;
  const logoW = LABEL.w - x - M;
  const logo = await loadImage("/logo-wordmark.png");
  const logoH = Math.round(logoW / (logo.width / logo.height));
  ctx.drawImage(logo, x, Math.round((LABEL.h - logoH) / 2), logoW, logoH);

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
