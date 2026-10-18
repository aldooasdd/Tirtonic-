import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { sendWa, salam, stringingRoomLink } from "@/lib/wa";
import type { PickDTO } from "@/lib/string-finder/dto";

export const dynamic = "force-dynamic";


/** Customer pilih rekomendasi + isi WhatsApp → buat antrian stringing + WA "pesanan masuk". */
export async function POST(req: NextRequest) {
  let body: { code?: string; chosenRank?: number; chosenString?: string; price?: number; phone?: string; customerName?: string; tensionLbs?: number; tensionCrossLbs?: number; racket?: string };
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

  // Kode resep sudah jadi pesanan → request dobel, jangan buat pesanan/WA lagi.
  const existing = await prisma.sfOrder.findFirst({ where: { resultCode: code, status: { not: "batal" } }, select: { id: true } });
  if (existing) return NextResponse.json({ ok: true, orderId: existing.id, notified: false });

  const branch = result.branch ?? (await prisma.sfBranch.findFirst({ where: { slug: "tirtonic", isActive: true } }));
  if (!branch) return NextResponse.json({ error: "Cabang tidak tersedia." }, { status: 500 });

  const picks = result.picks as unknown as PickDTO[];
  // chosenString: dari rank (rekomendasi) ATAU dari body (customer pilih senar sendiri di katalog).
  const manualString = String(body.chosenString ?? "").trim() || null;
  const chosenString = chosenRank ? picks[chosenRank - 1]?.name ?? null : manualString;
  const customerName = String(body.customerName ?? "").trim() || null;
  const racket = String(body.racket ?? "").trim() || null;
  const validTension = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 30 && n <= 75 ? Math.round(n) : null;
  };
  const tensionLbs = validTension(body.tensionLbs);
  const tensionCrossLbs = validTension(body.tensionCrossLbs);
  // Harga untuk kasir: dari body (varian/pilih-sendiri) atau turunkan dari rekomendasi.
  const bodyPrice = Number(body.price);
  const price = Number.isFinite(bodyPrice) && bodyPrice > 0
    ? Math.round(bodyPrice)
    : chosenRank ? picks[chosenRank - 1]?.price ?? null : null;

  const order = await prisma.sfOrder.create({
    data: {
      resultCode: code,
      branchId: branch.id,
      phone,
      customerName,
      chosenRank,
      chosenString,
      tensionLbs,
      tensionCrossLbs,
      racket,
      price,
      etaMinutes: branch.etaMinutes,
    },
  });
  await prisma.sfResult.update({ where: { code }, data: { chosenRank: chosenRank ?? 0 } });

  const tarikan = tensionLbs
    ? `Main ${tensionLbs} lbs / Cross ${tensionCrossLbs ?? tensionLbs} lbs`
    : "-";
  const ok = await sendWa(
    phone,
    `Selamat ${salam()}, kak ${customerName ?? ""}`.trimEnd() + `

Terima kasih telah mempercayakan raket Anda kepada Tirtonic. Pesanan stringing Anda telah kami terima dengan detail berikut:

•    Senar: ${chosenString ?? "-"}
•    Tarikan: ${tarikan}
•    Kode Pesanan: *${code}*

Status pengerjaan dapat Anda pantau secara langsung melalui Tirtonic Stringing Room:
${stringingRoomLink()}

Mohon simpan kode pesanan untuk pengambilan raket. Kami akan mengabari Anda di setiap tahap pengerjaan.

Salam hangat,
${branch.name} 🎾`,
  );
  if (ok) await prisma.sfOrder.update({ where: { id: order.id }, data: { notifiedInAt: new Date() } });

  return NextResponse.json({ ok: true, orderId: order.id, notified: ok });
}
