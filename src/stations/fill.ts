// Filling a ticket hall (entry-specs.ts `fill`): shops, a kiosk, islands, benches, a waiting
// room, and the station's own local feature (a display case or a photo gallery), placed where
// the kit and the look have left room. Each item goes in the paid area unless it says 'unpaid'.
// Items are placed in the first hall that has room for them (Ikarimachi has two halls).

import { SHOPS, benchIsland, kiosk, placeAlong, shopFront, shopIsland, vendingIsland, waitingRoom, type Wall } from './looks/parts';
import type { ConcInfo } from './looks/types';
import type { DisplayTheme, FillItem } from './entry-specs';
import { LINES } from '../data/network';

type Rect = [number, number, number, number];

/** Which fill items each station got placed (by index), for the test. */
export const FILL_PLACED = new Map<string, Set<number>>();
/** Where each placed item went (station frame, its hall's floor), for checking by eye (dev/look.ts). */
export const FILL_SPOTS = new Map<string, { k: string; x: number; z: number; cf: number }[]>();
let lastSpot: Rect | null = null;

export function fillHall(i: ConcInfo, items: FillItem[]) {
  const id = i.station.id;
  const done = FILL_PLACED.get(id) ?? new Set<number>();
  FILL_PLACED.set(id, done);
  items.forEach((it, k) => {
    if (done.has(k)) return;
    lastSpot = null;
    if (place(i, it)) {
      done.add(k);
      const r = lastSpot as Rect | null;
      if (r) FILL_SPOTS.set(id, [...(FILL_SPOTS.get(id) ?? []), { k: it.k, x: (r[0] + r[2]) / 2, z: (r[1] + r[3]) / 2, cf: i.cf }]);
    }
  });
}

/** x-ranges of the paid area, or of every unpaid hall, kept off the gate lines and end walls. */
function ranges(i: ConcInfo, where: 'paid' | 'unpaid' = 'paid'): [number, number][] {
  if (where === 'paid') return [[i.paid[0] + 4.2, i.paid[1] - 4.2]].filter(([a, b]) => b - a > 2) as [number, number][];
  return i.ends.map((e): [number, number] => (e.hi ? [e.g + 4, e.g + 14.4] : [e.g - 14.4, e.g - 4]));
}

/**
 * First free spot for a w × d item (either way round) in the ranges: from the middle of each
 * range outwards, and from the hall's centre line out towards the walls, in 0.5 m steps.
 */
function spot(i: ConcInfo, w: number, d: number, rs: [number, number][], margin = 1.2): Rect | null {
  const zs: number[] = [];
  for (let z = 0; z <= i.cw; z += 0.5) zs.push(...(z === 0 ? [0] : [z, -z]));
  for (const [a, b] of rs) {
    const mid = (a + b) / 2;
    for (let s = 0; s <= (b - a) / 2; s += 0.5) {
      for (const x of s === 0 ? [mid] : [mid - s, mid + s]) {
        for (const [dx, dz] of [[w, d], [d, w]]) {
          const x0 = x - dx / 2, x1 = x + dx / 2;
          if (x0 < a || x1 > b) continue;
          for (const z of zs) {
            const r: Rect = [x0, z - dz / 2, x1, z + dz / 2];
            if (r[1] > -i.cw && r[3] < i.cw && i.free(...r, margin)) return (lastSpot = r);
          }
        }
      }
    }
  }
  return null;
}

