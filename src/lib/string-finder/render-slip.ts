import "server-only";
import QRCode from "qrcode";
import { prisma } from "../prisma";
import { getEngine } from "./load";
import { recommend } from "./engine";
import { buildSlip, renderSlipHTML } from "./slip";
import type { Answers } from "./types";

/**
 * Bangun HTML resep lengkap dari kode. Dipakai pratinjau (tanpa QR) & cetak/stasiun/admin (dengan QR).
 * QR menunjuk ke {origin}/admin/resep/{code}.
 */
export async function renderSlipForCode(
  code: string,
  opts: { rank?: number | null; qr?: boolean; origin?: string; print?: boolean },
): Promise<string | null> {
  const rec = await prisma.sfResult.findUnique({ where: { code }, include: { branch: true } });
  if (!rec) return null;

  const rank = opts.rank ?? null;
  const chosenRank = rank && rank >= 1 && rank <= 3 ? rank : null;

  const { prepared, rules } = await getEngine();
  const answers = rec.answers as unknown as Answers;
  const result = recommend(prepared, answers, rules);

  const qrUrl = opts.qr && opts.origin ? `${opts.origin}/dashboard/stringing/${code}` : "";
  const slip = buildSlip(result, answers, rules, {
    code: rec.code,
    createdAt: rec.createdAt,
    branch: rec.branch?.name ?? "-",
    chosenRank,
    qrUrl,
    paper: rec.branch?.paperMm ?? rules.slip.paper_default,
  });

  let qrSvg = "";
  if (qrUrl) qrSvg = await QRCode.toString(qrUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  return renderSlipHTML(slip, qrSvg, opts.print ?? false);
}
