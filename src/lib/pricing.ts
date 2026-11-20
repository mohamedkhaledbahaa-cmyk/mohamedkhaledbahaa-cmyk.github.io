// LV panel budget estimator + technical offer — a port of "LV_Panel_Pricing_Database" (sheets التسعير / Calc / العرض الفني / الأبعاد).
// Cell references in comments point to the original workbook so the logic can be checked against it.

export type Row = [string, string, number, string, string | number, string, number, number, number, number, number, number, number, number, number, number, number, number];
export interface Data {
  meta: { exported: string; priceDate: string; usd: number; eur: number; panels: number; offers: number; ageW: number; kvar: number; detuned: number };
  model: { coef: Record<string, number>; family: Record<string, number>; brand: Record<string, number>; alpha: number; w: number };
  forms: Record<string, [number, number]>;
  categories: Record<string, [string, string, string]>;
  sizes: Record<string, number[]>;
  caps: Record<string, number>;
  busbars: number[];
  motorA: [number, number][];
  pl: Record<string, [number, string]>;
  catalog: Record<string, [string, string, string]>;
  items: Record<string, string>;
  pfcPL: Record<string, [string, number, string, number]>;
  pfcCtrl: [number, number];
  dims: {
    p: Record<string, number | string>;
    acb: number[][]; widths: number[];
    mccbH: number[][]; fuseH: number[][]; mpcbH: number[][]; pilW: number[][];
    cableZone: Record<string, number>; floorD: number[][]; wallD: number[][]; wallH: number[];
  };
  db: Row[];
}

export const OUT_TYPES = ['MCB', 'RCBO/RCCB', 'MCCB', 'ACB', 'FUSE', 'MPCB/Starter', 'Switch/Isolator', 'DOL Starter (kW)', 'Star-Delta Starter (kW)', 'VFD (kW)', 'Soft Starter (kW)'];
export const MAIN_TYPES = ['ACB', 'MCCB', 'MCB', 'FUSE', 'SWITCH'];
export const IPS = [31, 42, 43, 54, 55, 65, 66];
export const BRANDS = ['Any', 'Schneider', 'Siemens', 'ABB', 'Local'];
export const TECH_BRANDS = ['Schneider', 'Siemens', 'ABB'];
export const FORMS = ['auto', 'Form 1', 'Form 2a', 'Form 2b', 'Form 3a', 'Form 3b', 'Form 4a', 'Form 4b'];

export interface Line { type: string; a: number; poles: number; qty: number }
export interface Input {
  project: string; panel: string; category: string;
  mainType: string; mainA: number; mainPoles: number; incomers: number;
  ip: number | ''; form: string; brand: string; vfdExtra: number; qty: number; adj: number;
  pfc: boolean; kvar: number; pfcType: 'Standard' | 'Detuned';
  lines: Line[];
  // technical offer options
  techBrand: string; kaOverride: number; formOverride: string; cableEntry: string; spd: boolean; ambient: number;
}

const ln = Math.log;
const ln1p = (x: number) => Math.log(1 + x);
const n = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : Number(x) || 0);

/** VLOOKUP(x, table, 2, TRUE) — last row whose first column ≤ x */
function vl(x: number, t: number[][], c = 1): number {
  let r = t[0];
  for (const row of t) if (row[0] <= x) r = row; else break;
  return n(r?.[c]);
}
/** next standard value ≥ x (MATCH(x-0.001, list, 1)+1), capped at the largest */
function snapUp(x: number, list: number[]): number {
  const max = Math.max(...list);
  if (x >= max) return max;
  let i = -1;
  for (let k = 0; k < list.length; k++) if (list[k] <= x - 0.001) i = k;
  return Math.min(i < 0 ? list[0] : list[i + 1] ?? list[0], max);
}

export class Estimator {
  constructor(public d: Data) {}

