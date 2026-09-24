/*
 * Script export data TWU String Performance Database -> CSV.
 * Cara pakai (Chrome, laptop/PC):
 * 1. Buka https://twu.tennis-warehouse.com/learning_center/reporter2.php
 * 2. Set filter: String = All Strings, Reference Tension = All, Swing Speed = All, Material = All.
 *    Centang semua kolom "Show". Sort Order 1 = String, sisanya None. Klik "Get Report".
 * 3. Buka Console (Ctrl+Shift+J / Cmd+Option+J). Saat diminta, ketik: allow pasting
 * 4. Paste seluruh script ini, tekan Enter. File twu_strings.csv terunduh otomatis.
 * 5. Jalankan: python3 reference/build_data.py path/ke/twu_strings.csv
 * Script hanya membaca tabel di layar dan mengunduh CSV; tidak mengirim data ke mana pun.
 */
(() => {
  const grid = t => [...t.rows].map(r => [...r.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim()));
  const tabs = [...document.querySelectorAll('table')].map(grid).filter(g => g.length).sort((a, b) => b.length * b[0].length - a.length * a[0].length);
  let data = tabs[0];
  const names = tabs.find(g => g !== data && g.length === data.length && /^string/i.test(g[0][0]));
  if (!/^string/i.test(data[0][0]) && names) data = data.map((r, i) => [names[i][0], ...r]);
  const csv = data.map(r => r.map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })), download: 'twu_strings.csv' });
  a.click(); console.log('Selesai:', data.length - 1, 'baris,', data[0].length, 'kolom');
})();
