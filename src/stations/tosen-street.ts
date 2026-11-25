// 唐船町 Tōsen-machi, the Chinatown north of Kawaminato-kō (2026-11-24, the first of the north districts; after
// Kobe's Nankinmachi and Yokohama's Chūkagai, the names invented). Its own world (stations/index.ts
// DISTRICT_WORLDS), mounted by distance like a station's; its south edge is Kawaminato-kō's plot's north edge.
//
// Frame: world (320, −175), yaw 0: +x east, +z south, so Kawaminato-kō's frame is this one moved 175 to −z
// (its z −85 is this z 90). Plot ±145 × ±90.
//
//   x −78.25 … −71.75  帆柱筋 Hobashira-suji (6.5 m, no pavements) and x 69 … 81 桟橋筋 Sanbashi-suji (two
//                lanes, 4 m pavements to 65 / 85): Kawaminato-kō's cross streets carried on north
//   x −6 … 6     唐船大路 Tōsen-ōji, the car-free food street, from the south edge (where 迎港門 stands in
//                Kawaminato-kō, minato-street.ts) to the temple's forecourt at z −44
//   z −4.5 … 4.5 錦華街 Kinka-gai, car-free, from Hobashira-suji to Sanbashi-suji, a gate at each end
//   x −52 … −48 提灯小路 Chōchin-kōji, x 48 … 52 龍門小路 Ryūmon-kōji (Kawaminato-kō's lanes carried on)
//   z −47 … −44  点心横丁 Tenshin-yokochō, from Hobashira-suji to Sanbashi-suji across the forecourt
//   z −79 … −52  海安廟 Kaian-byō, the temple (x −20 … 20), its gate on the forecourt
//   z −88 … −81  北辰通 Hokushin-dōri, the north street (its south pavement to −79, north to −90)
//
// Models: tools/blender/build_tosen.py (shop houses, restaurants, the gates, the temple).

import { rng } from '../world/builder';
import { Builder, type Build } from '../world/builder';
import type { SignContent } from '../signs/content';
import type { Anchor, AnchorPt } from './anchors/types';
import { TOSEN } from './anchors/tosen';
import { GROUND_Y as GY } from './kit';
import { roadModel, streetLamp } from './roads';
import { crosswalk, fillModelLots } from './surface';
import { modelTree } from './trees';
import { hantenInside } from './interiors';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';

/** Where the district stands, and its plot. */
export const TOSEN_FRAME = { x: 320, z: -175 };
export const TOSEN_PLOT = { x: 145, z: 90 };
const X = TOSEN_PLOT.x, Z = TOSEN_PLOT.z;
/** The streets (this frame). */
export const TOSEN_ST = {
  hob: [-79.5, -70.5] as [number, number], hobPave: [-82, -68] as [number, number],
  san: [69, 81] as [number, number], sanPave: [65, 85] as [number, number],
  food: [-6, 6] as [number, number],
  kinka: [-4.5, 4.5] as [number, number],
  alleys: [[-52, -48], [48, 52]] as [number, number][],
  tenshin: [-47.5, -43.5] as [number, number],
  byo: [-20, -79, 20, -52] as Rect,
  north: [-88, -81] as [number, number], northPave: [-90, -79] as [number, number],
};
const S = TOSEN_ST;
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const STONE = 'tile:#9b9286', STONE_RED = 'tile:#8a4a3c', LANE = 'tile:#857e73', WALL = 'flat:#9a2a20', CAP = 'flat:#2f6b4f';
const SHOPS = Object.keys(TOSEN).filter((k) => k.startsWith('shop_') || k.startsWith('rest_'));
const SMALL = Object.keys(TOSEN).filter((k) => k.startsWith('shop_') && TOSEN[k].w <= 8);
const LOW = ['shophouse', 'machi', 'zakkyo'], BIZ = ['office', 'zakkyo', 'manshon'];
/** The shop houses' depth (every one's). */
const FD = TOSEN.shop_a.d;

/** Gate and street names. */
export const TOSEN_NAMES = {
  district: { ja: '唐船町', en: 'Tōsen-machi' },
  food: { ja: '唐船大路', en: 'Tōsen-ōji' },
  kinka: { ja: '錦華街', en: 'Kinka-gai' },
  alleys: [{ ja: '提灯小路', en: 'Chōchin-kōji' }, { ja: '龍門小路', en: 'Ryūmon-kōji' }],
  tenshin: { ja: '点心横丁', en: 'Tenshin-yokochō' },
  byo: { ja: '海安廟', en: 'Kaian-byō' },
  north: { ja: '北辰通', en: 'Hokushin-dōri' },
  hob: { ja: '帆柱筋', en: 'Hobashira-suji' },
  san: { ja: '桟橋筋', en: 'Sanbashi-suji' },
  gates: { south: '迎港門', west: '福海門', east: '瑞光門' },
};

