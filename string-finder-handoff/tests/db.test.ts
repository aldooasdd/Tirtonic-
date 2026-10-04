/**
 * Golden engine dijalankan dengan data DARI DATABASE (PRD 1a: "jalankan dua kali").
 * Dilewati bila DATABASE_URL belum diset. Butuh `npm run import:twu` dan `npm run seed` lebih dulu.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, "../docs/string-finder/reference");
const tc = JSON.parse(readFileSync(join(REF, "test-cases.json"), "utf8"));

test("engine golden dari DATABASE", { skip: !process.env.DATABASE_URL }, async () => {
  const { buildDatasetFromDb, getActiveRules } = await import("../src/lib/string-finder/load");
  const { prepare, recommend } = await import("../src/lib/string-finder/engine");
  const { data } = await buildDatasetFromDb();
  const { rules } = await getActiveRules();
  const P = prepare(data);
  for (const c of tc.phase1) {
    const r = recommend(P, c.answers, rules);
    assert.equal(r.plan.condition, c.expected.condition, `${c.id} condition`);
    assert.equal(r.stats.candidates, c.expected.candidates, `${c.id} candidates`);
    r.picks!.forEach((p, i) => {
      assert.equal(p.string.n, c.expected.picks[i].string, `${c.id} nama #${i + 1}`);
      assert.ok(Math.abs(p.score - c.expected.picks[i].score) <= 0.1, `${c.id} skor #${i + 1}`);
    });
  }
});
