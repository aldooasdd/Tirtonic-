import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prepare, recommend, selectPhase2, ATTRS } from "../src/lib/string-finder/engine";
import type { Dataset, Rules } from "../src/lib/string-finder/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, "../docs/string-finder/reference");
const DATA = join(HERE, "../docs/string-finder/data");
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));

const data: Dataset = load(join(DATA, "strings.json"));
const rules: Rules = load(join(REF, "rules.json"));
const tc = load(join(REF, "test-cases.json"));
const P = prepare(data);

for (const c of tc.phase1) {
  test(`engine phase1 · ${c.id}`, () => {
    const r = recommend(P, c.answers, rules);
    assert.equal(r.plan.condition, c.expected.condition, "condition");

    const wp = Object.fromEntries(ATTRS.map((k) => [k, Math.round(r.plan.weights[k] * 1000) / 10]));
    assert.deepEqual(wp, c.expected.weights_pct, "weights_pct");

    assert.deepEqual(r.plan.filters.map((f) => f.exclude_material), c.expected.excluded_materials, "excluded_materials");
    assert.equal(r.stats.candidates, c.expected.candidates, "candidates");
    assert.equal(r.picks!.length, c.expected.picks.length, "jumlah picks");

    r.picks!.forEach((p, i) => {
      const e = c.expected.picks[i];
      assert.equal(p.string.n, e.string, `nama #${i + 1}`);
      assert.equal(p.string.m, e.material, `material #${i + 1}`);
      assert.ok(Math.abs(p.score - e.score) <= 0.1, `skor #${i + 1}: ${p.score} vs ${e.score}`);
      assert.deepEqual(p.explanation!.strengths.map((s) => s.text), e.strengths, `strengths #${i + 1}`);
      assert.equal(p.explanation!.weakness.text, e.weakness, `weakness #${i + 1}`);
      assert.deepEqual(p.explanation!.notes, e.notes, `notes #${i + 1}`);
    });
  });
}

for (const c of tc.phase2) {
  test(`engine phase2 · ${c.id}`, () => {
    const items = c.input.map((x: any) => ({ string: { n: x.string, f: x.string }, score: x.score, product: x }));
    const r = selectPhase2(items, rules.phase2);
    assert.deepEqual(r.picks.map((p) => ({ label: p.label, string: p.string.n })), c.expected.picks, "picks");
    assert.equal(r.best_match ? r.best_match.string.n : null, c.expected.best_match_note ?? null, "best_match");
    assert.equal(r.threshold, c.expected.threshold, "threshold");
  });
}
