// Minato Center's atrium (みなとセンター アトリウム): the way up from the gates to the tower's forecourt.
//
// The concourse under the avenue has one gate line, at its east end (specs.ts). The end wall beyond the unpaid
// side is open onto a low hall under the avenue (shops, a café, the information desk), which opens north into
// the atrium: a white steel and glass hall on the tower's forecourt, 32 m from its sunken floor (the concourse
// level) to the glass roof. Two pairs of escalators criss-cross in it: from the floor up to the street-level
// balcony along the forecourt's glass front (doors onto the avenue's north pavement), and on up to the deck-level
// balcony over it, where the pedestrian deck will cross the avenue (stage 2). A lift serves all three floors.
// The floor's north end is the event space. The escalators up to the street are Exit 2.
//
// Everything is built here, in code (no model): the glass box above ground is the atrium's own outside.
// Station frame: +x east, +z south.

import { linesAt } from '../data/network';
import type { SignContent } from '../signs/content';
import type { Builder, V2 } from '../world/builder';
import { GROUND_Y, rail, type Ctx } from './kit';
import { lift, LIFT_OUT } from './lift';
import { modelTree, type TreeKind } from './trees';
import { MCA } from './minatocenter-plan';


const STEEL = 'paint:#f4f5f2', PANEL = 'panel:#f2f5f7', FLOOR = 'floor:#e3e1da', DARK = 'flat:#2c3238', BLUE = '#1673c9';
/** Rise per metre of escalator run (as headhouse.ts). */
const SLOPE = 1.72;

const SHOPS = [
  { ja: 'カフェ 汐見', en: 'Café Shiomi', bg: '#2f4a3a', fg: '#f2d38a', cafe: true },
  { ja: 'ベイサイド ベーカリー', en: 'Bayside Bakery', bg: '#f3e2b8', fg: '#6b3a12' },
  { ja: 'マルホシ ミニ', en: 'Maruhoshi Mini', bg: '#0b8f6a', fg: '#ffffff' },
  { ja: 'ドラッグ ベイ', en: 'Drug Bay', bg: '#1f6f8b', fg: '#ffffff' },
  { ja: '花の店 しおかぜ', en: 'Shiokaze Florist', bg: '#e9f2e4', fg: '#2e6b35' },
  { ja: '港寿司', en: 'Minato Sushi', bg: '#1d2a3a', fg: '#f4efe2' },
  { ja: 'みなと書房', en: 'Minato Books', bg: '#7a2a12', fg: '#fff3d6' },
  { ja: 'ラーメン 灯台', en: 'Ramen Tōdai', bg: '#c0392b', fg: '#ffffff' },
];

/** The quarter turn that takes the local direction `from` to the frame's `to` (as headhouse.ts). */
function turn(b: Builder, from: V2, to: V2): 0 | 1 | 2 | 3 {
  for (const k of [0, 1, 2, 3] as const) {
    let ok = false;
    b.with({ rot: k }, () => {
      const d = b.dir(from);
      ok = Math.abs(d[0] - to[0]) < 1e-6 && Math.abs(d[1] - to[1]) < 1e-6;
    });
    if (ok) return k;
  }
  throw new Error('minatocenter-atrium: no such turn');
}

/** A white tub of planting on the atrium floor, a modelled tree in it. */
function planter(b: Builder, x: number, z: number, y: number, kind: TreeKind) {
  b.box('panel:#ffffff', x - 1.3, y, z - 1.3, x + 1.3, y + 0.5, z + 1.3);
  b.deco('flat:#4a3b2c', x - 1.15, y + 0.5, z - 1.15, x + 1.15, y + 0.53, z + 1.15);
  modelTree(b, kind, x, z, 'b', y + 0.5);
}

/**
 * An atrium escalator climbing +x from (x0, yLow) to (x1, yHigh): a walkable ramp, steps, glass balustrades with black
 * handrails, all on a slim white truss 1 m deep that you can see (and, where it is high enough, walk) under.
 * Returns the run within which the truss is too low to walk under (from the foot).
 */
