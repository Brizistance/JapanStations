// Minato Center's outside (みなとセンター, rebuilt from 2026-11-25): the bay new town at the end of the Nagisa Line,
// after Yokohama's Minato Mirai 21 (docs/theme-notes.md "Bay new town").
//
// THE PLAN (station frame: +x east along the Nagisa Line, +z south; plot x ±150, z −198 … 52, minatocenter-plan.ts,
// where the same streets are the table MC_STREETS that street-rules.test.ts holds this build to)
//
//   The ground is the bay landfill's south shore: the sea wall at z 52 runs the whole width, the open sea 330 m west.
//
//   Street                     Centre line   Width   What it is
//   海辺通 Umibe-dōri           z = 0         36 m    the avenue over the station, six lanes (|z| ≤ 11), 7 m pavements with
//                                                    double tree rows; Umibe's avenue carried on west on the same line
//   帆柱筋 Hobashira-suji       x = −60       24 m    four lanes, 5 m pavements; from the avenue (a T) north past the plot
//   浜風筋 Hamakaze-suji        x = 96        24 m    the same, east of the tower
//   センター北通 Sentā-kita-dōri z = −170       15 m    the two-lane back street, carried on east to Shinshio's connector road
//   みなとモール公園            z −115 … −95  20 m    the pedestrian park across the plot (the Grand Mall type), signalled
//                                                    crossings over both 筋
//   みなとベイウォーク           z 44 … 52      8 m    the promenade along the sea wall; its pier out over the bay at x −20
//
//   Landmarks: みなとセンタータワー (175 m, x −44 … 80, z −90 … −26) round the station's glass atrium (stage 1,
//   minatocenter-atrium.ts) on its forecourt; 川湊国際展示場, the exhibition hall, x −146 … −80, z −88 … −32, its
//   forecourt to the avenue; 渚の大観覧車, the Ferris wheel, x −145 … −75 on the waterfront park; みなとデッキ, the
//   pedestrian deck from the atrium's deck level across the avenue to the park, x 52.3 … 57.7.
//
//   Edges: south the sea wall (a real boundary). West the avenue, the Mall and the back street run on to the west shore
//   (x −331), where a shore walk ends them. North the two 筋 run on 150 m. East the avenue runs on to Umibe's run-on
//   (x 392), the back street to Shinshio's connector road (x 214, shinshio-street.ts), and the Mall to a cross street
//   at x 300, which also takes Umibe's Hamachidori-dōri (z −84). Rows of offices and flats line all of them.
//
// Stage 1 (the station), 2 (streets and landmarks), 3 (the fill) and 4 (props), 2026-11-25.

import { rng, type LanePart } from '../world/builder';
import { CARS, VEH, family } from '../traffic/vehicles';
import { CIVIC } from './anchors/civic';
import { MCENTER as M } from './anchors/mcenter';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import type { Rect } from './looks/types';
import type { Ctx } from './kit';
import { GROUND_Y, rail, stairs, vending } from './kit';
import { konbini } from './konbini';
import { place } from './places';
import { MC_LINES as BL, MC_PLOT, MC_SITES as SITE, MC_STREETS, MCA, PEN } from './minatocenter-plan';
import { kerbRail, pedSignal, poleLine, roadModel, roadName, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal, type PoleStyle } from './roads';
import { crosswalk, fillModelLots, isAlleyLot, type SurfaceSpec } from './surface';
import { modelTree, type TreeKind } from './trees';

type Named = { ja: string; en: string };
type Face = 'n' | 's' | 'e' | 'w';
type St = (typeof MC_STREETS)[number];
const X = MC_PLOT.x, Z = MC_PLOT.z, N = MC_PLOT.north;
/** The avenue's building line, which the atrium's front and the pavement exits are fitted to. */
const FRONT = 18;
const BARE = 'flat:#8d877b', WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#bdb9b0';
const PAVE = 'tile:#c8c3b8', PLAZA = 'tile:#d9d4c8', WALK = 'tile:#b9a98f', LAWN = 'flat:#6d8a48', TIMBER = 'wood:#8a6a4a';
const STEEL = 'paint:#f4f5f2', DARKP = 'flat:#2c3238';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const SL = 5.2;
/** The peninsula's east–west streets as corridors, for spacing lamps and trees on the 筋. */
const PEN_EW: [number, number][] = [[PEN.md.c - PEN.md.half, PEN.md.c + PEN.md.half], [PEN.br.c - PEN.br.half, PEN.br.c + PEN.br.half], [PEN.hm.c - PEN.hm.half, PEN.hm.c + PEN.hm.half]];

const st = (en: string) => MC_STREETS.find((s) => s.en.startsWith(en))!;
const AV = st('Umibe'), HO = st('Hobashira'), HK = st('Hamakaze'), KI = st('Sentā');
const NS = [HO, HK], EW = [AV, KI];
const short = (s: Named): Named => ({ ja: s.ja, en: s.en.split(' (')[0] });
const span = (s: St): [number, number] => [s.a0 ?? -N, s.a1 ?? Z];

export const MC_NAMES = {
  tower: { ja: 'みなとセンタータワー', en: 'Minato Center Tower' },
  hall: { ja: '川湊国際展示場', en: 'Kawaminato International Exhibition Hall' },
  wheel: { ja: '渚の大観覧車', en: 'Nagisa Great Wheel' },
  mall: { ja: 'みなとモール公園', en: 'Minato Mall Park' },
  walk: { ja: 'みなとベイウォーク', en: 'Minato Baywalk' },
  pier: { ja: 'ベイウォーク桟橋', en: 'Baywalk Pier' },
  deck: { ja: 'みなとデッキ', en: 'Minato Deck' },
  park: { ja: 'みなと臨海公園', en: 'Minato Waterfront Park' },
  point: { ja: '渚の岬公園', en: 'Nagisa Point Park' },
  lookout: { ja: '岬の展望灯台', en: 'Point Lookout' },
  conv: { ja: 'みなとコンベンションセンター', en: 'Minato Convention Center' },
  rhotel: { ja: 'ホテル汐路リゾート', en: 'Hotel Shioji Resort' },
  marina: { ja: 'みなとマリーナ', en: 'Minato Marina' },
  club: { ja: 'みなとマリーナ クラブハウス', en: 'Minato Marina Clubhouse' },
  wbus: { ja: 'みなとセンター 水上バスのりば', en: 'Minato Center Water-bus Landing' },
  sr: { ja: '西浜通', en: 'Nishihama-dōri' },
  s3: { ja: '展示場筋', en: 'Tenjijō-suji' },
  md: { ja: 'みなと中通', en: 'Minato-naka-dōri' },
  br: { ja: '新潮臨港通', en: 'Shinshio-rinkō-dōri' },
  hm: { ja: '浜通', en: 'Hama-dōri' },
  northWalk: { ja: '河口プロムナード', en: 'River-mouth Promenade' },
  westWalk: { ja: '西浜プロムナード', en: 'Nishihama Promenade' },
  hotelB: { ja: 'ホテル渚テラス', en: 'Hotel Nagisa Terrace' },
  office: { ja: '川湊ベイフロントビル', en: 'Kawaminato Bayfront Building' },
  resi: { ja: 'みなとセンター レジデンス', en: 'Minato Center Residence' },
  bhotel: { ja: 'ホテル港灯り', en: 'Hotel Minato-akari' },
  soko: { ja: '旧七号倉庫 ハーバーホール', en: 'Old No. 7 Warehouse — Harbour Hall' },
  clinic: { ja: 'みなとセンター診療所・ベイ薬局', en: 'Minato Center Clinic · Bay Pharmacy' },
};

