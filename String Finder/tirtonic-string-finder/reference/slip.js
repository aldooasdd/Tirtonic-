/**
 * Resep stringing (slip printer thermal) — implementasi acuan.
 * buildSlip(): data terstruktur (deterministik). renderSlipHTML(): template cetak 58/80 mm untuk browser print.
 * Butuh engine.js (StringFinder) sudah dimuat.
 */
(function (root) {
  const LABEL = {
    level: { pemula: 'Baru mulai', rutin: 'Rutin (rekreasi)', kompetitif: 'Kompetitif' },
    swing: { santai: 'Santai, pendek', sedang: 'Sedang', cepat: 'Penuh, cepat' },
    priorities: { spin: 'Spin', power: 'Power', control: 'Kontrol', comfort: 'Nyaman' },
    arm: { tidak: 'Tidak ada keluhan', pegal: 'Kadang pegal', cedera: 'Sedang cedera' },
    change: { cepat: '< 1 bulan', sedang: '1-3 bulan', lama: '> 3 bulan' },
    breakage: { sering: 'Sering', kadang: 'Kadang', tidak: 'Tidak pernah' },
    tension: { rendah: '< 48 lbs', sedang: '48-55 lbs', tinggi: '> 55 lbs', tidaktahu: 'Tidak tahu' }
  };
  const ATTR_LABEL = { spin: 'Spin', power: 'Power', control: 'Kontrol', comfort: 'Nyaman', stability: 'Tensi awet', durability: 'Tahan putus' };
  const fmt = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

  // Kode resep pendek & mudah dibaca. Produksi: pastikan unik (cek DB, ulangi bila bentrok).
  function makeCode(rules, rand = Math.random) {
    const s = rules.slip, a = s.code_alphabet;
    let c = ''; for (let i = 0; i < s.code_length; i++) c += a[Math.floor(rand() * a.length)];
    return s.code_prefix + c;
  }

  function pickFlags(rules, answers, pick) {
    return rules.slip.flags.filter(f => {
      if (f.when && !Object.entries(f.when).every(([k, v]) => answers[k] === v)) return false;
      const w = f.when_pick; if (!w) return true;
      if (w.stability_below != null && !(pick.attrs.stability != null && pick.attrs.stability < w.stability_below)) return false;
      if (w.gauge_below != null && !(pick.string.g != null && pick.string.g < w.gauge_below)) return false;
      if (w.estimated && pick.exact) return false;
      return true;
    }).map(f => f.text);
  }

  /**
   * result  : output StringFinder.recommend()
   * answers : jawaban customer
   * opts    : { code, createdAt (Date), branch, chosenRank (1|2|3|null = cetak ketiganya), qrUrl, paper }
   */
  function buildSlip(result, answers, rules, opts) {
    const picks = result.picks;
    const chosen = opts.chosenRank ? picks[opts.chosenRank - 1] : null;
    // Sorotan = nilai atribut prioritas customer (urut prioritas). Tanpa prioritas: 2 atribut tertinggi berbobot >= 10%.
    const pr = result.plan.priorities || [];
    const top2 = p => (pr.length ? pr.map(k => [k, p.attrs[k]]).filter(([, v]) => v != null)
      : Object.entries(p.attrs).filter(([k, v]) => v != null && result.plan.weights[k] >= 0.10).sort((a, b) => b[1] - a[1]).slice(0, 2))
      .map(([k, v]) => `${ATTR_LABEL[k]} ${Math.round(v)}`).join(', ');
    const item = (p, i) => ({ rank: i + 1, name: p.string.n, material: p.string.m, gauge_mm: p.string.g,
      score: Math.round(p.score), highlights: top2(p) });
    const flagSource = chosen ? [chosen] : picks;
    const flags = [...new Set(flagSource.flatMap(p => pickFlags(rules, answers, p)))];
    return {
      code: opts.code, created_at: opts.createdAt.toISOString(), branch: opts.branch, paper: opts.paper || rules.slip.paper_default,
      mode: chosen ? 'single' : 'all',
      chosen: chosen ? item(chosen, opts.chosenRank - 1) : null,
      options: chosen ? picks.map(item).filter(x => x.rank !== opts.chosenRank) : picks.map(item),
      tension_usual: LABEL.tension[answers.tension],
      profile: [
        ['Level', LABEL.level[answers.level]], ['Ayunan', LABEL.swing[answers.swing]],
        ['Prioritas', (answers.priorities || []).map((p, i) => `${i + 1} ${LABEL.priorities[p]}`).join(', ')],
        ['Lengan', LABEL.arm[answers.arm]], ['Ganti senar', LABEL.change[answers.change]], ['Senar putus', LABEL.breakage[answers.breakage]]
      ],
      flags,
      handwritten: rules.slip.handwritten_fields,
      qr_url: opts.qrUrl
    };
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderSlipHTML(slip, qrSvg = '') {
    const w = slip.paper === '80' ? 72 : 48; // lebar area cetak (mm)
    const d = new Date(slip.created_at);
    const pad = n => String(n).padStart(2, '0');
    const when = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const str = (x, big) => `<div class="${big ? 'name big' : 'name'}">${x.rank}. ${esc(x.name)}</div>
      <div class="meta">${esc(x.material)}, ${x.gauge_mm ? fmt(x.gauge_mm) + ' mm' : 'gauge ?'} | Cocok ${x.score}/100</div>
      ${x.highlights ? `<div class="meta">${esc(x.highlights)}</div>` : ''}`;
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Resep ${esc(slip.code)}</title><style>
@page { size: ${slip.paper}mm auto; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: ${w}mm; margin: 0 auto; padding: 2mm 0 6mm; font: 9pt/1.3 Arial, "Helvetica Neue", sans-serif; color: #000; background: #fff; }
.c { text-align: center; } .shop { font-weight: 700; font-size: 11pt; } .title { font-size: 10pt; }
.code { font-weight: 700; font-size: 16pt; letter-spacing: 1px; margin: 1mm 0; }
hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
h2 { font-size: 9pt; font-weight: 700; margin-bottom: 1mm; }
.name { font-weight: 700; font-size: 10pt; } .name.big { font-size: 12pt; } .meta { font-size: 8.5pt; }
.opt { margin-top: 1.5mm; }
table { width: 100%; border-collapse: collapse; font-size: 8.5pt; } td { vertical-align: top; padding: 0.3mm 0; } td:first-child { width: 42%; }
.blank { display: flex; align-items: flex-end; gap: 1.5mm; margin-top: 2.6mm; font-size: 9pt; } .line { flex: 1; border-bottom: 1px solid #000; min-height: 1em; }
.big-blank { font-size: 11pt; font-weight: 700; }
ul { padding-left: 3.5mm; font-size: 8.5pt; } li { margin-bottom: 0.8mm; }
.qr { display: flex; justify-content: center; margin-top: 2mm; } .qr svg { width: 22mm; height: 22mm; }
.foot { font-size: 7pt; margin-top: 1.5mm; }
</style></head><body>
<div class="c"><div class="shop">TIRTONIC TENNIS STORE</div><div class="title">Resep Senar</div>
<div class="code">${esc(slip.code)}</div><div class="meta">${when} | ${esc(slip.branch)}</div></div>
<hr>
${slip.mode === 'single'
  ? `<h2>Senar pilihan customer</h2>${str(slip.chosen, true)}`
  : `<h2>Pilihan senar (lingkari yang dipakai)</h2>${slip.options.map((o, i) => `<div class="${i ? 'opt' : ''}">${str(o, i === 0)}</div>`).join('')}`}
<hr>
<h2>Tensi</h2>
<div class="meta">Biasa dipakai customer: ${esc(slip.tension_usual)}</div>
<div class="blank big-blank"><span>Tensi final</span><span class="line"></span><span>lbs</span></div>
<div class="blank"><span>Mains</span><span class="line"></span><span>Crosses</span><span class="line"></span></div>
<hr>
<h2>Profil pemain</h2>
<table>${slip.profile.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
${slip.flags.length ? `<hr><h2>Perhatian stringer</h2><ul>${slip.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
${slip.mode === 'single' && slip.options.length ? `<hr><h2>Alternatif</h2>${slip.options.map(o => `<div class="meta">${o.rank}. ${esc(o.name)}, cocok ${o.score}</div>`).join('')}` : ''}
<hr>
${slip.handwritten.map(f => `<div class="blank"><span>${esc(f)}</span><span class="line"></span></div>`).join('')}
${qrSvg ? `<div class="qr">${qrSvg}</div>` : ''}
<div class="c foot">Data lab: Tennis Warehouse University</div>
</body></html>`;
  }

  root.StringSlip = { buildSlip, renderSlipHTML, makeCode, LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
