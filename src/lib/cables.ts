// Cable budget estimator — port of "Cable_Pricing_DB_LME" (BOQ_Pricing basis "Supplier average" + Technical_Offer).

export interface CableData {
  meta: { priceDate: string; cu: number; al: number; usd: number; wastage: number; margin: number; vat: number; prices: number; brands: number };
  rows: [string, string, string, string, number, number][]; // type, size, voltage, brand, EGP/m today, valid
  types: Record<string, [string, string, string, string]>; // libType, construction, extra standards, max temp
  volts: Record<string, [string, string]>; // library voltage, base standard
  library: Record<string, [string, number, number, number, number, number, number, string | number]>; // code, Rdc, Ig, Id, Ia, OD, W, page
}
export interface CableLine { type: string; size: string; voltage: string; qty: number; override?: number }
export interface CableSettings { brand: string; wastage: number; margin: number; vat: number }

const sizeKey = (s: string) => s.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
export function bySize(a: string, b: string) {
  const x = sizeKey(a), y = sizeKey(b);
  // cores first, then cross-section
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  return a.localeCompare(b);
}

export class CableEstimator {
  tree = new Map<string, Map<string, Set<string>>>();
  brands: string[];
  constructor(public d: CableData) {
    for (const [t, s, v] of d.rows) {
      if (!this.tree.has(t)) this.tree.set(t, new Map());
      const m = this.tree.get(t)!;
      if (!m.has(s)) m.set(s, new Set());
      m.get(s)!.add(v);
    }
    const count = new Map<string, number>();
    d.rows.forEach((r) => count.set(r[3], (count.get(r[3]) ?? 0) + 1));
    this.brands = [...count].sort((a, b) => b[1] - a[1]).map((x) => x[0]).filter((b) => b !== 'Other');
  }
  types() { return [...this.tree.keys()].sort(); }
  sizes(t: string) { return [...(this.tree.get(t)?.keys() ?? [])].sort(bySize); }
  voltages(t: string, s: string) { return [...(this.tree.get(t)?.get(s) ?? [])].sort(); }
  brandsFor(t: string, s: string, v: string) { return [...new Set(this.d.rows.filter((r) => r[0] === t && r[1] === s && r[2] === v).map((r) => r[3]))]; }

  /** BOQ_Pricing!G: average of the supplier's prices for this cable, else average of all suppliers (fallback) */
  basis(l: CableLine, brand: string) {
    const all = this.d.rows.filter((r) => r[0] === l.type && r[1] === l.size && r[2] === l.voltage);
    const own = brand && brand !== 'all' ? all.filter((r) => r[3] === brand) : [];
    const use = own.length ? own : all;
    const avg = use.length ? use.reduce((s, r) => s + r[4], 0) / use.length : null;
    const mode: 'supplier' | 'fallback' | 'all' | 'none' = !all.length ? 'none' : own.length ? 'supplier' : brand && brand !== 'all' ? 'fallback' : 'all';
    return { avg, n: use.length, mode, min: use.length ? Math.min(...use.map((r) => r[4])) : null, max: use.length ? Math.max(...use.map((r) => r[4])) : null };
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
    return { lines: out, cost, sell, margin: sell - cost, incVat: sell * (1 + s.vat), usd: sell / this.d.meta.usd };
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