function atriumEscalator(b: Builder, x0: number, x1: number, z0: number, z1: number, yLow: number, yHigh: number, dir: 1 | -1) {
  const run = x1 - x0, rise = yHigh - yLow, n = Math.max(1, Math.round(run / 0.8));
  b.ramp(x0, z0, x1, z1, yLow, yHigh, [1, 0], 0.45 * dir);
  for (let i = 0; i < n; i++) {
    const xa = x0 + (i * run) / n, xb = x0 + ((i + 1) * run) / n, ya = yLow + (i * rise) / n, yb = yLow + ((i + 1) * rise) / n;
    const top = Math.max(ya, yb);
    // Steps (dark treads, a yellow nosing), the truss under them, the balustrade glass either side.
    b.deco('metal:#5d636a', xa, Math.min(ya, yb) - 0.25, z0, xb, top, z1);
    b.deco('flat:#e2b100', xa, top - 0.004, z0, xa + 0.04, top + 0.004, z1);
    for (const [za, zb] of [[z0 - 0.1, z0 - 0.06], [z1 + 0.06, z1 + 0.1]]) b.block(xa, top - 1.0, za, xb, top + 1.0, zb);
    // Under the truss, where it is too low to walk under: closed (never over the steps themselves).
    const under = Math.min(ya, yb) - 1.0;
    if (under > yLow + 0.05 && under - yLow < 2.1) b.block(xa, yLow, z0 - 0.1, xb, under, z1 + 0.1);
  }
  // The truss and the balustrade glass follow the slope in one piece each.
  b.slant(STEEL, x0, yLow - 1.0, z0 - 0.1, x1, yLow - 0.2, z1 + 0.1, rise);
  for (const [za, zb] of [[z0 - 0.1, z0 - 0.06], [z1 + 0.06, z1 + 0.1]]) b.slant('glass', x0, yLow, za, x1, yLow + 0.95, zb, rise);
  for (const zc of [z0 - 0.08, z1 + 0.08]) b.slant('flat:#17181b', x0, yLow + 1.0, zc - 0.045, x1, yLow + 1.05, zc + 0.045, rise);
  // Landing plates at both ends, the direction marker at the boarding end.
  b.deco('metal:#9aa0a6', x0 - 1.0, yLow, z0, x0, yLow + 0.01, z1);
  b.deco('metal:#9aa0a6', x1, yHigh, z0, x1 + 1.0, yHigh + 0.01, z1);
  const xb = dir > 0 ? x0 - 0.5 : x1 + 0.1, yb = dir > 0 ? yLow : yHigh;
  b.deco('flat:#1f9d55', xb, yb + 0.01, z0, xb + 0.4, yb + 0.016, z1);
  return (2.1 + 1.0) / (rise / run);
}

