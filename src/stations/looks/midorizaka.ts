// Station look: Midorizaka (緑坂, Y-11 / M-12). The garden-suburb station of the north hills.
//
// Nobody comes up a stair on the pavement here: both exits rise inside pavilions at the edge of
// Midorizaka Park. Exit 1 is the big one, timber and glass under a deep copper roof with a
// clerestory, a vestibule beyond the stair head with the Midori-no-Mado coffee counter, benches and
// a lift; exit 2 a small glazed pavilion with a wisteria pergola out front.
//
// The ticket hall is 1960s garden suburb: a timber slat ceiling with long light boxes, green glazed
// tile dado under a cream wall, a terrazzo floor, green tiled columns banded in timber, planters of
// shrubs by the benches, wisteria mosaics on the end walls, a flower stall and a bakery counter.
// The transfer bays to the Sumire Line carry the same dado; the platforms keep their lines' halls.

import {
  band, bench, cut, endDado, exitDado, exitHandrails, faceDado, passageDado, passageRails, shopFront, wallDado,
  type Brand, type DadoOpts, type Span,
} from './parts';
import type { ConcInfo, ExitInfo, Rect, Stairwell, StationLook } from './types';

const GREEN_TILE = 'tile:#5f8f5a';
const OAK = 'wood:#a07a52';
const OAK_DK = 'wood:#6b4a2e';
const COPPER = 'flat:#5f8f7d';
const IRON = 'flat:#2b2d30';
const GLOW = 'glow:#fff1d6';

const DADO: DadoOpts = { mat: GREEN_TILE, top: 1.2, cap: OAK, skirting: OAK_DK, frieze: OAK, friezeY: [2.36, 2.42] };

const FLOWERS: Brand = { ja: '花 みどり 駅店', en: 'Midori Flowers', bg: '#2e6b35', fg: '#ffffff', kind: 'flowers' };
const BAKERY: Brand = { ja: 'パン工房 ぶどうの木', en: 'Budō-no-ki Bakery', bg: '#7a4a2a', fg: '#f6e7c8', kind: 'bakery' };

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

const hallWells = (i: ConcInfo): Stairwell[] => i.stairwells.filter((w) => w.room < 0);
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}
const wellGapsAlong = (i: ConcInfo, z: number, m = 0.1): Span[] =>
  hallWells(i).filter((w) => z > w.footprint[1] - m && z < w.footprint[3] + m).map((w): Span => [w.footprint[0] - 0.05, w.footprint[2] + 0.05]);

// ── Ceiling ──────────────────────────────────────────────────────────────────────────────────

/** Timber slats along the hall every 0.3 m, broken at stairwells and gate lines; light boxes in two lines. */
function ceiling(i: ConcInfo) {
  const { b } = i, top = i.cf + i.clear;
  const gates: Span[] = i.ends.map((e): Span => [e.g - 1.0, e.g + 1.0]);
  for (let z = -i.cw + 1.45; z < i.cw - 1.35; z += 0.3) {
    for (const [p, q] of cut([i.x0, i.x1], [...wellGapsAlong(i, z, 0.08), ...gates])) b.deco(OAK, p, top - 0.1, z - 0.05, q, top - 0.04, z + 0.05);
  }
  const lz = i.cw * 0.45;
  for (const z of [-lz, lz]) {
    for (const [p, q] of cut([i.x0 + 1, i.x1 - 1], [...wellGapsAlong(i, z, 0.5), ...i.ends.map((e): Span => [e.g - 2.2, e.g + 2.2]), ...hallWells(i).map(approach).filter((a) => z > a[1] - 0.4 && z < a[3] + 0.4).map((a): Span => [a[0], a[2]])])) {
      if (q - p < 1) continue;
      b.deco(OAK_DK, p, top - 0.16, z - 0.3, q, top - 0.1, z + 0.3);
      b.deco('light', p + 0.1, top - 0.17, z - 0.22, q - 0.1, top - 0.16, z + 0.22);
    }
  }
}

// ── Wisteria mosaic ──────────────────────────────────────────────────────────────────────────

