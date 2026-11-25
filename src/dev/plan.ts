// Dev-only: window.__sim.plan(id) draws a station's plot from above in one image, over the page
// (docs/station-playbook.md "Top-down plan view"). What is built: the ground by its material, every
// collider's outline, every building model's footprint with a tick on its front, the exits' wells,
// the traffic lanes and the named places. Over it, where the station has a street table
// (stations/street-plan.ts): the streets' centre lines and names, what the plan keeps free, and
// every rule the build breaks, in red. Click the picture to put it away.

import { stationWorld } from '../stations';
import { GROUND_Y } from '../stations/kit';
import { STREET_PLANS, exitHoles, footprints, plotRect, streetProblems, streetRects, type Rect } from '../stations/street-plan';

const GROUND: Record<string, string> = { asphalt: '#5b5e62', paver: '#cfc9bd', concrete: '#b5b3ac', water: '#7fa7bd' };
const hex = (mat: string) => (/#([0-9a-f]{6})/i.exec(mat) ? `#${/#([0-9a-f]{6})/i.exec(mat)![1]}` : null);

/** `scale`: pixels a metre. Returns the picture's size and how many rules are broken. */
export function plan(id: string, scale = 4): string {
  const w = stationWorld(id), b = w.build, p = STREET_PLANS[id];
  const [X0, Z0, X1, Z1] = plotRect(b.plot), M = 14;
  const cv = document.createElement('canvas');
  cv.width = Math.round((X1 - X0 + 2 * M) * scale);
  cv.height = Math.round((Z1 - Z0 + 2 * M) * scale);
  const g = cv.getContext('2d')!;
  const px = (x: number) => (x - X0 + M) * scale, pz = (z: number) => (z - Z0 + M) * scale;
  const rect = (r: Rect, fill: string | null, stroke: string | null, lw = 1) => {
    if (fill) {
      g.fillStyle = fill;
      g.fillRect(px(r[0]), pz(r[1]), (r[2] - r[0]) * scale, (r[3] - r[1]) * scale);
    }
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = lw;
      g.strokeRect(px(r[0]), pz(r[1]), (r[2] - r[0]) * scale, (r[3] - r[1]) * scale);
    }
  };
  const text = (s: string, x: number, z: number, col = '#111', size = 11, align: CanvasTextAlign = 'center') => {
    g.font = `${size}px sans-serif`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.strokeText(s, px(x), pz(z));
    g.fillStyle = col;
    g.fillText(s, px(x), pz(z));
  };
  g.fillStyle = '#e9e7e1';
  g.fillRect(0, 0, cv.width, cv.height);

  // The ground: each flat top at street level, lowest first.
  const GY = GROUND_Y;
  const tops = b.boxes.filter((q) => q.mat !== 'none' && q.max[1] <= GY + 0.03 && q.max[1] >= -0.05 && q.max[0] - q.min[0] > 0.4 && q.max[2] - q.min[2] > 0.4).sort((a, e) => a.max[1] - e.max[1]);
  for (const q of tops) rect([q.min[0], q.min[2], q.max[0], q.max[2]], GROUND[q.mat] ?? hex(q.mat) ?? '#bdbab2', null);
  // What the plan keeps free, and its streets.
  if (p) {
    for (const q of p.reserved) rect(q.r, 'rgba(214,150,40,0.28)', null);
    for (const s of p.streets) {
      const sr = streetRects(p, s);
      sr.road.forEach((r) => rect(r, null, 'rgba(40,40,40,0.55)', 1));
      sr.pave.forEach((r) => rect(r, null, 'rgba(120,110,90,0.5)', 1));
    }
  }
  // Colliders a metre above the street.
  for (const q of b.boxes) {
    if (!q.solid || q.min[1] > GY + 1.2 || q.max[1] < GY + 0.6) continue;
    if (q.max[0] - q.min[0] > 2 * b.plot.x || q.max[0] < X0 - M || q.min[0] > X1 + M || q.max[2] < Z0 - M || q.min[2] > Z1 + M) continue;
    rect([q.min[0], q.min[2], q.max[0], q.max[2]], 'rgba(60,70,90,0.22)', 'rgba(60,70,90,0.6)', 0.6);
  }
  // Building models: footprint, a tick on the front, the model's name.
  for (const f of footprints(b)) {
    const over = p?.overhead.includes(f.key);
    rect(f.r, over ? null : 'rgba(150,60,50,0.25)', over ? 'rgba(90,120,120,0.7)' : '#8c3b35', over ? 1 : 1.6);
    if (over) continue;
    const c = Math.cos(f.m.yaw), s = Math.sin(f.m.yaw);
    g.strokeStyle = '#8c3b35';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(px(f.m.pos[0]), pz(f.m.pos[2]));
    g.lineTo(px(f.m.pos[0] - 2.5 * s), pz(f.m.pos[2] - 2.5 * c));
    g.stroke();
    text(f.m.id, (f.r[0] + f.r[2]) / 2, (f.r[1] + f.r[3]) / 2, '#5a221e', 11);
  }
  // Traffic lanes.
  g.strokeStyle = '#2a62c9';
  g.lineWidth = 1.2;
  for (const l of b.lanes) {
    g.beginPath();
    g.moveTo(px(l.from[0]), pz(l.from[2]));
    g.lineTo(px(l.to[0]), pz(l.to[2]));
    g.stroke();
  }
  // Named places, then the exits.
  for (const z of b.zones) {
    if (z.kind !== 'street' && z.min[1] < GY - 1) continue;
    if (z.max[0] - z.min[0] > 2 * b.plot.x - 1) continue;
    rect([z.min[0], z.min[2], z.max[0], z.max[2]], null, 'rgba(30,120,90,0.8)', 1);
    text(z.en, (z.min[0] + z.max[0]) / 2, z.min[2] + 2.2, '#17694f', 10);
  }
  for (const h of exitHoles(b)) {
    rect(h.r, '#f2c230', '#222', 1.2);
    text(h.num || '?', (h.r[0] + h.r[2]) / 2, (h.r[1] + h.r[3]) / 2, '#111', 13);
  }
  // The street table's names; the plot's edge; a grid every 50 m with its coordinates; north; the scale.
  if (p) for (const s of p.streets) text(`${s.en} · ${2 * (s.half + s.pave)} m`, s.axis === 'x' ? X0 + 34 : s.c, s.axis === 'x' ? s.c : Z1 - 6, '#222', 11);
  rect([X0, Z0, X1, Z1], null, '#111', 2);
  g.setLineDash([2, 6]);
  for (let x = Math.ceil(X0 / 50) * 50; x <= X1; x += 50) {
    rect([x, Z0, x, Z1], null, 'rgba(0,0,0,0.35)', 0.6);
    text(`x ${x}`, x, Z0 - 4, '#444', 10);
  }
  for (let z = Math.ceil(Z0 / 50) * 50; z <= Z1; z += 50) {
    rect([X0, z, X1, z], null, 'rgba(0,0,0,0.35)', 0.6);
    text(`z ${z}`, X0 - 2, z, '#444', 10, 'right');
  }
  g.setLineDash([]);
  text(`${w.def.nameRomaji}: north is up, 50 m grid${p ? `, stage ${p.stage}` : ''}`, X0, Z1 + 6, '#111', 12, 'left');
  // Broken rules.
  const bad = p ? streetProblems(id, p, b) : [];
  bad.slice(0, 8).forEach((s, k) => text(s, X0 + 2, Z0 + 4 + k * 4, '#c8102e', 11, 'left'));

  document.getElementById('__plan')?.remove();
  cv.id = '__plan';
  cv.style.cssText = 'position:fixed;inset:0;margin:auto;max-width:100vw;max-height:100vh;z-index:99999;background:#e9e7e1;cursor:pointer';
  cv.onclick = () => cv.remove();
  document.body.appendChild(cv);
  if (bad.length) console.warn(`plan(${id}): ${bad.length} broken rule(s)\n${bad.join('\n')}`);
  return `${cv.width}x${cv.height}, ${bad.length} broken rule(s)`;
}
