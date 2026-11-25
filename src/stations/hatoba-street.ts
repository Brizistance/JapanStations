// 北波止場 Kita-Hatoba, the harbour quarter north-east of Kawaminato-kō (2026-11-24, stage 2 of the north districts): the
// diagonal avenue 帆影大通 Hokage-ōdōri cutting the grid at 30° from Minatoura-dōri to the round pedestrian
// plaza 帆影広場, then on as a promenade towards the bluff; flatiron buildings on its sharp corners; the quay
// along the inlet redeveloped as a promenade (the cranes kept); the grid's streets carried on from
// Kawaminato-kō and Tōsen-machi. Its own world (stations/index.ts DISTRICT_WORLDS); the streets' traffic is
// Kawaminato-kō's (north-roads.ts).
//
// Frame: world (616, −256), yaw 0. Everything below is written in world x, z and moved into the frame by W().
// Plot: world x 465 … 767, z −492.5 … −19.5, and an arm x 450 … 465, z −85 … −19.5 (east of Kawaminato-kō's plot).

import { Builder, rng, type Build } from '../world/builder';
import type { SignContent } from '../signs/content';
import type { Anchor, AnchorPt } from './anchors/types';
import { MINATOFRONT } from './anchors/minatofront';
import { PORT } from './anchors/port';
import { HATOBA } from './anchors/hatoba';
import { URAFRONT } from './anchors/urafront';
import { TSUNA } from './anchors/tsuna';
import { GROUND_Y as GY, vending } from './kit';
import { AVE, AVE_X, PLAZA, STREETS, aveX, ends as northEnds, meet as northMeet, street, type Street } from './north-roads';
import { band, clipHalf, disc, floorPoly, paveSlab, ring, solidPoly, type P, type Poly } from './poly';
import { roadModel, shortSignal, streetLamp } from './roads';
import { fillModelLots } from './surface';
import { modelTree } from './trees';

export const HATOBA_FRAME = { x: 616, z: -256 };
const O = HATOBA_FRAME;
export const HATOBA_PLOT = { x: 151, z: 236.5, arms: [[450 - O.x, -85 - O.z, 465 - O.x, -19.5 - O.z]] as [number, number, number, number][] };
export const HATOBA_NAME = { ja: '北波止場', en: 'Kita-Hatoba' };

/** World edges. */
const XW = 465, XE = 767, ZS = -19.5, ZN = -492.5;
const SEA_Y = -1.2;
type Face = 'n' | 's' | 'e' | 'w';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const PAVER = 'paver', GRANITE = 'tile:#a59c8e', MEDIAN = 'tile:#8c857a', CONCRETE = 'flat:#b9b3a6', WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700';
const LOW = ['shophouse', 'machi', 'zakkyo'];

// ── The avenue's own coordinates: s along it (from its centre on the boulevard's building line), t to its right ──
const RX = -AVE.uz, RZ = AVE.ux; // right of the heading: east-north-east
const sOf = (x: number, z: number) => (x - AVE.ax) * AVE.ux + (z - AVE.az) * AVE.uz;
const tOf = (x: number, z: number) => (x - AVE.ax) * RX + (z - AVE.az) * RZ;
/** Keep the part of a polygon where t·k ≥ c (k = ±1), or s·k ≥ c. */
const tSide = (poly: Poly, k: 1 | -1, c: number) => clipHalf(poly, k * RX, k * RZ, -k * (AVE.ax * RX + AVE.az * RZ) - c);
const sSide = (poly: Poly, k: 1 | -1, c: number) => clipHalf(poly, k * AVE.ux, k * AVE.uz, -k * (AVE.ax * AVE.ux + AVE.az * AVE.uz) - c);
/** A world point at (s, t). */
const st = (s: number, t: number): P => [AVE.ax + AVE.ux * s + RX * t, AVE.az + AVE.uz * s + RZ * t];
const rect = (x0: number, z0: number, x1: number, z1: number): Poly => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
/** Where the avenue's centre meets the line z (its s). */
const sAtZ = (z: number) => (z - AVE.az) / AVE.uz;
/** The plaza's place along the avenue. */
const S_PLAZA = sAtZ(PLAZA.z);
const S_HOKAGE = sAtZ(street('todai').az);
/** The two lanes off the boulevard (x ranges, 4 m: no fronts closer, 2026-11-24): 浮標小路 to Hokushin-dōri, 舵小路 to Tsunamachi-dōri. */
const FUHYO: [number, number] = [533, 537], KAJI: [number, number] = [628, 632];
/** The inner blocks' lanes (2026-11-24): z ranges of 艫綱小路, 船溜小路, 舵輪小路; x ranges of 汽笛横丁 and 帆桁小路. */
const TOMO: [number, number] = [-202, -198], FUNA: [number, number] = [-387, -383], DARIN: [number, number] = [-427, -423];
const KITEKI: [number, number] = [668, 672], HOGETA: [number, number] = [650, 654];