const T = 0.1, MC = 32, MR = 16;
/** Racemes of wisteria hanging from a trellis beam on a pale green ground. */
function wisteriaCell(c: number, r: number): string {
  if (c === 0 || r === 0 || c === MC - 1 || r === MR - 1) return '#6b4a2e';
  const y = MR - r - 0.5;
  if (y < 1.6) return (c % 4) ? '#8a6440' : '#6b4a2e';
  const col = c % 4, k = Math.floor(c / 4), len = 6 + ((k * 5) % 5);
  if (y < 1.6 + len && (col === 1 || col === 2) && !(col === 2 && y > len)) return (r + k) % 3 ? '#9b7fc4' : '#7a5fa8';
  if (y < 3 && col === 0) return '#5a8a3a';
  return '#dfe8d4';
}

function endMosaic(i: ConcInfo, x: number, n: 1 | -1, z: number) {
  const { b, cf } = i, y0 = cf + 1.3, z0 = z - (MC * T) / 2;
  const xf = x + n * 0.005, xb = x + n * 0.03;
  for (let r = 0; r < MR; r++) {
    let c = 0;
    while (c < MC) {
      const col = wisteriaCell(c, r);
      let e = c + 1;
      while (e < MC && wisteriaCell(e, r) === col) e++;
      b.deco(`mosaic:${col}`, Math.min(xf, xb), y0 + r * T, z0 + c * T, Math.max(xf, xb), y0 + (r + 1) * T, z0 + e * T);
      c = e;
    }
  }
}

// ── Planters ─────────────────────────────────────────────────────────────────────────────────

/** A timber planter box of shrubs, 1.6 × 0.6, centred on (x, z). */
function planter(i: ConcInfo, x: number, z: number): boolean {
  if (!i.free(x - 0.85, z - 0.35, x + 0.85, z + 0.35)) return false;
  i.claim(x - 0.85, z - 0.35, x + 0.85, z + 0.35);
  const { b, cf } = i;
  b.box(OAK, x - 0.8, cf, z - 0.3, x + 0.8, cf + 0.5, z + 0.3, true);
  b.deco('flat:#4a3a2a', x - 0.74, cf + 0.5, z - 0.24, x + 0.74, cf + 0.52, z + 0.24);
  for (let k = 0; k < 4; k++) b.mesh(k % 2 ? 'flat:#3f7a4a' : 'flat:#5a8a3a', 'sphere', x - 0.55 + k * 0.37, cf + 0.72, z + (k % 2 ? 0.05 : -0.05), 0.42, 0.46, 0.4);
  return true;
}

// ── Pavilions ────────────────────────────────────────────────────────────────────────────────

/** A glass panel between z0 and z1 at x, or along x at z (solid), with timber mullions every 1.5 m. */
function glassRun(e: ExitInfo, axis: 'x' | 'z', at: number, a: number, c: number, h: number) {
  const { b, gy } = e;
  if (c - a < 0.1) return;
  if (axis === 'x') {
    b.box('glass', a, gy, at - 0.03, c, gy + h, at + 0.03, true);
    for (let u = a; u <= c + 0.01; u += Math.max(0.5, (c - a) / Math.max(1, Math.round((c - a) / 1.5)))) b.deco(OAK_DK, u - 0.04, gy, at - 0.05, u + 0.04, gy + h, at + 0.05);
    b.deco(OAK_DK, a, gy, at - 0.05, c, gy + 0.25, at + 0.05);
  } else {
    b.box('glass', at - 0.03, gy, a, at + 0.03, gy + h, c, true);
    for (let u = a; u <= c + 0.01; u += Math.max(0.5, (c - a) / Math.max(1, Math.round((c - a) / 1.5)))) b.deco(OAK_DK, at - 0.05, gy, u - 0.04, at + 0.05, gy + h, u + 0.04);
    b.deco(OAK_DK, at - 0.05, gy, a, at + 0.05, gy + 0.25, c);
  }
}

