// Aizomechō's headhouse (藍染町駅舎): the station's building on the dyers' street, with the ticket
// hall and the gates at street level inside it.
//
// The concourse under Tsumugi-dōri has a gate line at its east end only. At its west end a doorway
// in the north wall (HH.gap) opens on a paid corridor running north under the pavement into the
// headhouse's basement, where a stair between two escalators climbs north into the hall; a lift
// beside the stair's foot serves the same two floors. The hall is the whole ground floor of the
// house: the stair's well and the lift on the paid side (east), the gate line across the middle,
// ticket machines on the north wall and the great doorway onto Aigame-suji on the unpaid side.
//
// The outside is a Blender model (tools/blender/build_aizome.py `ekisha`, placed by
// aizomecho-street.ts); everything inside is built here. Station frame: +x east, +z south.

import { linesAt } from '../data/network';
import type { Builder, V2 } from '../world/builder';
import { ceilingLight, escalator, gateLine, GROUND_Y, rail, stairs, ticketMachines, type Ctx } from './kit';
import { lift } from './lift';
import { lookFor } from './looks';
import { clothRow, crest, lattice } from './looks/aizomecho';

export const HH = {
  /** The lot: 20 m deep east of the dyers' street, 26 m along it (build_aizome.py EK_D, EK_W). */
  x0: -59.5, x1: -39.5, z0: -45.5, z1: -19.5,
  /** The doorway in the concourse's north wall, which is also the corridor's and the stairwell's width. */
  gap: [-44.6, -40.0] as [number, number],
  /** Where the stair's foot stands, and the gate line. */
  foot: -21, gate: -51.5,
  /** The great doorway in the west front (build_aizome.py EK_DOOR), and the exit's number. */
  door: [-35.1, -29.9] as [number, number], num: '3',
};
const TIMBER = 'wood:#3b2a1e', PLASTER = 'paint:#ece4d2', BOARD = 'wood:#5a4030', TILE = 'tile:#24407a', INDIGO = '#24407a', CREAM = '#f1ead8';
/** Height of the hall under its board ceiling, and of the beam the gates' signs hang from. */
const HALL_H = 7.0, BEAM = 3.3;

/** The quarter turn that takes the local direction `from` to the frame's `to`. */
function turn(b: Builder, from: V2, to: V2): 0 | 1 | 2 | 3 {
  for (const k of [0, 1, 2, 3] as const) {
    let ok = false;
    b.with({ rot: k }, () => {
      const d = b.dir(from);
      ok = Math.abs(d[0] - to[0]) < 1e-6 && Math.abs(d[1] - to[1]) < 1e-6;
    });
    if (ok) return k;
  }
  throw new Error('headhouse: no such turn');
}

