// Station look: Kamomehama (鴎浜), the stadium station for Kawaminato Dome. See
// Plans/features/station-looks/plan.md.
//
// Built to move match-day crowds and dressed for it: sea-grey enamel, a hard dark floor with
// painted queue lanes and crowd barriers in the unpaid halls, deep teal beams and strong white
// line lights, rows of pennants in the colours of the home club, and a relief of the dome on the
// paid area's long wall. The club is the Kawaminato Gulls (川湊ガルズ), gull orange and navy.

import type { Builder } from '../../world/builder';
import {
  band, bench, conbini, cut, exitDado, exitHandrails, faceDado, fbox, fpt, kioskStall, lockers, placeAlong, roundPillar,
  shopFront, SHOPS, stairwellFaces, toiletX, wallBand, wallDado, wbox,
  type Brand, type Span, type Wall,
} from './parts';
import type { ConcInfo, Rect, Stairwell, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const TEAL = '#0f7a8a';
const TEAL_DARK = '#0b5d69';
/** The Gulls' colours: gull-beak orange and night navy. */
const ORANGE = '#f47a20';
const NAVY = '#14284b';
const WHITE = '#f6f7f5';
const SEA = 'panel:#c3cfd5';
const STEEL = 'metal:#9aa3a9';

const TEAM = { ja: '川湊ガルズ', en: 'Kawaminato Gulls' };
const GULLS_SHOP: Brand = { ja: 'ガルズ オフィシャルショップ', en: 'Gulls Official Shop', bg: ORANGE, fg: '#fff', kind: 'goods' };
const KAMOMETEI: Brand = { ja: 'スタジアムめし かもめ亭', en: 'Kamome-tei Stadium Food', bg: NAVY, fg: '#fff', kind: 'bento' };

// ── Small shapes ─────────────────────────────────────────────────────────────────────────────

/**
 * A gull in flight, wings up then tips down, as five boxes in a wall plane. `put` draws one box
 * from u0 to u1 along the wall and y0 to y1; `c` is its centre along the wall, `y` its bottom.
 */
function gull(put: (u0: number, u1: number, y0: number, y1: number) => void, c: number, y: number, k = 1) {
  put(c - 0.06 * k, c + 0.06 * k, y, y + 0.05 * k);
  for (const s of [-1, 1]) {
    const a = c + s * 0.06 * k, m = c + s * 0.22 * k, t = c + s * 0.4 * k;
    put(Math.min(a, m), Math.max(a, m), y + 0.04 * k, y + 0.09 * k);
    put(Math.min(m, t), Math.max(m, t), y + 0.015 * k, y + 0.06 * k);
  }
}

// ── Concourse: the dome wall ─────────────────────────────────────────────────────────────────

/** Half length of the dome wall composition along the wall (backdrop, masts and banners). */
const DOME_HALF = 7.3;

/** Where the dome wall goes: midway between two pillars near the middle of the paid area, on the wall without the toilets first. */
function domeSpot(i: ConcInfo): { s: Wall; xc: number } | null {
  const mid = (i.paid[0] + i.paid[1]) / 2;
  for (const s of [1, -1] as Wall[]) {
    const xs = i.pillars.filter(([, z]) => Math.sign(z) === s).map(([x]) => x).sort((p, q) => p - q);
    // Pillar midpoints nearest the middle first (the pillars then frame the dome), the middle last.
    const cands: number[] = [];
    for (let k = 0; k + 1 < xs.length; k++) if (Math.abs(xs[k + 1] - xs[k] - 8) < 0.01) cands.push(xs[k] + 4);
    cands.sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid));
    for (const xc of [...cands, mid]) {
      const [za, zb] = band(i, s, 0, 1.2);
      if (xc - DOME_HALF < i.paid[0] + 3.8 || xc + DOME_HALF > i.paid[1] - 3.8) continue;
      if (!i.free(xc - DOME_HALF, za, xc + DOME_HALF, zb)) continue;
      i.claim(xc - DOME_HALF, za, xc + DOME_HALF, zb);
      return { s, xc };
    }
  }
  return null;
}

/**
 * The centrepiece on a long wall: a teal panel with the dome in white relief (stepped half
 * dome on the stands' outer wall), the stadium's name on the stands, two floodlight masts, gulls
 * over the roof and the Gulls' tall banners either side. Decoration only.
 */
