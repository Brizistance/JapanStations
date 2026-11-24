// Kon'yahama's shore (紺屋浜, 2026-11-24; the owner's rules are in docs/street-design.md). After a
// pre-war Kansai shore town on a private line: one block of low houses between the railway and the old
// sea wall, the shore street along the wall, steps over it to what is left of the beach where the
// indigo dyers rinsed their cloth, and the water beyond. The edge of the map.
//
// Built in Aizomechō's street frame (+x east, +z south, origin Aizomechō's middle), which this world's
// frame (the line's: +x south, +z west) is turned and moved into: see `toAizome` below. The AR Main
// Line runs north–south at x −185; Kon'yahama's side platforms stand on it from z −220 to −52.
//
//   x −200 … −194.6  線路沿いの道, the lane along the line's west fence (Aizomechō's street draws it)
//   x −226 … −200    the shore block: two rows back to back with 裏路地 Ura-roji (x −214 … −212)
//                    between them, cut by lanes at z −195, −150, −95 and −60
//   x −234.25 … −227.75  浜通 Hama-dōri (two lanes), its east pavement to x −226
//   x −237.75 … −234.25  the promenade; the sea wall to x −239.75, the steps over it at z 0
//   x −256 …         the beach (walked to x −256), the water from x −258
//
//   z −9 … 9   紬通 Tsumugi-dōri, over the crossing to a T with Hama-dōri (10.5 m pavements to ±19.5)
//   z 95       縹通 Hanada-dōri, likewise (seen only)
//
// Landmarks: the memorial steps (紺屋浜 洗い場跡) at the end of Tsumugi-dōri with the drying frame on
// the beach; the bathhouse 紺屋湯 on Hama-dōri; 浜恵比須社, the fishermen's shrine on the corner of the
// crossing. Walked: z −235 … 19.5, west of the line. Models: tools/blender/build_konya.py.
//
// Lot table (the shore block, x −226 … −200):
//   row A, Hama-dōri side, faces west, x −226 … −214 (12 m): stock rows; the bathhouse at z −134 … −121
//   Ura-roji, x −214 … −212: open the whole way, z −235 … −19.5
//   row B, line side, faces east, x −212 … −200 (12 m): stock rows; the shrine at z −35.5 … −19.5
//   lanes 3 m wide at z −195, −150, −95, −60 cross both rows; the plot's north edge at z −235.

import { lineById, stationById } from '../data/network';
import { lineSim } from '../sim';
import type { SignContent } from '../signs/content';
import { rng, type Builder } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { KONYA } from './anchors/konya';
import { PORT } from './anchors/port';
import { SEA_Y } from '../data/geography';
import { AIZOME_PLOT, FRONT, HAN, KONYA_LOT, RW } from './aizomecho-street';
import { GROUND_Y as GY } from './kit';
import { pedSignal, roadModel, roadName, shortSignal, streetLamp, vehicleSignal } from './roads';
import { SHORE, SHORE_X } from './shore';
import { crosswalk, fillModelLots } from './surface';
import { modelTree } from './trees';

type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };

const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', LANE = 'tile:#857e73', SAND = 'flat:#cdbb93', WET = 'flat:#a8977a';
const SL = 5.2;

/** The shore's walked stretch, north to south. */
const WALK_N = -235, WALK_S = FRONT;
/** The shore block and its alley. */
const BLOCK_E = -200, ROW_A = -214, ROW_B = -212;
const LANES = [-195, -150, -95, -60];
const LANE_HALF = 1.5;
const SENTO_Z = -134;

/** Run `fn` with `b` (in Kon'yahama's own frame) turned and moved into Aizomechō's street frame. */
export function inAizome(b: Builder, fn: () => void) {
  const kon = stationById('konyahama'), aiz = stationById('aizomecho');
  // This frame is the line's: +x along it (south here), +z to its right (west). Aizomechō's: +x east, +z south.
  const t: [number, number, number] = [aiz.position.y - kon.position.y, 0, kon.position.x - aiz.position.x];
  b.with({ rot: 3, t }, () => {
    const o = b.pt(kon.position.x - aiz.position.x, 0, kon.position.y - aiz.position.y);
    const n = b.dir([0, 1]);
    if (Math.hypot(o[0], o[2]) > 0.01 || Math.abs(n[0] - 1) > 0.01) throw new Error(`inAizome: the frames do not line up (${o}, ${n})`);
    fn();
  });
}

