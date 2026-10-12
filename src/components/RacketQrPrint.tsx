"use client";

import { useState } from "react";

// Cetak stiker QR raket ke printer label NIIMBOT B21-PRO lewat Web Bluetooth
// (niimbluelib). HANYA jalan di Chrome Android. QR membuka /riwayat/<nomor>.
//
// ponytail: knob hardware di bawah ini perlu dituning langsung di printer —
// kalau hasil cetak kebalik/kepotong/ukuran salah, ubah di sini, bukan di logika.
const LABEL = { w: 584, h: 354 }; // dots, label 50×30mm @ ~300dpi (sesuai contoh resmi B21_PRO)
const PRINT_DIRECTION: "top" | "left" = "top"; // putar kalau orientasi kebalik
const DENSITY = 3; // 1–5; naikkan kalau hasil tipis
// Nama "task" cetak (bukan nama model). B21-PRO pakai D110M_V4 (per contoh resmi
// niimblue). Kalau gagal/kosong, coba "B21_V1" atau "B1".
const PRINT_TASK = "D110M_V4" as const;

export default function RacketQrPrint({ phone, name }: { phone: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  async function print() {
    setBusy(true); setErr(false); setMsg("Menyambungkan ke printer…");
    try {
      const canvas = await buildLabel(phone, name);
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
        className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? "Memproses…" : "Cetak stiker QR raket"}
      </button>
      {msg && <span className={`text-xs ${err ? "text-red-600" : "text-gray-400"}`}>{msg}</span>}
    </span>
  );
}

// Gambar label 50×30mm: QR di kiri, identitas toko + customer di kanan.
async function buildLabel(phone: string, name: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL.w;
  canvas.height = LABEL.h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LABEL.w, LABEL.h);
  ctx.fillStyle = "#000";

  // QR kiri
  const QRCode = (await import("qrcode")).default;
  const qrSize = 300;
  const qrCanvas = document.createElement("canvas");
  const url = `${window.location.origin}/riwayat/${encodeURIComponent(phone)}`;
  await QRCode.toCanvas(qrCanvas, url, { width: qrSize, margin: 0, errorCorrectionLevel: "M" });
  const qrY = Math.round((LABEL.h - qrSize) / 2);
  ctx.drawImage(qrCanvas, 24, qrY, qrSize, qrSize);

  // Teks kanan
  const x = 24 + qrSize + 28;
  const maxW = LABEL.w - x - 16;
  ctx.textBaseline = "top";
  ctx.font = "bold 40px Arial";
  ctx.fillText("TIRTONIC", x, 56);
  ctx.font = "26px Arial";
  ctx.fillText("TENNIS STORE", x, 104);
  if (name) {
    ctx.font = "bold 30px Arial";
    ctx.fillText(ellipsize(ctx, name, maxW), x, 162);
  }
  ctx.font = "26px Arial";
  ctx.fillText(phone, x, name ? 202 : 178);
  ctx.font = "22px Arial";
  ctx.fillStyle = "#333";
  ctx.fillText("Scan: riwayat", x, 252);
  ctx.fillText("senar & raket", x, 280);
  return canvas;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}
