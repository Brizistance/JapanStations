// Minamihorie's street (南堀江): the quiet canal of boutiques and cafés. Stone banks with walks
// under cherry trees, a low teal iron bridge, steps down to the water, café tables on the bank, and
// the station's pieces: the clock tower on its little plaza, Café Horie and Kinoha furniture and
// homewares, both of which you can walk into.
//
// Models: tools/blender/build_horie.py (public/models/buildings/horie.glb); HALF, ZA, TW, TH, CW,
// CD, CDOOR, ZW, ZD, ZDOOR are mirrored here. This file adds colliders, zones, lights and names.
import type { Builder } from '../world/builder';
import { fitting } from './fittings';
import { GROUND_Y } from './kit';
import type { PieceId } from './pieces';
import { modelTree } from './trees';

const GY = GROUND_Y;
const HALF = 7, ZA = 19;
const TW = 4.6, TH = 13.5;
const CW = 9, CD = 10, CDOOR: [number, number] = [1.6, 2.8], SDOOR: [number, number] = [7.2, 8.4];
const ZW = 8, ZD = 10, ZDOOR: [number, number] = [1.2, 2.4];
const TEAL = '#2f7f7a';
const GLOBE = 'glow:#ffe2b0';

export const HORIE_PIECES: PieceId[] = ['tower', 'cafe', 'zakka'];

const put = (b: Builder, id: string, x: number, y: number, z: number) => b.model('horie', id, x, y, z);