/** Build Kon'yahama's shore into its world. `b` is in the station's own frame. */
export function konyaStreet(b: Builder) {
  inAizome(b, () => {
    shore(b);
    port(b);
  });
}

/**
 * Across the inlet: the port landfill's east quay (2026-11-24), seen from the beach and the sea wall,
 * not walked. From the water: the quay's edge at SHORE.far with bollards and moored boats, a 15 m apron
 * with two cranes on their rails and tall lamps, the quay road with parked lorries, then a row of brick
 * warehouses and steel transit sheds with the harbour office at the river-mouth end (build_port.py).
 */
function port(b: Builder) {
  const r = rng(2611);
  const EDGE = SHORE.far, APRON = EDGE - 15, ROAD = APRON - 12, FRONT_X = ROAD - 2;
  const Z0 = -486, Z1 = 50;
  const put = (id: string, face: Face, x: number, y: number, z: number, merge = false) =>
    b.with({ ...FRAME[face], t: [x, 0, z] }, () => {
      if (!merge) return b.model('port', id, 0, y, 0, 0);
      const d = b.dir([0, -1]);
      b.out.models.push({ kind: 'port', id, pos: b.pt(0, y, 0), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
    });
  // The apron in concrete, rail lines for the cranes, the quay road with its centre line.
  b.deco('flat:#b9b3a6', APRON, -0.05, Z0, EDGE - 0.6, 0.0, Z1);
  for (const x of [EDGE - 1.5, EDGE - 10.5]) b.deco('flat:#55575a', x - 0.06, 0.0, Z0, x + 0.06, 0.02, Z1);
  b.deco('asphalt', ROAD, -0.05, Z0, APRON, 0.0, Z1);
  for (let z = Z0 + 2; z + 3 < Z1; z += 6) b.deco('flat:#e9e9e4', (ROAD + APRON) / 2 - 0.07, 0.0, z, (ROAD + APRON) / 2 + 0.07, 0.006, z + 3);
  b.deco('flat:#a9a49a', FRONT_X, -0.05, Z0, ROAD, 0.1, Z1);
  // The row: the harbour office at the north end, then warehouses and sheds with lanes between.
  const row = ['soko_a', 'shed_a', 'soko_b', 'soko_c', 'shed_b', 'soko_a', 'soko_b', 'shed_a', 'soko_c', 'shed_b', 'soko_a'];
  let z = Z0 + 2;
  put('office', 'e', FRONT_X, 0, z + PORT.office.w / 2);
  z += PORT.office.w + 8;
  for (let k = 0; z < Z1 - 20; k++) {
    const id = row[k % row.length], w = PORT[id].w;
    if (z + w > Z1) break;
    put(id, 'e', FRONT_X, 0, z + w / 2);
    z += w + 6 + Math.round(r() * 4);
  }
  // On the apron: the cranes (legs astride their rails), lamps along its back, bollards along the edge.
  for (const zc of [-330, -150]) put('crane', 'e', EDGE - 9.5, 0, zc);
  for (let zz = Z0 + 10; zz < Z1; zz += 30) put('quaylamp', 'e', APRON + 0.5, 0, zz, true);
  for (let zz = Z0 + 6; zz < Z1; zz += 15) put('bollard', 'e', EDGE + 0.4, 0, zz, true);
  // Moored along the edge, afloat at the sea's level (data/geography.ts SEA_Y), and lorries parked at the road's side.
  for (const [id, zz] of [['boat_a', -400], ['barge', -250], ['boat_b', -205], ['boat_a', -60], ['barge', 10]] as const) {
    put(id, 'e', EDGE + (id === 'barge' ? 3.9 : 2.3), SEA_Y, zz);
  }
  for (const zz of [-440, -372, -290, -170, -96, -20]) put(r() < 0.5 ? 'lorry_a' : 'lorry_b', 'e', ROAD + 1.6, 0, zz + r() * 10);
}

function shore(b: Builder) {
  const r = rng(4711);
  const aiz0 = stationById('aizomecho').position;
  const xing = lineById('AR').crossings?.find((c) => c.station === 'konyahama');
  if (!xing) throw new Error('konyaStreet: no level crossing at Kon’yahama');
  // The line's centre (it runs due south here), and its fences either side.
  const X = AIZOME_PLOT.x, LINE = xing.at[0] - aiz0.x, FW = LINE - 8.1;
  const { kerbE, blockW, kerbW, wallE, wallW } = SHORE_X;
  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: SignContent) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  /** A one-off model with its front at (x, z) facing `face`. */
  const piece = (id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void, solid = true) =>
    at(face, x, z, () => {
      const a = (KONYA as Anchors)[id];
      b.model('konya', id, 0, GY, 0, 1);
      if (solid) b.block(-a.w / 2, GY, 0, a.w / 2, GY + Math.max(a.h, 3), a.d);
      fn?.(a);
    });
  const merged = (id: string, face: Face, x: number, z: number) =>
    at(face, x, z, () => {
      const d = b.dir([0, -1]);
      b.out.models.push({ kind: 'konya', id, pos: b.pt(0, GY, 0), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
    });
  /** Rows of stock street models packing a rectangle, fronts on its `face` side. */
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[]) => {
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 4.6 || f1 - f0 < 8) return;
    b.with(FRAME[face], () => fillModelLots(b, r, a, e, f0, f1 + 2.01, { noBack: true, kinds, old: true, signs: 1 }));
  };
  const LOW = ['machi', 'shophouse'];

  // ═════════════════════════ Ground ═════════════════════════
  // Walked ground is solid; the rest of the shore, north and south, is drawn only.
  const ground = (mat: string, x0: number, x1: number, y0: number, y1: number, holes: number[][] = []) => {
    b.slab(mat, x0, WALK_N, x1, WALK_S, y0, y1, holes);
    b.slab(mat, x0, SHORE.z0, x1, WALK_N, y0, y1, holes, false);
    b.slab(mat, x0, WALK_S, x1, SHORE.z1, y0, y1, holes, false);
  };
  // (The two streets' mouths are road, not pavement.)
  const mouths = [[kerbE - 1, -RW, blockW + 1, RW], [kerbE - 1, HAN.z - HAN.half, blockW + 1, HAN.z + HAN.half]];
  b.slab('asphalt', kerbW, SHORE.z0, kerbE, SHORE.z1, -0.6, 0, []);
  b.slab('asphalt', kerbE, -RW, BLOCK_E, RW, -0.6, 0, []);
  b.slab('asphalt', kerbE, HAN.z - HAN.half, BLOCK_E, HAN.z + HAN.half, -0.6, 0, [], false);
  ground('paver', kerbE, blockW, -0.6, GY, mouths);
  ground('paver', wallE, kerbW, -0.6, GY);
  b.slab('paver', blockW, -FRONT, BLOCK_E, -RW, -0.6, GY, []);
  b.slab('paver', blockW, RW, BLOCK_E, FRONT, -0.6, GY, []);
  b.slab('paver', blockW, HAN.z - HAN.half - HAN.pave, BLOCK_E, HAN.z - HAN.half, -0.6, GY, [], false);
  b.slab('paver', blockW, HAN.z + HAN.half, BLOCK_E, HAN.z + HAN.half + HAN.pave, -0.6, GY, [], false);
  // The shore block's ground (its lots, lanes and alley), walked north of Tsumugi-dōri.
  b.slab('paver', blockW, WALK_N, BLOCK_E, -FRONT, -0.6, GY, []);
  b.slab('paver', blockW, SHORE.z0, BLOCK_E, WALK_N, -0.6, GY, [], false);
  b.slab('paver', blockW, FRONT, BLOCK_E, HAN.z - HAN.half - HAN.pave, -0.6, GY, [], false);
  b.slab('paver', blockW, HAN.z + HAN.half + HAN.pave, BLOCK_E, SHORE.z1, -0.6, GY, [], false);
  // The lane along the line (Aizomechō's street draws it) and Tsumugi-dōri over the crossing are walked here.
  b.block(BLOCK_E, -0.6, WALK_N, -194.4, 0, WALK_S);
  {
    const ar = lineSim('AR').geom, aiz = stationById('aizomecho');
    const ry = ar.railY(ar.path.project(LINE + aiz.position.x, aiz.position.y).s);
    const tracks = lineById('AR').trackOffset + 2.2;
    b.block(BLOCK_E, -0.6, -FRONT, -X + 0.5, 0, FRONT);
    for (const s of [-1, 1]) b.block(BLOCK_E, -0.6, Math.min(s * RW, s * FRONT), -X + 0.5, GY, Math.max(s * RW, s * FRONT));
    b.block(LINE - tracks - 3.6, -0.6, -RW - 2.5, LINE + tracks + 3.6, ry * 0.4, RW + 2.5);
    b.block(LINE - tracks - 0.6, -0.6, -RW - 2.5, LINE + tracks + 0.6, Math.max(0.02, ry - 0.03), RW + 2.5);
  }
  // The sea wall, the beach and the water.
  b.block(wallW, -0.6, WALK_N, wallE, GY + 2.3, -3.5);
  b.block(wallW, -0.6, 3.5, wallE, GY + 2.3, WALK_S);
  b.slab(SAND, SHORE.beach, WALK_N, wallW, WALK_S, -0.6, 0.0, []);
  b.slab(SAND, SHORE.water + 4, SHORE.z0, wallW, WALK_N, -0.6, 0.0, [], false);
  b.slab(SAND, SHORE.water + 4, WALK_S, wallW, SHORE.z1, -0.6, 0.0, [], false);
  b.deco(SAND, SHORE.water + 4, -0.6, WALK_N, SHORE.beach, 0.0, WALK_S);
  b.deco(WET, SHORE.water, -1.5, SHORE.z0, SHORE.water + 4, -0.01, SHORE.z1); // down into the sea (SEA_Y)
  // (The inlet beyond, its far quay and the sea are the backdrop's: render/water.ts, data/geography.ts.)
  b.zone('street', SHORE.beach + 0.3, -0.3, WALK_N + 1, wallW - 0.2, 6, WALK_S - 1, '紺屋浜', 'Kon’yahama beach', true);
  b.zone('street', wallE + 0.2, -0.3, WALK_N + 1, kerbW - 0.2, 6, -RW - 4, '浜通 遊歩道', 'Hama-dōri — the sea wall promenade', true);

  // The edge of what is walked: north across the shore and the line's fence, south along Tsumugi-dōri's
  // building line, the beach's far side, the line's fence where no platform stands, and the line's own
  // ground past the crossing (the lane on its east side ends at the station house).
  b.block(SHORE.beach - 0.3, -1, WALK_N - 0.3, FW, 60, WALK_N);
  b.block(SHORE.beach - 0.3, -1, WALK_S, -X, 60, WALK_S + 0.3);
  b.block(SHORE.beach - 0.3, -1, WALK_N, SHORE.beach, 60, WALK_S);
  b.block(FW - 0.3, -1, WALK_N, FW, 60, -220);
  b.block(FW - 0.3, -1, -52, FW, 60, -FRONT - 0.3);
  b.block(FW - 0.3, -1, -FRONT - 0.3, -175.9, 60, -FRONT); // (east of it, the station's forecourt: rail.ts konyaHouse)
  // The lane along the east fence, between it and Aizomechō's west edge, walked from the north edge to the
  // station house (it was drawn but had no ground: the owner fell through it).
  const FE = LINE + 9.4;
  b.block(FE, -0.6, WALK_N, -X, 0, KONYA_LOT[1]);
  b.block(FE, -1, WALK_N - 0.3, -X, 60, WALK_N);
  b.block(FE - 0.3, -1, WALK_N, FE, 60, -220);
  b.block(FW, -1, WALK_N - 0.3, FE, 60, WALK_N); // (across the line: its trackbed is walked to here, rail.ts)
  b.keepOut(LINE - 5.5, 0.2, -218, LINE + 5.5, 2, -24, 'the AR Main Line\'s tracks');

  // ═════════════════════════ Tsumugi-dōri to the T, and the T ═════════════════════════
  {
    // Lane lines: the centre line, lane lines, the stop line for westbound traffic; the kerbs.
    for (let x = kerbE + 9; x < BLOCK_E - 2; x += 6) {
      for (const z of [-RW / 2, RW / 2]) b.deco(WHITE, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
    }
    b.deco(YELLOW, kerbE + 8, 0.004, -0.08, BLOCK_E, 0.01, 0.08);
    for (const s of [-1, 1]) b.deco('flat:#b9b3a6', kerbE, 0, s * RW - 0.15, BLOCK_E, GY + 0.01, s * RW + 0.15);
    for (const x of [kerbE + 6, kerbE + 21]) for (const s of [-1, 1]) modelTree(b, 'zelkova', x, s * (RW + 1.5), 'b', GY, false);
    for (const s of [-1, 1]) roadModel(b, 'lamp_led', kerbE + 14, GY, s * (RW + 0.8), [0, -s]);
    tee(b, 0, RW, { ja: '紺屋浜', en: 'Kon’yahama' }, true);
    tee(b, HAN.z, HAN.half, { ja: '縹浜', en: 'Hanada-hama' }, false);
    // Hanada-dōri's short stretch (seen only).
    for (const s of [-1, 1]) b.deco('flat:#b9b3a6', kerbE, 0, HAN.z + s * HAN.half - 0.15, BLOCK_E, GY + 0.01, HAN.z + s * HAN.half + 0.15);
    b.deco(YELLOW, kerbE + 8, 0.004, HAN.z - 0.08, BLOCK_E, 0.01, HAN.z + 0.08);
    b.zone('street', kerbW + 0.2, -0.3, -FRONT + 0.3, BLOCK_E - 0.2, 8, FRONT - 0.3, '紬通 紺屋浜', 'Tsumugi-dōri at Kon’yahama', true);
  }

  // ═════════════════════════ Hama-dōri ═════════════════════════
  {
    // A dashed centre line, the kerbs, lamps on the east pavement and along the wall.
    for (let z = SHORE.z0 + 2; z < SHORE.z1 - 3; z += 8) {
      if (Math.abs(z) < RW + 8 || Math.abs(z - HAN.z) < HAN.half + 8) continue;
      b.deco(WHITE, SHORE.c - 0.07, 0.004, z, SHORE.c + 0.07, 0.01, z + 4);
    }
    for (const x of [kerbE, kerbW]) {
      const spans: [number, number][] = x === kerbE
        ? [[SHORE.z0, -RW], [RW, HAN.z - HAN.half], [HAN.z + HAN.half, SHORE.z1]]
        : [[SHORE.z0, SHORE.z1]];
      for (const [z0, z1] of spans) b.deco('flat:#b9b3a6', x - 0.15, 0, z0, x + 0.15, GY + 0.01, z1);
    }
    for (let z = SHORE.z0 + 10; z < SHORE.z1 - 5; z += 24) {
      if (Math.abs(z) < FRONT + 3 || Math.abs(z - HAN.z) < 12) continue;
      if (LANES.some((q) => Math.abs(z - q) < 3)) continue;
      streetLamp(b, 'lamp_small', blockW + 0.45, z, [-1, 0]);
      streetLamp(b, 'lamp_shop', wallE + 0.45, z + 12, [1, 0]);
    }
    b.zone('street', kerbW + 0.2, -0.3, WALK_N + 1, blockW - 0.2, 8, -RW - 4, '浜通', 'Hama-dōri', true);
  }

  // ═════════════════════════ The sea wall and the steps over it ═════════════════════════
  {
    for (let z = -3.5; z - 6 >= SHORE.z0; z -= 6) merged(['seawall_a', 'seawall_b', 'seawall_c'][Math.abs(Math.round(z / 6)) % 3], 'e', wallE, z - 3);
    for (let z = 3.5; z + 6 <= SHORE.z1; z += 6) merged(['seawall_a', 'seawall_b', 'seawall_c'][Math.abs(Math.round(z / 6)) % 3], 'e', wallE, z + 3);
    // The steps: a flight up from the promenade, a landing on the wall, a flight down to the beach.
    piece('seasteps', 'e', wallE, 0, (a) => {
      const hw = a.w / 2, sw = hw - 1, run = 14 * 0.3, top = GY + 2.3, P = a.pts;
      for (const s of [-1, 1]) b.block(Math.min(s * sw, s * hw), -0.6, 0, Math.max(s * sw, s * hw), GY + 3.1, a.d);
      b.ramp(-sw, 0, sw, run, GY, top, [0, 1]);
      b.block(-sw, -0.6, run, sw, top, run + 1);
      b.ramp(-sw, run + 1, sw, a.d, 0, top, [0, -1]);
      signAt(P.plaque, { k: 'label', text: '紺屋浜 洗い場跡', sub: 'Kon’yahama: where the dyers rinsed their cloth in the sea, until the wall was built in 1934', fg: '#efe6cf', bg: '#4a3f2c' });
      signAt(P.stone, { k: 'shop', ja: '紺屋浜', bg: '#b3ada0', fg: '#2a2622', vertical: true });
      b.zone('street', -sw + 0.2, GY - 0.2, 0.2, sw - 0.2, top + 3, a.d - 0.2, '紺屋浜 洗い場跡の石段', 'The dyers’ steps over the sea wall', true);
    }, false);
    // The drying frame on the beach, north of the steps; a few boats drawn up.
    piece('dryframe', 'e', wallW - 6, -9, () => {
      b.block(-3.1, 0, 0.3, 3.1, 6.2, 1.0);
    }, false);
  }

  // ═════════════════════════ The shore block ═════════════════════════
  {
    // Lanes across the block, each lit, and the alley down its middle.
    const lanes = LANES.map((z): [number, number] => [z - LANE_HALF, z + LANE_HALF]);
    const laneNames: Named[] = [
      { ja: '網干小路', en: 'Amiboshi-kōji' }, { ja: '舟入小路', en: 'Funairi-kōji' },
      { ja: '浅葱小路', en: 'Asagi-kōji' }, { ja: '藍玉小路', en: 'Aidama-kōji' },
    ];
    lanes.forEach(([z0, z1], i) => {
      b.deco(LANE, blockW, GY + 0.002, z0, BLOCK_E, GY + 0.012, z1);
      b.deco('flat:#6f6a60', blockW, GY + 0.012, (z0 + z1) / 2 - 0.08, BLOCK_E, GY + 0.016, (z0 + z1) / 2 + 0.08);
      b.zone('street', blockW + 0.3, GY - 0.2, z0 + 0.3, BLOCK_E - 0.3, GY + 6, z1 - 0.3, laneNames[i].ja, laneNames[i].en, true);
      for (const x of [blockW + 6, BLOCK_E - 6]) streetLamp(b, 'lamp_small', x, z0 + 0.35, [0, 1]);
    });
    b.deco(LANE, ROW_A, GY + 0.002, WALK_N, ROW_B, GY + 0.012, -FRONT);
    b.zone('street', ROW_A + 0.2, GY - 0.2, WALK_N + 1, ROW_B - 0.2, GY + 6, -FRONT - 0.5, '裏路地', 'Ura-roji', true);
    for (let z = WALK_N + 12; z < -FRONT - 4; z += 30) streetLamp(b, 'lamp_small', ROW_A + 0.3, z, [1, 0]);

    // The blocks between the lanes, north of Tsumugi-dōri.
    const edges = [WALK_N, ...lanes.flat(), -FRONT];
    for (let i = 0; i + 1 < edges.length; i += 2) {
      const z0 = edges[i], z1 = edges[i + 1];
      // Row A, to Hama-dōri; the bathhouse in the middle block.
      if (z0 < SENTO_Z && z1 > SENTO_Z + 13) {
        fillRect(blockW, z0 + 0.2, ROW_A, SENTO_Z - 0.3, 'w', LOW);
        fillRect(blockW, SENTO_Z + 13.3, ROW_A, z1 - 0.2, 'w', LOW);
      } else fillRect(blockW, z0 + 0.2, ROW_A, z1 - 0.2, 'w', LOW);
      // Row B, to the line; the shrine on the corner of the crossing.
      fillRect(ROW_B, z0 + 0.2, BLOCK_E, Math.min(z1, -35.5) - 0.2, 'e', LOW);
    }
    // North and south of the walked stretch, the rows go on (seen only).
    for (const [z0, z1] of [[SHORE.z0, WALK_N - 0.3], [FRONT, HAN.z - HAN.half - HAN.pave], [HAN.z + HAN.half + HAN.pave, SHORE.z1]] as [number, number][]) {
      fillRect(blockW, z0 + 0.2, ROW_A, z1 - 0.2, 'w', LOW);
      fillRect(ROW_B, z0 + 0.2, BLOCK_E, z1 - 0.2, 'e', LOW);
      if (z0 > 0) b.deco(LANE, ROW_A, GY + 0.002, z0, ROW_B, GY + 0.012, z1);
    }
  }

  // ═════════════════════════ The bathhouse ═════════════════════════
  piece('sento', 'w', blockW, SENTO_Z + 6.5, (a) => {
    const P = a.pts;
    signAt(P.name, { k: 'shop', ja: '紺屋湯', bg: '#2a2019', fg: '#efe6cf' });
    signAt(P.hours, { k: 'label', text: '営業 15:00–23:00', sub: 'Open 3 pm – 11 pm, closed Thursdays', fg: '#1f2023', bg: '#f2efe6' });
    signAt(P.chimney, { k: 'shop', ja: '紺屋湯', bg: '#f1ead8', fg: '#7d4636', vertical: true });
    b.zone('street', -a.w / 2, GY - 0.2, -1.8, a.w / 2, GY + 6, 0, '紺屋湯', 'Kon’ya-yu (bathhouse)', true);
  });

  // ═════════════════════════ The shrine ═════════════════════════
  piece('ebisu', 's', (ROW_B + BLOCK_E) / 2, -FRONT, (a) => {
    const w2 = a.w / 2, d = a.d, P = a.pts, name: Named = { ja: '浜恵比須社', en: 'Hama-Ebisu Shrine' };
    for (const [x0, x1] of [[-w2, -2], [2, w2]]) b.block(x0, GY, -0.1, x1, GY + 1.2, 0.25);
    for (const s of [-1, 1]) b.block(Math.min(s * w2, s * (w2 - 0.25)), GY, 0.25, Math.max(s * w2, s * (w2 - 0.25)), GY + 1.6, d);
    b.block(-w2, GY, d - 0.25, w2, GY + 1.6, d);
    for (const s of [-1, 1]) {
      b.block(s * 1.6 - 0.25, GY, 0.75, s * 1.6 + 0.25, GY + 3.7, 1.25);
      b.block(s * 1.8 - 0.38, GY, 3.62, s * 1.8 + 0.38, GY + 2.1, 4.38);
    }
    b.block(-w2 + 1.3, GY, 5.9, -w2 + 2.7, GY + 2.5, 7.1);
    b.block(-w2 + 1.4, GY, 2.6, -w2 + 2.6, GY + 0.6, 3.4);
    b.block(w2 - 1.45, GY, 4.9, w2 - 1.15, GY + 1.9, 7.9);
    b.block(-2.2, GY, P._hall[2] - 3.0, 2.2, GY + 4.5, P._hall[2] + 2.3);
    signAt(P.name, { k: 'label', text: '恵比須', fg: '#e8c66a', bg: '#3a3a36' });
    signAt(P.post, { k: 'shop', ja: name.ja, bg: '#b9b3a4', fg: '#1f2023', vertical: true });
    modelTree(b, 'pine', w2 - 2.2, d - 2.4, 'a', GY, false);
    b.zone('street', -w2 + 0.4, GY - 0.2, 0.4, w2 - 0.4, GY + 6, P._hall[2] - 3.2, name.ja, name.en, true);
  }, false);
}

/** A signalled T junction where an east–west street meets Hama-dōri from the east, at z `cz`. */
function tee(b: Builder, cz: number, hz: number, name: Named, walked: boolean) {
  const cx = SHORE.c, hx = SHORE.half, flat = true;
  // Across Hama-dōri, north and south of the junction; across the street, east of it.
  for (const sz of [-1, 1] as const) {
    const zc = cz + sz * (hz + 2.6);
    crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
    pedSignal(b, cx - hx - 0.8, zc + sz * 2.0, [1, 0], 0, { flat, button: true });
    pedSignal(b, cx + hx + 0.8, zc + sz * 2.0, [-1, 0], 0, { flat, button: true });
  }
  const xc = cx + hx + 2.6;
  crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
  pedSignal(b, xc + 2.0, cz - hz - 0.8, [0, 1], 1, { flat });
  pedSignal(b, xc + 2.0, cz + hz + 0.8, [0, -1], 1, { flat });
  // Westbound traffic stops east of the junction and looks at the signal across it, on the promenade.
  const xs = cx + hx + SL;
  b.deco(WHITE, xs, 0.004, cz, xs + 0.35, 0.01, cz + hz - 0.2);
  vehicleSignal(b, cx - hx - 1.9, cz + hz + 1.5, [-1, 0], hz + 1.5 - hz / 2, 0, name, { style: 'new', back: false });
  roadName(b, cx - hx - 1.9, cz + hz + 1.5, [1, 0], { ja: '浜通', en: 'Hama-dōri' });
  for (const sz of [1, -1] as const) {
    const zs = cz - sz * (hz + SL);
    b.deco(WHITE, Math.min(cx, cx + sz * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + sz * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
    shortSignal(b, cx + sz * (hx + 1.5), cz + sz * (hz + 1.9), [0, sz], 1, name);
  }
  if (walked) {
    roadModel(b, 'sigbox', cx + hx + 2.6, GY, cz - hz - 3.4, [0, 1]);
    b.block(cx + hx + 2.24, GY, cz - hz - 3.66, cx + hx + 2.96, GY + 1.56, cz - hz - 3.14);
  }
}
