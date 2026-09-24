# Tirtonic String Finder — bundel implementasi

Letakkan folder ini di proyek website Tirtonic (misalnya `docs/string-finder/`), lalu minta Claude Code membaca `PRD-string-finder.md` terlebih dulu.

```
PRD-string-finder.md        Spesifikasi lengkap (mulai dari sini)
PROMPTS-claude-code.md      Prompt Claude Code per tahap (0, 1a, 1b, 1c, 1d)
data/
  twu_strings_raw.csv       Export asli TWU (tidak diubah)
  twu_strings_clean.csv     Data bersih untuk impor ke database
  strings.json              Format ringkas untuk engine acuan & tes
  cleaning-log.md           Semua nilai yang diperbaiki/dibuang
  dataset-stats.json        Statistik dataset
  export-twu.js             Script browser untuk export ulang dari TWU
reference/
  engine.js                 Engine acuan (sumber kebenaran algoritma)
  rules.json                Aturan awal (bobot & filter)
  questions.json            Teks 7 pertanyaan & pilihan
  test-cases.json           Golden output yang wajib dilewati
  run-tests.js              node reference/run-tests.js
  make-tests.js             Membuat ulang golden output bila aturan seed sengaja diubah
  build_data.py             Pipeline pembersihan data (python3 + pandas)
  slip.js                   Resep stringing: data resep + template cetak thermal 58/80 mm
  slip-test-cases.json      Golden data resep
  slip-sample-*.html/.png   Contoh resep (pilih satu & tiga pilihan)
  make-slip-sample.js       Membuat ulang contoh & golden resep
```

Contoh prompt untuk Claude Code:

> Baca docs/string-finder/PRD-string-finder.md dan semua file di folder itu. Kerjakan tahap 1a dulu: impor data ke database, port reference/engine.js dan reference/slip.js ke TypeScript, dan buat unit test yang memakai reference/test-cases.json dan reference/slip-test-cases.json. Jangan lanjut ke UI sebelum semua tes lulus.