function domeWall(i: ConcInfo, s: Wall, xc: number) {
  const { b, cf } = i;
  // Backdrop, kept under the beams (cf + 2.6).
  wbox(i, s, `paint:${TEAL}`, xc - 5.4, xc + 5.4, cf + 0.3, cf + 2.58, 0, 0.02);
  wbox(i, s, `paint:${TEAL_DARK}`, xc - 5.4, xc + 5.4, cf + 0.3, cf + 0.36, 0.02, 0.026);
  // The stands' outer wall, with the name on it.
  wbox(i, s, `flat:${WHITE}`, xc - 4.6, xc + 4.6, cf + 0.55, cf + 0.98, 0.02, 0.16);
  // Navy panels at the stands' ends, either side of the name.
  wbox(i, s, `paint:${NAVY}`, xc - 4.5, xc - 3.9, cf + 0.62, cf + 0.92, 0.16, 0.166);
  wbox(i, s, `paint:${NAVY}`, xc + 3.9, xc + 4.5, cf + 0.62, cf + 0.92, 0.16, 0.166);
  b.sign({ k: 'label', text: '川湊ドーム', sub: 'Kawaminato Dome', fg: '#ffffff', bg: NAVY }, xc, cf + 0.765, s * (i.cw - 0.168), [0, -s], 3.6, 0.36);
  // The dome: seven steps of a half ellipse, standing further out at the bottom.
  const R = 4.3, n = 7, y0 = cf + 0.98, h = 0.206;
  const widths: number[] = [];
  for (let k = 0; k < n; k++) {
    const hw = R * Math.sqrt(1 - ((k + 0.5) / n) ** 2);
    widths.push(hw);
    const d1 = 0.16 - k * 0.012;
    wbox(i, s, k % 2 ? 'flat:#dfe9ec' : `flat:${WHITE}`, xc - hw, xc + hw, y0 + k * h, y0 + (k + 1) * h, 0.02, d1);
    // Roof ribs where they cross this step.
    for (const u of [-2.6, -1.3, 0, 1.3, 2.6]) {
      if (Math.abs(u) + 0.05 > hw) continue;
      wbox(i, s, `paint:${TEAL_DARK}`, xc + u - 0.025, xc + u + 0.025, y0 + k * h, y0 + (k + 1) * h, d1, d1 + 0.006);
    }
  }
  // A roof lantern on top.
  wbox(i, s, `paint:${TEAL_DARK}`, xc - 0.5, xc + 0.5, y0 + n * h, y0 + n * h + 0.05, 0.02, 0.07);
  // Floodlight masts at the stands' ends, heads lit.
  for (const k of [-1, 1]) {
    const x = xc + k * 4.85;
    wbox(i, s, STEEL, x - 0.035, x + 0.035, cf + 0.98, cf + 2.36, 0.02, 0.07);
    wbox(i, s, 'flat:#3a3d41', x - 0.24, x + 0.24, cf + 2.34, cf + 2.52, 0.02, 0.1);
    wbox(i, s, 'light', x - 0.2, x + 0.2, cf + 2.37, cf + 2.49, 0.1, 0.106);
  }
  // Gulls over the roof, clear of the dome's top steps.
  for (const [u, y, k] of [[-3.3, 2.18, 1.1], [3.1, 2.3, 0.9], [-2.4, 2.38, 0.7]] as const) {
    if (Math.abs(u) - 0.45 * k < widths[n - 2]) continue;
    gull((p, q, a, c) => wbox(i, s, `flat:${WHITE}`, xc + p, xc + q, cf + a, cf + c, 0.02, 0.03), u, y, k);
  }
  // Tall team banners either side: orange outside, navy inside.
  for (const k of [-1, 1]) {
    for (const [off, col, fg] of [[5.85, NAVY, ORANGE], [6.8, ORANGE, NAVY]] as const) {
      const x = xc + k * off, x0 = x - 0.4, x1 = x + 0.4, d = 0.03;
      wbox(i, s, STEEL, x0 - 0.06, x1 + 0.06, cf + 2.5, cf + 2.54, 0.008, d + 0.03);
      wbox(i, s, `flat:${col}`, x0, x1, cf + 0.45, cf + 2.5, d - 0.006, d);
      wbox(i, s, `flat:${fg}`, x0, x1, cf + 0.45, cf + 0.6, d, d + 0.005);
      b.sign({ k: 'shop', ja: TEAM.ja, bg: col, fg: '#fff', vertical: true }, x, cf + 1.6, s * (i.cw - d - 0.006), [0, -s], 0.66, 1.6);
    }
  }
}

