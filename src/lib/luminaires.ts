// Luminaire budget estimator — port of "Luminaire_Pricing_Tool" (Pricing + Helper + Technical Offer sheets).

export type LumRow = [string, string, string, string, string, number, number, number, string, number, string, string, string, string, number, number, string, string];
// type, desc, brand, origin, code, W, lm, CCT quoted, CCT key "|3000|4000|", IP, emergency, dimmable, unit, currency, quoted price, FX at quote, use, date
export interface LumData {
  meta: { usd: number; tol: number; method: string; adjFx: string; techBasis: string; offers: number };
  lists: { types: string[]; cct: (string | number)[]; ip: number[]; methods: string[]; techBasis: string[]; dimming: string[] };
  rows: LumRow[];
}
export interface LumLine { ref: string; type: string; w: number; lm: number; cct: string; ip: number; em: string; dim: string; brand: string; qty: number }
export interface LumSettings { usd: number; tol: number; method: string; adjFx: boolean; techBasis: string; minDate?: string }

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export class LumEstimator {
  constructor(public d: LumData) {}
  brands() {
    const c = new Map<string, number>();
    this.d.rows.forEach((r) => c.set(r[2], (c.get(r[2]) ?? 0) + 1));
    return [...c].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  }
  /** Database!T — unit price in EGP today */
  egp(r: LumRow, s: LumSettings) {
    const [, , , , , , , , , , , , , cur, q, fx] = r;
    if (!q) return null;
    return cur === 'USD' ? q * s.usd : s.adjFx && fx > 0 ? (q * s.usd) / fx : q;
  }

  /** Helper columns: common filters (type, emergency, brand, date, use, dimming) */
  private base(r: LumRow, l: LumLine, s: LumSettings) {
    const [type, , brand, , , , , , , , em, dim, , , , , use, date] = r;
    if (type !== l.type) return false;
    if (em !== (l.em === 'Yes' ? 'Yes' : 'No')) return false;
    if (l.brand && l.brand !== 'Any' && brand !== l.brand) return false;
    if (s.minDate && date < s.minDate) return false;
    if (use === 'No') return false;
    const d = l.dim;
    if (d && d !== 'Any') {
      if (d === 'Yes' && !dim.startsWith('Yes')) return false;
      if (d === 'Yes or on request' && !(dim.startsWith('Yes') || dim.startsWith('Option'))) return false;
      if (d === 'DALI' && !/dali/i.test(dim)) return false;
    }
    return true;
  }

  line(l: LumLine, s: LumSettings) {
    const rows = this.d.rows;
    const tol = s.tol;
    const matches: { i: number; p: number }[] = [];
    const perW: number[] = [];
    rows.forEach((r, i) => {
      if (!l.type || !this.base(r, l, s)) return;
      const p = this.egp(r, s);
      if (p == null) return;
      if (r[5] > 0) perW.push(p / r[5]);
      const [, , , , , W, LM, , key, IP] = r;
      if (l.w > 0 && Math.abs(W - l.w) > l.w * tol) return;
      if (l.lm > 0 && !(LM >= l.lm * (1 - tol))) return;
      if (l.cct && l.cct !== 'Any' && !key.includes(`|${l.cct}|`)) return;
      if (l.ip > 0 && !(IP > 0 && Math.floor(IP / 10) >= Math.floor(l.ip / 10) && IP % 10 >= l.ip % 10)) return;
      matches.push({ i, p });
    });
    const n = matches.length;
    const ps = matches.map((m) => m.p);
    const min = n ? Math.min(...ps) : null, max = n ? Math.max(...ps) : null, avg = n ? ps.reduce((a, b) => a + b, 0) / n : null;
    let unit: number | null = null;
    let basis: 'matched' | 'estimate' | 'none' = 'none';
    if (n) {
      basis = 'matched';
      unit = s.method === 'Min' ? min : s.method === 'Average' ? avg : s.method === 'Max' ? max : median(ps);
    } else if (l.w > 0 && perW.length) {
      basis = 'estimate';
      unit = median(perW) * l.w;
    }
    // proposed fixture for the technical offer (first row in database order, like MATCH)
    let pick: number | null = null;
    if (n) {
      const target = s.techBasis === 'Lowest price' ? min! : s.techBasis === 'Highest price' ? max! : unit!;
      let best = Infinity;
      for (const m of matches) {
        const dist = s.techBasis === 'Lowest price' || s.techBasis === 'Highest price' ? (m.p === target ? 0 : Infinity) : Math.abs(m.p - target);
        if (dist < best) { best = dist; pick = m.i; }
      }
    }
    return { n, unit, total: unit != null && l.qty ? unit * l.qty : null, usd: unit != null ? unit / s.usd : null, min, avg, max, basis, perWCount: perW.length, pick: pick == null ? null : rows[pick] };
  }

  requirement(l: LumLine) {
    return `${l.type}  ·  ${l.w > 0 ? `${l.w} W` : 'any W'}${l.lm > 0 ? `  ·  ≥${l.lm.toLocaleString('en-US')} lm` : ''}  ·  ${!l.cct || l.cct === 'Any' ? 'any CCT' : `${l.cct} K`}  ·  ${l.ip ? `IP${l.ip}+` : 'any IP'}${l.em === 'Yes' ? '  ·  Emergency' : ''}${l.dim === 'DALI' ? '  ·  DALI' : !l.dim || l.dim === 'Any' ? '' : '  ·  Dimmable'}`;
  }
}

export const LUM_SCOPE = "Scope: supply of lighting fixtures as per BOQ. Proposed models are taken from supplier quotations in the price database and meet the requested type, wattage (± tolerance), colour temperature, IP rating, emergency function and dimming requirement. Lumen values are as stated by the supplier or the nominal package of the model code; '—' = not stated. All proposed items are subject to consultant / client approval; equivalent alternatives can be offered on request. Prices are not shown in this technical offer.";
