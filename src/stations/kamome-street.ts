// 鴎ヶ丘 Kamome-ga-oka, the foreign quarter (2026-11-24, stage 3 of the north districts; after Kobe's Kitano and
// Nagasaki's Minami-Yamate, the names invented). Flat since 2026-11-26 (the owner: the bluff looked awkward): the
// same quarter at street level, north of Hokushin-dōri to the river mouth. Two car-free ways run north through it:
// 鴎小路 Kamome-kōji (Hobashira-suji carried on) and 天主堂筋 Tenshudō-suji (Sanbashi-suji carried on); 浜見小路
// Hamami-kōji and the park's north gate open east onto Kita-Hatoba. On the three cross lanes the merchants' houses
// (異人館), the old consulate and the Harrington House museum; at the north end the church 川湊天主堂 (on the line of
// Hokage-ōdōri's promenade) and the riverside park 鴎ヶ丘公園; the mission school 鴎ヶ丘女学院 by the south lane.
// No traffic.
//
// Frame: world (320, −378.5), yaw 0. Plot ±145 × ±113.5: world x 175 … 465, z −492 … −265. Written in world x, z.
//
//   z −272 … −265  Hokushin-dōri's north pavement carried on
//   B1 z −320 … −272: 港見通 Minatomi-dōri z −304 … −298 (on Kita-Hatoba's Tōdai-dōri's line)
//   B2 z −366 … −320: 異人館通 Ijinkan-dōri z −345 … −339
//   B3 z −414 … −366: 鐘楼通 Shōrō-dōri z −393 … −387
//   B4 z −492 … −414: the church (x 422 … 465), the riverside park (z −492 … −455)
//   x 238 … 252 鴎小路, x 389 … 401 天主堂筋
//
// Models: tools/blender/build_kamome.py.

import { Builder, rng, type Build } from '../world/builder';
import type { SignContent } from '../signs/content';
import type { AnchorPt } from './anchors/types';
import { KAMOME } from './anchors/kamome';
import { GROUND_Y as GY } from './kit';
import { roadModel, streetLamp } from './roads';
import { place } from './places';
import { churchInside, harringtonInside } from './interiors';
import { modelTree, type TreeKind } from './trees';

export const KAMOME_FRAME = { x: 320, z: -378.5 };
const O = KAMOME_FRAME;
export const KAMOME_PLOT = { x: 145, z: 113.5 };
export const KAMOME_NAME = { ja: '鴎ヶ丘', en: 'Kamome-ga-oka' };