// ── Concourse: shops and clutter ─────────────────────────────────────────────────────────────

/** The Gulls' shop: a glazed front with shirts hanging in the window. */
function goodsShop(i: ConcInfo, s: Wall, x0: number, w = 6): boolean {
  const door = x0 + w - 0.9;
  if (!shopFront(i, { s, x0, x1: x0 + w, brand: GULLS_SHOP, depth: 0.9, front: 'glazed', door, goods: [ORANGE, NAVY, WHITE, TEAL] })) return false;
  const { cf } = i;
  // Hanging rail in the window, shirts on it (orange, white, navy), numbers on their backs.
  wbox(i, s, STEEL, x0 + 0.4, door - 0.6, cf + 2.02, cf + 2.05, 0.6, 0.63);
  const cols = [ORANGE, WHITE, NAVY];
  let k = 0;
  for (let c = x0 + 0.75; c + 0.4 < door - 0.55; c += 0.78, k++) {
    const col = cols[k % 3], num = col === WHITE ? NAVY : WHITE;
    wbox(i, s, STEEL, c - 0.01, c + 0.01, cf + 1.92, cf + 2.02, 0.61, 0.62);
    wbox(i, s, `flat:${col}`, c - 0.22, c + 0.22, cf + 1.3, cf + 1.92, 0.6, 0.64);
    wbox(i, s, `flat:${col}`, c - 0.38, c - 0.22, cf + 1.68, cf + 1.9, 0.6, 0.64);
    wbox(i, s, `flat:${col}`, c + 0.22, c + 0.38, cf + 1.68, cf + 1.9, 0.6, 0.64);
    wbox(i, s, `flat:${num}`, c - 0.08, c + 0.08, cf + 1.45, cf + 1.7, 0.64, 0.646);
  }
  return true;
}

/** Stadium food counter: bento and yakisoba to take to the game. */
const foodCounter = (i: ConcInfo, s: Wall, x0: number, w = 4) =>
  shopFront(i, {
    s, x0, x1: x0 + w, brand: KAMOMETEI, depth: 1.2, front: 'counter', body: `paint:${NAVY}`,
    noren: { color: ORANGE, text: 'やきそば', fg: '#fff' }, goods: ['#e8e2d0', '#b23a3a', '#6aa84f', ORANGE],
  });

/** A row of recycling bin sets (cans, bottles, other) against long wall `s`, solid. */
function binRow(i: ConcInfo, s: Wall, x0: number, sets = 2): boolean {
  const w = sets * 1.45, [za, zb] = band(i, s, 0, 1.1);
  if (!i.free(x0, za, x0 + w, zb)) return false;
  i.claim(x0, za, x0 + w, zb);
  const lids = ['#1565c0', '#2e7d32', '#c62828'];
  const [z0, z1] = band(i, s, 0.12, 0.5);
  for (let k = 0; k < sets * 3; k++) {
    const x = x0 + 0.1 + Math.floor(k / 3) * 1.45 + (k % 3) * 0.42;
    i.b.box('metal:#a9b0b5', x, i.cf, z0, x + 0.38, i.cf + 0.9, z1);
    i.b.deco(`paint:${lids[k % 3]}`, x - 0.01, i.cf + 0.9, z0 - 0.01, x + 0.39, i.cf + 0.96, z1 + 0.01);
  }
  return true;
}

/** Big backlit advert panel on long wall `s` centred on x, if the wall there is free. */
function adPanel(i: ConcInfo, s: Wall, x: number, v: number, w = 2.4, h = 1.4): boolean {
  const [za, zb] = band(i, s, 0, 0.35);
  if (!i.free(x - w / 2 - 0.15, za, x + w / 2 + 0.15, zb)) return false;
  const [ca, cb] = band(i, s, 0, 0.05);
  i.claim(x - w / 2 - 0.15, ca, x + w / 2 + 0.15, cb);
  const y = i.cf + 1.65;
  wbox(i, s, 'flat:#2b3034', x - w / 2 - 0.08, x + w / 2 + 0.08, y - h / 2 - 0.08, y + h / 2 + 0.08, 0.008, 0.05);
  wbox(i, s, `paint:${TEAL}`, x - w / 2 - 0.08, x + w / 2 + 0.08, y - h / 2 - 0.14, y - h / 2 - 0.08, 0.008, 0.05);
  i.b.sign({ k: 'poster', v: v % 8 }, x, y, s * (i.cw - 0.055), [0, -s], w, h);
  return true;
}

