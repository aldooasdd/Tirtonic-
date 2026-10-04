import type { NextRequest } from "next/server";
import { renderSlipForCode } from "@/lib/string-finder/render-slip";

export const dynamic = "force-dynamic";

// Pratinjau resep (default tanpa QR). ?qr=1 menyertakan QR admin (dipakai stasiun/admin).
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const rankParam = req.nextUrl.searchParams.get("rank");
  const rank = rankParam ? parseInt(rankParam, 10) : null;
  const qr = req.nextUrl.searchParams.get("qr") === "1";

  const html = await renderSlipForCode(params.code, { rank, qr, origin: req.nextUrl.origin });
  if (!html) return new Response("Resep tidak ditemukan", { status: 404 });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
