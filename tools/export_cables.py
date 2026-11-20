"""Export the data the online cable estimator needs from Cable_Pricing_DB*.xlsm.

Usage:  python3 tools/export_cables.py path/to/Cable_Pricing_DB_LME.xlsm
Writes: public/cables/data.json

Open the workbook in Excel (with today's LME / USD filled in) and save it first,
so the cached "landed EGP/m today" prices are current.
Only aggregated inputs are exported: cable key, supplier brand and today's price.
No offer IDs, offer references, project names or quantities.
"""
import json, sys, warnings, datetime, pathlib, re
import openpyxl
warnings.filterwarnings('ignore')

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
db, lists, lib, boq = wb['Cable_DB'], wb['Lists'], wb['Tech_Library'], wb['BOQ_Pricing']

def num(x):
    try: return float(x)
    except (TypeError, ValueError): return None

rows = []
for r in range(5, db.max_row + 1):
    g = lambda c: db[f'{c}{r}'].value
    typ, size, volt, brand, price, ak = g('E'), g('G'), g('I'), g('AL'), num(g('V')), num(g('AK'))
    if not (typ and size and brand) or price is None or price <= 0 or ak is None or ak < 0: continue
    if re.search(r'\bref\b|\d{4,}', str(brand), re.I): brand = 'Other'   # never leak offer references
    rows.append([str(typ).strip(), str(size).strip(), str(volt or '').strip(), str(brand).strip(), round(price, 4), int(ak == 1)])

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
    },
    'cols': ['type', 'size', 'voltage', 'brand', 'egpPerM', 'valid'],
    'rows': rows, 'types': types, 'volts': volts, 'library': library,
}
out = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'cables' / 'data.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'), default=str))
print(f'wrote {out} — {len(rows)} prices, {data["meta"]["brands"]} brands, {len(library)} library cables, {out.stat().st_size // 1024} KB')