// ── Concourse: full-height solids ────────────────────────────────────────────────────────────

/**
 * Plan rectangles of everything solid that reaches the ceiling: the stairwells (walls, jambs and
 * fascia), the lift shaft, any wall. Overhead runs stop at these. Pillars are left out (the
 * beams and light rows already know them). Read before the look adds anything of its own.
 */
function tallSolids(i: ConcInfo): Rect[] {
  const top = i.cf + i.clear;
  const out: Rect[] = i.stairwells.map((w) => w.footprint);
  for (const p of i.b.out.boxes) {
    if (!p.solid || p.max[1] < top - 0.1 || p.min[1] >= top - 0.1) continue;
    if (p.max[0] <= i.x0 + 0.01 || p.min[0] >= i.x1 - 0.01 || p.max[2] <= -i.cw + 0.01 || p.min[2] >= i.cw - 0.01) continue;
    const cx = (p.min[0] + p.max[0]) / 2, cz = (p.min[2] + p.max[2]) / 2;
    if (i.pillars.some(([px, pz]) => Math.abs(px - cx) < 0.05 && Math.abs(pz - cz) < 0.05)) continue;
    out.push([p.min[0], p.min[2], p.max[0], p.max[2]]);
  }
  return out;
}

/** x-spans where a run along x at z (± half) meets one of `solids`, grown by `pad`. */
const alongX = (solids: Rect[], z: number, half: number, pad = 0.1): Span[] =>
  solids.filter((r) => z + half > r[1] && z - half < r[3]).map((r): Span => [r[0] - pad, r[2] + pad]);

/** z-spans where a run along z at x (± half) meets one of `solids`, grown by `pad`. */
const alongZ = (solids: Rect[], x: number, half: number, pad = 0.1): Span[] =>
  solids.filter((r) => x + half > r[0] && x - half < r[2]).map((r): Span => [r[1] - pad, r[3] + pad]);

/** The floor in front of a stairwell's portal, 3.3 m out and a metre wider each side than the opening. */
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3.3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}

// ── Concourse: stairwell walls ───────────────────────────────────────────────────────────────

/** The stairwells' outer walls: sea-grey enamel with the teal cap, frieze and orange pinstripe, and a Gulls banner. */
function dressWells(i: ConcInfo) {
  const { b, cf } = i;
  for (const w of i.stairwells) {
    if (w.room >= 0) continue;
    for (const f of stairwellFaces(i, w)) {
      faceDado(i, f, { mat: SEA, top: 1.1, cap: `paint:${TEAL}`, skirting: 'flat:#3d4448', frieze: `paint:${TEAL}`, friezeY: [2.4, 2.46] });
      fbox(b, f, `paint:${ORANGE}`, f.u0, f.u1, cf + 2.47, cf + 2.5, 0, 0.01);
      // Banners on the middle of the face (two on a long one), clear of its ends.
      const len = f.u1 - f.u0, n = len >= 7 ? 2 : len >= 2.2 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const u = f.u0 + (len * (k + 0.5)) / n, col = (k + (f.end ? 1 : 0)) % 2 ? ORANGE : NAVY, fg = col === ORANGE ? NAVY : ORANGE;
        const u0 = u - 0.4, u1 = u + 0.4;
        fbox(b, f, STEEL, u0 - 0.06, u1 + 0.06, cf + 2.3, cf + 2.34, 0.008, 0.06);
        fbox(b, f, `flat:${col}`, u0, u1, cf + 0.45, cf + 2.3, 0.024, 0.03);
        fbox(b, f, `flat:${fg}`, u0, u1, cf + 0.45, cf + 0.6, 0.03, 0.035);
        const [sx, sz] = fpt(f, u, 0.036);
        b.sign({ k: 'shop', ja: TEAM.ja, bg: col, fg: '#fff', vertical: true }, sx, cf + 1.45, sz, f.axis === 'x' ? [0, f.n] : [f.n, 0], 0.66, 1.6);
      }
    }
  }
}

// ── Concourse: unpaid halls ──────────────────────────────────────────────────────────────────

/** z of the barrier rails in front of each gate line: the rails split the approach into lanes. */
const RAIL_Z = [-3, 0, 3];

