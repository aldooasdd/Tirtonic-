/**
 * Tirtonic String Finder — reference engine (JavaScript, tanpa dependensi, tanpa LLM).
 * Implementasi acuan untuk Claude Code. Versi produksi boleh ditulis ulang di TypeScript,
 * tetapi WAJIB menghasilkan output yang sama dengan test-cases.json.
 *
 * Input : strings.json (data TWU yang sudah dibersihkan), rules.json, jawaban customer.
 * Output: 3 rekomendasi + skor + alasan berbasis angka.
 */
(function (root) {
  const TEN = [40, 51, 62], SW = ['S', 'M', 'F'];
  const CONDITIONS = TEN.flatMap(t => SW.map(s => t + s));      // '40S' ... '62F'
  const METRICS = ['st', 'tl', 'er', 'dw', 'sp'];                // stiffness, tension loss %, energy return %, dwell time, spin potential
  const ATTRS = ['spin', 'power', 'control', 'comfort', 'stability', 'durability'];
  const SWING_LABEL = { S: 'lambat', M: 'sedang', F: 'cepat' };

  // Persentil 0–100 (0 = nilai terendah, 100 = tertinggi). Nilai null diabaikan. Nilai seri dapat rata-rata posisi.
  function percentileRank(values) {
    const idx = values.map((v, i) => [v, i]).filter(x => x[0] != null).sort((a, b) => a[0] - b[0]);
    const out = new Array(values.length).fill(null), n = idx.length;
    let i = 0;
    while (i < n) {
      let j = i; while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const p = n > 1 ? ((i + j) / 2) / (n - 1) * 100 : 50;
      for (let k = i; k <= j; k++) out[idx[k][1]] = p;
      i = j + 1;
    }
    return out;
  }

  // Dijalankan sekali saat data dimuat (bisa di-cache).
  function prepare(data) {
    const pct = {};
    for (const c of CONDITIONS) { pct[c] = {}; for (const m of METRICS) pct[c][m] = percentileRank(data.slices[c][m]); }
    const gaugePct = percentileRank(data.strings.map(s => s.g));
    // Urutan kondisi pengganti bila data kondisi customer tidak ada:
    // jarak terdekat (selisih indeks tensi + selisih indeks swing); jika seri, 51F didahulukan.
    const fallbackOrder = {};
    for (const c of CONDITIONS) {
      const ti = TEN.indexOf(+c.slice(0, 2)), si = SW.indexOf(c[2]);
      const dist = x => Math.abs(TEN.indexOf(+x.slice(0, 2)) - ti) + Math.abs(SW.indexOf(x[2]) - si);
      fallbackOrder[c] = CONDITIONS.slice().sort((a, b) => dist(a) - dist(b) || (a === '51F' ? -1 : b === '51F' ? 1 : 0));
    }
    return { data, pct, gaugePct, fallbackOrder };
  }

  // Jawaban customer -> bobot, filter keras, kondisi data.
  function buildPlan(answers, rules) {
    const w = { ...rules.base_weights };
    const add = obj => { for (const k in obj || {}) w[k] = Math.max(0, w[k] + obj[k]); };
    (answers.priorities || []).forEach((p, i) => { w[p] += rules.priority_bonus[i] || 0; });
    for (const q of ['level', 'swing', 'arm', 'change', 'breakage']) add((rules.adjustments[q] || {})[answers[q]]);
    const total = ATTRS.reduce((s, k) => s + w[k], 0);
    const weights = Object.fromEntries(ATTRS.map(k => [k, w[k] / total]));
    const filters = [];
    for (const f of rules.hard_filters) {
      const hit = f.when_any.find(cond => Object.entries(cond).every(([k, v]) => answers[k] === v));
      if (hit) { const key = Object.entries(hit)[0].join('='); filters.push({ exclude_material: f.exclude_material, reason: f.reason[key] || key }); }
    }
    const swing = rules.condition_map.swing[answers.swing] || 'M';
    const tension = rules.condition_map.tension[answers.tension] || 51;
    return { weights, filters, condition: tension + swing, priorities: answers.priorities || [] };
  }

  function metric(P, i, m, condition) {
    for (const c of P.fallbackOrder[condition]) {
      const p = P.pct[c][m][i];
      if (p != null) return { p, raw: P.data.slices[c][m][i], condition: c, exact: c === condition };
    }
    return null;
  }

  // Rumus atribut (semua skala 0–100, makin tinggi makin baik untuk atribut itu).
  function attributes(M, gaugeP) {
    return {
      spin: M.sp ? M.sp.p : null,                                                         // spin potential tinggi
      control: M.st ? M.st.p : null,                                                      // lebih kaku = lebih terkontrol
      comfort: M.st ? (M.dw ? 0.7 * (100 - M.st.p) + 0.3 * M.dw.p : 100 - M.st.p) : null, // lembut + dwell time panjang
      power: M.st && M.er ? 0.5 * M.er.p + 0.5 * (100 - M.st.p) : null,                   // energy return tinggi + lembut
      stability: M.tl ? 100 - M.tl.p : null,                                              // tension loss rendah
      durability: gaugeP                                                                  // gauge lebih tebal
    };
  }

  function scoreAll(P, answers, rules) {
    const plan = buildPlan(answers, rules);
    const excluded = new Set(plan.filters.map(f => f.exclude_material));
    const neutral = rules.selection.neutral_percentile_for_missing;
    const stats = { total: P.data.strings.length, filtered_material: 0, missing_priority_data: 0, limited_coverage: 0 };
    const ranked = [];
    P.data.strings.forEach((s, i) => {
      if (excluded.has(s.m) || (excluded.size && rules.exclude_unknown_material_when_filtering && s.m === 'Tidak diketahui')) { stats.filtered_material++; return; }
      if (rules.selection.exclude_coverage.includes(s.c)) { stats.limited_coverage++; return; }
      const M = Object.fromEntries(METRICS.map(m => [m, metric(P, i, m, plan.condition)]));
      const A = attributes(M, P.gaugePct[i]);
      // Atribut prioritas customer WAJIB punya data; kalau tidak, senar tidak boleh direkomendasikan.
      if (plan.priorities.some(p => A[p] == null)) { stats.missing_priority_data++; return; }
      const score = ATTRS.reduce((sum, k) => sum + plan.weights[k] * (A[k] == null ? neutral : A[k]), 0);
      const exact = ['st', 'tl', 'sp'].every(m => !M[m] || M[m].exact);
      ranked.push({ index: i, string: s, metrics: M, attrs: A, score, exact, gaugePct: P.gaugePct[i] });
    });
    ranked.sort((a, b) => b.score - a.score || (b.exact - a.exact) || a.string.n.localeCompare(b.string.n));
    stats.candidates = ranked.length;
    return { plan, ranked, stats };
  }

  function onePerFamily(ranked) {
    const seen = new Set(), out = [];
    for (const r of ranked) { if (seen.has(r.string.f)) continue; seen.add(r.string.f); out.push(r); }
    return out;
  }

  // FASE 1: 3 senar dengan skor tertinggi, masing-masing dari keluarga senar berbeda.
  function recommend(P, answers, rules) {
    const res = scoreAll(P, answers, rules);
    const pool = rules.selection.one_per_family ? onePerFamily(res.ranked) : res.ranked;
    res.picks = pool.slice(0, rules.selection.top_n).map(r => ({ ...r, explanation: explain(r, res.plan) }));
    return res;
  }

  // FASE 2: dari kelompok "cocok", pilih Terlaris, Premium (termahal), Paling hemat (termurah).
  // products: { [nama senar TWU]: { price_per_set, sold_90d, in_stock } }
  function recommendPhase2(P, answers, rules, products) {
    const res = scoreAll(P, answers, rules);
    const cfg = rules.phase2;
    const avail = onePerFamily(res.ranked.filter(r => products[r.string.n] && products[r.string.n].in_stock));
    res.phase2 = selectPhase2(avail.map(r => ({ ...r, product: products[r.string.n] })), cfg);
    res.phase2.picks.forEach(p => { p.explanation = explain(p, res.plan); });
    return res;
  }

  // Terpisah supaya bisa dites dengan data sintetis. items sudah terurut skor turun & sudah 1 per keluarga.
  function selectPhase2(items, cfg) {
    if (!items.length) return { picks: [], best_match: null, threshold: null };
    const top = items[0].score;
    let t = cfg.pool_threshold, pool = items.filter(x => x.score >= t * top);
    while (pool.length < 3 && t - cfg.pool_step >= cfg.pool_floor - 1e-9) { t -= cfg.pool_step; pool = items.filter(x => x.score >= t * top); }
    const left = pool.slice(), picks = [];
    const take = (label, cmp) => {
      if (!left.length) return;
      left.sort((a, b) => cmp(a, b) || b.score - a.score);
      picks.push({ ...left.shift(), label });
    };
    take(cfg.labels.bestseller, (a, b) => b.product.sold_90d - a.product.sold_90d);
    take(cfg.labels.premium, (a, b) => b.product.price_per_set - a.product.price_per_set);
    take(cfg.labels.budget, (a, b) => a.product.price_per_set - b.product.price_per_set);
    const bestMatch = pool[0];
    return { picks, best_match: picks.some(p => p.string.n === bestMatch.string.n) ? null : bestMatch, threshold: +t.toFixed(2) };
  }

  // ---- Penjelasan berbasis angka (template, bukan AI) ----
  const fmt = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const r0 = x => Math.min(99, Math.max(1, Math.round(x))); // hindari "lebih ... dari 100% senar"

  function strengthText(k, r, others = []) {
    const M = r.metrics;
    switch (k) {
      case 'spin': return `Potensi spin lebih tinggi dari ${r0(M.sp.p)}% senar yang diuji (nilai ${fmt(M.sp.raw)}).`;
      case 'comfort': return `Lebih lembut dari ${r0(100 - M.st.p)}% senar yang diuji (stiffness ${fmt(M.st.raw, 0)} lb/in).`;
      case 'control': return `Lebih kaku dari ${r0(M.st.p)}% senar, jadi arah bola lebih mudah dijaga (stiffness ${fmt(M.st.raw, 0)} lb/in).`;
      case 'power': return (M.er.p >= 100 - M.st.p || others.includes('comfort'))
        ? `Mengembalikan energi lebih baik dari ${r0(M.er.p)}% senar (energy return ${fmt(M.er.raw)}%).`
        : `Lentur (lebih lembut dari ${r0(100 - M.st.p)}% senar), membantu bola melaju lebih jauh.`;
      case 'stability': return `Tensinya lebih awet dari ${r0(100 - M.tl.p)}% senar (tension loss ${fmt(M.tl.raw)}%).`;
      case 'durability': return `Lebih tebal dari ${r0(r.gaugePct)}% senar (${fmt(r.string.g, 2)} mm), jadi lebih tahan putus.`;
    }
  }
  function weaknessText(k, r) {
    const M = r.metrics;
    switch (k) {
      case 'spin': return `Potensi spin di bawah rata-rata (lebih rendah dari ${r0(100 - M.sp.p)}% senar).`;
      case 'comfort': return `Cukup kaku (lebih kaku dari ${r0(M.st.p)}% senar). Perhatikan kalau lengan mudah pegal.`;
      case 'control': return `Senarnya lembut, jadi bola cenderung melaju lebih jauh dan butuh kontrol dari ayunan.`;
      case 'power': return `Power di bawah rata-rata; kedalaman bola lebih banyak bergantung pada ayunan Anda.`;
      case 'stability': return `Tensi turun cukup cepat (tension loss ${fmt(M.tl.raw)}%), sebaiknya diganti lebih rutin.`;
      case 'durability': return `Gauge tipis (${fmt(r.string.g, 2)} mm), lebih cepat putus kalau sering topspin.`;
    }
  }

  function explain(r, plan) {
    const A = r.attrs, W = plan.weights;
    const cand = ATTRS.filter(k => A[k] != null && W[k] >= 0.10).sort((a, b) => W[b] * A[b] - W[a] * A[a]);
    let strengths = cand.filter(k => A[k] >= 60).slice(0, 2);
    if (!strengths.length && cand.length) strengths = [cand.slice().sort((a, b) => A[b] - A[a])[0]];
    const weakCand = ATTRS.filter(k => A[k] != null && A[k] < 35 && !strengths.includes(k) && (k !== 'durability' || W[k] >= 0.10))
      .sort((a, b) => Math.max(W[b], 0.05) * (50 - A[b]) - Math.max(W[a], 0.05) * (50 - A[a]));
    const notes = [];
    const nonExact = ['st', 'tl', 'sp', 'er', 'dw'].map(m => r.metrics[m]).filter(x => x && !x.exact);
    if (nonExact.length) {
      const c = nonExact[0].condition;
      notes.push(`Data lab untuk tensi dan ayunan Anda belum tersedia; dihitung dari pengujian ${c.slice(0, 2)} lbs, swing ${SWING_LABEL[c[2]]}.`);
    }
    if (!r.metrics.sp) notes.push('Potensi spin senar ini tidak diukur di data lab.');
    return {
      strengths: strengths.map(k => ({ attr: k, text: strengthText(k, r, strengths) })),
      weakness: weakCand.length ? { attr: weakCand[0], text: weaknessText(weakCand[0], r) }
                                : { attr: null, text: 'Tidak ada kelemahan menonjol untuk kebutuhan Anda.' },
      notes
    };
  }

  root.StringFinder = { prepare, buildPlan, scoreAll, recommend, recommendPhase2, selectPhase2, explain, ATTRS, CONDITIONS };
})(typeof window !== 'undefined' ? window : globalThis);