function place(i: ConcInfo, it: FillItem): boolean {
  const rs = ranges(i, it.in);
  switch (it.k) {
    case 'shop': {
      const w = it.w ?? 4.8, depth = it.front === 'glazed' || !it.front ? 0.3 : 1.4;
      if (placeAlong(i, w, (s: Wall, x0: number) =>
        shopFront(i, { s, x0, x1: x0 + w, brand: SHOPS[it.brand], front: it.front ?? 'glazed', depth, awning: it.awning }), rs)) return true;
      // No wall free: a little free-standing stand of the same shop, served from both sides.
      const r = spot(i, Math.max(w, 3.6), 2.4, rs, 1.0);
      return !!r && shopIsland(i, ...r, { lo: [SHOPS[it.brand]], hi: [SHOPS[it.brand]], front: it.front === 'glazed' ? 'glazed' : 'counter', height: 2.6, margin: 1.0 });
    }
    case 'kiosk': {
      const r = spot(i, 3, 1.6, rs, 1.5);
      return !!r && kiosk(i, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, { brand: SHOPS[it.brand] });
    }
    case 'island': {
      const r = spot(i, 6, 2.4, rs, 1.0);
      return !!r && shopIsland(i, ...r, { lo: it.lo.map((k) => SHOPS[k]), hi: it.hi.map((k) => SHOPS[k]), front: 'counter', bulkhead: true, margin: 1.0 });
    }
    case 'benches': {
      const r = spot(i, 6, 1.8, rs, 1.0);
      return !!r && benchIsland(i, ...r, { color: i.style.accent, tree: true, margin: 1.0 });
    }
    case 'vending': {
      const r = spot(i, 3 * 1.05 + 0.8, 1.52, rs, 1.0);
      return !!r && vendingIsland(i, ...r, { n: 3, margin: 1.0 });
    }
    case 'waiting': {
      const r = spot(i, 6, 3, rs, 1.0);
      return !!r && waitingRoom(i, ...r, { margin: 1.0 });
    }
    case 'display': {
      const r = spot(i, 2.6, 1.3, rs, 1.4);
      if (!r) return false;
      i.claim(r[0] - 0.8, r[1] - 0.8, r[2] + 0.8, r[3] + 0.8);
      displayCase(i, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, it.theme, it.ja, it.en);
      return true;
    }
    case 'gallery': {
      const r = spot(i, 7.6, 0.5, rs, 1.4);
      if (!r) return false;
      i.claim(r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1);
      gallery(i, r, it.theme, it.ja, it.en);
      return true;
    }
  }
}

// ── The local feature ──

