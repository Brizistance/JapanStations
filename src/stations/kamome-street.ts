// 鴎ヶ丘 Kamome-ga-oka, the foreign quarter on the bluff (2026-11-24, stage 3 of the north districts; after Kobe's
// Kitano and Nagasaki's Minami-Yamate, the names invented). The old rocky islet the port landfill was built round:
// it rises from Hokushin-dōri in four terraces on stone retaining walls (石垣) to a summit 15 m up, a cliff over the
// river mouth on its north. Two ways climb it straight: 鴎坂 Kamome-zaka (Hobashira-suji carried up, a sloped
// lane) and 天主堂坂 Tenshudō-zaka (Sanbashi-suji carried up, a stone stair lane); 浜見坂 Hamami-zaka and the
// north stair climb its east wall from Kita-Hatoba. On the terraces, flat car-free lanes with the merchants'
// houses (異人館), the old consulate and the Harrington House museum; on the summit the church 川湊天主堂 over the
// harbour (on the line of Hokage-ōdōri's promenade) and the lookout park 鴎ヶ丘公園; the mission school
// 鴎ヶ丘女学院 on the lowest terrace. No traffic.
//
// Frame: world (320, −378.5), yaw 0. Plot ±145 × ±113.5: world x 175 … 465, z −492 … −265. Written in world x, z.
//
//   z −272 … −265  the foot (y 0): Hokushin-dōri's north pavement carried on
//   T1 z −320 … −272 at 3 m:   港見通 Minatomi-dōri z −304 … −298 (on Kita-Hatoba's Tōdai-dōri's line)
//   T2 z −366 … −320 at 7.5 m: 異人館通 Ijinkan-dōri z −345 … −339
//   T3 z −414 … −366 at 12.5 m: 鐘楼通 Shōrō-dōri z −393 … −387
//   T4 z −492 … −414 at 15 m:  the summit: the church (x 422 … 465), the lookout park (z −492 … −455)
//   x 238 … 252 鴎坂, x 389 … 401 天主堂坂 (their landings at the three lanes)
//
// Models: tools/blender/build_kamome.py.

import { Builder, rng, type Build } from '../world/builder';
import type { SignContent } from '../signs/content';
import type { AnchorPt } from './anchors/types';
import { KAMOME } from './anchors/kamome';
import { GROUND_Y as GY, stairs } from './kit';
import { roadModel, streetLamp } from './roads';
import { BUILDING_MODELS } from './buildings';
import { churchInside, harringtonInside } from './interiors';
import { modelTree, type TreeKind } from './trees';

export const KAMOME_FRAME = { x: 320, z: -378.5 };
const O = KAMOME_FRAME;
export const KAMOME_PLOT = { x: 145, z: 113.5 };
export const KAMOME_NAME = { ja: '鴎ヶ丘', en: 'Kamome-ga-oka' };

const XW = 175, XE = 465, ZS = -265, ZN = -492;
/** The terraces: z range (z0 north, z1 south) and height. */
export const TERRACES = [
  { z0: -320, z1: -272, y: 3 },
  { z0: -366, z1: -320, y: 7.5 },
  { z0: -414, z1: -366, y: 12.5 },
  { z0: ZN, z1: -414, y: 15 },
];
/** The lanes across the terraces (z0, z1) and names. */
const LANES = [
  { z: [-304, -298] as [number, number], ja: '港見通', en: 'Minatomi-dōri', t: 0 },
  { z: [-345, -339] as [number, number], ja: '異人館通', en: 'Ijinkan-dōri', t: 1 },
  { z: [-393, -387] as [number, number], ja: '鐘楼通', en: 'Shōrō-dōri', t: 2 },
];
/** The two ways straight up (x ranges). */
const ZAKA: [number, number] = [238, 252], TENSHU: [number, number] = [389, 401];
/** Their height profile: (z, y) points from the foot to the summit, flat over each lane. */
const PROFILE: [number, number][] = [[-272, 0], [-297.5, 3], [-304.5, 3], [-338.5, 7.5], [-345.5, 7.5], [-386.5, 12.5], [-393.5, 12.5], [-414, 15]];
/** The east stairs (z ranges) and how far west they run. */
const TODAI = { z: [-304, -298] as [number, number], x: 453 }, KITA = { z: [-473, -467] as [number, number], x: 436 };

const STONE = 'tile:#8f877a', STONE_L = 'tile:#a59c8e', PAVE = 'paver', SETT = 'tile:#77716a', IRONC = 'flat:#25282b', WHITE = 'flat:#f4f1e8';
type Face = 'n' | 's' | 'e' | 'w';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };

