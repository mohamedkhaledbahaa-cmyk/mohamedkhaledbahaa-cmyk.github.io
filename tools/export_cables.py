"""Export the data the online cable estimator needs from Cable_Pricing_DB*.xlsm.

Usage:  python3 tools/export_cables.py path/to/Cable_Pricing_DB_LME.xlsm
Writes: public/cables/data.json

Open the workbook in Excel (with today's LME / USD filled in) and save it first,
so the cached "landed EGP/m today" prices are current.
Exported: cable key, supplier brand, quoted price, metal weights and the anonymous
escalation terms of each offer (metal base prices, factors, dates) so the site can
re-index prices to today's LME / USD. No offer IDs, references, supplier names
(brand only), project names or quantities.
"""
import json, sys, warnings, datetime, pathlib, re
import openpyxl
warnings.filterwarnings('ignore')

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
db, lists, lib, boq = wb['Cable_DB'], wb['Lists'], wb['Tech_Library'], wb['BOQ_Pricing']

def num(x):
    try: return float(x)
    except (TypeError, ValueError): return None

st = wb['Settings']
def ordinal(d): return d.toordinal() if isinstance(d, (datetime.datetime, datetime.date)) else None

# offers -> anonymous index with only the escalation parameters (no ID, ref, supplier name or project)
offers, oidx = [], {}
off = wb['Offers']
for r in range(5, off.max_row + 1):
    g = lambda c: off[f'{c}{r}'].value
    if not g('A'): continue
    oidx[g('A')] = len(offers)
    egp = g('F') == 'EGP'
    offers.append({
        'egp': egp, 'cuBase': num(g('I')), 'baseER': num(g('L')) or 0, 'cuX': num(g('M')) or 1, 'alBasis': g('J') or 'NONE',
        'alBase': num(g('K')) or 0, 'alX': num(g('N')) or 1, 'freight': num(g('O')) or 0, 'other': num(g('P')) or 0,
        'active': int(num(g('Y')) or 0), 'date': ordinal(g('D')), 'validUntil': ordinal(g('Z')),
    })

rows = []
for r in range(5, db.max_row + 1):
    g = lambda c: db[f'{c}{r}'].value
    typ, size, volt, brand, k = g('E'), g('G'), g('I'), g('AL'), num(g('K'))
    o = oidx.get(g('B'))
    if not (typ and size and brand) or k is None or k <= 0 or o is None: continue
    if re.search(r'\bref\b|\d{4,}', str(brand), re.I): brand = 'Other'   # never leak offer references
    # type, size, voltage, brand, quoted price (offer cur/m), Cu kg/km, Al kg/km, offer index, cached landed EGP/m
    rows.append([str(typ).strip(), str(size).strip(), str(volt or '').strip(), str(brand).strip(), k,
                 num(g('M')) or 0, num(g('N')) or 0, o, round(num(g('V')) or 0, 4)])

types = {}
for r in range(2, 201):
    j = lists[f'J{r}'].value
    if j: types[str(j).strip()] = [lists[f'K{r}'].value or '', lists[f'L{r}'].value or '', lists[f'M{r}'].value or '', lists[f'N{r}'].value or '-']
volts = {}
for r in range(2, 201):
    p = lists[f'P{r}'].value
    if p: volts[str(p).strip()] = [lists[f'Q{r}'].value or '', lists[f'R{r}'].value or '']

library = {}
for r in range(5, lib.max_row + 1):
    key = lib[f'D{r}'].value
    if key and key not in library:
        library[key] = [lib[f'E{r}'].value or '', *[num(lib[f'{c}{r}'].value) or 0 for c in 'FGHIJK'], lib[f'L{r}'].value or '']

d = boq['G5'].value
data = {
    'meta': {
        'priceDate': d.date().isoformat() if isinstance(d, datetime.datetime) else str(d),
        'cu': num(boq['G6'].value), 'al': num(boq['G7'].value), 'usd': num(boq['G8'].value),
        'wastage': num(boq['C5'].value) or 0, 'margin': num(boq['C6'].value) or 0, 'vat': num(boq['C7'].value) or 0,
        'prices': len(rows), 'brands': len({r[3] for r in rows}),
        # MV unarmoured / armoured price ratios (used to derive a missing MV cable from its armoured/unarmoured twin)
        'mvRatioCu': num(st['D18'].value) if 'ratio' in str(st['C18'].value or '').lower() else None,
        'mvRatioAl': num(st['D19'].value) if 'ratio' in str(st['C19'].value or '').lower() else None,
        'maxAge': num(st['D8'].value) or 365, 'nonMetalEsc': num(st['D17'].value) or 0,
        'egyptalum': num(st['D5'].value), 'alPremium': num(st['D11'].value) / (num(st['D12'].value) * num(st['D13'].value)) - 1,
    },
    'offers': offers,
    'cols': ['type', 'size', 'voltage', 'brand', 'quoted', 'cuKgKm', 'alKgKm', 'offer', 'cachedEgpPerM'],
    'rows': rows, 'types': types, 'volts': volts, 'library': library,
}
out = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'cables' / 'data.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'), default=str))
print(f'wrote {out} — {len(rows)} prices, {data["meta"]["brands"]} brands, {len(library)} library cables, {out.stat().st_size // 1024} KB')