const XW = 175, XE = 465, ZS = -265, ZN = -492;
/** The four bands of the quarter, south to north: z range (z0 north, z1 south); all at street level (y 0). */
const TERRACES = [
  { z0: -320, z1: -272, y: 0 },
  { z0: -366, z1: -320, y: 0 },
  { z0: -414, z1: -366, y: 0 },
  { z0: ZN, z1: -414, y: 0 },
];
/** The lanes across the terraces (z0, z1) and names. */
const LANES = [
  { z: [-304, -298] as [number, number], ja: '港見通', en: 'Minatomi-dōri', t: 0 },
  { z: [-345, -339] as [number, number], ja: '異人館通', en: 'Ijinkan-dōri', t: 1 },
  { z: [-393, -387] as [number, number], ja: '鐘楼通', en: 'Shōrō-dōri', t: 2 },
];
/** The two ways straight up (x ranges). */
const ZAKA: [number, number] = [238, 252], TENSHU: [number, number] = [389, 401];
/** The two ways in from Kita-Hatoba on the east (z ranges). */
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
  /** Not in either way up (x). */
  const offWays = (x: number, m = 1.5) => ![ZAKA, TENSHU].some(([a, e]) => x > a - m && x < e + m);

  // ═════════════════════════ Ground: the foot, the terraces, their walls ═════════════════════════
  b.slab('asphalt', fx(XW), fz(-272), fx(XE), fz(ZS), -0.6, 0, []);
  b.slab(PAVE, fx(XW), fz(-272), fx(XE), fz(ZS), 0, GY, []);
  zone(XW, -272, XE, ZS, 0, KAMOME_NAME.ja, KAMOME_NAME.en);
  const cuts = (t: number): number[][] => {
    const out: number[][] = [];
    for (const [x0, x1] of [ZAKA, TENSHU]) out.push([fx(x0), fz(TERRACES[t].z0) - 1, fx(x1), fz(TERRACES[t].z1) + 1]);
    return out;
  };
  TERRACES.forEach((T, t) => {
    const top = T.y + GY, y0 = t === 3 ? -2.5 : -0.6;
    // The terrace: a solid block of stone faced with 石垣 (what shows of it is the walls), paved on top.
    b.slab(STONE, fx(XW), fz(T.z0), fx(XE), fz(T.z1), y0, top, cuts(t));
    b.slab(PAVE, fx(XW), fz(T.z0), fx(XE), fz(T.z1), top, top + 0.01, cuts(t), false);
    zone(XW, T.z0, XE, T.z1, T.y, KAMOME_NAME.ja, KAMOME_NAME.en);
    // Its east edge: an iron railing on a stone kerb towards Kita-Hatoba, open at the two ways in.
    const gap = t === 0 ? TODAI.z : t === 3 ? KITA.z : null;
    for (const [z0, z1] of (gap ? [[T.z0, gap[0]], [gap[1], T.z1]] : [[T.z0, T.z1]]) as [number, number][]) {
      deco(STONE_L, XE - 0.5, top - 0.25, z0, XE, top + 0.08, z1);
      block(XE - 0.4, top, z0, XE - 0.2, top + 1.3, z1);
      for (let z = z0 + 0.5; z < z1; z += 1.8) deco(IRONC, XE - 0.32, top, z - 0.03, XE - 0.26, top + 1.0, z + 0.03);
      deco(IRONC, XE - 0.32, top + 1.0, z0, XE - 0.26, top + 1.06, z1);
    }
  });
  // The north edge over the river mouth: a railing on the quay wall; the west edge (not walked) a wall.
  deco(STONE_L, XW, GY - 0.25, ZN, XE, GY + 0.08, ZN + 0.5);
  deco(IRONC, XW, GY + 1.0, ZN + 0.26, XE, GY + 1.06, ZN + 0.32);
  for (let x = XW + 0.5; x < XE; x += 1.8) deco(IRONC, x - 0.03, GY, ZN + 0.26, x + 0.03, GY + 1.0, ZN + 0.32);
  block(XW, GY, ZN + 0.2, XE, GY + 1.3, ZN + 0.4);
  // (The wall's face 0.4 m proud of the landfill's edge, so the shore's embankment at z −492 is hidden in it.)
  box(STONE, XW, -2.5, ZN - 0.4, XE, GY, ZN);
  block(XW - 1, -1, ZN, XW, 60, ZS);
  block(XW, -1, ZN - 1, XE, 60, ZN);

  // ═════════════════════════ The two ways north ═════════════════════════
  for (const [[x0, x1], stone, ja, en] of [[ZAKA, false, '鴎小路', 'Kamome-kōji'], [TENSHU, true, '天主堂筋', 'Tenshudō-suji']] as [[number, number], boolean, string, string][]) {
    box(STONE, x0, -0.6, ZN, x1, GY, -272);
    deco(stone ? STONE_L : PAVE, x0, GY, ZN, x1, GY + 0.012, -272);
    // (Kamome-kōji: setts down the middle.)
    if (!stone) deco(SETT, (x0 + x1) / 2 - 1.5, GY + 0.012, -414, (x0 + x1) / 2 + 1.5, GY + 0.02, -272);
    for (let z = -272; z > -414; z -= 8) zone(x0, z, x1, z - 8, 0, ja, en);
    for (let z = -278; z > -410; z -= 16) {
      if (LANES.some((l) => z > l.z[0] - 3 && z < l.z[1] + 3)) continue;
      lamp(x0 + 0.7, 0, z, [1, 0]);
    }
  }
  // Name posts at the south end of each.
  for (const [x, ja, en] of [[ZAKA[0] + 1, '鴎小路', 'Kamome-kōji · to Kamome-ga-oka'], [TENSHU[0] + 1, '天主堂筋', 'Tenshudō-suji · to the church']] as [number, string, string][]) {
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

  // ═════════════════════════ The two ways in from Kita-Hatoba ═════════════════════════
  deco(STONE_L, KITA.x, GY + 0.012, KITA.z[0], XE, GY + 0.035, KITA.z[1]);
  b.zone('street', fx(TODAI.x), -0.5, fz(TODAI.z[0]), fx(XE), 8, fz(TODAI.z[1]), '浜見小路', 'Hamami-kōji', true);
  b.sign({ k: 'label', text: '浜見小路', sub: 'Hamami-kōji · to Kamome-ga-oka', fg: '#f2ecd8', bg: '#2a2622' }, fx(XE + 0.05), GY + 2.2, fz(TODAI.z[1] + 0.8), [1, 0], 1.2, 0.45);
  b.sign({ k: 'label', text: '鴎ヶ丘公園', sub: 'Kamome-ga-oka Park', fg: '#ffffff', bg: '#2f4a2c' }, fx(XE + 0.05), GY + 2.2, fz(KITA.z[1] + 0.8), [1, 0], 1.2, 0.45);

  // ═════════════════════════ Buildings ═════════════════════════
  /** A house: its front middle at (x, zf), facing `face`; a front garden to the lane behind a picket fence. */
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
  // The church at the north end, its front to the east towards the harbour (on Hokage-ōdōri's line), a forecourt before it.
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
    // A walk from Tenshudō-suji to the forecourt, along the church's south side.
    deco(STONE_L, TENSHU[1], y + GY + 0.01, -420, CH.x, y + GY + 0.022, -416);
  }
  // Where nothing else stands: the quarter's own houses (build_kamome.py, 2026-11-26: cottages, a half-timbered
  // house, the brick manse, a bungalow, two more merchants' houses), each in a garden behind a hedge with a gate, a
  // path to the door and a flower bed; trees in the gaps. Rows face each lane from both sides, as deep as half
  // the way to the next lane. East of x 420 on the two northern lanes only lawn: the view of the church.
  const free = (x0: number, z0: number, x1: number, z1: number) => !placed.some(([a, c, e, d]) => a < x1 && e > x0 && c < z1 && d > z0);
  /** The houses rows are made of, and how far each one's porch or veranda stands out before its front. */
  const HOUSES: [string, number][] = [['cot_a', 1.9], ['ijin_e', 2.5], ['timber', 0.5], ['bungalow', 0.7], ['ijin_f', 2.5], ['manse', 1.7], ['cot_b', 1.9], ['ijin_d', 1.1], ['ijin_b', 2.5]];
  const BEDS = ['flat:#c8402a', '#e3b12a', '#7a4fa0', '#d65a8a', '#f2f0ec'].map((c) => (c.startsWith('flat') ? c : `flat:${c}`));
  let hn = 0;
  /** In a row's own frame (the lane's edge at z 0, lots x 0 … len, running back to `depth`): houses in gardens. */
  const houseRow = (len: number, depth: number) => {
    let x = 1.5 + r() * 2;
    while (x < len - 9) {
      const pick = HOUSES.map((h, k) => HOUSES[(hn + k) % HOUSES.length]).find(([id]) => KAMOME[id].w <= len - x - 1 && KAMOME[id].d + 5.5 <= depth);
      if (!pick) break;
      hn++;
      const [id, proj] = pick, A = KAMOME[id], set = 4.6 + (hn % 3) * 0.5, xc = x + A.w / 2;
      b.model('kamome', id, xc, GY, set, 0);
      b.block(x + 0.2, GY, set - proj, x + A.w - 0.2, GY + A.h, set + A.d - 0.2);
      // The hedge along the lane, open at the gate; white gate posts; the path; a bed either side of it.
      for (const [a, e] of [[x - 0.8, xc - 0.9], [xc + 0.9, x + A.w + 0.8]]) {
        b.deco('flat:#3f5a3a', a, GY, 0.5, e, GY + 0.95, 1.05);
        b.block(a, GY, 0.5, e, GY + 0.95, 1.05);
      }
      for (const sx of [-1, 1]) b.deco(WHITE, xc + sx * 0.9 - 0.12, GY, 0.55, xc + sx * 0.9 + 0.12, GY + 1.25, 1.0);
      b.deco(STONE_L, xc - 0.7, GY + 0.018, 0, xc + 0.7, GY + 0.03, set - proj);
      for (const sx of [-1, 1]) {
        const bx = xc + sx * (A.w / 4 + 0.6), col = BEDS[(hn + (sx > 0 ? 2 : 0)) % BEDS.length];
        b.deco('flat:#4a6a40', bx - 1.5, GY + 0.018, 1.6, bx + 1.5, GY + 0.22, 2.6);
        b.deco(col, bx - 1.3, GY + 0.22, 1.75, bx + 1.3, GY + 0.34, 2.45);
      }
      // The gap to the next house: a tree, and a bench under it now and then.
      const gap = 3.5 + r() * 3.5;
      const tx = x + A.w + gap / 2;
      if (tx < len - 1.5) {
        const tz = set + 3 + r() * 3;
        modelTree(b, hn % 3 === 0 ? 'momiji' : hn % 3 === 1 ? 'camphor' : 'cherry', tx, tz, 'b', GY, true);
        b.block(tx - 0.4, GY, tz - 0.4, tx + 0.4, GY + 4, tz + 0.4);
      }
      x += A.w + gap;
    }
  };
  const stock = (x0: number, x1: number, zf: number, face: 'n' | 's', depth: number) => {
    // Runs of free lane front (n: the row runs back to zf + depth; s: back to zf − depth), each handed to houseRow.
    let a = x0;
    for (let x = x0; x <= x1; x += 1) {
      const z0 = face === 'n' ? zf : zf - depth, z1 = face === 'n' ? zf + depth : zf;
      const ok = x < x1 && free(x, z0, x + 1, z1) && ![ZAKA, TENSHU].some(([p, q]) => x + 1 > p - 1.5 && x < q + 1.5);
      if (!ok) {
        if (x - a >= 12) b.with({ ...FRAME[face], t: [face === 'n' ? fx(a) : fx(x), 0, fz(zf)] }, () => houseRow(x - a, depth));
        a = x + 1;
      }
    }
  };
  // The lawn: everything between the lanes and the two ways is grass (the lanes, the ways and Hokushin-dōri's
  // pavement stay paved).
  {
    const zs: [number, number][] = [[-455, LANES[2].z[0] - 0.3], [LANES[2].z[1] + 0.3, LANES[1].z[0] - 0.3], [LANES[1].z[1] + 0.3, LANES[0].z[0] - 0.3], [LANES[0].z[1] + 0.3, -272.5]];
    const xs: [number, number][] = [[XW + 0.5, ZAKA[0] - 0.3], [ZAKA[1] + 0.3, TENSHU[0] - 0.3], [TENSHU[1] + 0.3, XE - 0.6]];
    for (const [z0, z1] of zs) for (const [x0, x1] of xs) deco('grass', x0, GY + 0.011, z0, x1, GY + 0.017, z1);
  }
  LANES.forEach((L, t) => {
    const xe = t > 0 ? 420 : XE - 1;
    const south = t === 0 ? -276 : (LANES[t - 1].z[0] + L.z[1]) / 2 - 0.5;
    const north = t === 2 ? -414 : (LANES[t + 1].z[1] + L.z[0]) / 2 + 0.5;
    stock(XW + 1, xe, L.z[1], 'n', south - L.z[1]);
    stock(XW + 1, xe, L.z[0], 's', L.z[0] - north);
    const T = TERRACES[t];
    // (East of 420 on the two northern lanes: lawn and low azaleas.)
    if (t > 0) for (const [z0, z1] of [[L.z[1] + 1, T.z1 - 1.5], [T.z0 + 1, L.z[0] - 1]]) {
      for (let x = 424; x < XE - 3; x += 6) for (const z of [z0 + 2, z1 - 2]) {
        deco('flat:#4a6a40', x - 0.8, GY, z - 0.6, x + 0.8, GY + 0.7, z + 0.6);
        block(x - 0.8, GY, z - 0.6, x + 0.8, GY + 0.7, z + 0.6);
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

  // ═════════════════════════ The north end: 鴎ヶ丘公園, the riverside park ═════════════════════════
  {
    const y = TERRACES[3].y, P0 = -455;
    deco('grass', XW + 2, y + GY + 0.012, ZN + 6, XE - 2, y + GY + 0.03, P0 - 2);
    // The lookout: a granite walk along the river rail, benches facing the river mouth, a telescope.
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
    b.sign({ k: 'label', text: '鴎ヶ丘公園', sub: 'Kamome-ga-oka Park · river mouth', fg: '#ffffff', bg: '#2f4a2c' }, fx(TENSHU[0] - 0.3), y + GY + 1.6, fz(-452), [-1, 0], 1.3, 0.45);
  }

  // ═════════════════════════ The park's middle (z −455 … −414): pond, bandstand, tennis court, playground ═════════════════════════
  {
    const WATER = 'water', RIM = STONE_L;
    // The pond between the two ways: two lobes and a neck, a stone rim; the footbridge over the neck.
    const lobes: [number, number, number, number][] = [[270, -447, 296, -423], [296, -438, 304, -430], [304, -445, 331, -425]];
    for (const [x0, z0, x1, z1] of lobes) deco(RIM, x0 - 0.45, GY + 0.017, z0 - 0.45, x1 + 0.45, GY + 0.2, z1 + 0.45);
    for (const [x0, z0, x1, z1] of lobes) deco(WATER, x0, GY + 0.2, z0, x1, GY + 0.24, z1);
    // (Cut corners: stone and planting over the lobes' corners so the pond reads rounded.)
    for (const [x0, z0, x1, z1] of [lobes[0], lobes[2]]) for (const [cx, cz] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) {
      if (Math.abs(cx - 300) < 5) continue;
      deco('flat:#4f7a48', cx - 2.2, GY + 0.2, cz - 2.2, cx + 2.2, GY + 0.75, cz + 2.2);
      block(cx - 2.2, GY, cz - 2.2, cx + 2.2, GY + 0.8, cz + 2.2);
    }
    for (const [x0, z0, x1, z1] of [lobes[0], lobes[2]]) block(x0 - 0.45, GY, z0 - 0.45, x1 + 0.45, GY + 0.5, z1 + 0.45);
    for (const [xa, xb] of [[296, 298.4], [301.6, 304]]) block(xa, GY, -438.45, xb, GY + 0.5, -429.55);
    for (const [px, pz] of [[280, -431], [287, -440], [316, -437], [322, -430]]) deco('flat:#5f8f4a', px - 0.7, GY + 0.24, pz - 0.6, px + 0.7, GY + 0.27, pz + 0.6);
    at('n', 300, GY, -439, () => {
      const B = KAMOME.bridge;
      b.model('kamome', 'bridge', 0, 0, 0, 0);
      b.ramp(-1.4, 0, 1.4, B.d / 2, 0.05, 0.9, [0, 1]);
      b.ramp(-1.4, B.d / 2, 1.4, B.d, 0.05, 0.9, [0, -1]);
      for (const sx of [-1, 1]) b.block(sx * 1.5 - 0.1, 0, 0, sx * 1.5 + 0.1, 2.0, B.d);
    });
    zone(268, -449, 333, -421, 0, '鴎ヶ池', 'Kamome Pond');
    for (const [bx, bz, f] of [[283, -420.5, [0, -1]], [317, -422.5, [0, -1]], [283, -449.5, [0, 1]], [317, -447.5, [0, 1]]] as [number, number, [number, number]][]) bench(bx, 0, bz, f);
    // The bandstand east of the pond, a ring of gravel round it and benches facing it.
    const BS = KAMOME.bandstand, bx = 360, bz = -434;
    deco(STONE_L, bx - 8, GY + 0.017, bz - 8, bx + 8, GY + 0.028, bz + 8);
    at('n', bx, GY, bz - BS.d / 2, () => {
      b.model('kamome', 'bandstand', 0, 0, 0, 0);
      b.block(-BS.w / 2 + 0.6, 0, 0.6, BS.w / 2 - 0.6, 0.9, BS.d - 0.6);
    });
    for (const [dx, dz, f] of [[-6.8, 0, [-1, 0]], [6.8, 0, [1, 0]], [0, 6.8, [0, 1]], [-4.9, -4.9, [0, -1]], [4.9, -4.9, [0, -1]]] as [number, number, [number, number]][]) bench(bx + dx, 0, bz + dz, f);
    b.sign({ k: 'label', text: '音楽堂', sub: 'Bandstand · 1911', fg: '#f2ecd8', bg: '#2f4a3a' }, fx(bx - 5.4), GY + 1.2, fz(bz - 7.6), [0, 1], 0.9, 0.4);
    lamp(bx - 7.5, 0, bz + 7.5, [1, 0]);
    lamp(bx + 7.5, 0, bz - 7.5, [-1, 0]);

    // West of Kamome-kōji: the lawn tennis court (the settlement's club, 1898) in its wire fence, the clubhouse
    // cottage beside it, and the children's playground.
    const C = { x0: 181, x1: 213, z0: -453, z1: -437 };
    deco('flat:#6f9a5a', C.x0, GY + 0.017, C.z0, C.x1, GY + 0.026, C.z1);
    const cx0 = C.x0 + 4.1, cx1 = C.x1 - 4.1, cz0 = C.z0 + 2.5, cz1 = C.z1 - 2.5, cm = (C.x0 + C.x1) / 2;
    deco('flat:#4f8a4a', cx0, GY + 0.026, cz0, cx1, GY + 0.03, cz1);
    const line = (x0: number, z0: number, x1: number, z1: number) => deco(WHITE, x0, GY + 0.03, z0, x1, GY + 0.034, z1);
    for (const z of [cz0, cz0 + 1.37, cz1 - 1.37, cz1]) line(cx0, z - 0.03, cx1, z + 0.03);
    for (const x of [cx0, cx1, cm - 6.4, cm + 6.4]) line(x - 0.03, x === cx0 || x === cx1 ? cz0 : cz0 + 1.37, x + 0.03, x === cx0 || x === cx1 ? cz1 : cz1 - 1.37);
    line(cm - 6.4, (cz0 + cz1) / 2 - 0.03, cm + 6.4, (cz0 + cz1) / 2 + 0.03);
    deco('flat:#e9e9e4', cm - 0.02, GY + 0.95, cz0 - 0.6, cm + 0.02, GY + 1.02, cz1 + 0.6);
    deco('flat:#2a2d30', cm - 0.015, GY + 0.1, cz0 - 0.6, cm + 0.015, GY + 0.95, cz1 + 0.6);
    for (const z of [cz0 - 0.6, cz1 + 0.6]) deco(IRONC, cm - 0.05, GY, z - 0.05, cm + 0.05, GY + 1.07, z + 0.05);
    block(cm - 0.1, GY, cz0 - 0.6, cm + 0.1, GY + 1.0, cz1 + 0.6);
    // The fence: posts and wire 3 m high, a gate on the east side.
    const post = (x: number, z: number) => deco('flat:#3f5a4a', x - 0.04, GY, z - 0.04, x + 0.04, GY + 3, z + 0.04);
    for (let x = C.x0; x <= C.x1 + 0.01; x += 3.2) for (const z of [C.z0, C.z1]) post(x, z);
    for (let z = C.z0; z <= C.z1 + 0.01; z += 3.2) for (const x of [C.x0, C.x1]) post(x, z);
    for (const y of [0.05, 1.0, 2.0, 2.95]) {
      for (const z of [C.z0, C.z1]) deco('flat:#3f5a4a', C.x0, GY + y, z - 0.015, C.x1, GY + y + 0.03, z + 0.015);
      deco('flat:#3f5a4a', C.x0 - 0.015, GY + y, C.z0, C.x0 + 0.015, GY + y + 0.03, C.z1);
      for (const [z0, z1] of [[C.z0, -446.2], [-443.8, C.z1]]) deco('flat:#3f5a4a', C.x1 - 0.015, GY + y, z0, C.x1 + 0.015, GY + y + 0.03, z1);
    }
    block(C.x0, GY, C.z0 - 0.1, C.x1, GY + 3, C.z0 + 0.1);
    block(C.x0, GY, C.z1 - 0.1, C.x1, GY + 3, C.z1 + 0.1);
    block(C.x0 - 0.1, GY, C.z0, C.x0 + 0.1, GY + 3, C.z1);
    block(C.x1 - 0.1, GY, C.z0, C.x1 + 0.1, GY + 3, -446.2);
    block(C.x1 - 0.1, GY, -443.8, C.x1 + 0.1, GY + 3, C.z1);
    zone(C.x0, C.z0, C.x1, C.z1, 0, '鴎ヶ丘ローンテニス倶楽部', 'Kamome-ga-oka Lawn Tennis Club');
    b.sign({ k: 'label', text: '鴎ヶ丘ローンテニス倶楽部', sub: 'Lawn Tennis Club · 1898', fg: '#f2ecd8', bg: '#2f4a3a' }, fx(C.x1 + 0.12), GY + 1.6, fz(-441.5), [1, 0], 1.6, 0.4);
    // The clubhouse: the blue cottage, its door to the court's gate.
    {
      const A = KAMOME.cot_b;
      at('w', 216.6, GY, -445, () => {
        b.model('kamome', 'cot_b', 0, 0, 0, 0);
        b.block(-A.w / 2 + 0.2, 0, -1.9, A.w / 2 - 0.2, A.h, A.d - 0.2);
      });
      placed.push([216, -450, 226, -440]);
    }
    // The playground south of it, fenced, its gate on the lawn path.
    at('s', 222, 0, -418, () => place(b, { kind: 'park', ja: '鴎ヶ丘こども広場', en: 'Kamome-ga-oka Playground' }));
    // A gravel path from Kamome-kōji past the playground and the court, and one from the pond to the bandstand.
    deco(STONE_L, 214, GY + 0.017, -436, ZAKA[0], GY + 0.028, -434);
    deco(STONE_L, 213.2, GY + 0.017, -446, 216.6, GY + 0.028, -444);
    deco(STONE_L, 331.5, GY + 0.017, -435.5, bx - 8, GY + 0.028, -433.5);
    deco(STONE_L, ZAKA[1], GY + 0.017, -421, 270, GY + 0.028, -419);
    deco(STONE_L, 300 - 1.2, GY + 0.017, -429, 300 + 1.2, GY + 0.028, -414);
    deco(STONE_L, 300 - 1.2, GY + 0.017, -455, 300 + 1.2, GY + 0.028, -439);
    // Rose pergolas over the park's long walk.
    for (const px of [205, 352, 412]) at('n', px, GY, -480.5, () => {
      b.model('kamome', 'pergola', 0, 0, 0, 0);
      for (let c = -5.8; c <= 5.81; c += 2.32) for (const z of [0.15, 2.85]) b.block(c - 0.12, 0, z - 0.12, c + 0.12, 2.6, z + 0.12);
    });
  }
  return b.out;
}
