# Pipeline pembersihan data TWU -> data/twu_strings_clean.csv, data/strings.json, data/cleaning-log.md
# Pakai: python3 reference/build_data.py [path/ke/export.csv]   (butuh pandas, numpy)
import pandas as pd, numpy as np, re, json
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'data', 'twu_strings_raw.csv')
OUT = os.path.join(HERE, '..', 'data') + os.sep
df = pd.read_csv(RAW)
ren = {'String':'string','Ref. Ten. (lbs)':'tension_lbs','Swing Speed':'swing','Material':'material',
 'Gauge Nominal (mm)':'gauge_mm','Gauge Acutal (mm)':'gauge_actual_raw','Stretch at 40 lbs (%)':'stretch_40_pct',
 'Stretch at 51 lbs (%)':'stretch_51_pct','Stretch at 62 lbs (%)':'stretch_62_pct',
 'Actual Pre-impact Tension (lbs)':'pre_impact_tension_lbs','Dwell Time (ms)':'dwell_time_ms','Deflection (mm)':'deflection_mm',
 'Tension Change (lbs)':'tension_change_lbs','Peak Tension (lbs)':'peak_tension_lbs','Peak Perp. Force (lbs)':'peak_perp_force_lbs',
 'Ave Perp. Force (lbs)':'avg_perp_force_lbs','Stiffness (lb/in)':'stiffness_lb_in','Static Loss lbs.':'static_loss_lbs',
 'Stabilization Loss (lbs)':'stabilization_loss_lbs','Impact Loss (lbs).':'impact_loss_lbs','Total Loss (lbs)':'total_loss_lbs',
 'Tension Loss (%)':'tension_loss_pct','Energy Return (%)':'energy_return_pct','String/String COF':'string_string_cof',
 'String/Ball COF':'string_ball_cof','Spin Potential':'spin_potential'}
df = df.rename(columns=ren)
df['string'] = df['string'].str.strip()
df['material'] = df['material'].fillna('Tidak diketahui')
log = []
def drop(mask, col, why):
    for _, r in df[mask].iterrows():
        log.append(f"| {r['string']} | {r['tension_lbs']} lbs / {r['swing']} | `{col}` | {r[col]} | {why} |")
    df.loc[mask, col] = np.nan
med = df.groupby('string')['stiffness_lb_in'].transform('median')
drop((df['stiffness_lb_in'] > med*2) | (df['stiffness_lb_in'] < med*0.5), 'stiffness_lb_in', 'Menyimpang >2x dari median senar yang sama')
drop(df['energy_return_pct'] < 50, 'energy_return_pct', 'Tidak masuk akal (<50%)')
drop((df['material']=='Polyester') & (df['tension_loss_pct'] < 12), 'tension_loss_pct', 'Tidak masuk akal untuk polyester (<12%); stabilization loss juga negatif')
drop(df['stabilization_loss_lbs'] < 0, 'stabilization_loss_lbs', 'Nilai negatif (error pengukuran). Kolom ini tidak dipakai engine')

def gauge_fix(row):
    g = row['gauge_mm']
    if 1.0 <= g <= 1.5: return g
    m = re.search(r'1\.\d{1,3}', row['string'])
    if m: return float(m.group())
    m = re.search(r'\b(15L|15|16L|16|17L|17|18|19)\b', row['string'])
    awg = {'15':1.40,'15L':1.35,'16':1.30,'16L':1.25,'17':1.20,'17L':1.18,'18':1.15,'19':1.10}
    return awg.get(m.group(1)) if m else np.nan
fixed = df.apply(gauge_fix, axis=1)
for n in df[fixed != df['gauge_mm']]['string'].unique():
    bad = (df['string']==n) & (fixed != df['gauge_mm'])
    old = df[bad]['gauge_mm'].iloc[0]; new = fixed[bad].iloc[0]
    log.append(f"| {n} | semua kondisi | `gauge_mm` | {old} → {new} | Tidak valid, diambil dari nama senar |")
