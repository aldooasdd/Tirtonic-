import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";

const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// Stiker QR untuk ditempel di raket → buka dashboard riwayat customer. Thermal 58mm, bisa auto-print.
export async function GET(req: NextRequest, { params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  if (!phone) return new Response("Nomor tidak valid", { status: 400 });
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const print = req.nextUrl.searchParams.get("print") === "1";
  const url = `${req.nextUrl.origin}/riwayat/${displayPhone(phone)}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>QR Raket</title><style>
@page { size: 58mm auto; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 48mm; margin: 0 auto; padding: 3mm 0; font: 9pt/1.3 Arial, sans-serif; color: #000; text-align: center; }
.shop { font-weight: 700; font-size: 10pt; }
.t { font-size: 8.5pt; margin-bottom: 1mm; }
.qr { display: flex; justify-content: center; margin: 1.5mm 0; } .qr svg { width: 34mm; height: 34mm; }
.name { font-weight: 700; font-size: 9.5pt; } .ph { font-size: 8.5pt; }
.hint { font-size: 7.5pt; margin-top: 1mm; }
</style></head><body>
<div class="shop">TIRTONIC TENNIS STORE</div>
<div class="t">Riwayat Stringing</div>
<div class="qr">${qr}</div>
${name ? `<div class="name">${esc(name)}</div>` : ""}
<div class="ph">${esc(displayPhone(phone))}</div>
<div class="hint">Scan untuk lihat riwayat senar &amp; raketmu</div>
${print ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},150);});window.onafterprint=function(){window.close();};</script>` : ""}
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
