"""Fetch today's LME copper / aluminium cash prices and the USD→EGP rate into public/market.json.

Runs daily in GitHub Actions before the site is built (.github/workflows/deploy.yml).
Sources: Westmetall (LME official cash settlement, USD/t) and open.er-api.com (USD/EGP).
If a source fails or returns an implausible number, the previous value in market.json is kept,
so a failed fetch never breaks the site.
"""
import json, re, sys, datetime, pathlib, urllib.request

OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'market.json'
UA = {'User-Agent': 'Mozilla/5.0 (market-data fetch for a static site)'}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode('utf-8', 'replace')

def to_num(s):
    s = s.strip().replace('\xa0', '').replace(' ', '')
    if re.fullmatch(r'\d{1,3}(,\d{3})+(\.\d+)?|\d+(\.\d+)?', s): return float(s.replace(',', ''))
    if re.fullmatch(r'\d{1,3}(\.\d{3})+(,\d+)?|\d+,\d+', s): return float(s.replace('.', '').replace(',', '.'))
    return None

def westmetall(field, lo, hi):
    html = get(f'https://www.westmetall.com/en/markdaten.php?action=table&field={field}')
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.S | re.I):
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.S | re.I)]
        if len(cells) < 2 or not re.search(r'\d{4}', cells[0]): continue
        v = to_num(cells[1])
        if v and lo <= v <= hi: return v, cells[0]
    raise ValueError(f'no plausible value in {field} table')

def usd_egp():
    v = json.loads(get('https://open.er-api.com/v6/latest/USD'))['rates']['EGP']
    if not 20 <= v <= 300: raise ValueError(f'implausible USD/EGP {v}')
    return float(v)

prev = json.loads(OUT.read_text()) if OUT.exists() else {}
m = dict(prev)
for key, fn in [('cu', lambda: westmetall('LME_Cu_cash', 3000, 30000)), ('al', lambda: westmetall('LME_Al_cash', 1000, 8000)), ('usd', usd_egp)]:
    try:
        v = fn()
        m[key], m[f'{key}Date'] = (v[0], v[1]) if isinstance(v, tuple) else (v, datetime.date.today().isoformat())
        print(f'{key}: {m[key]} ({m[f"{key}Date"]})')
    except Exception as e:  # keep the previous value
        print(f'warning: {key} not updated: {e}', file=sys.stderr)
m['updated'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
m['sources'] = 'LME cash settlement via Westmetall; USD/EGP via open.er-api.com'
OUT.write_text(json.dumps(m, ensure_ascii=False, indent=1))
