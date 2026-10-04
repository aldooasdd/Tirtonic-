import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  antri: "Antri", dikerjakan: "Dikerjakan", selesai: "Selesai", batal: "Batal",
};

/** Riwayat stringing customer berdasarkan nomor WhatsApp. */
export async function GET(req: NextRequest) {
  const phone = normalizePhone(req.nextUrl.searchParams.get("phone") ?? "");
  if (!phone) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });

  const orders = await prisma.sfOrder.findMany({
    where: { phone },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { resultCode: true, chosenString: true, status: true, createdAt: true, customerName: true },
  });

  return NextResponse.json({
    phone,
    count: orders.length,
    lastName: orders.find((o) => o.customerName)?.customerName ?? null,
    history: orders.map((o) => ({
      code: o.resultCode,
      senar: o.chosenString,
      status: o.status,
      statusLabel: STATUS_LABEL[o.status] ?? o.status,
      date: o.createdAt,
    })),
  });
}
