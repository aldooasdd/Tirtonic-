// Contoh resep untuk profil uji pertama (dipakai sebagai acuan tampilan & golden slip).
require('./engine.js'); require('./slip.js');
const fs = require('fs');
const data = require('../data/strings.json'), rules = require('./rules.json'), tc = require('./test-cases.json');
const P = StringFinder.prepare(data);
const out = {};
for (const [id, chosenRank, branch] of [['baseline-spin-kontrol', 1, 'Yogyakarta'], ['cedera-kontrol-konflik', null, 'Solo']]) {
  const c = tc.phase1.find(x => x.id === id);
  const r = StringFinder.recommend(P, c.answers, rules);
  const slip = StringSlip.buildSlip(r, c.answers, rules, { code: chosenRank ? 'SF-7K2Q' : 'SF-M4TX', createdAt: new Date('2026-09-22T14:05:00'),
    branch, chosenRank, qrUrl: 'https://tirtonic.example/admin/string-finder/resep/' + (chosenRank ? 'SF-7K2Q' : 'SF-M4TX'), paper: '58' });
  out[id] = slip;
  fs.writeFileSync(`slip-sample-${chosenRank ? 'pilih-satu' : 'tiga-pilihan'}.html`, StringSlip.renderSlipHTML(slip, '{{QR_SVG}}'));
}
fs.writeFileSync('slip-test-cases.json', JSON.stringify({ note: 'Golden data resep (buildSlip). Tanggal & kode di-set tetap untuk tes.', cases: out }, null, 2));
console.log(JSON.stringify(out['baseline-spin-kontrol'], null, 1));
console.log(out['cedera-kontrol-konflik'].flags);
