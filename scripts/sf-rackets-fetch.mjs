// Tarik spec semua raket dari TWU compare-data endpoint → CSV.
// Satu JSON per raket: compareracquetsdata.cgi?racquetA-<CODE>. Rate-limited (sopan).
// Jalan: node scripts/sf-rackets-fetch.mjs
import fs from "node:fs";

const SRC = "docs/string-finder/data/rackets-twu-list.csv";
const OUT = "docs/string-finder/data/rackets-twu-specs.csv";
const EP = "https://twu.tennis-warehouse.com/cgi-bin/compareracquetsdata.cgi";
const DELAY = 150; // ms antar request
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// parse CSV (code,brand,model) — model bisa ada koma dalam kutip
function parseCsv(txt) {
  return txt.trim().split("\n").slice(1).map((line) => {
    const cells = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    return { code: cells[0], brand: cells[1], model: cells[2] };
  });
}

const esc = (x) => { const s = String(x ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function one(code, tries = 2) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(`${EP}?racquetA-${encodeURIComponent(code)}`, {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA },
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return JSON.parse(await r.text());
    } catch (e) { if (t === tries - 1) return { _err: e.message }; await sleep(600); }
  }
}

const rows = parseCsv(fs.readFileSync(SRC, "utf8"));
const cols = ["code", "brand", "model", "headsize_in2", "length_in", "weight_g", "balance_cm", "swingweight", "flex_rdc", "power_acor", "twistweight", "vibration_hz", "sweet"];

// resume: kalau OUT sudah ada, simpan baris yang sudah terisi (headsize non-kosong), skip kodenya
const out = [cols.join(",")];
const done = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, "utf8").trim().split("\n").slice(1)) {
    const code = line.split(",")[0];
    const head = line.split(",")[3];
    if (code && head) { out.push(line); done.add(code); }
  }
  console.log(`resume: ${done.size} sudah ada, lanjut sisanya`);
}
let ok = done.size, empty = 0, err = 0;

for (let i = 0; i < rows.length; i++) {
  const { code, brand, model } = rows[i];
  if (done.has(code)) continue;
  const d = await one(code);
  if (d?._err) { err++; out.push([code, brand, model, "", "", "", "", "", "", "", "", "", ""].map(esc).join(",")); }
  else {
    const has = d.headsize !== "" && d.headsize != null;
    if (has) ok++; else empty++;
    out.push([code, brand, model, d.headsize, d.length, d.weight, d.balance, d.swingweight, d.flex, d.acor, d.twistweight, d.vibration, d.sweet].map(esc).join(","));
  }
  if ((i + 1) % 100 === 0) { console.log(`${i + 1}/${rows.length} — ok:${ok} empty:${empty} err:${err}`); fs.writeFileSync(OUT, out.join("\n") + "\n"); }
  await sleep(DELAY);
}
fs.writeFileSync(OUT, out.join("\n") + "\n");
console.log(`DONE ${rows.length} — ok:${ok} empty:${empty} err:${err} → ${OUT}`);