/** A piece on its lot, in the frame of places.ts (middle of the lot's front at the origin, lot along +z). */
export function horiePiece(b: Builder, o: { id: PieceId; ja: string; en: string }) {
  if (o.id === 'tower') {
    // The clock tower on the canal side of a small paved plaza: benches, a cherry, the name stone.
    const tx = 3, tz = 6, h = TW / 2;
    b.deco('flat:#c9c1b0', -6, GY, 0, 6, GY + 0.02, 12);
    put(b, 'tower', tx, GY, tz);
    b.block(tx - h - 0.2, GY, tz - h - 0.2, tx + h + 0.2, GY + TH + 6, tz + h + 0.2);
    // The four clock faces (the game's clock, so they keep time) in the stone frames.
    const fy = GY + TH + 1.5, r = h + 0.19;
    b.sign({ k: 'clock' }, tx, fy, tz - r, [0, -1], 2.1, 2.1);
    b.sign({ k: 'clock' }, tx, fy, tz + r, [0, 1], 2.1, 2.1);
    b.sign({ k: 'clock' }, tx - r, fy, tz, [-1, 0], 2.1, 2.1);
    b.sign({ k: 'clock' }, tx + r, fy, tz, [1, 0], 2.1, 2.1);
    for (const [x, z] of [[-3.6, 3.0], [-3.6, 7.5]] as [number, number][]) {
      fitting(b, 'cbench_new', x, GY, z, [1, 0]);
      b.block(x - 0.25, GY, z - 0.9, x + 0.25, GY + 0.45, z + 0.9);
    }
    modelTree(b, 'cherry', -4.4, 10.4, 'b');
    b.box('flat:#8f877a', -5.4, GY, 0.4, -3.6, GY + 0.9, 0.9);
    b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#2a2019', bg: '#b9b09c' }, -4.5, GY + 0.6, 0.388, [0, -1], 1.6, 0.5);
    return;
  }

  if (o.id === 'cafe') {
    // Café Horie: 9 m of the lot, its glazed side to the canal (+x); a terrace table beside it.
    const cx = -1.5, x0 = cx - CW / 2, x1 = cx + CW / 2, GF = 3.4;
    put(b, 'cafe', cx, GY, 0);
    put(b, 'cafe_in', cx, GY, 0);
    b.block(x0 - 0.2, GY, 0, x0, GY + 7, CD + 0.2);
    b.block(x0, GY, CD, x1 + 0.2, GY + 7, CD + 0.2);
    b.block(x0, GY, -0.1, cx + CDOOR[0], GY + GF, 0.14);
    b.block(cx + CDOOR[1], GY, -0.1, x1, GY + GF, 0.14);
    b.block(cx + CDOOR[0], GY + GF - 0.4, -0.1, cx + CDOOR[1], GY + GF, 0.14);
    // The canal side, its door onto the walk at SDOOR.
    b.block(x1, GY, 0, x1 + 0.14, GY + GF, SDOOR[0]);
    b.block(x1, GY, SDOOR[1], x1 + 0.14, GY + GF, CD);
    b.block(x1, GY + GF - 0.4, SDOOR[0], x1 + 0.14, GY + GF, SDOOR[1]);
    b.block(x0, GY + GF, 0, x1, GY + GF + 0.2, CD);
    // Fittings: counter, tables with their chairs, the window bar and its stools.
    b.block(x0 + 0.3, GY, 7.5, x1 - 2.3, GY + 1.05, 8.3);
    for (const [tx, tz] of [[x0 + 1.5, 2.0], [x0 + 1.5, 4.8], [x0 + 4.2, 2.0], [x0 + 4.2, 4.8]]) b.block(tx - 0.42, GY, tz - 0.82, tx + 0.42, GY + 0.9, tz + 0.82);
    b.block(x1 - 0.55, GY, 0.6, x1 - 0.1, GY + 1.05, 6.6);
    for (let k = 0; k < 4; k++) b.block(x1 - 1.03, GY, 1.2 + k * 1.5 - 0.18, x1 - 0.67, GY + 0.75, 1.2 + k * 1.5 + 0.18);
    for (const [tx, tz] of [[x0 + 1.5, 3.4], [x0 + 4.2, 3.4], [x0 + 2.6, 7.9]]) {
      b.mesh('flat:#2f7f7a', 'cone', tx, GY + 2.72, tz, 0.5, 0.28, 0.5);
      b.mesh(GLOBE, 'sphere', tx, GY + 2.6, tz, 0.24, 0.2, 0.24);
    }
    b.box('ceil', x0, GY + GF - 0.02, 0, x1, GY + GF, CD, false);
    b.sign({ k: 'shop', ja: 'カフェ ほりえ', en: 'Café Horie', bg: TEAL, fg: '#fff' }, cx, GY + GF + 0.15, -0.112, [0, -1], 5.6, 0.55);
    b.sign({ k: 'shop', ja: 'カフェ ほりえ', en: 'Café Horie', bg: TEAL, fg: '#fff' }, x1 + 0.312, GY + GF + 0.15, CD / 2, [1, 0], 5.6, 0.55);
    put(b, 'terrace', x1 + 1.7, GY, 4.5);
    b.block(x1 + 0.6, GY, 3.9, x1 + 2.8, GY + 0.9, 5.1);
    b.zone('passage', x0, GY - 0.2, 0, x1, GY + GF, CD, o.ja, `${o.en} (café)`, true);
    return;
  }

  // Kinoha: furniture and homewares behind a timber front.
  const X = ZW / 2, GF = 3.3;
  put(b, 'zakka', 0, GY, 0);
  put(b, 'zakka_in', 0, GY, 0);
  for (const s of [-1, 1]) b.block(Math.min(s * X, s * (X + 0.2)), GY, 0, Math.max(s * X, s * (X + 0.2)), GY + 6.6, ZD + 0.2);
  b.block(-X, GY, ZD, X, GY + 6.6, ZD + 0.2);
  b.block(-X, GY, -0.16, ZDOOR[0], GY + GF, 0.12);
  b.block(ZDOOR[1], GY, -0.16, X, GY + GF, 0.12);
  b.block(ZDOOR[0], GY + GF - 0.3, -0.16, ZDOOR[1], GY + GF, 0.12);
  b.block(-X, GY + GF, 0, X, GY + GF + 0.2, ZD);
  b.block(-X, GY, 0.8, -X + 0.42, GY + 2.4, ZD - 0.4);
  b.block(X - 0.42, GY, 0.8, X, GY + 2.4, ZD - 0.4);
  b.block(-X + 0.5, GY, ZD - 0.42, X - 0.5, GY + 2.6, ZD);
  b.block(-1.1, GY, 2.6, 1.1, GY + 0.8, 4.6);
  b.block(-2.2, GY, 7.0, 2.2, GY + 1.2, 7.9);
  b.box('ceil', -X, GY + GF - 0.02, 0, X, GY + GF, ZD, false);
  for (let z = 2; z <= ZD - 2; z += 2) {
    b.mesh('flat:#3c3f42', 'cyl', 0, GY + 3.05, z, 0.02, 0.4, 0.02);
    b.mesh('flat:#c98a4b', 'cone', 0, GY + 2.78, z, 0.42, 0.26, 0.42);
    b.mesh(GLOBE, 'sphere', 0, GY + 2.66, z, 0.2, 0.14, 0.2);
  }
  b.sign({ k: 'shop', ja: o.ja, en: o.en, bg: '#6b4a2e', fg: '#f4efe2' }, 0, GY + GF + 0.25, -0.212, [0, -1], 5.8, 0.42);
  b.zone('passage', -X, GY - 0.2, 0, X, GY + GF, ZD, o.ja, `${o.en} (shop)`, true);
}

