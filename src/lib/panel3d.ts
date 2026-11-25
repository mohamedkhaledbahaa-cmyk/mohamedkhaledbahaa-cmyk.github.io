// Lightweight 3D view of an LV panel (pure CSS 3D transforms — no WebGL library).
// Drag (mouse or touch) to rotate; double-click / double-tap to reset.

export interface PanelDims { W: number; H: number; D: number; mode: string; layout: { code: string; label: string; w: number }[] }

const DEFAULT = { rx: -14, ry: -32 };

export function renderPanel3D(host: HTMLElement, d: PanelDims, labels: { w: string; h: string; d: string; hint: string }) {
  // keep the user's rotation between updates
  const rx = Number(host.dataset.rx ?? DEFAULT.rx), ry = Number(host.dataset.ry ?? DEFAULT.ry);
  host.dataset.rx = String(rx); host.dataset.ry = String(ry);

  const avail = Math.max(180, Math.min(host.clientWidth || 300, 360) - 70);
  const s = Math.min(avail / Math.max(d.W, 1), 190 / Math.max(d.H, 1), (avail * 0.55) / Math.max(d.D, 1));
  const W = d.W * s, H = d.H * s, D = d.D * s;
  const plinth = d.mode === 'WALL' ? 0 : Math.max(5, 100 * s);
  const fmt = (x: number) => Math.round(x).toLocaleString('en-US');

  const tot = d.layout.reduce((a, c) => a + c.w, 0) || 1;
  const cols = d.layout.map((c) => {
    const kind = c.code[0];
    const vents = kind === 'P' || kind === 'F' ? '<i class="p3-vent"></i>' : '';
    return `<div class="p3-col p3-${kind}" style="flex:${c.w / tot}"><span class="p3-tag">${c.label}</span><i class="p3-handle"></i>${vents}</div>`;
  }).join('');

  const face = (cls: string, w: number, h: number, tf: string, inner = '') =>
    `<div class="p3-face ${cls}" style="width:${w}px;height:${h}px;left:${(W - w) / 2}px;top:${(H - h) / 2}px;transform:${tf}">${inner}</div>`;

  host.innerHTML = `
    <div class="p3-scene" style="height:${Math.max(200, H + 80)}px">
      <div class="p3-box" style="width:${W}px;height:${H}px;transform:rotateX(${rx}deg) rotateY(${ry}deg)">
        ${face('p3-front', W, H, `translateZ(${D / 2}px)`, `<div class="p3-doors" style="bottom:${plinth}px">${cols}</div><div class="p3-plinth" style="height:${plinth}px"></div>
          <span class="p3-dim p3-dim-w">${labels.w} ${fmt(d.W)}</span><span class="p3-dim p3-dim-h">${labels.h} ${fmt(d.H)}</span>`)}
        ${face('p3-back', W, H, `rotateY(180deg) translateZ(${D / 2}px)`)}
        ${face('p3-right', D, H, `rotateY(90deg) translateZ(${W / 2}px)`, `<i class="p3-side-vent"></i><div class="p3-plinth" style="height:${plinth}px"></div><span class="p3-dim p3-dim-d">${labels.d} ${fmt(d.D)}</span>`)}
        ${face('p3-left', D, H, `rotateY(-90deg) translateZ(${W / 2}px)`, `<i class="p3-side-vent"></i><div class="p3-plinth" style="height:${plinth}px"></div>`)}
        ${face('p3-top', W, D, `rotateX(90deg) translateZ(${H / 2}px)`)}
        ${face('p3-bottom', W, D, `rotateX(-90deg) translateZ(${H / 2}px)`)}
      </div>
    </div>
    <p class="p3-hint">${labels.hint}</p>`;

  if (host.dataset.bound) return;
  host.dataset.bound = '1';
  let drag: { x: number; y: number; rx: number; ry: number } | null = null;
  const apply = () => {
    const box = host.querySelector<HTMLElement>('.p3-box');
    if (box) box.style.transform = `rotateX(${host.dataset.rx}deg) rotateY(${host.dataset.ry}deg)`;
  };
  host.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, rx: Number(host.dataset.rx), ry: Number(host.dataset.ry) };
    host.setPointerCapture(e.pointerId);
    host.classList.add('p3-dragging');
  });
  host.addEventListener('pointermove', (e) => {
    if (!drag) return;
    host.dataset.ry = String(drag.ry + (e.clientX - drag.x) * 0.5);
    host.dataset.rx = String(Math.max(-60, Math.min(30, drag.rx - (e.clientY - drag.y) * 0.4)));
    apply();
  });
  const end = () => { drag = null; host.classList.remove('p3-dragging'); };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);
  host.addEventListener('dblclick', () => { host.dataset.rx = String(DEFAULT.rx); host.dataset.ry = String(DEFAULT.ry); apply(); });
}