export function minatoCenterStreet(c: Ctx, spec: SurfaceSpec, cw: number) {
  const { b } = c, sta = c.station, GY = GROUND_Y;
  if (Math.abs(cw + 5.5 - 17.5) > 0.01) throw new Error(`minatoCenterStreet: the exits' line moved (${cw + 5.5})`);
  if (AV.half + AV.pave !== FRONT || MCA.z1 !== -FRONT) throw new Error('minatoCenterStreet: the avenue no longer meets the atrium’s front');
  b.out.plot = { ...MC_PLOT, arms: MC_PLOT.arms.map((a) => [...a] as Rect) };
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);
  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: Parameters<typeof b.sign>[0]) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  const D = SITE.deck, P = SITE.pier;
  const DY = GY + MCA.deck;

  // ═════════════════════════ Ground ═════════════════════════
  const wells: Rect[] = [
    ...b.out.holes.map(([x0, z0, x1, z1]): Rect => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]),
    [MCA.x0 - 0.4, MCA.z0 - 0.4, MCA.x1 + 0.4, MCA.z1],
  ];
  const carriage: Rect[] = [
    [-X, -AV.half, X, AV.half], [-X, KI.c - KI.half, X, KI.c + KI.half],
    ...NS.map((s): Rect => [s.c - s.half, span(s)[0], s.c + s.half, span(s)[1]]),
  ];
  b.slab('asphalt', -X, -N, X, Z, -0.6, 0, wells);
  b.slab(BARE, -X, -N, X, Z, 0, GY, [...wells, ...carriage]);
  const pave = (x0: number, z0: number, x1: number, z1: number, mat = PAVE) => b.slab(mat, x0, z0, x1, z1, GY + 0.002, GY + 0.014, [...wells, ...carriage], false);
  pave(-X, BL.avN, X, -AV.half);
  pave(-X, AV.half, X, BL.avS);
  pave(-X, BL.kiN, X, KI.c - KI.half);
  pave(-X, KI.c + KI.half, X, BL.kiS);
  for (const s of NS) pave(s.c - s.half - s.pave, -N, s.c + s.half + s.pave, BL.avN);
  // The forecourts: the tower's (to the atrium) and the hall's, in pale plaza paving.
  pave(-44, -26, 40, BL.avN, PLAZA);
  pave(-146, -32, -80, BL.avN, PLAZA);
  // The sea wall, its cope and rail; the rail opens for the pier.
  b.deco(STONE, PEN.wsh - 0.6, -0.4, Z, X + 260, GY + 0.02, Z + 0.6);
  for (const [a, e] of [[PEN.wsh, P.x0], [P.x1, X]] as [number, number][]) {
    b.deco('metal:#5d666c', a, GY + 1.0, Z - 0.1, e, GY + 1.06, Z);
    for (let x = a + 1; x < e; x += 2.5) b.deco('metal:#5d666c', x - 0.03, GY, Z - 0.1, x + 0.03, GY + 1.0, Z - 0.04);
    b.block(a, -1, Z - 0.1, e, GY + 1.1, Z + 1);
  }
  b.zone('street', -X, -0.3, -N, X, 120, Z, `${sta.nameJa}駅前`, `${sta.nameRomaji} — street level`);
  // Plot edges: the east wall where the avenue runs on to Umibe (only seen); west and north the plot opens onto the
  // peninsula (minatocenter-plan.ts PEN), whose own edges are the sea walls and Shinshio's connector road.
  b.block(X, -1, -N, X + 1, 60, Z + 1);
  b.block(X, -1, -N - 1, PEN.ce, 60, -N);
  b.out.district = { radius: 450, old: [0, -100], oldRadius: 0, towers: 6 };

  // ═════════════════════════ Paint ═════════════════════════
  const nsCorr = NS.map((s): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave]);
  const ewCorr = EW.map((s): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave]);
  const mallCorr: [number, number] = [BL.mallN, BL.mallS];
  const boxX = nsCorr.map(([p, q]): [number, number] => [p - 7, q + 7]);
  const boxZ = [...ewCorr, mallCorr].map(([p, q]): [number, number] => [p - 7, q + 7]);
  const dash = (axis: 'x' | 'z', cc: number, a: number, e: number, box: [number, number][], mat = WHITE) => {
    for (let u = a; u < e - 3; u += 6) {
      if (!clearOf(u + 1.5, box)) continue;
      if (axis === 'x') b.deco(mat, u, 0.004, cc - 0.07, u + 3, 0.01, cc + 0.07);
      else b.deco(mat, cc - 0.07, 0.004, u, cc + 0.07, 0.01, u + 3);
    }
  };
  const line = (axis: 'x' | 'z', cc: number, a: number, e: number, box: [number, number][], mat = WHITE, w = 0.06) => {
    let from = a;
    for (const [p, q] of [...box, [e, e] as [number, number]]) {
      if (p - from > 1) {
        if (axis === 'x') b.deco(mat, from, 0.004, cc - w, Math.min(p, e), 0.01, cc + w);
        else b.deco(mat, cc - w, 0.004, from, cc + w, 0.01, Math.min(p, e));
      }
      from = Math.max(from, q);
    }
  };
  // The avenue: three 3.25 m lanes each way, a 1.5 m painted centre between yellow lines, a strip at each kerb.
  for (const s of [-1, 1]) {
    dash('x', s * 4.0, -X, X, boxX);
    dash('x', s * 7.25, -X, X, boxX);
    line('x', s * 0.75, -X, X, boxX, YELLOW, 0.06);
    line('x', s * (AV.half - 0.5), -X, X, boxX);
  }
  // The 筋: two lanes each way, a yellow centre line; the back street: a dashed centre.
  for (const s of NS) {
    const [a0, a1] = span(s);
    line('z', s.c, a0, a1, boxZ, YELLOW, 0.06);
    for (const k of [-1, 1]) dash('z', s.c + k * 3.5, a0, a1, boxZ);
  }
  dash('x', KI.c, -X, X, boxX);

  // ═════════════════════════ Junctions and lanes ═════════════════════════
  const inPlot = (x: number, z: number) => x > -X + 0.5 && x < X - 0.5 && z > -N + 0.6 && z < Z - 0.5;
  /** A signalled junction (as shinshio-street.ts): `north`/`south` false, the north–south street does not go on that way. */
  const junction = (cx: number, hx: number, ns: (1 | -1)[], cz: number, hz: number, ew: (1 | -1)[], name: Named, north: boolean, south: boolean, o: { style?: PoleStyle } = {}) => {
    const so = { style: o.style ?? 'new' };
    for (const sz of [-1, 1] as const) {
      if ((sz === 1 && !south) || (sz === -1 && !north)) continue;
      const zc = cz + sz * (hz + 2.6);
      crosswalk(b, cx, zc, 2 * hx - 0.4, 4, false);
      for (const sx of [-1, 1] as const) pedSignal(b, cx + sx * (hx + 0.8), zc + sz * 2.4, [-sx, 0], 0, { flat: true, speaker: true });
    }
    for (const sx of [-1, 1] as const) {
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 4, true);
      for (const sz of [-1, 1] as const) pedSignal(b, xc + sx * 2.4, cz + sz * (hz + 0.8), [0, -sz], 1, { flat: true, speaker: true });
    }
    for (const sx of ew) {
      const lz = -sx, xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      const pz = cz + lz * (hz + (lz < 0 && !north ? 0.75 : 1.5));
      vehicleSignal(b, cx + sx * (hx + 1.9), pz, [sx, 0], hz > 6 ? 6.5 : 3.5, 0, name, { ...so, back: false });
    }
    for (const sz of ns) {
      if ((sz === 1 && !north) || (sz === -1 && !south)) continue;
      const lx = sz, zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      const pz = cz + sz * (hz + (sz < 0 && !north ? 0.75 : 2.0));
      vehicleSignal(b, cx + lx * (hx + 1.6), pz, [0, sz], hx > 6 ? 6.5 : 3.5, 1, name, { ...so, back: ns.length > 1 });
    }
    const [gx, gz] = [cx - hx - 2.6, north ? cz - hz - 3.2 : cz + hz + 2.2];
    if (inPlot(gx, gz)) {
      roadModel(b, 'sigbox', gx, GY, gz, [0, 1]);
      b.block(gx - 0.36, GY, gz - 0.26, gx + 0.36, GY + 1.56, gz + 0.26);
    }
  };
  const J = {
    hall: { ja: '展示場前', en: 'Tenjijō-mae' },
    tower: { ja: 'みなとセンタータワー前', en: 'Minato Center Tower-mae' },
    hoKita: { ja: '帆柱筋北', en: 'Hobashira-suji-kita' },
    hkKita: { ja: '浜風筋北', en: 'Hamakaze-suji-kita' },
    mallW: { ja: 'モール公園西', en: 'Mōru-kōen-nishi' },
    mallE: { ja: 'モール公園東', en: 'Mōru-kōen-higashi' },
  };
  // A new town's signals: the avenue's on the long 6.5 m arms, the 筋's on the plain new masts.
  junction(HO.c, HO.half, [1, -1], AV.c, AV.half, [1, -1], J.hall, true, false, { style: 'long' });
  junction(HK.c, HK.half, [1, -1], AV.c, AV.half, [1, -1], J.tower, true, false, { style: 'long' });
  junction(HO.c, HO.half, [1, -1], KI.c, KI.half, [1, -1], J.hoKita, true, true);
  junction(HK.c, HK.half, [1, -1], KI.c, KI.half, [1, -1], J.hkKita, true, true);
  // The Mall's crossings over the 筋: a zebra the park's width, pedestrian heads, a stop line and a head each way.
  const MZ = (BL.mallN + BL.mallS) / 2;
  for (const [s, name] of [[HO, J.mallW], [HK, J.mallE]] as const) {
    crosswalk(b, s.c, MZ, 2 * s.half - 0.4, 8, false);
    for (const sx of [-1, 1] as const) for (const sz of [-1, 1] as const) pedSignal(b, s.c + sx * (s.half + 0.8), MZ + sz * 3.6, [-sx, 0], 0, { flat: true, speaker: true });
    for (const sz of [1, -1] as const) {
      const zs = MZ - sz * 6;
      b.deco(WHITE, Math.min(s.c, s.c + sz * (s.half - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(s.c, s.c + sz * (s.half - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      shortSignal(b, s.c + sz * (s.half + 1.5), MZ - sz * 4.6, [0, sz], 1, name);
    }
  }

  type Cross = { c: number; half: number };
  const CROSS_Z: Cross[] = [AV, KI, { c: MZ, half: 4 - SL + 0.5 }, PEN.md, PEN.br];
  const stops = (dir: 1 | -1, from: number, cross: Cross[], axis: 0 | 1, len: number): LanePart['stops'] =>
    cross.map((q) => {
      const t = (q.c - from) * dir;
      return { at: t - q.half - SL - 0.5, axis, exit: Math.min(len, t + q.half + SL) };
    }).filter((q) => q.at > 2 && q.at < len).sort((p, q) => p.at - q.at);
  const lane = (o: { speed: number; flow: number; use: LanePart['use'] }, x0: number, z0: number, x1: number, z1: number, more: Partial<LanePart> = {}) => {
    const alongX = Math.abs(x1 - x0) > 1, dir = Math.sign(alongX ? x1 - x0 : z1 - z0) as 1 | -1;
    trafficLane(b, x0, z0, x1, z1, {
      speed: o.speed / 3.6, flow: o.flow, use: o.use, taxi: 0.15, halts: [],
      stops: alongX ? stops(dir, x0, [PEN.sr, PEN.s3, ...NS], 0, Math.abs(x1 - x0)) : stops(dir, z0, CROSS_Z, 1, Math.abs(z1 - z0)),
      ...more,
    });
  };
  const big = { speed: 50, flow: 1.6, use: 'all' as const }, mid = { speed: 40, flow: 0.8, use: 'general' as const }, small = { speed: 30, flow: 0.4, use: 'general' as const };
  // Traffic keeps left: eastbound on the north half, southbound on the east half.
  for (const z of [2.375, 5.625, 8.875]) {
    lane(big, PEN.sr.c + PEN.sr.half + 1, -z, X, -z, { closed: ['from'] });
    lane(big, X, z, PEN.sr.c + PEN.sr.half + 1, z, { dead: true, closed: ['to'] });
  }
  lane(small, PEN.sr.c + PEN.sr.half + 1, KI.c - 1.6, X, KI.c - 1.6, { closed: ['from'] });
  lane(small, X, KI.c + 1.6, PEN.sr.c + PEN.sr.half + 1, KI.c + 1.6, { dead: true, closed: ['to'] });
  for (const s of NS) {
    for (const d of [1.75, 5.25]) {
      lane(mid, s.c + d, PEN.hm.c + PEN.hm.half + 1, s.c + d, AV.c - 1, { dead: true, closed: ['from'] });
      lane(mid, s.c - d, -AV.half - 1, s.c - d, PEN.hm.c + PEN.hm.half + 1, { dead: true, closed: ['to'] });
    }
  }

  // ═════════════════════════ Lamps, rails, trees, boards ═════════════════════════
  const carrX = NS.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const carrZ = [...EW.map((s): [number, number] => [s.c - s.half, s.c + s.half]), mallCorr];
  const EXITS: [number, number][] = [[36, 50], [D.x0 - 1, D.x1 + 1]];
  const lampAt = (a0: number, a1: number, corr: [number, number][], step = 18) => {
    const out: number[] = [];
    for (let u = a0 + step / 2; u < a1 - 1; u += step) {
      const hit = corr.find(([p, q]) => u > p - 3.8 && u < q + 3.8);
      out.push(hit ? (u - hit[0] < hit[1] - u ? hit[0] - 3.9 : hit[1] + 3.9) : u);
    }
    return out;
  };
  lampAt(-X, X, [...carrX, ...EXITS], 17).forEach((x) => {
    for (const s of [-1, 1]) streetLamp(b, 'lamp_led', x, s * (AV.half + 0.7), [0, -s]);
  });
  for (const s of NS) lampAt(PEN.hm.c + PEN.hm.half, -AV.half, [...carrZ, ...PEN_EW], 16).forEach((z, k) => streetLamp(b, 'lamp_led', s.c + (k % 2 ? 1 : -1) * (s.half + 0.6), z, [k % 2 ? -1 : 1, 0]));
  // The back street is the new town's edge, where the wires still run overhead (the avenue's and the 筋's are buried):
  // a pole line along its north kerb, whose poles carry its lights, drops to the row behind and lines across;
  // plain lamps along the south kerb.
  poleLine(b, { axis: 'x', from: -X + 6, to: X - 6, at: KI.c - KI.half - 0.4, road: 1, step: 26, skip: (u) => !clearOf(u, carrX, 7), drops: 0.7, cross: 2 * KI.half + KI.pave + 0.4, name: { ja: sta.nameJa, en: sta.nameRomaji } });
  lampAt(-X, X, carrX, 24).forEach((x) => streetLamp(b, 'lamp_small', x, KI.c + KI.half + 0.45, [0, -1]));
  // Guard rails along the avenue's kerbs, open at the 筋, by the exits and at the bus stops.
  const BUS: [number, number][] = [[-30, -14], [110, 126]];
  for (const s of [-1, 1]) {
    const mouths: [number, number][] = [...(s < 0 ? nsCorr.map(([p, q]): [number, number] => [p - 5, q + 5]) : []), ...EXITS, ...BUS];
    let run: number | null = null;
    for (let x = -X + 1.25; x <= X; x += 2.5) {
      const ok = x < X - 1 && clearOf(x, mouths, 1.3);
      if (ok) {
        kerbRail(b, x, s * (AV.half + 0.25));
        run ??= x - 1.25;
      }
      if (!ok && run !== null) {
        b.block(run, GY, s * (AV.half + 0.25) - 0.06, x - 1.25, GY + 0.9, s * (AV.half + 0.25) + 0.06);
        run = null;
      }
    }
  }
  // Zelkovas in a double row on the avenue's pavements; ginkgos on the 筋, dogwoods on the back street.
  for (let x = -X + 8; x < X - 4; x += 12) {
    if (!clearOf(x, nsCorr, 6) || !clearOf(x, EXITS, 3) || !clearOf(x, BUS, 1)) continue;
    for (const s of [-1, 1]) {
      modelTree(b, 'zelkova', x, s * (AV.half + 2.0), 'b', GY, true);
      if (s < 0 && ((x > -50 && x < 84) || (x > -150 && x < -76))) continue; // (the forecourts keep their own planting)
      if (x + 6 < X - 2 && clearOf(x + 6, nsCorr, 6) && clearOf(x + 6, EXITS, 3) && clearOf(x + 6, BUS, 1)) modelTree(b, 'zelkova', x + 6, s * (AV.half + 5.0), 'b', GY, true);
    }
  }
  for (const s of NS) for (let z = PEN.hm.c + 14; z < -AV.half - 8; z += 12) {
    if (!clearOf(z, [...carrZ, ...PEN_EW], 6)) continue;
    for (const k of [-1, 1]) modelTree(b, 'ginkgo', s.c + k * (s.half + 2.5), z, 'b', GY, true);
  }
  for (let x = -X + 10; x < X - 4; x += 14) if (clearOf(x, nsCorr, 4)) modelTree(b, 'dogwood', x, KI.c + KI.half + 1.5, 'b', GY, true);
  roadName(b, HO.c - HO.half - HO.pave - 2, BL.avN + 0.6, [0, 1], short(AV));
  roadName(b, HK.c + HK.half + HK.pave + 2, BL.avN + 0.6, [0, 1], short(AV));
  roadName(b, HO.c + HO.half + HO.pave - 0.6, BL.avN - 10, [-1, 0], short(HO));
  roadName(b, HK.c - HK.half - HK.pave + 0.6, BL.avN - 10, [1, 0], short(HK));
  roadName(b, HO.c - HO.half - HO.pave - 2, BL.kiS - 0.4, [0, -1], short(KI));
  roadName(b, HK.c + HK.half + HK.pave + 2, BL.kiS - 0.4, [0, -1], short(KI));
  for (const s of NS) roadSign(b, 'speed40', s.c + s.half + 0.5, BL.avN - 16, [0, 1], 0.6);
  // A bus stop each way on the avenue.
  for (const [sx, x] of [[1, 118], [-1, -22]] as const) {
    const s = -sx, f: [number, number] = [0, -s];
    roadModel(b, 'busstop', x + sx * 6.5, GY, s * (AV.half + 0.75), f);
    b.block(x + sx * 6.5 - 0.15, GY, s * (AV.half + 0.75) - 0.15, x + sx * 6.5 + 0.15, GY + 2.6, s * (AV.half + 0.75) + 0.15);
    roadModel(b, 'shelter', x, GY, s * (AV.half + 2.7), f);
    for (const px of [x - 1.9, x + 1.9]) b.block(px - 0.1, GY, s * (AV.half + 2.7) - 0.1, px + 0.1, GY + 2.5, s * (AV.half + 2.7) + 0.1);
    b.sign({ k: 'label', text: sx > 0 ? 'みなとセンター駅' : '展示場前', sub: sx > 0 ? 'Minato Center Sta. (bus stop)' : 'Tenjijō-mae (bus stop)', fg: '#ffffff', bg: '#1f5fae' }, x + sx * 6.5, GY + 2.2, s * (AV.half + 0.75) - s * 0.12, f, 0.5, 0.5);
    for (const ln of b.out.lanes) if (Math.abs(ln.from[2] - s * 8.875) < 0.1 && Math.abs(ln.to[2] - s * 8.875) < 0.1) ln.halts = [...ln.halts, { at: (x + sx * 6.5 - ln.from[0]) * sx, side: 0 }];
  }

  // ═════════════════════════ みなとモール公園, the Mall ═════════════════════════
  // A paved walk down the middle between raised lawns and trees, lamps on both edges; cut by the 筋 at their crossings.
  const s3Corr: [number, number] = [PEN.s3.c - PEN.s3.half - PEN.s3.pave, PEN.s3.c + PEN.s3.half + PEN.s3.pave];
  const mallRuns: [number, number][] = [[PEN.srE, s3Corr[0]], [s3Corr[1], nsCorr[0][0]], [nsCorr[0][1], nsCorr[1][0]], [nsCorr[1][1], X]];
  mallRuns.forEach(([a, e], k) => {
    b.slab(PLAZA, a, BL.mallN, e, BL.mallS, GY + 0.002, GY + 0.014, [], false);
    for (const [z0, z1] of [[BL.mallN + 2.5, MZ - 3.5], [MZ + 3.5, BL.mallS - 2.5]]) {
      b.box('flat:#b9b4a8', a + 2, GY, z0, e - 2, GY + 0.35, z1);
      b.deco(LAWN, a + 2.15, GY + 0.35, z0 + 0.15, e - 2.15, GY + 0.37, z1 - 0.15);
    }
    for (let x = a + 8; x < e - 4; x += 16) {
      for (const z of [BL.mallN + 4.5, BL.mallS - 4.5]) modelTree(b, (Math.round(x) % 2 ? 'camphor' : 'cherry') as TreeKind, x, z, 'b', GY + 0.35);
      if (x + 8 < e - 1) for (const z of [BL.mallN + 0.6, BL.mallS - 0.6]) streetLamp(b, 'lamp_small', x + 8, z, [0, z < MZ ? 1 : -1]);
    }
    b.zone('street', a, -0.3, BL.mallN, e, 8, BL.mallS, MC_NAMES.mall.ja, `${MC_NAMES.mall.en}${[' (far west)', ' (west)', ' (middle)', ' (east)'][k]}`);
  });

  // ═════════════════════════ The waterfront: みなと臨海公園 and the Baywalk ═════════════════════════
  // Raised lawns with pines between the avenue's pavement and the promenade; the Baywalk's paving along the wall.
  b.slab(WALK, PEN.wsh, BL.walk, X, Z, GY + 0.002, GY + 0.016, [], false);
  b.slab(PLAZA, PEN.wsh, BL.avS, X, BL.walk, GY + 0.002, GY + 0.014, [], false);
  const lawns: [number, number][] = [[-70, -26], [-8, 34], [138.5, 147]];
  for (const [a, e] of lawns) {
    b.box('flat:#b9b4a8', a, GY, BL.avS + 6, e, GY + 0.35, BL.walk - 4);
    b.deco(LAWN, a + 0.15, GY + 0.35, BL.avS + 6.15, e - 0.15, GY + 0.37, BL.walk - 4.15);
    for (let x = a + 5; x < e - 3; x += 11) modelTree(b, 'pine', x, (BL.avS + BL.walk) / 2 + ((Math.round(x) % 3) - 1) * 3, 'b', GY + 0.35);
  }
  for (let x = PEN.wsh + 24; x < X - 8; x += 18) {
    if (x > P.x0 - 10 && x < P.x1 + 3) continue;
    streetLamp(b, 'lamp_small', x, BL.walk + 0.6, [0, 1]);
    b.box('wood:#b48a5e', x + 4, GY + 0.42, Z - 2.2, x + 7.2, GY + 0.48, Z - 1.7);
    b.block(x + 4, GY, Z - 2.2, x + 7.2, GY + 0.48, Z - 1.7);
  }
  b.zone('street', -X, -0.3, BL.walk, X, 8, Z, MC_NAMES.walk.ja, MC_NAMES.walk.en);
  b.zone('street', -X, -0.3, BL.avS, X, 8, BL.walk, MC_NAMES.park.ja, MC_NAMES.park.en);
  b.zone('street', PEN.wsh, -0.3, BL.avS, -X, 8, Z, MC_NAMES.point.ja, MC_NAMES.point.en);

  // ── The pier: a timber deck on piles out over the bay, a wider head with benches and lamps ──
  {
    const top = GY + 0.15, sea = -1.2;
    const deck = (x0: number, z0: number, x1: number, z1: number) => {
      b.box(TIMBER, x0, top - 0.3, z0, x1, top, z1);
      for (let x = x0 + 0.5; x < x1; x += 3.5) for (let z = z0 + 1; z < z1; z += 5) b.deco('flat:#4a4540', x - 0.2, sea - 2, z - 0.2, x + 0.2, top - 0.3, z + 0.2);
      for (let z = z0; z < z1; z += 0.6) b.deco('flat:#6f553c', x0, top, z, x1, top + 0.006, z + 0.03);
    };
    deck(P.x0, Z, P.x1, P.z0);
    deck(P.hx0, P.z0, P.hx1, P.z1);
    // Steel railings round it (posts, a top rail and two bars), open where it meets the walk.
    const railing = (x0: number, z0: number, x1: number, z1: number) => {
      const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0, RL = 'paint:#3d4a55';
      b.block(x0, top, z0, x1, top + 1.1, z1);
      for (const [y0, y1] of [[1.02, 1.1], [0.62, 0.66], [0.25, 0.29]]) b.deco(RL, x0, top + y0, z0, x1, top + y1, z1);
      for (let u = 0; u <= len + 0.01; u += 2) {
        const [px, pz] = alongX ? [x0 + u, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + u];
        b.deco(RL, px - 0.04, top, pz - 0.04, px + 0.04, top + 1.1, pz + 0.04);
      }
    };
    railing(P.x0 - 0.08, Z + 0.6, P.x0, P.z0);
    railing(P.x1, Z + 0.6, P.x1 + 0.08, P.z0);
    railing(P.hx0, P.z0 - 0.08, P.x0, P.z0);
    railing(P.x1, P.z0 - 0.08, P.hx1, P.z0);
    railing(P.hx0 - 0.08, P.z0, P.hx0, P.z1);
    railing(P.hx1, P.z0, P.hx1 + 0.08, P.z1);
    railing(P.hx0, P.z1, P.hx1, P.z1 + 0.08);
    for (let z = Z + 10; z < P.z0; z += 14) for (const x of [P.x0 + 0.4, P.x1 - 0.4]) streetLamp(b, 'lamp_small', x, z, [x < (P.x0 + P.x1) / 2 ? 1 : -1, 0]);
    for (const x of [P.hx0 + 0.5, P.hx1 - 0.5]) streetLamp(b, 'lamp_small', x, P.z1 - 1, [x < (P.hx0 + P.hx1) / 2 ? 1 : -1, 0]);
    for (const x of [-24, -8]) {
      b.box('wood:#b48a5e', x - 1.6, top + 0.42, P.z1 - 2.6, x + 1.6, top + 0.48, P.z1 - 2.1);
      b.block(x - 1.6, top, P.z1 - 2.6, x + 1.6, top + 0.48, P.z1 - 2.1);
    }
    b.sign({ k: 'label', text: MC_NAMES.pier.ja, sub: MC_NAMES.pier.en, fg: '#ffffff', bg: '#123a63' }, P.x0 - 0.1, top + 1.4, Z + 1.2, [-1, 0], 1.6, 0.4);
    b.zone('street', P.x0, -0.3, Z, P.x1, 8, P.z0, MC_NAMES.pier.ja, MC_NAMES.pier.en);
    b.zone('street', P.hx0, -0.3, P.z0, P.hx1, 8, P.z1, `${MC_NAMES.pier.ja} 先端`, `${MC_NAMES.pier.en}, the head`);
  }

  // ═════════════════════════ The tower ═════════════════════════
  at('s', SITE.tower.x, SITE.tower.line, () => {
    b.model('mcenter', 'tower', 0, GY, 0, 1);
    signAt(M.tower.pts.name, { k: 'label', text: MC_NAMES.tower.ja, sub: MC_NAMES.tower.en, fg: '#1f3550', bg: '#eef0ee' });
  });
  // Colliders: the podium's two parts (the notch is the atrium, whose own glass walls are solid).
  b.block(-44, GY, -90, 39.6, GY + 18, -26);
  b.block(39.6, GY, -90, 80, GY + 18, -50.4);
  // The forecourt: white planters with maples, between the avenue's trees and the podium's doors.
  for (const x of [-34, -14, 6, 26]) {
    b.box('panel:#ffffff', x - 2.5, GY, -24.6, x + 2.5, GY + 0.5, -21.4);
    b.deco('flat:#4a3b2c', x - 2.35, GY + 0.5, -24.45, x + 2.35, GY + 0.53, -21.55);
    modelTree(b, 'tokaede', x, -23, 'b', GY + 0.5);
  }
  b.zone('street', -44, -0.3, -26, 40, 8, BL.avN, `${MC_NAMES.tower.ja} 前広場`, `${MC_NAMES.tower.en} forecourt`);
  // (The atrium's street-level floor, named as the street so the plan sees its ground as used.)
  b.zone('street', MCA.x0, GY - 0.2, MCA.sb, MCA.x1, GY + 3, MCA.z1, 'アトリウム 1階 ガラスホール', 'Atrium glass hall, street level', true);

  // ═════════════════════════ The exhibition hall ═════════════════════════
  at('s', SITE.hall.x, SITE.hall.line, () => {
    b.model('mcenter', 'hall', 0, GY, 0, 1);
    signAt(M.hall.pts.name, { k: 'label', text: MC_NAMES.hall.ja, sub: MC_NAMES.hall.en, fg: '#1f3550', bg: '#eef0ee' });
  });
  b.block(-146, GY, -88, -80, GY + 19, -32);
  // The forecourt canopy's posts (build_mcenter.py: at x ±6, ±16, 8 m out from the front).
  for (const dx of [-16, -6, 6, 16]) b.block(SITE.hall.x + dx - 0.25, GY, SITE.hall.line + 8 - 0.25, SITE.hall.x + dx + 0.25, GY + 8.5, SITE.hall.line + 8 + 0.25);
  b.zone('street', -146, -0.3, -32, -80, 8, BL.avN, `${MC_NAMES.hall.ja} 前広場`, `${MC_NAMES.hall.en} forecourt`);

  // ═════════════════════════ The Ferris wheel ═════════════════════════
  at('n', SITE.wheel.x, SITE.wheel.line, () => {
    b.model('mcenter', 'wheel', 0, GY, 0, 1);
    signAt(M.wheel.pts.name, { k: 'label', text: MC_NAMES.wheel.ja, sub: `${MC_NAMES.wheel.en} — tickets`, fg: '#ffffff', bg: '#1f3550' });
  });
  {
    const wx = SITE.wheel.x, wz = SITE.wheel.line;
    // The boarding deck (walked up its steps), the booth, the legs' feet.
    b.box('flat:#cfcabe', wx - 9, GY, wz + 4.02, wx + 9, GY + 1.2, wz + 20, false);
    b.block(wx - 9, GY, wz + 4, wx - 3, GY + 1.2, wz + 20);
    b.block(wx + 3, GY, wz + 4, wx + 9, GY + 1.2, wz + 20);
    b.block(wx - 3, GY, wz + 6, wx + 3, GY + 1.2, wz + 20);
    b.ramp(wx - 3, wz + 2.2, wx + 3, wz + 6, GY, GY + 1.2, [0, 1]);
    b.block(wx + 10.5, GY, wz + 6, wx + 15.5, GY + 3.3, wz + 10);
    for (const sx of [-1, 1]) for (const fz of [wz + 8, wz + 16]) b.block(wx + sx * 15 - 1, GY, fz - 1, wx + sx * 15 + 1, GY + 6, fz + 1);
    b.zone('street', wx - 9, GY + 0.8, wz + 4, wx + 9, GY + 4, wz + 20, `${MC_NAMES.wheel.ja} のりば`, `${MC_NAMES.wheel.en} boarding deck`);
  }

  // ═════════════════════════ みなとデッキ, the deck across the avenue ═════════════════════════
  {
    const [x0, x1] = [D.x0, D.x1];
    // The doorway in the atrium's front at deck level (its glass was built whole in stage 1).
    b.carve(x0, DY, -FRONT - 0.15, x1, DY + 3.0, -FRONT + 0.05);
    b.box('floor:#e3e1da', x0, DY - 0.4, -FRONT, x1, DY, D.land);
    // It spans the avenue and its south pavement in one (no column in front of Exit 1): deep white box girders, stiffeners.
    b.deco(STEEL, x0 - 0.1, DY - 2.1, -FRONT, x1 + 0.1, DY - 0.4, D.land);
    for (let z = -FRONT + 1.5; z < D.land; z += 3) for (const x of [x0 - 0.14, x1 + 0.1]) b.deco('paint:#dfe3e6', x, DY - 2.1, z - 0.06, x + 0.04, DY - 0.4, z + 0.06);
    b.deco('light', x0 + 0.3, DY - 2.12, -FRONT + 1, x1 - 0.3, DY - 2.1, D.land - 1);
    // A light glass roof on slim posts, white girders under the floor, round columns on the pavements and in the park.
    b.deco('glass', x0, DY + 3.3, -FRONT, x1, DY + 3.36, D.land);
    for (const x of [x0, x1]) {
      b.deco(STEEL, x - 0.1, DY + 3.2, -FRONT, x + 0.1, DY + 3.45, D.land);
      for (let z = -FRONT + 4; z < D.land; z += 6) b.deco(STEEL, x - 0.06, DY, z - 0.06, x + 0.06, DY + 3.3, z + 0.06);
    }
    for (const z of [-15.5, D.land - 1]) for (const x of [x0 + 0.6, x1 - 0.6]) {
      b.mesh(STEEL, 'cyl', x, (GY + DY - 2.1) / 2, z, 0.38, DY - 2.1 - GY, 0.38);
      b.block(x - 0.38, GY, z - 0.38, x + 0.38, DY - 2.1, z + 0.38);
    }
    // Rails both sides and across the landing's south end; the stair leaves its east side.
    const run = Math.round((DY - GY) * 1.72 * 100) / 100, sz0 = D.land - 6.2, sz1 = D.land - 0.6;
    rail(b, x0 - 0.08, -FRONT, x0, D.land, DY);
    rail(b, x1, -FRONT, x1 + 0.08, sz0, DY);
    rail(b, x0, D.land, x1 + 0.08, D.land + 0.08, DY);
    // The stair down east into the park, its underside clad and closed.
    if (Math.abs(x1 + run - D.foot) > 0.5) throw new Error(`minatoCenterStreet: the deck stair no longer reaches its foot (${x1 + run})`);
    b.with({ rot: 2, t: [x1 + run, 0, 0] }, () => stairs(b, { x0: 0, x1: run, z0: -sz1, z1: -sz0, yLow: GY, yHigh: DY, mat: 'flat:#c9c6bd' }));
    for (let k = 0; k < 6; k++) {
      const a = x1 + (run * k) / 6, e = x1 + (run * (k + 1)) / 6, h = DY - ((DY - GY) * (k + 1)) / 6 - 0.25;
      if (h - GY < 0.3) continue;
      b.block(a, GY, sz0, e, h, sz1);
    }
    // Its underside: a white stringer following the flight, and white panels closing the space under it.
    b.slant(STEEL, x1, DY - 1.1, sz0 - 0.05, x1 + run, DY - 0.2, sz1 + 0.05, -(DY - GY));
    for (const zz of [sz0 - 0.05, sz1]) b.slant('paint:#e9ecee', x1, GY, zz, x1 + run, DY - 1.1, zz + 0.05, -(DY - GY));
    b.zone('passage', x0, DY - 0.2, -FRONT, x1, DY + 3, D.land, MC_NAMES.deck.ja, MC_NAMES.deck.en);
    b.sign({ k: 'label', text: `${MC_NAMES.deck.ja} ベイウォーク・観覧車`, sub: 'Minato Deck: to the Baywalk and the Great Wheel', fg: '#ffffff', bg: '#123a63' }, (x0 + x1) / 2, DY + 2.6, -FRONT + 0.2, [0, 1], 4.6, 0.42);
  }


  // ═════════════════════════ The fill ═════════════════════════
  // Lot table (x segments between the 筋 corridors, x −72 … −48 and 84 … 108):
  //   Avenue, west block (x −150 … −72): the exhibition hall; its loading yard behind (z −95 … −88), a planted walk
  //     beside it on Hobashira-suji (x −80 … −72), a side walk on the plot's edge.
  //   Avenue, middle block: the tower; its service lane behind (z −95 … −90), bicycle parking by the atrium (x 76 … 84).
  //   Avenue, east block (x 108 … 150): ホテル渚テラス on the avenue (z −54 … −24, its drop-off to the building line),
  //     the Bayfront office facing Hamakaze-suji (z −92 … −58), a service lane between, a yard behind.
  //   North of the Mall (z −162.5 … −115): west, coin parking on an unbuilt lot and offices back to back; middle,
  //     offices facing the Mall, the konbini, offices and ホテル港灯り on the back street, the residential tower in its
  //     garden; east, the clinic and offices. North of the back street: one row of offices and flats.
  //   Waterfront: the kōban by Exit 1, the old No. 7 warehouse (now a café and hall) with its terrace.
  const r = rng(spec.seed);
  let seed = 10;
  const n2 = (ja: string, en: string): Named => ({ ja, en });
  const piece = (kind: string, A: Anchors, id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void, solid = true) =>
    at(face, x, z, () => {
      const a = A[id];
      b.model(kind, id, 0, GY, 0, ++seed);
      if (solid) b.block(-a.w / 2, GY, 0, a.w / 2, GY + Math.max(a.h, 3), a.d);
      fn?.(a);
    });
  const label = (p0: AnchorPt | undefined, name: Named, fg = '#1f3550', bg = '#eef0ee') => { if (p0) signAt(p0, { k: 'label', text: name.ja, sub: name.en, fg, bg }); };
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], signs: 0 | 1 | 2 = 0) => {
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 3.5 || f1 - f0 < 8) return;
    b.with(FRAME[face], () => {
      const lots = fillModelLots(b, r, a, e, f0, f1 + 2.01, { noBack: true, kinds, signs });
      for (const l of lots.filter(isAlleyLot)) b.zone('street', l[0] + 0.1, -0.3, l[1], l[2] - 0.1, 6, l[3] - 0.3, '路地', 'Alley', true);
      const end = lots.length ? Math.max(...lots.map((l) => l[2])) : a;
      if (e - end >= 2.4) {
        const d = Math.min(f1 - f0, 10);
        b.deco('flat:#9a968c', end + 0.1, GY + 0.002, f0, e, GY + 0.012, f0 + d);
        b.zone('street', end + 0.1, -0.3, f0, e, 6, f0 + d - 0.1, '植え込み', 'Planted strip', true);
        for (let u = end + 1.2; u < e - 0.8; u += 3) modelTree(b, 'azalea', u, f0 + 1.2, 'a');
      }
    });
  };
  /** An open strip put to use: paved, named (so it is walked), lit. */
  const strip = (x0: number, z0: number, x1: number, z1: number, mat: string, ja: string, en: string) => {
    b.deco(mat, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    b.zone('street', x0, -0.3, z0, x1, 6, z1, ja, en, true);
  };
  const cars = (x0: number, x1: number, z: number, f: [number, number], share = 0.55) => {
    for (let x = x0 + 1.3; x < x1 - 1; x += 2.6) {
      if (r() > share) continue;
      const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
      roadModel(b, id, x, GY, z, f);
      b.block(x - wd / 2, GY, z - len / 2, x + wd / 2, GY + ht, z + len / 2);
    }
  };

  // ── Avenue, west block: around the hall ──
  strip(-150, -95, -72, -88, 'flat:#7d7a74', '展示場 搬入ヤード', 'Exhibition hall loading yard');
  for (const x of [-138, -126, -114]) {
    roadModel(b, 'truck', x, GY, -91.5, [1, 0]);
    b.block(x - 3.1, GY, -92.55, x + 3.1, GY + 2.9, -90.45);
  }
  strip(-150, -88, -146, -18, PAVE, '展示場 西通路', 'Exhibition hall, west walk');
  strip(-80, -88, -72, -18, PLAZA, '展示場 東の植え込み', 'Exhibition hall, east planting');
  for (let z = -84; z < -34; z += 9) modelTree(b, 'camphor', -76, z, 'b');
  // ── Avenue, middle block: around the tower ──
  strip(-48, -95, 84, -90, PAVE, 'タワー裏 サービス通路', 'Service lane behind the tower');
  for (let x = -40; x < 84; x += 22) streetLamp(b, 'lamp_small', x, -94.4, [0, 1]);
  strip(-48, -90, -44, -18, PAVE, 'タワー西 通路', 'Walk west of the tower');
  strip(80, -90, 84, -50.4, PAVE, 'タワー東 通路', 'Walk east of the tower');
  {
    // The bicycle park by the atrium, drinks machines at its avenue end.
    const [x0, x1, z0, z1] = [76.6, 83.8, -50, -18.4];
    b.deco('flat:#9a968c', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    for (let z = z0 + 1; z < z1 - 3.5; z += 0.62) if (r() < 0.6) b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x0 + 1.2, GY, z), yaw: -Math.PI / 2, seed: 0, merge: true });
    for (let z = z0 + 1; z < z1 - 3.5; z += 0.62) if (r() < 0.45) b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x1 - 1.2, GY, z), yaw: Math.PI / 2, seed: 0, merge: true });
    b.deco('glassTint', x0, GY + 2.5, z0, x1, GY + 2.55, z1 - 3);
    for (let z = z0 + 2; z < z1 - 3; z += 6) b.box(STEEL, (x0 + x1) / 2 - 0.08, GY, z - 0.08, (x0 + x1) / 2 + 0.08, GY + 2.5, z + 0.08);
    for (let k = 0; k < 3; k++) vending(b, x0 + 1.4 + k * 1.05, GY, z1 - 0.6, [0, 1], k % 2 ? 'vending2' : 'vending', 'new');
    b.zone('street', x0, -0.3, z0, x1, 6, z1, 'みなとセンター駅 自転車駐車場', 'Minato Center Sta. bicycle park', true);
  }
  // ── Avenue, east block: the bay hotel and the Bayfront office ──
  piece('mcenter', M, 'hotel', 's', 129, -24, (a) => {
    label(a.pts.name, MC_NAMES.hotelB, '#ffffff', '#1f3550');
    label(a.pts.plate, MC_NAMES.hotelB);
  });
  for (const x of [117, 141]) b.block(x - 0.3, GY, -19.3, x + 0.3, GY + 5.2, -18.7);
  strip(108, -24, 150, -18, PLAZA, `${MC_NAMES.hotelB.ja} 車寄せ`, `${MC_NAMES.hotelB.en} drop-off`);
  for (const x of [123, 135]) { roadModel(b, 'taxi', x, GY, -21, [1, 0]); b.block(x - 2.3, GY, -21.85, x + 2.3, GY + 1.55, -20.15); }
  piece('mcenter', M, 'office', 'w', 108, -75, (a) => {
    label(a.pts.name, MC_NAMES.office);
    label(a.pts.plate, MC_NAMES.office, '#1f3550', '#f4f1e8');
    label(a.pts.shop, n2('カフェ ベイフロント', 'Café Bayfront'), '#ffffff', '#2f4a3a');
  });
  strip(108, -58, 150, -54, PAVE, 'ホテル裏 通路', 'Lane behind the hotel');
  strip(144, -92, 150, -58, 'flat:#7d7a74', 'ベイフロントビル 裏', 'Yard behind the Bayfront Building');
  strip(108, -95, 150, -92, PAVE, 'ベイフロントビル 北通路', 'Walk north of the Bayfront Building');

  // ── North of the Mall ──
  const NZ0 = BL.kiS, NZ1 = BL.mallN; // −162.5 … −115
  // West: coin parking on a lot still waiting for its tower, offices back to back.
  {
    const [x0, x1] = [-150, -112];
    b.deco('asphalt', x0, GY + 0.002, NZ0, x1, GY + 0.012, NZ1);
    for (const zc of [NZ0 + 6, NZ1 - 6, (NZ0 + NZ1) / 2]) {
      for (let x = x0 + 2.6; x < x1 - 0.5; x += 2.6) b.deco(WHITE, x - 0.05, GY + 0.012, zc - 2.5, x + 0.05, GY + 0.018, zc + 2.5);
      cars(x0, x1, zc, [0, 1]);
    }
    b.box('metal:#9aa0a6', x0, GY, NZ1 - 0.1, x1, GY + 0.9, NZ1);
    b.sign({ k: 'label', text: 'コインパーキング', sub: 'Coin parking, 24 h', fg: '#1c1c1e', bg: '#f2c200' }, x1 - 1.4, GY + 2.6, NZ0 + 0.6, [0, -1], 2.4, 0.6);
    b.box('metal:#8d9094', x1 - 1.46, GY, NZ0 + 0.54, x1 - 1.34, GY + 2.95, NZ0 + 0.66);
    b.zone('street', x0, -0.3, NZ0, x1, 6, NZ1, 'コインパーキング', 'Coin parking', true);
    streetLamp(b, 'lamp_small', (x0 + x1) / 2, NZ0 + 0.6, [0, 1]);
    fillRect(x1 + 0.2, NZ1 - 22, -72.2, NZ1, 's', ['office'], 1);
    fillRect(x1 + 0.2, NZ0, -72.2, NZ1 - 24, 'n', ['office', 'manshon'], 1);
  }
  // Middle: the konbini, offices and the business hotel on the back street; offices on the Mall; the residential
  // tower in its garden.
  {
    at('n', -40.8, NZ0, () => konbini(b, { type: 'corner', chain: 'maruhoshi' }));
    fillRect(-33.6, NZ0, -8.3, NZ0 + 21, 'n', ['office'], 1);
    piece('mcenter', M, 'bhotel', 'n', 0, NZ0, (a) => {
      label(a.pts.name, MC_NAMES.bhotel, '#ffffff', '#2a3a52');
      if (a.pts.blade) b.sign({ k: 'shop', ja: MC_NAMES.bhotel.ja, en: 'HOTEL', bg: '#2a3a52', fg: '#ffffff', vertical: true }, a.pts.blade[0], a.pts.blade[1] + GY, a.pts.blade[2], [a.pts.blade[5], a.pts.blade[6]], a.pts.blade[3], a.pts.blade[4]);
    });
    fillRect(8.3, NZ0, 43.8, NZ0 + 21, 'n', ['office'], 1);
    fillRect(-47.8, NZ1 - 22, 43.8, NZ1, 's', ['office'], 1);
    piece('mcenter', M, 'resi', 's', 64, NZ1, (a) => label(a.pts.name, MC_NAMES.resi));
    // The tower's garden: lawn, trees, a path to the back street.
    b.box('flat:#b9b4a8', 44.4, GY, NZ0 + 0.4, 83.6, GY + 0.35, NZ1 - 31);
    b.deco(LAWN, 44.55, GY + 0.35, NZ0 + 0.55, 83.45, GY + 0.37, NZ1 - 31.15);
    for (const [x, z] of [[48, -158], [58, -155], [70, -158], [80, -152], [50, -150], [76, -159]] as [number, number][]) modelTree(b, x > 60 ? 'cherry' : 'dogwood', x, z, 'b', GY + 0.35);
    b.zone('street', 44.2, -0.3, NZ0, 83.8, 6, NZ1 - 30, `${MC_NAMES.resi.ja} 庭`, `${MC_NAMES.resi.en} garden`, true);
    for (const [x0, x1] of [[44, 49], [79, 84]] as [number, number][]) strip(x0, NZ1 - 30, x1, NZ1, PAVE, `${MC_NAMES.resi.ja} 前庭`, `${MC_NAMES.resi.en} forecourt`);
  }
  // East: the clinic and pharmacy, offices.
  {
    piece('civic', CIVIC, 'b14', 's', 115.2, NZ1, (a) => {
      label(a.pts.name, MC_NAMES.clinic, '#ffffff', '#1d8a4e');
      label(a.pts.plate, MC_NAMES.clinic, '#e8e6df', '#55585c');
    });
    fillRect(122.6, NZ1 - 22, 149.8, NZ1, 's', ['office'], 1);
    fillRect(108.2, NZ0, 149.8, NZ0 + 20.5, 'n', ['office', 'manshon'], 1);
  }
  // North of the back street: one row to the plot's edge.
  // Between the back-to-back rows: a paved walk through each block from 筋 to 筋, named in short lengths.
  for (const [a, e] of [[-112, -72], [-48, 44], [122.4, 150], [108, 122.4]] as [number, number][]) {
    const z0 = NZ0 + 9, z1 = a === 108 ? NZ1 - 26 : NZ1 - 12;
    b.deco(PAVE, a, GY + 0.002, z0, e, GY + 0.012, z1);
    const k = Math.ceil((e - a) / 30);
    for (let i = 0; i < k; i++) b.zone('street', a + ((e - a) * i) / k, -0.3, z0, a + ((e - a) * (i + 1)) / k, 6, z1, '裏通路', `Back walk ${Math.round(a + ((e - a) * (i + 0.5)) / k)}`, true);
  }
  // North of the back street: one row, a service lane behind it along the plot's edge (in from the 筋).
  for (const [a, e] of [[-150, -72], [-48, 84], [108, 150]] as [number, number][]) {
    fillRect(a + 0.2, -N + 6.2, e - 0.2, BL.kiN, 's', ['office', 'manshon'], 1);
    b.deco(PAVE, a, GY + 0.002, -N, e, GY + 0.012, -N + 6);
    // (Named in short lengths, as a lane is: the walk test reaches only as far as its narrow places.)
    const k = Math.ceil((e - a) / 30);
    for (let i = 0; i < k; i++) b.zone('street', a + ((e - a) * i) / k, -0.3, -N, a + ((e - a) * (i + 1)) / k, 6, -N + 6, 'センター北通 裏路地', `Lane behind Sentā-kita-dōri ${Math.round(a + ((e - a) * (i + 0.5)) / k)}`, true);
    for (let x = a + 8; x < e - 2; x += 20) streetLamp(b, 'lamp_small', x, -N + 0.5, [0, 1]);
  }

  // ── The waterfront: the kōban by Exit 1, the old No. 7 warehouse ──
  at('n', 26, BL.avS, () => place(b, { kind: 'koban', ja: 'みなとセンター駅前交番', en: 'Minato Center Sta. Police Box' }));
  piece('mcenter', M, 'soko', 'n', 112, 22, (a) => {
    label(a.pts.name, MC_NAMES.soko, '#f1e6cf', '#5a2a1e');
  });
  strip(86, 40, 138, 44, PAVE, `${MC_NAMES.soko.ja} 裏`, `${MC_NAMES.soko.en}, behind`);
  strip(86, BL.avS, 138, 22, PLAZA, `${MC_NAMES.soko.ja} テラス`, `${MC_NAMES.soko.en} terrace`);
  for (const x of [92, 97, 127, 132]) {
    b.box('wood:#8a6a4a', x - 0.5, GY + 0.72, 19.5, x + 0.5, GY + 0.76, 20.5);
    b.deco(DARKP, x - 0.04, GY, 19.96, x + 0.04, GY + 0.72, 20.04);
    b.block(x - 0.5, GY, 19.5, x + 0.5, GY + 0.76, 20.5);
    b.deco('flat:#f4f1e6', x - 1.2, GY + 2.4, 18.8, x + 1.2, GY + 2.45, 21.2);
    b.deco(DARKP, x - 0.03, GY + 0.76, 19.97, x + 0.03, GY + 2.4, 20.03);
  }


  // ═════════════════════════ Props (stage 4) ═════════════════════════
  // A new town's dress: tidy and sparse on the avenue, gathered where people stop (the forecourts, the Mall, the
  // Baywalk, the bus stops); back-of-house only on the back street and in the yards.
  {
    /** A road-set prop with its collider (half widths along its own front and depth). */
    const prop = (id: string, x: number, z: number, f: [number, number], hw: number, hd: number, h: number, y = GY) => {
      roadModel(b, id, x, y, z, f);
      const [ax, az] = f[0] !== 0 ? [hd, hw] : [hw, hd];
      b.block(x - ax, y, z - az, x + ax, y + h, z + az);
    };
    const bench = (x: number, z: number, f: [number, number], y = GY) => prop('bench_s', x, z, f, 0.9, 0.3, 0.5, y);
    /** An mcenter piece turned to face f. */
    const mc = (id: string, x: number, z: number, face: Face, hw: number, hd: number, h: number) => {
      at(face, x, z, () => b.model('mcenter', id, 0, GY, 0, ++seed));
      const [ax, az] = face === 'e' || face === 'w' ? [hd, hw] : [hw, hd];
      b.block(x - ax, GY, z - az, x + ax, GY + h, z + az);
    };

    // The avenue: maps by the exits, finger posts at the corners, bins at the bus stops, a post box and a phone box.
    prop('mapstand', 33.5, 16.8, [0, -1], 0.6, 0.2, 2.2);
    prop('mapstand', 37.5, -16.9, [0, 1], 0.6, 0.2, 2.2);
    prop('fingerpost', -84.5, -19.2, [0, 1], 0.15, 0.15, 3.0);
    prop('fingerpost', 110.5, -19.4, [0, 1], 0.15, 0.15, 3.0);
    prop('recycle', -28.5, 16.9, [0, -1], 0.6, 0.25, 1.0);
    prop('recycle', 125.5, -16.9, [0, 1], 0.6, 0.25, 1.0);
    prop('postbox', -40.5, -19.0, [0, 1], 0.25, 0.25, 1.3);
    prop('phonebox', 33.5, 20.2, [0, -1], 0.5, 0.5, 2.3);

    // The tower's forecourt: the wave sculpture between the planters, benches facing the avenue.
    mc('sculpt', -4, -21.4, 's', 2.2, 1.4, 4.7);
    for (const x of [-34, -14, 6, 26]) bench(x, -20.6, [0, 1]);
    b.sign({ k: 'label', text: '波の門', sub: 'Gate of Waves (2001)', fg: '#1f3550', bg: '#e9e6dc' }, -4, GY + 0.25, -20.0, [0, 1], 0.8, 0.22);
    // The hall's forecourt: event banners along its front, benches, a map.
    for (let x = -143; x < -82; x += 4) if (Math.abs(x - (-113)) > 9) prop('nobori', x, -18.8, [0, 1], 0.1, 0.1, 2.6);
    for (const x of [-141, -86]) bench(x, -29.6, [0, 1]);
    prop('mapstand', -84, -26, [0, 1], 0.6, 0.2, 2.2);
    // The hotel's door: potted pines either side; the Bayfront office's café: an A-board and a menu case.
    for (const x of [124.6, 133.4]) prop('potpine', x, -25.0, [0, 1], 0.45, 0.45, 1.6);
    prop('aboard', 106.4, -64.5, [-1, 0], 0.3, 0.25, 1.0);
    prop('menucase', 107.6, -66.2, [-1, 0], 0.35, 0.15, 1.5);

    // The Mall: benches on the lawns' edges facing the walk, a clock at the middle, bicycle racks by the crossings.
    mallRuns.forEach(([a, e]) => {
      for (let x = a + 16; x < e - 6; x += 16) {
        bench(x, MZ - 3.2, [0, 1]);
        bench(x, MZ + 3.2, [0, -1]);
      }
    });
    b.out.models.push({ kind: 'places', id: 'clockpost', pos: b.pt(18, GY, MZ), yaw: 0, seed: 0, merge: true });
    b.block(17.8, GY, MZ - 0.2, 18.2, GY + 3.5, MZ + 0.2);
    for (const x of [-44.5, 80.5]) prop('bikerack', x, BL.mallN + 1.2, [0, 1], 1.25, 0.3, 0.9);

    // The waterfront: lifebuoys on the sea wall, telescopes on the pier head, drinks machines by the wheel's booth,
    // the kōban's bicycle.
    for (const x of [-129, -93, -57, 15, 51, 87, 123]) mc('buoy', x, Z - 0.6, 'n', 0.45, 0.15, 2.1);
    for (const x of [-22, -16, -10]) mc('scope', x, P.z1 - 0.7, 's', 0.25, 0.4, 1.5);
    for (let k = 0; k < 2; k++) vending(b, -92.5 + k * 1.05, GY, SITE.wheel.line + 2.8, [0, -1], k ? 'vending2' : 'vending', 'new');
    b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(30.6, GY, 19.4), yaw: 0, seed: 0, merge: true });

    // Back of house: a delivery van in the hall's yard, a kei van behind the tower, garbage stations on the back street,
    // bicycle racks by the konbini, benches in the residence's garden.
    prop('van_s', -100, -91.5, [1, 0], 2.4, 0.86, 1.95);
    prop('kei_v', 12, -92.5, [1, 0], 1.7, 0.74, 1.8);
    for (const x of [-102, -20, 126]) prop('gomist', x, BL.kiS - 0.9, [0, -1], 1.0, 0.6, 1.2);
    prop('bikerack', -30.5, BL.kiS - 0.7, [0, -1], 1.25, 0.3, 0.9);
    for (const [x, z] of [[54, -152], [70, -149]] as [number, number][]) bench(x, z, [0, 1], GY + 0.35);
  }

  // ═════════════════════════ The peninsula (walked arms west and north of the plot, 2026-11-25) ═════════════════════════
  //   西浜通 Nishihama-dōri, the shore road, x −305 (24 m, four lanes) from the avenue north to Hama-dōri, the
  //   西浜プロムナード along the open sea behind it, 渚の岬公園 on the point with its lookout.
  //   新潮臨港通 (Shinshio's bay road, z −400, 35 m) and 浜通 Hama-dōri (z −466) carried west from Shinshio's connector
  //   (x 214) to the shore road; みなと中通 (z −285, two lanes) between; the 筋 run north to Hama-dōri. Behind Hama-dōri
  //   the river-mouth promenade, the marina's pontoons and the water-bus landing.
  //   Landmarks: みなとコンベンションセンター on the avenue west of the hall; ホテル汐路リゾート on the shore road;
  //   the marina clubhouse and the water-bus terminal on the river mouth. Other lots bare until the fill.
  {
    const W0 = PEN.wsh, N0 = PEN.nsh, CE = PEN.ce, SR = PEN.sr, MD = PEN.md, BR = PEN.br, HM = PEN.hm, CN = PEN.cn, S3 = PEN.s3;
    const srE = PEN.srE, srW = PEN.srW, hmN = HM.c - HM.half - HM.pave, hmS = HM.c + HM.half + HM.pave;
    const n3 = (ja: string, en: string): Named => ({ ja, en });

    // ── Ground: both arms, the carriageways cut out; pavements; the sea walls round the point and the river mouth ──
    const carrPen: Rect[] = [
      [SR.c - SR.half, HM.c - HM.half, SR.c + SR.half, -AV.half],
      [SR.c - SR.half, -AV.half, -X, AV.half],
      [SR.c - SR.half, KI.c - KI.half, -X, KI.c + KI.half],
      [SR.c - SR.half, MD.c - MD.half, CE, MD.c + MD.half],
      [SR.c - SR.half, BR.c - BR.half, CE, BR.c + BR.half],
      [SR.c - SR.half, HM.c - HM.half, CE, HM.c + HM.half],
      ...NS.map((st): Rect => [st.c - st.half, HM.c - HM.half, st.c + st.half, -N]),
      [S3.c - S3.half, HM.c - HM.half, S3.c + S3.half, -AV.half],
    ];
    for (const [x0, z0, x1, z1] of [[W0, N0, -X, Z], [-X, N0, CE, -N]] as Rect[]) {
      b.slab('asphalt', x0, z0, x1, z1, -0.6, 0, []);
      b.slab(BARE, x0, z0, x1, z1, 0, GY, carrPen);
    }
    const pv = (x0: number, z0: number, x1: number, z1: number, mat = PAVE) => b.slab(mat, x0, z0, x1, z1, GY + 0.002, GY + 0.014, carrPen, false);
    pv(srE, BL.avN, -X, -AV.half);
    pv(srW, AV.half, -X, BL.avS);
    pv(srW, hmN, SR.c - SR.half, BL.avS);
    pv(SR.c + SR.half, hmS, srE, BL.avN);
    for (const st of [KI, MD, BR, HM]) {
      const x1 = st === KI ? -X : CE;
      pv(srE, st.c - st.half - st.pave, x1, st.c - st.half);
      pv(srE, st.c + st.half, x1, st.c + st.half + st.pave);
    }
    pv(srW, hmN, srE, hmS);
    for (const st of NS) pv(st.c - st.half - st.pave, hmS, st.c + st.half + st.pave, -N);
    pv(S3.c - S3.half - S3.pave, hmS, S3.c + S3.half + S3.pave, BL.avN);
    // The west promenade (a walk on the sea wall, a lawn strip), the river-mouth promenade and its strip.
    b.slab(WALK, W0, hmN, W0 + 8, BL.avS, GY + 0.002, GY + 0.016, [], false);
    b.slab(PLAZA, W0 + 8, hmN, srW, BL.avS, GY + 0.002, GY + 0.014, [], false);
    b.slab(WALK, W0, N0, CE, PEN.prom, GY + 0.002, GY + 0.016, [], false);
    b.slab(PLAZA, W0, PEN.prom, CE, hmN, GY + 0.002, GY + 0.014, [], false);
    b.deco(STONE, W0 - 0.6, -0.4, N0 - 0.6, W0, GY + 0.02, Z + 0.6);
    b.deco(STONE, W0 - 0.6, -0.4, N0 - 0.6, CE + 8, GY + 0.02, N0);
    const MAR = { x0: -212, x1: -88, z1: -530, gang: [-154, -146] as [number, number] };
    const WB = { x0: 136, x1: 144, hx0: 128, hx1: 154, z0: -516, z1: -522 };
    const seaRail = (axis: 'x' | 'z', at: number, a: number, e: number) => {
      const [x0, z0, x1, z1] = axis === 'x' ? [a, at - 0.1, e, at] : [at, a, at + 0.1, e];
      b.deco('metal:#5d666c', x0, GY + 1.0, z0, x1, GY + 1.06, z1);
      for (let u = a + 1; u < e; u += 2.5) (axis === 'x' ? b.deco('metal:#5d666c', u - 0.03, GY, z0, u + 0.03, GY + 1.0, z1) : b.deco('metal:#5d666c', x0, GY, u - 0.03, x1, GY + 1.0, u + 0.03));
      b.block(x0 - (axis === 'z' ? 1 : 0), -1, z0 - (axis === 'x' ? 1 : 0), x1, GY + 1.1, z1);
    };
    seaRail('z', W0, N0 + 0.1, Z - 0.1);
    for (const [a, e] of [[W0 + 0.1, MAR.gang[0]], [MAR.gang[1], WB.x0], [WB.x1, CE]] as [number, number][]) seaRail('x', N0 + 0.1, a, e);
    // The arms' outer edge to the east: Shinshio's connector road beyond (only seen).
    b.block(CE, -1, N0, CE + 1, 60, -N);
    b.zone('street', W0, -0.3, BL.avS, srW, 8, Z, n3('渚の岬公園 西', '').ja, 'Nagisa Point Park, west');
    b.zone('street', W0, -0.3, hmN, srW, 8, BL.avS, MC_NAMES.westWalk.ja, MC_NAMES.westWalk.en);
    b.zone('street', W0, -0.3, N0, CE, 8, hmN, MC_NAMES.northWalk.ja, MC_NAMES.northWalk.en);
    b.zone('street', W0, -0.3, hmN, CE, 120, -N, `${sta.nameJa} 北部`, `${sta.nameRomaji} — north side`);
    b.zone('street', W0, -0.3, -N, -X, 120, Z, `${sta.nameJa} 西部`, `${sta.nameRomaji} — west side`);

    // ── Paint ──
    const corrX: [number, number][] = [[srW, srE], s3Corr, ...nsCorr, [CN.c - CN.half - CN.pave, CN.c + CN.half + CN.pave]];
    const corrZ: [number, number][] = [...[AV, KI, MD, BR, HM].map((st): [number, number] => [st.c - st.half - st.pave, st.c + st.half + st.pave]), mallCorr];
    const bX = corrX.map(([p0, q0]): [number, number] => [p0 - 7, q0 + 7]), bZ = corrZ.map(([p0, q0]): [number, number] => [p0 - 7, q0 + 7]);
    for (const k of [-1, 1]) {
      dash('x', k * 4.0, srE, -X, bX);
      dash('x', k * 7.25, srE, -X, bX);
      line('x', k * 0.75, srE, -X, bX, YELLOW, 0.06);
      line('x', k * (BR.half - 1.0) + BR.c, srE, CE, bX);
      line('x', BR.c + k * 1.0, srE, CE, bX, YELLOW, 0.06);
      dash('x', BR.c + k * 4.5, srE, CE, bX);
      dash('z', SR.c + k * 3.5, hmS, BL.avN, bZ);
    }
    line('z', SR.c, hmS, BL.avN, bZ, YELLOW, 0.06);
    line('z', S3.c, hmS, BL.avN, bZ, YELLOW, 0.06);
    for (const k of [-1, 1]) dash('z', S3.c + k * 3.5, hmS, BL.avN, bZ);
    dash('x', KI.c, srE, -X, bX);
    dash('x', MD.c, srE, CE, bX);
    dash('x', HM.c, srE, CE, bX);

    // ── Junctions: a signal wherever two streets with traffic meet ──
    type Arms = { n?: boolean; s?: boolean; e?: boolean; w?: boolean };
    const jn = (cx: number, hx: number, cz: number, hz: number, arm: Arms, name: Named, style: PoleStyle = 'new') => {
      for (const [k, sz] of [['n', -1], ['s', 1]] as const) if (arm[k]) {
        const zc = cz + sz * (hz + 2.6);
        crosswalk(b, cx, zc, 2 * hx - 0.4, 4, false);
        for (const sx of [-1, 1] as const) pedSignal(b, cx + sx * (hx + 0.8), zc + sz * 2.4, [-sx, 0], 0, { flat: true, speaker: true });
      }
      for (const [k, sx] of [['w', -1], ['e', 1]] as const) if (arm[k]) {
        const xc = cx + sx * (hx + 2.6);
        crosswalk(b, xc, cz, 2 * hz - 0.4, 4, true);
        for (const sz of [-1, 1] as const) pedSignal(b, xc + sx * 2.4, cz + sz * (hz + 0.8), [0, -sz], 1, { flat: true, speaker: true });
      }
      // Heads on the far side for the traffic coming in from each arm (keep left).
      for (const [k, sx] of [['w', 1], ['e', -1]] as const) if (arm[k]) {
        const lz = -sx, xs = cx - sx * (hx + SL);
        b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
        vehicleSignal(b, cx + sx * (hx + 1.9), cz + lz * (hz + 1.5), [sx, 0], hz > 6 ? 6.5 : 3.5, 0, name, { style, back: false });
      }
      for (const [k, sz] of [['n', 1], ['s', -1]] as const) if (arm[k]) {
        const lx = sz, zs = cz - sz * (hz + SL), far = sz > 0 ? arm.s : arm.n;
        b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
        vehicleSignal(b, cx + lx * (hx + 1.6), cz + sz * (hz + (far ? 2.0 : 0.75)), [0, sz], hx > 6 ? 6.5 : 3.5, 1, name, { style, back: false });
      }
      roadModel(b, 'sigbox', cx - hx - 2.6, GY, cz + (arm.n ? -hz - 3.2 : hz + 2.2), [0, 1]);
      b.block(cx - hx - 2.96, GY, cz + (arm.n ? -hz - 3.2 : hz + 2.2) - 0.26, cx - hx - 2.24, GY + 1.56, cz + (arm.n ? -hz - 3.2 : hz + 2.2) + 0.26);
    };
    jn(SR.c, SR.half, AV.c, AV.half, { n: true, e: true }, n3('岬公園前', 'Misaki-kōen-mae'), 'long');
    jn(SR.c, SR.half, KI.c, KI.half, { n: true, s: true, e: true }, n3('西浜センター北', 'Nishihama Sentā-kita'));
    jn(SR.c, SR.half, MD.c, MD.half, { n: true, s: true, e: true }, n3('西浜中通', 'Nishihama-nakadōri'));
    jn(SR.c, SR.half, BR.c, BR.half, { n: true, s: true, e: true }, n3('西浜臨港', 'Nishihama-rinkō'), 'long');
    jn(SR.c, SR.half, HM.c, HM.half, { s: true, e: true }, n3('西浜浜通', 'Nishihama-hamadōri'));
    jn(S3.c, S3.half, AV.c, AV.half, { n: true, e: true, w: true }, n3('コンベンションセンター前', 'Convention Center-mae'), 'long');
    jn(S3.c, S3.half, KI.c, KI.half, { n: true, s: true, e: true, w: true }, n3('展示場筋北', 'Tenjijō-suji-kita'));
    jn(S3.c, S3.half, MD.c, MD.half, { n: true, s: true, e: true, w: true }, n3('展示場筋中通', 'Tenjijō-suji-nakadōri'));
    jn(S3.c, S3.half, BR.c, BR.half, { n: true, s: true, e: true, w: true }, n3('展示場筋臨港', 'Tenjijō-suji-rinkō'), 'long');
    jn(S3.c, S3.half, HM.c, HM.half, { s: true, e: true, w: true }, n3('展示場筋浜', 'Tenjijō-suji-hama'));
    for (const [st, nm] of [[HO, '帆柱筋'], [HK, '浜風筋']] as const) {
      const ro = st === HO ? 'Hobashira-suji' : 'Hamakaze-suji';
      jn(st.c, st.half, MD.c, MD.half, { n: true, s: true, e: true, w: true }, n3(`${nm}中通`, `${ro}-nakadōri`));
      jn(st.c, st.half, BR.c, BR.half, { n: true, s: true, e: true, w: true }, n3(`${nm}臨港`, `${ro}-rinkō`), 'long');
      jn(st.c, st.half, HM.c, HM.half, { s: true, e: true, w: true }, n3(`${nm}浜`, `${ro}-hama`));
    }
    // The connector's junctions on the arms' east edge (its far side is Shinshio's).
    jn(CN.c, CN.half, MD.c, MD.half, { n: true, s: true, w: true, e: true }, n3('新潮連絡道中通', 'Renraku-dō-nakadōri'));
    jn(CN.c, CN.half, BR.c, BR.half, { n: true, s: true, w: true, e: true }, n3('新潮連絡道臨港', 'Renraku-dō-rinkō'), 'long');
    jn(CN.c, CN.half, HM.c, HM.half, { s: true, w: true, e: true }, n3('新潮連絡道浜', 'Renraku-dō-hama'));
    // The Mall's crossings over the shore road and 展示場筋, as over the 筋.
    crosswalk(b, S3.c, MZ, 2 * S3.half - 0.4, 8, false);
    for (const sx of [-1, 1] as const) for (const sz of [-1, 1] as const) pedSignal(b, S3.c + sx * (S3.half + 0.8), MZ + sz * 3.6, [-sx, 0], 0, { flat: true, speaker: true });
    for (const sz of [1, -1] as const) {
      const zs = MZ - sz * 6;
      b.deco(WHITE, Math.min(S3.c, S3.c + sz * (S3.half - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(S3.c, S3.c + sz * (S3.half - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      shortSignal(b, S3.c + sz * (S3.half + 1.5), MZ - sz * 4.6, [0, sz], 1, n3('モール公園展示場口', 'Mōru-kōen-tenjijōguchi'));
    }
    crosswalk(b, SR.c, MZ, 2 * SR.half - 0.4, 8, false);
    for (const sx of [-1, 1] as const) for (const sz of [-1, 1] as const) pedSignal(b, SR.c + sx * (SR.half + 0.8), MZ + sz * 3.6, [-sx, 0], 0, { flat: true, speaker: true });
    for (const sz of [1, -1] as const) {
      const zs = MZ - sz * 6;
      b.deco(WHITE, Math.min(SR.c, SR.c + sz * (SR.half - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(SR.c, SR.c + sz * (SR.half - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      shortSignal(b, SR.c + sz * (SR.half + 1.5), MZ - sz * 4.6, [0, sz], 1, n3('モール公園西口', 'Mōru-kōen-nishiguchi'));
    }
    b.slab(PLAZA, srW, BL.mallN, SR.c - SR.half, BL.mallS, GY + 0.002, GY + 0.016, carrPen, false);

    // ── Traffic ──
    const bigP = { speed: 50, flow: 0.8, use: 'general' as const }, midP = { speed: 40, flow: 0.5, use: 'general' as const }, smallP = { speed: 30, flow: 0.3, use: 'general' as const };
    for (const z of [2.75, 6.25]) {
      lane(bigP, SR.c + SR.half + 1, BR.c - z, CE, BR.c - z, { dead: true, closed: ['from', 'to'] });
      lane(bigP, CE, BR.c + z, SR.c + SR.half + 1, BR.c + z, { dead: true, closed: ['from', 'to'] });
    }
    for (const st of [MD, HM]) {
      lane(st === MD ? midP : smallP, SR.c + SR.half + 1, st.c - 1.6, CE, st.c - 1.6, { dead: true, closed: ['from', 'to'] });
      lane(st === MD ? midP : smallP, CE, st.c + 1.6, SR.c + SR.half + 1, st.c + 1.6, { dead: true, closed: ['from', 'to'] });
    }
    for (const d of [1.75, 5.25]) {
      lane(midP, S3.c + d, HM.c + HM.half + 1, S3.c + d, AV.c - 1, { dead: true, closed: ['from'] });
      lane(midP, S3.c - d, -AV.half - 1, S3.c - d, HM.c + HM.half + 1, { dead: true, closed: ['to'] });
    }
    for (const d of [1.75, 5.25]) {
      lane(midP, SR.c + d, HM.c + HM.half + 1, SR.c + d, -AV.half - 1, { dead: true, closed: ['from', 'to'] });
      lane(midP, SR.c - d, -AV.half - 1, SR.c - d, HM.c + HM.half + 1, { dead: true, closed: ['from', 'to'] });
    }

    // ── Lamps, trees, boards, wires ──
    const nsCorrPen: [number, number][] = [[SR.c - SR.half, SR.c + SR.half], [S3.c - S3.half, S3.c + S3.half], ...carrX, [CN.c - CN.half, CN.c + CN.half]];
    lampAt(srE, -X, nsCorrPen, 17).forEach((x) => { for (const k of [-1, 1]) streetLamp(b, 'lamp_led', x, k * (AV.half + 0.7), [0, -k]); });
    lampAt(srE, -X, nsCorrPen, 24).forEach((x) => streetLamp(b, 'lamp_small', x, KI.c + KI.half + 0.45, [0, -1]));
    poleLine(b, { axis: 'x', from: srE + 4, to: -X - 2, at: KI.c - KI.half - 0.4, road: 1, step: 26, skip: (u) => !clearOf(u, nsCorrPen, 7), drops: 0.7, cross: 2 * KI.half + KI.pave + 0.4, name: { ja: sta.nameJa, en: sta.nameRomaji } });
    lampAt(srE, CE, nsCorrPen, 18).forEach((x, k) => { for (const z of [BR.c - BR.half - 0.7, BR.c + BR.half + 0.7]) streetLamp(b, 'lamp_led', x + (k % 2) * 0, z, [0, z < BR.c ? 1 : -1]); });
    lampAt(srE, CE, nsCorrPen, 20).forEach((x, k) => streetLamp(b, 'lamp_led', x, MD.c + (k % 2 ? 1 : -1) * (MD.half + 0.5), [0, k % 2 ? -1 : 1]));
    // Hama-dōri keeps its wires, as on Shinshio's side: a pole line on the north kerb, plain lamps on the south.
    poleLine(b, { axis: 'x', from: srE + 4, to: CE - 3, at: HM.c - HM.half - 0.4, road: 1, step: 26, skip: (u) => !clearOf(u, nsCorrPen, 7), drops: 0.7, cross: 2 * HM.half + HM.pave + 0.4, name: { ja: sta.nameJa, en: sta.nameRomaji } });
    lampAt(srE, CE, nsCorrPen, 24).forEach((x) => streetLamp(b, 'lamp_small', x, HM.c + HM.half + 0.45, [0, -1]));
    lampAt(hmS, BL.avN, corrZ.map(([p0, q0]): [number, number] => [p0 + 3, q0 - 3]), 16).forEach((z, k) => streetLamp(b, 'lamp_led', S3.c + (k % 2 ? 1 : -1) * (S3.half + 0.6), z, [k % 2 ? -1 : 1, 0]));
    for (let z = hmS + 10; z < BL.avN - 6; z += 12) if (clearOf(z, corrZ, 6)) for (const k of [-1, 1]) modelTree(b, 'ginkgo', S3.c + k * (S3.half + 2.5), z, 'b', GY, true);
    roadName(b, S3.c + S3.half + S3.pave - 0.6, BL.avN - 10, [-1, 0], MC_NAMES.s3);
    lampAt(hmS, BL.avN, corrZ.map(([p0, q0]): [number, number] => [p0 + 3, q0 - 3]), 18).forEach((z, k) => streetLamp(b, 'lamp_led', SR.c + (k % 2 ? 1 : -1) * (SR.half + 0.6), z, [k % 2 ? -1 : 1, 0]));
    for (let x = srE + 8; x < CE - 4; x += 16) {
      if (!clearOf(x, corrX, 5)) continue;
      for (const z of [BR.c - BR.half - 2.2, BR.c + BR.half + 2.2]) modelTree(b, 'pine', x, z, 'b', GY, true);
      modelTree(b, 'ginkgo', x + 8, MD.c - MD.half - 1.6, 'b', GY, true);
    }
    for (let x = srE + 8; x < -X - 4; x += 12) if (clearOf(x, corrX, 5)) for (const k of [-1, 1]) modelTree(b, 'zelkova', x, k * (AV.half + 2.0), 'b', GY, true);
    for (let z = hmS + 8; z < BL.avN - 4; z += 14) if (clearOf(z, corrZ, 5)) modelTree(b, 'pine', srW + 2.2, z, 'b', GY, true);
    // Along the west promenade: pines on its lawn strip, harbour lamps, benches facing the sea.
    for (let z = hmN + 8; z < BL.avS - 4; z += 18) {
      streetLamp(b, 'lamp_small', W0 + 8.4, z, [-1, 0]);
      modelTree(b, 'pine', W0 + 11.2, z + 9, 'b', GY);
      b.box('wood:#b48a5e', W0 + 1.7, GY + 0.42, z + 3, W0 + 2.2, GY + 0.48, z + 6.2);
      b.block(W0 + 1.7, GY, z + 3, W0 + 2.2, GY + 0.48, z + 6.2);
    }
    for (let x = W0 + 12; x < CE - 6; x += 18) {
      if (x > MAR.gang[0] - 3 && x < MAR.gang[1] + 3) continue;
      if (x > WB.x0 - 3 && x < WB.x1 + 3) continue;
      streetLamp(b, 'lamp_small', x, PEN.prom - 0.4, [0, -1]);
    }
    roadName(b, srE + 0.6, BL.avN - 10, [1, 0], MC_NAMES.sr);
    roadName(b, srE + 2, BR.c - BR.half - BR.pave + 0.6, [0, 1], MC_NAMES.br);
    roadName(b, srE + 2, MD.c - MD.half - MD.pave + 0.6, [0, 1], MC_NAMES.md);
    roadName(b, srE + 2, HM.c + HM.half + HM.pave - 0.6, [0, -1], MC_NAMES.hm);

    // ── 渚の岬公園, the point: lawns and pines round the lookout, the Baywalk carried round to the west promenade ──
    for (const [a0, a1] of [[W0 + 10, -230], [-222, -160]] as [number, number][]) {
      b.box('flat:#b9b4a8', a0, GY, BL.avS + 6, a1, GY + 0.35, BL.walk - 4);
      b.deco(LAWN, a0 + 0.15, GY + 0.35, BL.avS + 6.15, a1 - 0.15, GY + 0.37, BL.walk - 4.15);
      for (let x = a0 + 5; x < a1 - 3; x += 10) modelTree(b, (Math.round(x) % 3 ? 'pine' : 'cherry') as TreeKind, x, (BL.avS + BL.walk) / 2 + ((Math.round(x) % 3) - 1) * 3.5, 'b', GY + 0.35);
    }
    at('n', -226, BL.avS + 8, () => b.model('mcenter', 'lookout', 0, GY, 0, ++seed));
    b.block(-231, GY, BL.avS + 8, -221, GY + 24, BL.avS + 18);
    b.sign({ k: 'label', text: MC_NAMES.lookout.ja, sub: MC_NAMES.lookout.en, fg: '#ffffff', bg: '#2f5f9a' }, -226, GY + 1.6, BL.avS + 7.9, [0, -1], 1.4, 0.4);

    // ── みなとコンベンションセンター on the avenue, beside the exhibition hall ──
    at('s', -243, -26, () => {
      b.model('mcenter', 'convention', 0, GY, 0, ++seed);
      signAt(M.convention.pts.name, { k: 'label', text: MC_NAMES.conv.ja, sub: MC_NAMES.conv.en, fg: '#1f3550', bg: '#eef0ee' });
    });
    b.block(-290, GY, -90, -196, GY + 18, -26);
    for (let x = -285; x < -196; x += 12) b.block(x - 0.25, GY, -18.75 - 0.25, x + 0.25, GY + 15.5, -18.75 + 0.25);
    pv(-290, -26, -196, BL.avN, PLAZA);
    b.zone('street', -290, -0.3, -26, -196, 8, BL.avN, `${MC_NAMES.conv.ja} 前広場`, `${MC_NAMES.conv.en} forecourt`, true);

    // ── ホテル汐路リゾート on the shore road, facing the sea ──
    at('w', -287, -228, () => {
      b.model('mcenter', 'rhotel', 0, GY, 0, ++seed);
      signAt(M.rhotel.pts.name, { k: 'label', text: MC_NAMES.rhotel.ja, sub: MC_NAMES.rhotel.en, fg: '#ffffff', bg: '#2f5f9a' });
      signAt(M.rhotel.pts.plate, { k: 'label', text: MC_NAMES.rhotel.ja, sub: MC_NAMES.rhotel.en, fg: '#1f3550', bg: '#eef0ee' });
    });
    b.block(-287, GY, -259, -257, GY + 10, -197);
    b.block(-284, GY, -253, -262, GY + 120, -203);
    pv(srE, -259, -287, -197, PLAZA);
    b.zone('street', srE, -0.3, -259, -287, 8, -197, `${MC_NAMES.rhotel.ja} 車寄せ`, `${MC_NAMES.rhotel.en} drop-off`, true);

    // ── みなとマリーナ: a gangway down to the pontoons, yachts between the fingers, the clubhouse on Hama-dōri ──
    {
      const top = -0.7, SEA = -1.2;
      const pont = (x0: number, z0: number, x1: number, z1: number) => {
        b.box('flat:#cfcac0', x0, top - 0.4, z0, x1, top, z1);
        b.deco('flat:#3a3e42', x0, SEA - 0.2, z0, x1, top - 0.4, z1);
        for (const [a, e] of [[x0, x0 + 0.05], [x1 - 0.05, x1]] as [number, number][]) b.deco('flat:#e8e6df', a, top, z0, e, top + 0.12, z1);
      };
      // Rails round it all (walkers stay out of the water).
      const ropeRail = (x0: number, z0: number, x1: number, z1: number) => {
        b.block(x0, top, z0, x1, top + 1.0, z1);
        b.deco('paint:#3d4a55', x0, top + 0.9, z0, x1, top + 0.95, z1);
        const along = x1 - x0 > z1 - z0, L = along ? x1 - x0 : z1 - z0;
        for (let u = 0; u <= L + 0.01; u += 3) {
          const [px, pz] = along ? [x0 + u, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + u];
          b.deco('paint:#3d4a55', px - 0.03, top, pz - 0.03, px + 0.03, top + 0.95, pz + 0.03);
        }
      };
      const [g0, g1] = MAR.gang, zM = N0 - 4;
      b.ramp(g0, zM, g1, N0, top, GY, [0, 1]);
      b.deco('flat:#9aa0a6', g0, top - 0.2, zM, g1, GY - 0.05, N0);
      pont(MAR.x0, zM - 4, MAR.x1, zM);
      for (let x = MAR.x0 + 4; x < MAR.x1 - 2; x += 14) pont(x - 1, MAR.z1, x + 1, zM - 4);
      ropeRail(MAR.x0, zM - 4 - 0.06, MAR.x0 + 0.06, zM);
      ropeRail(MAR.x1 - 0.06, zM - 4, MAR.x1, zM);
      for (const [a, e] of [[MAR.x0, g0], [g1, MAR.x1]] as [number, number][]) ropeRail(a, zM, e, zM + 0.06);
      for (let x = MAR.x0 + 4; x < MAR.x1 - 2; x += 14) {
        ropeRail(x - 1.06, MAR.z1, x - 1, zM - 4);
        ropeRail(x + 1, MAR.z1, x + 1.06, zM - 4);
        ropeRail(x - 1, MAR.z1 - 0.06, x + 1, MAR.z1);
        b.zone('street', x - 1, top - 0.3, MAR.z1, x + 1, 6, zM - 4, MC_NAMES.marina.ja, `${MC_NAMES.marina.en}, pontoon ${Math.round((x - MAR.x0) / 14) + 1}`, true);
        // Yachts on either side of the finger, bows out.
        for (const dx of [-4.2, 4.2]) if (x + dx > MAR.x0 + 2 && x + dx < MAR.x1 - 2 && (Math.round(x) + dx) % 3 !== 0) at('s', x + dx, zM - 6, () => b.model('mcenter', 'yacht', 0, SEA - 0.55, 0, ++seed));
      }
      b.zone('street', MAR.x0, top - 0.3, zM - 4, MAR.x1, 6, zM, MC_NAMES.marina.ja, MC_NAMES.marina.en, true);
      b.zone('passage', g0, top - 0.3, zM, g1, 6, N0, `${MC_NAMES.marina.ja} 連絡橋`, `${MC_NAMES.marina.en} gangway`);
      at('s', -150, hmN, () => {
        b.model('mcenter', 'clubhouse', 0, GY, 0, ++seed);
        signAt(M.clubhouse.pts.name, { k: 'label', text: MC_NAMES.club.ja, sub: MC_NAMES.club.en, fg: '#1f3550', bg: '#eef0ee' });
      });
      b.block(-162, GY, hmN - 12, -138, GY + 8, hmN);
    }

    // ── The water-bus landing: its glass pavilion on Hama-dōri, a pier out to the landing pontoon, the boat alongside ──
    {
      const top = GY + 0.15;
      b.box(TIMBER, WB.x0, top - 0.3, WB.z0, WB.x1, top, N0);
      b.box('flat:#cfcac0', WB.hx0, -0.7 - 0.4, WB.z1, WB.hx1, -0.7, WB.z0);
      b.ramp(WB.x0, WB.z0 - 0.01, WB.x1, WB.z0 + 4, -0.7, top, [0, 1]);
      for (const [x0, z0, x1, z1] of [[WB.x0 - 0.08, WB.z0 + 4, WB.x0, N0], [WB.x1, WB.z0 + 4, WB.x1 + 0.08, N0], [WB.hx0, WB.z1 - 0.08, WB.hx1, WB.z1], [WB.hx0 - 0.08, WB.z1, WB.hx0, WB.z0], [WB.hx0, WB.z0, WB.x0, WB.z0 + 0.08], [WB.x1, WB.z0, WB.hx1, WB.z0 + 0.08]] as Rect[]) {
        const y = z0 < WB.z0 + 1 && z1 < WB.z0 + 1 ? -0.7 : top;
        b.block(x0, y, z0, x1, y + 1.1, z1);
        b.deco('paint:#3d4a55', x0, y + 1.02, z0, x1, y + 1.1, z1);
      }
      at('n', WB.hx1 + 3.2, WB.z1 - 14, () => b.model('mcenter', 'waterbus', 0, -1.2 - 0.6, 0, ++seed));
      at('s', (WB.x0 + WB.x1) / 2 + 2, hmN, () => {
        b.model('mcenter', 'wbterm', 0, GY, 0, ++seed);
        signAt(M.wbterm.pts.name, { k: 'label', text: MC_NAMES.wbus.ja, sub: MC_NAMES.wbus.en, fg: '#ffffff', bg: '#1673c9' });
      });
      b.block((WB.x0 + WB.x1) / 2 + 2 - 8, GY, hmN - 10, (WB.x0 + WB.x1) / 2 + 2 - 1.4, GY + 5, hmN);
      b.block((WB.x0 + WB.x1) / 2 + 2 + 1.4, GY, hmN - 10, (WB.x0 + WB.x1) / 2 + 2 + 8, GY + 5, hmN);
      b.zone('street', WB.x0, -0.3, WB.z0, WB.x1, 6, N0, `${MC_NAMES.wbus.ja} 桟橋`, `${MC_NAMES.wbus.en} pier`, true);
      b.zone('street', WB.hx0, -1.2, WB.z1, WB.hx1, 6, WB.z0, `${MC_NAMES.wbus.ja} 浮桟橋`, `${MC_NAMES.wbus.en} pontoon`, true);
    }
    b.clearScenery(W0 - 4, N0 - 60, CE, Z + 4);
  }

  // ═════════════════════════ Past the plot's edge (east; seen, not walked) ═════════════════════════
  // The avenue runs on east to meet Umibe's run-on (x 392), the back street to Shinshio's connector (x 214), the Mall
  // to a cross street at x 300, which also takes Umibe's Hamachidori-dōri (z −84) and ends north at みなと中通 carried
  // on from the connector. Rows of offices and flats line them all, kept low so the skyline steps down from the tower.
  {
    const lampOut = (x: number, z: number, f: [number, number], wide: boolean) => roadModel(b, wide ? 'lamp_led' : 'lamp_small', x, GY, z, f);
    const roadOut = (axis: 'x' | 'z', cc: number, half: number, pv: number, u0: number, u1: number, wide: boolean) => {
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number) => (axis === 'x' ? b.deco(mat, u0, y0, cc + v0, u1, y1, cc + v1) : b.deco(mat, cc + v0, y0, u0, cc + v1, y1, u1));
      R('asphalt', -half, half, -0.03, 0.004);
      for (const k of [-1, 1]) R(PAVE, Math.min(k * half, k * (half + pv)), Math.max(k * half, k * (half + pv)), -0.03, GY);
      if (wide) for (const k of [-1, 1]) R(YELLOW, k * 0.75 - 0.06, k * 0.75 + 0.06, 0.004, 0.01);
      else for (let u = u0 + 2; u + 3 < u1; u += 6) (axis === 'x' ? b.deco(WHITE, u, 0.004, cc - 0.07, u + 3, 0.01, cc + 0.07) : b.deco(WHITE, cc - 0.07, 0.004, u, cc + 0.07, 0.01, u + 3));
    };
    const lowRows = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[]) => {
      const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
      if (e - a < 4.6 || f1 - f0 < 8) return;
      b.with(FRAME[face], () => fillModelLots(b, r, a, e, f0, f1 + 2.01, { noBack: true, kinds, lo: true }));
    };
    const EAST_AV = 392, EAST_KI = 214, MD = PEN.md;
    const E1 = { c: 300, half: 7, pave: 5 }, HC = { c: -84, half: 3.25, pave: 2 };
    const e1W = E1.c - E1.half - E1.pave, e1E = E1.c + E1.half + E1.pave, mdS = MD.c + MD.half + MD.pave;
    roadOut('x', AV.c, AV.half, AV.pave, X, EAST_AV, true);
    roadOut('x', KI.c, KI.half, KI.pave, X, EAST_KI + 4, false);
    roadOut('z', E1.c, E1.half, E1.pave, MD.c - MD.half, -AV.half, true);
    roadOut('x', MD.c, MD.half, MD.pave, PEN.cn.c + PEN.cn.half, e1E, false);
    roadOut('x', HC.c, HC.half, HC.pave, e1E, EAST_AV, false);
    b.deco(WALK, X, -0.03, BL.walk, EAST_AV, GY, Z);
    b.deco(LAWN, X, -0.03, BL.avS, EAST_AV, GY, BL.walk);
    b.deco(PLAZA, X, -0.03, BL.mallN, e1W, GY, BL.mallS);
    for (const [z0, z1] of [[BL.mallN + 2.5, MZ - 3.5], [MZ + 3.5, BL.mallS - 2.5]]) b.deco(LAWN, X + 2, GY, z0, e1W - 2, GY + 0.37, z1);
    for (let x = X + 8; x < e1W - 4; x += 16) for (const z of [BL.mallN + 4.5, BL.mallS - 4.5]) modelTree(b, (Math.round(x) % 2 ? 'camphor' : 'cherry') as TreeKind, x, z, 'b', GY + 0.35);
    for (let u = X + 10; u < EAST_AV; u += 22) {
      lampOut(u, -(AV.half + 0.7), [0, 1], true);
      lampOut(u, AV.half + 0.7, [0, -1], true);
      if (u < EAST_KI) lampOut(u, KI.c + KI.half + 0.45, [0, -1], false);
    }
    for (let z = -AV.half - 10; z > mdS; z -= 22) lampOut(E1.c - E1.half - 0.6, z, [1, 0], true);
    const BIZ = ['office'], MIX = ['office', 'manshon'];
    lowRows(X + 0.5, BL.avN - 36, e1W - 0.5, BL.avN, 's', BIZ);
    lowRows(X + 0.5, BL.mallS + 0.1, e1W - 0.5, BL.mallS + 24, 'n', BIZ);
    lowRows(X + 0.5, BL.mallN - 22, e1W - 0.5, BL.mallN - 0.1, 's', BIZ);
    lowRows(X + 0.5, BL.kiS + 0.1, e1W - 0.5, BL.kiS + 22, 'n', MIX);
    lowRows(X + 0.5, BL.kiN - 22, EAST_KI - 6, BL.kiN - 0.1, 's', ['manshon']);
    lowRows(PEN.cn.c + PEN.cn.half + PEN.cn.pave + 0.5, BL.kiN - 22, e1W - 0.5, BL.mallN - 24, 's', MIX);
    lowRows(PEN.cn.c + PEN.cn.half + PEN.cn.pave + 0.5, mdS + 0.1, e1W - 0.5, mdS + 22, 'n', MIX);
    lowRows(e1E + 0.5, BL.avN - 30, EAST_AV, BL.avN, 's', BIZ);
    lowRows(e1E + 0.5, HC.c + HC.half + HC.pave + 0.1, EAST_AV, BL.avN - 30.8, 'n', BIZ);
    lowRows(e1E + 0.5, HC.c - HC.half - HC.pave - 24, EAST_AV, HC.c - HC.half - HC.pave - 0.1, 's', MIX);
    lowRows(e1E + 0.1, mdS, e1E + 22, HC.c - HC.half - HC.pave - 26, 'w', MIX);
    b.clearScenery(X, mdS - 2, e1E + 24, BL.avN);
    b.clearScenery(e1E, HC.c - 30, EAST_AV, BL.avN);
    b.clearScenery(X, -FRONT - 2, EAST_AV, Z + 2);
    b.clearScenery(X, KI.c - KI.half - KI.pave - 1, EAST_KI + 10, KI.c + KI.half + KI.pave + 1);
  }

}
