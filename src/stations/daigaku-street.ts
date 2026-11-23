// The streets of Kawaminato-daigaku-mae (川湊大学前), the university quarter (rebuilt 2026-11; the
// owner's rules are in docs/street-design.md, the procedure in docs/station-playbook.md). After a
// Hongō-style university town: a main road with the university's long brick wall and its gate on one
// side; on the other, old shop houses, used-book shops and kissaten, a little shopping lane north,
// and behind the back street the wooden boarding houses and the bath house of the students' lodgings.
//
// Frame: +x east along the Nagisa Line and Gakufu-dōri, +z south (the campus). The Shiokaze/Sumire
// platforms cross deep under x = 0. Plot ±130 × ±85.
//
//   z 0        学府通 Gakufu-dōri: four lanes (±9) split by a 2.2 m ginkgo median, a signal crossing at the
//              main gate, 10.5 m pavements with ginkgos and the exits, fronts at ±19.5
//   z −50      文庫通 Bunko-dōri: 6.5 m (z −53.25 … −46.75), one way west, no pavement
//   x −76      桐筋 Kiri-suji: 8 m two way, 2 m pavements (x −82 … −70), north from Gakufu-dōri (a T)
//   x 72       梓筋 Azusa-suji: 6.5 m two way, 1.5 m pavements (x 67.25 … 76.75), north (a T)
//   x 10 … 16  蛍雪横丁 Keisetsu-yokochō: a shopping lane, no cars, from Gakufu-dōri north past the edge
//   x −41.5 … −38.5, z −85 … −53.25   下宿小路 Geshuku-kōji, between the boarding houses
//   z −71.5 … −69, x −70 … −3          湯屋小路 Yuya-kōji, past the bath house
//   z −35 … −32.5                      the back lane behind the front row (x −70 … 10 and 16 … 67.25)
//
// South of Gakufu-dōri, the campus: the brick wall on z 19.5 … 20.2 the whole width, broken by the main
// gate (x −8 … 8; the ginkgo avenue runs south from it), the west side gate (x −41 … −35) and the
// library's forecourt (x 35 … 61, open). The forecourt (x 24 … 84, z 20.2 … 36) lies before the main
// library (x 24 … 84, z 36 … 70, its tower and portal at x 54). The porter's lodge stands inside the
// gate (x 9 … 13, z 20.5 … 25.5). Lecture halls west (x −68 … −30 and −109 … −79, z 42 … 64), the student
// cafeteria east (x 91 … 113, z 25 … 57), lawns, a bicycle park, groves to the south edge.
//
// Lot table (each block: what stands on its edges, how deep):
//   N-west  x −130 … −82:  Gakufu fronts 13 (z −32.5 … −19.5), back lane 2.5, Bunko row 11.75 (z −46.75 … −35);
//           north of Bunko-dōri rows on it, filled to the edge (31.75)
//   N-mid   x −70 … 10:    the kissaten on the Kiri-suji corner (x −70 … −58), the bookshops (x −58 … 10),
//           back lane, Bunko row x −70 … −3, Keisetsu shops x −3 … 10 (facing east, 13 deep);
//           north of Bunko: boarding houses on Bunko-dōri (10) and on Yuya-kōji (10), Geshuku-kōji between,
//           the bath house (x −30 … −12, z −84.5 … −71.5), Keisetsu shops x −3 … 10; yards behind (leftovers)
//   N-east  x 16 … 67.25:  Gakufu fronts 13, back lane, Keisetsu shops x 16 … 29, Bunko row x 29 … 67.25;
//           north of Bunko: Keisetsu shops, rows on Bunko-dōri
//   N-far   x 76.75 … 130: as N-west
//   Campus  x −130 … 130, z 20.2 … 85: as above; no leftovers (lawns, groves and paths are its own)
//
// Signals share one cycle (traffic/signals.ts): axis 0 every east–west street, axis 1 every north–south one.
// Models: tools/blender/build_daigaku.py (the campus), build_daigakufront.py (the town side).

import { linesAt } from '../data/network';
import type { SignContent } from '../signs/content';
import { rng, type LanePart, type SignOpts } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { DAIGAKU } from './anchors/daigaku';
import { DAIGAKUFRONT } from './anchors/daigakufront';
import { KITACITY } from './anchors/kitacity';
import { GROUND_Y as GY, vending, type Ctx } from './kit';
import { kerbGaps, kerbRail, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal } from './roads';
import type { SurfaceSpec } from './surface';
import { crosswalk, fillModelLots } from './surface';
import { lift } from './lift';
import { libraryInside } from './daigaku-library';
import { modelTree, type TreeKind } from './trees';
import { leftovers } from './tsumugibashi-street';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };

/** Half extents of Daigaku-mae's plot. */
export const DAIGAKU_PLOT = { x: 130, z: 85 };
const X = DAIGAKU_PLOT.x, Z = DAIGAKU_PLOT.z;
/** Gakufu-dōri's half width and its building line (the exits are fitted to it). */
const RW = 9, FRONT = 19.5, MED = 1.1;
interface NS { c: number; half: number; pave: number; name: Named }
const KIRI: NS = { c: -76, half: 4, pave: 2, name: { ja: '桐筋', en: 'Kiri-suji' } };
const AZU: NS = { c: 72, half: 3.25, pave: 1.5, name: { ja: '梓筋', en: 'Azusa-suji' } };
const CROSS = [KIRI, AZU];
const BUNKO = { z: -50, half: 3.25, name: { ja: '文庫通', en: 'Bunko-dōri' } };
const B0 = BUNKO.z - BUNKO.half, B1 = BUNKO.z + BUNKO.half; // −53.25, −46.75
const MAIN: Named = { ja: '学府通', en: 'Gakufu-dōri' };
/** Keisetsu-yokochō, the shopping lane; its shops are SHOP_D deep either side. */
const KEI: [number, number] = [10, 16];
const KEI_NAME: Named = { ja: '蛍雪横丁', en: 'Keisetsu-yokochō' };
const SHOP_D = 13;
/** The front row's depth and the back lane behind it. */
const ROW_D = 13, BL: [number, number] = [-FRONT - ROW_D - 2.5, -FRONT - ROW_D]; // −33.5 … −31
/** Geshuku-kōji (north–south) and Yuya-kōji (east–west) in the lodgings. */
const GES: [number, number] = [-41.5, -38.5];
const YUYA: [number, number] = [-71.5, -69];
// The campus.
const WALL = FRONT, WALL_D = 0.7, IN = WALL + WALL_D;
const GATE: [number, number] = [-8, 8];
const SIDE: [number, number] = [-41, -35];
const OPEN: [number, number] = [35, 61];
const LIB = { x0: 24, x1: 84, z0: 36, z1: 70 };
/** The auditorium closing the ginkgo avenue (its wings' front; the tower stands 2.5 m forward), and the pond garden in the grove west of it. */
const AUD = { z0: 61, hw: 22 };
const POND = { x0: -76, x1: -46, z0: 68.5, z1: 82 };
/** The athletics ground just past the plot's south edge, west of the avenue (seen over its fence; not walked on). */
const SPORTS = { x0: -120, x1: -24, z0: Z + 5, z1: Z + 37 };
/** The lift by Exit 2 (through.ts: its lobby's end wall opens onto it), standing in the library forecourt's mouth. */
const LIFT: Rect = [38.45, 18.3, 40.75, 20.6];
const SL = 5.2;
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', LANE = 'tile:#857e73', SETT = 'tile:#77716a';
const STONE = 'flat:#b8ad98', BRICKPAVE = 'flat:#8a5a46', GRASS = 'flat:#5d7a44', EARTH = 'flat:#6f6150';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const bl = (s: NS): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];

/** The stretches of [u0, u1] between the corridors. */
function between(corridors: [number, number][], u0 = -X, u1 = X): [number, number][] {
  const out: [number, number][] = [];
  let from = u0;
  for (const [a, e] of [...corridors].sort((p, q) => p[0] - q[0])) {
    if (a > from) out.push([from, Math.min(a, u1)]);
    from = Math.max(from, e);
  }
  if (from < u1) out.push([from, u1]);
  return out.filter(([a, e]) => e - a > 0.5);
}

// ── Names (invented; docs/worldbuilding.md) ──
const BOOKS: Named[] = [
  { ja: '古書 雁書房', en: 'Ganshobō Old Books' }, { ja: '一草堂書店', en: 'Issōdō Books' }, { ja: '古書 紙魚堂', en: 'Shimidō Old Books' },
  { ja: '青灯書林', en: 'Seitō Shorin' }, { ja: '星霜堂書店', en: 'Seisōdō Books' }, { ja: '木犀書店', en: 'Mokusei Books' },
  { ja: '古書 夜学舎', en: 'Yagakusha Old Books' }, { ja: '洋書 ルーペ', en: 'Loupe Foreign Books' },
];
const SHOPS: Record<string, Named[]> = {
  teishoku: [{ ja: '定食 ことぶき', en: 'Kotobuki Set Meals' }, { ja: 'めし処 学府', en: 'Gakufu Diner' }, { ja: 'とんかつ 坂上', en: 'Sakaue Tonkatsu' }],
  stationer: [{ ja: '文具 けやき堂', en: 'Keyakidō Stationery' }, { ja: 'コピー 製本 白紙舎', en: 'Hakushisha Copy & Binding' }],
  tabako: [{ ja: 'たばこ 珈琲 灯台', en: 'Tōdai Tobacco & Coffee' }, { ja: '純喫茶 ノート', en: 'Kissa Note' }],
  print: [{ ja: '活版 印刷 活字舎', en: 'Katsujisha Letterpress' }, { ja: '画材 青墨', en: 'Seiboku Art Supplies' }],
  biru: [{ ja: '梓ビルヂング', en: 'Azusa Building' }, { ja: '学府会館', en: 'Gakufu Hall' }, { ja: '文庫マンション', en: 'Bunko Mansion' }],
};
const LODGE: Named[] = [
  { ja: '下宿 松風荘', en: 'Matsukaze-sō' }, { ja: '若葉荘', en: 'Wakaba-sō' }, { ja: '下宿 青雲寮', en: 'Seiun-ryō' },
  { ja: 'あけぼの荘', en: 'Akebono-sō' }, { ja: '下宿 白樺', en: 'Shirakaba' }, { ja: '螢荘', en: 'Hotaru-sō' },
];

