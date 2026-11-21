"""Export the data the online luminaire estimator needs from Luminaire_Pricing_Tool*.xlsx.

Usage:  python3 tools/export_luminaires.py path/to/Luminaire_Pricing_Tool.xlsx
Writes: public/luminaires/data.json

Exported per offer line: type, product description, brand, origin, model code, W, lm, CCT,
IP, emergency, dimming, unit, currency, quoted price, FX at quote date and quote date.
NOT exported: supplier, project, quote reference, notes.
"""
import json, sys, warnings, datetime, pathlib, re
import openpyxl
warnings.filterwarnings('ignore')

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
db, lists, pr = wb['Database'], wb['Lists'], wb['Pricing']

def num(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def s(x): return '' if x is None else str(x).strip()

projects = {s(db[f'W{r}'].value).lower() for r in range(5, db.max_row + 1) if s(db[f'W{r}'].value)}
rows, flagged = [], 0
for r in range(5, db.max_row + 1):
    g = lambda c: db[f'{c}{r}'].value
    if not g('B') or num(g('Q')) is None: continue
    desc = s(g('C'))
    # never publish a description that mentions a project name
    if any(len(p) > 5 and p in desc.lower() for p in projects): desc, flagged = '', flagged + 1
    d = g('Y')
    rows.append([
        s(g('B')), desc, s(g('D')), s(g('F')), s(g('G')), num(g('H')) or 0, num(g('I')) or 0, num(g('J')) or 0,
        '|' + s(g('K')).replace(' ', '').replace('/', '|') + '|', num(g('L')) or 0, s(g('M')), s(g('N')), s(g('O')),
        s(g('P')), num(g('Q')), num(g('R')) or 0, s(g('S')), d.date().isoformat() if isinstance(d, datetime.datetime) else '',
    ])

col = lambda c: [lists[f'{c}{r}'].value for r in range(2, 81) if lists[f'{c}{r}'].value is not None]
data = {
    'meta': {'usd': num(pr['I5'].value), 'tol': num(pr['I6'].value) or 0.2, 'method': s(pr['I7'].value) or 'Median',
             'adjFx': s(pr['I9'].value) or 'Yes', 'techBasis': s(pr['I10'].value) or 'Closest to suggested price', 'offers': len(rows)},
    'lists': {'types': col('A'), 'cct': col('B'), 'ip': col('C'), 'methods': col('F'), 'techBasis': col('I'), 'dimming': col('J')},
    'cols': ['type', 'desc', 'brand', 'origin', 'code', 'w', 'lm', 'cct', 'cctKey', 'ip', 'em', 'dim', 'unit', 'cur', 'price', 'fx', 'use', 'date'],
    'rows': rows,
}
out = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'luminaires' / 'data.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print(f'wrote {out} — {len(rows)} offers ({flagged} descriptions removed for mentioning a project), {out.stat().st_size // 1024} KB')