/** The copper roof over x0 … x1, z0 … z1 at height h: timber fascia, eaves, a glazed clerestory down the middle. */
function roof(e: ExitInfo, x0: number, x1: number, z0: number, z1: number, h: number) {
  const { b, gy } = e, zm = (z0 + z1) / 2;
  b.deco(OAK_DK, x0, gy + h - 0.2, z0, x1, gy + h, z1);
  b.deco(COPPER, x0 - 0.5, gy + h, z0 - 0.6, x1 + 0.5, gy + h + 0.12, z1 + 0.6);
  b.deco('flat:#4a7565', x0 - 0.55, gy + h - 0.06, z0 - 0.65, x1 + 0.55, gy + h, z1 + 0.65);
  b.deco('glass', x0 + 0.4, gy + h + 0.12, zm - 1.0, x1 - 0.4, gy + h + 0.55, zm + 1.0);
  for (let x = x0 + 0.4; x <= x1 - 0.39; x += 1.2) b.deco(OAK_DK, x - 0.03, gy + h + 0.12, zm - 1.02, x + 0.03, gy + h + 0.55, zm + 1.02);
  b.deco(COPPER, x0 + 0.2, gy + h + 0.55, zm - 1.3, x1 - 0.2, gy + h + 0.64, zm + 1.3);
  // Lights: a glowing strip in the clerestory, opal pendants down the middle.
  b.deco(GLOW, x0 + 0.4, gy + h - 0.22, zm - 0.12, x1 - 0.4, gy + h - 0.2, zm + 0.12);
  b.deco(GLOW, x0 + 0.45, gy + h + 0.5, zm - 0.95, x1 - 0.45, gy + h + 0.52, zm + 0.95);
  for (let x = x0 + 1.2; x < x1 - 0.8; x += 2.2) {
    b.deco(IRON, x - 0.01, gy + h - 0.6, zm - 0.01, x + 0.01, gy + h - 0.2, zm + 0.01);
    b.mesh(GLOW, 'sphere', x, gy + h - 0.72, zm, 0.34, 0.3, 0.34);
  }
}

/** Exit 1: the big pavilion, with a vestibule, the coffee counter, benches and a lift. */
function bigPavilion(e: ExitInfo) {
  const { b, gy, run, ext } = e;
  const Z0 = ext + 0.35, Z1 = ext + 4.85, xs = -0.6, xe = run + 6, H = 3.0, d0 = run + 2, d1 = run + 4;
  // Glass round the stair, and the vestibule's sides with a doorway in each, the far end open.
  glassRun(e, 'z', xs, Z0, Z1, H - 0.2);
  for (const z of [Z0, Z1]) {
    glassRun(e, 'x', z, xs, d0, H - 0.2);
    glassRun(e, 'x', z, d1, xe - 0.3, H - 0.2);
  }
  for (const x of [xs, d0, d1, xe]) for (const z of [Z0, Z1]) b.box(OAK_DK, x - 0.12, gy, z - 0.12, x + 0.12, gy + H, z + 0.12, true);
  b.deco('floor:#cfc8b8', run, gy, Z0, xe, gy + 0.02, Z1);
  roof(e, xs - 0.1, xe + 0.1, Z0 - 0.1, Z1 + 0.1, H);
  b.sign({ k: 'label', text: '地下鉄 緑坂駅', sub: 'Midorizaka Station', fg: '#fff', bg: '#3f6b3a' }, xe + 0.62, gy + H + 0.06, (Z0 + Z1) / 2, [1, 0], 3.2, 0.5);
  b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
  // Midori-no-Mado: a counter on the far side, its machine, a hanging board, stools.
  const cx0 = run + 4.3, cx1 = xe - 0.4, c0 = Z1 - 0.7, c1 = Z1 - 0.15;
  b.box(OAK, cx0, gy, c0, cx1, gy + 1.0, c1, true);
  b.deco(OAK_DK, cx0 - 0.04, gy + 1.0, c0 - 0.06, cx1 + 0.04, gy + 1.05, c1);
  b.deco('metal:#b9bdc2', cx0 + 0.15, gy + 1.05, c0 + 0.1, cx0 + 0.6, gy + 1.45, c1 - 0.05);
  for (let k = 0; k < 3; k++) b.mesh('flat:#f4f1e6', 'cyl', cx0 + 0.85 + k * 0.18, gy + 1.1, c0 + 0.2, 0.08, 0.1, 0.08);
  b.deco(IRON, (cx0 + cx1) / 2 - 0.4, gy + 2.3, c0 + 0.2, (cx0 + cx1) / 2 + 0.4, gy + 2.8, c0 + 0.22);
  b.sign({ k: 'shop', ja: '喫茶 緑の窓', en: 'Midori-no-Mado Coffee', bg: '#3f6b3a', fg: '#f4efe2' }, (cx0 + cx1) / 2, gy + 2.5, c0 + 0.19, [0, -1], 1.5, 0.4);
  for (let k = 0; k < 2; k++) {
    const x = cx0 + 0.35 + k * 0.6;
    b.mesh('flat:#3f6b3a', 'cyl', x, gy + 0.7, c0 - 0.4, 0.34, 0.06, 0.34);
    b.mesh('metal:#9da2a8', 'cyl', x, gy + 0.35, c0 - 0.4, 0.05, 0.7, 0.05);
  }
  // A bench on the near side.
  b.box(OAK, run + 4.3, gy + 0.4, Z0 + 0.12, xe - 0.4, gy + 0.46, Z0 + 0.55, true);
  for (const x of [run + 4.4, xe - 0.5]) b.deco(IRON, x - 0.03, gy, Z0 + 0.15, x + 0.03, gy + 0.4, Z0 + 0.52);
  // The lift beside the stair head: a glass shaft in a steel frame, doors to the vestibule, a call button.
  const lx0 = run + 0.3, lx1 = run + 1.7, lz0 = Z0 + 0.06, lz1 = ext + 1.15;
  b.box('glassTint', lx0, gy, lz0, lx1, gy + H - 0.2, lz1, true);
  for (const x of [lx0, lx1]) for (const z of [lz0, lz1]) b.deco('metal:#9da2a8', x - 0.04, gy, z - 0.04, x + 0.04, gy + H - 0.2, z + 0.04);
  b.deco('metal:#b9bdc2', lx0 + 0.3, gy, lz1 - 0.01, lx1 - 0.3, gy + 2.1, lz1 + 0.01);
  b.deco('metal:#7f858b', (lx0 + lx1) / 2 - 0.01, gy, lz1 + 0.01, (lx0 + lx1) / 2 + 0.01, gy + 2.1, lz1 + 0.015);
  b.deco('flat:#2b2d30', lx1 - 0.2, gy + 1.0, lz1 + 0.01, lx1 - 0.08, gy + 1.25, lz1 + 0.02);
  b.sign({ k: 'label', text: 'エレベーター', sub: 'Lift', fg: '#fff', bg: '#2b5f9e' }, (lx0 + lx1) / 2, gy + 2.35, lz1 + 0.02, [0, 1], 1.0, 0.3);
}

