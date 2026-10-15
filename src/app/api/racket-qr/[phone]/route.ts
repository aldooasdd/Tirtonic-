import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";

const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// Stiker QR untuk ditempel di raket → buka dashboard riwayat customer. Label 50×20mm (seragam semua toko), bisa auto-print.
export async function GET(req: NextRequest, { params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  if (!phone) return new Response("Nomor tidak valid", { status: 400 });
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const print = req.nextUrl.searchParams.get("print") === "1";
  const url = `${req.nextUrl.origin}/riwayat/${displayPhone(phone)}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

  // ponytail: ukuran label dikunci 50×20mm biar seragam antar toko (jangan auto/80mm lagi).
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>QR Raket</title><style>
@page { size: 50mm 20mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 50mm; height: 20mm; display: flex; align-items: center; gap: 2mm; padding: 1.5mm 2mm; font: 6pt/1.2 Arial, sans-serif; color: #000; }
.qr { flex: 0 0 auto; } .qr svg { width: 17mm; height: 17mm; display: block; }
.col { flex: 1; min-width: 0; overflow: hidden; }
.shop { font-weight: 700; font-size: 7pt; }
.name { font-weight: 700; font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ph { font-size: 5.5pt; }
.hint { font-size: 5pt; margin-top: 0.4mm; }
</style></head><body>
<div class="qr">${qr}</div>
<div class="col">
<div class="shop">TIRTONIC</div>
${name ? `<div class="name">${esc(name)}</div>` : ""}
<div class="ph">${esc(displayPhone(phone))}</div>
<div class="hint">Scan: riwayat senar &amp; raketmu</div>
</div>
${print ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},150);});window.onafterprint=function(){window.close();};</script>` : ""}
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