export function kamomeGaOka(): Build {
  const b = new Builder();
  const r = rng(4417);
  b.out.plot = { ...KAMOME_PLOT };
  b.out.spawn = { pos: [245 - O.x, GY, -268 - O.z], yaw: 0 };
  const fx = (x: number) => x - O.x, fz = (z: number) => z - O.z;
  const box = (mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, solid = true) => b.box(mat, fx(x0), y0, fz(z0), fx(x1), y1, fz(z1), solid);
  const deco = (mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => box(mat, x0, y0, z0, x1, y1, z1, false);
  const block = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.block(fx(x0), y0, fz(z0), fx(x1), y1, fz(z1));
  const zone = (x0: number, z0: number, x1: number, z1: number, y: number, ja: string, en: string) => b.zone('street', fx(Math.min(x0, x1)), y - 0.5, fz(Math.min(z0, z1)), fx(Math.max(x0, x1)), y + 8, fz(Math.max(z0, z1)), ja, en, true);
  /** Do `fn` in a frame facing `face`, its origin at world (x, y, z): the model's front middle there. */
  const at = (face: Face, x: number, y: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [fx(x), y, fz(z)] }, fn);
  const signAt = (p: AnchorPt, c: SignContent) => b.sign(c, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  const tree = (kind: TreeKind, x: number, y: number, z: number) => {
    modelTree(b, kind, fx(x), fz(z), 'b', y + GY, true);
    block(x - 0.4, y + GY, z - 0.4, x + 0.4, y + GY + 4, z + 0.4);
  };
  const lamp = (x: number, y: number, z: number, f: [number, number]) => b.with({ t: [0, y, 0] }, () => streetLamp(b, 'lamp_park', fx(x), fz(z), f));
  const bench = (x: number, y: number, z: number, f: [number, number]) => {
    b.with({ t: [0, y, 0] }, () => roadModel(b, 'bench_s', fx(x), GY, fz(z), f));
    const hx = f[0] ? 0.4 : 0.95, hz = f[0] ? 0.95 : 0.4;
    block(x - hx, y + GY, z - hz, x + hx, y + GY + 0.6, z + hz);
  };
  /** Height of the two straight ways at z. */
  const yAt = (z: number) => {
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [za, ya] = PROFILE[i], [zb, yb] = PROFILE[i + 1];
      if (z <= za && z >= zb) return ya + ((yb - ya) * (za - z)) / (za - zb);
    }
    return z > PROFILE[0][0] ? 0 : 15;
  };
  /** Not in either way up (x). */
  const offWays = (x: number, m = 1.5) => ![ZAKA, TENSHU].some(([a, e]) => x > a - m && x < e + m);

  // ═════════════════════════ Ground: the foot, the terraces, their walls ═════════════════════════
  b.slab('asphalt', fx(XW), fz(-272), fx(XE), fz(ZS), -0.6, 0, []);
  b.slab(PAVE, fx(XW), fz(-272), fx(XE), fz(ZS), 0, GY, []);
  zone(XW, -272, XE, ZS, 0, KAMOME_NAME.ja, KAMOME_NAME.en);
  const cuts = (t: number): number[][] => {
    const out: number[][] = [];
    for (const [x0, x1] of [ZAKA, TENSHU]) out.push([fx(x0), fz(TERRACES[t].z0) - 1, fx(x1), fz(TERRACES[t].z1) + 1]);
    if (t === 0) out.push([fx(TODAI.x), fz(TODAI.z[0]), fx(XE) + 1, fz(TODAI.z[1])]);
    if (t === 3) out.push([fx(KITA.x), fz(KITA.z[0]), fx(XE) + 1, fz(KITA.z[1])]);
    return out;
  };
  TERRACES.forEach((T, t) => {
    const top = T.y + GY, y0 = t === 3 ? -2.5 : -0.6;
    // The terrace: a solid block of stone faced with 石垣 (what shows of it is the walls), paved on top.
    b.slab(STONE, fx(XW), fz(T.z0), fx(XE), fz(T.z1), y0, top, cuts(t));
    b.slab(PAVE, fx(XW), fz(T.z0), fx(XE), fz(T.z1), top, top + 0.01, cuts(t), false);
    zone(XW, T.z0, XE, T.z1, T.y, KAMOME_NAME.ja, KAMOME_NAME.en);
    // The wall's coping and an iron railing along its top (its south edge), broken at the two ways.
    const rail = (x0: number, x1: number) => {
      if (x1 - x0 < 1) return;
      deco(STONE_L, x0, top - 0.25, T.z1 - 0.5, x1, top + 0.08, T.z1);
      deco(IRONC, x0, top + 1.0, T.z1 - 0.32, x1, top + 1.06, T.z1 - 0.26);
      for (let x = x0 + 0.1; x < x1; x += 1.8) deco(IRONC, x - 0.03, top, T.z1 - 0.32, x + 0.03, top + 1.0, T.z1 - 0.26);
      block(x0, top, T.z1 - 0.4, x1, top + 1.3, T.z1 - 0.2);
    };
    let x = XW;
    for (const [c0, c1] of [ZAKA, TENSHU]) { rail(x, c0); x = c1; }
    rail(x, XE);
    // Its east face: the bluff's wall over Kita-Hatoba, a rail along the top.
    // (Broken where a stair comes up it.)
    const gap = t === 0 ? TODAI.z : t === 3 ? KITA.z : null;
    for (const [z0, z1] of (gap ? [[T.z0, gap[0]], [gap[1], T.z1]] : [[T.z0, T.z1]]) as [number, number][]) {
      deco(STONE_L, XE - 0.5, top - 0.25, z0, XE, top + 0.08, z1);
      block(XE - 0.4, top, z0, XE - 0.2, top + 1.3, z1);
      for (let z = z0 + 0.5; z < z1; z += 1.8) deco(IRONC, XE - 0.32, top, z - 0.03, XE - 0.26, top + 1.0, z + 0.03);
      deco(IRONC, XE - 0.32, top + 1.0, z0, XE - 0.26, top + 1.06, z1);
    }
  });
  // The north cliff over the river mouth: the summit's rail; the west edge (the bluff's back, not walked) a wall.
  deco(STONE_L, XW, 15 + GY - 0.25, ZN, XE, 15 + GY + 0.08, ZN + 0.5);
  deco(IRONC, XW, 15 + GY + 1.0, ZN + 0.26, XE, 15 + GY + 1.06, ZN + 0.32);
  for (let x = XW + 0.5; x < XE; x += 1.8) deco(IRONC, x - 0.03, 15 + GY, ZN + 0.26, x + 0.03, 15 + GY + 1.0, ZN + 0.32);
  block(XW, 15 + GY, ZN + 0.2, XE, 15 + GY + 1.3, ZN + 0.4);
  // (The cliff's face 0.4 m proud of the landfill's edge, so the shore's embankment at z −492 is hidden in it.)
  box(STONE, XW, -2.5, ZN - 0.4, XE, 15 + GY, ZN);
  block(XW - 1, -1, ZN, XW, 60, ZS);
  block(XW, -1, ZN - 1, XE, 60, ZN);

  // ═════════════════════════ The two ways up ═════════════════════════
  /** A sloped or stepped run northwards over x0 … x1 from z = za (low) to zb (high); `steps` lays treads. */
  const run = (x0: number, x1: number, za: number, zb: number, ya: number, yb: number, steps: boolean, rails: [boolean, boolean]) => {
    // (Local frame: +x runs north, +z runs east: rot 3 maps local (lx, lz) to frame (lz, −lx).)
    b.with({ rot: 3 }, () => {
      const lx0 = -fz(za), lx1 = -fz(zb), lz0 = fx(x0), lz1 = fx(x1);
      if (steps) stairs(b, { x0: lx0, x1: lx1, z0: lz0, z1: lz1, yLow: ya + GY, yHigh: yb + GY, mat: STONE_L, rails });
      else {
        b.ramp(lx0, lz0, lx1, lz1, ya + GY, yb + GY, [1, 0]);
        // The embankment under it, its top the lane's surface; setts down the middle, kerbs either side.
        b.slant(STONE, lx0, -0.6, lz0, lx1, ya + GY, lz1, yb - ya);
        b.slant(PAVE, lx0, ya + GY, lz0, lx1, ya + GY + 0.012, lz1, yb - ya);
        b.slant(SETT, lx0, ya + GY + 0.012, (lz0 + lz1) / 2 - 1.5, lx1, ya + GY + 0.02, (lz0 + lz1) / 2 + 1.5, yb - ya);
        // Parapets: low stone walls you cannot step over, capped.
        const chunks = Math.max(2, Math.ceil((lx1 - lx0) / 3));
        for (const [on, z0, z1] of [[rails[0], lz0, lz0 + 0.4], [rails[1], lz1 - 0.4, lz1]] as [boolean, number, number][]) {
          if (!on) continue;
          b.slant(STONE_L, lx0, ya + GY - 0.6, z0, lx1, ya + GY + 0.9, z1, yb - ya);
          for (let k = 0; k < chunks; k++) {
            const xa = lx0 + ((lx1 - lx0) * k) / chunks, xb = lx0 + ((lx1 - lx0) * (k + 1)) / chunks;
            b.block(xa, ya + GY, z0, xb, ya + GY + ((yb - ya) * (k + 1)) / chunks + 0.9, z1);
          }
        }
      }
      // Solid under it, a step below its surface, so nothing is walked under or into.
      const n = Math.max(1, Math.ceil(lx1 - lx0));
      for (let k = 0; k < n; k++) {
        const xa = lx0 + ((lx1 - lx0) * k) / n, xb = lx0 + ((lx1 - lx0) * (k + 1)) / n;
        const yTop = ya + ((yb - ya) * k) / n + GY - 0.15;
        if (yTop > -0.3) b.block(xa, -0.6, lz0 + 0.4, xb, yTop, lz1 - 0.4);
      }
    });
  };
  const flat = (x0: number, x1: number, z0: number, z1: number, y: number, mat: string) => {
    box(STONE, x0, -0.6, z0, x1, y + GY, z1);
    deco(mat, x0, y + GY, z0, x1, y + GY + 0.012, z1);
  };
  for (const [[x0, x1], steps, ja, en] of [[ZAKA, false, '鴎坂', 'Kamome-zaka'], [TENSHU, true, '天主堂坂', 'Tenshudō-zaka']] as [[number, number], boolean, string, string][]) {
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [za, ya] = PROFILE[i], [zb, yb] = PROFILE[i + 1];
      if (ya === yb) flat(x0, x1, zb, za, ya, steps ? STONE_L : PAVE);
      else run(x0, x1, za, zb, ya, yb, steps, [true, true]);
      for (let z = za; z > zb + 1; z -= 8) zone(x0, z, x1, Math.max(zb, z - 8), yAt(z - 4), ja, en);
    }
    // On the summit: on north to the park as a level walk.
    flat(x0, x1, ZN, -414, 15, steps ? STONE_L : PAVE);
    // Lamps up the way, cherries on Kamome-zaka's terraces either side.
    for (let z = -278; z > -410; z -= 16) {
      if (LANES.some((l) => z > l.z[0] - 3 && z < l.z[1] + 3)) continue;
      lamp(x0 + 0.7, yAt(z), z, [1, 0]);
    }
  }
  // Name posts at the foot of each.
  for (const [x, ja, en] of [[ZAKA[0] + 1, '鴎坂', 'Kamome-zaka · to Kamome-ga-oka'], [TENSHU[0] + 1, '天主堂坂', 'Tenshudō-zaka · to the church']] as [number, string, string][]) {
    b.sign({ k: 'label', text: ja, sub: en, fg: '#f2ecd8', bg: '#2a2622' }, fx(x - 0.6), GY + 1.6, fz(-271.5), [0, 1], 1.1, 0.45);
  }

  // ═════════════════════════ The lanes across the terraces ═════════════════════════
  for (const L of LANES) {
    const T = TERRACES[L.t], y = T.y + GY;
    deco(SETT, XW, y + 0.01, L.z[0], XE, y + 0.022, L.z[1]);
    deco(STONE_L, XW, y + 0.022, (L.z[0] + L.z[1]) / 2 - 0.4, XE, y + 0.03, (L.z[0] + L.z[1]) / 2 + 0.4);
    zone(XW, L.z[0] - 3, XE, L.z[1] + 3, T.y, L.ja, L.en);
    for (let x = XW + 12; x < XE - 4; x += 22) {
      if ([ZAKA, TENSHU].some(([a, e]) => x > a - 3 && x < e + 3)) continue;
      lamp(x, T.y, L.z[0] - 0.4, [0, 1]);
    }
    for (const [a, e] of [ZAKA, TENSHU]) b.sign({ k: 'label', text: L.ja, sub: L.en, fg: '#f2ecd8', bg: '#2f4a3a' }, fx(e + 1.2), y + 2.2, fz(L.z[1] + 0.3), [0, 1], 1.2, 0.4);
  }

  // ═════════════════════════ The east stairs from Kita-Hatoba ═════════════════════════
  /** A flight westwards from x = XE (low) to x = xw (high) over z0 … z1. (rot 2: local (lx, lz) is frame (−lx, −lz).) */
  const westFlight = (xw: number, z0: number, z1: number, y: number) => b.with({ rot: 2 }, () => {
    stairs(b, { x0: -fx(XE), x1: -fx(xw), z0: -fz(z1), z1: -fz(z0), yLow: GY, yHigh: y + GY, mat: STONE_L });
    const n = Math.ceil(XE - xw);
    for (let k = 0; k < n; k++) {
      const yTop = (y * k) / n + GY - 0.15;
      if (yTop > -0.3) b.block(-fx(XE) + k, -0.6, -fz(z1) + 0.1, -fx(XE) + k + 1, yTop, -fz(z0) - 0.1);
    }
  });
  westFlight(TODAI.x, TODAI.z[0], TODAI.z[1], TERRACES[0].y);
  westFlight(KITA.x, KITA.z[0], KITA.z[1], TERRACES[3].y);
  b.zone('street', fx(TODAI.x), -0.5, fz(TODAI.z[0]), fx(XE), TERRACES[0].y + 8, fz(TODAI.z[1]), '浜見坂', 'Hamami-zaka', true);
  // Rails along the top of the north stair's cutting, either side.
  for (const z of KITA.z) {
    const zz = z === KITA.z[0] ? z - 0.15 : z + 0.15;
    deco(IRONC, KITA.x, 15 + GY + 1.0, zz - 0.03, XE, 15 + GY + 1.06, zz + 0.03);
    for (let x = KITA.x + 0.2; x < XE; x += 1.8) deco(IRONC, x - 0.03, 15 + GY, zz - 0.03, x + 0.03, 15 + GY + 1.0, zz + 0.03);
    block(KITA.x, 15 + GY, zz - 0.1, XE, 15 + GY + 1.3, zz + 0.1);
  }
  b.zone('street', fx(KITA.x), -0.5, fz(KITA.z[0]), fx(XE), 23, fz(KITA.z[1]), '北岸の石段', 'Kitagishi steps', true);
  b.sign({ k: 'label', text: '浜見坂', sub: 'Hamami-zaka · to Kamome-ga-oka', fg: '#f2ecd8', bg: '#2a2622' }, fx(XE + 0.05), GY + 2.2, fz(TODAI.z[1] + 0.8), [1, 0], 1.2, 0.45);
  b.sign({ k: 'label', text: '鴎ヶ丘公園', sub: 'Kamome-ga-oka Park · steps', fg: '#ffffff', bg: '#2f4a2c' }, fx(XE + 0.05), GY + 2.2, fz(KITA.z[1] + 0.8), [1, 0], 1.2, 0.45);

  // ═════════════════════════ Buildings ═════════════════════════
  /** A house on a terrace: its front middle at (x, zf), facing `face`; a front garden to the lane behind a picket fence. */
  const placed: [number, number, number, number][] = [];
  const house = (id: string, face: 'n' | 's' | 'e', x: number, zf: number, y: number, ja: string, en: string, garden = 4.5) => {
    const A = KAMOME[id];
    at(face, x, y + GY, zf, () => {
      b.model('kamome', id, 0, 0, 0);
      // (The museum is walked into: its rooms, interiors.ts.)
      if (id === 'harrington') harringtonInside(b, 0, A.w, A.d, A.h);
      // (From the front of what stands before the façade: veranda, bay, podium.)
      else b.block(-A.w / 2 + 0.2, 0, -({ ijin_a: 2.5, ijin_b: 2.5, ijin_c: 2.9, ijin_d: 1.1, ryoji: 3.1 }[id] ?? 0), A.w / 2 - 0.2, A.h, A.d - 0.2);
      if (A.pts.name) signAt([A.pts.name[0], A.pts.name[1] - GY, A.pts.name[2], A.pts.name[3], A.pts.name[4], A.pts.name[5], A.pts.name[6]] as AnchorPt, { k: 'label', text: ja, sub: en, fg: '#f2ecd8', bg: '#2f4a3a' });
      // The picket fence along the lane, a gate in the middle; a name plate on the gate post.
      const zf2 = -garden;
      for (const [a, e] of [[-A.w / 2 - 1, -1.0], [1.0, A.w / 2 + 1]]) {
        b.deco(WHITE, a, 0.6, zf2 - 0.04, e, 0.68, zf2 + 0.04);
        b.deco(WHITE, a, 0.2, zf2 - 0.04, e, 0.26, zf2 + 0.04);
        for (let px = a; px < e; px += 0.18) b.deco(WHITE, px, 0, zf2 - 0.03, px + 0.08, 0.95, zf2 + 0.03);
        b.block(a, 0, zf2 - 0.1, e, 1.0, zf2 + 0.1);
      }
      for (const sx of [-1, 1]) b.deco(STONE_L, sx * 1.0 - 0.2, 0, zf2 - 0.2, sx * 1.0 + 0.2, 1.3, zf2 + 0.2);
      b.sign({ k: 'label', text: ja, sub: en, fg: '#2a2622', bg: '#efe6cf' }, 1.0, 0.95 + GY, zf2 - 0.21, [0, -1], 0.8, 0.32);
      b.deco('grass', -A.w / 2 - 1, 0.012, zf2 + 0.1, -1.1, 0.03, -0.1);
      b.deco('grass', 1.1, 0.012, zf2 + 0.1, A.w / 2 + 1, 0.03, -0.1);
      b.deco(STONE_L, -0.9, 0.012, zf2, 0.9, 0.03, 0);
    });
    const wx = face === 'e' ? [x - A.d, x] : [x - A.w / 2 - 1, x + A.w / 2 + 1];
    const wz = face === 'n' ? [zf - garden, zf + A.d] : face === 's' ? [zf - A.d, zf + garden] : [zf - A.w / 2, zf + A.w / 2];
    placed.push([wx[0], wz[0], wx[1], wz[1]]);
  };
  const LANEZ = (t: number) => LANES[t].z;
  // T1, south of 港見通: the school west of Kamome-zaka, the Walsh House and the consulate east of it.
  {
    const y = TERRACES[0].y, zf = LANEZ(0)[1] + 7; // (7 m back: the school's lawn and gate; the houses 5 m, their gardens)
    const S = KAMOME.school;
    at('n', 206, y + GY, zf, () => {
      b.model('kamome', 'school', 0, 0, 0);
      b.block(-4.7, 0, -1.7, 4.7, S.h + 3, S.d - 0.2);
      b.block(-S.w / 2 + 0.2, 0, 0.2, S.w / 2 - 0.2, S.h + 2, S.d - 0.2);
      if (S.pts.name) signAt([S.pts.name[0], S.pts.name[1] - GY, S.pts.name[2], S.pts.name[3], S.pts.name[4], S.pts.name[5], S.pts.name[6]] as AnchorPt, { k: 'label', text: '鴎ヶ丘女学院', sub: 'Kamome-ga-oka Jogakuin · 1925', fg: '#2a2622', bg: '#e8dcb8' });
      // The lawn before it, the gate on the lane: two brick piers, iron gates folded back, a plate.
      b.deco('grass', -S.w / 2, 0.012, -5.6, -2.0, 0.03, -1.8);
      b.deco('grass', 2.0, 0.012, -5.6, S.w / 2, 0.03, -1.8);
      b.deco(STONE_L, -2.0, 0.012, -6, 2.0, 0.03, -1.6);
      for (const sx of [-1, 1]) {
        b.deco('flat:#8d4634', sx * 2.4 - 0.4, 0, -6.4, sx * 2.4 + 0.4, 2.2, -5.6);
        b.block(sx * 2.4 - 0.4, 0, -6.4, sx * 2.4 + 0.4, 2.2, -5.6);
        b.deco(IRONC, sx * 2.8, 0, -6.2, sx * 4.4, 1.9, -6.12);
        b.deco('flat:#8d4634', sx * 2.8, 0, -6.2, sx * (S.w / 2), 1.0, -5.8);
        b.block(sx * 2.8, 0, -6.2, sx * (S.w / 2), 1.0, -5.8);
      }
      b.sign({ k: 'label', text: '鴎ヶ丘女学院', sub: 'Kamome-ga-oka Jogakuin', fg: '#2a2622', bg: '#efe6cf' }, -2.4, GY + 1.5, -6.42, [0, -1], 0.7, 0.9);
      for (const sx of [-1, 1]) for (const dx of [8, 16]) { modelTree(b, 'camphor', sx * dx, -3.5, 'b', 0, true); b.block(sx * dx - 0.5, 0, -4, sx * dx + 0.5, 4, -3); }
    });
    placed.push([206 - S.w / 2, zf - 6.4, 206 + S.w / 2, zf + S.d]);
    house('ijin_a', 'n', 272, zf - 2, y, '旧ウォルシュ邸', 'Old Walsh House · 1899');
    house('ryoji', 'n', 318, zf + 1.5, y, '旧デンマーク領事館', 'Old Danish Consulate · 1908', 6);
    house('ijin_d', 'n', 425, zf - 2, y, '旧ブラント邸', 'Old Brandt House · 1904');
  }
  // T2, on 異人館通: the Harrington House (the museum) and the Rossi House south of it, the Heyden House north.
  {
    const y = TERRACES[1].y;
    house('harrington', 'n', 300, LANEZ(1)[1] + 5, y, '旧ハリントン邸', 'Harrington House · museum · 1902');
    house('ijin_c', 'n', 340, LANEZ(1)[1] + 5, y, '旧ロッシ邸', 'Old Rossi House · 1911');
    house('ijin_b', 's', 290, LANEZ(1)[0] - 5, y, '旧ヘイデン邸', 'Old Heyden House · 1897');
  }
  // The church on the summit, its front to the east over the harbour (on Hokage-ōdōri's line), a forecourt before it.
  const CH = { x: 458, z: -428 };
  {
    const y = TERRACES[3].y, C = KAMOME.church;
    at('e', CH.x, y + GY, CH.z, () => {
      b.model('kamome', 'church', 0, 0, 0);
      // Solid: the tower's two sides and its back over the porch, the nave's walls (the nave itself is walked: stage 4).
      const T = 7.0;
      b.block(-T / 2, 0, 0, -1.2, 40, T);
      b.block(1.2, 0, 0, T / 2, 40, T);
      b.block(-1.2, 4.6, 0, 1.2, 40, T);
      churchInside(b, 0, C.w, C.d, C.h);
      if (C.pts.name) signAt([C.pts.name[0], C.pts.name[1] - GY, C.pts.name[2], C.pts.name[3], C.pts.name[4], C.pts.name[5], C.pts.name[6]] as AnchorPt, { k: 'label', text: '川湊天主堂', sub: 'Kawaminato Cathedral · 1879', fg: '#e8d9b0', bg: '#2a2622' });
      if (C.pts.clock) signAt([C.pts.clock[0], C.pts.clock[1] - GY, C.pts.clock[2], C.pts.clock[3], C.pts.clock[4], C.pts.clock[5], C.pts.clock[6]] as AnchorPt, { k: 'clock' } as SignContent);
    });
    // The forecourt: granite from the church to the rail over the harbour.
    deco(STONE_L, CH.x, y + GY + 0.01, CH.z - 10, XE, y + GY + 0.022, CH.z + 10);
    for (const dz of [-8, 8]) tree('cherry', CH.x + 3.5, y, CH.z + dz);
    bench(CH.x + 4.5, y, CH.z - 4, [1, 0]);
    bench(CH.x + 4.5, y, CH.z + 4, [1, 0]);
    placed.push([CH.x - C.d - 1, CH.z - C.w / 2 - 1, CH.x, CH.z + C.w / 2 + 1]);
    zone(CH.x - C.d, CH.z - 10, XE, CH.z + 10, y, '川湊天主堂', 'Kawaminato Cathedral');
    // A walk from the top of Tenshudō-zaka to the forecourt, along the church's south side.
    deco(STONE_L, TENSHU[1], y + GY + 0.01, -420, CH.x, y + GY + 0.022, -416);
  }
  // Where nothing else stands: on every terrace, two-storey houses of the stock (no flats: the hill stays low, as
  // Kitano's does, so the western houses and the church show), each in its garden behind a hedge, gaps of lawn and
  // trees between them. East of x 420 on the two upper terraces only gardens: the view of the church from the avenue.
  const free = (x0: number, z0: number, x1: number, z1: number) => !placed.some(([a, c, e, d]) => a < x1 && e > x0 && c < z1 && d > z0);
  const LOW = BUILDING_MODELS.filter((m) => (m.kind === 'machi' || m.kind === 'shophouse') && m.h <= 10.6 && !m.corner);
  /** In a row's own frame (front line z 0, facing −z, lots x 0 … len): houses with gardens between. */
  const lowRow = (len: number, depth: number) => {
    let x = 1 + r() * 2, last = '';
    while (x < len - 5) {
      const ok = LOW.filter((m) => m.w <= len - x - 0.5 && m.d <= depth - 1.5 && `${m.kind}${m.id}` !== last);
      if (!ok.length) break;
      const m = ok[Math.floor(r() * ok.length)], z0 = 1.6;
      last = `${m.kind}${m.id}`;
      b.model(m.kind, m.id, x + m.w / 2, GY, z0, Math.floor(r() * 1000) + 1000);
      b.block(x, GY, z0, x + m.w, GY + m.h, z0 + m.d);
      // Its hedge along the lane, and a garden gap with a tree after it.
      b.deco('flat:#3f5a3a', x - 0.6, GY, 0.2, x + m.w + 0.6, GY + 0.9, 0.7);
      b.block(x - 0.6, GY, 0.2, x + m.w + 0.6, GY + 0.9, 0.7);
      const gap = 3 + r() * 5;
      if (gap > 4.5 && x + m.w + gap / 2 < len - 1) {
        const tx = x + m.w + gap / 2;
        modelTree(b, r() < 0.5 ? 'momiji' : 'camphor', tx, depth / 2, 'b', GY, true);
        b.block(tx - 0.4, GY, depth / 2 - 0.4, tx + 0.4, GY + 4, depth / 2 + 0.4);
      }
      b.deco('grass', x + m.w + 0.2, GY + 0.012, 0.8, Math.min(len, x + m.w + gap - 0.2), GY + 0.03, depth - 0.5);
      x += m.w + gap;
    }
  };
  const stock = (x0: number, x1: number, zf: number, face: 'n' | 's', y: number, depth: number) => {
    // Lots of the stock models in a row facing the lane (n: front at zf, back to zf + depth; s: front at zf, back to zf − depth).
    let a = x0;
    for (let x = x0; x <= x1; x += 1) {
      const z0 = face === 'n' ? zf : zf - depth, z1 = face === 'n' ? zf + depth : zf;
      const ok = x < x1 && free(x, z0, x + 1, z1) && ![ZAKA, TENSHU].some(([p, q]) => x + 1 > p - 0.5 && x < q + 0.5);
      if (!ok) {
        if (x - a >= 9) b.with({ ...FRAME[face], t: [face === 'n' ? fx(a) : fx(x), y, fz(zf)] }, () => lowRow(x - a, depth));
        a = x + 1;
      }
    }
  };
  TERRACES.slice(0, 3).forEach((T, t) => {
    const L = LANES[t].z;
    const xe = t > 0 ? 420 : XE - 1;
    stock(XW + 1, xe, L[1] + 3, 'n', T.y, T.z1 - L[1] - 4.5);
    stock(XW + 1, xe, L[0] - 3, 's', T.y, L[0] - T.z0 - 4.5);
    // (East of 420 on T2 and T3: lawn and low azaleas.)
    if (t > 0) for (const [z0, z1] of [[L[1] + 1, T.z1 - 1.5], [T.z0 + 1, L[0] - 1]]) {
      deco('grass', 421, T.y + GY + 0.012, z0, XE - 1, T.y + GY + 0.03, z1);
      for (let x = 424; x < XE - 3; x += 6) for (const z of [z0 + 2, z1 - 2]) {
        deco('flat:#4a6a40', x - 0.8, T.y + GY, z - 0.6, x + 0.8, T.y + GY + 0.7, z + 0.6);
        block(x - 0.8, T.y + GY, z - 0.6, x + 0.8, T.y + GY + 0.7, z + 0.6);
      }
    }
  });
  // Trees on every terrace's lane, and planters.
  for (const L of LANES) {
    const y = TERRACES[L.t].y;
    for (let x = XW + 6; x < XE - 6; x += 18) {
      if ([ZAKA, TENSHU].some(([p, q]) => x > p - 4 && x < q + 4)) continue;
      if (free(x - 1, L.z[1] + 0.6, x + 1, L.z[1] + 2.4)) tree(x % 36 < 18 ? 'momiji' : 'camphor', x, y, L.z[1] + 1.5);
    }
  }

  // ═════════════════════════ The summit: 鴎ヶ丘公園, the lookout park ═════════════════════════
  {
    const y = TERRACES[3].y, P0 = -455;
    deco('grass', XW + 2, y + GY + 0.012, ZN + 6, XE - 2, y + GY + 0.03, P0 - 2);
    // The lookout: a granite terrace along the cliff rail, benches facing the river mouth, a telescope.
    deco(STONE_L, XW, y + GY + 0.012, ZN + 0.5, XE, y + GY + 0.035, ZN + 6);
    for (let x = XW + 12; x < XE - 8; x += 20) if (offWays(x, 2)) bench(x, y, ZN + 3.2, [0, -1]);
    for (let x = XW + 22; x < XE - 8; x += 40) if (offWays(x, 2)) lamp(x, y, ZN + 5.5, [0, 1]);
    // Walks: one along the park, one up the middle from the two ways.
    deco(STONE_L, XW + 2, y + GY + 0.012, -481, KITA.x - 1, y + GY + 0.035, -477);
    // The gazebo, flower beds round it, cherries and black pines.
    const G = KAMOME.gazebo, gx = 320, gz = -462;
    at('n', gx, y + GY, gz - G.d / 2, () => { b.model('kamome', 'gazebo', 0, 0, 0); b.block(-3.2, 0, 0.3, 3.2, 0.3, G.d - 0.3); });
    for (let k = 0; k < 8; k++) {
      const a = (2 * Math.PI * (k + 0.5)) / 8;
      block(gx + Math.cos(a) * 3.1 - 0.15, y + GY, gz + Math.sin(a) * 3.1 - 0.15, gx + Math.cos(a) * 3.1 + 0.15, y + GY + 3, gz + Math.sin(a) * 3.1 + 0.15);
    }
    for (const [dx, dz, c] of [[-9, 0, '#c8402a'], [9, 0, '#e3b12a'], [-15, 0, '#7a4fa0'], [15, 0, '#d65a8a']] as [number, number, string][]) {
      deco(`flat:${c}`, gx + dx - 2, y + GY + 0.03, gz + dz - 1.5, gx + dx + 2, y + GY + 0.25, gz + dz + 1.5);
      deco(STONE_L, gx + dx - 2.15, y + GY, gz + dz - 1.65, gx + dx + 2.15, y + GY + 0.2, gz + dz + 1.65);
    }
    for (let x = XW + 8; x < XE - 6; x += 14) {
      if (Math.abs(x - gx) < 20 || x > KITA.x - 4 || !offWays(x)) continue;
      tree(x % 28 < 14 ? 'cherry' : 'pine', x, y, -462);
    }
    for (let x = XW + 15; x < CH.x - 40; x += 26) if (offWays(x)) tree('camphor', x, y, -440);
    // Along the long walk: cherries both sides and azalea beds between them, benches facing the walk.
    for (let x = XW + 6; x < KITA.x - 3; x += 9) {
      if ([ZAKA, TENSHU].some(([a, e]) => x + 7.8 > a - 1 && x - 0.4 < e + 1) || Math.abs(x - gx) < 22 || Math.abs(x - 272) < 9) continue;
      for (const z of [-483.5, -474.5]) tree('cherry', x, y, z);
      for (const [z0, z1] of [[-485, -483.9], [-474.1, -473]] as [number, number][]) {
        deco('flat:#4a6a40', x + 1.2, y + GY, z0, x + 7.8, y + GY + 0.5, z1);
        for (let fx1 = x + 1.6; fx1 < x + 7.6; fx1 += 0.9) deco(Math.round(fx1 * 3) % 2 ? 'flat:#d46a92' : 'flat:#f2f0ec', fx1 - 0.3, y + GY + 0.5, z0 + 0.15, fx1 + 0.3, y + GY + 0.62, z1 - 0.15);
        block(x + 1.2, y + GY, z0, x + 7.8, y + GY + 0.6, z1);
      }
      if (Math.round(x) % 2) bench(x + 4.5, y, -482.2, [0, 1]);
    }
    // A fountain on the walk west of the gazebo: a round stone basin (eight-sided), a jet in the middle.
    {
      const fx0 = 272, fz0 = -479, R = 4;
      for (let k = 0; k < 8; k++) {
        const a = (2 * Math.PI * k) / 8, a2 = (2 * Math.PI * (k + 1)) / 8;
        const cx = fx0 + Math.cos((a + a2) / 2) * (R - 0.3), cz = fz0 + Math.sin((a + a2) / 2) * (R - 0.3);
        deco(STONE_L, cx - 1.6, y + GY, cz - 1.6, cx + 1.6, y + GY + 0.55, cz + 1.6);
      }
      deco('water', fx0 - R + 0.9, y + GY + 0.3, fz0 - R + 0.9, fx0 + R - 0.9, y + GY + 0.45, fz0 + R - 0.9);
      deco(STONE_L, fx0 - 0.5, y + GY, fz0 - 0.5, fx0 + 0.5, y + GY + 1.4, fz0 + 0.5);
      deco('flat:#cfe4ee', fx0 - 0.12, y + GY + 1.4, fz0 - 0.12, fx0 + 0.12, y + GY + 2.6, fz0 + 0.12);
      block(fx0 - R, y + GY, fz0 - R, fx0 + R, y + GY + 0.6, fz0 + R);
    }
    // Two coin telescopes at the rail, looking out over the river mouth.
    for (const tx of [300, 345]) {
      deco(IRONC, tx - 0.1, y + GY, ZN + 1.2, tx + 0.1, y + GY + 1.2, ZN + 1.4);
      deco('flat:#2f6b4f', tx - 0.18, y + GY + 1.15, ZN + 0.9, tx + 0.18, y + GY + 1.5, ZN + 1.7);
      block(tx - 0.3, y + GY, ZN + 0.9, tx + 0.3, y + GY + 1.5, ZN + 1.7);
    }
    zone(XW, ZN, XE, P0, y, '鴎ヶ丘公園', 'Kamome-ga-oka Park');
    b.sign({ k: 'label', text: '鴎ヶ丘公園', sub: 'Kamome-ga-oka Park · lookout 15 m', fg: '#ffffff', bg: '#2f4a2c' }, fx(TENSHU[0] - 0.3), y + GY + 1.6, fz(-452), [-1, 0], 1.3, 0.45);
  }
  return b.out;
}
