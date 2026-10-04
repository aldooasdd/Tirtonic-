import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prepare, recommend } from "../src/lib/string-finder/engine";
import { buildSlip } from "../src/lib/string-finder/slip";
import type { Dataset, Rules } from "../src/lib/string-finder/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, "../docs/string-finder/reference");
const DATA = join(HERE, "../docs/string-finder/data");
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));

const data: Dataset = load(join(DATA, "strings.json"));
const rules: Rules = load(join(REF, "rules.json"));
const tc = load(join(REF, "test-cases.json"));
const sc = load(join(REF, "slip-test-cases.json"));
const P = prepare(data);

for (const [id, exp] of Object.entries<any>(sc.cases)) {
  test(`slip · ${id}`, () => {
    const c = tc.phase1.find((x: any) => x.id === id);
    assert.ok(c, `kasus phase1 ${id} ada`);
    const r = recommend(P, c.answers, rules);
    const got = buildSlip(r, c.answers, rules, {
      code: exp.code,
      createdAt: new Date(exp.created_at),
      branch: exp.branch,
      chosenRank: exp.mode === "single" ? exp.chosen.rank : null,
      qrUrl: exp.qr_url,
      paper: exp.paper,
    });
    assert.deepEqual(got, exp);
  });
}
