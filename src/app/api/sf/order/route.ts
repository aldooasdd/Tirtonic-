import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { notify } from "@/lib/string-finder/notify";
import type { PickDTO } from "@/lib/string-finder/dto";

export const dynamic = "force-dynamic";

/** Customer pilih rekomendasi + isi WhatsApp → buat antrian stringing + WA "pesanan masuk". */
export async function POST(req: NextRequest) {
  let body: { code?: string; chosenRank?: number; phone?: string; customerName?: string; tensionLbs?: number; racket?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!code) return NextResponse.json({ error: "Kode resep wajib ada." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });

  const rank = Number(body.chosenRank);
  const chosenRank = rank >= 1 && rank <= 3 ? rank : null;

  const result = await prisma.sfResult.findUnique({ where: { code }, include: { branch: true } });
  if (!result) return NextResponse.json({ error: "Resep tidak ditemukan." }, { status: 404 });

  const branch = result.branch ?? (await prisma.sfBranch.findFirst({ where: { slug: "tirtonic", isActive: true } }));
  if (!branch) return NextResponse.json({ error: "Cabang tidak tersedia." }, { status: 500 });

  const picks = result.picks as unknown as PickDTO[];
  const chosenString = chosenRank ? picks[chosenRank - 1]?.name ?? null : null;
  const customerName = String(body.customerName ?? "").trim() || null;
  const racket = String(body.racket ?? "").trim() || null;
  const tRaw = Number(body.tensionLbs);
  const tensionLbs = Number.isFinite(tRaw) && tRaw >= 30 && tRaw <= 75 ? Math.round(tRaw) : null;

  const order = await prisma.sfOrder.create({
    data: {
      resultCode: code,
      branchId: branch.id,
      phone,
      customerName,
      chosenRank,
      chosenString,
      tensionLbs,
      racket,
      etaMinutes: branch.etaMinutes,
    },
  });
  await prisma.sfResult.update({ where: { code }, data: { chosenRank: chosenRank ?? 0 } });

  const ok = await notify({
    event: "pesanan_masuk",
    phone,
    code,
    branch: branch.name,
    chosenString,
    etaMinutes: branch.etaMinutes,
    customerName,
  });
  if (ok) await prisma.sfOrder.update({ where: { id: order.id }, data: { notifiedInAt: new Date() } });

  return NextResponse.json({ ok: true, orderId: order.id, notified: ok });
}