/** x-runs of at least `min` m within p … q where a strip along x at z (half width `hw`) is free of everything, `margin` clear. */
function freeRuns(i: ConcInfo, z: number, p: number, q: number, hw: number, margin: number, min: number): Span[] {
  const lo = Math.min(p, q), hi = Math.max(p, q), out: Span[] = [];
  for (let x = lo; x < hi - 1e-6; x += 0.25) {
    const x1 = Math.min(hi, x + 0.25);
    if (!i.free(x, z - hw, x1, z + hw, margin)) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - x) < 1e-6) last[1] = x1;
    else out.push([x, x1]);
  }
  return out.filter(([a, c]) => c - a >= min);
}

/**
 * Crowd barriers in an unpaid hall: low steel rails along x, from 4.6 m to 8.6 m out from the
 * gate line, only on floor that is free (the tactile path and the bands are claimed) and leaving
 * 2.4 m to any pillar. A rail breaks where the floor guidance crosses it. Solid.
 */
function barriers(i: ConcInfo, g: number, dir: number) {
  const { b, cf } = i;
  for (const z of RAIL_Z) {
    for (const [xa, xb] of freeRuns(i, z, g + dir * 4.6, g + dir * 8.6, 0.04, 0.3, 1.5)) {
      if (i.pillars.some(([px, pz]) => px > xa - 0.8 && px < xb + 0.8 && Math.abs(pz - z) - 0.39 < 2.45)) continue;
      i.claim(xa - 0.3, z - 0.34, xb + 0.3, z + 0.34);
      b.block(xa, cf, z - 0.04, xb, cf + 1.0, z + 0.04);
      b.deco(STEEL, xa, cf + 0.95, z - 0.025, xb, cf + 1.0, z + 0.025);
      b.deco(STEEL, xa, cf + 0.5, z - 0.015, xb, cf + 0.54, z + 0.015);
      b.deco(`paint:${TEAL}`, xa + 0.05, cf + 0.6, z - 0.01, xb - 0.05, cf + 0.88, z + 0.01);
      const n = Math.max(1, Math.round((xb - xa) / 1.0));
      for (let k = 0; k <= n; k++) {
        const x = xa + ((xb - xa) * k) / n;
        b.deco(STEEL, x - 0.03, cf, z - 0.03, x + 0.03, cf + 0.95, z + 0.03);
      }
    }
  }
}

/**
 * Painted queue lanes on the floor either side of each gate line, on free floor only: where a
 * line band, the tactile path or a floor decal runs, the paint stops short of it (the floor
 * guidance owns that floor). The queue is shown by the barriers; there are no floor arrows.
 */
function laneMarkings(i: ConcInfo) {
  const { b, cf } = i;
  const y0 = cf + 0.002, y1 = cf + 0.008;
  const line = (mat: string, z: number, p: number, q: number) => {
    for (const [a, c] of freeRuns(i, z, p, q, 0.05, 0.12, 1.0)) b.deco(mat, a, y0, z - 0.05, c, y1, z + 0.05);
  };
  for (const e of i.ends) {
    const dir = e.hi ? 1 : -1;
    // Unpaid side: teal lane lines out from the gates towards the mural.
    for (const z of RAIL_Z) line(`paint:${TEAL}`, z, e.g + dir * 0.95, e.g + dir * 13.4);
    // Paid side: short orange lane lines out of the gates.
    for (const z of [RAIL_Z[0], RAIL_Z[2]]) line(`paint:${ORANGE}`, z, e.g - dir * 0.95, e.g - dir * 7.0);
  }
}

// ── Concourse: ceiling ───────────────────────────────────────────────────────────────────────

const nearGate = (i: ConcInfo, x: number, m: number) => i.ends.some((e) => Math.abs(x - e.g) < m);

/** Light rows along x, as z. */
const lightRows = (i: ConcInfo) => [-0.8 * i.cw, -0.26 * i.cw, 0.26 * i.cw, 0.8 * i.cw];