  /** Lists!P:Z — standard device size ≥ value, capped (Calc!H33) */
  snap(type: string, value: number): number | '' {
    const col = this.d.sizes[type];
    if (!col || !(value > 0)) return '';
    let i = -1;
    for (let k = 0; k < col.length; k++) if (col[k] <= value - 0.0001) i = k;
    const s = i < 0 ? col[0] : col[i + 1] ?? col[0];
    return Math.min(s, this.d.caps[type] ?? s);
  }
  /** Calc!G33 — normalised poles */
  poles(type: string, p: number): number {
    if (type === 'MCB') return Math.max(1, Math.min(4, p));
    if (type === 'RCBO/RCCB') return p <= 2 ? 2 : 4;
    if (type === 'MCCB' || type === 'ACB' || type === 'Switch/Isolator') return p === 4 ? 4 : 3;
    return 3;
  }

  /** One breaker line of Calc rows 33-53 */
  line(type: string, a: number, polesIn: number, qtyIn: number, isMain = false) {
    const d = this.d, P = d.dims.p as Record<string, number>;
    const F = isMain ? qtyIn : type === 'FUSE' ? (qtyIn * (polesIn === 0 ? 3 : polesIn)) / 3 : qtyIn;
    const G = type ? this.poles(type, polesIn) : 0;
    const H = !type || a <= 0 ? '' : this.snap(type, a);
    const key = H === '' ? '' : `${type}|${G}|${H}`;
    const J = key ? d.pl[key]?.[0] ?? 0 : 0;
    const h = n(H);
    // L: ACB compartment width (الأبعاد M36:S39 → standard widths M43:M49)
    let L = 0;
    if (type === 'ACB') {
      const row = d.dims.acb.filter((r) => r[0] <= h).pop() ?? d.dims.acb[0];
      const w = row[(P.P14 === 'Fixed' ? 1 : 3) + (G === 4 ? 1 : 0)] + P.P13;
      L = snapUp(w, d.dims.widths) * F;
    }
    // M: mounting height
    const motor = () => vl(vl(h, d.motorA), d.dims.mpcbH);
    let M = 0;
    if (type === 'MCCB' || type === 'Switch/Isolator') M = vl(h, d.dims.mccbH) * F;
    else if (type === 'FUSE') M = vl(h, d.dims.fuseH) * F;
    else if (type === 'MPCB/Starter') M = vl(h, d.dims.mpcbH) * F;
    else if (type === 'DOL Starter (kW)') M = motor() * F;
    else if (type === 'Star-Delta Starter (kW)') M = P.P18 * motor() * F;
    else if (type === 'VFD (kW)' || type === 'Soft Starter (kW)') M = P.P17 * F;
    // N: DIN modules, O: pillar width
    const N = type === 'MCB' ? G * (h > 63 ? 1.5 : 1) * F : type === 'RCBO/RCCB' ? (G <= 2 ? 2 : 4) * F : 0;
    const O = type === 'FUSE' ? vl(h, d.dims.pilW) * F : !type || type === 'MCB' || type === 'RCBO/RCCB' ? N * 18 : (h <= 250 ? P.P31 : P.P32) * F;
    return { type, a, polesIn, qtyIn, F, G, H, key, J, K: J * F, L, M, N, O };
  }

