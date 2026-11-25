// Civil works estimator (trenches, manholes, foundations) — port of the "Civil" sheet of Electrical_Pricing_Sheet_PRO.

export interface PriceItem { name: string; unit: string; mat: number; inst: number }
export interface CivilPrices {
  exc: PriceItem; bkf: PriceItem; sand: PriceItem; disp: PriceItem; tape: PriceItem;
  ws: number; clr: number; spc: number; // working space, side clearance, cable spacing (m)
  conc: PriceItem[]; duct: PriceItem[]; prot: PriceItem[]; cov: PriceItem[];
}
export interface Trench { desc: string; cables: number; spacing: number; width: number; depth: number; sand: number; conc: string; concT: number; ducts: number; duct: string; tape: number; prot: string; disposal: boolean; length: number }
export interface Manhole { desc: string; l: number; w: number; d: number; conc: string; wall: number; base: number; top: number; blind: number; cover: string; disposal: boolean; qty: number }
export interface Foundation { desc: string; shape: 'Rectangular' | 'Circular'; l: number; w: number; conc: string; depth: number; height: number; blind: number; extras: number; disposal: boolean; qty: number }

const it = (name: string, unit: string, mat = 0, inst = 0): PriceItem => ({ name, unit, mat, inst });
export const BLINDING = 'PC – Lean / blinding';

/** Table A defaults (from the sheet) */
export const DEFAULT_PRICES: CivilPrices = {
  exc: it('Excavation', 'm³', 0, 200),
  bkf: it('Backfill with excavated soil, compacted', 'm³', 0, 405),
  sand: it('Sand (bedding & cover)', 'm³'),
  disp: it('Disposal of surplus soil', 'm³'),
  tape: it('Warning tape (per row)', 'm', 3.25, 0),
  ws: 0.3, clr: 0.1, spc: 0.15,
  conc: [it('PC – Plain concrete', 'm³', 4400), it(BLINDING, 'm³', 4400), it('RC – Reinforced (incl. steel & formwork)', 'm³', 13500)],
  duct: [it('UPVC Ø110', 'm'), it('UPVC Ø160', 'm'), it('HDPE Ø110', 'm'), it('Flexible Ø63', 'm')],
  prot: [it('Bricks (1 row)', 'm', 5.25), it('Concrete slabs', 'm', 125), it('Plastic cable tiles', 'm')],
  cov: [it('Ductile iron D400 – heavy (roads)', 'No.'), it('Ductile iron C250 – medium', 'No.'), it('Ductile iron B125 – light (footpaths)', 'No.'), it('Concrete cover', 'No.')],
};

const RC = 'RC – Reinforced (incl. steel & formwork)';
export const EXAMPLES = {
  trenches: [
    { desc: '4 LV cables buried side by side in sand (width auto), tape + bricks', cables: 4, spacing: 0.15, width: 0, depth: 0.8, sand: 0.3, conc: '', concT: 0, ducts: 0, duct: '', tape: 1, prot: 'Bricks (1 row)', disposal: false, length: 100 },
    { desc: 'LV cable trench 60×80 cm, sand 30 cm, tape + bricks', cables: 0, spacing: 0, width: 0.6, depth: 0.8, sand: 0.3, conc: '', concT: 0, ducts: 0, duct: '', tape: 1, prot: 'Bricks (1 row)', disposal: false, length: 100 },
    { desc: 'Duct bank 2×UPVC Ø110 encased in plain concrete 30 cm', cables: 0, spacing: 0, width: 0.5, depth: 0.8, sand: 0, conc: 'PC – Plain concrete', concT: 0.3, ducts: 2, duct: 'UPVC Ø110', tape: 1, prot: '', disposal: false, length: 50 },
  ] as Trench[],
  manholes: [
    { desc: 'Electrical manhole 1.0×1.0×1.2 m, RC, D400 cover', l: 1, w: 1, d: 1.2, conc: RC, wall: 0.2, base: 0.2, top: 0.2, blind: 0.1, cover: 'Ductile iron D400 – heavy (roads)', disposal: false, qty: 4 },
    { desc: 'Hand hole 0.6×0.6×0.8 m, concrete cover', l: 0.6, w: 0.6, d: 0.8, conc: RC, wall: 0.15, base: 0.15, top: 0.15, blind: 0.1, cover: 'Concrete cover', disposal: false, qty: 6 },
  ] as Manhole[],
  foundations: [
    { desc: 'Generator base 3.5×1.5 m, 0.6 m in ground + 0.15 m above', shape: 'Rectangular', l: 3.5, w: 1.5, conc: RC, depth: 0.6, height: 0.15, blind: 0.1, extras: 0, disposal: false, qty: 1 },
    { desc: 'Transformer / kiosk base 3.0×2.5 m, 0.8 m in ground + 0.2 m above', shape: 'Rectangular', l: 3, w: 2.5, conc: RC, depth: 0.8, height: 0.2, blind: 0.1, extras: 0, disposal: false, qty: 1 },
    { desc: 'Lighting pole foundation 0.5×0.5 m + anchor bolts', shape: 'Rectangular', l: 0.5, w: 0.5, conc: RC, depth: 0.8, height: 0, blind: 0.05, extras: 0, disposal: false, qty: 20 },
    { desc: 'Round pole foundation Ø0.5 m × 1.2 m', shape: 'Circular', l: 0.5, w: 0, conc: 'PC – Plain concrete', depth: 1.2, height: 0.1, blind: 0.05, extras: 0, disposal: false, qty: 10 },
  ] as Foundation[],
};

const n = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : Number(x) || 0);
const find = (list: PriceItem[], name: string) => list.find((x) => x.name === name);