/** A glass display case on a dark plinth, 2.4 × 1.1, with a model inside and a label both sides. */
function displayCase(i: ConcInfo, x: number, z: number, theme: DisplayTheme, ja: string, en: string) {
  const { b, cf } = i, hw = 1.2, hd = 0.55, top = cf + 0.9;
  b.box('flat:#2b2e33', x - hw, cf, z - hd, x + hw, top, z + hd);
  b.deco('metal:#b08a3a', x - hw - 0.02, top - 0.04, z - hd - 0.02, x + hw + 0.02, top, z + hd + 0.02);
  // Glass on four sides and the lid, slim bronze corners.
  b.deco('glass', x - hw, top, z - hd, x + hw, top + 0.85, z - hd + 0.02);
  b.deco('glass', x - hw, top, z + hd - 0.02, x + hw, top + 0.85, z + hd);
  b.deco('glass', x - hw, top, z - hd, x - hw + 0.02, top + 0.85, z + hd);
  b.deco('glass', x + hw - 0.02, top, z - hd, x + hw, top + 0.85, z + hd);
  b.deco('glass', x - hw, top + 0.85, z - hd, x + hw, top + 0.87, z + hd);
  for (const [cx, cz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    b.deco('metal:#b08a3a', x + cx * hw - 0.02, top, z + cz * hd - 0.02, x + cx * hw + 0.02, top + 0.87, z + cz * hd + 0.02);
  }
  model(i, x, top, z, theme);
  for (const s of [-1, 1] as const) {
    b.sign({ k: 'label', text: ja, sub: en, fg: '#f4f1e6', bg: '#2b2e33' }, x, cf + 0.55, z + s * (hd + 0.01), [0, s], 2.0, 0.36);
  }
}

/** The model inside a display case, on its floor at y, centred on (x, z): about 2 × 0.9 × 0.8. */
function model(i: ConcInfo, x: number, y: number, z: number, theme: DisplayTheme) {
  const { b } = i;
  const m = (mat: string, shape: 'cyl' | 'sphere' | 'cone', dx: number, dy: number, dz: number, sx: number, sy: number, sz: number) =>
    b.mesh(mat, shape, x + dx, y + dy, z + dz, sx, sy, sz);
  const d = (mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.deco(mat, x + x0, y + y0, z + z0, x + x1, y + y1, z + z1);
  switch (theme) {
    case 'lens': {
      // A first-order lighthouse lens: brass rings of prisms round a lamp.
      d('flat:#3a3f45', -0.35, 0, -0.35, 0.35, 0.08, 0.35);
      for (let k = 0; k < 7; k++) {
        const dia = 0.62 - Math.abs(k - 3) * 0.07;
        m('glassTint', 'cyl', 0, 0.16 + k * 0.08, 0, dia, 0.07, dia);
        m('metal:#b08a3a', 'cyl', 0, 0.2 + k * 0.08, 0, dia + 0.02, 0.012, dia + 0.02);
      }
      m('light', 'sphere', 0, 0.4, 0, 0.16, 0.16, 0.16);
      m('metal:#b08a3a', 'cone', 0, 0.78, 0, 0.5, 0.12, 0.5);
      break;
    }
    case 'anchor': {
      // A ship's anchor laid on a timber cradle, a coil of hawser beside it.
      d('wood:#7a5233', -0.9, 0, -0.25, 0.4, 0.06, 0.25);
      d('metal:#2b2e33', -0.85, 0.06, -0.04, 0.3, 0.14, 0.04); // shank
      d('metal:#2b2e33', 0.22, 0.06, -0.38, 0.3, 0.14, 0.38); // crown arms
      d('metal:#2b2e33', 0.1, 0.06, -0.4, 0.3, 0.1, -0.32);
      d('metal:#2b2e33', 0.1, 0.06, 0.32, 0.3, 0.1, 0.4);
      d('wood:#5a3a22', -0.8, 0.06, -0.3, -0.72, 0.12, 0.3); // stock
      m('metal:#2b2e33', 'cyl', -0.92, 0.1, 0, 0.12, 0.08, 0.12); // ring
      for (let k = 0; k < 3; k++) m('flat:#c2a36b', 'cyl', 0.65, 0.04 + k * 0.05, 0, 0.42 - k * 0.04, 0.045, 0.42 - k * 0.04);
      break;
    }
    case 'firefly': {
      // A night stream bank: dark water, reeds, fireflies glowing among them.
      d('flat:#1f3a32', -1.1, 0, -0.5, 1.1, 0.04, 0.5);
      d('water', -1.1, 0.04, -0.12, 1.1, 0.05, 0.12);
      const r = i.rand;
      for (let k = 0; k < 26; k++) {
        const rx = -1 + 2 * ((k * 0.37) % 1), rz = (k % 2 ? 1 : -1) * (0.18 + ((k * 0.53) % 1) * 0.28);
        d('flat:#6f9a3e', rx - 0.018, 0.04, rz - 0.018, rx + 0.018, 0.3 + ((k * 0.71) % 1) * 0.4, rz + 0.018);
      }
      for (let k = 0; k < 24; k++) m('glow:#e4f27a', 'sphere', -0.95 + 1.9 * r(), 0.25 + 0.45 * r(), -0.4 + 0.8 * r(), 0.07, 0.07, 0.07);
      break;
    }
    case 'skylark': {
      // A meadow mound, a skylark rising over it on a wire.
      d('flat:#8a9a3e', -1.1, 0, -0.5, 1.1, 0.06, 0.5);
      d('flat:#9cbf4a', -0.7, 0.06, -0.35, 0.7, 0.12, 0.35);
      d('flat:#b8d36a', -0.35, 0.12, -0.2, 0.35, 0.16, 0.2);
      for (let k = 0; k < 9; k++) m('flat:#e8d24a', 'sphere', -0.9 + k * 0.22, 0.09 + (k % 2) * 0.03, (k % 3 - 1) * 0.3, 0.05, 0.05, 0.05);
      d('metal:#9aa0a6', -0.003, 0.16, -0.003, 0.003, 0.6, 0.003);
      m('flat:#8a6a4a', 'sphere', 0, 0.62, 0, 0.12, 0.08, 0.07);
      d('flat:#6b5040', -0.14, 0.62, -0.01, 0.14, 0.63, 0.01);
      break;
    }
    case 'crane': {
      // A quay crane over a container ship.
      d('flat:#33546e', -1.1, 0, 0.05, 1.1, 0.12, 0.5);
      for (let k = 0; k < 5; k++) d(`flat:${['#c8401e', '#2f6f73', '#e2b100', '#5c6b78', '#c8401e'][k]}`, -0.9 + k * 0.32, 0.12, 0.15, -0.65 + k * 0.32, 0.22, 0.4);
      d('flat:#9a9a94', -1.1, 0, -0.5, 1.1, 0.04, 0.05);
      for (const lx of [-0.25, 0.25]) for (const lz of [-0.35, -0.05]) d('paint:#d9482b', lx - 0.02, 0.04, lz - 0.02, lx + 0.02, 0.6, lz + 0.02);
      d('paint:#d9482b', -0.3, 0.6, -0.4, 0.3, 0.66, 0);
      d('paint:#d9482b', -0.03, 0.62, -0.45, 0.03, 0.66, 0.5);
      break;
    }
    case 'blossom': {
      // A spring hillside: cherry trees in bloom over a rapeseed field.
      d('flat:#9cbf4a', -1.1, 0, -0.5, 1.1, 0.06, 0.5);
      d('flat:#e8d24a', -1.1, 0.06, 0.1, 1.1, 0.08, 0.5);
      for (let k = 0; k < 5; k++) {
        const tx = -0.8 + k * 0.4, tz = -0.25 + (k % 2) * 0.12;
        m('wood:#5a3a22', 'cyl', tx, 0.2, tz, 0.04, 0.28, 0.04);
        m('flat:#f2bfcd', 'sphere', tx, 0.42, tz, 0.3, 0.24, 0.3);
      }
      break;
    }
    case 'temple': {
      // The temple wood's gate: a vermilion two-tier gate on a stone step, cedars behind it.
      d('flat:#8a8578', -0.6, 0, -0.25, 0.6, 0.06, 0.25);
      for (const px of [-0.4, 0.4]) d('paint:#b8322a', px - 0.03, 0.06, -0.03, px + 0.03, 0.5, 0.03);
      d('paint:#b8322a', -0.55, 0.42, -0.04, 0.55, 0.46, 0.04);
      d('flat:#2b2e33', -0.62, 0.5, -0.1, 0.62, 0.56, 0.1);
      d('flat:#2b2e33', -0.5, 0.56, -0.07, 0.5, 0.6, 0.07);
      d('flat:#f4f1e6', -0.1, 0.36, 0.04, 0.1, 0.42, 0.045);
      for (let k = 0; k < 6; k++) m('flat:#2f4a3a', 'cone', -0.9 + k * 0.36, 0.3, -0.32 + (k % 2) * 0.05, 0.16, 0.6, 0.16);
      d('flat:#5a6a4a', -1.1, 0, -0.5, 1.1, 0.02, 0.5);
      break;
    }
    case 'slope': {
      // Midorizaka, the green slope: a street climbing a hill under rows of zelkova trees.
      for (let k = 0; k < 6; k++) d('flat:#9c9a92', -1.05 + k * 0.35, 0, -0.18, -0.7 + k * 0.35, 0.05 + k * 0.06, 0.18);
      d('flat:#6f8a3a', -1.1, 0, -0.5, 1.1, 0.03, -0.18);
      d('flat:#6f8a3a', -1.1, 0, 0.18, 1.1, 0.03, 0.5);
      for (let k = 0; k < 5; k++) for (const s of [-1, 1]) {
        const tx = -0.85 + k * 0.42, y0 = 0.05 + k * 0.08;
        m('wood:#5a3a22', 'cyl', tx, y0 + 0.1, s * 0.3, 0.03, 0.2 + k * 0.02, 0.03);
        m('flat:#4f8a3a', 'sphere', tx, y0 + 0.32, s * 0.3, 0.26, 0.22, 0.26);
      }
      break;
    }
    case 'dogwood': {
      // A dogwood street in spring: white and pink bracts over a pavement, a bench.
      d('flat:#c9c4bb', -1.1, 0, -0.5, 1.1, 0.03, 0.5);
      d('flat:#7a9442', -1.1, 0.03, 0.2, 1.1, 0.05, 0.5);
      for (let k = 0; k < 5; k++) {
        const tx = -0.85 + k * 0.42;
        m('wood:#5a3a22', 'cyl', tx, 0.2, 0.32, 0.035, 0.32, 0.035);
        m(k % 2 ? 'flat:#f4c2d0' : 'flat:#f6f3ee', 'sphere', tx, 0.42, 0.32, 0.32, 0.18, 0.32);
      }
      d('wood:#9a7650', -0.4, 0.1, -0.2, 0.4, 0.13, -0.08);
      break;
    }
    case 'canal': {
      // The canal through the old town: a stone-lined channel, flat boats, the arched bridge.
      d('flat:#8a8578', -1.1, 0, -0.5, 1.1, 0.12, -0.2);
      d('flat:#8a8578', -1.1, 0, 0.2, 1.1, 0.12, 0.5);
      d('water', -1.1, 0, -0.2, 1.1, 0.06, 0.2);
      for (const [bx, bz] of [[-0.6, -0.06], [0.45, 0.07]]) {
        d('wood:#7a5233', bx - 0.22, 0.06, bz - 0.05, bx + 0.22, 0.1, bz + 0.05);
        d('flat:#f4f1e6', bx - 0.06, 0.1, bz - 0.03, bx + 0.06, 0.16, bz + 0.03);
      }
      for (let k = 0; k < 5; k++) d('paint:#b8322a', -0.2 + k * 0.08, 0.18 + Math.sin((k / 4) * Math.PI) * 0.08, -0.25, -0.12 + k * 0.08, 0.22 + Math.sin((k / 4) * Math.PI) * 0.08, 0.25);
      for (let k = 0; k < 4; k++) m('flat:#f2bfcd', 'sphere', -0.9 + k * 0.6, 0.32, 0.4, 0.26, 0.2, 0.26);
      break;
    }
    case 'forest': {
      // The landfill becoming a forest by the sea: sea, shore, young and grown trees.
      d('water', -1.1, 0, 0.15, 1.1, 0.03, 0.5);
      d('flat:#d9cfa8', -1.1, 0, 0.05, 1.1, 0.04, 0.15);
      d('flat:#6b8a4a', -1.1, 0, -0.5, 1.1, 0.06, 0.05);
      for (let k = 0; k < 8; k++) {
        const tx = -0.95 + k * 0.27, h = 0.15 + k * 0.06;
        m('flat:#3e5f4a', 'cone', tx, 0.06 + h / 2, -0.25 + (k % 2) * 0.12, 0.12 + k * 0.02, h, 0.12 + k * 0.02);
      }
      break;
    }
  }
}

/**
 * A free-standing exhibition panel (0.3 thick, in rect r, either way round) with four framed
 * photographs on each face, scenes in the theme's colours, and a caption under each row.
 */
function gallery(i: ConcInfo, r: Rect, theme: 'terraces', ja: string, en: string) {
  const { b, cf } = i;
  const along = r[2] - r[0] >= r[3] - r[1];
  // Work in a frame where the panel runs along x from 0 to L, centred on z = 0.
  const L = along ? r[2] - r[0] : r[3] - r[1];
  const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
  b.with({ t: [cx, 0, cz], rot: along ? 0 : 1 }, () => {
    const x0 = -L / 2;
    b.box('panel:#3d3a36', x0, cf, -0.15, x0 + L, cf + 2.5, 0.15);
    b.deco('flat:#2b2e33', x0 - 0.02, cf, -0.17, x0 + L + 0.02, cf + 0.12, 0.17);
    // Four seasons of the terraces: spring water, summer green, autumn gold, winter snow.
    const seasons = theme === 'terraces' ? [['#7fb3d5', '#9cbf4a'], ['#3e7d3a', '#6aa84f'], ['#d9a400', '#b8862b'], ['#f4f4f0', '#c9cfd4']] : [];
    const pw = (L - 0.4) / 4;
    for (const s of [-1, 1] as const) {
      const f0 = s * 0.15, f1 = s * 0.17, g0 = s * 0.17, g1 = s * 0.18;
      const [fa, fb] = f0 < f1 ? [f0, f1] : [f1, f0], [ga, gb] = g0 < g1 ? [g0, g1] : [g1, g0];
      seasons.forEach(([a, c], k) => {
        const p0 = x0 + 0.2 + k * pw + 0.1, p1 = p0 + pw - 0.2;
        b.deco('flat:#f4f1e6', p0, cf + 1.05, fa, p1, cf + 2.25, fb);
        b.deco('flat:#dfeef6', p0 + 0.08, cf + 1.85, ga, p1 - 0.08, cf + 2.17, gb);
        for (let t = 0; t < 4; t++) {
          b.deco(`flat:${t % 2 ? a : c}`, p0 + 0.08 + t * 0.08, cf + 1.13 + t * 0.18, ga, p1 - 0.08, cf + 1.31 + t * 0.18, gb);
        }
      });
      b.sign({ k: 'label', text: ja, sub: en, fg: '#f4f1e6', bg: '#2b2e33' }, 0, cf + 0.7, s * 0.19, [0, s], 3.6, 0.36);
    }
  });
}

// ── Line-colour guide lines on the floor ──

/**
 * A stripe in each line's colour on the paid floor, from every gate line to the head of each of
 * that line's stairs down (or the stair to its transfer), as Tokyo stations paint them: 0.3 m wide,
 * a lane beside the yellow tactile path, one lane per line. Drawn before the hall is filled, and
 * claimed, so shops and displays keep off it. A route with something in its way is left out.
 */
export function floorLines(i: ConcInfo, routes: { line: string; pts: [number, number][] }[] = []) {
  const { b, cf } = i;
  // Routes given by hand (to a transfer tunnel, a stair up, a gallery): drawn as they are.
  for (const r of routes) {
    const color = LINES.find((l) => l.id === r.line)?.color;
    if (!color || !r.pts.length) continue;
    // Only in the hall whose paid area the route starts in (Ikarimachi has two halls).
    if (r.pts[0][0] < i.x0 || r.pts[0][0] > i.x1) continue;
    for (let k = 1; k < r.pts.length; k++) {
      const [ax, az] = r.pts[k - 1], [bx, bz] = r.pts[k];
      const q: [number, number, number, number] = [Math.min(ax, bx) - 0.28, Math.min(az, bz) - 0.28, Math.max(ax, bx) + 0.28, Math.max(az, bz) + 0.28];
      i.claim(...q);
      if (az === bz) band(i, color, Math.min(ax, bx) - 0.22, az, Math.max(ax, bx) + 0.22, 'x');
      else band(i, color, Math.min(az, bz) - 0.22, ax, Math.max(az, bz) + 0.22, 'z');
      marks(i, r.line, ax, az, bx, bz);
    }
    const [ex, ez] = r.pts[r.pts.length - 1];
    b.deco(`paint:${color}`, ex - 0.4, cf + 0.002, ez - 0.4, ex + 0.4, cf + 0.007, ez + 0.4);
  }
  const lines = [...new Set(i.stairs.map((s) => s.line.id))];
  const done = new Set<string>();
  // What stands on the floor (solids and standing decoration, not floor paint), and openings.
  const standing = b.out.boxes.filter((q) => q.mat !== 'none' && q.min[1] < cf + 0.05 && q.max[1] > cf + 0.03);
  const clear = (r: [number, number, number, number], gateX: number) =>
    r[0] >= i.x0 && r[2] <= i.x1 && r[1] >= -i.cw && r[3] <= i.cw
    && !i.holes.some((h) => r[0] < h[2] + 0.3 && r[2] > h[0] - 0.3 && r[1] < h[3] + 0.3 && r[3] > h[1] - 0.3)
    && !standing.some((q) => {
      // The gate machines themselves are crossed through an aisle: only their aisles' walls count.
      if (Math.abs((q.min[0] + q.max[0]) / 2 - gateX) < 1.6 && q.max[2] - q.min[2] < 0.5) return false;
      return r[0] < q.max[0] && r[2] > q.min[0] && r[1] < q.max[2] && r[3] > q.min[2];
    });
  for (const e of i.ends) {
    const o = e.hi ? -1 : 1; // into the paid area
    for (const st of i.stairs) {
      // Where you step onto the stair: just in front of its head.
      const ex = st.top[0] - st.down[0] * 1.2, ez = st.top[1] - st.down[1] * 1.2;
      if (ex < i.paid[0] || ex > i.paid[1]) continue;
      const lane = lines.indexOf(st.line.id), key = `${e.g}:${st.line.id}:${ex.toFixed(1)}:${ez.toFixed(1)}`;
      if (done.has(key)) continue;
      // From just past the gates; where the stair is right behind them, from out in the unpaid
      // hall through a gate aisle.
      let sx = e.g + o * 4;
      if ((ex - sx) * o < 1.5) sx = e.g - o * 8;
      // A lane clear of the tactile path, nearest first on the side away from the nearer long
      // wall, one lane further out per line; a band, under 0.6 m wide, in a clear strip.
      const side = ez > 0 ? -1 : 1;
      let r: [number, number, number, number] | null = null;
      for (const off of [1.3, 1.9, 2.5, 3.1, 3.7, 4.3, 0.7]) {
        for (const s2 of [side, -side]) {
          const z = ez + s2 * (off + lane * 0.6);
          const q: [number, number, number, number] = [Math.min(sx, ex), z - 0.28, Math.max(sx, ex), z + 0.28];
          if (q[2] - q[0] >= 1 && clear(q, e.g)) {
            r = q;
            break;
          }
        }
        if (r) break;
      }
      if (!r) continue;
      done.add(key);
      i.claim(...r);
      band(i, st.line.color, r[0], (r[1] + r[3]) / 2, r[2], 'x');
      const zc = (r[1] + r[3]) / 2;
      marks(i, st.line.id, sx, zc, ex, zc, st.platforms);
      // A square pad in the line colour where the line meets the stair.
      b.deco(`paint:${st.line.color}`, ex - 0.4, cf + 0.002, zc - 0.4, ex + 0.4, cf + 0.007, zc + 0.4);
    }
  }
}

/**
 * A 0.44 m band of line colour edged in charcoal (so a yellow line never passes for tactile
 * paving), from a to c along `axis`, centred on `at` across it.
 */
function band(i: ConcInfo, color: string, a: number, at: number, c: number, axis: 'x' | 'z') {
  const { b, cf } = i;
  const d = (m: string, w0: number, w1: number, y1: number) =>
    axis === 'x' ? b.deco(m, a, cf + 0.002, at + w0, c, cf + y1, at + w1) : b.deco(m, at + w0, cf + 0.002, a, at + w1, cf + y1, c);
  d('flat:#2b2e33', -0.3, 0.3, 0.004);
  d(`paint:${color}`, -0.22, 0.22, 0.006);
}

/**
 * Floor marks along a band from (ax, az) to (bx, bz): the line's badge with an arrow towards the
 * far end (and the platform numbers, if given), every 5 m, as the floor guidance draws them.
 */
function marks(i: ConcInfo, line: string, ax: number, az: number, bx: number, bz: number, nums?: number[]) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 2.5) return;
  const ux = (bx - ax) / len, uz = (bz - az) / len;
  for (let t = 1.6; t < len - 1.2; t += 5) {
    i.b.sign({ k: 'floormark', line: line as never, arrow: 'up', ...(nums?.length ? { nums: [...nums].sort((p, q) => p - q) } : {}) },
      ax + ux * t, i.cf + 0.013, az + uz * t, null, 0.8, 0.8, { top: [ux, uz] });
  }
}
