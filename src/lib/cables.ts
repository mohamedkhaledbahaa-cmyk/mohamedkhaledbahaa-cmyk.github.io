// Cable budget estimator — port of "Cable_Pricing_DB_LME" (BOQ_Pricing basis "Supplier average" + Technical_Offer).

export interface Offer { egp: boolean; cuBase: number | null; baseER: number; cuX: number; alBasis: string; alBase: number; alX: number; freight: number; other: number; active: number; date: number; validUntil: number | null }
export interface CableData {
  meta: { priceDate: string; cu: number; al: number; usd: number; wastage: number; margin: number; vat: number; prices: number; brands: number; maxAge: number; mvRatioCu?: number | null; mvRatioAl?: number | null; nonMetalEsc: number; egyptalum: number | null; alPremium: number };
  offers: Offer[];
  rows: [string, string, string, string, number, number, number, number, number][]; // type, size, voltage, brand, quoted, Cu kg/km, Al kg/km, offer, cached EGP/m
  types: Record<string, [string, string, string, string]>; // libType, construction, extra standards, max temp
  volts: Record<string, [string, string]>; // library voltage, base standard
  library: Record<string, [string, number, number, number, number, number, number, string | number]>; // code, Rdc, Ig, Id, Ia, OD, W, page
}
export interface Market { cu: number; al: number; usd: number; date?: string }
/** day number compatible with Python's date.toordinal() */
export const ordinal = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) + 719163;

export interface CableLine { type: string; size: string; voltage: string; qty: number; override?: number }
export interface CableSettings { brand: string; wastage: number; margin: number; vat: number }

const sizeKey = (s: string) => s.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
export function bySize(a: string, b: string) {
  const x = sizeKey(a), y = sizeKey(b);
  // cores first, then cross-section
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  return a.localeCompare(b);
}

/** BOQ_Pricing!V — for MV cables, the armoured (STA) / unarmoured twin used to derive a missing price */
export function altType(type: string, voltage: string): string | null {
  if (!voltage || voltage === '0.6/1 kV' || !/kv/i.test(voltage)) return null;
  return /\/sta\//i.test(type) ? type.split('STA/').join('') : type.split('/PVC').join('/STA/PVC');
}

export class CableEstimator {
  tree = new Map<string, Map<string, Set<string>>>();
  brands: string[];
  /** usable rows priced to the current market: [type, size, voltage, brand, EGP/m] */
  priced: [string, string, string, string, number][] = [];
  market!: Market;
  constructor(public d: CableData, market?: Market, public today = ordinal(new Date())) {
    this.setMarket(market ?? { cu: d.meta.cu, al: d.meta.al, usd: d.meta.usd });
    const count = new Map<string, number>();
    this.priced.forEach((r) => count.set(r[3], (count.get(r[3]) ?? 0) + 1));
    this.brands = [...count].sort((a, b) => b[1] - a[1]).map((x) => x[0]).filter((b) => b !== 'Other');
  }

  /** Re-index every price to today's LME Cu / Al and USD rate (Offers S-X + Cable_DB R-V) */
  setMarket(m: Market) {
    this.market = m;
    const { cu: CU, al: AL, usd: ER } = m, meta = this.d.meta, today = this.today;
    const EA = meta.egyptalum || AL * ER * (1 + meta.alPremium);
    const off = this.d.offers.map((o) => {
      const S = o.cuBase == null ? 0 : o.egp ? CU * ER : CU;
      const T = o.cuBase == null ? 0 : o.egp ? o.cuBase * o.baseER : o.cuBase;
      let V = 0, W = 0;
      if (o.alBasis === 'LME') { V = o.egp ? AL * ER : AL; W = o.egp ? o.alBase * o.baseER : o.alBase; }
      else if (o.alBasis === 'EGYPTALUM') { V = o.egp ? EA : EA / ER; W = o.egp ? o.alBase : o.alBase / o.baseER; }
      // status: Valid (1) / Expired (0) / Old – reference (-1, excluded)
      const status = o.validUntil == null ? 0 : o.validUntil >= today ? 1 : today - o.date > meta.maxAge ? -1 : 0;
      return { o, T, W, U: (S - T) * o.cuX * o.active, X: (V - W) * o.alX * o.active, status };
    });
    this.priced = [];
    this.tree.clear();
    for (const [t, s, v, b, K, cu, al, oi] of this.d.rows) {
      const f = off[oi];
      if (!f || f.status < 0) continue;
      const o = f.o;
      const Tp = K + (cu / 1e6) * f.U + (al / 1e6) * f.X
        + (o.egp ? Math.max(0, K - (cu / 1e6) * f.T - (al / 1e6) * f.W) * meta.nonMetalEsc * Math.max(0, today - o.date) / 30.44 : 0);
      const Up = (Tp + o.freight) * (1 + o.other);
      this.priced.push([t, s, v, b, o.egp ? Up : Up * ER]);
      if (!this.tree.has(t)) this.tree.set(t, new Map());
      const mm = this.tree.get(t)!;
      if (!mm.has(s)) mm.set(s, new Set());
      mm.get(s)!.add(v);
    }
    // MV cables with no price of their own but a priced armoured/unarmoured twin can be selected too
    for (const [t, s, v] of [...this.priced]) {
      const a = altType(t, v);
      if (!a || !this.mvFactor(a) || this.tree.get(a)?.get(s)?.has(v)) continue;
      if (!this.tree.has(a)) this.tree.set(a, new Map());
      const mm = this.tree.get(a)!;
      if (!mm.has(s)) mm.set(s, new Set());
      mm.get(s)!.add(v);
    }
  }
  types() { return [...this.tree.keys()].sort(); }
  sizes(t: string) { return [...(this.tree.get(t)?.keys() ?? [])].sort(bySize); }
  voltages(t: string, s: string) { return [...(this.tree.get(t)?.get(s) ?? [])].sort(); }
  brandsFor(t: string, s: string, v: string) { return [...new Set(this.priced.filter((r) => r[0] === t && r[1] === s && r[2] === v).map((r) => r[3]))]; }