export function trench(t: Trench, P: CivilPrices) {
  const width = t.width > 0 ? t.width : n(t.cables) + n(t.ducts) === 0 ? 0 : (n(t.cables) + n(t.ducts)) * (t.spacing > 0 ? t.spacing : P.spc) + 2 * P.clr;
  const exc = width * n(t.depth), sand = width * n(t.sand), conc = t.conc ? width * n(t.concT) : 0;
  const bkf = Math.max(0, exc - sand - conc), surplus = t.disposal ? sand + conc : 0;
  const c = find(P.conc, t.conc), d = find(P.duct, t.duct), p = find(P.prot, t.prot);
  const mat = exc * P.exc.mat + bkf * P.bkf.mat + sand * P.sand.mat + conc * (c?.mat ?? 0) + n(t.ducts) * (d?.mat ?? 0) + n(t.tape) * P.tape.mat + (p?.mat ?? 0) + surplus * P.disp.mat;
  const inst = exc * P.exc.inst + bkf * P.bkf.inst + sand * P.sand.inst + conc * (c?.inst ?? 0) + n(t.ducts) * (d?.inst ?? 0) + n(t.tape) * P.tape.inst + (p?.inst ?? 0) + surplus * P.disp.inst;
  const warn: string[] = [];
  if (width === 0) warn.push('width');
  if (!n(t.depth)) warn.push('depth');
  if (t.conc && !((c?.mat ?? 0) + (c?.inst ?? 0))) warn.push('concPrice');
  if (n(t.ducts) > 0 && !t.duct) warn.push('ductType');
  if (t.duct && !n(t.ducts)) warn.push('ductNo');
  if (t.conc && !n(t.concT)) warn.push('concT');
  if (t.prot && !((p?.mat ?? 0) + (p?.inst ?? 0))) warn.push('protPrice');
  const perM = mat + inst;
  return { width, exc, sand, conc, bkf, surplus, mat, inst, perM, totalMat: mat * n(t.length), totalInst: inst * n(t.length), total: perM * n(t.length), warn };
}

export function manhole(m: Manhole, P: CivilPrices) {
  const L = n(m.l), W = n(m.w), D = n(m.d), wt = n(m.wall), b = n(m.base), tp = n(m.top), bl = n(m.blind);
  const has = L * W !== 0;
  const OL = L + 2 * wt, OW = W + 2 * wt, OH = b + D + tp;
  const exc = has ? (OL + 2 * P.ws) * (OW + 2 * P.ws) * (OH + bl) : 0;
  const conc = has ? OL * OW * (b + tp) + (OL * OW - L * W) * D - (m.cover ? 0.36 * tp : 0) : 0; // 0.6×0.6 cover opening
  const blind = has ? (OL + 0.2) * (OW + 0.2) * bl : 0;
  const bkf = Math.max(0, exc - OL * OW * OH - blind), surplus = m.disposal ? exc - bkf : 0;
  const c = find(P.conc, m.conc), bk = find(P.conc, BLINDING), cv = m.cover ? find(P.cov, m.cover) : undefined;
  const mat = exc * P.exc.mat + bkf * P.bkf.mat + conc * (c?.mat ?? 0) + blind * (bk?.mat ?? 0) + (cv?.mat ?? 0) + surplus * P.disp.mat;
  const inst = exc * P.exc.inst + bkf * P.bkf.inst + conc * (c?.inst ?? 0) + blind * (bk?.inst ?? 0) + (cv?.inst ?? 0) + surplus * P.disp.inst;
  const warn: string[] = [];
  if (m.conc && !((c?.mat ?? 0) + (c?.inst ?? 0))) warn.push('concPrice');
  if (m.cover && !((cv?.mat ?? 0) + (cv?.inst ?? 0))) warn.push('coverPrice');
  if (has && !m.conc) warn.push('concType');
  const each = mat + inst;
  return { exc, conc, blind, bkf, surplus, mat, inst, each, totalMat: mat * n(m.qty), totalInst: inst * n(m.qty), total: each * n(m.qty), warn };
}

export function foundation(f: Foundation, P: CivilPrices) {
  const circ = f.shape === 'Circular';
  const area = circ ? (Math.PI * n(f.l) ** 2) / 4 : n(f.l) * n(f.w);
  const exc = area === 0 ? 0 : (circ ? (n(f.l) + 2 * P.ws) ** 2 : (n(f.l) + 2 * P.ws) * (n(f.w) + 2 * P.ws)) * (n(f.depth) + n(f.blind));
  const conc = area * (n(f.depth) + n(f.height));
  const blind = area === 0 ? 0 : (circ ? (Math.PI * (n(f.l) + 0.2) ** 2) / 4 : (n(f.l) + 0.2) * (n(f.w) + 0.2)) * n(f.blind);
  const bkf = Math.max(0, exc - area * n(f.depth) - blind), surplus = f.disposal ? exc - bkf : 0;
  const c = find(P.conc, f.conc), bk = find(P.conc, BLINDING);
  const mat = exc * P.exc.mat + bkf * P.bkf.mat + conc * (c?.mat ?? 0) + blind * (bk?.mat ?? 0) + n(f.extras) + surplus * P.disp.mat;
  const inst = exc * P.exc.inst + bkf * P.bkf.inst + conc * (c?.inst ?? 0) + blind * (bk?.inst ?? 0) + surplus * P.disp.inst;
  const warn: string[] = [];
  if (f.conc && !((c?.mat ?? 0) + (c?.inst ?? 0))) warn.push('concPrice');
  const each = mat + inst;
  return { exc, conc, blind, bkf, surplus, mat, inst, each, totalMat: mat * n(f.qty), totalInst: inst * n(f.qty), total: each * n(f.qty), warn };
}