/** Deep teal beams across on the 4 m grid, and two steel ties along. They stop at the stairwell walls and the lift shaft. */
function beams(i: ConcInfo) {
  const top = i.cf + i.clear, tx = toiletX(i), solids = tallSolids(i);
  const doors: Span[] = i.ends.map((e): Span => (e.hi ? [e.g + 9, e.g + 13] : [e.g - 13, e.g - 9]));
  for (let x = i.x0 + 4; x < i.x1 - 0.5; x += 4) {
    if (nearGate(i, x, 2)) continue;
    // Stop short of the walls where an exit sign or the toilets sign hangs.
    const inDoor = doors.some(([p, q]) => x > p - 0.4 && x < q + 0.4);
    const z0 = inDoor || Math.abs(x - tx) < 1.3 ? -i.cw + 0.6 : -i.cw;
    const z1 = inDoor ? i.cw - 0.6 : i.cw;
    for (const [p, q] of cut([z0, z1], alongZ(solids, x, 0.22))) {
      i.b.deco(`paint:${TEAL}`, x - 0.2, top - 0.4, p, x + 0.2, top, q);
      i.b.deco(`paint:${TEAL_DARK}`, x - 0.22, top - 0.43, p, x + 0.22, top - 0.4, q);
    }
  }
  const gaps = i.ends.map((e): Span => [e.g - 1.6, e.g + 1.6]);
  for (const z of [-0.43 * i.cw, 0.43 * i.cw]) {
    for (const [p, q] of cut([i.x0, i.x1], [...gaps, ...alongX(solids, z, 0.06)])) i.b.deco(STEEL, p, top - 0.15, z - 0.06, q, top - 0.05, z + 0.06);
  }
}

/**
 * The pennant ceiling: strings of team pennants across the hall in the bays between the beams,
 * away from the gate signs and the murals, orange, white and navy in turn. Bottom at cf + 2.5.
 * A string stops 0.4 m short of every stairwell wall, the lift shaft and the floor in front of
 * each portal, and keeps off the ticket machines' wall strips in the unpaid halls.
 */
