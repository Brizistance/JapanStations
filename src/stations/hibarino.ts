// Hibarino (雲雀野) station building: the 2000s rebuild under the Nagisa Line's viaduct (2026-11; the
// streets round it are hibarino-street.ts). A glass and sky-blue hall with two full fronts: the south
// one on the forecourt and the rotary, the north one on Saezuri-dōri. A public free passage runs
// through between them; the ticket gates open off its east side into the paid hall with the stairs and
// lifts to the Nagisa platforms and the stair down to the Kikyō Line's B1 link, done in that line's
// colours. West of the passage: the kiosk, the ticket office, machines, lockers and toilets.
//
// Frame: +x east along the viaduct, +z south. The building: x −34 … 26, z −13 … 9. Platforms (unchanged)
// above the deck; the viaduct's piers stand through the hall at z ±4.6.
//
//   free passage   x −21.15 … −7.1, z −13 … 9: 南口 South Exit at z 9, 北口 North Exit at z −13
//   gates          x −3.9 (unpaid west); station office on the gate line (x −6.9 … −0.9)
//   paid hall      Nagisa stairs x 8 … 20.6 at the platform bands; lifts x 1.5 … 3.8, doors west;
//                  the Kikyō stair at x 8 … 15.5, z ±2; waiting room x 17.5 … 25.7, z −4 … 4
//   west hall      kiosk x −26.15 … −21.15, z 0.8 … 8.8 and the ticket office north of it (z −4 … 0.6), both open
//                  east on the passage; toilets x −34 … −28.6, z −5.4 … 3.4 (door east, reached down the walk behind
//                  the office); lockers beside its door; the south-west corner for the exits board;
//                  machines x −27.7 … −22 at z −8.5; drinks machines on the bakery's east wall
//   north annex    bakery x −34 … −26, z −13 … −8.5 and flower stand x −1 … 7, z −13 … −10, both open north

import type { LineDef } from '../data/types';
import { HALL_HALF } from '../sim/geometry';
import { MIRROR_X, underLine } from './build';
import { BLDG, hibarinoStreet } from './hibarino-street';
import { ceilingLight, gateLine, hall, hallDims, rail, stairs, ticketMachines, vending, type Ctx, type StationStyle } from './kit';
import { KONBINI, konbini } from './konbini';
import { lift, LIFT_OUT } from './lift';
import type { ElevatedSpec } from './specs';
import { eraOf } from './fittings';
import { themeFor } from './themes';
import { toilets, WC } from './toilets';
import { wayfindElevated } from './wayfinding';

type Rect = [number, number, number, number];

/** The building and its parts (frame x, z). */
export const HIBARINO = {
  bldg: BLDG,
  /** Its east edge stops short of the gate office, which stands out 1 m west of the gate line (kit.ts gateLine). */
  passage: [-21.15, -7.1] as [number, number],
  /** The gate line, its office (x −6.9 … −0.9) clear of the pier at x 0, z 4.6. */
  gateX: -3.9,
  /** The kiosk faces east onto the passage (clear of the pier at x −27, z 4.6). */
  kiosk: [-26.15, 0.8, -21.15, 8.8] as Rect,
  /** The ticket office north of the kiosk, its window on the passage. */
  office: [-26.15, -4, -21.15, 0.6] as Rect,
  /** Door on the east side at z −1: clear of the pier at x −27, z −4.6. */
  toilets: [-34, -5.4, -28.6, 3.4] as Rect,
  bakery: [-34, -13, -26, -8.5] as Rect,
  flowers: [-1, -13, 7, -10] as Rect,
  waiting: [17.5, -4, 25.7, 4] as Rect,
  /** Canopies over the forecourt (south) and the north plaza. */
  canopyS: [-30, 9, 4.5, 13.2] as Rect, // (stops short of the deck's lift, hibarino-street.ts)
  canopyN: [-30, -16.5, 6, -13] as Rect,
};

