import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEngine } from "@/lib/string-finder/load";
import { makeCode } from "@/lib/string-finder/slip";
import { getActiveBranch } from "@/lib/string-finder/session";

export const dynamic = "force-dynamic";

// Jalur "Tirtonic Team": kasir pilih senar manual tanpa mesin rekomendasi.
// Buat SfResult minimal (tanpa rekomendasi) supaya dapat kode order yang valid.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Prefix kode ikut metode: hybrid → HB, full bed/katalog → FB.
  const prefix = (body as { method?: string })?.method === "hybrid" ? "HB" : "FB";

  const { rules, ruleVersion, datasetVersion } = await getEngine();
  const branch =
    (await getActiveBranch()) ??
    (await prisma.sfBranch.findFirst({ where: { slug: "tirtonic", isActive: true }, select: { id: true } }));

  let code = makeCode(rules, Math.random, prefix);
  for (let i = 0; i < 20; i++) {
    const exist = await prisma.sfResult.findUnique({ where: { code }, select: { code: true } });
    if (!exist) break;
    code = makeCode(rules, Math.random, prefix);
  }

  await prisma.sfResult.create({
    data: {
      code,
      branchId: branch?.id ?? null,
      answers: {} as Prisma.InputJsonValue,
      condition: "manual",
      ruleVersion,
      datasetVersion,
      picks: [] as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ code, tension_suggestion: 50 });
}