function pennants(i: ConcInfo) {
  const { b, cf } = i, top = cf + i.clear;
  const rows = lightRows(i), solids = tallSolids(i), wells = i.stairwells.map(approach);
  const cols = [ORANGE, WHITE, NAVY];
  // Unpaid halls: machines and lockers line the walls out to 16.4 m from the gate.
  const unpaid = (x: number) => i.ends.some((e) => (x - e.g) * (e.hi ? 1 : -1) > 3.6);
  let n = 0;
  for (let x = i.x0 + 2; x < i.x1 - 0.5; x += 4, n++) {
    if (nearGate(i, x, 3) || x - i.x0 < 8 || i.x1 - x < 8) continue;
    const zl = i.cw - (unpaid(x) ? 2.4 : 1.8);
    const gaps: Span[] = [
      ...alongZ(solids, x, 0.3, 0.4),
      ...wells.filter((r) => x + 0.3 > r[0] && x - 0.3 < r[2]).map((r): Span => [r[1] - 0.4, r[3] + 0.4]),
    ];
    for (const [p, q] of cut([-zl, zl], gaps)) {
      if (q - p < 1.2) continue;
      b.deco('flat:#2b2d30', x - 0.006, cf + 2.8, p, x + 0.006, cf + 2.812, q);
      for (const z of [p, q]) b.deco('flat:#2b2d30', x - 0.008, cf + 2.812, z - 0.008, x + 0.008, top, z + 0.008);
      let k = Math.round((p + zl) / 1.0);
      for (let z = -zl + 0.5 + k * 1.0; z < q - 0.25; z += 1.0, k++) {
        if (z - 0.25 < p || rows.some((r) => Math.abs(r - z) < 0.32)) continue;
        const mat = `flat:${cols[(k + n) % 3]}`;
        b.deco(mat, x - 0.006, cf + 2.64, z - 0.18, x + 0.006, cf + 2.8, z + 0.18);
        b.deco(mat, x - 0.006, cf + 2.5, z - 0.08, x + 0.006, cf + 2.64, z + 0.08);
      }
    }
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: 'panel:#dde5e9', floor: 'floor:#9aa1a5', pillar: 'panel:#e3eaee', ceil: 'paint:#dfe4e6' },
  posters: false,
  skirting: false,

  lights(i) {
    // Strong white line lights hung just under the beams, the whole length, broken at the gate
    // signs (and round the offices further out) and at any pillar.
    const y = i.cf + i.clear - 0.4, solids = tallSolids(i);
    for (const z of lightRows(i)) {
      const m = Math.abs(z) < 4.5 ? 1.6 : 3.3;
      const gaps: Span[] = [
        ...i.ends.map((e): Span => [e.g - m, e.g + m]),
        ...alongX(solids, z, 0.1, 0.15),
        ...i.pillars.filter(([, pz]) => Math.abs(pz - z) < 0.6).map(([px]): Span => [px - 0.6, px + 0.6]),
      ];
      for (const [p, q] of cut([i.x0 + 0.6, i.x1 - 0.6], gaps)) {
        i.b.deco('metal:#c9ced2', p, y - 0.06, z - 0.1, q, y + 0.01, z + 0.1);
        i.b.deco('light', p + 0.05, y - 0.075, z - 0.06, q - 0.05, y - 0.06, z + 0.06);
      }
    }
  },

  pillar(i, x, z, y0, y1) {
    // Round column, teal band up high and a padded bumper in the Gulls' orange at knee height.
    roundPillar(i, x, z, y0, y1, { mat: i.pillar, band: TEAL, bandY: y0 + 2.2 });
    const d = 0.77;
    i.b.mesh(`paint:${ORANGE}`, 'cyl', x, y0 + 0.5, z, d + 0.1, 0.5, d + 0.1);
    i.b.mesh(`paint:${NAVY}`, 'cyl', x, y0 + 0.8, z, d + 0.11, 0.06, d + 0.11);
  },

  concourse(i) {
    // Walls: darker sea-grey enamel dado with a teal cap, a teal frieze and an orange pinstripe.
    for (const s of [-1, 1] as const) {
      wallDado(i, s, { mat: SEA, top: 1.1, cap: `paint:${TEAL}`, skirting: 'flat:#3d4448', frieze: `paint:${TEAL}`, friezeY: [2.4, 2.46] });
      wallBand(i, s, 2.47, 2.5, `paint:${ORANGE}`, { inset: 0.01 });
    }

    // Stairwell outer walls, the pennant ceiling, then the dome wall, so the shops keep clear of it.
    dressWells(i);
    pennants(i);
    const dome = domeSpot(i);
    if (dome) domeWall(i, dome.s, dome.xc);
    const walls: Wall[] | undefined = dome ? [dome.s, -dome.s as Wall] : undefined;

    // Shops: the team shop beside the dome, food for the game, everyday shops opposite.
    placeAlong(i, 6, (s, x) => goodsShop(i, s, x), [i.paid], walls);
    placeAlong(i, 4, (s, x) => foodCounter(i, s, x), [i.paid], walls);
    placeAlong(i, 5, (s, x) => conbini(i, s, x, SHOPS.portMart, 5), [i.paid], walls && [walls[1], walls[0]]);
    placeAlong(i, 2.4, (s, x) => kioskStall(i, s, x), [i.paid], walls && [walls[1], walls[0]]);
    // Two big advert panels before the lockers and bins take the rest of the wall.
    for (let v = 3; v < 5; v++) placeAlong(i, 2.7, (s, x) => adPanel(i, s, x + 1.35, v));
    placeAlong(i, 3.2, (s, x) => lockers(i, s, x, 2));
    placeAlong(i, 2.9, (s, x) => binRow(i, s, x, 2));
    placeAlong(i, 2.9, (s, x) => binRow(i, s, x, 2));

    // Steel benches in the pillar lines, midway between pillars.
    for (const [x, z] of i.pillars) {
      if (!i.pillars.some(([x2, z2]) => z2 === z && Math.abs(x2 - x - 8) < 0.01)) continue;
      if (x + 4 < i.paid[0] + 4 || x + 4 > i.paid[1] - 4) continue;
      bench(i, x + 4, z, { axis: 'x', len: 2.4, color: '#8a949a' });
    }

    // More advert panels on whatever paid wall is still bare.
    let v = 5;
    for (const s of [-1, 1] as const) {
      for (let x = i.paid[0] + 4; x < i.paid[1] - 4; x += 0.1) if (adPanel(i, s, x, v)) { v++; x += 2.7; }
    }

    // Unpaid halls: the floor paint first (it runs under the barriers), then the barriers; then the beams.
    laneMarkings(i);
    for (const e of i.ends) barriers(i, e.g, e.hi ? 1 : -1);
    beams(i);
  },

  exit(e) {
    const { b, cf, ext } = e, L = ext + 4;
    exitDado(e, { mat: SEA, top: 1.1, cap: `paint:${TEAL}` });
    exitHandrails(e, ['near', 'far']);
    // A teal stripe round the corridor and lobby at 1.9 m.
    const t = `paint:${TEAL}`;
    b.deco(t, -4, cf + 1.9, 0, -3.99, cf + 2.0, L);
    b.deco(t, -4, cf + 1.9, L - 0.01, 0, cf + 2.0, L);
    if (ext > 0) b.deco(t, -0.01, cf + 1.9, 0, 0, cf + 2.0, ext);
    b.deco(t, -0.01, cf + 1.9, ext, 0, cf + 2.0, ext + 0.9);
    // Gulls flying along the lobby wall, over the stripe.
    const onWall = (p: number, q: number, y0: number, y1: number) => b.deco(`flat:${WHITE}`, -3.99, cf + y0, p, -3.982, cf + y1, q);
    gull(onWall, ext + 1.3, 2.12, 1.2);
    gull(onWall, ext + 2.9, 2.3, 0.85);
  },

  canopy(e) {
    const { b, gy, ext, run } = e;
    const z0 = ext + 0.3, z1 = ext + 4.9, xa = -0.9, xb = run + 0.94;
    // Broad steel roof on steel posts, a deep teal fascia all round, line lights under it.
    b.deco('metal:#8d969c', xa, gy + 2.62, z0, xb, gy + 2.74, z1);
    b.deco(`paint:${TEAL}`, xb, gy + 2.55, z0 - 0.06, xb + 0.06, gy + 2.88, z1 + 0.06);
    b.deco(`paint:${TEAL}`, xa - 0.06, gy + 2.55, z0 - 0.06, xa, gy + 2.88, z1 + 0.06);
    b.deco(`paint:${TEAL}`, xa, gy + 2.55, z0 - 0.06, xb, gy + 2.88, z0);
    b.deco(`paint:${TEAL}`, xa, gy + 2.55, z1, xb, gy + 2.88, z1 + 0.06);
    b.deco(`paint:${WHITE}`, xb + 0.06, gy + 2.7, z0, xb + 0.064, gy + 2.74, z1);
    for (const z of [ext + 1.7, ext + 3.5]) b.deco('light', 0.4, gy + 2.6, z - 0.05, run - 0.4, gy + 2.62, z + 0.05);
    for (const x of [-0.15, run / 2, run]) {
      for (const z of [ext + 1.05, ext + 4.15]) {
        b.deco('metal:#8d969c', x - 0.08, gy, z - 0.08, x + 0.08, gy + 2.62, z + 0.08);
        b.deco(`paint:${TEAL}`, x - 0.09, gy + 2.0, z - 0.09, x + 0.09, gy + 2.1, z + 0.09);
      }
    }
    // The board behind the entrance sign.
    b.deco(`paint:${TEAL}`, run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
    // Grey balustrades on the parapets, a teal stripe, gulls on the outer faces.
    for (const [zp, f] of [[ext + 1.05, -1], [ext + 4.15, 1]] as const) {
      b.deco('paint:#d5dde1', 0.2, gy + 1.0, zp - 0.03, run, gy + 1.75, zp + 0.03);
      b.deco(`paint:${TEAL}`, 0.2, gy + 1.55, zp - 0.035, run, gy + 1.65, zp + 0.035);
      b.deco(STEEL, 0.15, gy + 1.75, zp - 0.05, run + 0.05, gy + 1.8, zp + 0.05);
      const zf = zp + f * 0.03;
      const put = (p: number, q: number, y0: number, y1: number) => b.deco(`flat:${TEAL_DARK}`, p, gy + y0, Math.min(zf, zf + f * 0.008), q, gy + y1, Math.max(zf, zf + f * 0.008));
      gull(put, run * 0.3, 1.22, 1.1);
      gull(put, run * 0.42, 1.3, 0.8);
    }
    // A pair of flagpoles out front with the Gulls' flags.
    const xf = run + 1.5;
    for (const [zp, f, field, stripe] of [[ext - 0.1, -1, ORANGE, NAVY], [ext + 5.3, 1, NAVY, ORANGE]] as const) {
      b.mesh(STEEL, 'cyl', xf, gy + 2.6, zp, 0.09, 5.2, 0.09);
      b.mesh('paint:#d9b24a', 'sphere', xf, gy + 5.24, zp, 0.14, 0.14, 0.14);
      const za = zp + f * 0.06, zb = zp + f * 1.36, lo = Math.min(za, zb), hi = Math.max(za, zb);
      b.deco(`flat:${field}`, xf - 0.01, gy + 4.1, lo, xf + 0.01, gy + 4.95, hi);
      b.deco(`flat:${stripe}`, xf - 0.014, gy + 4.12, lo, xf + 0.014, gy + 4.24, hi);
      gull((p, q, y0, y1) => b.deco(`flat:${WHITE}`, xf - 0.018, gy + y0, p, xf + 0.018, gy + y1, q), (za + zb) / 2, 4.5, 0.9);
    }
  },
};