/** The Kikyō Line's own colours for its B1 link (themes/k.ts: violet on pale lilac). */
const KIKYO_STYLE = (base: StationStyle, line: LineDef): StationStyle => ({
  ...base, wall: 'panel:#d9cce8', concWall: 'panel:#d4c4e6', floor: 'floor:#b9b0c6', accent: line.color, mural: { v: 'bellflower', color: line.color },
});

// The meadow: wheat enamel, honey tile (spec), timber soffits and slats, sky-blue fins, a meadow-green kick.
const GLASS = 'glass', FIN = 'flat:#5aa0d8', FIN_DK = 'flat:#3f7fb4', PANEL = 'panel:#ead7a5', FRAME = 'flat:#f3ead2', SOFFIT = 'wood:#b8875a';
/** lamps.ts INDOOR_LAMP: a glow that lights round it at night. */
const NIGHT = 'glow:#ffe6b8';
const TIMBER = 'wood:#c49a64', SLAT = 'wood:#b8875a', MEADOW = 'flat:#6f9a4f';

export function buildHibarino(c: Ctx, spec: ElevatedSpec, under: { ctx: Ctx; dir: [number, number]; primaryDir: [number, number] }) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf, fl = 0.2, top = railY - 1.3;
  const run = Math.round((pf - fl) * 1.7 * 100) / 100;
  const sx0 = 8, sx1 = sx0 + run;
  const holeZ0 = d.wallZ - 2.62;
  const [X0, Z0, X1, Z1] = HIBARINO.bldg;
  const [P0, P1] = HIBARINO.passage;
  const lines = [line.id, under.ctx.line.id];
  const e = eraOf(themeFor(line.id).opened ?? 2000);

  // ── The Kikyō Line underneath, its B1 link in its own colours ──
  const holeM = underLine({ ...c, style: KIKYO_STYLE(style, under.ctx.line) }, under, fl);

  // ── Lifts to each Nagisa platform: west of the stairs' feet, well clear of their tops, doors facing west ──
  const LX0 = 1.5, LX1 = LX0 + LIFT_OUT.d, liftZ = (s: 1 | -1) => s * (d.wallZ - 1.3);
  const liftHoles: Rect[] = ([1, -1] as const).map((s) => [LX0 - 0.05, liftZ(s) - LIFT_OUT.hw - 0.05, LX1 + 0.05, liftZ(s) + LIFT_OUT.hw + 0.05]);

  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pf + 3.3, emit: false }],
    blocks: [[LX0 - 0.5, LX1 + 0.5], [sx0, sx1]],
    elevated: true,
    platHoles: [[sx0, holeZ0, sx1, d.wallZ + 0.01], [sx0, -d.wallZ - 0.01, sx1, -holeZ0], ...liftHoles],
  });
  for (const s of [1, -1] as const) {
    b.with({ rot: 3, t: [LX0, 0, liftZ(s)] }, () => lift(b, {
      levels: [{ y: fl, ja: '改札階', en: 'Concourse' }, { y: pf, ja: `${station.platforms[line.id][s > 0 ? 1 : 0]}番のりば`, en: `Platform ${station.platforms[line.id][s > 0 ? 1 : 0]}` }],
      mat: 'metal:#c9d3da',
    }));
  }

  // ── Floor, piers, the ceiling under the deck and the roof where the building reaches past it ──
  b.slab(style.floor, X0, Z0, X1, Z1, 0.1, fl, [holeM]);
  for (let x = -54; x <= 54; x += 13.5) {
    for (const z of [-4.6, 4.6]) b.box('concrete', x - 0.55, 0, z - 0.55, x + 0.55, top, z + 0.55);
    if (x + 0.7 < sx0 - 0.5 || x - 0.7 > sx1 + 0.5) b.deco('concrete', x - 0.7, top - 0.9, x > X0 && x < X1 ? Z0 : -9, x + 0.7, top, x > X0 && x < X1 ? Z1 : 9);
  }
  // Where the building runs out from under the platforms (north of −wallZ, south of +wallZ): its own roof.
  b.box('flat:#d9dcdf', X0 - 0.3, top, Z0 - 0.3, X1 + 0.3, top + 0.6, -d.wallZ);
  b.box('flat:#d9dcdf', X0 - 0.3, top, d.wallZ, X1 + 0.3, top + 0.6, Z1 + 0.3);
  b.deco(FIN, X0 - 0.35, top + 0.6, Z0 - 0.35, X1 + 0.35, top + 0.9, Z0 - 0.05);
  b.deco(FIN, X0 - 0.35, top + 0.6, Z1 + 0.05, X1 + 0.35, top + 0.9, Z1 + 0.35);
  // The timber slat ceiling 1 m under the deck (cross beams hidden above it), open over the stairs and lifts.
  const CY = top - 1.0;
  const shafts: Rect[] = ([1, -1] as const).flatMap((s): Rect[] => {
    const za = s > 0 ? holeZ0 - 0.3 : -d.wallZ - 0.1, ze = s > 0 ? d.wallZ + 0.1 : -holeZ0 + 0.3;
    return [[sx0 - 0.3, za, sx1 + 0.3, ze], [LX0 - 0.3, za, LX1 + 0.3, ze]];
  });
  b.slab('flat:#3a2f24', X0, Z0, X1, Z1, CY + 0.25, CY + 0.3, shafts, false);
  for (let z = Z0 + 0.3; z < Z1 - 0.1; z += 0.45) {
    const cuts = shafts.filter((q) => z > q[1] && z < q[3]).map((q): [number, number] => [q[0], q[2]]).sort((p, q) => p[0] - q[0]);
    let from = X0;
    for (const [a, e2] of [...cuts, [X1, X1] as [number, number]]) {
      if (a - from > 0.2) b.deco(SLAT, from, CY + 0.1, z - 0.07, a, CY + 0.25, z + 0.07);
      from = Math.max(from, e2);
    }
  }
  for (let x = X0 + 2; x + 2.4 < X1; x += 4.5) for (const z of [-11, -5.5, 0, 5.5]) {
    if (((x + 2.4 > sx0 - 0.5 && x < sx1 + 0.5) || (x + 2.4 > LX0 - 0.5 && x < LX1 + 0.5)) && Math.abs(z) > 4) continue;
    if (x > holeM[0] - 2.5 && x < holeM[2] + 0.5 && Math.abs(z) < 3) continue;
    ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, CY + 0.1);
  }
  // The piers inside the hall: timber to the head of a door, sky blue above.
  for (let x = -54; x <= 54; x += 13.5) {
    if (x < X0 + 1 || x > X1 - 1) continue;
    for (const z of [-4.6, 4.6]) {
      b.deco(TIMBER, x - 0.6, fl, z - 0.6, x + 0.6, fl + 2.8, z + 0.6);
      b.deco(FIN, x - 0.58, fl + 2.8, z - 0.58, x + 0.58, CY + 0.1, z + 0.58);
    }
  }

  // ── The walls: glass fronts north and south with the doors on the passage, panel ends ──
  const front = (z: number, s: 1 | -1, open: [number, number][] = []) => {
    // s: the way it faces out. Glass between sky-blue fins, a frame band at the foot and the head.
    const z0 = s > 0 ? z - 0.15 : z, z1 = s > 0 ? z : z + 0.15;
    const glassRun = (x0: number, x1: number) => {
      b.block(x0, fl, z0, x1, top, z1);
      b.deco(GLASS, x0, fl + 0.4, z0 + 0.04, x1, top - 0.5, z1 - 0.04);
      b.deco(MEADOW, x0, fl, z0, x1, fl + 0.4, z1);
      b.deco(FRAME, x0, top - 0.5, z0, x1, top, z1);
    };
    // The glass, broken by the doorway and by any shop that opens straight onto the street.
    const cuts: [number, number][] = [[P0, P1] as [number, number], ...open].sort((p, q) => p[0] - q[0]);
    let from = X0;
    for (const [a, e2] of cuts) {
      if (a - from > 0.1) glassRun(from, a);
      from = Math.max(from, e2);
    }
    if (X1 - from > 0.1) glassRun(from, X1);
    // Over the doorway: a glass transom and the station's name.
    b.deco(GLASS, P0, fl + 3.2, z0 + 0.04, P1, top - 0.5, z1 - 0.04);
    b.deco(FRAME, P0, fl + 3.0, z0, P1, fl + 3.2, z1);
    b.deco(FRAME, P0, top - 0.5, z0, P1, top, z1);
    for (let x = X0; x <= X1 + 0.01; x += 3) {
      if (cuts.some(([a, e2]) => x > a + 0.3 && x < e2 - 0.3)) continue;
      b.box(FIN, x - 0.12, fl, s > 0 ? z : z - 0.7, x + 0.12, top + 0.9, s > 0 ? z + 0.7 : z);
    }
  };
  front(Z1, 1);
  front(Z0, -1, [[HIBARINO.bakery[0] + 0.15, HIBARINO.bakery[2] - 0.15], [HIBARINO.flowers[0] + 0.15, HIBARINO.flowers[2] - 0.15]]);
  b.box(PANEL, X0 - 0.2, fl, Z0, X0, top, Z1);
  b.box(PANEL, X1, fl, Z0, X1 + 0.2, top, Z1);
  // Canopies: a thin white blade on steel arms, its soffit lit, the name along its edge.
  for (const [[x0, z0, x1, z1], s] of [[HIBARINO.canopyS, 1], [HIBARINO.canopyN, -1]] as [Rect, 1 | -1][]) {
    const y = fl + 3.6;
    b.deco(SOFFIT, x0, y, z0, x1, y + 0.25, z1);
    b.deco(FIN_DK, x0, y + 0.25, z0, x1, y + 0.32, z1);
    const edge = s > 0 ? z1 : z0;
    b.deco(FIN, x0, y - 0.05, Math.min(edge, edge + s * 0.1), x1, y + 0.35, Math.max(edge, edge + s * 0.1));
    for (let x = x0 + 1; x < x1; x += 3.2) b.deco('light', x, y - 0.03, (z0 + z1) / 2 - 0.15, x + 1.6, y, (z0 + z1) / 2 + 0.15);
    // At night the soffit lights the pavement under it (flat glow discs in the light strips: lamps.ts INDOOR_LAMP).
    for (let x = x0 + 4; x < x1 - 2; x += 7) b.mesh(NIGHT, 'sphere', x + 0.8, y - 0.04, (z0 + z1) / 2, 0.6, 0.02, 0.25);
  }
  // And the hall: a glow disc in every other ceiling light, so the building reads bright from the street.
  for (let x = X0 + 4; x < X1 - 2; x += 9) for (const z of [-5.5, 5.5]) b.mesh(NIGHT, 'sphere', x, CY + 0.06, z, 0.6, 0.02, 0.25);
  b.sign({ k: 'entrance', station: station.id, exit: '南口' }, (P0 + P1) / 2, fl + 4.6, Z1 + 0.37, [0, 1], 10, 1.1);
  b.sign({ k: 'entrance', station: station.id, exit: '北口' }, (P0 + P1) / 2, fl + 4.6, Z0 - 0.37, [0, -1], 10, 1.1);

  // ── Gates: the line across the hall at x −3.9, unpaid to the west; machines, the fare map ──
  const zc = (Z0 + Z1) / 2, half = (Z1 - Z0) / 2;
  b.with({ ...MIRROR_X, t: [HIBARINO.gateX, 0, zc] }, () => gateLine(c, fl, half, lines, top - fl));
  ticketMachines(c, fl, -27.5, -8.5, 5);
  // The wall the machines and their fare map stand against, from the toilets' corner to the passage.
  b.box(PANEL, HIBARINO.toilets[2], fl, -8.65, P0, top, -8.5);

  // ── West hall: the kiosk, the ticket office, lockers, toilets ──
  {
    const [kx0, kz0, kx1, kz1] = HIBARINO.kiosk;
    b.with({ rot: 1, t: [kx1, fl, (kz0 + kz1) / 2] }, () => konbini(b, { type: 'kiosk', chain: 'asanagi', y: 0 }));
    if (Math.abs(kz1 - kz0 - KONBINI.kiosk.w) > 0.01 || Math.abs(kx1 - kx0 - KONBINI.kiosk.d) > 0.01) throw new Error('hibarino: the kiosk lot no longer fits konbini.ts KONBINI.kiosk');
    // The ticket office: panel walls, its counter window east onto the passage.
    const [ox0, oz0, ox1, oz1] = HIBARINO.office;
    b.box(PANEL, ox0, fl, oz0, ox1, top - 1.6, oz0 + 0.15);
    b.box(PANEL, ox0, fl, oz1 - 0.15, ox1, top - 1.6, oz1);
    b.box(PANEL, ox0, fl, oz0, ox0 + 0.15, top - 1.6, oz1);
    b.box('flat:#c9ced2', ox1 - 0.6, fl, oz0 + 0.15, ox1, fl + 1.0, oz1 - 0.15);
    b.deco(GLASS, ox1 - 0.05, fl + 1.0, oz0 + 0.35, ox1, fl + 2.4, oz1 - 0.35);
    b.box(PANEL, ox1 - 0.15, fl + 2.4, oz0, ox1, top - 1.6, oz1);
    b.block(ox1 - 0.6, fl, oz0, ox1, top, oz1);
    b.sign({ k: 'label', text: 'きっぷうりば・定期券', sub: 'Tickets & passes', fg: '#ffffff', bg: '#3f7fb4' }, ox1 + 0.02, fl + 2.7, (oz0 + oz1) / 2, [1, 0], 3.6, 0.5);
    // Coin lockers on the toilets' front wall south of their door, facing east.
    for (let k = 0; k < 2; k++) {
      const z = 0.9 + k * 1.0, x = HIBARINO.toilets[2];
      b.box('flat:#3f7fb4', x, fl, z, x + 0.55, fl + 1.9, z + 0.98);
      for (let j = 0; j < 4; j++) b.deco('flat:#e9ecef', x + 0.56, fl + 0.12 + j * 0.45, z + 0.06, x + 0.57, fl + 0.5 + j * 0.45, z + 0.92);
    }
    b.sign({ k: 'label', text: 'コインロッカー', sub: 'Coin lockers', fg: '#ffffff', bg: '#3f7fb4' }, HIBARINO.toilets[2] + 0.58, fl + 2.15, 1.9, [1, 0], 2.0, 0.4);
    // The station map, area map and exits on real walls: the bakery's back, the ticket office's east side.
    b.sign({ k: 'stationmap', station: station.id }, -32.6, fl + 1.5, HIBARINO.bakery[3] + 0.02, [0, 1], 2.2, 1.5);
    b.sign({ k: 'areamap', station: station.id }, -30.0, fl + 1.5, HIBARINO.bakery[3] + 0.02, [0, 1], 2.2, 1.5);
    b.sign({ k: 'exits', station: station.id }, HIBARINO.kiosk[0] - 0.02, fl + 1.5, 7.0, [-1, 0], 2.0, 1.3);
    // Toilets behind the west wall's line: their doorway faces east on the passage's side.
    const [tx0, tz0, tx1, tz1] = HIBARINO.toilets, tzc = (tz0 + tz1) / 2;
    b.with({ rot: 3, t: [tx1, 0, tzc] }, () => toilets(b, { cf: fl, era: e, wall: PANEL }));
    b.box(PANEL, tx1 - 0.4, fl, tz0, tx1, top, tzc - WC.door - 0.3);
    b.box(PANEL, tx1 - 0.4, fl, tzc + WC.door + 0.3, tx1, top, tz1);
    b.box(PANEL, tx1 - 0.4, fl + 2.4, tzc - WC.door - 0.3, tx1, top, tzc + WC.door + 0.3);
    b.box(PANEL, tx0, fl + 2.7, tz0, tx1, top, tz1);
    b.sign({ k: 'label', text: 'トイレ', sub: 'Toilets', fg: '#ffffff', bg: '#3f4a50' }, tx1 + 0.02, fl + 2.7, tzc, [1, 0], 1.8, 0.45);
    vending(b, -25.4, fl, -12.2, [1, 0], 'vending');
    vending(b, -25.4, fl, -11.0, [1, 0], 'vending2');
  }

  // ── North annex: the bakery and the flower stand, open to the plaza ──
  const shopUnit = ([x0, z0, x1, z1]: Rect, ja: string, en: string, bg: string, goods: string[]) => {
    b.box(PANEL, x0, fl, z1 - 0.15, x1, top, z1);
    b.box(PANEL, x0, fl, z0, x0 + 0.15, top, z1);
    b.box(PANEL, x1 - 0.15, fl, z0, x1, top, z1);
    b.box(PANEL, x0, fl + 3.2, z0, x1, top, z0 + 0.15);
    // A counter along the front with a way in at its west end; the goods out on it.
    const g0 = x0 + 2.2, g1 = x1 - 0.5;
    b.box('flat:#b9a27a', g0, fl, z0 + 0.4, g1, fl + 0.95, z0 + 1.1);
    goods.forEach((g, k) => b.deco(g, g0 + 0.2 + k * ((g1 - g0 - 0.4) / goods.length), fl + 0.95, z0 + 0.5, g0 + 0.2 + (k + 0.8) * ((g1 - g0 - 0.4) / goods.length), fl + 1.15, z0 + 1.0));
    b.deco('light', x0 + 0.5, fl + 3.1, z0 + 1.5, x1 - 0.5, fl + 3.15, z1 - 1.0);
    b.sign({ k: 'shop', ja, en, bg, fg: '#ffffff' }, (x0 + x1) / 2, fl + 3.55, z0 - 0.02, [0, -1], x1 - x0 - 0.8, 0.6);
    b.zone('concourse', x0 + 0.2, fl - 0.2, z0, x1 - 0.2, fl + 3.2, z1 - 0.2, ja, en);
  };
  shopUnit(HIBARINO.bakery, 'ベーカリー 小麦の丘', 'Komugi no Oka Bakery', '#8a5a34', ['flat:#c89a5a', 'flat:#e2c08a', 'flat:#b07a3a', 'flat:#d9b07a']);
  shopUnit(HIBARINO.flowers, '花 ひばり野', 'Hibarino Flowers', '#2f6b45', ['flat:#d94f8a', 'flat:#f2c230', 'flat:#f4f1e8', 'flat:#9fc28a', 'flat:#c8452e']);

  // ── Paid hall: the stairs up, the waiting room ──
  for (const s of [1, -1] as const) {
    b.with({ mz: s < 0 }, () => {
      stairs(b, { x0: sx0, x1: sx1, z0: d.wallZ - 2.5, z1: d.wallZ - 0.1, yLow: fl, yHigh: pf });
      rail(b, sx0 - 0.1, holeZ0 - 0.08, sx1 - 1.5, holeZ0, pf);
      rail(b, sx0 - 0.1, holeZ0 - 0.08, sx0 - 0.02, d.wallZ, pf);
      b.sign({ k: 'dir', station: station.id, line: line.id, dir: s > 0 ? 'up' : 'down', arrow: 'up' }, sx0 - 0.6, fl + 3.3, d.wallZ - 2.0, [-1, 0], 4.2, 0.5);
      b.deco('flat:#22262b', sx0 - 0.58, fl + 3.02, d.wallZ - 4.15, sx0 - 0.5, fl + 3.58, d.wallZ + 0.15);
      // Hung from the ceiling on two rods.
      for (const z of [d.wallZ - 3.7, d.wallZ - 0.3]) b.deco('metal:#7f858b', sx0 - 0.56, fl + 3.58, z - 0.02, sx0 - 0.52, top, z + 0.02);
      b.sign({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' }, sx1 + 0.4, pf + 2.6, d.wallZ - 1.3, [1, 0], 2.4, 0.42);
    });
  }
  {
    const [wx0, wz0, wx1, wz1] = HIBARINO.waiting;
    for (const [x0, z0, x1, z1] of [[wx0, wz0, wx1, wz0 + 0.1], [wx0, wz1 - 0.1, wx1, wz1]] as Rect[]) {
      b.block(x0, fl, z0, x1, fl + 2.6, z1);
      b.deco(GLASS, x0, fl + 0.1, z0, x1, fl + 2.6, z1);
    }
    b.block(wx0, fl, wz0, wx0 + 0.1, fl + 2.6, -1.0);
    b.block(wx0, fl, 1.0, wx0 + 0.1, fl + 2.6, wz1);
    b.deco(GLASS, wx0, fl + 0.1, wz0, wx0 + 0.1, fl + 2.6, -1.0);
    b.deco(GLASS, wx0, fl + 0.1, 1.0, wx0 + 0.1, fl + 2.6, wz1);
    b.deco(GLASS, wx0, fl + 2.15, -1.0, wx0 + 0.1, fl + 2.6, 1.0);
    b.deco(FRAME, wx0, fl + 2.6, wz0, wx1, fl + 2.75, wz1);
    for (const z of [wz0 + 0.9, wz1 - 0.9]) {
      b.box('flat:#3f7fb4', wx0 + 1.5, fl, z - 0.25, wx1 - 1.0, fl + 0.45, z + 0.25);
    }
    b.sign({ k: 'depAll', station: station.id }, wx1 - 0.05, fl + 1.9, 0, [-1, 0], 2.2, 1.0);
    b.sign({ k: 'label', text: '待合室', sub: 'Waiting room', fg: '#ffffff', bg: '#3f7fb4' }, wx0 - 0.02, fl + 2.45, -2.4, [-1, 0], 1.8, 0.3);
    b.zone('concourse', wx0 + 0.2, fl - 0.2, wz0 + 0.2, wx1 - 0.2, fl + 2.6, wz1 - 0.2, '待合室', 'Waiting room');
  }

  // ── Murals: the hills on the east wall, over the waiting room ──
  b.sign({ k: 'mural', ...style.mural }, X1 - 0.02, fl + 3.0, 0, [-1, 0], 12, 1.6);
  // The skylark murals facing the free passage: a full-height wall north of the gates, and the gate office's side.
  b.box(PANEL, P1 - 0.15, fl, Z0 + 0.15, P1, CY + 0.1, -6.3);
  b.sign({ k: 'mural', ...style.mural }, P1 - 0.17, fl + 0.3 + 1.8, (Z0 + 0.15 - 6.3) / 2, [-1, 0], 6.3, 3.6);
  b.deco(FIN_DK, P1 - 0.2, fl + 3.95, Z0 + 0.15, P1 - 0.15, fl + 4.05, -6.3);
  b.sign({ k: 'mural', ...style.mural }, HIBARINO.gateX - 3.02, fl + 1.5, 6.0, [-1, 0], 5.6, 2.5);

  b.zone('concourse', X0, 0, Z0, X1, top, Z1, '改札階コンコース', 'Concourse (street level)');
  b.zone('passage', P0 + 0.2, 0, Z0 + 0.2, P1 - 0.2, top, Z1 - 0.2, '雲雀野駅 自由通路', 'Hibarino free passage');
  wayfindElevated({
    b, station, line, style, fl, top, cw: 9, x0: X0, x1: X1, gateX: HIBARINO.gateX,
    stairs: ([1, -1] as const).map((s) => ({ x: sx0, z: s * (d.wallZ - 1.3), platform: station.platforms[line.id][s > 0 ? 1 : 0], dir: s > 0 ? 'up' as const : 'down' as const })),
    under: { line: under.ctx.line, platforms: [...station.platforms[under.ctx.line.id]], hole: holeM },
    entrances: [{ x: (P0 + P1) / 2, z: Z1, n: [0, 1], w: P1 - P0 }, { x: (P0 + P1) / 2, z: -9, n: [0, -1], w: P1 - P0 }], boards: false,
  });
  b.setSpawn(-13, fl, 2, [1, 0]);

  hibarinoStreet(c, spec.surface, Z1, under.primaryDir, [holeM]);
}