  calc(inp: Input) {
    const d = this.d, m = d.model, P = d.dims.p as Record<string, number>;
    const adj = n(inp.adj);
    const C3 = inp.category;
    const C4 = d.categories[C3]?.[0] ?? C3; // family
    const C5 = d.categories[C3]?.[1] ?? C3; // match category
    const C6 = inp.mainType;
    const C7 = Math.max(n(inp.mainA), 1);
    const C8 = Math.max(n(inp.incomers), 1);
    const C9 = inp.ip;
    const C10 = inp.brand;
    const lines = inp.lines.filter((l) => l.type);
    const q = (types: string[]) => lines.filter((l) => types.includes(l.type)).reduce((s, l) => s + n(l.qty), 0);
    const C11 = n(inp.vfdExtra) + q(['VFD (kW)', 'Soft Starter (kW)']);
    const C12 = q(['ACB']);
    const C13 = q(['MCCB']);
    const C14 = q(['MCB', 'RCBO/RCCB']);
    const C15 = lines.filter((l) => l.type === 'FUSE').reduce((s, l) => s + n(l.qty) * n(l.poles), 0) / 3;
    const C16 = q(['MPCB/Starter', 'Switch/Isolator', 'DOL Starter (kW)', 'Star-Delta Starter (kW)']);

    // breaker lines (Calc 33-53)
    const mainT = C6 === 'SWITCH' ? 'Switch/Isolator' : C6 === '' ? 'MCCB' : C6;
    const main = this.line(mainT, C7, n(inp.mainPoles), C8, true);
    const outs = inp.lines.map((l) => this.line(l.type, n(l.a), n(l.poles), n(l.qty)));
    const all = [main, ...outs];
    const C30 = Math.max(all.reduce((s, x) => s + x.K, 0), 1);
    const C31 = all.filter((x) => x.type === 'VFD (kW)' || x.type === 'Soft Starter (kW)').reduce((s, x) => s + x.K, 0) / C30;

    // form (Calc C21-C25)
    const C22 = C4 === 'PILLAR' || C7 <= 160 ? 'Form 1' : 'Form 2b';
    const C23 = !inp.form || inp.form === 'auto' ? C22 : inp.form;
    const C24 = d.forms[C23]?.[1] ?? 1;
    const C25 = d.forms[C22]?.[1] ?? 1;

    // statistical model (Calc C17/C18)
    const k = m.coef;
    const famKey = C4 === 'MCC' && C16 + C11 === 0 ? 'SMDB' : C4;
    const C19 = m.brand[C10] ?? 0;
    const C17 = k.const + k.ln_mainA * ln(C7) + k.main_is_ACB * (C6 === 'ACB' ? 1 : 0) + k.ln_incomers * ln(C8)
      + k.ln1p_MCCB * ln1p(C13) + k.ln1p_MCB_RCD * ln1p(C14) + k.ln1p_ACB * ln1p(C12) + k.ln1p_FUSE * ln1p(C15)
      + k.ln1p_MPCB_SW * ln1p(C16) + k.ln1p_VFD * ln1p(C11) + k.ln_comp * ln(C30) + k.vfd_share * C31
      + (m.family[famKey] ?? 0) + C19;
    const C18 = Math.exp(C17) * C24 / C25;

    // similar panels (Database AG/AI/AK + Calc rank table)
    const ageW = d.meta.ageW;
    const b4 = C10.slice(0, 4);
    const scored = d.db.map((r) => {
      const [cat, fam, sup, brand, ip, mt, N, Q, R, ST, U, V, W, age, AF, AR, AO, row] = r;
      const AG = (cat === C5 ? 0 : fam === C4 ? 0.4 : 2.5) + 1.5 * Math.abs(ln(N) - ln(C7)) + (mt === C6 ? 0 : 0.6)
        + 0.8 * Math.abs(ln1p(R) - ln1p(C13)) + 0.8 * Math.abs(ln1p(Q) - ln1p(C12)) + 0.6 * Math.abs(ln1p(U) - ln1p(C15))
        + 1.2 * Math.abs(ln1p(W) - ln1p(C11)) + 0.6 * Math.abs(ln1p(ST) - ln1p(C14)) + 0.5 * Math.abs(ln1p(V) - ln1p(C16))
        + (ip !== '' && C9 !== '' && String(ip) !== String(C9) ? 0.15 : 0)
        + (C10 !== 'Any' && String(brand).slice(0, 4) !== b4 ? 0.35 : 0) + ageW * age;
      const AH = AG + row / 1e7;
      const AI = AR * Math.exp(m.alpha * (C17 - AF)) * C24 / AO;
      return { sup, AG, AH, AI };
    });
    const best = new Map<number, number>();
    for (const s of scored) if (!best.has(s.sup) || s.AH < best.get(s.sup)!) best.set(s.sup, s.AH);
    const ranked = scored.map((s) => ({ ...s, AK: s.AH + (best.get(s.sup) === s.AH ? 0 : 1000) })).sort((a, b) => a.AK - b.AK);
    const top = ranked.slice(0, 3);
    const wts = top.map((t) => 1 / (t.AG + 0.1));
    const I9 = top.reduce((s, t, i) => s + t.AI * wts[i], 0) / wts.reduce((a, b) => a + b, 0);
    const I10 = Math.min(...top.map((t) => t.AI));
    const I11 = Math.max(...top.map((t) => t.AI));
    const H3 = top[0].AG;

    // PFC (Calc C27-C29, I14)
    const C27 = inp.pfc && n(inp.kvar) > 0 && C3 !== 'PFC';
    const C28 = C27 ? n(inp.kvar) : 0;
    const C29 = inp.pfcType === 'Detuned' ? 'Detuned' : 'Standard';
    const I14 = C27 ? C28 * d.meta.kvar * (C29 === 'Detuned' ? d.meta.detuned : 1) * (1 + adj) : 0;

    const I12 = (m.w * I9 + (1 - m.w) * C18) * (1 + adj);
    const I15 = I12 + I14;
    const low = Math.min(I10 * (1 + adj) + I14, I15);
    const high = Math.max(I11 * (1 + adj) + I14, I15);
    const C20 = m.brand[inp.techBrand] ?? 0;
    const techPrice = I12 * Math.exp(C20 - C19) + I14;

    // dimensions (Calc C56-C81)
    const C56 = C6 === 'ACB' || ((C6 === 'MCCB' || C6 === 'SWITCH') && C7 >= 800);
    const C57 = ['MDB', 'MCC', 'PFC', 'ATS'].includes(C4) || C7 >= 400;
    const C58 = C6 === 'ACB' ? main.L / Math.max(main.F, 1) : C56 ? P.P15 : 0;
    const C59 = C56 ? C8 : 0;
    const sumO = (f: 'L' | 'M' | 'N' | 'O') => outs.reduce((s, x) => s + x[f], 0);
    const C60 = sumO('L');
    const C61 = C12;
    const C62 = sumO('M') + (C56 ? 0 : main.M + (C7 >= 250 && C6 !== 'FUSE' ? P.P16 : 0)) + C11 * P.P17
      + Math.ceil((sumO('N') + (C56 ? 0 : main.N)) / P.P20) * P.P19;
    const C63 = C6 === 'ACB' || C7 >= P.P9 || C4 === 'MCC' ? P.P7 : P.P8;
    const C64 = C63 - P.P10;
    const C65 = C62 <= 0 ? 0 : Math.ceil((C62 * P.P11) / C64 - 1e-9);
    const C66 = P.P12 + (d.dims.cableZone[C23] ?? 200);
    const C67 = C3 === 'PFC' ? n(inp.kvar) : C28;
    const C68 = C67 <= 0 ? 0 : Math.ceil(C67 / (C29 === 'Detuned' ? P.P23 : P.P22));
    const C69 = C58 * C59 + C60 + C65 * C66 + C68 * P.P21;
    const maxOutH = Math.max(0, ...outs.map((x) => n(x.H)));
    const C70 = Math.max(vl(C7, d.dims.floorD), C61 > 0 ? vl(maxOutH, d.dims.floorD) : 0);
    const C71 = P.P25 + C62 * P.P11;
    const wallMax = Math.max(...d.dims.wallH);
    const C72 = snapUp(C71, d.dims.wallH);
    const C73 = vl(C7, d.dims.wallD);
    const C74 = Math.max(400, Math.ceil(((C3 === 'COFFREE' ? P.P30 : P.P27) + all.reduce((s, x) => s + x.O, 0)) / 100) * 100);
    const C75 = C4 === 'PILLAR' ? 'PIL' : C57 || C71 > wallMax ? 'FLOOR' : 'WALL';
    const W = C75 === 'PIL' ? C74 : C75 === 'WALL' ? P.P24 : Math.max(C69, 600);
    const Hh = C75 === 'PIL' ? (C3 === 'COFFREE' ? P.P28 : P.P26) : C75 === 'WALL' ? C72 : C63;
    const D = C75 === 'PIL' ? (C3 === 'COFFREE' ? P.P29 : C7 <= 400 ? 400 : 500) : C75 === 'WALL' ? C73 : C70;
    const columns = C75 === 'FLOOR' ? C59 + C61 + C65 + C68 : 1;
    // column layout (Calc rows 86-105): feeders | incomer | ACB outgoings | 2nd incomer… | feeders | PFC
    const layout: { code: string; label: string; w: number }[] = [];
    if (C75 !== 'FLOOR') layout.push({ code: C75 === 'WALL' ? 'WALL BOX' : C3 === 'COFFREE' ? 'COFFREE' : 'PILLAR', label: C75, w: W });
    else {
      const push = (code: string, count: number, w: number) => { for (let i = 0; i < count; i++) layout.push({ code, label: code, w }); };
      push('F', Math.floor(C65 / 2), C66);
      push('I', Math.min(C59, 1), C58);
      push('A', C61, C60 / Math.max(C61, 1));
      push('I', Math.max(C59 - 1, 0), C58);
      push('F', C65 - Math.floor(C65 / 2), C66);
      push('P', C68, P.P21);
      const seen: Record<string, number> = {};
      layout.forEach((c) => { seen[c.code] = (seen[c.code] ?? 0) + 1; c.label = `${c.code}${seen[c.code]}`; });
    }
    const dimsText = `${Math.round(W)} W × ${Math.round(Hh)} H × ${Math.round(D)} D mm`;
    const mountText = C75 === 'PIL' ? (C3 === 'COFFREE' ? 'Coffree – wall / pole mounted, outdoor' : 'Free-standing feeder pillar on plinth, outdoor')
      : C75 === 'WALL' ? 'Wall-mounted enclosure' : `Floor-standing, ${columns} column(s)`;

    return {
      price: I15, low, high, qtyTotal: I15 * n(inp.qty), panelOnly: I12, pfcPrice: I14, similar: I9, model: C18,
      usd: I15 / d.meta.usd, similarity: 1 / (1 + H3), distance: H3,
      confidence: (H3 < 0.7 ? 'high' : H3 < 1.6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      counts: { acb: C12, mccb: C13, mcb: C14, fuse: C15, mpcb: C16, vfd: C11, total: C12 + C13 + C14 + C15 + C16 },
      form: C23, formFactor: C24 / C25, breakersCost: C30, ratio: I12 / C30,
      dims: { W, H: Hh, D, columns, text: dimsText, mount: mountText, mode: C75, layout },
      pfc: { on: C27, kvar: C28, type: C29 },
      techPrice, main, outs, C4, C7, C8, C9, C11, C21: inp.form,
    };
  }

  /** العرض الفني */
  offer(inp: Input, r: ReturnType<Estimator['calc']>) {
    const d = this.d, B = inp.techBrand, C7 = r.C7, C4 = r.C4, C3 = inp.category;
    const AL13 = C3 === 'PILLAR' || C3 === 'COFFREE' ? 'PIL' : n(inp.ip) >= 65 ? 'OUT' : C7 <= 250 ? 'S' : C7 <= 630 ? 'M' : 'L';
    let AL14 = 63;
    { let i = -1; d.busbars.forEach((b, k) => { if (b <= C7 - 0.001) i = k; }); if (i >= 0 && d.busbars[i + 1] != null) AL14 = Math.min(d.busbars[i + 1], 6300); }
    const AL15 = n(inp.kaOverride) > 0 ? n(inp.kaOverride) : C7 <= 63 ? 10 : C7 <= 160 ? 25 : C7 <= 630 ? 36 : C7 <= 1600 ? 50 : 65;
    const AL16 = inp.formOverride ? inp.formOverride : inp.form && inp.form !== 'auto' ? inp.form
      : C4 === 'PILLAR' ? 'Form 1' : C4 === 'MCC' ? 'Form 3b' : C7 <= 160 ? 'Form 1' : C7 <= 630 ? 'Form 2b' : 'Form 3b';
    const AL17 = ['MDB', 'MCC', 'PFC', 'ATS', 'PILLAR'].includes(C4) || C7 >= 400;
    const kvar = r.pfc.kvar;
    const AL19 = kvar <= 150 ? 25 : 50;
    const AL20 = Math.max(1, Math.ceil(kvar / AL19));
    const AL21 = Math.ceil((kvar * 1000) / (Math.sqrt(3) * 400) * 1.43);
    const schneider = B === 'Schneider';
    const ip = inp.ip === '' ? '' : `IP${inp.ip}`;

    type Item = { head?: string; no?: number; qty?: string | number; desc: string; rating?: string; poles?: string; icu?: string; brand?: string; ref?: string; unit?: number | ''; total?: number | '' };
    const items: Item[] = [];
    let no = 0;
    const head = (h: string, show = true) => { if (show) items.push({ head: h, desc: h }); };
    const add = (show: boolean, it: Omit<Item, 'no'>) => {
      if (!show || !it.desc) return;
      const unit = it.unit ?? '';
      const qn = typeof it.qty === 'number' ? it.qty : NaN;
      items.push({ ...it, no: ++no, brand: it.brand ?? B, unit, total: typeof unit === 'number' && isFinite(qn) ? unit * qn : '' });
    };
    const device = (type: string, a: number, polesIn: number, qty: number, kw = false, prefix = '') => {
      if (!type) return;
      const S = this.poles(type, polesIn);
      const T = this.snap(type, a);
      const U = `${B}|${type}|${S}|${T}`, AF = `${type}|${S}|${T}`;
      const cat = d.catalog[U];
      const desc = cat?.[0] ?? '';
      if (!desc || !(qty > 0)) return;
      const plRef = d.pl[AF]?.[1] ?? '';
      add(true, {
        qty, desc: prefix + desc, rating: `${T}${kw ? ' kW' : ' A'}`, poles: type === 'FUSE' ? '' : `${S}P`, icu: cat?.[1] ?? '',
        brand: type === 'FUSE' ? 'ETAL / equal' : B, ref: schneider && plRef ? plRef : cat?.[2] ?? '',
        unit: schneider ? d.pl[AF]?.[0] ?? '' : '',
      });
    };

    head('INCOMING');
    device(inp.mainType === 'SWITCH' ? 'Switch/Isolator' : inp.mainType, n(inp.mainA), n(inp.mainPoles), Math.max(n(inp.incomers), 0) || 0);
    add(n(inp.incomers) > 1 && (inp.mainType === 'ACB' || inp.mainType === 'MCCB'), { qty: 1, desc: d.items[`${B}|ILK`] ?? '' });
    add(inp.spd, { qty: 1, desc: d.items[`${B}|SPD`] ?? '', icu: '40 kA' });
    add(C7 >= 250 && C4 !== 'PILLAR', { qty: 1, desc: d.items[`${B}|METER`] ?? '' });
    add(C7 >= 250 && C4 !== 'PILLAR', { qty: 3, desc: `Current transformer ${AL14}/5 A, class 1, 5 VA`, brand: 'Local / equal' });
    add(C4 !== 'PILLAR', { qty: '1 set', desc: d.items[`${B}|LAMP`] ?? '' });

    const outs = inp.lines.filter((l) => l.type && n(l.qty) > 0);
    head('OUTGOING FEEDERS', outs.length > 0);
    for (const l of outs) {
      const qty = l.type === 'FUSE' ? (n(l.qty) * Math.max(n(l.poles), 1)) / 3 : n(l.qty);
      device(l.type, n(l.a), n(l.poles), qty, l.type.endsWith('(kW)'));
    }

    const pfc = r.pfc.on;
    head('POWER FACTOR CORRECTION', pfc);
    if (pfc) {
      const step = d.pfcPL[String(AL19)];
      add(true, { qty: 1, desc: `Automatic PFC bank ${kvar} kVAR, 400 V, 50 Hz, ${r.pfc.type === 'Detuned' ? 'detuned 7% (189 Hz)' : 'standard'} – ${AL20} steps × ${AL19} kVAR` });
      device('MCCB', AL21, 3, 1, false, 'PFC incomer – ');
      add(true, { qty: AL20, desc: (d.items[`${B}|CAP`] ?? '').replace('#', String(AL19)), ref: schneider ? step?.[0] ?? '' : '', unit: schneider ? step?.[1] ?? '' : '' });
      add(true, { qty: AL20, desc: (d.items[`${B}|PFCCON`] ?? '').replace('#', String(AL19)), ref: schneider ? step?.[2] ?? '' : '', unit: schneider ? step?.[3] ?? '' : '' });
      add(r.pfc.type === 'Detuned', { qty: AL20, desc: (d.items[`${B}|REACT`] ?? '').replace('#', String(AL19)) });
      add(true, { qty: 3 * AL20, desc: 'gG fuse link + fuse base for capacitor-step protection', brand: 'ETAL / equal' });
      add(true, { qty: 1, desc: d.items[`${B}|PFCCTRL`] ?? '', ref: schneider ? (AL20 <= 6 ? 'VPL06N' : 'VPL12N') : '', unit: schneider ? d.pfcCtrl[AL20 <= 6 ? 0 : 1] : '' });
      add(true, { qty: '1 set', desc: 'Ventilation fans, thermostat & filters for the PFC section', brand: 'Local' });
    }
    head('MOTOR DRIVES', r.C11 > 0);
    add(r.C11 > 0, { qty: r.C11, desc: d.items[`${B}|VFD`] ?? '' });

    head('BUSBAR, WIRING & ACCESSORIES');
    add(true, { qty: '1 lot', desc: `Main copper busbar ${AL14} A, 3Ph + N + PE, rated for ${AL15} kA / 1 s, with busbar supports & shrouds`, brand: 'Local' });
    add(true, { qty: '1 lot', desc: 'Internal wiring (H07V-K), ferrules, terminal blocks, DIN rails, cable ducts & ventilation as required', brand: 'Local' });
    add(true, { qty: '1 lot', desc: 'Engraved door labels, internal labels, earth bar, door earthing straps, document pocket & as-built drawings', brand: 'Local' });

    const listTotal = schneider ? items.reduce((s, i) => s + (typeof i.total === 'number' ? i.total : 0), 0) : null;
    const C3desc = d.categories[C3]?.[2] ?? '';
    return {
      enclosure: d.items[`${B}|ENC|${AL13}`] ?? '',
      general: [
        ['Rated voltage / system', '400/230 V AC, 3Ph + N + PE, 50 Hz, TN-S'], ['Busbar system', 'Electrolytic copper, N = 100%, PE = 50%'],
        ['Main busbar rating', `${AL14} A`], ['Sheet steel', `${AL17 ? '2.0 mm' : '1.5 mm'} cold-rolled steel`],
        ['Short-circuit withstand', `${AL15} kA, 1 s`], ['Finish', 'Electrostatic powder coating, RAL 7035'],
        ['Form of separation', AL16], ['Ambient temperature', `${n(inp.ambient) || 40} °C`],
        ['Degree of protection', ip], ['Control voltage', '230 V AC'],
        ['Mounting', C4 === 'PILLAR' ? 'Free-standing on plinth, outdoor' : `${AL17 ? 'Floor-standing' : 'Wall-mounted'}${n(inp.ip) >= 65 ? ', outdoor' : ', indoor'}`],
        ['Selectivity', 'As per manufacturer selectivity tables'],
        ['Cable entry', inp.cableEntry || 'Bottom / Bottom'],
        ['Main breaker', `${inp.mainType} ${inp.mainA} A, ${inp.mainPoles}P${n(inp.incomers) > 1 ? ` × ${inp.incomers} incomers` : ''}`],
        ['Standards', 'IEC 61439-1/2 (type-tested / design-verified)'], ['Testing', 'Routine tests per IEC 61439 + FAT'],
        ['Overall dimensions (approx.)', r.dims.text], ['Arrangement', r.dims.mount],
      ] as [string, string][],
      typeText: `${C3} – ${C3desc}`,
      items, listTotal,
      ref: `TO-${d.meta.priceDate.slice(2).replace(/-/g, '')}-${inp.panel}`,
    };
  }
}

export const NOTES = [
  'Offer is a proposal generated from the inputs; ratings, kA levels and selectivity to be confirmed against the approved SLD before ordering.',
  'Cable glands, external cables, cable lugs/terminations and site installation are excluded.',
  "Enclosure dimensions are subject to the panel builder's shop drawings and layout approval.",
  'Equivalent components of the same brand series may be used where ratings are not available in the catalogue.',
  'Fuse ways are quoted as 3 fuse bases + 3 gG fuse links per way (ETAL or equal).',
  'List prices (Schneider only) are from Schneider Electric Egypt price list 2026, EGP excl. VAT, before discount.',
  'Estimated price is a budget figure from the offers database (excl. VAT); see the estimator for the price range.',
];
