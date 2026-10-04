// Validasi jawaban terhadap questions.json. Input tidak valid -> 400 di /api/recommend.
import questionsJson from "./questions.json";
import type { Answers, AttrKey } from "./types";

interface Question {
  id: string;
  type: "single" | "multi";
  max?: number;
  options: { value: string }[];
}
const QUESTIONS = (questionsJson as { questions: Question[] }).questions;

export function validateAnswers(input: unknown): { ok: true; answers: Answers } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Jawaban tidak valid." };
  const a = input as Record<string, unknown>;
  const answers: Answers = {};
  for (const q of QUESTIONS) {
    const allowed = new Set(q.options.map((o) => o.value));
    const v = a[q.id];
    if (q.type === "multi") {
      if (!Array.isArray(v) || v.length < 1 || v.length > (q.max ?? 2)) {
        return { ok: false, error: `Jawaban "${q.id}" tidak valid.` };
      }
      const uniq = new Set(v);
      if (uniq.size !== v.length || v.some((x) => typeof x !== "string" || !allowed.has(x))) {
        return { ok: false, error: `Jawaban "${q.id}" tidak valid.` };
      }
      answers[q.id] = v as AttrKey[];
    } else {
      if (typeof v !== "string" || !allowed.has(v)) return { ok: false, error: `Jawaban "${q.id}" tidak valid.` };
      answers[q.id] = v;
    }
  }
  return { ok: true, answers };
}