/** `cf`: the concourse floor; `cw`: its half width (the north wall's inner face is z = −cw). */
export function buildHeadhouse(c: Ctx, cf: number, cw: number) {
  const { b, station, style } = c;
  const GY = GROUND_Y;
  const fin = lookFor(station.id).finishes ?? {};
  const wall = fin.wall ?? style.concWall, floor = fin.floor ?? style.floor, ceil = fin.ceil ?? 'ceil';
  const lines = linesAt(station.id).map((l) => l.id);
  const [g0, g1] = HH.gap, W = g1 - g0;
  const run = Math.round((GY - cf) * 1.72 * 100) / 100;
  const head = HH.foot - run;
  const exitJa = `${HH.num}番出口 駅舎・藍甕筋`, exitEn = `Exit ${HH.num}: Headhouse / Aigame-suji`;

  // ── The corridor from the concourse (its ceiling as far as the structure's edge is the concourse's own) ──
  const zs = -cw - 0.4, zEdge = -14.4, top = cf + 2.8;
  b.box(floor, g0, cf - 0.5, HH.foot, g1, cf, -cw);
  b.box(wall, g1, cf, HH.foot, g1 + 0.3, cf + 3.0, zs);
  const alc = { x0: -47.5, z0: -23, z1: -18.5 }; // the lift's lobby, off the corridor's west side
  b.box(wall, g0 - 0.3, cf, alc.z1, g0, cf + 3.0, zs);
  b.box(ceil, g0 - 0.3, top, HH.foot - 0.3, g1 + 0.3, top + 0.5, zEdge);
  for (let z = -cw - 2; z > HH.foot + 2; z -= 4.2) ceilingLight(b, (g0 + g1) / 2 - 0.25, (g0 + g1) / 2 + 0.25, z - 1.2, z + 1.2, z > zEdge ? cf + 3.0 : top);
  b.deco('flat:#4b4d50', g1 - 0.02, cf, HH.foot, g1, cf + 0.13, zs);
  b.zone('passage', g0, cf - 0.2, HH.foot, g1, top, -cw, '駅舎連絡通路', 'Passage to the headhouse');
  // The corridor's dress: the indigo dado, the wave mural on the east wall, lengths drying on a rail along the west.
  for (const [xa, xb] of [[g1 - 0.012, g1], [g0, g0 + 0.012]]) {
    const zb = xa < (g0 + g1) / 2 ? alc.z1 + 0.3 : HH.foot;
    b.deco(TILE, xa, cf + 0.13, zb, xb, cf + 1.1, zs);
    b.deco(TIMBER, xa - 0.01, cf + 1.1, zb, xb + 0.01, cf + 1.16, zs);
  }
  b.sign({ k: 'mural', v: 'waves', color: INDIGO }, g1 - 0.02, cf + 1.95, (HH.foot + zs) / 2, [-1, 0], Math.abs(HH.foot - zs) - 1.6, 1.4);
  b.deco(TIMBER, g0, cf + 2.36, alc.z1 + 0.6, g0 + 0.05, cf + 2.41, zs - 0.3);
  clothRow(b, 'z', g0, alc.z1 + 0.8, zs - 0.5, cf + 2.36, cf + 1.3, 900, 1, 0.12, 0.25);
  // Over the doorway on the concourse side, and facing the concourse along its north wall.
  b.sign({ k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'up' }, (g0 + g1) / 2, cf + 2.62, -cw + 0.03, [0, 1], W - 0.4, 0.5);
  b.protect(g0, cf + 2.3, -cw - 0.4, g1, cf + 3.0, -cw + 0.3);
  b.hang({ k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'right' }, g1 + 5, cf + 2.55, -cw + 3.2, 4.2, 0.46, { ceil: cf + 3.0 });

  // ── The lift's lobby and the lift (it opens south: on the lobby below, on the hall floor beside the well above) ──
  b.box(floor, alc.x0, cf - 0.5, alc.z0, g0, cf, alc.z1);
  b.box(wall, alc.x0 - 0.3, cf, alc.z0 - 0.3, alc.x0, cf + 3.0, alc.z1 + 0.3);
  b.box(wall, alc.x0, cf, alc.z1, g0, cf + 3.0, alc.z1 + 0.3);
  b.box(wall, alc.x0, cf, alc.z0 - 0.3, g0, cf + 3.0, alc.z0);
  b.box(ceil, alc.x0 - 0.3, top, alc.z0 - 0.3, g0, top + 0.5, alc.z1 + 0.3);
  ceilingLight(b, (alc.x0 + g0) / 2 - 0.25, (alc.x0 + g0) / 2 + 0.25, alc.z0 + 1, alc.z1 - 1, top);
  const lx = (alc.x0 + g0) / 2 - 0.15;
  b.carve(lx - 0.6, cf, alc.z0 - 0.31, lx + 0.6, cf + 2.2, alc.z0 + 0.01);
  b.with({ rot: turn(b, [0, -1], [0, 1]), t: [lx, 0, alc.z0 - 0.3] }, () => lift(b, {
    mat: wall, levels: [{ y: cf, ja: 'のりば階', en: 'Concourse and trains' }, { y: GY, ja: '駅舎 1階', en: 'Headhouse, street level' }],
  }));
  b.sign({ k: 'label', text: 'エレベーター', sub: 'Lift to the headhouse', fg: '#ffffff', bg: '#1f5fae' }, g0 - 0.31, cf + 2.2, (HH.foot + alc.z1) / 2, [1, 0], 1.8, 0.4);

  // ── The stair between two escalators, climbing north into the hall ──
  const rs = turn(b, [1, 0], [0, -1]);
  let east = true;
  b.with({ rot: rs }, () => (east = b.dir([0, 1])[0] > 0));
  b.with({ rot: rs, t: [east ? g0 : g1, 0, HH.foot] }, () => {
    // (Local: +x north up the flights from the foot at 0, z across the well from 0 to W.)
    escalator(b, { x0: 0, x1: run, z0: 0.12, z1: 1.42, yLow: cf, yHigh: GY, dir: 1 });
    stairs(b, { x0: 0, x1: run, z0: 1.55, z1: 3.05, yLow: cf, yHigh: GY, mat: 'flat:#aaa79f' });
    escalator(b, { x0: 0, x1: run, z0: 3.18, z1: 4.48, yLow: cf, yHigh: GY, dir: -1 });
    for (const [z0, z1] of [[-0.3, 0], [W, W + 0.3]]) b.box(wall, 0, cf - 0.5, z0, run + 0.3, GY - 0.01, z1);
    b.box(wall, run, cf - 0.5, 0, run + 0.3, GY - 0.01, W);
    b.hole(0, 0, run, W);
    // The well's rail in the hall: both long sides and over the foot.
    rail(b, -0.08, -0.08, run, 0, GY);
    rail(b, -0.08, W, run, W + 0.08, GY);
    rail(b, -0.08, 0, 0, W, GY);
    // Lights down the well's walls; signs at the foot and the head.
    for (let x = 1.5; x < run - 1; x += 3) for (const z of [0.01, W - 0.03]) b.deco('light', x, cf + (GY - cf) * (x / run) + 2.2, z, x + 1.2, cf + (GY - cf) * (x / run) + 2.32, z + 0.02);
    b.hang(
      { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' }, -2.2, cf + 2.5, W / 2, 3.6, 0.44,
      { ceil: top, back: { k: 'guide', ja: exitJa, en: exitEn, bg: 'yellow', arrow: 'up' } },
    );
    b.hang(
      { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' }, run + 2.4, GY + 2.75, W / 2, 3.8, 0.46,
      { ceil: GY + BEAM, back: { k: 'guide', ja: '出口・きっぷうりば', en: 'Exit / Tickets', bg: 'yellow', arrow: 'up' } },
    );
    b.deco(TIMBER, run + 2.25, GY + BEAM, -3, run + 2.55, GY + BEAM + 0.3, W + 3);
    // (Named as an exit is everywhere: exits.ts lists it, and its place on the maps is this well.)
    b.zone('passage', 0, cf - 0.2, 0, run, GY + 2.4, W, `${HH.num}番出口`, `Exit ${HH.num}`);
  });

  // ── The hall: walls inside the model's, the board ceiling and its beams, the earth-coloured floor ──
  const x0 = HH.x0 + 0.02, x1 = HH.x1 - 0.02, z0 = HH.z0 + 0.02, z1 = HH.z1 - 0.02, T = 0.2;
  const [d0, d1] = HH.door, zc = (HH.z0 + HH.z1) / 2;
  const inner = (ax: number, az: number, ex: number, ez: number, y0 = GY, y1 = GY + HALL_H) => {
    if (y0 < GY + 1.1) b.box(TILE, ax, y0, az, ex, Math.min(y1, GY + 1.1), ez);
    if (y1 > GY + 1.1) b.box(PLASTER, ax, Math.max(y0, GY + 1.1), az, ex, y1, ez);
  };
  inner(x0, z0, x0 + T, d0);
  inner(x0, d1, x0 + T, z1);
  inner(x0, d0, x0 + T, d1, GY + 2.95);
  inner(x1 - T, z0, x1, z1);
  inner(x0 + T, z0, x1 - T, z0 + T);
  inner(x0 + T, z1 - T, x1 - T, z1);
  b.box(BOARD, x0, GY + HALL_H, z0, x1, GY + HALL_H + 0.15, z1, false);
  for (let z = z0 + 2.2; z < z1 - 1; z += 3.5) b.deco(TIMBER, x0 + T, GY + HALL_H - 0.4, z - 0.15, x1 - T, GY + HALL_H, z + 0.15);
  // Timber rails round the walls at the height the old upper floor stood, and posts on the unpaid side.
  for (const [ax, az, ex, ez] of [[x0 + T, z0 + T, x1 - T, z0 + T + 0.12], [x0 + T, z1 - T - 0.12, x1 - T, z1 - T], [x0 + T, z0 + T, x0 + T + 0.12, z1 - T], [x1 - T - 0.12, z0 + T, x1 - T, z1 - T]]) {
    b.deco(TIMBER, ax, GY + 3.45, az, ex, GY + 3.75, ez);
  }
  // The floor: beaten earth's colour, in strips round the well.
  const well: [number, number, number, number] = [g0 - 0.1, head, g1 + 0.1, HH.foot + 0.1];
  for (const [ax, az, ex, ez] of [[x0 + T, z0 + T, x1 - T, well[1]], [x0 + T, well[1], well[0], z1 - T], [well[2], well[1], x1 - T, z1 - T], [well[0], well[3], well[2], z1 - T]]) {
    if (ex - ax > 0.05 && ez - az > 0.05) b.deco('flat:#857660', ax, GY + 0.002, az, ex, GY + 0.012, ez);
  }
  // Pendant lamps in three rows, lit by night and by day.
  for (const x of [x0 + 4.2, (x0 + x1) / 2 - 1.6, x1 - 7.2]) for (let z = z0 + 4.4; z < z1 - 3; z += 5.6) {
    if (x > well[0] - 1 && x < well[2] + 1 && z > well[1] - 1) continue;
    b.mesh('metal:#2b2e33', 'cyl', x, GY + (4.5 + HALL_H - 0.4) / 2, z, 0.04, HALL_H - 0.4 - 4.5, 0.04);
    b.mesh('light', 'sphere', x, GY + 4.25, z, 0.55, 0.55, 0.55);
  }

  // ── The hall's dress: the dyers' house ──
  const xw = x0 + T, xe = x1 - T, zn = z0 + T, zsth = z1 - T;
  // A timber cap on the dado; posts up the walls; tie beams across with posts to the ceiling.
  for (const [ax, az, ex, ez] of [[xw, zn, xe, zn + 0.03], [xw, zsth - 0.03, xe, zsth], [xw, zn, xw + 0.03, d0], [xw, d1, xw + 0.03, zsth], [xe - 0.03, zn, xe, zsth]]) b.deco(TIMBER, ax, GY + 1.1, az, ex, GY + 1.17, ez);
  for (let x = xw + 3.2; x < xe - 1; x += 3.2) for (const z of [zn, zsth - 0.1]) b.deco(TIMBER, x - 0.11, GY, z, x + 0.11, GY + HALL_H, z + 0.1);
  for (let z = zn + 2.2 - T; z < zsth - 1; z += 3.5) {
    for (const x of [xw, xe - 0.1]) if (x > xw || z < d0 - 0.2 || z > d1 + 0.2) b.deco(TIMBER, x, GY, z - 0.11, x + 0.1, GY + HALL_H, z + 0.11);
  }
  for (let z = zn + 2.2 - T, k = 0; z < zsth - 1; z += 3.5, k++) {
    if (k % 2) continue;
    b.deco(TIMBER, xw, GY + 4.9, z - 0.14, xe, GY + 5.25, z + 0.14);
    for (const f of [0.25, 0.5, 0.75]) b.deco(TIMBER, xw + (xe - xw) * f - 0.09, GY + 5.25, z - 0.09, xw + (xe - xw) * f + 0.09, GY + HALL_H - 0.4, z + 0.09);
  }
  // Paper-backed kōshi inside the front wall either side of the doorway, as outside.
  for (const [za, zb] of [[zn + 0.5, d0 - 0.6], [d1 + 0.6, zsth - 0.5]]) {
    b.deco('paint:#f4ecd6', xw, GY + 1.25, za, xw + 0.012, GY + 2.9, zb);
    lattice(b, 'z', xw, 1, za, zb, GY + 1.2, GY + 2.95, 0.2);
  }
  // Lengths drying on poles high across the hall, between the beams, over the heads and the signs.
  for (let z = zn + 3.95 - T, k = 0; z < zsth - 1.2; z += 3.5, k++) {
    b.deco('wood:#b9a970', xw + 0.3, GY + 6.3, z - 0.025, xe - 0.3, GY + 6.35, z + 0.025);
    clothRow(b, 'x', z, xw + 0.7, xe - 0.7, GY + 6.3, GY + 4.05 + (k % 2) * 0.5, 1000 + k * 30, 0, 0.3, 1.1);
  }
  // On the back wall, facing the doorway: the quarter's crest on indigo; the wave mural along the well.
  {
    const zc2 = (zn + well[1]) / 2, w2 = 1.7;
    b.deco(`flat:${INDIGO}`, xe - 0.03, GY + 1.5, zc2 - w2, xe, GY + 4.6, zc2 + w2);
    b.deco(TIMBER, xe - 0.06, GY + 4.6, zc2 - w2 - 0.1, xe, GY + 4.72, zc2 + w2 + 0.1);
    crest(b, 'z', xe, zc2, GY + 3.1, 1.0, -0.04, -0.03);
    b.sign({ k: 'label', text: '藍染町', sub: 'Aizomechō, the dyers’ quarter', fg: CREAM, bg: INDIGO }, xe - 0.05, GY + 1.85, zc2, [-1, 0], 2.6, 0.5);
    b.sign({ k: 'mural', v: 'waves', color: INDIGO }, xe - 0.02, GY + 2.3, (well[1] + well[3]) / 2, [-1, 0], well[3] - well[1] - 1.6, 1.9);
  }
  // Benches in the south-west corner for those waiting; a paper lantern either side of the doorway.
  for (const [ax, az, ex, ez] of [[xw + 0.6, zsth - 0.55, xw + 4.2, zsth - 0.08], [xw + 0.08, d1 + 1.0, xw + 0.55, zsth - 1.0]]) {
    b.box('wood:#6b4a30', ax, GY + 0.36, az, ex, GY + 0.44, ez);
    b.block(ax, GY, az, ex, GY + 0.44, ez);
    for (const [px, pz] of [[ax + 0.08, az + 0.08], [ex - 0.08, ez - 0.08], [ax + 0.08, ez - 0.08], [ex - 0.08, az + 0.08]]) b.deco(TIMBER, px - 0.04, GY, pz - 0.04, px + 0.04, GY + 0.36, pz + 0.04);
  }
  for (const z of [d0 - 0.45, d1 + 0.45]) {
    b.box(TIMBER, xw + 0.25, GY, z - 0.2, xw + 0.65, GY + 0.5, z + 0.2);
    b.deco('glow:#fff2d8', xw + 0.28, GY + 0.5, z - 0.17, xw + 0.62, GY + 1.4, z + 0.17);
    b.deco(TIMBER, xw + 0.26, GY + 1.4, z - 0.19, xw + 0.64, GY + 1.45, z + 0.19);
  }
  // The other railway, a short walk from this door: Kon'yahama's station house, west along Tsumugi-dōri by the crossing.
  b.sign({ k: 'label', text: 'AR本線 紺屋浜駅 徒歩2分', sub: 'AR Main Line: Kon’yahama, 2 min on foot, west along Tsumugi-dōri', fg: '#ffffff', bg: '#14233b' }, HH.gate - 1.05, GY + 1.75, zn + 0.02, [0, 1], 1.7, 0.5);

  // ── The gate line (unpaid side west), the beam its signs hang from, ticket machines on the north wall ──
  const c2: Ctx = { ...c, style: { ...style, concWall: TIMBER } };
  b.deco(TIMBER, HH.gate - 0.18, GY + BEAM, z0 + T, HH.gate + 0.18, GY + BEAM + 0.35, z1 - T);
  b.deco(TIMBER, HH.gate - 1.5, GY + 3.0, z0 + T, HH.gate - 1.1, GY + BEAM, z1 - T);
  b.with({ rot: 2, mz: true, t: [HH.gate, 0, zc] }, () => gateLine(c2, GY, (z1 - z0) / 2 - T, lines, BEAM));
  ticketMachines(c2, GY, x0 + 0.7, z0 + T, 5);
  // The doorway: the exit's number inside, the entrance sign outside under the eaves.
  b.sign({ k: 'guide', ja: `出口 藍甕筋`, en: 'Exit: Aigame-suji', bg: 'yellow', num: HH.num }, x0 + T + 0.02, GY + 3.2, zc, [1, 0], 3.0, 0.5);
  b.sign({ k: 'entrance', station: station.id, exit: HH.num }, HH.x0 - 0.27, GY + 3.34, zc, [-1, 0], 2.9, 0.6);
  b.zone('concourse', x0 + T, GY - 0.2, z0 + T, x1 - T, GY + 3.2, z1 - T, `${station.nameJa}駅舎 改札`, 'Headhouse — ticket hall');
}