export function tosenMachi(): Build {
  const b = new Builder();
  const r = rng(7741);
  b.out.plot = { ...TOSEN_PLOT };
  b.out.spawn = { pos: [0, GY, 80], yaw: Math.PI };

  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: SignContent) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  const label = (p: AnchorPt, text: string, sub: string | undefined, bg: string, fg: string) => signAt(p, { k: 'label', text, sub, fg, bg });
  const upright = (p: AnchorPt, ja: string, bg: string, fg = '#ffffff') => signAt(p, { k: 'shop', ja, bg, fg, vertical: true });

  // ═════════════════════════ Ground and edges ═════════════════════════
  const carriage: Rect[] = [
    [S.hob[0], -Z, S.hob[1], Z],
    [S.san[0], -Z, S.san[1], Z],
    [-X, S.north[0], X, S.north[1]],
  ];
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, []);
  b.slab('paver', -X, -Z, X, Z, 0, GY, carriage);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, TOSEN_NAMES.district.ja, TOSEN_NAMES.district.en, true);
  // Walls round the plot (south, Kawaminato-kō's plot goes on; only its corners past ±130 are closed).
  b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
  // (East: open where Hokushin-dōri carries on into Kita-Hatoba's world, hatoba-street.ts.)
  b.block(X, -1, S.northPave[1], X + 1, 60, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 60, S.northPave[0]);
  // (North: open, Kamome-ga-oka's plot goes on up the bluff: kamome-street.ts.)
  for (const s of [-1, 1]) b.block(Math.min(s * 130, s * X), -1, Z - 0.5, Math.max(s * 130, s * X), 60, Z + 1);

  // ═════════════════════════ Roads ═════════════════════════
  const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700';
  for (let z = -Z + 12; z < Z; z += 6) b.deco(YELLOW, 74.92, 0.004, z, 75.08, 0.01, z + 3);
  for (let x = -X + 2; x < X - 2; x += 6) b.deco(WHITE, x, 0.004, -84.57, x + 3, 0.01, -84.43);
  // (Nothing past the south edge: Kawaminato-kō's own lamps and ginkgos go on there.)
  for (let z = S.north[1] + 4; z < Z - 2; z += 26) {
    streetLamp(b, 'lamp_small', S.hobPave[0] + 0.4, z, [1, 0]);
    if (z + 13 < Z - 4) streetLamp(b, 'lamp_led', S.sanPave[1] - 0.6, z + 13, [-1, 0]);
    if (z + 6 < Z - 4) modelTree(b, 'ginkgo', S.sanPave[0] + 1.3, z + 6, 'b', GY, true);
    if (z + 19 < Z - 4) modelTree(b, 'ginkgo', S.sanPave[1] - 1.3, z + 19, 'b', GY, true);
  }
  for (let x = -X + 10; x < X - 6; x += 30) {
    if (x > S.hob[0] - 2 && x < S.hob[1] + 2) continue;
    if (x > S.san[0] - 2 && x < S.san[1] + 2) continue;
    streetLamp(b, 'lamp_small', x, S.north[1] + 0.6, [0, -1]);
  }
  b.zone('street', S.hobPave[0], -0.3, -Z, S.hobPave[1], 8, Z, TOSEN_NAMES.hob.ja, TOSEN_NAMES.hob.en, true);
  b.zone('street', S.sanPave[0], -0.3, -Z, S.sanPave[1], 8, Z, TOSEN_NAMES.san.ja, TOSEN_NAMES.san.en, true);
  b.zone('street', -X, -0.3, S.northPave[0], X, 8, S.northPave[1], TOSEN_NAMES.north.ja, TOSEN_NAMES.north.en, true);

  // ═════════════════════════ The car-free streets ═════════════════════════
  const pave = (x0: number, z0: number, x1: number, z1: number, mat = STONE) => b.deco(mat, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
  // Zebras where the car-free streets cross Hobashira-suji and Sanbashi-suji (Kawaminato-kō's lanes run on through).
  for (const z of [0, (S.tenshin[0] + S.tenshin[1]) / 2]) {
    crosswalk(b, (S.hob[0] + S.hob[1]) / 2, z, S.hob[1] - S.hob[0] - 0.4, 3, false);
    crosswalk(b, (S.san[0] + S.san[1]) / 2, z, S.san[1] - S.san[0] - 0.4, 3, false);
  }
  // 唐船大路: grey granite with a red-stone band down the middle and red borders.
  pave(S.food[0], S.tenshin[1], S.food[1], Z);
  pave(-1.2, S.tenshin[1], 1.2, Z, STONE_RED);
  for (const x of S.food) pave(x - 0.25 * Math.sign(x), S.tenshin[1], x, Z, STONE_RED);
  b.zone('street', S.food[0] + 0.3, -0.3, S.tenshin[1], S.food[1] - 0.3, 8, Z, TOSEN_NAMES.food.ja, TOSEN_NAMES.food.en, true);
  // 錦華街.
  pave(S.hobPave[1], S.kinka[0], S.sanPave[0], S.kinka[1]);
  for (const z of S.kinka) pave(S.hobPave[1], z - 0.25 * Math.sign(z), S.sanPave[0], z, STONE_RED);
  b.zone('street', S.hobPave[1] + 0.3, -0.3, S.kinka[0] + 0.3, S.sanPave[0], 8, S.kinka[1] - 0.3, TOSEN_NAMES.kinka.ja, TOSEN_NAMES.kinka.en, true);
  // The alleys and the yokochō.
  S.alleys.forEach(([a, e], k) => {
    pave(a, S.northPave[1], e, Z, LANE);
    b.deco('flat:#6f6a60', (a + e) / 2 - 0.08, GY + 0.012, S.northPave[1], (a + e) / 2 + 0.08, GY + 0.016, Z);
    b.zone('street', a + 0.2, -0.3, S.northPave[1], e - 0.2, 8, Z, TOSEN_NAMES.alleys[k].ja, TOSEN_NAMES.alleys[k].en, true);
  });
  pave(S.hobPave[1], S.tenshin[0], S.sanPave[0], S.tenshin[1], LANE);
  b.zone('street', S.hobPave[1], -0.3, S.tenshin[0] + 0.2, S.sanPave[0], 8, S.tenshin[1] - 0.2, TOSEN_NAMES.tenshin.ja, TOSEN_NAMES.tenshin.en, true);
  // The temple's forecourt, between the food street's end and the temple gate.
  pave(S.byo[0], S.byo[3], S.byo[2], S.tenshin[0]);

  // ═════════════════════════ The rows ═════════════════════════
  const used = new Map<string, number>();
  /** A combination of the pieces filling a frontage of length L (within `slack`), the least used first. */
  const pack = (L: number, ids: string[], slack = 2.6): string[] => {
    const W = (id: string) => TOSEN[id].w;
    const order = [...ids].sort((p, q) => (used.get(p) ?? 0) - (used.get(q) ?? 0) || r() - 0.5);
    const least = Math.min(...ids.map(W));
    let best: string[] = [], bestScore = Infinity, steps = 0;
    const go = (acc: string[], sum: number) => {
      if (++steps > 20000) return;
      const rem = L - sum;
      if (acc.length && rem >= 0 && rem <= slack) {
        const score = acc.reduce((t, id) => t + (used.get(id) ?? 0) * 4, 0) + rem + acc.length * 0.2;
        if (score < bestScore) (bestScore = score), (best = [...acc]);
      }
      if (acc.length >= 10 || rem < least) return;
      for (const id of order) if (W(id) <= rem) {
        acc.push(id);
        go(acc, sum + W(id));
        acc.pop();
      }
    };
    go([], 0);
    if (!best.length) {
      let rem = L;
      for (const id of order) if (W(id) <= rem) (best.push(id), (rem -= W(id)));
    }
    for (const id of best) used.set(id, (used.get(id) ?? 0) + 1);
    return best.map((id) => [id, r()] as const).sort((p, q) => p[1] - q[1]).map(([id]) => id);
  };
  const NAMES: [string, string][] = [
    ['海龍飯店', 'Kairyū Hanten'], ['福満楼', 'Fukumanrō'], ['老福記', 'Rōfukuki'], ['青竹堂', 'Seichikudō'], ['華月', 'Kagetsu'],
    ['金鳳酒家', 'Kinpō Shuka'], ['寿康堂', 'Jukōdō'], ['月餅屋', 'Geppeiya'], ['長江', 'Chōkō'], ['唐船屋', 'Tōsenya'],
    ['紅辣', 'Kōratsu'], ['白雲', 'Hakuun'], ['泰和行', 'Taiwakō'], ['天命館', 'Tenmeikan'], ['翠園', 'Suien'], ['萬福', 'Manpuku'],
    ['同發', 'Dōhatsu'], ['聚楽園', 'Jurakuen'], ['龍鳳', 'Ryūhō'], ['桃源', 'Tōgen'],
  ];
  const BOARD: [string, string][] = [['#b3261e', '#f2d27a'], ['#7d1a14', '#f2d27a'], ['#1f2023', '#f2d27a'], ['#2f6b4f', '#ffffff']];
  const WORDS = ['点心', '飲茶', '小籠包', '中華料理', '北京ダック', '中国茶', '漢方', '豚まん', '刀削麺', '月餅', '粥', '占い'];
  let nameNo = 0;
  const letter = (a: Anchor) => {
    const [ja, en] = NAMES[nameNo % NAMES.length], [bg, fg] = BOARD[nameNo % BOARD.length];
    nameNo++;
    if (a.pts.name) label(a.pts.name, ja, en, bg, fg);
    if (a.pts.vertical) upright(a.pts.vertical, WORDS[nameNo % WORDS.length], nameNo % 2 ? '#c99a2e' : '#b3261e', nameNo % 2 ? '#7d1a14' : '#ffffff');
  };
  /** A row of shop houses on `face`, its building line at `line`, from u0 to u1 (along the line, in this frame). */
  const row = (face: Face, line: number, u0: number, u1: number, ids = SHOPS) => {
    // (In the row's own frame the frontage runs along +x: east for 'n', west for 's', south for 'e', north for 'w'.)
    const [a, e] = face === 'n' ? [u0, u1] : face === 's' ? [-u1, -u0] : face === 'e' ? [-u1, -u0] : [u0, u1];
    const list = pack(e - a, ids);
    const total = list.reduce((t, id) => t + TOSEN[id].w, 0);
    const gap = list.length ? (e - a - total) / (list.length + 1) : 0;
    let u = a + gap;
    for (const id of list) {
      const A = TOSEN[id], uc = u + A.w / 2;
      const [x, z] = face === 'n' ? [uc, line] : face === 's' ? [-uc, line] : face === 'e' ? [line, -uc] : [line, uc];
      at(face, x, z, () => {
        b.model('tosen', id, 0, GY, 0, 1000 * 2 + nameNo);
        b.block(-A.w / 2, GY, 0, A.w / 2, GY + Math.max(A.h, 3), A.d);
        letter(A);
      });
      u += A.w + gap;
    }
  };
  /** Stock buildings packing a rectangle, fronts on its `face` side (rows behind rows). */
  const fill = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[]) => {
    if (x1 - x0 < 4.6 || z1 - z0 < 4.6) return;
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 4.6 || f1 - f0 < 8) return;
    b.with(FRAME[face], () => {
      let z = f0;
      // (10.3: the filler a row ends with is 10 m deep whatever the room, surface.ts.)
      for (let k = 0; k < 6 && f1 - z > 10.3; k++) {
        const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds, lo: true, old: true, bare: k > 0 });
        if (!lots.length) break;
        z = Math.max(...lots.map((l) => l[3])) + 0.8;
      }
    });
  };

  const [w0, w1] = S.alleys[0], [e0, e1] = S.alleys[1];
  const H0 = S.hobPave[1] + 0.3, SP = S.sanPave[0] - 0.3;
  const K0 = S.kinka[1] + 0.3, K1 = S.kinka[0] - 0.3; // the building lines either side of 錦華街
  const T1 = S.tenshin[1] + 0.3, T0 = S.tenshin[0] - 0.3; // and of 点心横丁
  const F0 = S.food[0] - 0.3, F1 = S.food[1] + 0.3;
  const SOUTH = Z - 0.3;
  // South of 錦華街: a row facing it on every block, then rows on the food street and the alleys behind.
  row('n', K0, H0, w0 - 0.3, SMALL);
  row('e', w0 - 0.3, K0 + FD + 0.3, SOUTH, SMALL);
  fill(H0, K0 + FD + 0.3, w0 - 0.3 - FD - 0.3, SOUTH, 'w', LOW);
  for (const s of [-1, 1] as const) {
    const [al, fo] = s < 0 ? [w1 + 0.3, F0] : [e0 - 0.3, F1];
    const [lo, hi] = s < 0 ? [al, fo] : [fo, al];
    row('n', K0, lo, hi);
    row(s < 0 ? 'e' : 'w', fo, K0 + FD + 0.3, SOUTH);
    row(s < 0 ? 'w' : 'e', al, K0 + FD + 0.3, SOUTH, SMALL);
    fill(lo + FD + 0.3, K0 + FD + 0.3, hi - FD - 0.3, SOUTH, 'n', LOW);
  }
  row('n', K0, e1 + 0.3, SP, SMALL);
  fill(e1 + 0.3, K0 + FD + 0.3, SP, SOUTH, 'e', LOW);
  // Between 錦華街 and 点心横丁.
  row('s', K1, H0, w0 - 0.3, SMALL);
  row('n', T1, H0, w0 - 0.3, SMALL);
  for (const s of [-1, 1] as const) {
    const [al, fo] = s < 0 ? [w1 + 0.3, F0] : [e0 - 0.3, F1];
    const [lo, hi] = s < 0 ? [al, fo - FD - 0.3] : [fo + FD + 0.3, al];
    if (s < 0) {
      // (The west side's south end: 海龍飯店, the restaurant walked into, its front middle at z −15.2: stage 4, 2026-11-24.)
      row('e', fo, T1, -23.6);
      const A = TOSEN.hanten;
      at('e', fo, -15.2, () => {
        b.model('tosen', 'hanten', 0, GY, 0, 2000);
        b.block(-A.w / 2, GY + 4.2, 0.6, A.w / 2, GY + A.h, A.d);
        hantenInside(b, GY, A.w, A.d);
        // Its red columns before the front.
        for (const cx of [-A.w / 2 + 0.4, -A.w / 2 + A.w * 0.33, A.w / 2 - A.w * 0.33, A.w / 2 - 0.4]) b.block(cx - 0.4, GY, -0.48, cx + 0.4, GY + 7.6, 0.6);
        if (A.pts.name) label(A.pts.name, '海龍飯店', 'Hairyū Hanten · Cantonese', '#7d1a14', '#f2d27a');
        if (A.pts.vertical) upright(A.pts.vertical, '海龍飯店', '#c99a2e', '#7d1a14');
      });
    } else row('w', fo, T1, K1);
    row('s', K1, lo, hi);
    row('n', T1, lo, hi);
    fill(lo, T1 + FD + 0.3, hi, K1 - FD - 0.3, 'n', LOW);
  }
  row('s', K1, e1 + 0.3, SP, SMALL);
  fill(e1 + 0.3, T1, SP, K1 - FD - 0.3, 'e', LOW);
  fill(H0, T1 + FD + 0.3, w0 - 0.3, K1 - FD - 0.3, 'w', LOW);
  // North of 点心横丁, to the north street: a row on the yokochō, ordinary buildings behind on the north street.
  const N1 = S.northPave[1] + 0.3;
  for (const [lo, hi] of [[H0, w0 - 0.3], [w1 + 0.3, S.byo[0] - 0.5], [S.byo[2] + 0.5, e0 - 0.3], [e1 + 0.3, SP]] as [number, number][]) {
    row('s', T0, lo, hi, SMALL);
    fill(lo, N1, hi, T0 - FD - 0.3, 'n', BIZ);
  }
  // West of Hobashira-suji and east of Sanbashi-suji: the town goes on, ordinary rows.
  fill(-X + 0.5, N1, S.hobPave[0] - 0.3, SOUTH, 'e', LOW);
  fill(S.sanPave[1] + 0.3, N1, X - 0.5, SOUTH, 'w', BIZ);

  // ═════════════════════════ 海安廟 ═════════════════════════
  {
    const [x0, z0, x1, z1] = S.byo;
    const hall = TOSEN.byo, gate = TOSEN.byomon;
    // A red wall with a jade-tile cap round the precinct, the gate in its south side.
    const wall = (ax: number, az: number, bx: number, bz: number) => {
      b.box(WALL, ax, GY, az, bx, GY + 2.6, bz);
      b.deco(CAP, ax - 0.15, GY + 2.6, az - 0.15, bx + 0.15, GY + 2.85, bz + 0.15);
    };
    wall(x0, z0, x0 + 0.5, z1);
    wall(x1 - 0.5, z0, x1, z1);
    wall(x0, z0, x1, z0 + 0.5);
    for (const s of [-1, 1]) wall(Math.min(s * gate.w / 2, s * (x1 - 0.5)), z1 - 0.5, Math.max(s * gate.w / 2, s * (x1 - 0.5)), z1);
    pave(x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5, 'tile:#a59c8e');
    at('s', 0, z1, () => {
      b.model('tosen', 'byomon', 0, GY, 0, 0);
      for (const sx of [-1, 1]) b.block(Math.min(sx * 2.2, sx * gate.w / 2), GY, 0.6, Math.max(sx * 2.2, sx * gate.w / 2), GY + 5, gate.d - 0.6);
      label(gate.pts.name, '海安廟', 'Kaian-byō', '#1d1d1d', '#e8c25a');
    });
    // The hall's back against the precinct's north wall, a small court between it and the gate.
    const hz = z0 + 0.5 + hall.d;
    at('s', 0, hz, () => {
      b.model('tosen', 'byo', 0, GY, 0, 0);
      // The terrace (walked on, its steps a ramp) and the hall behind its porch.
      b.box('none', -hall.w / 2, GY, 0, hall.w / 2, GY + 1.2, hall.d);
      b.ramp(-3.2, -1.8, 3.2, 0, GY, GY + 1.2, [0, 1]);
      b.block(-hall.w / 2 + 2, GY + 1.2, 3.5, hall.w / 2 - 2, GY + 14, hall.d - 1.5);
      label(hall.pts.name, '海安廟', undefined, '#1d1d1d', '#e8c25a');
    });
    // The incense burner out on the forecourt, before the gate.
    at('s', 0, z1 + 3.2, () => {
      b.model('tosen', 'koro', 0, GY, 0, 0);
      b.block(-0.9, GY, 0, 0.9, GY + 1.6, 1.8);
    });
    for (const sx of [-1, 1]) {
      modelTree(b, 'zelkova', sx * 14, z1 - 6, 'b', GY, false);
      b.block(sx * 14 - 0.4, GY, z1 - 6.4, sx * 14 + 0.4, GY + 4, z1 - 5.6);
    }
    b.zone('street', x0 + 0.5, -0.3, z0 + 0.5, x1 - 0.5, 20, z1, TOSEN_NAMES.byo.ja, TOSEN_NAMES.byo.en, true);
  }

  // ═════════════════════════ The gates on 錦華街 ═════════════════════════
  {
    const G = TOSEN.paifang_b;
    for (const [face, x, name, sub] of [['w', S.hobPave[1] + 1.6, TOSEN_NAMES.gates.west, 'Fukukai-mon'], ['e', S.sanPave[0] - 1.6, TOSEN_NAMES.gates.east, 'Zuikō-mon']] as [Face, number, string, string][]) {
      at(face, x, 0, () => {
        b.with({ t: [0, 0, -G.d / 2] }, () => {
          b.model('tosen', 'paifang_b', 0, GY, 0, 0);
          for (const sx of [-1, 1]) b.block(sx * 3.9 - 0.45, GY, G.d / 2 - 0.7, sx * 3.9 + 0.45, GY + 6.6, G.d / 2 + 0.7);
          label(G.pts.name, name, sub, '#7d1a14', '#f2d27a');
          label(G.pts.name_b, TOSEN_NAMES.kinka.ja, TOSEN_NAMES.kinka.en, '#7d1a14', '#f2d27a');
        });
      });
    }
  }

  // ═════════════════════════ Street furniture ═════════════════════════
  // Lamps down the food street and 錦華街; benches and planters at the forecourt.
  for (let z = 10; z < Z - 6; z += 16) for (const s of [-1, 1]) streetLamp(b, 'lamp_small', s * (S.food[1] - 0.8), z + (s > 0 ? 8 : 0), [-s, 0]);
  for (let x = -66; x < 60; x += 18) if (Math.abs(x) > 8 && Math.abs(x - 50) > 3 && Math.abs(x + 50) > 3) streetLamp(b, 'lamp_small', x, S.kinka[1] - 0.8, [0, -1]);
  for (const s of [-1, 1]) {
    roadModel(b, 'bench_s', s * 12, GY, S.tenshin[0] - 3, [0, 1]);
    b.block(s * 12 - 0.95, GY, S.tenshin[0] - 3.4, s * 12 + 0.95, GY + 0.6, S.tenshin[0] - 2.6);
    roadModel(b, 'planter', s * 16, GY, S.tenshin[0] - 3, [0, 1]);
    b.block(s * 16 - 0.9, GY, S.tenshin[0] - 3.45, s * 16 + 0.9, GY + 0.9, S.tenshin[0] - 2.55);
  }
  return b.out;
}
