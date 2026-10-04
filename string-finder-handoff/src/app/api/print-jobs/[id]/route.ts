import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireStaleJobs } from "@/lib/string-finder/jobs";

export const dynamic = "force-dynamic";

// Perangkat toko cek status job untuk layar Selesai / pesan cadangan.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await expireStaleJobs();
  const job = await prisma.sfPrintJob.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, resultCode: true },
  });
  if (!job) return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  return NextResponse.json(job);
}