df['gauge_mm'] = fixed

GAUGE_TOK = [r'\(?\d\.\d{1,3}\)?', r'1[0-4]\d', r'(1[5-9]|20)L?g?', r'\d{2}L?/\d(\.\d+)?L?', r'\d{3}/\d{2}L?', r'\d{2}L?-\d{2}L?']
GRX = re.compile(r'^(' + '|'.join(GAUGE_TOK) + r')$', re.I)
def family(name):
    s = re.sub(r'(\S)\(', r'\1 (', name)
    k = ' '.join(t for t in s.split() if not GRX.match(t)).lower()
    k = re.sub(r'\s*/\s*', '/', k).replace('-', ' ').replace('.', '')
    return re.sub(r'\s+', ' ', k).strip()
df['family'] = df['string'].map(family)
SWC = {'Slow':'S','Medium':'M','Fast':'F'}
df['condition'] = df['tension_lbs'].astype(str) + df['swing'].map(SWC)
cnt = df.groupby('string')['condition'].nunique()
only = df.groupby('string')['condition'].first()
def conf(n):
    if cnt[n] >= 6: return 'lengkap'
    if cnt[n] == 1 and only[n] == '51F': return 'referensi_51F'
    return 'terbatas'
df['data_coverage'] = df['string'].map(conf)
front = ['string','family','material','gauge_mm','data_coverage','tension_lbs','swing','condition']
df = df[front + [c for c in df.columns if c not in front]].sort_values(['string','tension_lbs','swing'])
df.to_csv(OUT + 'twu_strings_clean.csv', index=False)

# compact engine input
names = sorted(df['string'].unique()); idx = {n:i for i,n in enumerate(names)}
meta = df.groupby('string').agg(m=('material','first'), g=('gauge_mm','first'), f=('family','first'), c=('data_coverage','first'))
KEYS = {'st':'stiffness_lb_in','tl':'tension_loss_pct','er':'energy_return_pct','dw':'dwell_time_ms','sp':'spin_potential'}
agg = df.groupby(['condition','string'])[list(KEYS.values())].mean()
conds = [f'{t}{s}' for t in (40,51,62) for s in 'SMF']
out = {'source': 'Tennis Warehouse University String Performance Database (export 2026-09)',
       'strings': [{'n': n, 'f': meta.loc[n,'f'], 'm': meta.loc[n,'m'], 'c': meta.loc[n,'c'],
                    'g': None if pd.isna(meta.loc[n,'g']) else round(float(meta.loc[n,'g']),2)} for n in names],
       'slices': {}}
for s in conds:
    block = {k: [None]*len(names) for k in KEYS}
    for n, r in agg.loc[s].iterrows():
        for k, col in KEYS.items():
            v = r[col]; block[k][idx[n]] = None if pd.isna(v) else round(float(v), 2)
    out['slices'][s] = block
json.dump(out, open(OUT + 'strings.json','w'), separators=(',',':'), ensure_ascii=False)

# stats for PRD
stats = {
 'rows': len(df), 'strings': len(names), 'families': df['family'].nunique(),
 'coverage': df.drop_duplicates('string')['data_coverage'].value_counts().to_dict(),
 'materials': df.drop_duplicates('string')['material'].value_counts().to_dict(),
 'spin_missing_strings': int(df.groupby('string')['spin_potential'].apply(lambda x: x.isna().all()).sum()),
}
json.dump(stats, open(OUT + 'dataset-stats.json','w'), indent=1, ensure_ascii=False)
open(OUT + 'cleaning-log.md','w').write('# Log pembersihan data TWU\n\n| Senar | Kondisi | Kolom | Nilai | Tindakan |\n|---|---|---|---|---|\n' + '\n'.join(log) + '\n')
print(json.dumps(stats, indent=1, ensure_ascii=False)); print(len(log), 'log rows')
