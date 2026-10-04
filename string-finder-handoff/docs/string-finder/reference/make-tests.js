// Membuat test-cases.json (golden output) dari engine acuan. Dijalankan sekali oleh Claude di chat.
require('./engine.js');
const fs = require('fs');
const data = require('../data/strings.json'), rules = require('./rules.json');
const P = StringFinder.prepare(data);
const profiles = [
  { id: 'baseline-spin-kontrol', answers: { level: 'kompetitif', swing: 'cepat', priorities: ['spin', 'control'], arm: 'tidak', change: 'sedang', breakage: 'kadang', tension: 'sedang' } },
  { id: 'rekreasi-nyaman-pegal', answers: { level: 'rutin', swing: 'sedang', priorities: ['comfort', 'power'], arm: 'pegal', change: 'lama', breakage: 'tidak', tension: 'tidaktahu' } },
  { id: 'pemula-power', answers: { level: 'pemula', swing: 'santai', priorities: ['power'], arm: 'tidak', change: 'lama', breakage: 'tidak', tension: 'rendah' } },
  { id: 'cedera-kontrol-konflik', answers: { level: 'rutin', swing: 'cepat', priorities: ['control', 'comfort'], arm: 'cedera', change: 'sedang', breakage: 'sering', tension: 'tinggi' } },
  { id: 'kompetitif-kontrol-sering-putus', answers: { level: 'kompetitif', swing: 'cepat', priorities: ['control', 'spin'], arm: 'tidak', change: 'cepat', breakage: 'sering', tension: 'tinggi' } },
  { id: 'rutin-spin-tensi-awet', answers: { level: 'rutin', swing: 'sedang', priorities: ['spin'], arm: 'tidak', change: 'lama', breakage: 'kadang', tension: 'sedang' } },
  { id: 'rutin-power-nyaman-lambat', answers: { level: 'rutin', swing: 'santai', priorities: ['power', 'comfort'], arm: 'pegal', change: 'sedang', breakage: 'tidak', tension: 'rendah' } },
  { id: 'kompetitif-spin-pegal', answers: { level: 'kompetitif', swing: 'cepat', priorities: ['spin', 'comfort'], arm: 'pegal', change: 'cepat', breakage: 'kadang', tension: 'rendah' } }
];
const cases = profiles.map(p => {
  const r = StringFinder.recommend(P, p.answers, rules);
  return {
    id: p.id, answers: p.answers,
    expected: {
      condition: r.plan.condition,
      weights_pct: Object.fromEntries(Object.entries(r.plan.weights).map(([k, v]) => [k, Math.round(v * 1000) / 10])),
      excluded_materials: r.plan.filters.map(f => f.exclude_material),
      candidates: r.stats.candidates,
      picks: r.picks.map(x => ({ string: x.string.n, material: x.string.m, score: Math.round(x.score * 10) / 10,
        strengths: x.explanation.strengths.map(s => s.text), weakness: x.explanation.weakness.text, notes: x.explanation.notes }))
    }
  };
});
// Kasus fase 2 dengan data sintetis (contoh A–F dari diskusi): harus memilih D, B, C.
const synth = [['A', 92, 180000, 45], ['B', 90, 320000, 12], ['C', 88, 95000, 30], ['D', 86, 150000, 60], ['E', 81, 210000, 8], ['F', 70, 60000, 50]]
  .map(([n, score, price, sold]) => ({ string: { n, f: n }, score, product: { price_per_set: price, sold_90d: sold, in_stock: true } }));
const ph2 = StringFinder.selectPhase2(synth, rules.phase2);
const phase2Case = { id: 'fase2-contoh-A-F', input: synth.map(x => ({ string: x.string.n, score: x.score, ...x.product })),
  expected: { picks: ph2.picks.map(p => ({ label: p.label, string: p.string.n })), best_match_note: ph2.best_match && ph2.best_match.string.n, threshold: ph2.threshold } };
fs.writeFileSync('test-cases.json', JSON.stringify({ note: 'Golden output dari engine acuan. Implementasi produksi wajib lolos semua kasus ini (skor toleransi ±0,1).', phase1: cases, phase2: [phase2Case] }, null, 2));
for (const c of cases) {
  console.log(`\n## ${c.id} | ${c.expected.condition} | excl=${c.expected.excluded_materials} | kandidat=${c.expected.candidates}`);
  console.log('   bobot', JSON.stringify(c.expected.weights_pct));
  c.expected.picks.forEach(p => { console.log(`   ${p.score}  ${p.string} [${p.material}]`); p.strengths.forEach(s => console.log('      +', s)); console.log('      -', p.weakness); p.notes.forEach(n => console.log('      i', n)); });
}
console.log('\n## fase 2:', JSON.stringify(phase2Case.expected));