/** Exit 2: a small glazed pavilion round the stair, a wisteria pergola out over the pavement. */
function smallPavilion(e: ExitInfo) {
  const { b, gy, run, ext } = e;
  const Z0 = ext + 0.55, Z1 = ext + 4.65, xs = -0.5, H = 2.8, xp = run + 4;
  glassRun(e, 'z', xs, Z0, Z1, H - 0.2);
  for (const z of [Z0, Z1]) glassRun(e, 'x', z, xs, run, H - 0.2);
  for (const x of [xs, run]) for (const z of [Z0, Z1]) b.box(OAK_DK, x - 0.11, gy, z - 0.11, x + 0.11, gy + H, z + 0.11, true);
  roof(e, xs - 0.1, run + 0.1, Z0 - 0.1, Z1 + 0.1, H);
  b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
  // The pergola: four posts, beams, slats, wisteria hanging; a bench under it.
  for (const x of [run + 1.8, xp]) for (const z of [Z0, Z1]) b.box(OAK_DK, x - 0.09, gy, z - 0.09, x + 0.09, gy + 2.7, z + 0.09, true);
  for (const z of [Z0, Z1]) b.deco(OAK_DK, run, gy + 2.6, z - 0.07, xp + 0.4, gy + 2.75, z + 0.07);
  for (let x = run + 0.3; x <= xp + 0.3; x += 0.4) b.deco(OAK, x - 0.03, gy + 2.75, Z0 - 0.2, x + 0.03, gy + 2.84, Z1 + 0.2);
  let k = 0;
  for (let x = run + 0.4; x < xp + 0.2; x += 0.33, k++) {
    const z = Z0 + 0.3 + ((k * 0.61) % (Z1 - Z0 - 0.6)), ln = 0.35 + (k % 4) * 0.1;
    for (let j = 0; j < 3; j++) b.mesh(j % 2 ? 'flat:#9b7fc4' : 'flat:#7a5fa8', 'sphere', x, gy + 2.66 - j * ln / 3, z, 0.2 - j * 0.04, 0.22, 0.2 - j * 0.04);
  }
  b.box(OAK, xp - 1.6, gy + 0.4, Z1 - 0.55, xp - 0.2, gy + 0.46, Z1 - 0.12, true);
  b.sign({ k: 'label', text: '地下鉄 緑坂駅', sub: 'Midorizaka Station', fg: '#fff', bg: '#3f6b3a' }, run + 0.62, gy + H + 0.06, (Z0 + Z1) / 2, [1, 0], 3.0, 0.48);
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: 'paint:#f1ede2', floor: 'terrazzo:#d6d0c2', pillar: GREEN_TILE, ceil: 'paint:#efe8d8' },
  posters: false,
  skirting: false,

  lights: ceiling,

  pillar(i, x, z, y0, y1) {
    const { b } = i, h = 0.32;
    b.deco(GREEN_TILE, x - h, y0, z - h, x + h, y1, z + h);
    if (y0 < i.cf - 0.5) return;
    b.deco(OAK_DK, x - h - 0.02, y0, z - h - 0.02, x + h + 0.02, y0 + 0.12, z + h + 0.02);
    for (const y of [y0 + 1.2, y0 + 2.3]) b.deco(OAK, x - h - 0.015, y, z - h - 0.015, x + h + 0.015, y + 0.08, z + h + 0.015);
  },

  concourse(i) {
    for (const s of [-1, 1] as const) wallDado(i, s, DADO);
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) endDado(i, x, DADO);
    // Wisteria mosaics on the end walls where there is room for them.
    for (const [x, n] of [[i.x0, 1], [i.x1, -1]] as [number, 1 | -1][]) {
      for (const z of [-i.cw / 2, i.cw / 2]) {
        const r: [number, number, number, number] = [Math.min(x, x + n * 0.4), z - 1.7, Math.max(x, x + n * 0.4), z + 1.7];
        if (!i.free(...r, 0)) continue;
        i.claim(...r);
        endMosaic(i, x, n, z);
      }
    }
    // The flower stall and the bakery counter on the walls of the paid area.
    const lo = i.paid[0] + 0.5, hi = i.paid[1] - 0.5;
    let placed = 0;
    for (const [s, brand, front, w] of [[1, FLOWERS, 'stall', 3.2], [-1, BAKERY, 'counter', 3.6]] as const) {
      for (let x = lo; x + w <= hi; x += 0.5) {
        if (shopFront(i, { s, x0: x, x1: x + w, brand, front, depth: 1.1, awning: '#3f6b3a', body: OAK })) {
          placed++;
          break;
        }
      }
    }
    void placed;
    // Benches by the pillars, a planter of shrubs beside each.
    for (const [px, pz] of i.pillars) {
      if (bench(i, px + 2.2, pz, { axis: 'x', len: 1.8, color: '#a07a52' })) planter(i, px + 4.3, pz);
    }
    void band;
  },

  bay(r) {
    for (const f of r.faces) faceDado({ b: r.b, cf: r.cf }, f, DADO);
  },

  exit(e) {
    exitDado(e, { mat: GREEN_TILE, top: 1.2, cap: OAK, steps: Math.max(4, Math.round(e.run / 2)) });
    exitHandrails(e);
    const { b, cf, ext } = e, L = ext + 4;
    b.deco(OAK, -4, cf + 2.36, 0, -3.988, cf + 2.42, L);
    b.deco(OAK, -4, cf + 2.36, L - 0.012, 0, cf + 2.42, L);
    // The kit's sign at the stair foot sits up in the soffit: one hung lower, under it.
    b.deco(IRON, -0.42, cf + 2.62, ext + 2.0, -0.4, cf + 2.75, ext + 2.02);
    b.deco(IRON, -0.42, cf + 2.62, ext + 3.2, -0.4, cf + 2.75, ext + 3.22);
    b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num: e.num, arrow: 'up' }, -0.45, cf + 2.4, ext + 2.6, [-1, 0], 2.3, 0.42);
    b.deco(GLOW, -2.6, cf + 2.5, ext + 1.8, -1.4, cf + 2.52, ext + 2.2);
  },

  canopy(e) {
    if ((Number(e.num) || 1) % 2 === 0) smallPavilion(e);
    else bigPavilion(e);
  },

  passage(p) {
    passageDado(p, { mat: GREEN_TILE, top: 1.2, cap: OAK });
    passageRails(p);
  },
};
