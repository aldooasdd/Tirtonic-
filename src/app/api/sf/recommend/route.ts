import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEngine } from "@/lib/string-finder/load";
import { recommend, type MetricRes, type Ranked } from "@/lib/string-finder/engine";
import { makeCode } from "@/lib/string-finder/slip";
import { validateAnswers } from "@/lib/string-finder/validate";
import { profileSentence } from "@/lib/string-finder/profile";
import { suggestTension } from "@/lib/string-finder/tension";
import { racketStringWeights, racketStringNote, racketLabel, hasRacketInput, type RacketType, type RacketInput } from "@/lib/string-finder/racket";
import type { LabMetric, PickDTO } from "@/lib/string-finder/dto";

export const dynamic = "force-dynamic";

const lm = (m: MetricRes | null): LabMetric | null => (m ? { raw: m.raw, condition: m.condition, exact: m.exact } : null);

function toDTO(r: Ranked): PickDTO {
  return {
    name: r.string.n,
    material: r.string.m,
    gauge: r.string.g,
    price: r.string.p ?? null,
    score: r.score,
    attrs: r.attrs,
    metrics: { st: lm(r.metrics.st), tl: lm(r.metrics.tl), er: lm(r.metrics.er), dw: lm(r.metrics.dw), sp: lm(r.metrics.sp) },
    explanation: r.explanation!,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const v = validateAnswers((body as { answers?: unknown })?.answers);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const answers = v.answers;

  const b = body as { racketHead?: unknown; racketType?: unknown };
  const headNum = Number(b?.racketHead);
  const typeRaw = typeof b?.racketType === "string" ? b.racketType : null;
  const racket: RacketInput = {
    head: Number.isFinite(headNum) ? headNum : null,
    type: typeRaw === "power" || typeRaw === "spin" || typeRaw === "control" ? (typeRaw as RacketType) : null,
  };
  const hasRacket = hasRacketInput(racket);

  const { prepared, rules, ruleVersion, datasetVersion } = await getEngine();
  const result = recommend(prepared, answers, rules, hasRacket ? racketStringWeights(racket) : undefined);
  const picks = result.picks!.map(toDTO);
  const profile_summary = profileSentence(answers);
  const condition = result.plan.condition;
  const tension = suggestTension(answers, racket);

  // Website: satu cabang default (tanpa cookie perangkat).
  const branch = await prisma.sfBranch.findFirst({ where: { slug: "tirtonic", isActive: true }, select: { id: true } });

  let code = makeCode(rules);
  for (let i = 0; i < 20; i++) {
    const exist = await prisma.sfResult.findUnique({ where: { code }, select: { code: true } });
    if (!exist) break;
    code = makeCode(rules);
  }

  await prisma.sfResult.create({
    data: {
      code,
      branchId: branch?.id ?? null,
      answers: answers as unknown as Prisma.InputJsonValue,
      condition,
      ruleVersion,
      datasetVersion,
      picks: picks as unknown as Prisma.InputJsonValue,
      chosenRank: null,
    },
  });

  return NextResponse.json({
    code, condition, profile_summary, picks,
    tension_suggestion: tension.lbs,
    tension_note: tension.note,
    racket_label: hasRacket ? racketLabel(racket) : null,
    tension_racket_note: tension.racketNote ?? null,
    racket_string_note: hasRacket ? (racketStringNote(racket) || null) : null,
  });
}
