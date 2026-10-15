import type { NextRequest } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// QR berisi URL konfirmasi pengembalian produk — discan HP admin (login dashboard role event).
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const url = `${req.nextUrl.origin}/dashboard/event/return/${params.token}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" } });
}
