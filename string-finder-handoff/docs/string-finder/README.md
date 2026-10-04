# Tirtonic String Finder — bundel implementasi (PRD v2.0, aplikasi terpisah)

Salin folder ini ke `docs/string-finder/` di repo baru `tirtonic-string-finder`, lalu jalankan prompt di `PROMPTS-claude-code.md` mulai dari Prompt 0.

```
PRD-string-finder.md        Spesifikasi lengkap v2.0 (mulai dari sini)
PROMPTS-claude-code.md      Prompt Claude Code per tahap (0, 1a, 1b, 1c, 1d)
design/
  prototype.html            Prototipe klik (password demo: tirtonic). Acuan visual & alur
  screen-*.png              Screenshot prototipe (d = desktop 1366 px, m = mobile 390 px)
data/
  twu_strings_raw.csv       Export asli TWU
  twu_strings_clean.csv     Data bersih untuk impor ke database
  strings.json              Format ringkas untuk engine acuan & tes
  cleaning-log.md           Semua nilai yang diperbaiki/dibuang
  dataset-stats.json        Statistik dataset
  export-twu.js             Script browser untuk export ulang dari TWU
reference/
  engine.js                 Engine acuan (sumber kebenaran algoritma)
  slip.js                   Resep stringing: data resep + template cetak thermal 58/80 mm
  rules.json                Aturan awal (bobot, filter, catatan resep)
  questions.json            Teks 7 pertanyaan & pilihan
  test-cases.json           Golden output engine
  slip-test-cases.json      Golden data resep
  slip-sample-*.html/.png   Contoh resep
  run-tests.js              node reference/run-tests.js
  make-tests.js             Membuat ulang golden engine bila aturan seed sengaja diubah
  make-slip-sample.js       Membuat ulang contoh & golden resep
  build_data.py             Pipeline pembersihan data (python3 + pandas)
```