export function daigakuStreet(c: Ctx, spec: SurfaceSpec, cw: number, dir: [number, number], cf: number) {
  const { b } = c;
  const st = c.station;
  if (Math.abs(cw + 5.5 - FRONT) > 0.01) throw new Error(`daigakuStreet: Gakufu-dōri's building line moved (${cw + 5.5}); the exits are fitted to ${FRONT}`);
  const seed = spec.seed;
  const r = rng(seed);
  const lines = linesAt(st.id).map((l) => l.id);
  const stName: Named = { ja: st.nameJa, en: st.nameRomaji };
  b.out.plot = { ...DAIGAKU_PLOT };
  const holes: Rect[] = b.out.holes.map((q) => [...q] as Rect);
  const nearHole = (x: number, z: number, m: number) => holes.some((q) => x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m);
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);

  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: SignContent, o?: SignOpts) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4], o);
  const label = (p: AnchorPt, text: string, sub: string | undefined, bg: string, fg: string) => signAt(p, { k: 'label', text, sub, fg, bg });
  const upright = (p: AnchorPt, ja: string, bg: string, fg = '#ffffff') => signAt(p, { k: 'shop', ja, bg, fg, vertical: true });
  /** A one-off model with its front at (x, z) facing `face`, its collider, and whatever the game puts on it. */
  const piece = (kind: string, A: Anchors, id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void, solid = true) =>
    at(face, x, z, () => {
      const a = A[id];
      b.model(kind, id, 0, GY, 0, 1);
      if (solid) b.block(-a.w / 2, GY, 0, a.w / 2, GY + Math.max(a.h, 3), a.d);
      fn?.(a);
    });
  /** Rows of stock street models packing a rectangle, fronts on its `face` side, each further row behind the last. */
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], lo = false) => {
    if (x1 - x0 < 4.6 || z1 - z0 < 4.6) return;
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 4.6 || f1 - f0 < 8) return;
    b.with(FRAME[face], () => {
      let z = f0;
      for (let k = 0; k < 6 && f1 - z > 8.5; k++) {
        const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds, lo, old: true });
        if (!lots.length) break;
        z = Math.max(...lots.map((l) => l[3])) + 0.8;
      }
    });
  };
  const SMALL = ['zakkyo', 'manshon', 'shophouse'], LOW = ['shophouse', 'machi'];
  const bike = (x: number, z: number, f: [number, number]) => {
    const d = b.dir(f);
    b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
  };
  /** What is not a building and must stay empty: lanes, yards, precincts (leftovers() fills the rest). */
  const reserved: Rect[] = [];
  /** A walkable lane's paving, its drain down the middle, and its name as a place. */
  const lanePave = (x0: number, z0: number, x1: number, z1: number, name?: Named, mat = LANE) => {
    b.deco(mat, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    if (x1 - x0 > z1 - z0) b.deco('flat:#6f6a60', x0, GY + 0.012, (z0 + z1) / 2 - 0.08, x1, GY + 0.016, (z0 + z1) / 2 + 0.08);
    else b.deco('flat:#6f6a60', (x0 + x1) / 2 - 0.08, GY + 0.012, z0, (x0 + x1) / 2 + 0.08, GY + 0.016, z1);
    reserved.push([x0, z0, x1, z1]);
    if (name) b.zone('street', x0 + 0.3, GY - 0.2, z0 + 0.3, x1 - 0.3, GY + 6, z1 - 0.3, name.ja, name.en, true);
  };
  let tn = 0;
  const tree = (x: number, z: number, kind: TreeKind, street = false) => modelTree(b, kind, x, z, tn++ % 3 ? 'a' : 'b', GY, street);

  // ═════════════════════════ Ground ═════════════════════════
  const carriage: Rect[] = [
    [-X, -RW, X, RW],
    ...CROSS.map((s): Rect => [s.c - s.half, -Z, s.c + s.half, -RW]),
    [-X, B0, X, B1],
  ];
  const wellHoles: Rect[] = [...holes, LIFT].map(([x0, z0, x1, z1]) => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, wellHoles);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...wellHoles, ...carriage]);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${st.nameJa}駅前`, `${st.nameRomaji} — street level`);
  b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -Z - 1, X, 60, -Z);
  b.block(-X, -1, Z, X, 60, Z + 1);
  b.out.district = { radius: 480, old: [-20, -60], oldRadius: 170, towers: 0 };

  // ═════════════════════════ Roads ═════════════════════════
  const streetsX = CROSS.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const zonesAv: [number, number][] = streetsX.map(([a, e]): [number, number] => [a - 9, e + 9]);
  const keiMouth: [number, number] = [KEI[0] - 0.6, KEI[1] + 0.6];
  // Gakufu-dōri: lane lines, and the median's edge lines; the crossing at the main gate (x −2 … 2).
  const GX = 2, gateZone: [number, number] = [-GX - SL - 0.6, GX + SL + 0.6];
  for (let x = -X; x < X; x += 6) {
    if (!clearOf(x + 1.5, [...zonesAv, gateZone])) continue;
    for (const z of [-RW / 2, RW / 2]) b.deco(WHITE, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
  }
  /** Where the median runs: between the junctions' boxes, broken at the gate's crossing. */
  const medianRuns: [number, number][] = [];
  {
    let from = -X;
    for (const [p, q] of [...zonesAv.map(([a, e]): [number, number] => [a + 3, e - 3]), [-GX - 0.6, GX + 0.6] as [number, number], [X + 3, X + 3] as [number, number]].sort((m, n) => m[0] - n[0])) {
      if (p - from >= 6) medianRuns.push([from, p]);
      from = q;
    }
  }
  for (const s of [-1, 1]) for (const [a, e] of medianRuns) b.deco(YELLOW, a, 0.004, s * (MED + 0.2) - 0.07, e, 0.01, s * (MED + 0.2) + 0.07);
  const lanes0 = b.out.lanes.length;
  // Bus stops clear of the exits, the gates and the lane mouths; the taxi stand before the wall east of the gate.
  const busX: [number, number] = [25, -22], taxiX = 18;
  roadKit(b, {
    X, Z, rw: RW, swOut: FRONT, streets: streetsX, seed, name: stName, at: { id: st.id, dir }, tee: true, teeNorth: true, long: true,
    lamp: 'lamp_shop', busy: 0.6, taxi: 0.12, lit: [0, 1],
    junctions: [{ ja: '大学前西', en: 'Daigaku-mae-nishi' }, { ja: '大学前東', en: 'Daigaku-mae-higashi' }],
    roads: { main: MAIN, cross: CROSS.map((s) => s.name) },
    flows: [0.6, 0.4], busX, taxiX,
  });

  // ── The median: a granite kerb, clipped azalea and ginkgos down the middle (Hongō-dōri's way) ──
  for (const [a, e] of medianRuns) {
    b.box('flat:#8d8f8c', a, 0, -MED, e, 0.22, MED);
    b.deco('flat:#3f6b3a', a + 0.5, 0.22, -MED + 0.3, e - 0.5, 0.75, MED - 0.3);
    b.block(a, 0, -MED + 0.25, e, 1.1, MED - 0.25);
    const n = Math.floor((e - a - 4) / 12);
    for (let k = 0; k <= n; k++) {
      const x = n ? a + 2 + k * ((e - a - 4) / n) : (a + e) / 2;
      if (e - a > 8) tree(x, 0, 'ginkgo', true);
    }
  }
  /** A signalled junction of a north–south street and an east–west one (as at Tsumugibashi). */
  const junction = (cx: number, hx: number, ways: (1 | -1)[], cz: number, hz: number, name: Named, ew: (1 | -1)[]) => {
    const flat = true;
    for (const sz of [-1, 1] as const) {
      const zc = cz + sz * (hz + 2.6);
      crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
      pedSignal(b, cx - hx - 0.8, zc + sz * 2.0, [1, 0], 0, { flat, button: true });
      pedSignal(b, cx + hx + 0.8, zc + sz * 2.0, [-1, 0], 0, { flat, button: true });
    }
    for (const sx of [-1, 1] as const) {
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
      pedSignal(b, xc + sx * 2.0, cz - hz - 0.8, [0, 1], 1, { flat });
      pedSignal(b, xc + sx * 2.0, cz + hz + 0.8, [0, -1], 1, { flat });
    }
    for (const sx of ew) {
      const lz = -sx;
      const xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      shortSignal(b, cx + sx * (hx + 1.5), cz + lz * (hz + 1.9), [sx, 0], 0, name);
    }
    for (const sz of ways) {
      const lx = sz;
      const zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      shortSignal(b, cx + lx * (hx + 1.5), cz + sz * (hz + 1.9), [0, sz], 1, name);
    }
    roadModel(b, 'sigbox', cx - hx - 2.6, GY, cz - hz - 3.2, [0, 1]);
    b.block(cx - hx - 2.96, GY, cz - hz - 3.46, cx - hx - 2.24, GY + 1.56, cz - hz - 2.94);
  };
  // ── Bunko-dōri, one way west, signals where Kiri-suji and Azusa-suji cross; a zebra at Keisetsu-yokochō ──
  for (const q of CROSS) junction(q.c, q.half, [1, -1], BUNKO.z, BUNKO.half, { ja: `文庫${q.name.ja.replace('筋', '')}`, en: `Bunko ${q.name.en.replace('-suji', '')}` }, [-1]);
  {
    const stops: LanePart['stops'] = CROSS.map((q) => {
      const t = X - q.c;
      return { at: t - q.half - SL - 0.5, axis: 0 as const, exit: t + q.half + SL };
    }).sort((p, q) => p.at - q.at);
    const keiYield = [{ at: X - KEI[1] - 5, zone: [KEI[0], B0, KEI[1], B1] as [number, number, number, number] }];
    trafficLane(b, X, BUNKO.z, -X, BUNKO.z, { speed: 30 / 3.6, flow: 1.6, use: 'minor', taxi: 0.05, halts: [], stops, yields: keiYield });
    crosswalk(b, (KEI[0] + KEI[1]) / 2, BUNKO.z, 2 * BUNKO.half - 0.4, KEI[1] - KEI[0] - 0.4, true);
    for (const e of [-1, 1]) {
      let from = -X;
      const boxes = CROSS.map((q): [number, number] => [q.c - q.half - 8, q.c + q.half + 8]);
      for (const [p, q] of [...boxes, [KEI[0] - 1, KEI[1] + 1] as [number, number], [X + 3, X + 3] as [number, number]].sort((m, n) => m[0] - n[0])) {
        if (p - from > 1) b.deco(WHITE, from, 0.004, BUNKO.z + e * (BUNKO.half - 0.6) - 0.05, p, 0.01, BUNKO.z + e * (BUNKO.half - 0.6) + 0.05);
        from = q;
      }
    }
    // One way: the arrow boards at both ends and past each crossing, no entry from the west end.
    for (const x of [X - 6, KIRI.c + KIRI.half + 12, AZU.c + AZU.half + 12]) {
      const zk = BUNKO.z + BUNKO.half + 0.5;
      roadModel(b, 'signpole', x, GY, zk, [0, -1]);
      b.block(x - 0.06, GY, zk - 0.06, x + 0.06, GY + 2, zk + 0.06);
      b.sign({ k: 'roadsign', v: 'oneway-l' }, x, GY + 2.72, zk - 0.05, [0, -1], 0.9, 0.3);
      b.sign({ k: 'roadsign', v: 'back-rect' }, x, GY + 2.72, zk + 0.05, [0, 1], 0.9, 0.3);
    }
    roadSign(b, 'noentry', -X + 6, BUNKO.z - BUNKO.half - 0.5, [-1, 0], 0.66);
    for (const x of [-X + 20, 40]) roadSign(b, 'speed30', x, BUNKO.z + BUNKO.half + 0.5, [1, 0], 0.6);
    // Lamps on both sides, and the poles and their wires on the south kerb.
    for (const sz of [-1, 1] as const) for (let x = -X + (sz < 0 ? 10 : 22); x < X - 6; x += 24) {
      if (clearOf(x, [...zonesAv, [KEI[0] - 2, KEI[1] + 2], [GES[0] - 2, GES[1] + 2]], 1.5)) streetLamp(b, 'lamp_small', x, BUNKO.z + sz * (BUNKO.half + 0.4), [0, -sz]);
    }
    poleLine(b, { axis: 'x', from: -X + 4, to: X - 4, at: B1 + 0.3, road: -1, step: 26, skip: (u) => !clearOf(u, [...zonesAv, [KEI[0] - 3, KEI[1] + 3]]), drops: 0.7, name: stName });
  }
  // The kit laid Kiri-suji's and Azusa-suji's lanes with a stop at Gakufu-dōri only: add Bunko-dōri's.
  for (const l of b.out.lanes.slice(lanes0)) {
    const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2];
    if (Math.abs(dx) > 0.1 || Math.abs(dz) < 1) continue;
    const z0 = l.from[2], z1 = l.to[2];
    if (Math.max(z0, z1) < B0 - 1 || Math.min(z0, z1) > B1 + 1) continue;
    const t = (BUNKO.z - z0) * Math.sign(z1 - z0);
    if (t - BUNKO.half - SL < 4 || t + BUNKO.half + SL > Math.abs(z1 - z0) - 2) continue;
    l.stops = [...l.stops, { at: t - BUNKO.half - SL - 0.5, axis: 1 as const, exit: t + BUNKO.half + SL }].sort((p, q) => p.at - q.at);
  }
  // Kiri-suji and Azusa-suji north of Bunko-dōri: lamps, poles; speed signs.
  for (const q of CROSS) {
    const far = q.c - (q.half + 0.5);
    for (let z = -Z + 10; z < -RW - 14; z += 22) if (Math.abs(z - BUNKO.z) > 10) streetLamp(b, 'lamp_small', q.c + q.half + 0.5, z, [-1, 0]);
    poleLine(b, { axis: 'z', from: -Z + 6, to: -FRONT - 4, at: far + 0.2, road: 1, step: 26, skip: (u) => Math.abs(u - BUNKO.z) < 10, drops: 0.7, name: stName });
    roadSign(b, 'speed30', q.c + q.half + 0.5, -Z + 20, [0, 1], 0.6);
  }

  // ── Nothing of the kit's stands in a lane's mouth or a gate; kerb rails along Gakufu-dōri ──
  const mouthsN: [number, number][] = [keiMouth, [-GX - 0.8, GX + 0.8]];
  const mouthsS: [number, number][] = [[GATE[0] - 1, GATE[1] + 1], [SIDE[0] - 0.5, SIDE[1] + 0.5], [OPEN[0], OPEN[1]]];
  {
    const mouths: Rect[] = [
      ...mouthsN.map(([a, e]): Rect => [a, -FRONT - 0.2, e, -RW + 0.2]),
      ...mouthsS.map(([a, e]): Rect => [a, RW - 0.2, e, FRONT + 0.2]),
    ];
    for (const [x0, z0, x1, z1] of mouths) {
      // (Not the exits' own entrance houses: Exit 2 stands in the forecourt's mouth.)
      const inside = (v: number[]) => v[0] > x0 && v[0] < x1 && v[2] > z0 && v[2] < z1 && !nearHole(v[0], v[2], 0.9);
      b.out.models = b.out.models.filter((m) => !(inside(m.pos) && m.kind === 'road' && m.pos[1] < GY + 1));
      b.out.signs = b.out.signs.filter((sg) => !(inside(sg.pos) && sg.normal !== null && sg.pos[1] > GY + 0.3 && (sg.pos[1] < GY + 4.6 || sg.content.k === 'roadboard')));
      b.out.boxes = b.out.boxes.filter((bx) => {
        const post = bx.max[1] < GY + 7 && bx.max[0] - bx.min[0] < 2.6 && bx.max[2] - bx.min[2] < 2.6;
        return !(bx.min[1] > -0.05 && bx.max[1] > 0.3 && post && inside([(bx.min[0] + bx.max[0]) / 2, 0, (bx.min[2] + bx.max[2]) / 2]));
      });
    }
    const gaps = kerbGaps(streetsX, busX, taxiX);
    for (const s of [-1, 1] as const) {
      const zr = s * (RW + 0.3);
      const own = (s < 0 ? mouthsN : mouthsS).map(([a, e]) => [a, e]);
      const open = [...zonesAv.filter(() => s < 0).map(([a, e]) => [a + 2, e - 2]), ...zonesAv.filter(() => s > 0).map(([a, e]) => [a + 5, e - 5]), ...own, ...gaps.filter((k) => k.s === s).map((k) => [k.x0, k.x1])].sort((p, q) => p[0] - q[0]);
      let x = -X;
      for (const [from, to] of open.concat([[X, X]])) {
        for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
          b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
          kerbRail(b, xa + 1.25, zr);
        }
        x = Math.max(x, to);
      }
    }
    // ── The gate crossing: a zebra straight from the bookshops to the red gate, signals both ways ──
    {
      const name = { ja: '大学正門前', en: 'Daigaku-seimon-mae' };
      crosswalk(b, 0, 0, 2 * RW - 0.4, 2 * GX, true);
      for (const sz of [-1, 1] as const) {
        pedSignal(b, sz * (GX + 0.8), sz * (RW + 0.8), [0, -sz], 1, { flat: true, button: true, speaker: true });
        pedSignal(b, -sz * (GX + 0.8), sz * (MED - 0.3), [0, sz], 1, { flat: true });
      }
      for (const sx of [-1, 1] as const) {
        const lz = -sx, xs = -sx * (GX + SL);
        b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(lz * MED, lz * (RW - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(lz * MED, lz * (RW - 0.2)));
        // The mast at the far side on the left kerb, its 6.5 m arm out over the inner lane (as at the junctions).
      vehicleSignal(b, sx * (GX + 1.5), lz * (RW + 0.7), [sx, 0], RW + 0.7 - 2.25 - 1.1, 0, name, { style: 'long', back: true });
      }
      roadSign(b, 'crossing', GX + 2.6, -RW - 0.6, [0, 1], 0.6);
      // Every car on Gakufu-dōri stops for it: a stop on the main road's lanes, in phase with the walkers.
      for (const l of b.out.lanes.slice(lanes0)) {
        const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2];
        if (Math.abs(dz) > 0.1 || Math.abs(dx) < X || Math.abs(l.from[2]) > RW) continue;
        const t = Math.abs(l.from[0]);
        l.stops = [...l.stops, { at: t - GX - SL - 0.5, axis: 0 as const, exit: t + GX + SL }].sort((p, q) => p.at - q.at);
      }
    }
    // Ginkgos along both kerbs of Gakufu-dōri; on the wide pavements bicycle racks, benches and planters.
    for (const s of [-1, 1] as const) {
      const keep = s < 0 ? mouthsN : mouthsS;
      for (let x = -X + 6; x < X - 4; x += 11) {
        const z = s * (RW + 1.9);
        if (!clearOf(x, zonesAv, 1) || !clearOf(x, keep, 2.5) || nearHole(x, z, 3.5) || gaps.some((k) => k.s === s && x > k.x0 - 2 && x < k.x1 + 2)) continue;
        tree(x, z, 'ginkgo', true);
      }
      for (let x = -X + 16; x < X - 8; x += 22) {
        const z = s * (RW + 5.2);
        if (!clearOf(x, zonesAv, 4) || !clearOf(x, keep, 5) || nearHole(x, z, 5) || nearHole(x + 4, z, 5)) continue;
        const id = Math.round(x / 22) % 2 === 0 ? 'bikerack' : 'bench_s';
        roadModel(b, id, x, GY, z, [0, s]);
        const hw = id === 'bikerack' ? 2.05 : 0.95;
        b.block(x - hw, GY, z - 0.4, x + hw, GY + (id === 'bikerack' ? 1.1 : 0.6), z + 0.4);
        if (id === 'bikerack') for (let k = 0; k < 4; k++) bike(x - 1.5 + k, z + 0.1, [0, s]);
        roadModel(b, 'planter', x + 3.6, GY, z, [0, s]);
        b.block(x + 3.6 - 0.9, GY, z - 0.45, x + 3.6 + 0.9, GY + 0.9, z + 0.45);
      }
    }
  }

  // ═════════════════════════ The fronts on Gakufu-dōri ═════════════════════════
  const used = new Map<string, number>();
  const nameNo = new Map<string, number>();
  const nextName = <T,>(key: string, list: T[]): T => {
    const k = nameNo.get(key) ?? 0;
    nameNo.set(key, k + 1);
    return list[k % list.length];
  };
  /** Pieces filling a frontage of length L: the least used first, then the best tail of up to three to finish within `slack`. */
  const pack = (A: Anchors, L: number, ids: string[], slack = 3.2, min = 0): string[] => {
    const W = (id: string) => A[id].w;
    const least = Math.min(...ids.map(W));
    const pick: string[] = [];
    let rem = L;
    while (rem > 16) {
      const order = [...ids].sort((p, q) => (used.get(p) ?? 0) - (used.get(q) ?? 0) || r() - 0.5);
      const id = order.find((i) => W(i) <= rem - least) ?? order[0];
      pick.push(id);
      used.set(id, (used.get(id) ?? 0) + 1);
      rem -= W(id);
    }
    let best: string[] = [], bestRem = rem >= min ? rem : Infinity;
    const go = (acc: string[], sum: number) => {
      const left = rem - sum;
      if (acc.length && left >= min && left < bestRem - 0.01) (best = [...acc]), (bestRem = left);
      if (acc.length >= 3) return;
      for (const id of ids) if (W(id) <= left - min) go([...acc, id], sum + W(id));
    };
    go([], 0);
    if (bestRem > slack && !best.length && rem > least) {
      for (const id of [...ids].sort((p, q) => W(q) - W(p))) if (W(id) <= rem) { best = [id]; break; }
    }
    for (const id of best) used.set(id, (used.get(id) ?? 0) + 1);
    return [...pick, ...best].map((id) => [id, r()] as const).sort((p, q) => p[1] - q[1]).map(([id]) => id);
  };
  /**
   * A row of pieces along a frontage: on `face`, the building line at `line`, from u0 to u1 along it.
   * `tight`: house against house, what is left over at the far end; else spread with equal gaps.
   */
  const row = (kind: string, A: Anchors, face: Face, line: number, u0: number, u1: number, ids: string[], letter: (id: string, a: Anchor) => void, tight = false): Rect[] => {
    const list = pack(A, u1 - u0, ids, tight ? 4 : 3.2, tight ? 0 : 0.3);
    const total = list.reduce((t, id) => t + A[id].w, 0);
    const gap = tight ? 0.06 : list.length ? (u1 - u0 - total) / (list.length + 1) : 0;
    let u = u0 + (tight ? 0 : gap);
    const placed: Rect[] = [];
    const alongX = face === 'n' || face === 's';
    for (const id of list) {
      const a = A[id], uc = u + a.w / 2;
      const [x, z] = alongX ? [uc, line] : [line, uc];
      piece(kind, A, id, face, x, z, (q) => letter(id, q));
      placed.push(alongX ? [u, face === 'n' ? line : line - a.d, u + a.w, face === 'n' ? line + a.d : line] : [face === 'w' ? line : line - a.d, u, face === 'w' ? line + a.d : line, u + a.w]);
      u += a.w + gap;
    }
    return placed;
  };
  const F = DAIGAKUFRONT;
  const letterFront = (id: string, a: Anchor) => {
    const p = a.pts;
    if (id.startsWith('kosho')) {
      const n = nextName('books', BOOKS);
      if (p.name) label(p.name, n.ja, n.en, id === 'kosho_c' || id === 'kosho_e' ? '#f4f1e8' : '#2a2019', id === 'kosho_c' || id === 'kosho_e' ? '#2a2019' : '#e8d9b0');
      // The book carts out front.
      b.block(-a.w / 2 + 0.3, GY, -0.9, a.w / 2 - 0.3, GY + 1.0, -0.1);
      return;
    }
    if (id.startsWith('mise')) {
      const kind = id === 'mise_a' ? 'teishoku' : id === 'mise_b' ? 'stationer' : id === 'mise_c' ? 'tabako' : 'print';
      const n = nextName(kind, SHOPS[kind]);
      const dark = id === 'mise_d';
      if (p.name) label(p.name, n.ja, n.en, dark ? '#2a2019' : '#f4f1e8', dark ? '#f1ead8' : '#2a2019');
      return;
    }
    if (id.startsWith('biru')) {
      const n = nextName('biru', SHOPS.biru);
      if (p.vertical) upright(p.vertical, n.ja, '#f4f1e8', '#1f3f7a');
      if (p.roof) label(p.roof, n.ja, n.en, '#1f3f7a', '#ffffff');
      return;
    }
    if (id.startsWith('geshuku')) {
      const n = nextName('lodge', LODGE);
      if (p.name) {
        upright(p.name, n.ja, '#e9e2d2', '#2a2019');
        // A bracket lamp by the door, beside the name board (lamps.ts lights round it at night).
        const lx = p.name[0] + (p.name[0] < 0 ? 0.7 : -0.7);
        b.deco('metal:#26282b', lx - 0.02, GY + 2.72, -0.32, lx + 0.02, GY + 2.76, 0);
        b.mesh('glow:#ffd9a0', 'sphere', lx, GY + 2.6, -0.34, 0.2, 0.24, 0.2);
      }
    }
  };
  const SHOPIDS = ['mise_a', 'mise_b', 'mise_c', 'mise_d'];
  const KOSHO = ['kosho_a', 'kosho_b', 'kosho_c', 'kosho_d', 'kosho_e'];
  const MIXED = [...SHOPIDS, 'biru_a', 'biru_b', 'kosho_b', 'kosho_d'];
  const fronts = (face: Face, line: number, u0: number, u1: number, ids: string[]) => row('daigakufront', F, face, line, u0, u1, ids, letterFront, true);
  // The kissaten on the Kiri-suji corner (its corner face looks onto Kiri-suji).
  const KISSA: Named = { ja: '珈琲 振子', en: 'Coffee Furiko' };
  piece('daigakufront', F, 'kissa_r', 's', bl(KIRI)[1] + F.kissa_r.w / 2 + 0.05, -FRONT, (a) => {
    const p = a.pts;
    label(p.name, KISSA.ja, KISSA.en, '#2a2019', '#e8d9b0');
    label(p.side, KISSA.ja, KISSA.en, '#2a2019', '#e8d9b0');
    upright(p.vertical, '珈琲', '#2f6b45', '#f1ead8');
  });
  const kissaEnd = bl(KIRI)[1] + F.kissa_r.w + 0.1;
  // The bookshops facing the campus wall, from the kissaten to Keisetsu-yokochō.
  fronts('s', -FRONT, kissaEnd, KEI[0] - 0.1, [...KOSHO, 'mise_c']);
  // East of the lane to Azusa-suji; the outer blocks.
  fronts('s', -FRONT, KEI[1] + 0.1, bl(AZU)[0] - 0.2, MIXED);
  fronts('s', -FRONT, -X + 0.3, bl(KIRI)[0] - 0.2, MIXED);
  fronts('s', -FRONT, bl(AZU)[1] + 0.2, X - 0.3, MIXED);

  // ── The back lane behind the front row ──
  for (const [x0, x1] of [[-X, bl(KIRI)[0]], [bl(KIRI)[1], KEI[0]], [KEI[1], bl(AZU)[0]], [bl(AZU)[1], X]] as [number, number][]) {
    lanePave(x0, BL[0], x1, BL[1], x0 === bl(KIRI)[1] ? { ja: '書肆裏小路', en: 'Booksellers’ back lane' } : undefined);
    for (let x = x0 + 9; x < x1 - 4; x += 18) streetLamp(b, 'lamp_small', x, BL[0] + 0.25, [0, 1]);
  }

  // ═════════════════════════ 蛍雪横丁 Keisetsu-yokochō ═════════════════════════
  {
    const [k0, k1] = KEI;
    const spans: [number, number][] = [[-Z, B0], [B1, BL[0]], [BL[0], BL[1]], [BL[1], -FRONT]];
    for (const [z0, z1] of spans) {
      b.deco(SETT, k0, GY + 0.002, z0, k1, GY + 0.012, z1);
      reserved.push([k0, z0, k1, z1]);
    }
    b.zone('street', k0 + 0.3, GY - 0.2, B1 + 0.3, k1 - 0.3, GY + 7, -FRONT - 0.3, KEI_NAME.ja, `${KEI_NAME.en} (south)`, true);
    b.zone('street', k0 + 0.3, GY - 0.2, -Z + 0.3, k1 - 0.3, GY + 7, B0 - 0.3, `${KEI_NAME.ja}（北）`, `${KEI_NAME.en} (north)`, true);
    // Its shops, both sides, behind the front row and north of Bunko-dōri.
    for (const [z0, z1] of [[B1 + 0.2, BL[0] - 0.1], [-Z + 0.3, B0 - 0.2]] as [number, number][]) {
      row('daigakufront', F, 'e', k0, z0, z1, [...SHOPIDS, 'kosho_c', 'kosho_a'], letterFront, true);
      row('daigakufront', F, 'w', k1, z0, z1, [...SHOPIDS, 'kosho_e', 'kosho_c'], letterFront, true);
    }
    // Name boards on posts at each end, bollards across the mouths, lamps, flags and bicycles.
    for (const [z, f] of [[-FRONT - 0.8, -1], [B1 + 0.8, 1], [B0 - 0.8, -1]] as [number, 1 | -1][]) {
      for (const x of [k0 + 0.3, k1 - 0.3]) {
        b.box('flat:#3a3d41', x - 0.08, GY, z - 0.08, x + 0.08, GY + 4.2, z + 0.08);
      }
      b.box('flat:#2a2019', k0 + 0.25, GY + 3.6, z - 0.06, k1 - 0.25, GY + 4.4, z + 0.06);
      b.sign({ k: 'label', text: KEI_NAME.ja, sub: 'Keisetsu-yokochō', fg: '#f1ead8', bg: '#2a2019' }, (k0 + k1) / 2, GY + 4.0, z - f * 0.07, [0, -f], k1 - k0 - 0.7, 0.7);
      b.sign({ k: 'label', text: KEI_NAME.ja, sub: 'Keisetsu-yokochō', fg: '#f1ead8', bg: '#2a2019' }, (k0 + k1) / 2, GY + 4.0, z + f * 0.07, [0, f], k1 - k0 - 0.7, 0.7);
      for (const x of [k0 + 0.6, (k0 + k1) / 2, k1 - 0.6]) {
        roadModel(b, 'bollard', x, GY, z + f * 0.6, [0, 1]);
        b.block(x - 0.15, GY, z + f * 0.6 - 0.15, x + 0.15, GY + 0.9, z + f * 0.6 + 0.15);
      }
    }
    for (const [z0, z1] of [[-Z, B0], [B1, -FRONT]]) {
      for (let z = z0 + 6; z < z1 - 3; z += 12) streetLamp(b, 'lamp_suzuran', (k0 + k1) / 2, z, [1, 0]);
      for (let z = z0 + 9; z < z1 - 4; z += 15) bike(k1 - 0.5, z, [0, 1]);
    }
  }

  // ═════════════════════════ North of Bunko-dōri: the lodgings ═════════════════════════
  const kMine = KEI[0] - SHOP_D; // −3: the lane's west shops' backs
  {
    // Geshuku-kōji, north–south, and Yuya-kōji east–west past the bath house.
    lanePave(GES[0], -Z, GES[1], B0, { ja: '下宿小路', en: 'Geshuku-kōji' });
    lanePave(bl(KIRI)[1], YUYA[0], GES[0], YUYA[1], { ja: '湯屋小路', en: 'Yuya-kōji (west)' });
    lanePave(GES[1], YUYA[0], kMine, YUYA[1], { ja: '湯屋小路', en: 'Yuya-kōji' });
    for (let z = -Z + 8; z < B0 - 3; z += 13) streetLamp(b, 'lamp_small', GES[1] - 0.25, z, [-1, 0]);
    for (let x = bl(KIRI)[1] + 7; x < kMine - 3; x += 14) if (clearOf(x, [GES], 2)) streetLamp(b, 'lamp_small', x, YUYA[1] - 0.25, [0, -1]);
    const letterLodge = (id: string, a: Anchor) => letterFront(id, a);
    const GESHUKU = ['geshuku_a', 'geshuku_b', 'geshuku_c'];
    // On Bunko-dōri, both sides of Geshuku-kōji; on Yuya-kōji, the same.
    row('daigakufront', F, 's', B0, bl(KIRI)[1] + 0.3, GES[0] - 0.3, GESHUKU, letterLodge, true);
    row('daigakufront', F, 's', B0, GES[1] + 0.3, kMine - 0.3, GESHUKU, letterLodge, true);
    row('daigakufront', F, 's', YUYA[0], bl(KIRI)[1] + 0.3, GES[0] - 0.3, GESHUKU, letterLodge, true);
    // The bath house, on Yuya-kōji, and lodgings either side of it.
    const SENTO = { x0: -30, x1: -12 };
    piece('daigakufront', F, 'sento', 's', (SENTO.x0 + SENTO.x1) / 2, YUYA[0], (a) => {
      const p = a.pts;
      label(p.name, '雀湯', 'Suzume-yu (public bath)', '#2a2019', '#f1ead8');
      upright(p.chimney, '雀湯', '#f4f1e8', '#2a2019');
      signAt(p.noren_l, { k: 'label', text: '男', fg: '#ffffff', bg: '#1f3f7a' });
      signAt(p.noren_r, { k: 'label', text: '女', fg: '#ffffff', bg: '#b7282e' });
      // A paper lantern over each entrance.
      for (const q of [p.noren_l, p.noren_r]) {
        b.deco('metal:#26282b', q[0] - 0.02, GY + 3.1, q[2] - 1.15, q[0] + 0.02, GY + 3.14, 0);
        b.mesh('glow:#ffd9a0', 'sphere', q[0], GY + 2.8, q[2] - 1.15, 0.36, 0.5, 0.36);
      }
    });
    row('daigakufront', F, 's', YUYA[0], GES[1] + 0.3, SENTO.x0 - 0.2, ['geshuku_c'], letterLodge, true);
    row('daigakufront', F, 's', YUYA[0], SENTO.x1 + 0.2, kMine - 0.3, ['geshuku_c'], letterLodge, true);
    // Bicycles and a vending corner by the lodgings.
    for (let x = bl(KIRI)[1] + 4; x < kMine - 3; x += 9) if (clearOf(x, [GES], 1.5)) bike(x, B0 - 10.6, [0, 1]);
    vending(b, GES[1] + 0.5, GY, B0 - 1.2, [1, 0], 'vending', 'old');
    vending(b, GES[1] + 0.5, GY, B0 - 2.3, [1, 0], 'vending2', 'old');
    b.block(GES[1] + 0.1, GY, B0 - 2.9, GES[1] + 0.9, GY + 1.9, B0 - 0.6);
  }

  // ═════════════════════════ The campus ═════════════════════════
  const D = DAIGAKU;
  {
    // ── The wall, from each opening outwards, in 12, 6 and 3 m pieces (past the plot's edge at the ends) ──
    const runWall = (u0: number, u1: number, fromEnd: boolean) => {
      // Lay pieces from u0 (or from u1 backwards) until the span is covered; the last may run past the edge.
      const L = u1 - u0;
      const ids: string[] = [];
      let rem = L;
      while (rem > 0.05) {
        const id = rem >= 12 ? 'wall_12' : rem >= 6 ? 'wall_6' : 'wall_3';
        ids.push(id);
        rem -= D[id].w;
      }
      let u = fromEnd ? u1 : u0;
      for (const id of ids) {
        const w = D[id].w, c = fromEnd ? u - w / 2 : u + w / 2;
        piece('daigaku', D, id, 'n', c, WALL, undefined, false);
        b.block(c - w / 2, GY, WALL + 0.05, c + w / 2, GY + 2.5, WALL + 0.5);
        u += fromEnd ? -w : w;
      }
    };
    runWall(-X - 1, SIDE[0], true);
    runWall(SIDE[1], GATE[0], false);
    runWall(GATE[1], OPEN[0], false);
    runWall(OPEN[1], X + 1, false);
    // ── The main gate ──
    piece('daigaku', D, 'gate', 'n', 0, WALL, (a) => {
      const p = a.pts;
      for (const k of ['plate_l', 'plate_r']) upright(p[k], '川湊大学', '#e6dcc6', '#2a2019');
      // Colliders: the piers (big and small) and the low walls, the leaves.
      for (const sx of [-1, 1]) {
        b.block(sx * 5 - 0.83, GY, -0.83, sx * 5 + 0.83, GY + 6.4, 1.83);
        b.block(sx * 7.6 - 0.5, GY, -0.5, sx * 7.6 + 0.5, GY + 3.4, 1.5);
        b.block(Math.min(sx * 8.02, sx * 8), GY, 0, Math.max(sx * 8.02, sx * 8), GY + 2.5, 0.55);
        b.block(sx * 4.15 - 0.06, GY, 1.0, sx * 4.15 + 0.06, GY + 2.6, 5.0);
        b.block(Math.min(sx * 6.3, sx * 6.4) - 0.05, GY, 1.0, Math.max(sx * 6.3, sx * 6.4) + 0.05, GY + 1.9, 2.2);
      }
    }, false);
    b.zone('street', GATE[0] + 0.5, GY - 0.2, WALL - 0.5, GATE[1] - 0.5, GY + 6, WALL + 3, '川湊大学 正門', 'Kawaminato University — Main Gate', true);
    piece('daigaku', D, 'gatehouse', 'w', 9, 23, (a) => {
      label(a.pts.name, '守衛所', 'Porter’s lodge', '#2a2019', '#f1ead8');
    });
    // ── The side gate by Exit 4 ──
    piece('daigaku', D, 'sidegate', 'n', (SIDE[0] + SIDE[1]) / 2, WALL, (a) => {
      upright(a.pts.plate, '川湊大学 西通用門', '#e6dcc6', '#2a2019');
      for (const sx of [-1, 1]) {
        b.block(sx * 2.25 - 0.53, GY, -0.53, sx * 2.25 + 0.53, GY + 3.6, 1.53);
        b.block(Math.min(sx * 2.78, sx * 3), GY, 0, Math.max(sx * 2.78, sx * 3), GY + 2.5, 0.55);
        b.block(sx * 1.75 - 0.05, GY, 0.6, sx * 1.75 + 0.05, GY + 2.0, 2.3);
      }
    }, false);
    // ── Paving inside: the ginkgo avenue from the gate, paths, the forecourt; lawns and groves elsewhere ──
    const AV: [number, number] = [-8, 8];
    b.deco(STONE, AV[0], GY + 0.002, IN, AV[1], GY + 0.012, Z);
    for (let z = IN + 1; z < Z; z += 3) b.deco('flat:#a89d88', AV[0], GY + 0.012, z, AV[1], GY + 0.014, z + 0.08);
    b.zone('street', AV[0] + 0.3, GY - 0.2, IN + 3, AV[1] - 0.3, GY + 12, AUD.z0 - 9, '銀杏並木', 'Kawaminato University — Ginkgo Avenue', true);
    for (let z = IN + 8; z < AUD.z0 - 8; z += 9.5) {
      for (const sx of [-1, 1]) tree(sx * 6.4, z, 'ginkgo');
      if (Math.round(z) % 2 === 0) streetLamp(b, 'lamp_park', -7.6, z + 4.7, [1, 0]);
      else streetLamp(b, 'lamp_park', 7.6, z + 4.7, [-1, 0]);
    }
    // The library forecourt: brick paving, two lawns with cherries, benches, the library's name on a post.
    b.deco(BRICKPAVE, LIB.x0, GY + 0.002, IN, LIB.x1, GY + 0.012, LIB.z0);
    for (let x = LIB.x0 + 1.5; x < LIB.x1; x += 3) b.deco('flat:#b8ad98', x, GY + 0.012, IN, x + 0.1, GY + 0.014, LIB.z0);
    b.zone('street', LIB.x0 + 0.3, GY - 0.2, IN + 0.3, LIB.x1 - 0.3, GY + 10, LIB.z0 - 0.3, '附属図書館 前庭', 'University Library — forecourt', true);
    for (const [x0, x1] of [[LIB.x0 + 1, LIB.x0 + 9], [LIB.x1 - 9, LIB.x1 - 1]]) {
      b.box('flat:#7a4433', x0, GY, IN + 4, x1, GY + 0.45, LIB.z0 - 4);
      b.deco(GRASS, x0 + 0.2, GY + 0.45, IN + 4.2, x1 - 0.2, GY + 0.47, LIB.z0 - 4.2);
      tree((x0 + x1) / 2, (IN + LIB.z0) / 2, 'cherry');
      for (const z of [IN + 6, LIB.z0 - 6]) {
        const bx = x0 < 50 ? x1 + 0.6 : x0 - 0.6;
        roadModel(b, 'bench_s', bx, GY, z, [x0 < 50 ? 1 : -1, 0]);
        b.block(bx - 0.4, GY, z - 0.95, bx + 0.4, GY + 0.6, z + 0.95);
      }
    }
    for (const sx of [-1, 1]) streetLamp(b, 'lamp_park', 54 + sx * 6, LIB.z0 - 2.5, [0, -1]);
    // ── The library: its walls are the model, the hall and reading room inside are daigaku-library.ts ──
    piece('daigaku', D, 'library', 'n', (LIB.x0 + LIB.x1) / 2, LIB.z0, (a) => {
      label(a.pts.name, '川湊大学附属図書館', 'Kawaminato University Library', '#e6dcc6', '#2a2019');
      signAt(a.pts.clock, { k: 'label', text: '1925', sub: undefined, fg: '#2a2019', bg: '#e6dcc6' });
      // The hall and the reading room inside (daigaku-library.ts): its own walls and colliders.
      const Dr = a.pts._door;
      libraryInside(b, GY, { w: a.w, d: a.d, h: a.h, zf: a.pts._front[2], door: [Dr[3], Dr[4]] }, seed);
    }, false);
    // ── Lecture halls west, with a lawn and the bicycle park before them ──
    const halls: [string, number, number][] = [['hall_a', -49, 42], ['hall_b', -94, 42]];
    const HALLNAME: Named[] = [{ ja: '法文一号館', en: 'Law & Letters Bldg. 1' }, { ja: '理学部二号館', en: 'Science Bldg. 2' }];
    halls.forEach(([id, x, z], k) => piece('daigaku', D, id, 'n', x, z, (a) => label(a.pts.name, HALLNAME[k].ja, HALLNAME[k].en, '#e6dcc6', '#2a2019')));
    b.deco(GRASS, -110, GY + 0.002, IN + 1, AV[0] - 1, GY + 0.012, 66);
    b.deco(STONE, -110, GY + 0.004, 38, AV[0], GY + 0.022, 41.5);
    b.deco(STONE, -51.5, GY + 0.004, IN, -46.5, GY + 0.022, 38);
    b.deco(STONE, SIDE[0] + 0.5, GY + 0.004, IN, SIDE[1] - 0.5, GY + 0.022, 38);
    b.zone('street', -110, GY - 0.2, IN + 0.5, AV[0] - 0.5, GY + 8, 41.5, '法文前 芝生', 'The lawn before the halls', true);
    // The bicycle park under a roof, east of the side gate.
    {
      const x0 = -30, x1 = -12, z0 = IN + 3, z1 = IN + 9;
      b.deco('flat:#8d8f8c', x0, GY + 0.004, z0, x1, GY + 0.022, z1);
      for (let x = x0 + 0.5; x < x1; x += 4.5) {
        b.box('metal:#8d9094', x - 0.06, GY, z1 - 0.3, x + 0.06, GY + 2.4, z1 - 0.18);
        b.block(x - 0.08, GY, z1 - 0.32, x + 0.08, GY + 2.4, z1 - 0.16);
      }
      b.box('flat:#3e4247', x0 - 0.2, GY + 2.4, z0 - 0.3, x1 + 0.2, GY + 2.55, z1);
      for (let x = x0 + 0.6; x < x1 - 0.3; x += 0.7) bike(x, (z0 + z1) / 2, [0, 1]);
      b.block(x0, GY, z0 + 1, x1, GY + 1.1, z1 - 0.3);
      b.zone('street', x0 + 0.2, GY - 0.2, z0 - 2, x1 - 0.2, GY + 2.3, z0 + 0.8, '駐輪場', 'Bicycle park', true);
    }
    // ── East of the library: the cafeteria and a grove ──
    piece('daigaku', D, 'shokudo', 'w', 91, 41, (a) => {
      label(a.pts.name, '第一食堂', 'Student Cafeteria 1', '#f4f1e8', '#7a1f2b');
    });
    b.deco(STONE, LIB.x1, GY + 0.003, IN, 90.5, GY + 0.013, Z);
    b.zone('street', LIB.x1 + 0.3, GY - 0.2, IN + 0.5, 90.2, GY + 8, Z - 0.3, '図書館東の道', 'Path east of the library', true);
    b.deco(GRASS, 90.5, GY + 0.002, IN + 1, X, GY + 0.012, 29);
    // Groves and lawns to the south edge, paths between.
    b.deco(GRASS, -110, GY + 0.002, 66, AV[0] - 1, GY + 0.012, Z);
    b.deco(GRASS, AV[1] + 1, GY + 0.002, 71, LIB.x1, GY + 0.012, Z);
    b.deco(GRASS, 90.5, GY + 0.002, 54, X, GY + 0.012, Z);
    b.deco(GRASS, AV[1] + 1, GY + 0.002, 27, LIB.x0 - 1, GY + 0.012, 70);
    b.deco(EARTH, -X, GY + 0.002, IN + 1, -110, GY + 0.012, Z);
    for (const [x0, z0, x1, z1, kind] of [[-108, 68, -80, 84, 'camphor'], [-42, 68, -26, 84, 'camphor'], [26, 73, 82, 84, 'zelkova'], [93, 60, 128, 84, 'camphor'], [-129, 22, -112, 84, 'cedar'], [115, 21, 128, 56, 'cherry']] as [number, number, number, number, TreeKind][]) {
      for (let x = x0 + 4; x < x1; x += 9) for (let z = z0 + 3; z < z1; z += 8) tree(x + (r() - 0.5) * 3, z + (r() - 0.5) * 2, kind);
    }
    for (let z = 30; z < AUD.z0 - 6; z += 9) tree(AV[1] + 6 + (r() - 0.5) * 2, z, 'momiji');
    b.zone('street', -108, GY - 0.2, 66.5, AV[0] - 1, GY + 10, Z - 0.5, '欅の森', 'Keyaki Grove', true);
    // ── The auditorium closing the avenue, a stone plaza before it ──
    b.deco(STONE, -AUD.hw - 2, GY + 0.003, AUD.z0 - 9, AUD.hw + 2, GY + 0.013, AUD.z0);
    b.zone('street', -AUD.hw, GY - 0.2, AUD.z0 - 8.5, AUD.hw, GY + 10, AUD.z0 - 5.2, '大講堂前広場', 'Auditorium plaza', true);
    piece('daigaku', D, 'auditorium', 'n', 0, AUD.z0, (a) => {
      label(a.pts.name, '川湊大学 大講堂', 'Grand Auditorium', '#e6dcc6', '#2a2019');
      signAt(a.pts.clock, { k: 'clock' }, { dynamic: true });
      // The tower stands forward of the wings, its corner buttresses further still.
      const Tw = a.pts._tower, tz = Tw[2] - Tw[4] / 2;
      b.block(-Tw[3] / 2, GY, tz, Tw[3] / 2, GY + 36, 0);
      for (const sx of [-1, 1]) b.block(Math.min(sx * (Tw[3] / 2 - 1.0), sx * (Tw[3] / 2 + 0.2)), GY, tz - 0.9, Math.max(sx * (Tw[3] / 2 - 1.0), sx * (Tw[3] / 2 + 0.2)), GY + 36, tz);
    });
    for (const sx of [-1, 1]) for (const z of [AUD.z0 - 7.5, AUD.z0 - 3.5]) {
      roadModel(b, 'bench_s', sx * 12, GY, z, [0, -1]);
      b.block(sx * 12 - 0.95, GY, z - 0.4, sx * 12 + 0.95, GY + 0.6, z + 0.4);
    }

    // ── The pond garden in the grove west of it: a stone-kerbed pond, a timber bridge, a lantern, rocks ──
    {
      const { x0, x1, z0, z1 } = POND, xm = (x0 + x1) / 2, K = 0.5, BW = 0.85;
      b.deco('flat:#4f6b3e', x0 - 3, GY + 0.004, z0 - 3, x1 + 3, GY + 0.014, z1 + 1.5);
      // The kerb ring (solid, low enough to step on), broken where the bridge lands; the water inside it.
      for (const [c, f] of [[z0, z0 + K], [z1 - K, z1]]) for (const [p, q] of [[x0, xm - BW], [xm + BW, x1]]) b.box('flat:#8d8a80', p, GY, c, q, GY + 0.3, f);
      for (const [a, e] of [[x0, x0 + K], [x1 - K, x1]]) b.box('flat:#8d8a80', a, GY, z0 + K, e, GY + 0.3, z1 - K);
      b.deco('water', x0 + K, GY + 0.12, z0 + K, x1 - K, GY + 0.14, z1 - K);
      b.deco('flat:#1f3036', x0 + K, GY + 0.014, z0 + K, x1 - K, GY + 0.12, z1 - K);
      for (const [p, q] of [[x0 + K, xm - BW], [xm + BW, x1 - K]]) b.block(p, GY, z0 + K, q, GY + 1.0, z1 - K);
      // The bridge: a timber deck with low rails, straight across north to south.
      b.box('wood:#6b4f37', xm - BW, GY + 0.2, z0 - 0.6, xm + BW, GY + 0.32, z1 + 0.6);
      for (const sx of [-1, 1]) {
        const x = xm + sx * (BW - 0.06);
        b.deco('wood:#5a3f28', x - 0.05, GY + 0.82, z0 - 0.4, x + 0.05, GY + 0.9, z1 + 0.4);
        for (let z = z0 - 0.4; z <= z1 + 0.4; z += 1.6) b.deco('wood:#5a3f28', x - 0.05, GY + 0.32, z - 0.05, x + 0.05, GY + 0.9, z + 0.05);
        b.block(x - 0.06, GY + 0.32, z0 - 0.4, x + 0.06, GY + 1.2, z1 + 0.4);
      }
      // Rocks along the edge, irises in the shallows, a stone lantern and two benches on the north side.
      for (let k = 0; k < 16; k++) {
        const t = k / 16, onX = k % 2 === 0;
        const x = onX ? x0 + 1 + t * (x1 - x0 - 2) : (k % 4 === 1 ? x0 - 0.5 : x1 + 0.5), z = onX ? (k % 4 === 0 ? z0 - 0.5 : z1 + 0.5) : z0 + 1 + t * (z1 - z0 - 2);
        if (Math.abs(x - xm) < BW + 1) continue;
        const sz = 0.5 + r() * 0.6;
        b.mesh('flat:#7d7a72', 'sphere', x, GY + sz * 0.25, z, sz * 1.4, sz * 0.8, sz);
      }
      for (const [x, z] of [[x0 + 2.5, z0 + 1.6], [x0 + 4, z0 + 1.4], [x1 - 3, z1 - 1.5], [x1 - 6, z1 - 1.3]]) {
        for (let k = 0; k < 5; k++) b.deco('leaf', x + k * 0.18 - 0.4, GY + 0.14, z - 0.04, x + k * 0.18 - 0.36, GY + 0.75 + (k % 2) * 0.2, z + 0.04);
        b.mesh('glow:#8e7cc3', 'sphere', x, GY + 0.85, z, 0.1, 0.08, 0.1);
      }
      {
        const lx = x0 - 1.8, lz = z0 + 3.5;
        b.box('flat:#9a968c', lx - 0.45, GY, lz - 0.45, lx + 0.45, GY + 0.25, lz + 0.45);
        b.mesh('flat:#9a968c', 'cyl', lx, GY + 0.75, lz, 0.22, 1.0, 0.22);
        b.deco('flat:#9a968c', lx - 0.35, GY + 1.25, lz - 0.35, lx + 0.35, GY + 1.33, lz + 0.35);
        b.deco('flat:#9a968c', lx - 0.25, GY + 1.33, lz - 0.25, lx + 0.25, GY + 1.75, lz + 0.25);
        b.deco('glow:#ffd9a0', lx - 0.12, GY + 1.43, lz - 0.26, lx + 0.12, GY + 1.65, lz + 0.26);
        b.mesh('flat:#9a968c', 'cyl', lx, GY + 1.95, lz, 0.55, 0.4, 0.55);
        b.mesh('flat:#9a968c', 'sphere', lx, GY + 2.2, lz, 0.18, 0.18, 0.18);
        b.block(lx - 0.45, GY, lz - 0.45, lx + 0.45, GY + 2.2, lz + 0.45);
      }
      for (const x of [xm - 7, xm + 7]) {
        roadModel(b, 'bench_s', x, GY, z0 - 2.2, [0, 1]);
        b.block(x - 0.95, GY, z0 - 2.6, x + 0.95, GY + 0.6, z0 - 1.8);
      }
      tree(x1 + 3.5, z0 + 2, 'momiji');
      tree(x0 - 3.5, z1 - 1.5, 'momiji');
      tree(x1 + 3, z1 - 2, 'cherry');
      b.deco(STONE, xm - 1, GY + 0.004, 66, xm + 1, GY + 0.016, z0 - 0.6);
      b.zone('street', x0 - 2.5, GY - 0.2, z0 - 3, x1 + 2.5, GY + 6, z0 - 0.7, '心字池', 'Shinji Pond garden', true);
    }

    // ── Campus life: a campus map inside the gate, notice cases, benches down the avenue, the founder's bust, bicycles, drinks ──
    {
      // The map board facing the gate, the campus drawn on it as you face south (east on the left).
      const bx = 17.5, bz = IN + 3.2, W = 3.2, H = 0.8, y0 = GY + 1.0;
      for (const sx of [-1, 1]) b.deco('metal:#3a3d40', bx + sx * (W / 2 + 0.05) - 0.05, GY, bz - 0.05, bx + sx * (W / 2 + 0.05) + 0.05, y0 + H + 0.5, bz + 0.05);
      b.deco('metal:#3a3d40', bx - W / 2 - 0.1, y0 - 0.1, bz, bx + W / 2 + 0.1, y0 + H + 0.55, bz + 0.06);
      b.deco('flat:#f1ece0', bx - W / 2, y0, bz - 0.01, bx + W / 2, y0 + H, bz);
      const m = (x: number) => bx + (x / X) * (W / 2), v = (z: number) => y0 + ((z - IN) / (Z - IN)) * H;
      const feat: [number, number, number, number, string][] = [
        [-130, IN, 130, IN + 0.6, '#9a5a43'], [AV[0], IN, AV[1], AUD.z0, '#cfc6b4'], [LIB.x0, LIB.z0, LIB.x1, LIB.z1, '#a8442e'],
        [-68, 42, -30, 64, '#8a5a46'], [-109, 42, -79, 62, '#8a5a46'], [-AUD.hw, AUD.z0, AUD.hw, Z - 2, '#7a2f22'],
        [91, 25, 113, 57, '#9a9890'], [POND.x0, POND.z0, POND.x1, POND.z1, '#5b8fb0'], [-108, 66, -26, Z, '#9fbf8a'], [26, 73, 82, Z, '#9fbf8a'],
      ];
      for (const [x0, z0, x1, z1, col] of feat) b.deco(`flat:${col}`, Math.min(m(x0), m(x1)), v(z0), bz - 0.016, Math.max(m(x0), m(x1)), v(z1), bz - 0.011);
      b.mesh('glow:#e53935', 'sphere', m(bx), v(bz), bz - 0.02, 0.06, 0.06, 0.02);
      b.sign({ k: 'label', text: '川湊大学 構内案内図', sub: 'Campus map — you are here', fg: '#ffffff', bg: '#7a1f2b' }, bx, y0 + H + 0.24, bz - 0.012, [0, -1], W, 0.4);
      b.block(bx - W / 2 - 0.15, GY, bz - 0.1, bx + W / 2 + 0.15, GY + 2.3, bz + 0.12);
      // Notice cases on the avenue's west edge: glass-fronted, a little roof, papers pinned inside.
      for (const zc of [IN + 6, IN + 10]) {
        const x = AV[0] - 0.6, w = 3.0;
        for (const dz of [-w / 2, w / 2]) b.deco('metal:#3a3d40', x - 0.2, GY, zc + dz - 0.05, x - 0.1, GY + 2.1, zc + dz + 0.05);
        b.deco('wood:#5a3f28', x - 0.25, GY + 0.9, zc - w / 2, x - 0.1, GY + 2.0, zc + w / 2);
        b.deco('flat:#b98a5c', x - 0.1, GY + 0.95, zc - w / 2 + 0.05, x - 0.09, GY + 1.95, zc + w / 2 - 0.05);
        for (let k = 0; k < 9; k++) {
          const z = zc - w / 2 + 0.2 + (k % 5) * 0.55 + r() * 0.1, y = GY + 1.05 + Math.floor(k / 5) * 0.45 + r() * 0.05;
          b.deco(`flat:${['#f4f1e6', '#fdf6d8', '#f4f1e6', '#e8eef4'][k % 4]}`, x - 0.09, y, z, x - 0.085, y + 0.36, z + 0.26);
        }
        b.deco('glass', x - 0.05, GY + 0.95, zc - w / 2, x - 0.04, GY + 1.95, zc + w / 2);
        b.deco('flat:#3e4247', x - 0.4, GY + 2.0, zc - w / 2 - 0.1, x + 0.1, GY + 2.08, zc + w / 2 + 0.1);
        b.sign({ k: 'label', text: '掲示板', sub: 'Notices', fg: '#ffffff', bg: '#2f4a3a' }, x - 0.03, GY + 2.25, zc, [1, 0], 1.0, 0.24);
        b.block(x - 0.3, GY, zc - w / 2 - 0.1, x, GY + 2.1, zc + w / 2 + 0.1);
      }
      // Benches down the avenue, between the ginkgos.
      for (let z = IN + 12.5; z < AUD.z0 - 10; z += 19) for (const sx of [-1, 1]) {
        roadModel(b, 'bench_s', sx * 7.2, GY, z, [-sx, 0]);
        b.block(sx * 7.2 - 0.4, GY, z - 0.95, sx * 7.2 + 0.4, GY + 0.6, z + 0.95);
      }
      // The founder's bust on the lawn before the Law and Letters building.
      {
        const x = -49, z = 33;
        b.box('flat:#b8ad98', x - 0.7, GY, z - 0.7, x + 0.7, GY + 0.3, z + 0.7);
        b.box('flat:#cdc4b0', x - 0.45, GY + 0.3, z - 0.45, x + 0.45, GY + 1.75, z + 0.45);
        b.deco('metal:#4e4130', x - 0.42, GY + 1.75, z - 0.22, x + 0.42, GY + 2.15, z + 0.22);
        b.mesh('metal:#4e4130', 'sphere', x, GY + 2.42, z, 0.36, 0.44, 0.38);
        b.sign({ k: 'label', text: '初代総長像', sub: 'The first president', fg: '#2a2019', bg: '#d6ccb6' }, x, GY + 1.2, z - 0.46, [0, -1], 0.8, 0.3);
        b.block(x - 0.7, GY, z - 0.7, x + 0.7, GY + 2.6, z + 0.7);
      }
      // Bicycles along the hall's path, and drinks by the cafeteria.
      for (let x = -66; x < -33; x += 0.75) if (Math.abs(x + 49) > 3.2) bike(x, 37.1, [0, 1]);
      vending(b, 90.4, GY, 27.4, [-1, 0], 'vending');
      vending(b, 90.4, GY, 28.5, [-1, 0], 'vending2');
    }

    // Lamps along the paths.
    for (let x = -100; x < AV[0] - 4; x += 16) streetLamp(b, 'lamp_park', x, 41.2, [0, -1]);
    for (let z = IN + 6; z < Z - 4; z += 14) streetLamp(b, 'lamp_park', LIB.x1 + 0.5, z, [1, 0]);
  }

  /** The athletics ground past the south edge: a fenced earth track round a grass field, a grandstand, the clubhouse. */
  function sportsGround() {
    const { x0, x1, z0, z1 } = SPORTS, T = 6;
    b.deco('flat:#a5523c', x0, -0.01, z0, x1, GY + 0.014, z1);
    b.deco('flat:#6c8a4a', x0 + T, -0.01, z0 + T, x1 - T, GY + 0.018, z1 - T);
    for (let k = 1; k < 5; k++) {
      const o = (k * T) / 5;
      for (const [a, c, e, f] of [[x0 + o, z0 + o, x1 - o, z0 + o + 0.06], [x0 + o, z1 - o - 0.06, x1 - o, z1 - o], [x0 + o, z0 + o, x0 + o + 0.06, z1 - o], [x1 - o - 0.06, z0 + o, x1 - o, z1 - o]] as Rect[]) {
        b.deco(WHITE, a, GY + 0.016, c, e, GY + 0.02, f);
      }
    }
    // Football goals at either end of the field.
    for (const x of [x0 + T + 1, x1 - T - 1]) {
      const zc = (z0 + z1) / 2;
      for (const dz of [-3.66, 3.66]) b.deco(WHITE, x - 0.06, GY, zc + dz - 0.06, x + 0.06, GY + 2.44, zc + dz + 0.06);
      b.deco(WHITE, x - 0.06, GY + 2.38, zc - 3.7, x + 0.06, GY + 2.5, zc + 3.7);
    }
    // The fence round it: posts, two rails, a green mesh.
    const fence = (a: number, c: number, e: number, f: number) => {
      const len = Math.max(e - a, f - c), alongX = e - a > f - c;
      for (let u = 0; u <= len; u += 3) {
        const x = alongX ? a + u : a, z = alongX ? c : c + u;
        b.deco('metal:#4a5550', x - 0.04, GY, z - 0.04, x + 0.04, GY + 2.6, z + 0.04);
      }
      for (const y of [GY + 1.2, GY + 2.55]) b.deco('metal:#4a5550', a - 0.03, y, c - 0.03, e + 0.03, y + 0.05, f + 0.03);
      b.deco('glassTint', a, GY + 0.1, c - 0.01, e, GY + 2.55, f + 0.01);
    };
    fence(x0 - 2, z0 - 2, x1 + 2, z0 - 2);
    fence(x0 - 2, z0 - 2, x0 - 2, z1 + 8);
    fence(x1 + 2, z0 - 2, x1 + 2, z1 + 8);
    // The grandstand on the south side, its terraces stepping up away from the field, a roof on columns.
    {
      const ga = -95, ge = -50, gz = z1 + 1;
      for (let k = 0; k < 6; k++) b.deco('flat:#b9b6ac', ga, -0.01, gz + k * 0.9, ge, GY + 0.4 + k * 0.45, gz + 6);
      for (let k = 0; k < 6; k++) b.deco('flat:#2f5f8a', ga + 0.5, GY + 0.4 + k * 0.45, gz + k * 0.9 + 0.1, ge - 0.5, GY + 0.5 + k * 0.45, gz + k * 0.9 + 0.4);
      for (let x = ga; x <= ge; x += 7.5) b.deco('metal:#6b6f73', x - 0.1, GY, gz + 5.8, x + 0.1, GY + 6.0, gz + 6.0);
      b.deco('metal:#9aa0a6', ga - 0.5, GY + 6.0, gz - 0.5, ge + 0.5, GY + 6.2, gz + 6.4);
    }
    // The clubhouse at the west end, and four floodlight masts.
    {
      const ca = x0 - 1, ce = x0 + 16, cz = z1 + 2;
      b.deco('flat:#c9c4b8', ca, -0.01, cz, ce, GY + 6.4, cz + 7);
      b.deco('flat:#8d8a80', ca - 0.3, GY + 6.4, cz - 0.3, ce + 0.3, GY + 6.6, cz + 7.3);
      for (const y of [GY + 1.0, GY + 4.0]) for (let x = ca + 1; x < ce - 1.5; x += 2.2) b.deco('window', x, y, cz - 0.02, x + 1.4, y + 1.3, cz);
      b.sign({ k: 'label', text: '運動部 部室棟', sub: 'Athletics clubhouse', fg: '#ffffff', bg: '#2f4a3a' }, (ca + ce) / 2, GY + 5.7, cz - 0.03, [0, -1], 5, 0.6);
    }
    for (const x of [x0 - 1, x1 + 1]) for (const z of [z0 - 1, z1 + 1]) {
      b.deco('metal:#8d9399', x - 0.25, GY, z - 0.25, x + 0.25, GY + 18, z + 0.25);
      b.deco('metal:#3a3d40', x - 1.6, GY + 18, z - 0.4, x + 1.6, GY + 19.6, z + 0.4);
      b.deco('light', x - 1.5, GY + 18.1, z - 0.42, x + 1.5, GY + 19.5, z - 0.4);
    }
  }

  // ═════════════════════════ The blocks behind the fronts (town side) ═════════════════════════
  const interiors: Rect[] = [];
  // The Bunko-dōri rows on the south side (stock kits: a back street), and north of it the outer blocks.
  for (const [a, e] of [[-X, bl(KIRI)[0]], [bl(KIRI)[1], kMine], [KEI[1] + SHOP_D, bl(AZU)[0]], [bl(AZU)[1], X]] as [number, number][]) {
    fillRect(a + 0.3, B1, e - 0.3, BL[0] - 0.2, 'n', a < -100 || a > 70 ? SMALL : LOW);
    interiors.push([a, B1, e, BL[0]]);
  }
  for (const [a, e] of [[-X, bl(KIRI)[0]], [KEI[1] + SHOP_D, bl(AZU)[0]], [bl(AZU)[1], X]] as [number, number][]) {
    fillRect(a + 0.3, -Z + 0.3, e - 0.3, B0, 's', a > 70 || a < -100 ? SMALL : LOW);
    interiors.push([a, -Z, e, B0]);
  }
  interiors.push([bl(KIRI)[1], -Z, kMine, B0]);
  // ── What is left over inside the blocks: no bare ground ──
  leftovers(b, r, interiors, reserved, holes, { park: [{ ja: '文庫児童遊園', en: 'Bunko Children’s Park' }, { ja: '蛍雪ひろば', en: 'Keisetsu Square' }] }, piece);

  // ═════════════════════════ Tatekan: the clubs' plywood boards against the wall, east of the gate ═════════════════════════
  {
    const CLUBS: [string, string, string, string][] = [
      ['新歓 写真部', 'Photo club — new members welcome', '#f4f1e6', '#b7282e'],
      ['軽音楽部 定期ライブ', 'Light music club — live, Fri 18:00', '#1f3f7a', '#f2c14e'],
      ['文芸部 部誌頒布中', 'Literary club — new issue out', '#2a2019', '#e8d9b0'],
      ['自治会 学生大会', 'Student council — general meeting', '#ffffff', '#2f4a3a'],
      ['山岳部', 'Mountaineering club', '#f4f1e6', '#3c7dc4'],
      ['落語研究会 寄席', 'Rakugo society — show tonight', '#2a2019', '#f08a24'],
    ];
    CLUBS.forEach(([ja, en, fg, bg], k) => {
      const x = GATE[1] + 4 + k * 3.6, z = WALL - 0.35, w = 1.8 + (k % 2) * 0.4, h = 1.2 + (k % 3) * 0.2;
      // Two timber legs leaning on the wall, the painted board on them.
      for (const sx of [-1, 1]) b.deco('wood:#8a6a4a', x + sx * (w / 2 - 0.1) - 0.04, GY, z - 0.04, x + sx * (w / 2 - 0.1) + 0.04, GY + 0.5 + h + 0.1, z + 0.04);
      b.deco('wood:#c8a878', x - w / 2, GY + 0.5, z - 0.07, x + w / 2, GY + 0.5 + h, z - 0.04);
      b.sign({ k: 'label', text: ja, sub: en, fg, bg }, x, GY + 0.5 + h / 2, z - 0.08, [0, -1], w - 0.12, h - 0.12);
      b.block(x - w / 2, GY, z - 0.1, x + w / 2, GY + 1.6, WALL);
    });
  }

  // ═════════════════════════ The lift by Exit 2: concourse and the library forecourt ═════════════════════════
  {
    const [lx0, lz0, lx1, lz1] = LIFT, xm = (lx0 + lx1) / 2, BR = 'brick:#9a5a43', ST = 'paint:#cdbfa4';
    at('n', xm, lz0, () => lift(b, {
      mat: 'tile:#efe6d2', levels: [{ y: cf, ja: '改札階・2番出口', en: 'Concourse, Exit 2' }, { y: GY, ja: '地上 附属図書館前', en: 'Street, University Library' }],
    }));
    // A brick house round the shaft at street level, its door on the pavement, a slate roof in steps.
    const e = 0.06, top = GY + 3.3;
    b.deco(BR, lx0 - e, GY, lz0 + 0.15, lx0, top, lz1 + e);
    b.deco(BR, lx1, GY, lz0 + 0.15, lx1 + e, top, lz1 + e);
    b.deco(BR, lx0 - e, GY, lz1, lx1 + e, top, lz1 + e);
    b.deco(BR, lx0 - e, GY + 2.6, lz0 - e, lx1 + e, top, lz0 + 0.15);
    for (const [p0, q0, p1, q1] of [[lx0 - e - 0.02, lz0 - e - 0.02, lx0, lz1 + e + 0.02], [lx1, lz0 - e - 0.02, lx1 + e + 0.02, lz1 + e + 0.02], [lx0, lz1, lx1, lz1 + e + 0.02]]) b.deco(ST, p0, GY, q0, p1, GY + 0.3, q1);
    for (const sx of [lx0 - e, lx1 - 0.25]) b.deco(BR, sx, GY, lz0 - e, sx + 0.25 + e, GY + 2.6, lz0 + 0.15);
    b.deco(ST, lx0 - 0.2, top, lz0 - 0.2, lx1 + 0.2, top + 0.14, lz1 + 0.2);
    for (let k = 0; k < 4; k++) {
      const w = (lx1 - lx0) / 2 + 0.15 - k * 0.3, y = top + 0.14 + k * 0.26;
      b.deco('flat:#3c4146', xm - w, y, lz0 - 0.15 + k * 0.3, xm + w, y + 0.28, lz1 + 0.15 - k * 0.3);
    }
    b.zone('street', lx0 - 1.2, GY - 0.2, lz0 - 1.4, lx1 + 1.2, GY + 2.4, lz0 - 0.1, '図書館前エレベーター', 'Library lift (street)', true);
  }

  // ═════════════════════════ At the kerb: the metro's pylons ═════════════════════════
  {
    const P = KITACITY.pylon.pts;
    for (const q of holes.filter((h) => Math.abs(h[1]) <= FRONT && Math.abs(h[3]) <= FRONT)) {
      const xm = (q[0] + q[2]) / 2, zm = (q[1] + q[3]) / 2;
      const num = xm > 0 ? (zm < 0 ? '1' : '2') : zm < 0 ? '3' : '4';
      const [px, f]: [number, Face] = xm > 0 ? [q[0] - 1.4, 'w'] : [q[2] + 1.4, 'e'];
      at(f, px, zm, () => {
        b.model('kitacity', 'pylon', 0, GY, 0, 0);
        b.block(-0.62, GY, -0.16, 0.62, GY + 4.2, 0.16);
        for (const k of ['f', 'b']) {
          const p = P[k];
          b.sign({ k: 'guide', ja: `${st.nameJa}駅`, en: `${st.nameRomaji} Sta.`, bg: 'navy', badges: lines, num }, p[0], p[1] + GY + 0.95, p[2], [p[5], p[6]], p[3], 0.5);
          b.sign({ k: 'areamap', station: st.id }, p[0], p[1] + GY - 0.3, p[2], [p[5], p[6]], p[3], 1.5);
        }
      });
    }
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  {
    const OUT = 180, CW = 3.5;
    type Edge = { c: number; half: number; pave: number; wide: boolean; tree?: TreeKind; setts?: boolean };
    const roadOut = (alongZ: boolean, s: 1 | -1, q: Edge) => {
      const lim = alongZ ? Z : X, u0 = s > 0 ? lim : -lim - OUT, u1 = u0 + OUT;
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
      if (q.setts) {
        R(SETT, -q.half, q.half, -0.03, GY + 0.012);
        return;
      }
      R('asphalt', -q.half, q.half, -0.03, 0.004);
      for (const k of [-1, 1]) if (q.pave > 0) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY);
      if (q.wide) R(YELLOW, -0.08, 0.08, 0.004, 0.01);
      for (let u = u0 + 2; u + 3 < u1; u += 6) {
        if (q.half > 5) for (const k of [-1, 1]) R(WHITE, k * q.half / 2 - 0.07, k * q.half / 2 + 0.07, 0.004, 0.01, u, u + 3);
        else if (!q.wide) for (const k of [-1, 1]) R(WHITE, k * (q.half - 0.6) - 0.05, k * (q.half - 0.6) + 0.05, 0.004, 0.01, u, u + 3);
      }
      for (let u = u0 + 12, k = 0; u < u1 - 6; u += 26, k++) {
        const side = k % 2 ? 1 : -1, v = side * (q.half + 0.8);
        const [px, pz] = alongZ ? [q.c + v, u] : [u, q.c + v];
        roadModel(b, q.half > 5 ? 'lamp_led' : 'lamp_small', px, GY, pz, alongZ ? [-side, 0] : [0, -side]);
        if (q.tree) for (const kk of [-1, 1]) {
          const [tx, tz] = alongZ ? [q.c + kk * (q.half + 1.5), u + 9] : [u + 9, q.c + kk * (q.half + 1.5)];
          modelTree(b, q.tree, tx, tz, 'b', GY, false);
        }
      }
    };
    const packOut = (alongZ: boolean, s: 1 | -1, a: number, e: number, kinds: string[], cross = true) => {
      const lim = alongZ ? Z : X, mid = (a + e) / 2, HALF = OUT / 2;
      for (const [d0, d1] of cross ? [[0.15, HALF - CW], [HALF + CW, OUT]] : [[0.15, OUT]]) {
        const u0 = s > 0 ? lim + d0 : -lim - d1, u1 = s > 0 ? lim + d1 : -lim - d0;
        if (alongZ) {
          fillRect(a + 0.2, u0, mid - 0.4, u1, 'w', kinds, true);
          fillRect(mid + 0.4, u0, e - 0.2, u1, 'e', kinds, true);
        } else {
          fillRect(u0, a + 0.2, u1, mid - 0.4, 'n', kinds, true);
          fillRect(u0, mid + 0.4, u1, e - 0.2, 's', kinds, true);
        }
      }
      if (!cross) return;
      const uc = s > 0 ? lim + HALF : -lim - HALF;
      if (alongZ) b.deco('asphalt', a - 20, -0.03, uc - CW, e + 20, 0.004, uc + CW);
      else b.deco('asphalt', uc - CW, -0.03, a - 20, uc + CW, 0.004, e + 20);
    };
    // North: the two 筋, the shopping lane and Geshuku-kōji run on between rows.
    for (const q of CROSS) roadOut(true, -1, { c: q.c, half: q.half, pave: q.pave, wide: true });
    roadOut(true, -1, { c: (KEI[0] + KEI[1]) / 2, half: 3, pave: 0, wide: false, setts: true });
    roadOut(true, -1, { c: (GES[0] + GES[1]) / 2, half: 1.5, pave: 0, wide: false, setts: true });
    for (const [a, e] of between([bl(KIRI), [GES[0] - 1, GES[1] + 1], [KEI[0] - 1, KEI[1] + 1], bl(AZU)])) {
      packOut(true, -1, a, e, a > -60 && e < 70 ? LOW : SMALL);
      b.clearScenery(a - 9, -Z - OUT - 2, e + 9, -Z);
    }
    // East and west: Gakufu-dōri and Bunko-dōri; the town north of them, the campus wall and its groves south.
    for (const s of [-1, 1] as const) {
      roadOut(false, s, { c: 0, half: RW, pave: FRONT - RW, wide: true, tree: 'ginkgo' });
      roadOut(false, s, { c: BUNKO.z, half: BUNKO.half, pave: 0, wide: false });
      for (const [a, e] of [[-Z, B0 - 0.2], [B1 + 0.2, -FRONT]] as [number, number][]) {
        packOut(false, s, a, e, a < -60 ? LOW : SMALL, a > -60);
        b.clearScenery(s > 0 ? X : -X - OUT - 2, a - 9, s > 0 ? X + OUT + 2 : -X, e + 9);
      }
      // The wall carries on, the campus trees behind it.
      for (let u = (s > 0 ? 133 : 131) + 6, k = 0; u < X + OUT - 6; u += 12, k++) {
        const x = s * u;
        piece('daigaku', D, 'wall_12', 'n', x, WALL, undefined, false);
        if (k % 2 === 0) for (const z of [26, 44, 62, 80]) modelTree(b, k % 4 === 0 ? 'camphor' : 'zelkova', x + (r() - 0.5) * 4, z, 'b', GY, false);
      }
      b.deco('flat:#5d7a44', s > 0 ? X : -X - OUT, -0.02, IN, s > 0 ? X + OUT : -X, GY + 0.01, Z + OUT);
      b.clearScenery(s > 0 ? X : -X - OUT - 2, FRONT - 9, s > 0 ? X + OUT + 2 : -X, Z + OUT);
    }
    // South: the campus runs on; its avenue and groves, the far halls seen through the trees.
    b.deco('flat:#5d7a44', -X, -0.02, Z, X, GY + 0.01, Z + OUT);
    sportsGround();
    for (const [id, x, z] of [['hall_a', -60, Z + 40], ['hall_b', 60, Z + 36], ['shokudo', -60, Z + 100], ['hall_a', 64, Z + 110]] as [string, number, number][]) {
      piece('daigaku', D, id, 'n', x, z, undefined, false);
    }
    for (let x = -X + 6; x < X - 6; x += 14) for (const z of [Z + 12, Z + 24]) if (x > SPORTS.x1 + 4 || x < SPORTS.x0 - 4) modelTree(b, 'camphor', x + (r() - 0.5) * 4, z + (r() - 0.5) * 3, 'b', GY, false);
    b.clearScenery(-X - 2, Z, X + 2, Z + OUT + 2);
  }
}
