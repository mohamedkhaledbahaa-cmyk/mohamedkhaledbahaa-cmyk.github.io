"""Export the data the online panel estimator needs from LV_Panel_Pricing_Database*.xlsx.

Usage:  python3 tools/export_pricing.py path/to/LV_Panel_Pricing_Database.xlsx
Writes: public/pricing/data.json

Open the workbook in Excel and save it before exporting, so the cached formula
values (prices "today", ln model, form factors…) are up to date.
Project names, supplier names and offer references are NOT exported: suppliers
become anonymous numbers (needed to pick the best match per supplier).
"""
import json, sys, warnings, datetime, pathlib
import openpyxl
warnings.filterwarnings('ignore')

src = sys.argv[1]
wb = openpyxl.load_workbook(src, data_only=True)
db, model, lists, settings = wb['Database'], wb['Model'], wb['Lists'], wb['الإعدادات']
dims, pl, cat = wb['الأبعاد'], wb['Schneider PL 2026'], wb['Catalog']

def v(ws, ref): return ws[ref].value
def num(x, d=0.0):
    try: return float(x)
    except (TypeError, ValueError): return d
def col(ws, c, r1, r2): return [ws[f'{c}{r}'].value for r in range(r1, r2 + 1)]
def table(ws, rng):
    return [[c.value for c in row] for row in ws[rng] if any(c.value is not None for c in row)]

# ---- Database (only rows usable by the estimator) ----
suppliers, rows = {}, []
for r in range(2, db.max_row + 1):
    g = lambda c: db[f'{c}{r}'].value
    if g('G') in (None, ''): continue
    if num(g('AD')) != 1 or num(g('N')) <= 0 or g('AC') in (None, '') or g('AF') in (None, '') or g('AR') in (None, ''): continue
    sup = suppliers.setdefault(g('C') or '?', len(suppliers))
    rows.append([
        g('H') or '', g('I') or '', sup, g('F') or '', g('K') if g('K') is not None else '', g('M') or '',
        num(g('N')), num(g('Q')), num(g('R')), num(g('S')) + num(g('T')), num(g('U')), num(g('V')), num(g('W')),
        num(g('AB')), num(g('AF')), num(g('AR')), num(g('AO'), 1), r,
    ])

coef = {model[f'A{r}'].value: num(model[f'B{r}'].value) for r in range(4, 16)}
fam = {model[f'A{r}'].value: num(model[f'B{r}'].value) for r in range(18, 26) if model[f'A{r}'].value}
brand = {model[f'A{r}'].value: num(model[f'B{r}'].value) for r in range(28, 34) if model[f'A{r}'].value}

hdr = col(lists, 'P', 1, 1) and [lists.cell(1, c).value for c in range(16, 27)]  # P..Z
sizes = {h: [num(lists.cell(r, 16 + i).value) for r in range(2, 38) if lists.cell(r, 16 + i).value is not None] for i, h in enumerate(hdr)}
caps = {h: num(lists.cell(40, 16 + i).value) for i, h in enumerate(hdr)}

d7 = v(settings, 'C7')
data = {
    'meta': {
        'exported': datetime.date.today().isoformat(),
        'priceDate': d7.date().isoformat() if isinstance(d7, datetime.datetime) else str(d7),
        'usd': num(v(settings, 'C5')), 'eur': num(v(settings, 'C6')),
        'panels': len(rows), 'offers': sum(1 for x in col(wb['Sources'], 'C', 5, 80) if x not in (None, '')),
        'ageW': num(v(settings, 'C10')), 'kvar': num(v(settings, 'C11')), 'detuned': num(v(settings, 'C12'), 1),
    },
    'model': {'coef': coef, 'family': fam, 'brand': brand, 'alpha': num(v(model, 'B35')), 'w': num(v(model, 'B36'))},
    'forms': {r[0]: [r[1], num(r[2], 1)] for r in table(settings, 'F15:H21') if r[0]},
    'categories': {r[0]: [r[1], r[2], r[3]] for r in table(lists, 'A2:D15')},
    'sizes': sizes, 'caps': caps,
    'busbars': [num(x) for x in col(lists, 'AA', 2, 18) if x is not None],
    'motorA': [[num(a), num(b)] for a, b in table(lists, 'AC2:AD27')],
    'pl': {r[0]: [num(r[4]), r[5] or ''] for r in table(pl, 'A5:G279') if r[0]},
    'catalog': {r[0]: [r[5] or '', r[6] or '', r[7] or ''] for r in table(cat, 'A2:K826') if r[0]},
    'items': {r[0]: r[5] or '' for r in table(cat, 'A830:F871') if r[0]},
    # PFC step components: kVAR step -> [capacitor ref, price, contactor ref, price]; controller price ≤6 / >6 steps
    'pfcPL': {str(int(num(r[0]))): [r[1] or '', num(r[2]), r[3] or '', num(r[4])] for r in table(pl, 'I5:M11') if num(r[0]) > 0},
    'pfcCtrl': [num(v(pl, 'K14')), num(v(pl, 'K15'))],
    'dims': {
        'p': {f'P{r}': v(dims, f'P{r}') for r in range(7, 33)},
        'acb': [[num(x) for x in (r[0], r[2], r[3], r[4], r[5])] for r in table(dims, 'M36:S39')],
        'widths': [num(x) for x in col(dims, 'M', 43, 49)],
        'mccbH': table(dims, 'M53:N57'), 'fuseH': table(dims, 'M61:N64'), 'mpcbH': table(dims, 'M68:N70'),
        'pilW': table(dims, 'M74:N76'), 'cableZone': {a: num(b) for a, b in table(dims, 'M80:N86')},
        'floorD': table(dims, 'M90:N92'), 'wallD': table(dims, 'M96:N98'),
        'wallH': [num(x) for x in col(dims, 'M', 102, 111) if x is not None],
    },
    'cols': ['cat', 'fam', 'sup', 'brand', 'ip', 'main', 'mainA', 'oACB', 'oMCCB', 'oMCB', 'oFuse', 'oMPCB', 'vfd', 'age', 'ln', 'price', 'formF', 'row'],
    'db': rows,
}
out = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'pricing' / 'data.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'), default=str))
print(f'wrote {out} — {len(rows)} panels, {len(suppliers)} suppliers, {out.stat().st_size // 1024} KB')
