import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranch } from "@/lib/string-finder/session";
import { tooManyJobs } from "@/lib/string-finder/jobs";
import { normalizePhone } from "@/lib/string-finder/phone";
import { notify } from "@/lib/string-finder/notify";

export const dynamic = "force-dynamic";

// Perangkat toko membuat job cetak (+ pesanan stringing bila ada nomor WA). Stasiun cabang yang mencetak.
export async function POST(req: NextRequest) {
  let body: { code?: unknown; chosen_rank?: unknown; phone?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code : "";
  if (!code) return NextResponse.json({ error: "code wajib." }, { status: 400 });

  const branch = await getActiveBranch();
  if (!branch) return NextResponse.json({ error: "Cabang perangkat belum dipilih." }, { status: 400 });

  if (await tooManyJobs(branch.id)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan cetak. Coba lagi sebentar." }, { status: 429 });
  }

  const rec = await prisma.sfResult.findUnique({ where: { code }, select: { code: true, picks: true } });
  if (!rec) return NextResponse.json({ error: "Resep tidak ditemukan." }, { status: 404 });

  const cr = body.chosen_rank;
  const n = cr === null || cr === undefined ? null : Number(cr);
  const jobRank = n && n >= 1 && n <= 3 ? n : null; // null = cetak ketiganya

  // Nomor WhatsApp opsional. Kalau ada & valid → buat pesanan stringing + kirim event ke n8n.
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : null;
  if (typeof body.phone === "string" && body.phone.trim() && !phone) {
    return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
  }

  const job = await prisma.sfPrintJob.create({
    data: { resultCode: code, branchId: branch.id, chosenRank: jobRank, requestedBy: "device" },
  });
  await prisma.sfResult.update({ where: { code }, data: { chosenRank: jobRank ?? 0 } });

  let orderId: string | null = null;
  if (phone) {
    const eta = await prisma.sfBranch.findUnique({ where: { id: branch.id }, select: { etaMinutes: true } });
    const picks = (rec.picks as unknown as { name: string }[]) ?? [];
    const chosenString = jobRank ? picks[jobRank - 1]?.name ?? null : null;
    const order = await prisma.sfOrder.create({
      data: {
        resultCode: code,
        branchId: branch.id,
        phone,
        customerName: name,
        chosenRank: jobRank,
        chosenString,
        etaMinutes: eta?.etaMinutes ?? 30,
        notifiedInAt: new Date(),
      },
      select: { id: true, etaMinutes: true, chosenString: true },
    });
    orderId = order.id;
    // Kirim event "terima kasih" (tidak menggagalkan respons kalau webhook mati).
    void notify({
      event: "pesanan_masuk",
      phone,
      code,
      branch: branch.name,
      chosenString: order.chosenString,
      etaMinutes: order.etaMinutes,
      customerName: name,
    });
  }

  return NextResponse.json({ id: job.id, status: job.status, orderId });
}