/**
 * The quiet canal at x = cx: coursed stone banks, a stone walk 7 m wide on each bank at street
 * level with cherry trees, benches and a teal railing, café tables on the west bank, stone steps
 * down to a landing at the water on the east bank (+z side), the teal bridge, culverts at the ends.
 */
export function quietCanal(b: Builder, cx: number, swOut: number, Z: number, name: { ja: string; en: string }) {
  const za0 = swOut + 1.5;
  if (Math.abs(za0 - ZA) > 0.01) throw new Error('quietCanal: the bridge model is built for parapets at z = ±19 (build_horie.py ZA)');
  const STEP = { x0: cx + HALF - 1.4, x1: cx + HALF, land: za0 + 0.6, run: 6 };
  const LAND = { x0: cx + HALF - 2.6, x1: cx + HALF, z0: STEP.land + 1.6 + STEP.run, z1: STEP.land + 1.6 + STEP.run + 5, y: -2.5 };
  for (const s of [-1, 1]) {
    const za = s * za0, zb = s * Z;
    const lo = Math.min(za, zb), hi = Math.max(za, zb);
    b.box('water', cx - HALF, -3.4, lo, cx + HALF, -2.8, hi, false);
    for (const ex of [cx - HALF, cx + HALF]) {
      const o = ex < cx ? -1 : 1;
      for (let k = 0; k < 6; k++) b.deco(k % 2 ? 'flat:#9a9282' : 'flat:#8a8272', Math.min(ex, ex + o * 0.4), -3.4 + k * 0.57, lo, Math.max(ex, ex + o * 0.4), -3.4 + (k + 1) * 0.57 + 0.01, hi);
      b.deco('flat:#c9c1b0', Math.min(ex - o * 0.08, ex + o * 0.5), GY, lo, Math.max(ex - o * 0.08, ex + o * 0.5), GY + 0.12, hi);
      // Teal railing, open at the steps.
      const rx = ex + o * 0.2;
      const gaps: [number, number][] = s > 0 && o > 0 ? [[STEP.land - 0.05, STEP.land + 1.65]] : [];
      let from = lo;
      for (const [g0, g1] of [...gaps, [hi, hi] as [number, number]]) {
        if (g0 - from > 0.2) {
          b.block(rx - 0.06, GY, from, rx + 0.06, GY + 1.05, g0);
          b.deco(`flat:${TEAL}`, rx - 0.04, GY + 0.95, from, rx + 0.04, GY + 1.02, g0);
          b.deco(`flat:${TEAL}`, rx - 0.02, GY + 0.45, from, rx + 0.02, GY + 0.48, g0);
          for (let z = from + 0.1; z < g0; z += 2) b.deco('flat:#26292b', rx - 0.05, GY, z - 0.05, rx + 0.05, GY + 1.08, z + 0.05);
        }
        from = g1;
      }
      // Cherries along the walk, a bench between each pair.
      for (let z = lo + 6; z < hi - 4; z += 10) {
        modelTree(b, 'cherry', ex + o * 4.2, z, 'a', GY, true);
        if (z + 5 < hi - 3 && !(s > 0 && o > 0 && Math.abs(z + 5 - STEP.land) < 3)) {
          fitting(b, 'cbench_new', ex + o * 1.3, GY, z + 5, [-o, 0]);
          b.block(ex + o * 1.3 - 0.25, GY, z + 5 - 0.9, ex + o * 1.3 + 0.25, GY + 0.45, z + 5 + 0.9);
        }
      }
    }
    // Café tables on the west bank.
    for (let z = za + s * 6; Math.abs(z) < Math.abs(za) + 26; z += s * 5) {
      b.model('horie', 'terrace', cx - HALF - 2.6, GY, z);
      b.block(cx - HALF - 3.7, GY, z - 0.6, cx - HALF - 1.5, GY + 0.9, z + 0.6);
    }
    // Culvert at the far end.
    const zw = s * (Z - 0.3);
    b.deco('flat:#7d7568', cx - HALF - 0.4, -3.4, Math.min(zw, s * Z), cx + HALF + 0.4, GY + 0.2, Math.max(zw, s * Z));
    for (let k = 0; k < 9; k++) {
      const xa = cx - 4.5 + k, h = 1.6 * Math.sqrt(Math.max(0, 1 - ((xa + 0.5 - cx) / 4.6) ** 2));
      b.deco('flat:#121110', xa, -2.8, Math.min(zw - s * 0.02, zw - s * 0.04), xa + 1, -2.0 + h, Math.max(zw - s * 0.02, zw - s * 0.04));
    }
  }

  // ── Minamihorie-bashi ──
  b.model('horie', 'bridge', cx, GY, 0);
  const L = HALF + 0.6;
  for (const s of [-1, 1]) {
    b.block(cx - L, GY, s * ZA - 0.2, cx + L, GY + 1.15, s * ZA + 0.2);
    for (const x of [cx - L, cx + L]) b.block(x - 0.3, GY, s * ZA - 0.3, x + 0.3, GY + 4, s * ZA + 0.3);
    b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#f4f1e8', bg: TEAL }, cx, GY + 0.6, s * (ZA - 0.07), [0, -s], 2.2, 0.5);
    // Name posts at the kerb ends of the bridge with bronze lamps, so it reads from the road.
    const zk = s * (swOut - 8.9);
    for (const x of [cx - L, cx + L]) {
      b.box('flat:#b9b09c', x - 0.3, GY, zk - 0.3, x + 0.3, GY + 1.5, zk + 0.3);
      b.deco(`flat:${TEAL}`, x - 0.34, GY + 1.5, zk - 0.34, x + 0.34, GY + 1.62, zk + 0.34);
      b.mesh('flat:#26292b', 'cyl', x, GY + 2.0, zk, 0.08, 0.8, 0.08);
      b.mesh('glow:#ffe2b0', 'sphere', x, GY + 2.55, zk, 0.42, 0.42, 0.42);
      b.sign({ k: 'label', text: name.ja, fg: '#f4f1e8', bg: TEAL }, x - Math.sign(x - cx) * 0.312, GY + 0.95, zk, [-Math.sign(x - cx), 0], 0.5, 0.9);
    }
    b.deco(`flat:${TEAL}`, cx - L, GY, s * (swOut - 8.9) - 0.04, cx + L, GY + 0.02, s * (swOut - 8.9) + 0.04);
  }

  // ── Steps down to the water (east bank, +z) ──
  b.open(() => {
    const { x0, x1, land, run } = STEP, top = GY, low = LAND.y, z0 = land + 1.6;
    b.block(x0, -3.4, land, x1, top, z0);
    b.deco('flat:#c9c1b0', x0, top - 0.02, land, x1, top, z0);
    b.ramp(x0, z0, x1, z0 + run, low, top, [0, -1]);
    const n = Math.round((top - low) / 0.17);
    for (let k = 0; k < n; k++) b.deco('flat:#b9b09c', x0, -3.4, z0 + (k * run) / n, x1, top - (k * (top - low)) / n, z0 + ((k + 1) * run) / n);
    b.box('flat:#8a8272', x0 - 0.2, -3.4, land, x0, top + 1.0, z0 + run);
    b.deco(`flat:${TEAL}`, x0 - 0.2, top + 0.95, land, x0, top + 1.05, z0 + run);
    // The stone landing at the water, with a rail on its water side and two mooring posts.
    b.box('flat:#a49c8c', LAND.x0, -3.4, LAND.z0, LAND.x1, LAND.y, LAND.z1);
    b.block(LAND.x0 - 0.1, LAND.y, LAND.z0, LAND.x0, LAND.y + 1.0, LAND.z1);
    b.block(LAND.x0, LAND.y, LAND.z1, LAND.x1, LAND.y + 1.0, LAND.z1 + 0.1);
    b.deco(`flat:${TEAL}`, LAND.x0 - 0.08, LAND.y + 0.9, LAND.z0, LAND.x0, LAND.y + 1.0, LAND.z1);
    b.deco(`flat:${TEAL}`, LAND.x0, LAND.y + 0.9, LAND.z1, LAND.x1, LAND.y + 1.0, LAND.z1 + 0.08);
    for (let z = LAND.z0 + 0.05; z <= LAND.z1; z += 1) b.deco('flat:#26292b', LAND.x0 - 0.07, LAND.y, z - 0.03, LAND.x0 - 0.01, LAND.y + 0.92, z + 0.03);
    for (const z of [LAND.z0 + 1, LAND.z1 - 1]) b.mesh('flat:#26292b', 'cyl', LAND.x0 + 0.3, LAND.y + 0.3, z, 0.24, 0.6, 0.24);
  });
  b.zone('street', LAND.x0, LAND.y - 0.2, LAND.z0, LAND.x1, LAND.y + 2.5, LAND.z1, '南堀江 水辺の階段', 'Minamihorie canal steps', true);
}