  /** Settings!D18/D19 — unarmoured ÷ armoured price ratio (Cu / Al); armoured is derived by dividing */
  mvFactor(type: string) {
    const ratio = (/^al/i.test(type) ? this.d.meta.mvRatioAl : this.d.meta.mvRatioCu) || 0;
    return ratio ? (/\/sta\//i.test(type) ? 1 / ratio : ratio) : 0;
  }

  /** BOQ_Pricing!G: average of the supplier's prices for this cable, else average of all suppliers (fallback),
   *  else (MV only) derived from the armoured / unarmoured twin × ratio */
  basis(l: CableLine, brand: string) {
    const rowsFor = (t: string) => this.priced.filter((r) => r[0] === t && r[1] === l.size && r[2] === l.voltage);
    const all = rowsFor(l.type);
    const own = brand && brand !== 'all' ? all.filter((r) => r[3] === brand) : [];
    let use = own.length ? own : all;
    let factor = 1, from: string | null = null;
    let mode: 'supplier' | 'fallback' | 'all' | 'derived' | 'none' = !all.length ? 'none' : own.length ? 'supplier' : brand && brand !== 'all' ? 'fallback' : 'all';
    if (!all.length) {
      const alt = altType(l.type, l.voltage);
      const f = alt ? this.mvFactor(l.type) : 0;
      const altAll = alt && f ? rowsFor(alt) : [];
      if (altAll.length) {
        const altOwn = brand && brand !== 'all' ? altAll.filter((r) => r[3] === brand) : [];
        use = altOwn.length ? altOwn : altAll;
        factor = f; from = alt; mode = 'derived';
      }
    }
    const avg = use.length ? (use.reduce((s, r) => s + r[4], 0) / use.length) * factor : null;
    const ownDerived = mode === 'derived' && brand && brand !== 'all' && use.every((r) => r[3] === brand);
    return { avg, n: use.length, mode, from, factor, ownDerived, min: use.length ? Math.min(...use.map((r) => r[4])) * factor : null, max: use.length ? Math.max(...use.map((r) => r[4])) * factor : null };
  }

  price(lines: CableLine[], s: CableSettings) {
    const out = lines.filter((l) => l.type && l.size).map((l) => {
      const b = this.basis(l, s.brand);
      const base = l.override && l.override > 0 ? l.override : b.avg;
      const cost = base == null ? null : base * (1 + s.wastage);
      const sell = cost == null ? null : cost * (1 + s.margin);
      return { line: l, ...b, base, cost, sell, total: sell == null ? null : sell * (l.qty || 0), costTotal: cost == null ? null : cost * (l.qty || 0) };
    });
    const cost = out.reduce((a, x) => a + (x.costTotal ?? 0), 0);
    const sell = out.reduce((a, x) => a + (x.total ?? 0), 0);
    return { lines: out, cost, sell, margin: sell - cost, incVat: sell * (1 + s.vat), usd: sell / this.market.usd };
  }

  /** Technical_Offer row */
  tech(l: CableLine) {
    const t = this.d.types[l.type], v = this.d.volts[l.voltage];
    const libKey = `${t?.[0] ?? ''}|${l.size}|${v?.[0] ?? ''}`;
    const lib = t?.[0] ? this.d.library[libKey] : undefined;
    const exact = `${l.type}|${l.size}|${l.voltage}`;
    return {
      designation: `${l.type}  ${l.size} mm²  ${l.voltage}`,
      construction: t?.[1] || l.type,
      standards: `${v?.[1] ?? ''}${t?.[2] ?? ''}`,
      voltage: l.voltage, temp: t?.[3] || '-',
      rdc: lib?.[1] ?? 0, ig: lib?.[2] ?? 0, id: lib?.[3] ?? 0, ia: lib?.[4] ?? 0, od: lib?.[5] ?? 0, w: lib?.[6] ?? 0,
      source: lib ? `Elsewedy catalogue ${lib[0]} (p.${lib[7]})${libKey !== exact ? ' - similar construction' : ''}` : 'Not in library - attach supplier datasheet',
    };
  }
}

export const CABLE_NOTES = [
  "Technical data are approximate and subject to manufacturing tolerance; final values per the manufacturer's approved datasheets.",
  "Current ratings per manufacturer's standard installation conditions (air 30 °C, ground 20 °C, soil resistivity 1-1.2 K.m/W, burial 0.5-0.8 m).",
  "Where the selected supplier's datasheet was not available, data are taken from Elsewedy Cables catalogue for the same / similar construction.",
  'Prices are budget figures (EGP, excl. VAT) indexed to the LME copper / aluminium and USD rates stated above.',
];