export function kitaHatoba(): Build {
  const b = new Builder();
  const r = rng(5173);
  b.out.plot = { x: HATOBA_PLOT.x, z: HATOBA_PLOT.z, arms: HATOBA_PLOT.arms };
  b.out.spawn = { pos: [aveX(-120) - O.x - 12, GY, -120 - O.z], yaw: 0 };
  // World → frame.
  const W = (p: P): P => [p[0] - O.x, p[1] - O.z];
  const Wp = (poly: Poly): Poly => poly.map(W);
  const box = (mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, solid = true) => b.box(mat, x0 - O.x, y0, z0 - O.z, x1 - O.x, y1, z1 - O.z, solid);
  const deco = (mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => box(mat, x0, y0, z0, x1, y1, z1, false);
  const block = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.block(x0 - O.x, y0, z0 - O.z, x1 - O.x, y1, z1 - O.z);
  const zone = (x0: number, z0: number, x1: number, z1: number, ja: string, en: string, y1 = 8) => b.zone('street', Math.min(x0, x1) - O.x, -0.5, Math.min(z0, z1) - O.z, Math.max(x0, x1) - O.x, y1, Math.max(z0, z1) - O.z, ja, en, true);
  const model = (kind: string, id: string, x: number, y: number, z: number, yaw: number, seed = 0) =>
    b.out.models.push({ kind, id, pos: b.pt(x - O.x, y, z - O.z), yaw, seed, merge: false });
  const merged = (kind: string, id: string, x: number, y: number, z: number, yaw: number) =>
    b.out.models.push({ kind, id, pos: b.pt(x - O.x, y, z - O.z), yaw, seed: 0, merge: true });
  const pave = (mat: string, poly: Poly, y0 = 0, y1 = GY, uvYaw?: number, inner = true) => paveSlab(b, mat, Wp(poly), y0, y1, uvYaw, inner);
  const paint = (mat: string, poly: Poly, y = 0.006) => b.poly(mat, Wp(poly), 0, y);
  const signAt = (p: AnchorPt, content: SignContent) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  const label = (p: AnchorPt, text: string, sub: string | undefined, bg: string, fg: string) => signAt(p, { k: 'label', text, sub, fg, bg });
  /** Do `fn` in a model's own frame: its front's middle at world (x, z), turned by yaw. Builder transforms are square, so the
   * anchors are turned by hand: `at(lx, lz)` gives the frame point of a model point, `n(nx, nz)` a direction. */
  const turned = (x: number, z: number, yaw: number) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (lx: number, lz: number): P => [x + lx * c + lz * s - O.x, z - lx * s + lz * c - O.z];
    const n = (nx: number, nz: number): [number, number] => [nx * c + nz * s, -nx * s + nz * c];
    return { at, n };
  };
  const anchorSign = (x: number, z: number, yaw: number, p: AnchorPt, content: SignContent) => {
    const t = turned(x, z, yaw), [px, pz] = t.at(p[0], p[2]);
    b.sign(content, px, p[1] + GY, pz, t.n(p[5], p[6]), p[3], p[4]);
  };

  // ═════════════════════════ Ground ═════════════════════════
  // Asphalt under everything (the carriageways show through); the blocks, pavements and paved places laid over it.
  for (const [x0, z0, x1, z1] of [[XW, ZN, XE, ZS], [450, -85, XW, ZS]] as [number, number, number, number][]) {
    b.slab('asphalt', x0 - O.x, z0 - O.z, x1 - O.x, z1 - O.z, -0.6, 0, []);
  }
  zone(450, ZN, XE, ZS, HATOBA_NAME.ja, HATOBA_NAME.en, 80);

  // ── The streets' carriageways (x0, z0, x1, z1) of the grid, the quay's apron ──
  const Q = street('quay'), KM = street('kamome');
  const QX0 = Q.ax - Q.half, QX1 = Q.ax + Q.half; // 740 … 752
  const KX0 = KM.ax - KM.half, KX1 = KM.ax + KM.half; // 476.5 … 483.5
  const RS = street('rashin'), SX0 = RS.ax - RS.half, SX1 = RS.ax + RS.half; // 585.5 … 594.5
  const ew = (id: string) => { const s = street(id); return [s.az - s.half, s.az + s.half] as [number, number]; };
  const TSU = ew('tsuna'), SHI = ew('shioji'), HOK = ew('hokushin'), HKG = ew('todai'), KIT = ew('kita');
  // Rows of land between the east–west streets (z0, z1), the north–south carriageways cutting them, and what lies to the
  // west of the avenue's grid. (Stage B of the re-lay, 2026-11-24: Kamome-dōri runs on south to the boulevard, Rashin-dōri
  // from the boulevard to Shioji-dōri, and Shioji-dōri cuts the 200 m blocks between Tsunamachi- and Hokushin-dōri.)
  const KAM: [number, number] = [KX0, KX1], RAS: [number, number] = [SX0, SX1];
  const bands: { z0: number; z1: number; cuts: [number, number][]; west: number }[] = [
    { z0: TSU[1], z1: ZS, cuts: [KAM, RAS], west: 450 },
    { z0: SHI[1], z1: TSU[0], cuts: [KAM, RAS], west: XW },
    { z0: HOK[1], z1: SHI[0], cuts: [KAM], west: XW },
    { z0: HKG[1], z1: HOK[0], cuts: [KAM], west: XW },
    { z0: KIT[1], z1: HKG[0], cuts: [KAM], west: XW },
  ];
  const LAST = bands.length - 1;
  // (The arm west of x 465 between the boulevard and Tsunamachi-dōri, and the stretch to z −85 beyond it.)
  const ARM_EXTRA: Poly = rect(450, -85, XW, TSU[0]);

  // ═════════════════════════ The avenue ═════════════════════════
  const sEnd = S_HOKAGE + (street('todai').half + 0.2) / Math.cos(Math.PI / 6);
  const s0 = sAtZ(ZS);
  // The carriageways run from the boulevard to Hokage-dōri; the median island between them, broken at the junctions.
  const junctionS = [sAtZ(street('tsuna').az), sAtZ(street('shioji').az), sAtZ(street('hokushin').az)];
  const gap = (s: number) => junctionS.some((j) => Math.abs(s - j) < 14) || s < s0 + 14 || s > S_HOKAGE - 13;
  for (let s = s0; s < S_HOKAGE - 13; s += 1) {
    if (gap(s)) continue;
    let e = s;
    while (e < S_HOKAGE - 13 && !gap(e + 1)) e += 1;
    const med = band(AVE.ax, AVE.az, AVE.ux, AVE.uz, s, e + 1, -AVE_X.median, AVE_X.median);
    pave(MEDIAN, med, 0, GY);
    // Ginkgos down the median, a low hedge between them.
    for (let u = s + 6; u < e - 4; u += 12) {
      const [x, z] = st(u, 0);
      modelTree(b, 'ginkgo', x - O.x, z - O.z, 'b', GY, false);
      block(x - 0.4, GY, z - 0.4, x + 0.4, GY + 4, z + 0.4);
    }
    s = e;
  }
  // Lane paint: the centre lines either side of the median, lane lines, the kerbs' edge lines.
  for (let s = s0 + 2; s < sEnd - 3; s += 6) {
    if (junctionS.some((j) => Math.abs(s - j) < 16)) continue;
    for (const t of [-5, 5]) paint(WHITE, band(AVE.ax, AVE.az, AVE.ux, AVE.uz, s, s + 3, t - 0.07, t + 0.07));
  }
  // The pavements either side: granite with a tactile line, from the boulevard to the plaza, broken by the streets they cross.
  // (They are part of the blocks' polygons below, laid as the blocks' edges along the avenue: t ±8.5 … ±15.)

  // ═════════════════════════ The blocks ═════════════════════════
  /**
   * Every block: a band of land between east–west streets, cut by the avenue's kerbs (and Kamome-dōri, the quay
   * road), each piece paved to the pavements' level. North of Hokage-dōri the avenue has become the plaza and the
   * promenade: those pieces are cut round them instead.
   */
  const pieces: { poly: Poly; side: -1 | 0 | 1; band: number }[] = [];
  bands.forEach((bd, k) => {
    const cols: [number, number][] = [];
    let w = bd.west;
    for (const [c0, c1] of bd.cuts) { cols.push([w, c0]); w = c1; }
    cols.push([w, QX0]);
    for (const [x0, x1] of cols) {
      const base = rect(x0, bd.z0, x1, bd.z1);
      if (k < LAST) {
        // South of Hokage-dōri: west of the avenue's west kerb, east of its east kerb.
        pieces.push({ poly: tSide(base, -1, AVE_X.kerb), side: -1, band: k });
        pieces.push({ poly: tSide(base, 1, AVE_X.kerb), side: 1, band: k });
      } else {
        // North of it: the plaza (a square round the round plaza) and the promenade, the land either side.
        const sp = S_PLAZA + PLAZA.r + 6;
        const near = sSide(base, -1, -sp), far = sSide(base, 1, sp);
        pieces.push({ poly: tSide(near, -1, PLAZA.r + 6), side: -1, band: k });
        pieces.push({ poly: tSide(near, 1, PLAZA.r + 6), side: 1, band: k });
        pieces.push({ poly: tSide(tSide(near, 1, -(PLAZA.r + 6)), -1, -(PLAZA.r + 6)), side: 0, band: k });
        pieces.push({ poly: tSide(far, -1, 12), side: -1, band: k });
        pieces.push({ poly: tSide(far, 1, 12), side: 1, band: k });
        pieces.push({ poly: tSide(tSide(far, 1, -12), -1, -12), side: 0, band: k });
      }
    }
  });
  // (North of Tōdai-dōri the pieces meet each other on their slanted edges, all at the pavements' level, and the streets only on square ones: floors to their full edges.)
  for (const p of pieces) if (p.poly.length >= 3) pave(p.side === 0 ? GRANITE : PAVER, p.poly, 0, GY, undefined, p.band < LAST);
  pave(PAVER, ARM_EXTRA);
  // (Shioji-dōri starts at Kamome-dōri: west of it the strip runs on through, paved.)
  pave(PAVER, rect(XW, SHI[0], KX0, SHI[1]));
  // The avenue's mouth on the boulevard: the band of the avenue south of the plot edge is Kawaminato-kō's.

  // ═════════════════════════ The quay ═════════════════════════
  // The front strip along the quay road's west side (x 738 … 740), the apron as a promenade to the edge, the north quay.
  // (Flush with the quay road, as Kawaminato-kō's apron is where they meet at z −19.5.)
  pave(CONCRETE, rect(QX1, ZN, XE, ZS), 0, 0.012);
  pave(PAVER, rect(XW, ZN, QX0, KIT[0]));
  pave(CONCRETE, rect(QX0, ZN, QX1, KIT[0]), 0, GY);
  // Edge railings (the inlet, the river mouth), bollards, lamps; a planted strip down the apron with benches.
  const AY = 0.012; // the apron's level
  for (let z = ZS - 2; z > ZN + 2; z -= 4) merged('minato', 'quayrail', XE - 0.45, AY, z - 2, Math.PI / 2);
  block(XE - 0.6, AY, ZN, XE + 0.4, AY + 1.1, ZS);
  for (let x = XW + 2; x < XE - 2; x += 4) merged('minato', 'quayrail', x + 2, GY, ZN + 0.45, Math.PI);
  block(XW, GY, ZN - 0.4, XE, GY + 1.1, ZN + 0.6);
  for (let z = ZS - 12; z > ZN + 10; z -= 30) {
    model('port', 'quaylamp', QX1 + 1.0, AY, z, -Math.PI / 2);
    block(QX1 + 0.8, AY, z - 0.2, QX1 + 1.2, AY + 6, z + 0.2);
    roadModel(b, 'bench_s', XE - 4 - O.x, AY, z - 15 - O.z, [1, 0]);
    block(XE - 4.4, AY, z - 15.95, XE - 3.6, AY + 0.6, z - 14.05);
    modelTree(b, 'zelkova', XE - 8 - O.x, z - 8 - O.z, 'b', AY, true);
    block(XE - 8.4, AY, z - 8.4, XE - 7.6, AY + 4, z - 7.6);
  }
  for (let x = XW + 20; x < QX0 - 10; x += 28) {
    streetLamp(b, 'lamp_park', x - O.x, ZN + 6 - O.z, [0, 1]);
    roadModel(b, 'bench_s', x + 14 - O.x, GY, ZN + 3 - O.z, [0, 1]);
    block(x + 13.05, GY, ZN + 2.6, x + 14.95, GY + 0.6, ZN + 3.4);
    if ((x / 28) % 2 < 1) { modelTree(b, 'cherry', x + 7 - O.x, ZN + 12 - O.z, 'b', GY, true); block(x + 6.6, GY, ZN + 11.6, x + 7.4, GY + 4, ZN + 12.4); }
  }
  // Two of the old quay cranes kept on the apron, the boats moored along the edge.
  for (const z of [-330, -175]) model('port', 'crane', XE - 9.5, 0, z, -Math.PI / 2);
  for (const z of [-330, -175]) for (const dz of [-PORT.crane.w / 2 + 1, PORT.crane.w / 2 - 1]) for (const x of [XE - 3.5, XE - 15]) block(x - 0.5, GY, z + dz - 0.5, x + 0.5, GY + 8, z + dz + 0.5);
  for (const [id, z] of [['boat_a', -400], ['barge', -250], ['boat_b', -205], ['boat_a', -60]] as const) model('port', id, XE + (id === 'barge' ? 3.9 : 2.3), SEA_Y, z, -Math.PI / 2);
  zone(QX1, ZN, XE, ZS, '北波止場岸壁', 'Kita-Hatoba Quay');
  zone(XW, ZN, QX0, KIT[0], '北岸プロムナード', 'Kitagishi Promenade');

  // ═════════════════════════ Street paint, signals, names ═════════════════════════
  const lanePaint = (sr: Street, s0: number, s1: number) => {
    // (Broken where another street crosses or meets it, junction box and zebras: as far as its half and 3.6 m beyond.)
    const boxes = [...STREETS, street('tsuna'), street('boulevard')].filter((t) => t !== sr).map((t) => {
      const m = northMeet(sr, t);
      return m ? [m.s, t.half / m.sin + 3.6] : null;
    }).filter((q): q is number[] => !!q);
    for (let s = s0; s < s1 - 3; s += 6) {
      if (boxes.some(([c, h]) => s + 3 > c - h && s < c + h)) continue;
      const [x, z] = [sr.ax + sr.ux * s, sr.az + sr.uz * s];
      if (sr.ux) deco(WHITE, x, 0.004, z - 0.07, x + 3 * sr.ux, 0.01, z + 0.07);
      else deco(WHITE, x - 0.07, 0.004, Math.min(z, z + 3 * sr.uz), x + 0.07, 0.01, Math.max(z, z + 3 * sr.uz));
    }
  };
  for (const sr of STREETS) {
    if (sr.id === 'ave') continue;
    const name = { ja: sr.ja, en: sr.en };
    if (sr.ux) {
      const x0 = Math.max(sr.id === 'hokushin' ? XW : sr.id === 'shioji' ? KX1 : sr.ax, XW), x1 = QX0;
      lanePaint(sr, x0 - sr.ax + 2, x1 - sr.ax);
      zone(x0, sr.az - sr.half - sr.pave, x1, sr.az + sr.half + sr.pave, name.ja, name.en);
    } else {
      const z0 = ZS, z1 = sr.id === 'quay' ? ZN : sr.id === 'rashin' ? SHI[1] : KIT[1];
      // (From the boulevard's building line, or where it starts, to where it ends: s along it from (ax, az).)
      lanePaint(sr, (z0 - sr.az) / sr.uz + 2, (z1 - sr.az) / sr.uz);
      zone(sr.ax - sr.half - sr.pave, z0, sr.ax + sr.half + sr.pave, z1, name.ja, name.en);
    }
  }
  zone(XW, TSU[0], QX0, TSU[1], '綱町通', 'Tsunamachi-dōri');
  // The avenue's zone: a strip along it (its own polygon is slanted; the zone boxes step along it).
  for (let s = s0; s < sEnd; s += 8) {
    const [x, z] = st(s + 4, 0);
    zone(x - 9, z - 9, x + 9, z + 9, '帆影大通', 'Hokage-ōdōri');
  }
  /** Whether street S runs on at least `m` metres from distance `at` along it, on side `sg` (−1 back, +1 on). */
  const runsOn = (S: Street, at: number, sg: number, m = 8) => {
    const [e0, e1] = S.id === 'tsuna' ? [-1e9, northEnds(S)[1]] : S.id === 'boulevard' ? [-1e9, 1e9] : northEnds(S);
    return sg < 0 ? at - Math.min(e0, e1) > m : Math.max(e0, e1) - at > m;
  };
  const JN: [string, string, string, string][] = [
    ['ave', 'boulevard', '帆影大通入口', 'Hokage-ōdōri Iriguchi'], ['quay', 'boulevard', '湊浦橋西詰', 'Minatoura-bashi Nishizume'],
    ['ave', 'tsuna', '帆影綱町', 'Hokage Tsunamachi'], ['ave', 'hokushin', '帆影北辰', 'Hokage Hokushin'], ['ave', 'todai', '帆影広場前', 'Hokage Hiroba-mae'],
    ['quay', 'tsuna', '岸壁綱町', 'Ganpeki Tsunamachi'], ['quay', 'hokushin', '岸壁北辰', 'Ganpeki Hokushin'], ['quay', 'todai', '岸壁灯台', 'Ganpeki Tōdai'],
    ['quay', 'kita', '岸壁北岸', 'Ganpeki Kitagishi'], ['quay', 'shioji', '岸壁汐路', 'Ganpeki Shioji'], ['ave', 'shioji', '帆影汐路', 'Hokage Shioji'],
    ['kamome', 'boulevard', '鴎通入口', 'Kamome-dōri Iriguchi'], ['kamome', 'tsuna', '鴎綱町', 'Kamome Tsunamachi'], ['kamome', 'shioji', '鴎汐路', 'Kamome Shioji'],
    ['rashin', 'boulevard', '羅針通入口', 'Rashin-dōri Iriguchi'], ['rashin', 'tsuna', '羅針綱町', 'Rashin Tsunamachi'], ['rashin', 'shioji', '羅針汐路', 'Rashin Shioji'], ['kamome', 'hokushin', '鴎北辰', 'Kamome Hokushin'], ['kamome', 'todai', '鴎灯台', 'Kamome Tōdai'], ['kamome', 'kita', '鴎北岸', 'Kamome Kitagishi'],
  ];
  for (const [a, c, ja, en] of JN) {
    const A = street(a), C = street(c), ma = northMeet(A, C)!, mc = northMeet(C, A)!;
    const x = A.ax + A.ux * ma.s, z = A.az + A.uz * ma.s;
    for (const [S, T, at] of [[A, C, ma.s], [C, A, mc.s]] as [Street, Street, number][]) {
      for (const sg of [1, -1]) {
        // Traffic heading sg along S comes from its −sg side: is there road there?
        if (!runsOn(S, at, -sg)) continue;
        // (On the acute side of a slanted junction the other street's kerb lies further back: (S.half + 1.1)·cot θ.)
        const cos = Math.abs(S.ux * T.ux + S.uz * T.uz);
        const hx = S.ux * sg, hz = S.uz * sg, lx = hz, lz = -hx, back = T.half / ma.sin + 2.2 + ((S.half + 1.1) * cos) / ma.sin;
        const px = x - hx * back + lx * (S.half + 1.1), pz = z - hz * back + lz * (S.half + 1.1);
        shortSignal(b, px - O.x, pz - O.z, [hx, hz], S.axis, { ja, en });
        // The zebra across this arm, just back from the junction.
        const cx = x - hx * (back - 0.6), cz = z - hz * (back - 0.6);
        for (let k = -S.half + 0.3; k < S.half - 0.4; k += 0.9) paint(WHITE, band(cx, cz, hx, hz, -3, 0, k, k + 0.45));
      }
    }
  }

  // ═════════════════════════ Buildings ═════════════════════════
  const used = new Map<string, number>();
  const AVE_IDS = Object.keys(MINATOFRONT).filter((k) => !k.startsWith('chandler'));
  const pick = (room: number) => {
    const ok = AVE_IDS.filter((id) => MINATOFRONT[id].w <= room).sort((p, q) => (used.get(p) ?? 0) - (used.get(q) ?? 0) || MINATOFRONT[q].w - MINATOFRONT[p].w);
    const id = ok[Math.floor(r() * Math.min(3, ok.length))];
    if (id) used.set(id, (used.get(id) ?? 0) + 1);
    return id;
  };
  const NAMES: [string, string][] = [
    ['波止場海運ビル', 'Hatoba Kaiun Bldg.'], ['帆影ビルヂング', 'Hokage Building'], ['北辰商船', 'Hokushin Shōsen'], ['湊浦信託', 'Minatoura Trust'],
    ['鴎ヶ丘ホテル', 'Hotel Kamome-ga-oka'], ['北波止場センタービル', 'Kita-Hatoba Center Bldg.'], ['岸壁倉庫 本社', 'Ganpeki Sōko HQ'], ['川湊貿易会館', 'Kawaminato Trade Hall'],
    ['ハーバーテラス北波止場', 'Harbour Terrace Kita-Hatoba'], ['港湾会館', 'Kōwan Kaikan'], ['帆影郵船', 'Hokage Yūsen'], ['湊浦銀行 北波止場支店', 'Minatoura Bank Kita-Hatoba Branch'],
  ];
  let nameNo = 0;
  const letter = (x: number, z: number, yaw: number, a: Anchor) => {
    const [ja, en] = NAMES[nameNo++ % NAMES.length];
    if (a.pts.name) anchorSign(x, z, yaw, a.pts.name, { k: 'label', text: ja, sub: en, fg: '#ffffff', bg: '#1f2023' });
    if (a.pts.roof) anchorSign(x, z, yaw, a.pts.roof, { k: 'label', text: ja.slice(0, 6), sub: en, fg: '#ffffff', bg: '#1d3550' });
    if (a.pts.vertical) anchorSign(x, z, yaw, a.pts.vertical, { k: 'shop', ja: ja.slice(0, 5), bg: '#f4f1e8', fg: '#1d3550', vertical: true });
  };
  /** Turned to face the avenue from one side: −1 west (faces east-north-east), +1 east. */
  const faceYaw = (side: -1 | 1) => (side < 0 ? Math.atan2(-RX, -RZ) : Math.atan2(RX, RZ));
  const LINE = AVE_X.edge + 0.3; // the building line, |t|
  /** A row of fronts along the avenue on one side, from s = a to s = e (a < e), each model's footprint solid. */
  const aveRow = (side: -1 | 1, a: number, e: number) => {
    let s = a;
    while (e - s > 7) {
      const id = pick(e - s);
      if (!id) break;
      const A = MINATOFRONT[id], c = s + A.w / 2, yaw = faceYaw(side);
      // (Not into the quay road's row of offices, x 723.7 …)
      const foot = band(AVE.ax, AVE.az, AVE.ux, AVE.uz, s + 0.6, s + A.w - 0.6, side < 0 ? -LINE - A.d + 0.6 : LINE + 0.6, side < 0 ? -LINE - 0.6 : LINE + A.d - 0.6);
      if (foot.some(([px]) => px > QX0 - 16.9)) { s += 2; continue; }
      // The front's middle on the building line; the model's +x runs back towards the boulevard (west side) or up the avenue (east).
      const [x, z] = st(c, side * LINE);
      model('minatofront', id, x, GY, z, yaw, 2000 + nameNo);
      solidPoly(b, Wp(foot), GY, GY + Math.max(4, A.h), 0.5);
      letter(x, z, yaw, A);
      s += A.w + 0.4;
    }
  };
  /** A flatiron on an acute corner: its prow at world (cx, cz), on the avenue's `side`. Its body as solid strips. */
  const flatiron = (id: 'flatiron_a' | 'flatiron_b', side: -1 | 1, cx: number, cz: number, ja: string, en: string) => {
    const A = HATOBA[id], yaw = faceYaw(side);
    // Its +x (towards the prow) is −heading on the west side, +heading on the east.
    const ax = side < 0 ? -AVE.ux : AVE.ux, az = side < 0 ? -AVE.uz : AVE.uz;
    const x = cx - ax * (A.w / 2), z = cz - az * (A.w / 2);
    model('hatoba', id, x, GY, z, yaw);
    // Footprint: the model's own outline (front, prow, the 60° side, back), turned into place.
    const t = turned(x, z, yaw), k = A.d / Math.tan(Math.PI / 3);
    // (Set in 0.6 m, so the strips it is made of stay behind its faces.)
    const foot: Poly = [t.at(-A.w / 2 + 0.6, 0.6), t.at(A.w / 2 - 1.2, 0.6), t.at(A.w / 2 - k - 0.6, A.d - 0.6), t.at(-A.w / 2 + 0.6, A.d - 0.6)].map(([px, pz]) => [px + O.x, pz + O.z] as P);
    solidPoly(b, Wp(foot), GY, GY + A.h, 0.5);
    if (A.pts.name) anchorSign(x, z, yaw, A.pts.name, { k: 'label', text: ja, sub: en, fg: '#e8d9b0', bg: '#2a2622' });
    if (A.pts.name_side) anchorSign(x, z, yaw, A.pts.name_side, { k: 'label', text: ja, sub: en, fg: '#e8d9b0', bg: '#2a2622' });
    if (A.pts.prow) anchorSign(x, z, yaw, A.pts.prow, { k: 'shop', ja: ja.replace(/\s.*/, '').slice(0, 6), bg: '#2a2622', fg: '#e8d9b0', vertical: true });
    return A.w;
  };
  /** Where the avenue's building line on `side` meets the line z = zl (its s). */
  const sLine = (side: -1 | 1, zl: number) => (zl - AVE.az - RZ * side * LINE) / AVE.uz;
  const cornerPt = (side: -1 | 1, zl: number): P => st(sLine(side, zl), side * LINE);

  /**
   * A pocket plaza (角の小広場) on an acute corner where Shioji-dōri meets the avenue, instead of another flatiron: a
   * cherry, a bench, a drinking fountain and two old mooring bollards as a sculpture, set back from the corner along
   * the avenue (dir +1 up it, −1 down it).
   */
  const POCKET = 24;
  const pocket = (side: -1 | 1, zl: number, dir: 1 | -1) => {
    const s0c = sLine(side, zl);
    const at = (ds: number, dt: number) => st(s0c + dir * ds, side * (LINE + dt));
    paint('tile:#9b9286', band(AVE.ax, AVE.az, AVE.ux, AVE.uz, Math.min(s0c, s0c + dir * (POCKET - 2)), Math.max(s0c, s0c + dir * (POCKET - 2)), side < 0 ? -LINE - 12 : LINE, side < 0 ? -LINE : LINE + 12), GY + 0.006);
    const [tx, tz] = at(12, 6);
    modelTree(b, 'cherry', tx - O.x, tz - O.z, 'b', GY, false);
    block(tx - 0.4, GY, tz - 0.4, tx + 0.4, GY + 4, tz + 0.4);
    const [bx, bz] = at(7, 3);
    roadModel(b, 'bench_s', bx - O.x, GY, bz - O.z, [-side * RX, -side * RZ]);
    block(bx - 0.9, GY, bz - 0.9, bx + 0.9, GY + 0.6, bz + 0.9);
    for (const ds of [17, 18.6]) {
      const [px, pz] = at(ds, 4);
      model('port', 'bollard', px, GY, pz, 0);
      block(px - 0.35, GY, pz - 0.35, px + 0.35, GY + 0.8, pz + 0.35);
    }
    const [lx, lz] = at(3, 8);
    streetLamp(b, 'lamp_park', lx - O.x, lz - O.z, [-side * RX, -side * RZ]);
  };

  // West of the avenue: flatirons on the boulevard, Tsunamachi-dōri's north side and Hokushin-dōri's north side.
  {
    // (31 m of building line to Tsunamachi-dōri: the smaller flatiron.)
    const fa = flatiron('flatiron_b', -1, ...cornerPt(-1, ZS - 0.3), 'ホテル波止場館', 'Hotel Hatobakan · 1928');
    aveRow(-1, sLine(-1, ZS - 0.3) + fa + 0.6, sLine(-1, TSU[1] + 2.5) - 10);
    const fb = flatiron('flatiron_b', -1, ...cornerPt(-1, TSU[0] - 2.8), '北辰商船ビル', 'Hokushin Shōsen Building');
    aveRow(-1, sLine(-1, TSU[0] - 2.8) + fb + 0.6, sLine(-1, SHI[1] + 2.5) - 10);
    pocket(-1, SHI[0] - 2.5, 1);
    aveRow(-1, sLine(-1, SHI[0] - 2.5) + POCKET, sLine(-1, HOK[1]) - 10);
    const fc = flatiron('flatiron_b', -1, ...cornerPt(-1, HOK[0] - 0.3), '北辰海運ビル', 'Hokushin Kaiun Building');
    aveRow(-1, sLine(-1, HOK[0] - 0.3) + fc + 0.6, sLine(-1, HKG[1]) - 10);
  }
  // East: flatirons on Tsunamachi-dōri's south side, Hokushin-dōri's south side and Hokage-dōri's south side (their prows north).
  {
    aveRow(1, sLine(1, ZS) + 12, sLine(1, TSU[1] + 2.8) - HATOBA.flatiron_b.w - 0.6);
    flatiron('flatiron_b', 1, ...cornerPt(1, TSU[1] + 2.8), '湊浦信託ビル', 'Minatoura Trust Building');
    aveRow(1, sLine(1, TSU[0] - 2.5) + 10, sLine(1, SHI[1] + 2.5) - POCKET);
    pocket(1, SHI[1] + 2.5, -1);
    aveRow(1, sLine(1, SHI[0] - 2.5) + 10, sLine(1, HOK[1] + 0.3) - HATOBA.flatiron_a.w - 0.6);
    flatiron('flatiron_a', 1, ...cornerPt(1, HOK[1] + 0.3), 'ホテル帆影', 'Hotel Hokage · 1931');
    aveRow(1, sLine(1, HOK[0]) + 10, sLine(1, HKG[1] + 0.3) - HATOBA.flatiron_b.w - 0.6);
    flatiron('flatiron_b', 1, ...cornerPt(1, HKG[1] + 0.3), '帆影ビルヂング', 'Hokage Building');
  }

  /** Stock rows on an axis-aligned rectangle, fronts on `face`; only where every lot stays clear of the avenue's rows (|t| > keep). */
  const fill = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], keep = LINE + 22) => {
    // Trim the rectangle along its frontage so that its far corners keep clear of the avenue band.
    const okAt = (x: number, z: number) => Math.abs(tOf(x, z)) > keep || (sOf(x, z) > sEnd + 30 && Math.abs(tOf(x, z)) > 16);
    // (A whole edge of the rectangle, felt every metre: the avenue may cross its middle.)
    const seg = (x0: number, z0: number, x1: number, z1: number) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0)));
      for (let i = 0; i <= n; i++) if (!okAt(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n)) return false;
      return true;
    };
    let a = x0, e = x1, c = z0, d = z1;
    const alongX = face === 'n' || face === 's';
    const step = 1;
    if (alongX) {
      while (a < e && !seg(a, c, a, d)) a += step;
      while (e > a && !seg(e, c, e, d)) e -= step;
      // (A rectangle the avenue band cuts through the middle of: keep its larger clear part.)
      for (let x = a; x < e; x += step) if (!seg(x, c, x, d)) { if (x - a > e - x) e = x - step; else a = x + step; break; }
    } else {
      while (c < d && !seg(a, c, e, c)) c += step;
      while (d > c && !seg(a, d, e, d)) d -= step;
      for (let z = c; z < d; z += step) if (!seg(a, z, e, z)) { if (z - c > d - z) d = z - step; else c = z + step; break; }
    }
    if (e - a < 9 || d - c < 9) return;
    const [lx0, lz0, lx1, lz1] = [a - O.x, c - O.z, e - O.x, d - O.z];
    const [u0, u1, f0, f1] = face === 'n' ? [lx0, lx1, lz0, lz1] : face === 's' ? [-lx1, -lx0, -lz1, -lz0] : face === 'e' ? [lz0, lz1, -lx1, -lx0] : [-lz1, -lz0, lx0, lx1];
    b.with(FRAME[face], () => {
      let z = f0;
      for (let k = 0; k < 12 && f1 - z > 10.3; k++) {
        const lots = fillModelLots(b, r, u0, u1, z, f1 + 2.01, { noBack: true, kinds, lo: true, old: false, bare: k > 0 });
        if (!lots.length) break;
        z = Math.max(...lots.map((l) => l[3])) + 0.8;
      }
    });
  };
  // The grid's rows: every block's street fronts (the blocks between the east–west streets, each side of Kamome-dōri).
  const PV = 2; // pavement on the grid's streets
  // Along Tsunamachi-dōri and the boulevard (band 0), the arm's stretch.
  // (Facing Kamome-dōri: to the west, 0.6 m off, are the ends of Kawaminato-kō's rows.)
  fill(450.3, -84.7, XW - 0.3, TSU[0] - 2.8, 'e', LOW, 0);
  // ═════════════════════════ The inner blocks (2026-11-24): a mixed harbour quarter ═════════════════════════
  // Every block gets modelled fronts on each of its street faces (none of a type twice in a block): shipping firms,
  // banks and offices on the through streets, cafés, small shops and flats over shops on the side streets and lanes,
  // izakaya on 汽笛横丁; new 4 m lanes cut the long blocks (no front closer than 4 m across one). The middles of the
  // blocks are their back yards. Nothing is built within 34 m of the avenue's line (its own rows and flatirons), on
  // the plaza's square, or east of the quay offices.
  const KP = KX1 + KM.pave, RP0 = SX0 - RS.pave, RP1 = SX1 + RS.pave; // the building lines on Kamome- and Rashin-dōri
  const SP0 = SHI[1] + street('shioji').pave, SP1 = SHI[0] - street('shioji').pave; // and on Shioji-dōri
  {
    type Kit = { kind: string; id: string; A: Anchor };
    const kit = (kind: string, set: Record<string, Anchor>, ids: string[]): Kit[] => ids.map((id) => ({ kind, id, A: set[id] }));
    const BIGK = [
      ...kit('urafront', URAFRONT, ['bank', 'screen', 'bizhotel', 'scratch', 'glass', 'tile70']),
      ...kit('minatofront', MINATOFRONT, ['stone_a', 'stone_b', 'brick_a', 'brick_b', 'brick_c', 'kaiun_a', 'kaiun_b', 'ribbon_a', 'ribbon_b', 'hotel_a']),
    ];
    const SMALLK = [
      ...kit('urafront', URAFRONT, ['cafe', 'mansion', 'mansion_b', 'kura', 'workshop']),
      ...kit('tsuna', TSUNA, ['shop_a', 'shop_b', 'shop_c', 'shop_d', 'shop_e', 'shop_f']),
    ];
    const IZAK = [...kit('tsuna', TSUNA, ['shop_g', 'shop_h', 'shop_a', 'shop_b', 'shop_d']), ...kit('urafront', URAFRONT, ['kura'])];
    const NAMES_B: [string, string][] = [
      ['北辰汽船', 'Hokushin Kisen'], ['波止場倉庫', 'Hatoba Sōko'], ['帆影海上火災', 'Hokage Marine & Fire'], ['湊浦通運', 'Minatoura Tsūun'],
      ['鴎商事', 'Kamome Shōji'], ['北波止場会館', 'Kita-Hatoba Kaikan'], ['羅針海運', 'Rashin Kaiun'], ['汐路ホテル', 'Hotel Shioji'],
      ['岸壁信用金庫', 'Ganpeki Shinkin Bank'], ['帆影ビル三号館', 'Hokage Bldg. No. 3'], ['湊浦船舶', 'Minatoura Senpaku'], ['灯台通ビル', 'Tōdai-dōri Bldg.'],
    ];
    const NAMES_S: [string, string][] = [
      ['喫茶 汽笛', 'Kissa Kiteki'], ['パン 波止場', 'Hatoba Bakery'], ['古書 帆影堂', 'Hokagedō Books'], ['洋食 鴎亭', 'Kamometei Grill'],
      ['花 しおじ', 'Shioji Flowers'], ['時計 羅針堂', 'Rashindō Watches'], ['雑貨 浮標', 'Fuhyō Goods'], ['酒 北岸', 'Kitagishi Saké'],
      ['理容 帆柱', 'Barber Hobashira'], ['珈琲 舫', 'Coffee Moyai'], ['釣具 錨屋', 'Ikariya Tackle'], ['うどん 綱町', 'Tsunamachi Udon'],
    ];
    const NAMES_I: [string, string][] = [
      ['居酒屋 汽笛', 'Izakaya Kiteki'], ['焼鳥 とり舟', 'Torifune Yakitori'], ['おでん 波', 'Oden Nami'], ['立呑み 岸壁', 'Tachinomi Ganpeki'],
      ['小料理 しずく', 'Shizuku'], ['スナック 灯', 'Snack Akari'], ['炉端 船頭', 'Robata Sendō'], ['もつ焼 鴎', 'Motsuyaki Kamome'],
    ];
    let nb = 0, ns = 0, ni = 0;
    /** Clear of the avenue's band, its plaza square, the quay offices. */
    const okLot = (x0: number, z0: number, x1: number, z1: number) => {
      if (x1 > QX0 - 16.6) return false;
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]]) {
        if (Math.abs(tOf(x, z)) < 35.5) return false;
        if (Math.abs(sOf(x, z) - S_PLAZA) < PLAZA.r + 8 && Math.abs(tOf(x, z)) < PLAZA.r + 10) return false;
      }
      return true;
    };
    type Side = 'big' | 'small' | 'izak' | null;
    /**
     * One block, x0 … x1 by z0 (north) … z1 (south), with what lies on each side: rows along the north and south faces
     * over the full length, along the west and east faces between them.
     */
    const blockRows = (x0: number, z0: number, x1: number, z1: number, sides: { n?: Side; s?: Side; w?: Side; e?: Side }) => {
      const used = new Set<string>();
      const pool = (k: Side) => (k === 'big' ? BIGK : k === 'izak' ? IZAK : SMALLK);
      const depthOf = (k: Side, room: number) => Math.min(k === 'big' ? 14 : 12.5, room);
      const nsRoom = sides.n && sides.s ? (z1 - z0) / 2 - 0.6 : z1 - z0 - 1;
      const ewRoom = sides.w && sides.e ? (x1 - x0) / 2 - 0.6 : x1 - x0 - 1;
      const dN = sides.n ? depthOf(sides.n, nsRoom) : 0, dS = sides.s ? depthOf(sides.s, nsRoom) : 0;
      // A row along one face: `face` the way its fronts look; u0 … u1 along the face; `line` the front line.
      const run = (face: 'n' | 's' | 'e' | 'w', k: Side, line: number, u0: number, u1: number, dMax: number) => {
        if (!k) return;
        let u = u0, last = '';
        // Footprint and the front's middle for a model w wide, d deep at u on this face.
        const foot = (w: number, d: number): [number, number, number, number, number, number, number] =>
          face === 'n' ? [u, line, u + w, line + d, u + w / 2, line, 0]
          : face === 's' ? [u, line - d, u + w, line, u + w / 2, line, Math.PI]
          : face === 'w' ? [line, u, line + d, u + w, line, u + w / 2, Math.PI / 2]
          : [line - d, u, line, u + w, line, u + w / 2, -Math.PI / 2];
        for (let guard = 0; guard < 2000 && u1 - u > 4.5; guard++) {
          const fits = (m: Kit) => { const q = foot(m.A.w, m.A.d); return okLot(q[0], q[1], q[2], q[3]); };
          let ok = pool(k).filter((m) => m.A.w <= u1 - u && m.A.d <= dMax + 0.01 && !used.has(m.kind + m.id) && m.kind + m.id !== last && fits(m));
          if (!ok.length) ok = pool(k).filter((m) => m.A.w <= u1 - u && m.A.d <= dMax + 0.01 && m.kind + m.id !== last && fits(m));
          if (!ok.length) { u += 0.5; continue; }
          const m = ok[Math.floor(r() * ok.length)], w = m.A.w;
          const [fx0, fz0, fx1, fz1, cx, cz, yaw] = foot(w, m.A.d);
          used.add(m.kind + m.id);
          last = m.kind + m.id;
          model(m.kind, m.id, cx, GY, cz, yaw, 5000 + nb + ns + ni);
          const along = face === 'n' || face === 's';
          block(fx0 + (along ? 0.2 : 0), GY, fz0 + (along ? 0 : 0.2), fx1 - (along ? 0.2 : 0), GY + Math.max(4, m.A.h), fz1 - (along ? 0 : 0.2));
          const [ja, en] = k === 'big' ? NAMES_B[nb++ % NAMES_B.length] : k === 'izak' ? NAMES_I[ni++ % NAMES_I.length] : NAMES_S[ns++ % NAMES_S.length];
          const bg = k === 'big' ? '#1f2023' : k === 'izak' ? '#7d1a14' : '#2a2019', fg = k === 'izak' ? '#f2d27a' : '#f2ecd8';
          if (m.A.pts.name) anchorSign(cx, cz, yaw, m.A.pts.name, { k: 'label', text: ja, sub: en, fg, bg });
          if (m.A.pts.vertical) anchorSign(cx, cz, yaw, m.A.pts.vertical, { k: 'shop', ja: ja.replace(/\s.*/, '').slice(0, 5), bg: '#f4f1e8', fg: '#1d3550', vertical: true });
          u += w + 1.1; // (their side fittings stand up to 0.6 m out)
          if (used.size >= pool(k).length - 1) used.clear();
        }
      };
      // (In from the corners by 0.8 m, the side fittings clear of the cross street's building line; the side rows
      // start 1.6 m behind the corner lots, clear of their backs' fittings.)
      run('n', sides.n ?? null, z0 + 0.3, x0 + 0.8, x1 - 0.8, dN);
      run('s', sides.s ?? null, z1 - 0.3, x0 + 0.8, x1 - 0.8, dS);
      const ez0 = z0 + (sides.n ? dN + 1.6 : 0.8), ez1 = z1 - (sides.s ? dS + 1.6 : 0.8);
      run('w', sides.w ?? null, x0 + 0.3, ez0, ez1, sides.w ? depthOf(sides.w, ewRoom) : 0);
      run('e', sides.e ?? null, x1 - 0.3, ez0, ez1, sides.e ? depthOf(sides.e, ewRoom) : 0);
    };
    // The lanes: paving with a sett line, lamps, a name zone; 汽笛横丁 hung with lanterns. Each stops at the avenue's pavement.
    const lanePave = (x0: number, z0: number, x1: number, z1: number, ja: string, en: string, yoko = false) => {
      const alongX = x1 - x0 > z1 - z0;
      const fixed = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
      const spans: [number, number][] = [];
      let s0: number | null = null;
      const [a, e] = alongX ? [x0, x1] : [z0, z1];
      for (let u = a; u <= e + 0.01; u += 0.5) {
        const ok = u < e && Math.abs(alongX ? tOf(u, fixed) : tOf(fixed, u)) > 34;
        if (ok && s0 === null) s0 = u;
        if (!ok && s0 !== null) { spans.push([s0, Math.min(u, e)]); s0 = null; }
      }
      if (s0 !== null) spans.push([s0, e]);
      for (const [p, q] of spans) {
        const [rx0, rz0, rx1, rz1] = alongX ? [p, z0, q, z1] : [x0, p, x1, q];
        paint(yoko ? 'tile:#77716a' : 'tile:#857e73', rect(rx0, rz0, rx1, rz1), GY + 0.008);
        paint('tile:#9b9286', alongX ? rect(rx0, fixed - 0.4, rx1, fixed + 0.4) : rect(fixed - 0.4, rz0, fixed + 0.4, rz1), GY + 0.012);
        zone(rx0, rz0, rx1, rz1, ja, en);
        const len = q - p;
        for (let u = 5; u < len - 3; u += yoko ? 6 : 12) {
          if (alongX && [FUHYO, KITEKI, HOGETA, KAJI].some(([p, q]) => rx0 + u > p - 1.5 && rx0 + u < q + 1.5)) continue;
          if (alongX) streetLamp(b, 'lamp_small', rx0 + u - O.x, z0 + 0.25 - O.z, [0, 1]);
          else streetLamp(b, 'lamp_small', x0 + 0.25 - O.x, rz0 + u - O.z, [1, 0]);
        }
        if (yoko) for (let u = 2; u < len - 1; u += 3) {
          // A string of red lanterns across the alley.
          const zz = rz0 + u;
          deco('flat:#2a2622', x0, GY + 3.4, zz - 0.01, x1, GY + 3.42, zz + 0.01);
          for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.75) {
            deco('flat:#d8261b', x - 0.14, GY + 2.95, zz - 0.14, x + 0.14, GY + 3.35, zz + 0.14);
            deco('flat:#2a2019', x - 0.15, GY + 3.33, zz - 0.15, x + 0.15, GY + 3.38, zz + 0.15);
          }
        }
      }
    };
    lanePave(KP, TOMO[0], QX0, TOMO[1], '艫綱小路', 'Tomozuna-kōji');
    lanePave(KITEKI[0], HOK[1] + PV, KITEKI[1], SP1, '汽笛横丁', 'Kiteki-yokochō', true);
    lanePave(HOGETA[0], HKG[1] + 3.5, HOGETA[1], HOK[0] - PV, '帆桁小路', 'Hogeta-kōji');
    lanePave(HOGETA[0], KIT[1] + 2.5, HOGETA[1], HKG[0] - 3.5, '帆桁小路', 'Hogeta-kōji');
    lanePave(KP, FUNA[0], QX0, FUNA[1], '船溜小路', 'Funadamari-kōji');
    lanePave(KP, DARIN[0], QX0, DARIN[1], '舵輪小路', 'Darin-kōji');
    // Between Tsunamachi- and Shioji-dōri (Tsunamachi-dōri's shop houses already line its north side west of Rashin-dōri).
    const TB = TSU[0] - 2.5 - TSUNA.shop_a.d - 0.9;
    blockRows(KP, SP0, FUHYO[0], TB, { n: 'big', w: 'small', e: 'small' });
    blockRows(FUHYO[1], SP0, RP0, TB, { n: 'big', w: 'small', e: 'small' });
    blockRows(RP1, SP0, QX0 - 16.6, TSU[0] - 2.5, { n: 'big', s: 'big', w: 'small' });
    // Between Shioji- and Hokushin-dōri: 艫綱小路 across, 浮標小路 and 汽笛横丁 down.
    for (const [x0, x1, eK, wK] of [[KP, FUHYO[0], 'small', 'small'], [FUHYO[1], KITEKI[0], 'izak', 'small'], [KITEKI[1], QX0 - 16.6, null, 'izak']] as [number, number, Side, Side][]) {
      blockRows(x0, TOMO[1], x1, SP1, { s: 'big', n: 'small', w: wK, e: eK });
      blockRows(x0, HOK[1] + PV, x1, TOMO[0], { n: 'big', s: 'small', w: wK, e: eK });
    }
    // Between Hokushin- and Tōdai-dōri: 帆桁小路 down the east part.
    blockRows(KP, HKG[1] + 3.5, HOGETA[0], HOK[0] - PV, { n: 'small', s: 'big', w: 'small', e: 'small' });
    blockRows(HOGETA[1], HKG[1] + 3.5, QX0 - 16.6, HOK[0] - PV, { n: 'small', s: 'big', w: 'small' });
    // Between Tōdai- and Kitagishi-dōri: the plaza and the promenade west; east, 帆桁小路, 船溜小路 and 舵輪小路.
    for (const [z0, z1, nK, sK] of [[FUNA[1], HKG[0] - 3.5, 'small', 'big'], [DARIN[1], FUNA[0], 'small', 'small'], [KIT[1] + 2.5, DARIN[0], 'big', 'small']] as [number, number, Side, Side][]) {
      blockRows(KP, z0, HOGETA[0], z1, { n: nK, s: sK, w: 'small', e: 'small' });
      blockRows(HOGETA[1], z0, QX0 - 16.6, z1, { n: nK, s: sK, w: 'small' });
    }
  }
  // Along the quay road: harbour offices facing the water (rotated rows of the boulevard's fronts), behind the front strip.
  {
    const QIDS = ['kaiun_a', 'kaiun_b', 'ribbon_a', 'ribbon_b', 'hotel_a', 'brick_c', 'stone_a', 'tower_a'];
    let z = ZS - 1;
    // (Not between the boulevard and Tsunamachi-dōri: the Minatoura Trust flatiron's back reaches the quay side there.)
    const stops = [[ZS + 5, TSU[0] - 2.5], [SHI[1], SHI[0]], [HOK[1], HOK[0]], [HKG[1], HKG[0]], [KIT[1], KIT[0]], [TOMO[1], TOMO[0]], [FUNA[1], FUNA[0]], [DARIN[1], DARIN[0]]].map(([a, e]) => [a + 2.5, e - 2.5]);
    let k = 0;
    while (z > KIT[1] + 4) {
      const id = QIDS[k++ % QIDS.length], A = MINATOFRONT[id];
      const zEnd = z - A.w;
      const hit = stops.find(([a, e]) => zEnd < a && z > e);
      if (hit) { z = hit[1] - 0.5; continue; }
      // Faces east onto the quay road: front line x 738, the model's +x running north.
      const yaw = -Math.PI / 2, cx = QX0 - 2.3, cz = z - A.w / 2;
      model('minatofront', id, cx, GY, cz, yaw, 3000 + k);
      block(cx - A.d, GY, zEnd + 0.2, cx, GY + Math.max(4, A.h), z - 0.2);
      letter(cx, cz, yaw, A);
      z = zEnd - 0.6;
    }
  }

  // ═════════════════════════ Minatoura-dōri's north side, east of Kawaminato-kō (stage B of the re-lay) ═════════════════════════
  // The boulevard's fronts in blocks between Kamome-dōri, Rashin-dōri, the avenue and the two lanes (浮標小路, 舵小路):
  // urafront's buildings (build_urafront.py), none twice in a block; behind them, back to back, a lower row on
  // Tsunamachi-dōri. North of Tsunamachi-dōri, its shop houses (build_tsuna.py) carried on from Kawaminato-kō.
  {
    const BOUL = ['bank', 'screen', 'bizhotel', 'scratch', 'glass', 'tile70', 'cafe', 'mansion', 'mansion_b', 'kura', 'workshop'];
    const BACKROW = ['cafe', 'mansion', 'mansion_b', 'kura', 'workshop'];
    const URA_NAMES: Record<string, [string, string][]> = {
      bank: [['海商銀行 湊浦支店', 'Kaishō Bank · Minatoura'], ['湊浦貯蓄銀行', 'Minatoura Savings Bank']],
      screen: [['汐路汽船 本社', 'Shioji Kisen HQ'], ['湊浦海運会館', 'Minatoura Kaiun Kaikan']],
      bizhotel: [['ホテル湊浦イン', 'Hotel Minatoura Inn'], ['ビジネスホテル汐路', 'Business Hotel Shioji']],
      scratch: [['浦島商会', 'Urashima Shōkai'], ['帆影貿易', 'Hokage Bōeki']],
      glass: [['湊浦ポートビル', 'Minatoura Port Bldg.'], ['北波止場第一ビル', 'Kita-Hatoba No. 1 Bldg.']],
      tile70: [['第二帆影ビル', 'Hokage Bldg. No. 2'], ['羅針ビル', 'Rashin Bldg.']],
      cafe: [['喫茶 港灯', 'Kissa Minatobi'], ['珈琲 羅針盤', 'Coffee Rashinban']],
      mansion: [['コーポ湊浦', 'Corpo Minatoura'], ['メゾン鴎', 'Maison Kamome']],
      mansion_b: [['綱町ハイツ', 'Tsunamachi Heights'], ['汐路マンション', 'Shioji Mansion']],
      kura: [['海産物 浜屋', 'Hamaya Sea Produce'], ['昆布 北前屋', 'Kitamaeya Kombu']],
      workshop: [['浦野マリンエンジン', 'Urano Marine Engines'], ['帆布 中村テント', 'Nakamura Canvas']],
    };
    const nameUse = new Map<string, number>();
    const letterUra = (x: number, z: number, yaw: number, id: string) => {
      const A = URAFRONT[id], k = nameUse.get(id) ?? 0;
      nameUse.set(id, k + 1);
      const [ja, en] = URA_NAMES[id][k % URA_NAMES[id].length];
      if (A.pts.name) anchorSign(x, z, yaw, A.pts.name, { k: 'label', text: ja, sub: en, fg: '#ffffff', bg: '#1f2023' });
      if (A.pts.roof) anchorSign(x, z, yaw, A.pts.roof, { k: 'label', text: ja.slice(0, 7), sub: en, fg: '#ffffff', bg: '#1d3550' });
      if (A.pts.vertical) anchorSign(x, z, yaw, A.pts.vertical, { k: 'shop', ja: ja.replace(/\s.*/, '').slice(0, 6), bg: '#f4f1e8', fg: '#1d3550', vertical: true });
    };
    /**
     * A row of fronts on a street, its front line z = zf facing north (−1) or south (+1), from x0 to x1: none of the
     * ids twice in the block, no deeper than dMax; a café first on a corner where one fits. Each lot solid.
     */
    const row = (facing: -1 | 1, zf: number, x0: number, x1: number, ids: string[], dMax: number, cornerCafe = false) => {
      const usedHere = new Set<string>();
      let x = x0;
      for (let n = 0; n < 12; n++) {
        const room = x1 - x;
        const ok = ids.filter((id) => URAFRONT[id].w <= room && URAFRONT[id].d <= dMax && !usedHere.has(id));
        if (!ok.length) break;
        let id = ok[Math.floor(r() * ok.length)];
        if (n === 0 && cornerCafe && ok.includes('cafe')) id = 'cafe';
        // (Leave no strip too narrow for anything: the widest that fits, when what is left after it would be.)
        if (ok.length > 1 && room - URAFRONT[id].w - 0.6 < 7.5 && room - URAFRONT[id].w - 0.6 > 0.5) id = ok.sort((p, q) => URAFRONT[q].w - URAFRONT[p].w)[0];
        usedHere.add(id);
        const A = URAFRONT[id], cx = x + A.w / 2, yaw = facing > 0 ? Math.PI : 0;
        model('urafront', id, cx, GY, zf, yaw, 4000 + n);
        if (facing > 0) block(x + 0.2, GY, zf - A.d, x + A.w - 0.2, GY + Math.max(4, A.h), zf);
        else block(x + 0.2, GY, zf, x + A.w - 0.2, GY + Math.max(4, A.h), zf + A.d);
        letterUra(cx, zf, yaw, id);
        x += A.w + 1.0; // (Their side fittings stand 0.46 m out.)
      }
    };
    // Tsunamachi-dōri's shop houses (the north side), carried on east from Kawaminato-kō to Rashin-dōri.
    const SHOPS: [string, string][] = [
      ['船具 帆影屋', 'Hokageya Chandlery'], ['魚 浜十', 'Hamajū Fish'], ['酒 汐路', 'Shioji Saké'], ['乾物 鴎屋', 'Kamomeya Dried Goods'],
      ['理容 北波止場', 'Kita-Hatoba Barber'], ['居酒屋 錨綱', 'Izakaya Ikarizuna'], ['金物 羅針堂', 'Rashindō Hardware'], ['食堂 波止場', 'Hatoba Shokudō'],
    ];
    let shopNo = 0;
    const tsunaRow = (x0: number, x1: number) => {
      const ids = Object.keys(TSUNA).filter((k) => k.startsWith('shop_'));
      const zf = TSU[0] - 2.5 - 0.3;
      let x = x0, last = '';
      for (let n = 0; n < 16; n++) {
        const ok = ids.filter((id) => TSUNA[id].w <= x1 - x && id !== last);
        if (!ok.length) break;
        const id = ok[Math.floor(r() * ok.length)], A = TSUNA[id], cx = x + A.w / 2;
        last = id;
        model('tsuna', id, cx, GY, zf, Math.PI, 4100 + n);
        block(x + 0.2, GY, zf - A.d, x + A.w - 0.2, GY + Math.max(4, A.h), zf);
        const [ja, en] = SHOPS[shopNo++ % SHOPS.length];
        if (A.pts.name) anchorSign(cx, zf, Math.PI, A.pts.name, { k: 'label', text: ja, sub: en, fg: '#2a2019', bg: '#f2ecd8' });
        x += A.w + 0.4;
      }
    };
    // The blocks on the boulevard (x ranges), the lanes between: 浮標小路 Fuhyō-kōji and 舵小路 Kaji-kōji.
    // (East of the second lane the Hotel Hatobakan flatiron's back slants away from the boulevard: the rows stop short of it.)
    const BLOCKS: [number, number, number][] = [[450.3, KX0 - KM.pave - 0.3, KX0 - KM.pave - 0.3], [KP + 0.3, FUHYO[0] - 0.3, FUHYO[0] - 0.3],
      [FUHYO[1] + 0.3, RP0 - 0.3, RP0 - 0.3], [RP1 + 0.3, KAJI[0] - 0.3, KAJI[0] - 0.3], [KAJI[1] + 0.3, 656, 650]];
    const FB = ZS - 0.3, TB = TSU[1] + 2.5 + 0.3; // the boulevard's building line, Tsunamachi-dōri's south one
    BLOCKS.forEach(([x0, x1, x1b], k) => {
      row(1, FB, x0, x1, BOUL, 14, k > 0);
      row(-1, TB, x0, x1b, BACKROW, FB - TB - 14.6);
    });
    tsunaRow(KP + 0.3, FUHYO[0] - 0.3);
    tsunaRow(FUHYO[1] + 0.3, RP0 - 0.3);
    // The lanes: stone setts down the middle, lamps on the walls, a name at each end.
    const lane = (x0: number, x1: number, z0: number, z1: number, ja: string, en: string) => {
      paint('tile:#857e73', rect(x0, z0, x1, z1), GY + 0.008);
      paint('tile:#77716a', rect((x0 + x1) / 2 - 0.5, z0, (x0 + x1) / 2 + 0.5, z1), GY + 0.012);
      for (let z = z0 + 5; z < z1 - 3; z += 11) streetLamp(b, 'lamp_small', x0 + 0.25 - O.x, z - O.z, [1, 0]);
      zone(x0, z0, x1, z1, ja, en);
      // A name banner on a beam across each end, 3.4 m up.
      for (const [z, f] of [[z1 - 0.4, 1], [z0 + 0.4, -1]] as [number, number][]) {
        deco('flat:#3a3d41', x0, GY + 3.9, z - 0.06, x1, GY + 4.0, z + 0.06);
        b.sign({ k: 'label', text: ja, sub: en, fg: '#f2ecd8', bg: '#2a2019' }, (x0 + x1) / 2 - O.x, GY + 3.55, z + f * 0.08 - O.z, [0, f], Math.min(3.4, x1 - x0 - 0.4), 0.55);
      }
    };
    lane(FUHYO[0], FUHYO[1], TB - 0.3, FB + 0.3, '浮標小路', 'Fuhyō-kōji');
    lane(FUHYO[0], FUHYO[1], SP0, TSU[0] - 2.5, '浮標小路', 'Fuhyō-kōji');
    lane(FUHYO[0], FUHYO[1], HOK[1] + PV, SP1, '浮標小路', 'Fuhyō-kōji');
    lane(KAJI[0], KAJI[1], TB - 0.3, FB + 0.3, '舵小路', 'Kaji-kōji');
    // The narrow strip west of Kamome-dōri, along Tōsen-machi's back wall: a planted verge with bicycle racks.
    for (let z = TSU[0] - 8; z > HOK[1] + 6; z -= 9) {
      if (Math.abs(z - street('shioji').az) < 12) continue;
      modelTree(b, 'zelkova', XW + 4 - O.x, z - O.z, 'b', GY, true);
      block(XW + 3.6, GY, z - 0.4, XW + 4.4, GY + 4, z + 0.4);
    }
  }

  // ═════════════════════════ Street dress round the inner blocks (2026-11-24) ═════════════════════════
  // On the grid's side streets: LED lamps on the kerb, street trees where the pavement is wide enough, vending
  // machines and bicycle racks against the fronts, all clear of the junctions, the lane mouths and the avenue. In the
  // lanes: bicycles along one wall, potted plants by the doors; in 汽笛横丁 crates of empties and a saké barrel.
  {
    const bikeAt = (x: number, z: number, f: [number, number]) => {
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x - O.x, GY, z - O.z), yaw: Math.atan2(-f[0], -f[1]), seed: 0, merge: true });
    };
    const NS_LANES = [FUHYO, KAJI, KITEKI, HOGETA], EW_LANES = [TOMO, FUNA, DARIN];
    const nearLane = (x: number, z: number, m = 3) => NS_LANES.some(([p, q]) => x > p - m && x < q + m) || EW_LANES.some(([p, q]) => z > p - m && z < q + m);
    const offAve = (x: number, z: number) => Math.abs(tOf(x, z)) > 34 && !(Math.abs(sOf(x, z) - S_PLAZA) < PLAZA.r + 10 && Math.abs(tOf(x, z)) < PLAZA.r + 12);
    for (const sr of STREETS) {
      if (sr.id === 'ave' || sr.id === 'quay') continue;
      const others = [...STREETS, street('tsuna'), street('boulevard')].filter((o) => o !== sr);
      const [e0, e1] = northEnds(sr);
      const sa = Math.min(e0, e1), sb = Math.max(e0, e1);
      const nearJunction = (s: number) => others.some((o) => {
        const m = northMeet(sr, o);
        if (!m) return false;
        const [o0, o1] = o.id === 'boulevard' ? [-1e9, 1e9] : northEnds(o);
        const back = northMeet(o, sr)!.s;
        if (back < Math.min(o0, o1) - 2 || back > Math.max(o0, o1) + 2) return false;
        return Math.abs(s - m.s) < (o.half + o.pave) / m.sin + 7;
      });
      const lx = sr.uz, lz = -sr.ux; // left of the heading
      let k = 0;
      for (let s = sa + 8; s < sb - 6; s += 12, k++) {
        if (nearJunction(s)) continue;
        for (const side of [-1, 1]) {
          const at = (off: number): [number, number] => [sr.ax + sr.ux * s + lx * side * off, sr.az + sr.uz * s + lz * side * off];
          const [kx, kz] = at(sr.half + 0.45);
          if (kx < XW + 0.5 || kx > QX0 - 1 || kz > ZS - 0.5 || kz < ZN + 0.5) continue;
          if (!offAve(kx, kz) || nearLane(kx, kz)) continue;
          const toRoad: [number, number] = [-lx * side, -lz * side];
          if ((k + (side > 0 ? 1 : 0)) % 2 === 0) {
            roadModel(b, 'lamp_led', kx - O.x, GY, kz - O.z, toRoad);
            block(kx - 0.12, GY, kz - 0.12, kx + 0.12, GY + 3, kz + 0.12);
          } else if (sr.pave >= 3) {
            const [tx, tz] = at(sr.half + 1.3);
            modelTree(b, 'zelkova', tx - O.x, tz - O.z, 'b', GY, true);
            block(tx - 0.4, GY, tz - 0.4, tx + 0.4, GY + 4, tz + 0.4);
          }
          // Against the fronts: every fourth stop a vending machine, every fifth a few bicycles.
          const [fx, fz] = at(sr.half + sr.pave - 0.45);
          const away: [number, number] = [lx * side, lz * side];
          // (Not where the far side is the north promenade, nor on a pavement too narrow for a machine.)
          if (fz < KIT[0] + 1) continue;
          if (k % 4 === 1 && sr.pave >= 2.5) {
            vending(b, fx - O.x, GY, fz - O.z, toRoad, k % 8 === 1 ? 'vending' : 'vending2', 'old');
          } else if (k % 5 === 2) {
            for (let j = 0; j < 3; j++) bikeAt(fx + sr.ux * (j * 0.7 - 0.7), fz + sr.uz * (j * 0.7 - 0.7), away);
          }
        }
      }
    }
    // The lanes: bicycles along the wall opposite the lamps, potted plants and, in 汽笛横丁, crates and a barrel.
    const laneDress = (x0: number, z0: number, x1: number, z1: number, yoko: boolean) => {
      const alongX = x1 - x0 > z1 - z0;
      const len = alongX ? x1 - x0 : z1 - z0;
      for (let u = 7; u < len - 4; u += 9) {
        const [px, pz] = alongX ? [x0 + u, z1 - 0.45] : [x1 - 0.45, z0 + u];
        if (!offAve(px, pz) || (alongX ? NS_LANES.some(([p, q]) => px > p - 3 && px < q + 3) : EW_LANES.some(([p, q]) => pz > p - 3 && pz < q + 3))) continue;
        const f: [number, number] = alongX ? [0, -1] : [-1, 0];
        if (Math.round(u / 9) % 3 === 0) {
          for (let j = 0; j < 2; j++) bikeAt(px + (alongX ? j * 0.7 : 0), pz + (alongX ? 0 : j * 0.7), [-f[0], -f[1]]);
        } else if (yoko) {
          deco('flat:#c8402a', px - 0.25, GY, pz - 0.25, px + 0.25, GY + 0.35, pz + 0.25);
          deco('flat:#e6a700', px - 0.25, GY + 0.35, pz - 0.25, px + 0.25, GY + 0.7, pz + 0.25);
          deco('wood:#8a6a4c', px + (alongX ? 0.7 : 0) - 0.3, GY, pz + (alongX ? 0 : 0.7) - 0.3, px + (alongX ? 0.7 : 0) + 0.3, GY + 0.8, pz + (alongX ? 0 : 0.7) + 0.3);
          block(px - 0.3, GY, pz - 0.3, px + (alongX ? 1.0 : 0.3), GY + 0.8, pz + (alongX ? 0.3 : 1.0));
        } else {
          deco('flat:#7a4a3a', px - 0.22, GY, pz - 0.22, px + 0.22, GY + 0.4, pz + 0.22);
          deco('flat:#3f6f4a', px - 0.35, GY + 0.4, pz - 0.35, px + 0.35, GY + 1.1, pz + 0.35);
          block(px - 0.25, GY, pz - 0.25, px + 0.25, GY + 0.9, pz + 0.25);
        }
      }
    };
    laneDress(KITEKI[0], HOK[1] + 2, KITEKI[1], SHI[0] - street('shioji').pave, true);
    for (const [a, e] of [[HOK[1] + 2, SHI[0] - 2.5], [SHI[1] + 2.5, TSU[0] - 2.5]] as [number, number][]) laneDress(FUHYO[0], a, FUHYO[1], e, false);
    for (const [a, e] of [[HKG[1] + 3.5, HOK[0] - 2], [KIT[1] + 2.5, HKG[0] - 3.5]] as [number, number][]) laneDress(HOGETA[0], a, HOGETA[1], e, false);
    for (const L of EW_LANES) laneDress(KX1 + KM.pave, L[0], QX0 - 17, L[1], false);
  }

  // ═════════════════════════ The plaza and the promenade ═════════════════════════
  {
    const { x: px, z: pz, r: R } = PLAZA;
    // Granite rings, a lawn ring with cherries, the monument in the middle.
    for (const q of ring(px, pz, R - 2.5, R, 40)) paint('tile:#8a8279', q, GY + 0.006);
    for (const q of ring(px, pz, 9, 15, 32)) paint('grass', q, GY + 0.02);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * 2 * Math.PI, x = px + Math.cos(a) * 12, z = pz + Math.sin(a) * 12;
      modelTree(b, 'cherry', x - O.x, z - O.z, 'b', GY, false);
      block(x - 0.4, GY, z - 0.4, x + 0.4, GY + 4, z + 0.4);
    }
    model('hatoba', 'hokage', px, GY, pz - HATOBA.hokage.d / 2, 0);
    solidPoly(b, Wp(disc(px, pz, 7, 24)), GY, GY + 1.0);
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * 2 * Math.PI, x = px + Math.cos(a) * (R - 4), z = pz + Math.sin(a) * (R - 4);
      roadModel(b, 'bench_s', x - O.x, GY, z - O.z, [Math.cos(a), Math.sin(a)]);
      streetLamp(b, 'lamp_park', px + Math.cos(a + 0.4) * (R - 1.5) - O.x, pz + Math.sin(a + 0.4) * (R - 1.5) - O.z, [Math.cos(a), Math.sin(a)]);
    }
    for (let x = px - R; x < px + R; x += 8) for (let z = pz - R; z < pz + R; z += 8) if (Math.hypot(x + 4 - px, z + 4 - pz) < R) zone(x, z, x + 8, z + 8, '帆影広場', 'Hokage Hiroba');
    // The promenade on north-west: a double row of ginkgos, benches, lamps.
    for (let s = S_PLAZA + R + 8; ; s += 12) {
      const [cx, cz] = st(s, 0);
      if (cx < XW + 3 || cz < KIT[1] + 4) break;
      for (const t of [-7, 7]) {
        const [x, z] = st(s, t);
        if (x < XW + 2 || (x > KX0 - 2.5 - 1 && x < KX1 + 2.5 + 1)) continue;
        modelTree(b, 'ginkgo', x - O.x, z - O.z, 'b', GY, true);
        block(x - 0.4, GY, z - 0.4, x + 0.4, GY + 4, z + 0.4);
      }
      zone(cx - 9, cz - 9, cx + 9, cz + 9, '帆影プロムナード', 'Hokage Promenade');
    }
  }

  // ═════════════════════════ Lamps and trees along the avenue's pavements ═════════════════════════
  for (const side of [-1, 1] as const) {
    for (let s = s0 + 8; s + 9 < S_HOKAGE - 14; s += 18) {
      if (junctionS.some((j) => Math.abs(s - j) < 18 || Math.abs(s + 9 - j) < 16)) continue;
      const [lx, lz] = st(s, side * (AVE_X.kerb + 0.8));
      roadModel(b, 'lamp_led', lx - O.x, GY, lz - O.z, [-side * RX, -side * RZ]);
      block(lx - 0.12, GY, lz - 0.12, lx + 0.12, GY + 3, lz + 0.12);
      const [tx, tz] = st(s + 9, side * (AVE_X.kerb + 1.6));
      modelTree(b, 'zelkova', tx - O.x, tz - O.z, 'b', GY, true);
      block(tx - 0.4, GY, tz - 0.4, tx + 0.4, GY + 4, tz + 0.4);
    }
  }

  // ═════════════════════════ Edges ═════════════════════════
  // West: Tōsen-machi's plot to z −265 (open between them), the land of the bluff beyond (not yet walked: a wall).
  // (Open where Kamome-ga-oka's two stairs come down, z −304 … −298 and −473 … −467: kamome-street.ts.)
  for (const [z0, z1] of [[ZN, -473], [-467, -304], [-298, -265]]) block(XW - 1, -1, z0, XW, 60, z1);
  // (North and east: the quay's railings above.)
  void floorPoly;
  return b.out;
}
