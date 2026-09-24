// Verifikasi engine terhadap golden output. Pakai pola yang sama untuk implementasi TypeScript di proyek Next.js.
require('./engine.js');
const data = require('../data/strings.json'), rules = require('./rules.json'), tc = require('./test-cases.json');
const P = StringFinder.prepare(data);
let fail = 0;
for (const c of tc.phase1) {
  const r = StringFinder.recommend(P, c.answers, rules);
  const got = r.picks.map(p => p.string.n), exp = c.expected.picks.map(p => p.string);
  const okNames = JSON.stringify(got) === JSON.stringify(exp);
  const okScores = r.picks.every((p, i) => Math.abs(p.score - c.expected.picks[i].score) <= 0.1);
  const okCond = r.plan.condition === c.expected.condition;
  if (!(okNames && okScores && okCond)) { fail++; console.log('GAGAL', c.id, { got, exp }); } else console.log('lulus', c.id);
}
for (const c of tc.phase2) {
  const items = c.input.map(x => ({ string: { n: x.string, f: x.string }, score: x.score, product: x }));
  const r = StringFinder.selectPhase2(items, rules.phase2);
  const got = r.picks.map(p => p.label + ':' + p.string.n), exp = c.expected.picks.map(p => p.label + ':' + p.string);
  if (JSON.stringify(got) !== JSON.stringify(exp)) { fail++; console.log('GAGAL', c.id, { got, exp }); } else console.log('lulus', c.id);
}
// Golden resep stringing
require('./slip.js');
const sc = require('./slip-test-cases.json');
for (const [id, exp] of Object.entries(sc.cases)) {
  const c = tc.phase1.find(x => x.id === id);
  const r = StringFinder.recommend(P, c.answers, rules);
  const got = StringSlip.buildSlip(r, c.answers, rules, { code: exp.code, createdAt: new Date(exp.created_at), branch: exp.branch,
    chosenRank: exp.mode === 'single' ? exp.chosen.rank : null, qrUrl: exp.qr_url, paper: exp.paper });
  if (JSON.stringify(got) !== JSON.stringify(exp)) { fail++; console.log('GAGAL resep', id); } else console.log('lulus resep', id);
}
console.log(fail ? `\n${fail} kasus gagal` : '\nSemua kasus lulus');
process.exit(fail ? 1 : 0);
