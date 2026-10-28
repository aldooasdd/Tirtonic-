import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { completeStringing } from "@/lib/stringing";

export const dynamic = "force-dynamic";

/** Tandai stringing "selesai" dari scan Tirtonichub. Auth: token rahasia (bukan password dashboard).
 *  Body: { phone, token }. Hanya menyelesaikan order status "dikerjakan". */
export async function POST(req: Request) {
  const secret = process.env.STRINGING_DONE_TOKEN;
  if (!secret) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 500 });

  let body: { phone?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (body.token !== secret) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) return NextResponse.json({ ok: false, reason: "bad_phone" }, { status: 400 });

  // Order yang sedang dikerjakan untuk nomor ini (ambil terbaru bila lebih dari satu).
  const order = await prisma.sfOrder.findFirst({
    where: { phone, status: "dikerjakan" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (!order) {
    const antri = await prisma.sfOrder.findFirst({ where: { phone, status: "antri" }, select: { id: true } });
    return NextResponse.json({ ok: false, reason: antri ? "not_started" : "no_active" }, { status: 404 });
  }

  const r = await completeStringing(order.id, { onlyIfStarted: true });
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
