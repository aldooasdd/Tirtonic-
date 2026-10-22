import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";

const LOCS = new Set(["jogja", "solo", "semarang"]);

// Peringkat 1 nomor HP di bulan+lokasi tertentu (buat bar "POSISI ANDA" di leaderboard).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const phone = normalizePhone(sp.get("phone") ?? "");
  if (!phone) return NextResponse.json({ found: false });

  const loc = sp.get("loc") && LOCS.has(sp.get("loc")!) ? sp.get("loc")! : "global";
  const real = new Date();
  let y = real.getFullYear(), m = real.getMonth();
  const ym = sp.get("ym")?.match(/^(\d{4})-(\d{2})$/);
  if (ym) { y = Number(ym[1]); m = Number(ym[2]) - 1; }
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);

  const orders = await prisma.sfOrder.findMany({
    where: { createdAt: { gte: start, lt: end }, ...(loc !== "global" ? { branch: { slug: loc } } : {}) },
    select: { phone: true },
  });
  const counts = new Map<string, number>();
  for (const o of orders) counts.set(o.phone, (counts.get(o.phone) ?? 0) + 1);

  const sorted = [...counts.entries()].map(([p, n]) => ({ p, n })).sort((a, b) => b.n - a.n);
  const idx = sorted.findIndex((x) => x.p === phone);
  if (idx < 0) return NextResponse.json({ found: false });

  const n = sorted[idx].n;
  const rank = idx + 1;
  // Selisih stringing untuk tembus posisi ke-3 (0 kalau sudah ≤3).
  const third = sorted[2]?.n ?? 0;
  const toTop3 = rank <= 3 ? 0 : Math.max(1, third + 1 - n);
  return NextResponse.json({ found: true, rank, n, toTop3 });
}