/** `cf`: the concourse floor; `cw`: its half width; `cx1`: its east end (the end wall's inner face). */
export function buildMcAtrium(c: Ctx, cf: number, cw: number, cx1: number) {
  const { b, station } = c;
  const GY = GROUND_Y, A = MCA;
  if (Math.abs(cx1 - A.x0) > 0.01) throw new Error(`buildMcAtrium: the concourse's end (${cx1}) no longer meets the atrium (${A.x0})`);
  const lines = linesAt(station.id).map((l) => l.id);
  const DY = GY + A.deck, TOP = GY + A.roof, LOW = cf + 4.5;
  const run1 = Math.round((GY - cf) * SLOPE * 100) / 100, run2 = Math.round(A.deck * SLOPE * 100) / 100;
  const e1x1 = A.e1.x + run1, e2x0 = A.e2.x - run2;
  if (e1x1 > A.east + 0.2 || e2x0 > A.dx1 + 0.1) throw new Error('buildMcAtrium: the escalators no longer reach their landings');
  const exitJa = `${A.num}番出口 アトリウム・みなとセンタータワー`, exitEn = `Exit ${A.num}: Atrium / Minato Center Tower`;

  // ═════════ The shell below the street ═════════
  // Open the concourse's end wall (the kit's, x = cx1 … cx1 + 0.4) to the hall, and close the step in the ceiling over it.
  b.carve(cx1, cf - 0.6, -cw + 0.01, cx1 + 0.45, cf + 3.0, cw - 0.01);
  b.box(PANEL, cx1, cf + 3.0, -cw, cx1 + 0.4, LOW, cw);
  // Floor: the low hall and the atrium's sunken floor, one level with the concourse.
  b.box(FLOOR, A.x0, cf - 0.5, A.z0, A.x1, cf, A.hallZ);
  // (A stainless threshold strip where the end wall stood, over the seam between the two floors.)
  b.deco('metal:#b9bec3', cx1 - 0.3, cf, -cw, cx1 + 0.5, cf + 0.008, cw);
  // Walls: west (beside the concourse's north wall and along the atrium), north, east, and the low hall's south.
  b.box(PANEL, A.x0 - 0.4, cf, A.z1, A.x0, LOW + 0.5, -cw - 0.4);
  b.box(PANEL, A.x0 - 0.4, cf, A.z0 - 0.4, A.x0, GY, A.z1);
  b.box(PANEL, A.x0 - 0.4, cf, A.z0 - 0.4, A.x1 + 0.4, GY, A.z0);
  b.box(PANEL, A.x1, cf, A.z0, A.x1 + 0.4, GY, A.hallZ + 0.4);
  b.box(PANEL, A.x0 + 0.4, cf, A.hallZ, A.x1, LOW + 0.5, A.hallZ + 0.4);
  // The low hall's ceiling: a dark plenum, white fins hung in a slow wave below it, light lines between the fins.
  b.box('flat:#68727b', A.x0, LOW, A.z1, A.x1, LOW + 0.5, A.hallZ + 0.4);
  const fin = (x: number, z: number) => LOW - 0.35 - 0.45 * (0.5 + 0.5 * Math.sin(x * 0.32 + z * 0.15));
  for (let z = A.z1 + 0.6, k = 0; z < A.hallZ - 0.3; z += 0.9, k++) {
    for (let x = A.x0 + 1.9; x < A.x1 - 0.2; x += 1.5) b.deco(STEEL, x, fin(x + 0.75, z), z - 0.04, Math.min(x + 1.5, A.x1 - 0.1), LOW, z + 0.04);
    if (k % 3 === 1) b.deco('light', A.x0 + 0.4, LOW - 0.04, z + 0.4, A.x1 - 0.2, LOW, z + 0.5);
  }
  // A white wall from the hall's ceiling up to the street-level balcony, over the opening (the plenum stays hidden).
  b.box(PANEL, A.x0, LOW - 1.5, A.z1 - 0.4, A.x1, GY - 0.36, A.z1);
  // The deep fascia over the opening to the atrium: the departures board and a screen facing those coming in.
  b.deco(STEEL, A.x0, LOW - 1.5, A.z1 - 0.3, A.x1, LOW, A.z1);
  b.sign({ k: 'depAll', station: station.id }, 52, LOW - 0.75, A.z1 - 0.42, [0, -1], 3.4, 1.2);
  b.sign({ k: 'screen', v: 3 }, 66, LOW - 0.75, A.z1 - 0.42, [0, -1], 2.2, 1.2);
  // Round white columns in two rows, a blue band at hand height, screens wrapped on every other one.
  [46, 54, 62, 70].forEach((x, k) => {
    for (const z of [-7, 4.6]) {
      const yt = fin(x, z);
      b.mesh(STEEL, 'cyl', x, (cf + yt) / 2, z, 0.45, yt - cf, 0.45);
      b.mesh(`paint:${BLUE}`, 'cyl', x, cf + 1.15, z, 0.47, 0.12, 0.47);
      b.block(x - 0.45, cf, z - 0.45, x + 0.45, yt, z + 0.45);
      if ((k + (z < 0 ? 0 : 1)) % 2) continue;
      for (const f of [-1, 1] as const) {
        b.deco('flat:#1c2026', x - 0.5, cf + 1.4, z + f * 0.46, x + 0.5, cf + 3.1, z + f * 0.52);
        b.sign({ k: 'screen', v: k * 2 + (f > 0 ? 1 : 0) }, x, cf + 2.25, z + f * 0.525, [0, f], 0.9, 1.6);
      }
    }
  });
  // The floor: a blue wave inlaid from the gates to the atrium, a pale line beside it.
  for (let x = A.x0 + 0.2; x < A.x1 - 0.6; x += 0.6) {
    const zw = -1 + 2.6 * Math.sin(x * 0.2), zw2 = zw + 0.9 + 0.4 * Math.sin(x * 0.31);
    b.deco(`paint:${BLUE}`, x, cf + 0.002, zw - 0.16, x + 0.62, cf + 0.006, zw + 0.16);
    b.deco('paint:#8fc0ea', x, cf + 0.002, zw2 - 0.06, x + 0.62, cf + 0.005, zw2 + 0.06);
  }
  // A dado and a blue line round the low hall, as in the concourse.
  b.deco(`paint:${BLUE}`, A.x0 + 0.4, cf + 1.05, A.hallZ - 0.015, A.x1, cf + 1.15, A.hallZ);
  b.deco(`paint:${BLUE}`, A.x1 - 0.015, cf + 1.05, A.z0, A.x1, cf + 1.15, A.hallZ);

  // ═════════ The glass hall above the street ═════════
  const [d0, d1] = A.doors[0], [d2, d3] = A.doors[1];
  const glass = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.box('glass', x0, y0, z0, x1, y1, z1);
  glass(A.x0 - 0.1, GY, A.z0, A.x0, TOP, A.z1);
  glass(A.x1, GY, A.z0, A.x1 + 0.1, TOP, A.z1);
  glass(A.x0, GY, A.z0 - 0.1, A.x1, TOP, A.z0);
  // The front: doorways at street level, glass above and between.
  for (const [a, e] of [[A.x0, d0], [d1, d2], [d3, A.x1]]) glass(a, GY, A.z1 - 0.1, e, TOP, A.z1);
  for (const [a, e] of A.doors) glass(a, GY + 3.2, A.z1 - 0.1, e, TOP, A.z1);
  // The parapet the glass stands on, a hair above the ground round it.
  b.deco('flat:#c9cdd0', A.x0 - 0.2, GY, A.z0 - 0.2, A.x1 + 0.2, GY + 0.06, A.z0);
  // The white steel: columns every 6 m round the walls, transoms every 4.5 m, the roof's grid and its edge.
  const cols: [number, number][] = [];
  for (let x = A.x0; x <= A.x1 + 0.01; x += 6) cols.push([x, A.z0], [x, A.z1]);
  for (let z = A.z0 + 8; z < A.z1 - 1; z += 8) cols.push([A.x0, z], [A.x1, z]);
  for (const [x, z] of cols) {
    const inDoor = z === A.z1 && A.doors.some(([a, e]) => x > a - 0.2 && x < e + 0.2);
    if (inDoor) continue;
    b.box(STEEL, x - 0.2, GY, z - 0.2, x + 0.2, TOP, z + 0.2);
  }
  for (let y = GY + 4.5; y < TOP - 1; y += 4.5) {
    b.deco(STEEL, A.x0 - 0.15, y, A.z0 - 0.15, A.x1 + 0.15, y + 0.12, A.z0 + 0.05);
    b.deco(STEEL, A.x0 - 0.15, y, A.z1 - 0.05, A.x1 + 0.15, y + 0.12, A.z1 + 0.15);
    b.deco(STEEL, A.x0 - 0.15, y, A.z0, A.x0 + 0.05, y + 0.12, A.z1);
    b.deco(STEEL, A.x1 - 0.05, y, A.z0, A.x1 + 0.15, y + 0.12, A.z1);
  }
  // Light lines along the inside of the transoms (the hall reads lit through its glass by night).
  for (let y = GY + 9; y < TOP - 1; y += 4.5) {
    b.deco('light', A.x0 + 0.3, y - 0.06, A.z0 + 0.1, A.x1 - 0.3, y, A.z0 + 0.16);
    b.deco('light', A.x0 + 0.1, y - 0.06, A.z0 + 0.3, A.x0 + 0.16, y, A.z1 - 0.3);
    b.deco('light', A.x1 - 0.16, y - 0.06, A.z0 + 0.3, A.x1 - 0.1, y, A.z1 - 0.3);
  }
  b.box('glass', A.x0, TOP, A.z0, A.x1, TOP + 0.05, A.z1);
  for (let x = A.x0; x <= A.x1 + 0.01; x += 6) b.deco(STEEL, x - 0.15, TOP - 0.6, A.z0, x + 0.15, TOP + 0.1, A.z1);
  for (let z = A.z0; z <= A.z1 + 0.01; z += 4) b.deco(STEEL, A.x0, TOP - 0.35, z - 0.08, A.x1, TOP + 0.08, z + 0.08);
  b.box(STEEL, A.x0 - 0.3, TOP, A.z0 - 0.3, A.x1 + 0.3, TOP + 0.9, A.z0);
  b.box(STEEL, A.x0 - 0.3, TOP, A.z1, A.x1 + 0.3, TOP + 0.9, A.z1 + 0.3);
  b.box(STEEL, A.x0 - 0.3, TOP, A.z0, A.x0, TOP + 0.9, A.z1);
  b.box(STEEL, A.x1, TOP, A.z0, A.x1 + 0.3, TOP + 0.9, A.z1);
  // Canopies over the doorways, and the entrance sign over each.
  for (const [a, e] of A.doors) {
    b.deco(STEEL, a - 0.6, GY + 3.25, A.z1, e + 0.6, GY + 3.45, A.z1 + 2.2);
    b.deco('glass', a - 0.5, GY + 3.45, A.z1, e + 0.5, GY + 3.5, A.z1 + 2.1);
    b.sign({ k: 'entrance', station: station.id, exit: A.num }, (a + e) / 2, GY + 4.1, A.z1 + 0.03, [0, 1], 2.9, 0.6);
  }

  // ═════════ Floors inside: the street-level balcony and its east landing, the deck-level balcony ═════════
  const lz = -23, lf = A.x0 + LIFT_OUT.d; // the lift: shaft x0 … lf, centred on lz, doors facing +x
  const shaft: [number, number] = [lz - LIFT_OUT.hw, lz + LIFT_OUT.hw];
  const floorAt = (y: number, x1: number, z0: number) => {
    b.box(FLOOR, lf, y - 0.35, z0, x1, y, A.z1);
    b.box(FLOOR, A.x0, y - 0.35, shaft[1], lf, y, A.z1);
    b.box(FLOOR, A.x0, y - 0.35, z0, lf, y, shaft[0]);
    soffit(A.x0, z0, x1, A.z1, y);
  };
  /** A white soffit under a floor at y over x0 … x1, z0 … z1, its fascia, and round downlights every 3 m. */
  function soffit(x0: number, z0: number, x1: number, z1: number, y: number) {
    b.deco('paint:#f4f5f2', x0, y - 0.37, z0, x1, y - 0.355, z1);
    b.deco(STEEL, x0, y - 0.75, z0 - 0.05, x1, y + 0.02, z0);
    for (let x = x0 + 1.5; x < x1 - 0.5; x += 3) for (let z = z0 + 1.5; z < z1 - 0.5; z += 3) b.mesh('light', 'cyl', x, y - 0.38, z, 0.12, 0.02, 0.12);
  }
  floorAt(GY, A.east, A.sb);
  b.box(FLOOR, A.east, GY - 0.35, A.eastZ, A.x1, GY, A.z1);
  soffit(A.east, A.eastZ, A.x1, A.z1, GY);
  floorAt(DY, A.dx1, A.dz0);
  // Round white columns carrying the balconies' open edges.
  for (const [x, z, y] of [[46, A.sb + 0.4, GY], [54, A.sb + 0.4, GY], [64, A.eastZ + 0.4, GY], [70, A.eastZ + 0.4, GY], [74.6, A.eastZ + 0.4, GY], [44, A.dz0 + 0.4, DY], [52, A.dz0 + 0.4, DY], [59.6, A.dz0 + 0.4, DY]] as [number, number, number][]) {
    b.mesh(STEEL, 'cyl', x, (cf + y - 0.75) / 2, z, 0.3, y - 0.75 - cf, 0.3);
    b.block(x - 0.3, cf, z - 0.3, x + 0.3, y - 0.75, z + 0.3);
  }
  // Glass rails along every open edge (the escalators' mouths left open).
  rail(b, A.x0, A.sb - 0.08, A.east, A.sb, GY);
  rail(b, A.east - 0.08, A.eastZ, A.east, A.e1.z0 - 0.1, GY);
  rail(b, A.east - 0.08, A.e1.z1 + 0.1, A.east, A.sb, GY);
  rail(b, A.east, A.eastZ - 0.08, A.x1, A.eastZ, GY);
  rail(b, A.x0, A.dz0 - 0.08, A.dx1, A.dz0, DY);
  rail(b, A.dx1, A.e2.z1 + 0.1, A.dx1 + 0.08, A.z1, DY);
  rail(b, A.dx1, A.dz0, A.dx1 + 0.08, A.e2.z0 - 0.1, DY);
  // The deck-level balcony's doorway onto the deck is cut in stage 2; until then the front's glass closes it.

  // ═════════ The escalators ═════════
  // Up from the floor to the street-level balcony (Exit 2), climbing east.
  const [z10, z11] = [A.e1.z0, A.e1.z1], zm1 = (z10 + z11) / 2;
  const low1 = atriumEscalator(b, A.e1.x, e1x1, z10, zm1 - 0.12, cf, GY, 1);
  atriumEscalator(b, A.e1.x, e1x1, zm1 + 0.12, z11, cf, GY, -1);
  // Too low to walk under near the foot; a column under the middle of the run.
  void low1;
  const xm1 = A.e1.x + run1 * 0.55, ym1 = cf + (GY - cf) * 0.55 - 1.0;
  b.mesh(STEEL, 'cyl', xm1, (cf + ym1) / 2, zm1, 0.28, ym1 - cf, 0.28);
  b.block(xm1 - 0.28, cf, zm1 - 0.28, xm1 + 0.28, ym1, zm1 + 0.28);
  b.hole(A.e1.x, z10, e1x1, z11);
  b.zone('passage', A.e1.x, cf - 0.2, z10, e1x1, GY + 2.4, z11, `${A.num}番出口`, `Exit ${A.num}`);
  // On up to the deck-level balcony, climbing west from the east landing.
  b.with({ rot: 2, t: [A.e2.x, 0, 0] }, () => {
    const [za, zb] = [-A.e2.z1, -A.e2.z0], zm = (za + zb) / 2;
    const low2 = atriumEscalator(b, 0, run2, za, zm - 0.12, GY, DY, 1);
    atriumEscalator(b, 0, run2, zm + 0.12, zb, GY, DY, -1);
    void low2;
  });
  // A column under the second pair where it leaves the landing.
  {
    const xc = A.e2.x - run2 * 0.62, yc = GY + A.deck * 0.62 - 1.0, zc = (A.e2.z0 + A.e2.z1) / 2;
    b.mesh(STEEL, 'cyl', xc, (cf + yc) / 2, zc, 0.28, yc - cf, 0.28);
    b.block(xc - 0.28, GY, zc - 0.28, xc + 0.28, yc, zc + 0.28);
  }

  // ═════════ The lift: floor, street and deck ═════════
  b.with({ rot: turn(b, [0, -1], [1, 0]), t: [lf, 0, lz] }, () => lift(b, {
    mat: STEEL,
    levels: [
      { y: cf, ja: '改札階・アトリウム', en: 'Gates and atrium floor' },
      { y: GY, ja: '1階 地上', en: 'Street level' },
      { y: DY, ja: '2階 デッキ', en: 'Deck level' },
    ],
  }));
  // (The kit's lift labels each floor itself.)

  // ═════════ The low hall: the gates' view, the information desk, shops ═════════
  // Over the opening from the concourse: the way on, facing the gates; the gates, facing back.
  const toTrains: SignContent = { k: 'guide', ja: '改札口・のりば', en: 'Ticket gates / Trains', bg: 'navy', badges: lines, arrow: 'up' };
  b.sign({ k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'up' }, cx1 - 0.02, cf + 3.85, -4, [-1, 0], 7.6, 0.6);
  b.sign({ k: 'mural', v: 'skyline', color: BLUE }, cx1 - 0.02, cf + 3.95, 5.2, [-1, 0], 6.8, 0.8);
  b.sign(toTrains, cx1 + 0.42, cf + 3.75, 0, [1, 0], 7.6, 0.6);
  b.protect(cx1 - 0.1, cf + 3.0, -cw, cx1 + 0.5, LOW, cw);
  // The information desk, facing the gates, and the area map on the hall's south wall beside it.
  const ix = 49, iz0 = 1.2, iz1 = 4.4;
  b.box('panel:#ffffff', ix, cf, iz0, ix + 1.4, cf + 1.05, iz1);
  b.deco(`paint:${BLUE}`, ix - 0.01, cf + 0.85, iz0, ix, cf + 1.0, iz1);
  b.deco('flat:#d8dde1', ix + 1.4, cf, iz0 - 0.6, ix + 1.6, cf + 2.6, iz1 + 0.6);
  b.sign({ k: 'label', text: 'ご案内 インフォメーション', sub: 'Information / Tourist desk — Minato Center & Baywalk', fg: '#ffffff', bg: BLUE }, ix + 1.39, cf + 2.1, (iz0 + iz1) / 2, [-1, 0], 3.6, 0.45);
  b.sign({ k: 'areamap', station: station.id }, 44.5, cf + 1.7, A.hallZ - 0.02, [0, -1], 4.2, 2.4);
  // Shops on the south wall, the café's tables in front of it; two more on the east wall.
  type Shop = (typeof SHOPS)[number] & { cafe?: boolean };
  const GOODS = ['#d94f3d', '#f2c230', '#3b78b8', '#2f9e5b', '#f4f1e8', '#e86a1c', '#8a5cb8', '#ffffff'];
  let gk = 0;
  /** An open shop against a wall at `at` (z = at for axis 'x', x = at for 'z'), reaching 2.6 m out into the hall (n). */
  const shop = (s: Shop, axis: 'x' | 'z', at: number, n: 1 | -1, u0: number, u1: number) => {
    const D = 2.6;
    const R = (mat: string, a: number, e: number, y0: number, y1: number, d0: number, d1: number, solid = false) => {
      const p = at + n * d0, q = at + n * d1, lo = Math.min(p, q), hi = Math.max(p, q);
      const f = solid ? b.box : b.deco;
      if (axis === 'x') f.call(b, mat, a, y0, lo, e, y1, hi);
      else f.call(b, mat, lo, y0, a, hi, y1, e);
    };
    R('floor:#d9d2c4', u0, u1, cf + 0.002, cf + 0.008, 0, D);
    R(STEEL, u0, u0 + 0.12, cf, cf + 3.4, 0, D, true);
    R(STEEL, u1 - 0.12, u1, cf, cf + 3.4, 0, D, true);
    R('paint:#f4f1ea', u0, u1, cf + 3.4, cf + 3.45, 0, D);
    R(`flat:${s.bg}`, u0, u1, cf + 2.75, cf + 3.45, D - 0.12, D);
    R('glow:#fff1dc', u0 + 0.12, u1 - 0.12, cf + 0.3, cf + 2.75, 0, 0.02);
    // Shelves along the back with goods on them; a lit counter across the front, the way in left open at one end.
    for (const y of [0.8, 1.4, 2.0]) {
      R('wood:#b48a5e', u0 + 0.2, u1 - 0.2, cf + y - 0.04, cf + y, 0.02, 0.45);
      for (let u = u0 + 0.3; u < u1 - 0.45; u += 0.32) R(`flat:${GOODS[gk++ % GOODS.length]}`, u, u + 0.24, cf + y, cf + y + 0.22 + (gk % 3) * 0.05, 0.08, 0.38);
    }
    R('wood:#8a6a4a', u0 + 0.12, u1 - 1.3, cf, cf + 1.0, D - 0.9, D - 0.45);
    R('glow:#ffe9c4', u0 + 0.12, u1 - 1.3, cf + 0.95, cf + 1.0, D - 0.92, D - 0.43);
    for (let u = u0 + 0.8; u < u1 - 0.3; u += 1.3) R('light', u - 0.15, u + 0.15, cf + 3.38, cf + 3.4, D / 2 - 0.15, D / 2 + 0.15);
    // (Not walked into: the shop's volume behind its counter line is solid.)
    const p = at + n * (D - 0.4), lo = Math.min(at, p), hi = Math.max(at, p);
    if (axis === 'x') b.block(u0, cf, lo, u1, cf + 3.4, hi);
    else b.block(lo, cf, u0, hi, cf + 3.4, u1);
    const nrm: V2 = axis === 'x' ? [0, n] : [n, 0];
    const mid = (u0 + u1) / 2, face = at + n * (D + 0.01);
    if (axis === 'x') b.sign({ k: 'shop', ja: s.ja, en: s.en, bg: s.bg, fg: s.fg }, mid, cf + 3.1, face, nrm, u1 - u0 - 0.6, 0.56);
    else b.sign({ k: 'shop', ja: s.ja, en: s.en, bg: s.bg, fg: s.fg }, face, cf + 3.1, mid, nrm, u1 - u0 - 0.6, 0.56);
  };
  const bays: [number, number][] = [[47.6, 52.2], [52.6, 57.2], [57.6, 62.2], [62.6, 67.2], [67.6, 72.2]];
  bays.forEach(([a, e], k) => shop(SHOPS[k], 'x', A.hallZ, -1, a, e));
  shop(SHOPS[5], 'z', A.x1, -1, 0.4, 5.0);
  shop(SHOPS[6], 'z', A.x1, -1, -5.0, -0.4);
  shop(SHOPS[7], 'z', A.x1, -1, -16.6, -12.0);
  // The café's tables and chairs in front of it.
  for (const tx of [48.4, 51.2]) for (const tz of [6.9]) {
    b.box('wood:#8a6a4a', tx - 0.4, cf + 0.72, tz - 0.4, tx + 0.4, cf + 0.76, tz + 0.4);
    b.deco(DARK, tx - 0.04, cf, tz - 0.04, tx + 0.04, cf + 0.72, tz + 0.04);
    b.block(tx - 0.4, cf, tz - 0.4, tx + 0.4, cf + 0.76, tz + 0.4);
    for (const dx of [-0.75, 0.75]) b.box('flat:#33403a', tx + dx - 0.22, cf + 0.42, tz - 0.22, tx + dx + 0.22, cf + 0.46, tz + 0.22);
  }
  // A drinks machine pair and a bench by the east wall.
  b.box('flat:#e4e8ea', A.x1 - 0.8, cf, 6.0, A.x1, cf + 1.85, 8.4);
  b.sign({ k: 'machine', v: 'vending' }, A.x1 - 0.81, cf + 0.95, 7.2, [-1, 0], 2.3, 1.8);
  b.box('wood:#b48a5e', A.x1 - 0.6, cf + 0.42, -10.6, A.x1 - 0.1, cf + 0.48, -6.0);
  b.block(A.x1 - 0.6, cf, -10.6, A.x1 - 0.1, cf + 0.48, -6.0);
  // Way-finding inside the hall: back to the gates and round to Exit 1 (in the concourse's south wall).
  // (Coming back from the atrium: Exit 1, ahead past the gates' side. Leaving the gates: Exit 2, the atrium, to the left.)
  b.hang({ k: 'guide', ja: '1番出口 みなとベイウォーク', en: 'Exit 1: Minato Baywalk', bg: 'yellow', arrow: 'up' }, 43.5, cf + 3.25, 7.0, 3.8, 0.46,
    { ceil: LOW, back: { k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'left' } });

  // ═════════ The atrium floor: the event space, planting, benches ═════════
  // The stage at the north end, the bay-skyline mural over it on the north wall, a banner hung from the deck.
  const st = { x0: 57, x1: 73, z0: A.z0, z1: -43 };
  b.box('floor:#cfd5d8', st.x0, cf, st.z0, st.x1, cf + 0.5, st.z1);
  b.deco(`paint:${BLUE}`, st.x0, cf + 0.45, st.z1 - 0.01, st.x1, cf + 0.5, st.z1 + 0.005);
  b.sign({ k: 'mural', v: 'skyline', color: BLUE }, (st.x0 + st.x1) / 2, cf + 3.6, A.z0 + 0.02, [0, 1], st.x1 - st.x0 - 1, 4.4);
  b.sign({ k: 'label', text: 'アトリウム イベントスペース', sub: 'Atrium event space — Minato Center', fg: '#ffffff', bg: '#123a63' }, (st.x0 + st.x1) / 2, cf + 6.8, A.z0 + 0.03, [0, 1], 8, 0.9);
  for (const [px, pz, k] of [[47.5, -36.8, 'tokaede'], [55.5, -37, 'dogwood'], [74.4, -38, 'dogwood'], [74.4, -46.5, 'camphor']] as [number, number, TreeKind][]) planter(b, px, pz, cf, k);
  // The café terrace: a counter against the north wall, tables before it.
  {
    const [cx0, cx1, cz0, cz1] = [42, 49, A.z0, A.z0 + 2.4];
    b.box('wood:#8a6a4a', cx0, cf, cz1 - 0.6, cx1, cf + 1.05, cz1);
    b.deco('glow:#ffe9c4', cx0, cf + 1.0, cz1 - 0.62, cx1, cf + 1.05, cz1 + 0.02);
    b.deco('glow:#fff1dc', cx0, cf + 0.3, cz0 + 0.02, cx1, cf + 2.6, cz0 + 0.04);
    for (let x = cx0 + 0.4; x < cx1 - 0.3; x += 0.5) b.deco(`flat:${['#6b3a12', '#f3e2b8', '#2f4a3a'][Math.round(x * 2) % 3]}`, x, cf + 1.4, cz0 + 0.05, x + 0.3, cf + 1.7, cz0 + 0.3);
    b.box(STEEL, cx0 - 0.2, cf + 2.6, cz0, cx1 + 0.2, cf + 3.2, cz1 + 0.4);
    b.sign({ k: 'shop', ja: 'アトリウム カフェ', en: 'Atrium Café', bg: '#2f4a3a', fg: '#f2d38a' }, (cx0 + cx1) / 2, cf + 2.9, cz1 + 0.42, [0, 1], 5.6, 0.5);
    b.block(cx0, cf, cz0, cx1, cf + 1.05, cz1);
    for (const tx of [43.5, 46.5, 49.5, 52.5]) for (const tz of [-44.5, -41.5]) {
      b.box('wood:#8a6a4a', tx - 0.45, cf + 0.72, tz - 0.45, tx + 0.45, cf + 0.76, tz + 0.45);
      b.deco(DARK, tx - 0.04, cf, tz - 0.04, tx + 0.04, cf + 0.72, tz + 0.04);
      b.block(tx - 0.45, cf, tz - 0.45, tx + 0.45, cf + 0.76, tz + 0.45);
      for (const dx of [-0.8, 0.8]) b.box('flat:#f4f5f2', tx + dx - 0.22, cf + 0.42, tz - 0.22, tx + dx + 0.22, cf + 0.46, tz + 0.22);
    }
  }
  // The water wall on the west wall: sheets of water down a blue wall into a low basin.
  {
    const [z0, z1] = [-46.5, -38.5];
    b.deco('paint:#2f6f9f', A.x0, cf + 0.45, z0, A.x0 + 0.06, cf + 7.5, z1);
    for (let z = z0 + 0.2; z < z1; z += 0.4) b.deco('glow:#cfeaff', A.x0 + 0.06, cf + 0.45, z, A.x0 + 0.09, cf + 7.5, z + 0.06);
    b.box('panel:#ffffff', A.x0, cf, z0 - 0.2, A.x0 + 1.5, cf + 0.45, z1 + 0.2);
    b.deco('glow:#9fd3f0', A.x0 + 0.12, cf + 0.45, z0, A.x0 + 1.38, cf + 0.46, z1);
    for (let z = z0 + 0.5; z < z1; z += 1.2) b.deco('light', A.x0 + 0.3, cf + 0.455, z, A.x0 + 0.5, cf + 0.46, z + 0.2);
  }
  // Hanging art over the void: discs of white and blue on cables from the roof, like a wave breaking.
  for (let k = 0; k < 9; k++) {
    const x = 52 + k * 2.2, z = -45 + Math.sin(k * 0.9) * 3, y = GY + 9 + k * 1.1 + Math.sin(k * 1.7) * 1.2, r = 1.0 + (k % 3) * 0.45;
    b.mesh('metal:#cfd3d6', 'cyl', x, (y + TOP) / 2, z, 0.015, TOP - y, 0.015);
    b.mesh(k % 2 ? `paint:${BLUE}` : 'paint:#f8f8f6', 'cyl', x, y, z, r, 0.05, r);
  }
  for (const [bx, bz] of [[61, -40.6], [68, -40.6]] as [number, number][]) {
    b.box('wood:#b48a5e', bx - 1.6, cf + 0.42, bz - 0.25, bx + 1.6, cf + 0.48, bz + 0.25);
    b.block(bx - 1.6, cf, bz - 0.25, bx + 1.6, cf + 0.48, bz + 0.25);
    for (const dx of [-1.3, 1.3]) b.deco(DARK, bx + dx - 0.05, cf, bz - 0.2, bx + dx + 0.05, cf + 0.42, bz + 0.2);
  }
  // Pendant lights hung from the roof in a grid, and up-lights along the walls' foot.
  for (let x = A.x0 + 6; x < A.x1 - 2; x += 6) for (let z = A.z0 + 6; z < A.z1 - 2; z += 8) {
    const yb = GY + 11;
    b.mesh('metal:#cfd3d6', 'cyl', x, (yb + TOP) / 2, z, 0.02, TOP - yb, 0.02);
    b.mesh('light', 'sphere', x, yb - 0.3, z, 0.7, 0.7, 0.7);
  }
  for (let x = A.x0 + 1.5; x < A.x1 - 1; x += 3) b.deco('glow:#eaf3ff', x - 0.3, cf + 0.01, A.z0 + 0.05, x + 0.3, cf + 0.08, A.z0 + 0.35);

  // Way-finding at street level: a totem on the east landing, and "to trains" over the first escalators' head.
  b.box('panel:#ffffff', A.x1 - 1.2, GY, -31.4, A.x1 - 0.3, GY + 2.7, -27.6);
  b.sign(toTrains, A.x1 - 1.21, GY + 2.1, -29.5, [-1, 0], 3.6, 0.5);
  b.sign({ k: 'guide', ja: '2階 デッキ・ベイウォーク方面', en: 'Deck level: to the Baywalk', bg: 'white', arrow: 'up' }, A.x1 - 1.21, GY + 1.45, -29.5, [-1, 0], 3.6, 0.42);

  // ═════════ Zones ═════════
  b.zone('concourse', A.x0, cf - 0.2, A.z0, A.x1, cf + 4.2, A.hallZ, 'みなとセンター アトリウム', 'Minato Center Atrium');
  b.zone('passage', A.x0, GY - 0.2, A.sb, A.x1, GY + 3.0, A.z1, 'アトリウム 1階', 'Atrium, street level');
  b.zone('passage', A.x0, DY - 0.2, A.dz0, A.dx1, DY + 3.0, A.z1, 'アトリウム 2階 デッキ階', 'Atrium, deck level');
}
