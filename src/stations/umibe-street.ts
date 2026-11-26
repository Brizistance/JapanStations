// Umibe-shiyakusho-mae's street (海辺市役所前): the seaside civic district, after Kobe's city hall quarter
// (docs/theme-notes.md "Civic axis"): a boulevard coming down from the north to the city hall tower, and
// beyond the avenue its axis carried on through a seaside park to a terrace over the water.
//
// THE PLAN (station frame: +x east along the Nagisa Line, +z south; plot x ±148, z −120…138, umibe-plan.ts,
// where the same streets are the table UMIBE_STREETS that street-rules.test.ts holds this build to)
//
//   Street                     Centre line   Width   What it is
//   海辺通 Umibe-dōri           z = 0         36 m    building line z −18; six lanes (|z| ≤ 11), pavements 7 m with
//                                                    the four exits in them; the park is its whole south side
//   浜木綿筋 Hamayū-suji        x = 0         28 m    the boulevard: four lanes and a planted median (|x| ≤ 9), a blue
//                                                    bicycle strip at each kerb, pavements 5 m; ends at the avenue
//   浜千鳥通 Hamachidori-dōri   z = −84       10.5 m  the back street: two lanes (half 3.25), pavements 2 m
//   澪標筋 Miotsukushi-suji     x = −96       10.5 m  two lanes, pavements 2 m; ends at the avenue
//   灯台筋 Tōdai-suji           x = 96        10.5 m  the same
//   Service lanes              z −52.75…−48  4.75 m  behind the avenue's row in the three office blocks
//
//   Blocks north of the avenue: x −148…−101.25, −90.75…−14, 14…90.75 (the city hall's), 101.25…148; each
//   z −78.75…−18; a row north of the back street, z −115.25…−89.25, rear yards to the edge.
//
//   Landmarks: 川湊市役所 the city hall, lot x 14…90.75, z −66…−18: an 18 m forecourt, the 106 m tower at the
//   boulevard's corner (its lobby is walked into), the assembly wing east of it; the official car park behind.
//   海辺公園 the park, everything south of z 18: the mall on the boulevard's axis (x ±8) with the flower-bed
//   crest at its head and a fountain half way, the sea terrace (0, 112) with the sail monument, the open-air
//   stage on the west lawn, the rest house on the east lawn, a promenade round the three sea walls.
//   Also: police box x 54.7…61.3, z 18…23.2; bicycle park x −70…−52, z 18.4…23; convenience store x 14…28,
//   z −98.25…−89.25; Hama-Ebisu Shrine x −90.75…−81.75, z −103.25…−89.25; pocket park x −148…−134.
//
//   No neighbour's plot touches this one. East and west the avenue runs on between office rows and the park's
//   shore strip; north the three 筋 run 38 m on to the Shinshio dock's quay.
//
// Built in one go, 2026-11-25. The exits stay where the station put them (the avenue's pavements).

import { CARS, VEH, family } from '../traffic/vehicles';
import { rng, type LanePart } from '../world/builder';
import { CIVIC as V } from './anchors/civic';
import { UMIBE as U } from './anchors/umibe';
import { PORT } from './anchors/port';
import { ICHIBA } from './anchors/ichiba';
import { SEA_Y } from '../data/geography';
import { BUILDING_MODELS } from './buildings';
import type { AnchorPt } from './anchors/types';
import type { Ctx } from './kit';
import { ceilingLight, GROUND_Y, vending } from './kit';
import { konbini } from './konbini';
import { place } from './places';
import { disc, ring } from './poly';
import { kerbRail, pedSignal, roadModel, roadName, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal } from './roads';
import { crosswalk, fillModelLots, type SurfaceSpec } from './surface';
import { modelTree, type TreeKind } from './trees';
import { umibeEast } from './umibe-east';
import { UMIBE_EAST as E, UMIBE_PARK as PK, UMIBE_PLOT, UMIBE_STREETS } from './umibe-plan';

type Rect = [number, number, number, number];
type Named = { ja: string; en: string };
type Face = 'n' | 's' | 'e' | 'w';
type St = (typeof UMIBE_STREETS)[number];
const X = UMIBE_PLOT.x, Z = UMIBE_PLOT.z, N = UMIBE_PLOT.north;
/** The dock: its quay wall, the quay road's south kerb, and the back lane behind the quay row (z0, z1). */
const QW = -160, QL = -152, LANE_Z: [number, number] = [-128, -124];
/** The avenue's old building line, which the pavement exits are fitted to (the structure's edge + 5.5). */
const FRONT = 17.5;
const BARE = 'flat:#8d877b', WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#cfcdc6', LANE = 'tile:#8f8a80', BLUE = 'flat:#3f78b5';
const PLAZA = 'tile:#d6d3ca', PLAZA_DK = 'tile:#a9a59b', PATH = 'tile:#cbbfa6', NAVY = '#23395b';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const SL = 5.2;

const st = (en: string) => UMIBE_STREETS.find((s) => s.en.startsWith(en))!;
const AV = st('Umibe'), HAM = st('Hamay'), URA = st('Hamachidori'), MIO = st('Miotsukushi'), TOD = st('Tōdai');
const NS = [MIO, HAM, TOD], EW = [URA, AV];
const short = (s: Named): Named => ({ ja: s.ja, en: s.en.split(' (')[0] });
/** Building lines. */
const AVN = -(AV.half + AV.pave), URS = URA.c + URA.half + URA.pave, URN = URA.c - URA.half - URA.pave;
const NAMES = {
  hall: { ja: '川湊市役所', en: 'Kawaminato City Hall' },
  gikai: { ja: '川湊市議会', en: 'Kawaminato City Assembly' },
  fore: { ja: '市役所前広場', en: 'City Hall Forecourt' },
  park: { ja: '海辺公園', en: 'Umibe Park' },
  terrace: { ja: '海の広場', en: 'Sea Terrace' },
  sail: { ja: '帆のモニュメント', en: 'Sail Monument' },
  stage: { ja: '海辺公園 野外ステージ', en: 'Umibe Park Open-air Stage' },
  rest: { ja: '海辺公園 レストハウス', en: 'Umibe Park Rest House' },
  koban: { ja: '海辺交番', en: 'Umibe Police Box' },
  shrine: { ja: '浜恵比寿神社', en: 'Hama-Ebisu Shrine' },
  pocket: { ja: '浜千鳥児童遊園', en: 'Hamachidori Children’s Park' },
};

export function umibeStreet(c: Ctx, spec: SurfaceSpec, cw: number) {
  const { b } = c, sta = c.station, GY = GROUND_Y;
  if (Math.abs(cw + 5.5 - FRONT) > 0.01) throw new Error(`umibeStreet: the exits' building line moved (${cw + 5.5}); the avenue's pavements are fitted to ${FRONT}`);
  b.out.plot = { ...UMIBE_PLOT, arms: UMIBE_PLOT.arms.map((a) => [...a] as Rect) };
  const r = rng(spec.seed);
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);
  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: Parameters<typeof b.sign>[0]) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  const solid = (p: AnchorPt, h: number) => b.block(p[0] - p[3] / 2, GY, p[2] - p[4] / 2, p[0] + p[3] / 2, GY + h, p[2] + p[4] / 2);
  const reserved: Rect[] = [];

  // ═════════════════════════ Ground ═════════════════════════
  const wells: Rect[] = b.out.holes.map(([x0, z0, x1, z1]): Rect => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  const carriage: Rect[] = [
    [-X, -AV.half, X, AV.half], [-X, URA.c - URA.half, X, URA.c + URA.half],
    ...NS.map((s): Rect => [s.c - s.half, QL, s.c + s.half, -AV.half]),
    [-120, QW + 0.4, X, QL],
  ];
  b.slab('asphalt', -X, -N, X, Z, -0.6, 0, wells);
  b.slab(BARE, -X, -N, X, Z, 0, GY, [...wells, ...carriage]);
  const pave = (x0: number, z0: number, x1: number, z1: number, mat = 'paver') => b.slab(mat, x0, z0, x1, z1, GY + 0.002, GY + 0.014, [...wells, ...carriage], false);
  pave(-X, AVN, X, -AV.half);
  pave(-X, AV.half, X, -AVN);
  pave(-X, URN, X, URS);
  for (const s of NS) pave(s.c - s.half - s.pave, QL, s.c + s.half + s.pave, AVN);
  b.zone('street', -X, -0.3, -N, X, 120, Z, `${sta.nameJa}駅前`, `${sta.nameRomaji} — street level`);
  b.block(-X - 1, -1, -N - 1, -X, 60, Z + 1);
  // (East, north of the sea: open, the plot's arms go on to Kawaminato-kō: umibe-east.ts.)
  b.block(X, -1, 52, X + 1, 60, Z + 1);
  b.block(-X, -1, -N - 1, X, 60, -N);
  b.block(-X, -1, Z, X, 60, Z + 1);
  b.out.district = { radius: 420, old: [0, -84], oldRadius: 0, towers: 2 };

  // ═════════════════════════ Paint ═════════════════════════
  const nsCorr = NS.map((s): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave]);
  const ewCorr = EW.map((s): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave]);
  const boxX = nsCorr.map(([p, q]): [number, number] => [p - 7, q + 7]);
  const boxZ = ewCorr.map(([p, q]): [number, number] => [p - 7, q + 7]);
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
  // The avenue: three lanes each way (3.25 m), a double yellow centre line, edge lines.
  for (const s of [-1, 1]) {
    for (const z of [4.5, 7.75]) dash('x', s * z, -X, X, boxX);
    line('x', s * 0.18, -X, X, boxX, YELLOW, 0.05);
    line('x', s * (AV.half - 0.4), -X, X, boxX);
  }
  // The boulevard: two lanes each way, the median (planted between the junctions), a blue bicycle strip at each kerb.
  const MED: [number, number] = [URS + 12, AVN - 10];
  for (const s of [-1, 1]) {
    dash('z', s * 4.25, QL, AVN, boxZ);
    line('z', s * 7.55, QL, AVN, boxZ);
    line('z', s * 8.25, QL, AVN, boxZ, BLUE, 0.55);
    line('z', s * 1.0, QL, AVN, [...boxZ, [MED[0] - 3, MED[1] + 3]], YELLOW, 0.05);
  }
  b.box(STONE, -1.0, 0, MED[0], 1.0, 0.22, MED[1]);
  b.deco('grass', -0.8, 0.22, MED[0] + 0.2, 0.8, 0.26, MED[1] - 0.2);
  for (let z = MED[0] + 3; z < MED[1] - 2; z += 5.5) modelTree(b, z % 11 < 5.5 ? 'azalea' : 'dogwood', 0, z, 'b', 0.24);
  // The two-lane streets: a dashed centre line.
  dash('x', URA.c, -X, X, boxX);
  for (const s of [MIO, TOD]) dash('z', s.c, QL, AVN, boxZ);

  // ═════════════════════════ Junctions and lanes ═════════════════════════
  const inPlot = (x: number, z: number) => x > -X + 0.5 && x < (z < 52 ? E.x1 : X) - 0.5 && z > -N + 0.6 && z < Z - 0.5;
  /**
   * A signalled junction of a north–south street (centre cx, half hx, driven the ways `ns`: 1 south, −1 north)
   * and an east–west one (cz, hz, `ew`). `south` false: a T, the north–south street ends here.
   */
  const junction = (cx: number, hx: number, ns: (1 | -1)[], cz: number, hz: number, ew: (1 | -1)[], name: Named, south: boolean, skip: 'e' | 'w' | '' = '') => {
    const wideNS = hx > 4.6, wideEW = hz > 4.6;
    for (const sz of [-1, 1] as const) {
      if (sz === 1 && !south) continue;
      const zc = cz + sz * (hz + 2.6);
      if (!inPlot(cx, zc + sz * 2)) continue;
      crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
      for (const sx of [-1, 1] as const) pedSignal(b, cx + sx * (hx + 0.8), zc + sz * 2.0, [-sx, 0], 0, { flat: true, button: !wideNS, speaker: wideNS });
    }
    for (const sx of [-1, 1] as const) {
      const xc = cx + sx * (hx + 2.6);
      if (!inPlot(xc + sx * 2, cz) || (sx > 0 ? skip === 'e' : skip === 'w')) continue;
      crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
      for (const sz of [-1, 1] as const) if (inPlot(xc, cz + sz * (hz + 0.8))) pedSignal(b, xc + sx * 2.0, cz + sz * (hz + 0.8), [0, -sz], 1, { flat: true, button: !wideEW, speaker: wideEW });
    }
    for (const sx of ew) {
      const lz = -sx, xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      const pz = cz + lz * (hz + 1.5);
      if (!inPlot(cx + sx * (hx + 1.9), pz)) continue;
      if (skip) shortSignal(b, cx + sx * (hx + 0.9), cz - sx * (hz + 1.2), [sx, 0], 0, name);
      else if (wideEW) vehicleSignal(b, cx + sx * (hx + 1.9), pz, [sx, 0], 6.5, 0, name, { style: 'new', back: false });
      else shortSignal(b, cx + sx * (hx + 1.9), pz, [sx, 0], 0, name);
    }
    for (const sz of ns) {
      const lx = sz, zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      const pz = cz + sz * (hz + 2.0);
      if (!inPlot(cx + lx * (hx + 1.6), pz)) continue;
      if (wideNS) vehicleSignal(b, cx + lx * (hx + 1.6), pz, [0, sz], hx + 1.6 - hx / 2, 1, name, { style: 'new', back: ns.length > 1 });
      else shortSignal(b, cx + lx * (hx + 1.5), pz, [0, sz], 1, name);
    }
    const [gx, gz] = [cx - hx - 2.6, cz - hz - 3.2];
    if (inPlot(gx, gz)) {
      roadModel(b, 'sigbox', gx, GY, gz, [0, 1]);
      b.block(gx - 0.36, GY, gz - 0.26, gx + 0.36, GY + 1.56, gz + 0.26);
    }
  };
  const jName = (e: St, n: St): Named => {
    if (e === AV) return n === HAM ? { ja: '市役所前', en: 'Shiyakusho-mae' } : n === MIO ? { ja: '海辺公園西', en: 'Umibe-kōen-nishi' } : { ja: '海辺公園東', en: 'Umibe-kōen-higashi' };
    return n === HAM ? { ja: '市役所北', en: 'Shiyakusho-kita' } : n === MIO ? { ja: '浜千鳥通西', en: 'Hamachidori-dōri-nishi' } : { ja: '浜千鳥通東', en: 'Hamachidori-dōri-higashi' };
  };
  for (const n of NS) {
    junction(n.c, n.half, [1], AV.c, AV.half, [1, -1], jName(AV, n), false);
    junction(n.c, n.half, [1, -1], URA.c, URA.half, [1, -1], jName(URA, n), true);
  }

  type Cross = { c: number; half: number };
  const NSX: Cross[] = [...NS, E.locals[0], E.mid, E.locals[1]];
  const stops = (dir: 1 | -1, from: number, cross: Cross[], axis: 0 | 1, len: number): LanePart['stops'] =>
    cross.map((q) => {
      const t = (q.c - from) * dir;
      return { at: t - q.half - SL - 0.5, axis, exit: Math.min(len, t + q.half + SL) };
    }).filter((q) => q.at > 2 && q.at < len).sort((p, q) => p.at - q.at);
  const lane = (o: { speed: number; flow: number; use: LanePart['use'] }, x0: number, z0: number, x1: number, z1: number, more: Partial<LanePart> = {}, cross?: Cross[]) => {
    const alongX = Math.abs(x1 - x0) > 1, dir = Math.sign(alongX ? x1 - x0 : z1 - z0) as 1 | -1;
    trafficLane(b, x0, z0, x1, z1, {
      speed: o.speed / 3.6, flow: o.flow, use: o.use, taxi: 0.15, halts: [],
      stops: alongX ? stops(dir, x0, cross ?? NSX, 0, Math.abs(x1 - x0)) : stops(dir, z0, cross ?? EW, 1, Math.abs(z1 - z0)),
      ...more,
    });
  };
  const big = { speed: 50, flow: 2.6, use: 'general' as const }, mid = { speed: 40, flow: 1.8, use: 'general' as const }, small = { speed: 30, flow: 0.9, use: 'general' as const };
  // Traffic keeps left: eastbound on the avenue's north half, southbound on the east half of each 筋.
  const KERB = 9.4;
  // East the avenue goes on along the plot's arms into Kawaminato-kō's boulevard (umibe-east.ts). The inner lane
  // each way is one with its lane there (it drifts 0.65 m over 718 m to meet it; vehicles move over at the seam,
  // traffic/street.ts); the middle lanes end at the last 筋 before the seam, the kerb lanes where the avenue narrows.
  {
    const k = (2.9 - E.lane) / (E.x1 + X), zs = (x: number) => -(E.lane + (E.x1 - x) * k), MX = E.mid.c + 4, LX = E.locals[1].c + 1.6 + 2.4;
    lane(big, -X, zs(-X), E.x1 + 20, zs(E.x1 + 20), { closed: ['to'], hand: { station: 'kawaminato-ko', at: [E.x1, 0, zs(E.x1)] } });
    lane(big, E.x1 + 20, -zs(E.x1 + 20), -X, -zs(-X), { closed: ['from'], fed: 'kawaminato-ko' });
    lane({ ...big, flow: 1.2 }, -X, -6.15, LX, -6.15, { dead: true });
    lane({ ...big, flow: 0 }, LX, 6.15, -X, 6.15);
    lane({ ...big, flow: 0.8, use: 'all' }, -X, -KERB, MX, -KERB, { dead: true });
    lane({ ...big, flow: 0, use: 'all' }, MX, KERB, -X, KERB);
  }
  // (A 筋 ends at the avenue: its southbound lanes turn off there; its northbound ones are fed by turns.)
  for (const x of [2.6, 5.9]) {
    lane(mid, x, QL + 0.5, x, 6.5, { dead: true });
    lane({ ...mid, flow: 0 }, -x, -1, -x, QL + 0.5, { dead: true });
  }
  for (const s of [MIO, TOD]) {
    lane(small, s.c + 1.6, QL + 0.5, s.c + 1.6, 6.5, { dead: true });
    lane({ ...small, flow: 0 }, s.c - 1.6, -1, s.c - 1.6, QL + 0.5, { dead: true });
  }
  // (The 筋 end at the quay road, which is walked, not driven: their lanes start and end there.)
  // (The back street ends at the 筋 where the avenue narrows.)
  lane(small, -X, URA.c - 1.6, E.mid.c + 3.5, URA.c - 1.6, { dead: true }, [...NS, E.locals[0], E.mid]);
  lane({ ...small, flow: 0 }, E.mid.c + 3.5, URA.c + 1.6, -X, URA.c + 1.6, {}, [...NS, E.locals[0], E.mid]);

  // ═════════════════════════ Lamps, rails, trees, boards ═════════════════════════
  const carrX = NS.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const carrZ = EW.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const EXITS: [number, number][] = [[-49, -35], [35, 49]];
  const lampAt = (a0: number, a1: number, corr: [number, number][]) => {
    const out: number[] = [];
    for (let u = a0 + 9; u < a1 - 1; u += 18) {
      const hit = corr.find(([p, q]) => u > p - 3.8 && u < q + 3.8);
      out.push(hit ? (u - hit[0] < hit[1] - u ? hit[0] - 3.9 : hit[1] + 3.9) : u);
    }
    return out;
  };
  lampAt(-X, X, [...carrX, ...EXITS.map(([p, q]): [number, number] => [p + 3, q - 3])]).forEach((x, k) => {
    const s = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_led', x, s * (AV.half + 0.7), [0, -s]);
  });
  lampAt(QL, -AV.half, carrZ).forEach((z, k) => {
    const s = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_led', s * (HAM.half + 0.7), z, [-s, 0]);
  });
  lampAt(-X, X, carrX).forEach((x, k) => {
    const e = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_small', x, URA.c + e * (URA.half + 0.45), [0, -e]);
  });
  for (const s of [MIO, TOD]) lampAt(QL, -AV.half, carrZ).forEach((z, k) => {
    const e = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_small', s.c + e * (s.half + 0.45), z, [-e, 0]);
  });
  // Guard rail along the avenue's kerbs, open at every corner, by the exits and at the bus stops.
  const BUS: [number, number][] = [[-78, -58], [58, 78]];
  const mouths: [number, number][] = [...nsCorr.map(([p, q]): [number, number] => [p - 5, q + 5]), ...EXITS, ...BUS];
  for (const s of [-1, 1]) {
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
  // Camphors along the avenue, ginkgos down the boulevard.
  for (let x = -X + 18; x < X - 4; x += 18) if (clearOf(x, nsCorr, 7) && clearOf(x, EXITS, 2) && clearOf(x, BUS, 1)) for (const s of [-1, 1]) modelTree(b, 'camphor', x, s * (AV.half + 1.9), 'b', GY, true);
  for (let z = LANE_Z[1] + 6; z < AVN - 6; z += 12) if (clearOf(z, ewCorr, 6)) for (const s of [-1, 1]) modelTree(b, 'ginkgo', s * (HAM.half + 1.5), z, 'b', GY, true);
  roadName(b, -HAM.half - HAM.pave - 2, AVN + 0.6, [0, 1], short(AV));
  roadName(b, HAM.half + HAM.pave + 2, -AVN - 0.6, [0, -1], short(AV));
  roadName(b, HAM.half + HAM.pave - 0.6, AVN - 8, [-1, 0], short(HAM));
  roadName(b, -HAM.half - HAM.pave + 0.6, URS + 8, [1, 0], short(HAM));
  roadName(b, HAM.half + HAM.pave + 2, URS - 0.4, [0, -1], short(URA));
  for (const s of [MIO, TOD]) {
    roadName(b, s.c + s.half + s.pave - 0.4, AVN - 6, [-1, 0], short(s));
    roadSign(b, 'speed30', s.c + s.half + 0.5, QL + 10, [0, -1], 0.6);
  }
  for (const sx of [-1, 1]) roadSign(b, 'speed30', sx * (X - 10), URA.c - sx * (URA.half + 0.5), [-sx, 0], 0.6);
  // A bus stop each way on the avenue; buses stop in the kerb lane.
  for (const [sx, x] of [[1, -68], [-1, 68]] as const) {
    const s = -sx, f: [number, number] = [0, -s];
    roadModel(b, 'busstop', x + sx * 6.5, GY, s * (AV.half + 0.75), f);
    b.block(x + sx * 6.5 - 0.15, GY, s * (AV.half + 0.75) - 0.15, x + sx * 6.5 + 0.15, GY + 2.6, s * (AV.half + 0.75) + 0.15);
    roadModel(b, 'shelter', x, GY, s * (AV.half + 2.7), f);
    for (const px of [x - 1.9, x + 1.9]) b.block(px - 0.1, GY, s * (AV.half + 2.7) - 0.1, px + 0.1, GY + 2.5, s * (AV.half + 2.7) + 0.1);
    b.sign({ k: 'label', text: '市役所前', sub: 'Shiyakusho-mae (bus stop)', fg: '#ffffff', bg: '#1f5fae' }, x + sx * 6.5, GY + 2.2, s * (AV.half + 0.75) - s * 0.12, f, 0.5, 0.5);
    for (const ln of b.out.lanes) if (Math.abs(ln.from[2] - s * KERB) < 0.1 && Math.abs(ln.to[2] - s * KERB) < 0.1) ln.halts = [...ln.halts, { at: (x + sx * 6.5 - ln.from[0]) * sx, side: 0 }];
  }

  // ═════════════════════════ The city hall ═════════════════════════
  const HX = (HAM.half + HAM.pave + TOD.c - TOD.half - TOD.pave) / 2;
  at('s', HX, AVN, () => {
    const a = U.shiyakusho, P = a.pts, H = a.h;
    b.model('umibe', 'shiyakusho', 0, GY, 0, 0);
    const [tx, , tz, tw, td] = P._tower, [lx, , lz, lw, ld] = P._lobby, [dx, , , dw, dh] = P._door;
    const [x0, x1, z0, zl, z1] = [tx - tw / 2, tx + tw / 2, tz - td / 2, lz + ld / 2, tz + td / 2];
    void [lx, lw];
    // The tower: the lobby's front wall either side of the doorway and over it, its side walls, the core behind, the floors above.
    b.block(x0, GY, z0 - 0.25, dx - dw / 2, GY + 8, z0 + 0.45);
    b.block(dx + dw / 2, GY, z0 - 0.25, x1, GY + 8, z0 + 0.45);
    b.block(dx - dw / 2, GY + dh, z0 - 0.25, dx + dw / 2, GY + 8, z0 + 0.45);
    b.block(x0, GY, z0, x0 + 0.35, GY + 8, zl);
    b.block(x1 - 0.35, GY, z0, x1, GY + 8, zl);
    b.block(x0, GY, zl, x1, GY + H, z1);
    b.block(x0, GY + 8, z0, x1, GY + H, zl);
    solid(P._wing, 16.6);
    solid(P._link, 7);
    solid(P._stone, 1.75);
    solid(P._flags, 12);
    solid(P._planter_a, 1.05);
    solid(P._planter_b, 1.05);
    for (const sx of [-1, 1]) b.block(dx + sx * (dw / 2 + 1.2) - 0.3, GY, P._cols[2] - 0.3, dx + sx * (dw / 2 + 1.2) + 0.3, GY + 3.9, P._cols[2] + 0.3);
    // The forecourt: pale stone in big squares, a darker band on the doorway's axis.
    b.deco(PLAZA, -a.w / 2, GY + 0.002, 0, a.w / 2, GY + 0.012, z0 - 0.25);
    b.deco(PLAZA, P._wing[0] - P._wing[3] / 2 - 0.4, GY + 0.002, 0, x0, GY + 0.012, P._wing[2] - P._wing[4] / 2);
    b.deco(PLAZA_DK, dx - dw / 2, GY + 0.012, 0, dx + dw / 2, GY + 0.018, z0);
    for (let x = -a.w / 2 + 6; x < a.w / 2; x += 6) b.deco(PLAZA_DK, x - 0.06, GY + 0.012, 0, x + 0.06, GY + 0.016, z0 - 0.3);
    signAt(P.name, { k: 'label', text: NAMES.hall.ja, sub: NAMES.hall.en, fg: NAVY, bg: '#e7e6e1' });
    signAt(P.entrance, { k: 'label', text: `${NAMES.hall.ja} 本庁舎`, sub: 'City Hall, Main Building', fg: NAVY, bg: '#f4f3ee' });
    signAt(P.gikai, { k: 'label', text: NAMES.gikai.ja, sub: NAMES.gikai.en, fg: NAVY, bg: '#f4f3ee' });
    signAt(P.crest, { k: 'label', text: '湊', fg: NAVY, bg: '#e7e6e1' });
    for (const [x, z] of [[-30, 8], [-22, 8], [-6, 10], [34, 9]]) modelTree(b, 'zelkova', x, z, 'b', GY, true);
    for (const x of [-27, 20]) {
      roadModel(b, 'bench_s', x, GY, 11.5, [0, -1]);
      b.block(x - 0.95, GY, 11.2, x + 0.95, GY + 0.8, 11.8);
    }
    for (const x of [-34, -14, 2, 22, 34]) streetLamp(b, 'lamp_park', x, 5, [0, -1]);
    b.zone('street', -a.w / 2 + 0.3, GY - 0.2, 0.3, a.w / 2 - 0.3, GY + 10, z0 - 0.4, NAMES.fore.ja, NAMES.fore.en, true);

    // ── The lobby (inside the model's thin walls): stone floor, counters along the core, benches, the lifts ──
    const cy = GY + 8, w0 = x0 + 0.35, w1 = x1 - 0.35, f0 = z0 + 0.45;
    b.deco('floor:#d0cfca', w0, GY + 0.002, z0 - 0.25, w1, GY + 0.014, zl);
    b.deco('tile:#23395b', dx - dw / 2, GY + 0.014, f0, dx + dw / 2, GY + 0.018, zl - 3);
    for (let x = w0 + 4; x < w1 - 2; x += 7) for (let z = f0 + 3; z < zl - 2; z += 6) ceilingLight(b, x - 1.6, x + 1.6, z - 0.3, z + 0.3, cy - 0.02);
    // The information desk facing the door.
    b.box('wood:#b08a5a', dx - 3, GY, zl - 6.2, dx + 3, GY + 1.05, zl - 5.2);
    b.box('flat:#e7e6e1', dx - 3.1, GY + 1.05, zl - 6.3, dx + 3.1, GY + 1.1, zl - 5.1);
    b.sign({ k: 'label', text: '総合案内', sub: 'Information', fg: '#ffffff', bg: NAVY }, dx, GY + 0.6, zl - 6.22, [0, -1], 2.6, 0.5);
    // The lifts in the core's wall behind the desk.
    for (const x of [dx - 2.6, dx, dx + 2.6]) {
      b.box('metal:#b9bec4', x - 0.6, GY, zl - 0.06, x + 0.6, GY + 2.25, zl);
      b.deco('metal:#6f7478', x - 0.02, GY, zl - 0.07, x + 0.02, GY + 2.25, zl - 0.06);
      b.deco('light', x - 0.25, GY + 2.4, zl - 0.04, x + 0.25, GY + 2.5, zl - 0.02);
    }
    b.sign({ k: 'label', text: 'エレベーター', sub: 'Elevators', fg: '#ffffff', bg: '#0d3b66' }, dx, GY + 3.0, zl - 0.03, [0, -1], 3.2, 0.36);
    // Counters along the core wall each side: the citizens' affairs section and the tax section, numbered windows.
    for (const [xa, xe, ja, en, n0] of [[w0 + 1.5, dx - 6, '市民課', 'Citizens’ Affairs', 1], [dx + 6, w1 - 1.5, '税務課', 'Municipal Tax', 6]] as const) {
      b.box('flat:#f0efeb', xa, GY, zl - 1.5, xe, GY + 1.0, zl - 0.9);
      b.box('wood:#b08a5a', xa - 0.05, GY + 1.0, zl - 1.6, xe + 0.05, GY + 1.06, zl - 0.85);
      b.sign({ k: 'label', text: ja, sub: en, fg: '#ffffff', bg: NAVY }, (xa + xe) / 2, GY + 3.4, zl - 0.03, [0, -1], 5.2, 0.6);
      const n = Math.max(2, Math.floor((xe - xa) / 3.2));
      for (let k = 0; k < n; k++) {
        const x = xa + ((k + 0.5) * (xe - xa)) / n;
        b.sign({ k: 'label', text: `${n0 + k}`, sub: 'Window', fg: NAVY, bg: '#f4f3ee' }, x, GY + 2.3, zl - 0.03, [0, -1], 0.6, 0.5);
        b.deco('glass', x - (xe - xa) / n / 2 + 0.08, GY + 1.06, zl - 1.22, x + (xe - xa) / n / 2 - 0.08, GY + 1.9, zl - 1.2);
      }
      // Waiting benches in two rows, facing the counters.
      for (let x = xa + 1.5; x < xe - 1; x += 3.2) for (const z of [zl - 5.2, zl - 7.6]) {
        roadModel(b, 'bench_s', x, GY, z, [0, 1]);
        b.block(x - 0.95, GY, z - 0.3, x + 0.95, GY + 0.8, z + 0.3);
      }
    }
    // The floor guide by the door, the mural of the bay on the west wall, ticket machines for the queue.
    b.box('flat:#55585c', dx + dw / 2 + 1.0, GY, f0 + 1.2, dx + dw / 2 + 2.6, GY + 1.9, f0 + 1.4);
    b.sign({ k: 'label', text: 'フロア案内', sub: '1F Citizens’ Affairs · Tax  2F Welfare  3F–24F Bureaus', fg: '#ffffff', bg: '#3a3d42' }, dx + dw / 2 + 1.8, GY + 1.1, f0 + 1.19, [0, -1], 1.5, 1.3);
    b.sign({ k: 'mural', v: 'waves', color: '#3a6ea5' }, x1 - 0.37, GY + 3.6, (f0 + zl) / 2, [-1, 0], 12, 3.6);
    b.sign({ k: 'label', text: '川湊市 市章', sub: 'City of Kawaminato', fg: NAVY, bg: '#e7e6e1' }, x0 + 0.37, GY + 4.2, (f0 + zl) / 2, [1, 0], 4.2, 1.2);
    b.zone('street', w0, GY - 0.2, f0, w1, cy, zl, `${NAMES.hall.ja} 1階ロビー`, 'City Hall lobby');
    // ── Behind the tower and the wing: the official car park off the back street, hedged ──
    const zb = -(URS - AVN) - 0.0;
    void zb;
  });
  // (The car park, in the plot's own frame: x 14…90.75, from the tower's back to the back street's pavement.)
  {
    const [x0, x1] = [HAM.half + HAM.pave, TOD.c - TOD.half - TOD.pave], zt = AVN - U.shiyakusho.d, wingBack = AVN - (U.shiyakusho.pts._wing[2] + U.shiyakusho.pts._wing[4] / 2);
    const wx0 = HX - (U.shiyakusho.pts._wing[0] + U.shiyakusho.pts._wing[3] / 2) + 0.3;
    b.deco('asphalt', x0, GY + 0.002, URS, x1, GY + 0.012, zt);
    b.deco('asphalt', wx0, GY + 0.002, zt, x1, GY + 0.012, wingBack);
    // A hedge along the back street, open at the gate; a low wall to the 筋 each side.
    for (const [a, e] of [[x0 + 0.2, 44], [52, x1 - 0.2]]) {
      b.box('flat:#b3ac9c', a, GY, URS + 0.1, e, GY + 0.45, URS + 0.5);
      b.box('flat:#55703f', a + 0.05, GY + 0.45, URS + 0.12, e - 0.05, GY + 1.3, URS + 0.48);
    }
    for (const x of [x0, x1 - 0.3]) b.box('flat:#b3ac9c', x, GY, URS + 0.5, x + 0.3, GY + 1.2, zt - (x === x0 ? 0 : -8));
    b.sign({ k: 'label', text: '川湊市役所 公用車・来庁者駐車場', sub: 'City Hall car park', fg: '#ffffff', bg: '#1f5fae' }, 43.7, GY + 1.6, URS + 0.3, [0, -1], 0.5, 1.4);
    b.box('metal:#8d9094', 43.64, GY, URS + 0.24, 43.76, GY + 2.3, URS + 0.36);
    for (let x = x0 + 3; x < x1 - 3; x += 2.7) {
      b.deco(WHITE, x - 0.05, GY + 0.012, zt - 5.4, x + 0.05, GY + 0.018, zt - 0.3);
      if (r() < 0.55 && (x < 42 || x > 54)) {
        const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
        roadModel(b, id, x + 1.35, GY, zt - 2.9, [0, -1]);
        b.block(x + 1.35 - wd / 2, GY, zt - 2.9 - len / 2, x + 1.35 + wd / 2, GY + ht, zt - 2.9 + len / 2);
      }
    }
    for (const x of [24, 40, 60, 80]) streetLamp(b, 'lamp_small', x, URS + 1.2, [0, 1]);
    for (const [a, e, k] of [[x0 + 0.4, HX, 'west'], [HX, x1 - 0.4, 'east']] as const) b.zone('street', a, GY - 0.2, URS + 0.6, e, GY + 6, zt - 0.2, '市役所 駐車場', `City Hall car park, ${k}`, true);
    // The visitors' bicycle park behind the assembly wing.
    for (let z = zt + 1.2; z < wingBack - 0.8; z += 2.2) for (let k = 0; k < 9; k++) {
      if (r() < 0.35) continue;
      const d = b.dir([0, 1]);
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(wx0 + 2 + k * 0.62, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
    }
    b.zone('street', wx0 + 0.3, GY - 0.2, zt, x1 - 0.5, GY + 6, wingBack - 0.2, '来庁者 自転車駐車場', 'Visitors’ bicycle park', true);
  }

  // ═════════════════════════ The park ═════════════════════════
  const PZ = -AVN; // the park's north edge: the avenue's south building line
  {
    const T = PK.terrace, F = PK.fountain, M = PK.mall, PR = PK.prom;
    const tree = (k: TreeKind, x: number, z: number, s: 'a' | 'b' = 'a') => modelTree(b, k, x, z, s);
    const bench = (x: number, z: number, f: [number, number]) => {
      roadModel(b, 'bench_s', x, GY, z, f);
      const along = f[0] === 0;
      b.block(x - (along ? 0.95 : 0.3), GY, z - (along ? 0.3 : 0.95), x + (along ? 0.95 : 0.3), GY + 0.8, z + (along ? 0.3 : 0.95));
    };
    // Lawn everywhere, then the paths over it.
    b.deco('grass', -X, GY + 0.001, PZ, X, GY + 0.008, Z);
    const path = (x0: number, z0: number, x1: number, z1: number, mat = PATH) => b.deco(mat, x0, GY + 0.008, z0, x1, GY + 0.016, z1);
    path(-X, PZ, X, PZ + 5, PLAZA); // the park's front walk along the avenue
    path(-M, PZ, M, PK.mallEnd, PLAZA); // the mall
    for (const s of [-1, 1]) b.deco(PLAZA_DK, s * (M - 0.5) - 0.25, GY + 0.016, PZ + 5, s * (M - 0.5) + 0.25, GY + 0.02, PK.mallEnd);
    b.poly(PLAZA, disc(T.x, T.z, T.r), GY + 0.008, GY + 0.018);
    for (const q of ring(T.x, T.z, T.r - 1.2, T.r - 0.7)) b.poly(PLAZA_DK, q, GY + 0.018, GY + 0.022);
    // The promenade round the three sea walls: the wall's cope, a rail, pines, lamps, benches facing the water.
    path(-X, Z - PR, X, Z);
    for (const s of [-1, 1]) path(Math.min(s * X, s * (X - PR)), 52, Math.max(s * X, s * (X - PR)), Z);
    path(-X, 46, -X + 40, 52);
    path(X - 40, 46, X, 52);
    for (const [x0, z0, x1, z1] of [[-X, Z - 0.25, X, Z], [-X, 52, -X + 0.25, Z], [X - 0.25, 52, X, Z]] as Rect[]) {
      b.box(STONE, x0, GY, z0, x1, GY + 0.35, z1);
      b.deco('metal:#b0b5ba', x0, GY + 1.04, z0, x1, GY + 1.1, z1);
      b.deco('metal:#b0b5ba', x0, GY + 0.68, z0 + 0.1, x1 - 0.0, GY + 0.72, z1 - 0.1);
    }
    for (let x = -X + 4; x < X; x += 3) b.deco('metal:#b0b5ba', x - 0.04, GY + 0.35, Z - 0.17, x + 0.04, GY + 1.04, Z - 0.09);
    for (const s of [-1, 1]) for (let z = 54; z < Z; z += 3) b.deco('metal:#b0b5ba', s * (X - 0.13) - 0.04, GY + 0.35, z - 0.04, s * (X - 0.13) + 0.04, GY + 1.04, z + 0.04);
    for (const s of [-1, 1]) {
      b.deco(STONE, Math.min(s * X, s * (X + 2)), -0.03, 50, Math.max(s * X, s * (X + 2)), GY, Z + 2);
    }
    b.deco(STONE, -X - 2, -0.03, Z, X + 2, GY, Z + 2);
    for (let x = -X + 12; x < X - 6; x += 24) {
      if (Math.abs(x - T.x) < T.r + 4) continue;
      streetLamp(b, 'lamp_park', x, Z - PR + 0.5, [0, 1]);
      bench(x + 6, Z - 1.4, [0, -1]);
      tree('pine', x + 12, Z - PR - 2.5, x % 48 === 0 ? 'a' : 'b');
    }
    for (const s of [-1, 1]) for (let z = 60; z < Z - 8; z += 24) {
      streetLamp(b, 'lamp_park', s * (X - PR + 0.5), z, [s, 0]);
      bench(s * (X - 1.4), z + 6, [-s, 0]);
      tree('pine', s * (X - PR - 2.5), z + 12, 'b');
    }
    // Small lookouts at the point's two corners (and the far ends the walk test walks out to).
    for (const s of [-1, 1]) {
      b.poly(PLAZA_DK, disc(s * (X - 7), Z - 7, 6, 20), GY + 0.016, GY + 0.02);
      b.zone('street', Math.min(s * (X - 13), s * (X - 0.5)), GY - 0.2, Z - 13, Math.max(s * (X - 13), s * (X - 0.5)), GY + 8, Z - 0.5, s < 0 ? '西の見晴らし' : '東の見晴らし', s < 0 ? 'West Lookout' : 'East Lookout', true);
      b.sign({ k: 'label', text: s < 0 ? 'みなとセンター方面' : '川湊港・煉瓦倉庫方面', sub: s < 0 ? 'View west to Minato Center' : 'View east to the port', fg: '#ffffff', bg: '#3a6ea5' }, s * (X - 1.0), GY + 0.9, Z - 7, [-s, 0], 2.2, 0.5);
    }
    // The mall: the flower-bed crest at its head, camphors in two rows, lamps, benches, the fountain half way.
    b.model('umibe', 'kadan', 0, GY, PZ + 6.5, 0);
    solid([0, 0, PZ + 6.5 + U.kadan.pts._bed[2], 10.6, 10.3, 0, 0], 1.9);
    b.sign({ k: 'label', text: '花壇の市章', sub: 'The city crest in flowers', fg: NAVY, bg: '#e7e6e1' }, 0, GY + 0.45, PZ + 6.44, [0, -1], 2.4, 0.4);
    for (let z = PZ + 10; z < PK.mallEnd - 2; z += 10) {
      if (Math.abs(z - F.z) < F.r + 5) continue;
      for (const s of [-1, 1]) {
        tree('camphor', s * (M + 2.5), z, 'a');
        if (z % 20 < 10) streetLamp(b, 'lamp_park', s * (M - 1.3), z + 5, [-s, 0]);
        else bench(s * (M - 1.5), z + 5, [-s, 0]);
      }
    }
    b.poly(PLAZA, disc(F.x, F.z, F.r + 5, 32), GY + 0.008, GY + 0.018);
    for (const q of ring(F.x, F.z, F.r - 0.5, F.r, 32)) b.poly(STONE, q, GY, GY + 0.55);
    b.poly('water', disc(F.x, F.z, F.r - 0.5, 32), GY, GY + 0.4);
    b.mesh(STONE, 'cyl', F.x, GY + 0.7, F.z, 1.6, 1.4, 1.6);
    b.mesh('water', 'cyl', F.x, GY + 1.45, F.z, 1.3, 0.1, 1.3);
    b.block(F.x - F.r * 0.75, GY, F.z - F.r * 0.75, F.x + F.r * 0.75, GY + 1.2, F.z + F.r * 0.75);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.block(F.x + dx * F.r * 0.85 - 1.2, GY, F.z + dz * F.r * 0.85 - 1.2, F.x + dx * F.r * 0.85 + 1.2, GY + 0.6, F.z + dz * F.r * 0.85 + 1.2);
    b.zone('street', -M, GY - 0.2, PZ + 5, M, GY + 10, F.z - F.r - 5, '海辺公園 中央園路', 'Umibe Park, the Mall', true);
    b.zone('street', F.x - F.r - 5, GY - 0.2, F.z - F.r - 5, F.x + F.r + 5, GY + 10, F.z + F.r + 5, '噴水広場', 'Fountain Square', true);
    // The sea terrace and the sail monument, facing back up the mall.
    at('n', T.x, T.z - 3, () => {
      b.model('umibe', 'monument', 0, GY, 0, 0);
      b.block(-3.6, GY, -0.6, 3.6, GY + 15, 6.6);
      signAt(U.monument.pts.plaque, { k: 'label', text: `${NAMES.sail.ja} 開港記念`, sub: 'For the opening of the port', fg: '#e8d9b0', bg: '#3b2a1e' });
    });
    for (let k = 0; k < 8; k++) {
      const a = (Math.PI * (k + 0.5)) / 8, x = T.x + Math.cos(a) * (T.r - 3), z = T.z + Math.sin(a) * (T.r - 3);
      if (k % 2) streetLamp(b, 'lamp_park', x, z, [-Math.sign(Math.cos(a)) || 1, 0]);
      else bench(x, z, [0, -1]);
    }
    b.zone('street', T.x - T.r + 2, GY - 0.2, T.z - T.r + 2, T.x + T.r - 2, GY + 16, Math.min(Z - 0.5, T.z + T.r - 2), NAMES.terrace.ja, `${NAMES.terrace.en} and ${NAMES.sail.en}`, true);
    // The west lawn: the open-air stage at its far end facing north-east over the lawn, cherries round it.
    at('n', -84, 104, () => {
      const a = U.bandshell, s = a.pts._stage;
      b.model('umibe', 'bandshell', 0, GY, 0, 0);
      b.block(-a.w / 2, GY, 1.0, a.w / 2, GY + 0.9, a.d);
      b.block(-a.w / 2, GY, a.d - 0.4, a.w / 2, GY + 7, a.d);
      for (const sx of [-1, 1]) b.block(Math.min(sx * (a.w / 2 - 0.4), sx * a.w / 2), GY, 4, Math.max(sx * (a.w / 2 - 0.4), sx * a.w / 2), GY + 5, a.d);
      void s;
      signAt(a.pts.name, { k: 'label', text: NAMES.stage.ja, sub: NAMES.stage.en, fg: NAVY, bg: '#e7e6e1' });
      // Benches in rows on the lawn before it.
      for (let z = -5; z > -16; z -= 3.2) for (let x = -6.6; x <= 6.7; x += 2.2) {
        if (Math.abs(x) < 0.6) continue;
        roadModel(b, 'bench_s', x, GY, z, [0, 1]);
        b.block(x - 0.95, GY, z - 0.3, x + 0.95, GY + 0.8, z + 0.3);
      }
      b.deco(PATH, -9, GY + 0.008, -17.5, 9, GY + 0.016, 0.5);
    });
    b.zone('street', -96, GY - 0.2, 86, -72, GY + 8, 105, NAMES.stage.ja, NAMES.stage.en, true);
    path(-84 - 1.5, PZ + 5, -84 + 1.5, 87);
    for (const [x, z] of [[-110, 40], [-124, 64], [-108, 92], [-60, 44], [-52, 78], [-36, 100], [-128, 108], [-62, 112]]) tree('cherry', x, z, (x + z) % 3 ? 'a' : 'b');
    for (const [x, z] of [[-30, 36], [-134, 34], [-22, 64]]) tree('zelkova', x, z);
    // The east lawn: the rest house by the avenue, a play lawn, zelkovas and momiji; a path across to the promenade.
    at('n', 82, PZ + 9, () => {
      const a = U.kyukeijo;
      b.model('umibe', 'kyukeijo', 0, GY, 0, 0);
      b.block(-a.w / 2, GY, 0, a.w / 2, GY + 3.7, a.d);
      signAt(a.pts.name, { k: 'label', text: 'パークカフェ はまゆう', sub: 'Park Café Hamayū · coffee, curry, soft cream', fg: NAVY, bg: '#f4f3ee' });
      signAt(a.pts.toilet, { k: 'label', text: 'お手洗い', sub: 'Toilets', fg: '#ffffff', bg: '#1f5fae' });
      b.deco(PLAZA, -a.w / 2 - 1, GY + 0.008, -4.1, a.w / 2 + 1, GY + 0.016, 0.8);
      for (const x of [-5, -2.2]) {
        b.box('wood:#8a6a4a', x - 0.5, GY, -2.6, x + 0.5, GY + 0.72, -1.6);
        vending(b, 8.2, GY, 0.4, [0, -1], 'vending2', 'new');
      }
      vending(b, -8.2, GY, 0.4, [0, -1], 'vending', 'new');
    });
    b.zone('street', 74, GY - 0.2, PZ + 5, 90, GY + 6, PZ + 9.6, NAMES.rest.ja, NAMES.rest.en, true);
    path(82 - 1.5, PZ + 17, 82 + 1.5, 100);
    path(8, 99, X - PR, 102);
    path(-X + PR, 99, -8, 102);
    for (const [x, z] of [[30, 38], [56, 52], [112, 40], [130, 70], [40, 84], [104, 86], [64, 112], [120, 112], [24, 112]]) tree((x + z) % 4 === 0 ? 'momiji' : 'zelkova', x, z, (x * z) % 3 ? 'a' : 'b');
    for (let x = -X + 20; x < X - 10; x += 22) if (Math.abs(x) > M + 10 && clearOf(x, [[52, 64], [72, 92], [-72, -50], [-88, -80]])) tree('cherry', x, PZ + 9, 'b');
    for (const x of [-120, -40, 40, 118]) streetLamp(b, 'lamp_park', x, PZ + 4.4, [0, -1]);
    for (const [x, z] of [[-84, 60], [-84, 84], [82, 60], [82, 90], [-110, 100.5], [-40, 100.5], [40, 100.5], [112, 100.5]]) streetLamp(b, 'lamp_park', x + 2, z, [-1, 0]);
    b.zone('street', -X + PR, GY - 0.2, 26, -M - 12, GY + 10, 84, '海辺公園 西の芝生', 'Umibe Park, West Lawn', true);
    b.zone('street', M + 12, GY - 0.2, 40, X - PR, GY + 10, 98, '海辺公園 東の芝生', 'Umibe Park, East Lawn', true);
    b.zone('street', -X + 0.5, GY - 0.2, Z - PR, -40, GY + 6, Z - 0.4, '海辺のプロムナード 西', 'Seaside Promenade, west', true);
    b.zone('street', 40, GY - 0.2, Z - PR, X - 0.5, GY + 6, Z - 0.4, '海辺のプロムナード 東', 'Seaside Promenade, east', true);
    // The park's name stone at the mall's head, the police box and the bicycle park on the avenue's pavement edge.
    for (const s of [-1, 1]) {
      b.box('flat:#55585c', s * (M + 2) - 1.6, GY, PZ + 1.0, s * (M + 2) + 1.6, GY + 0.3, PZ + 1.8);
      b.box(STONE, s * (M + 2) - 1.4, GY + 0.3, PZ + 1.1, s * (M + 2) + 1.4, GY + 1.3, PZ + 1.7);
      b.sign({ k: 'label', text: NAMES.park.ja, sub: NAMES.park.en, fg: NAVY, bg: '#cfcdc6' }, s * (M + 2), GY + 0.8, PZ + 1.08, [0, -1], 2.5, 0.8);
    }
    at('n', 58, PZ, () => place(b, { kind: 'koban', ...NAMES.koban }));
    {
      const [x0, z0, x1, z1] = [-70, PZ + 0.4, -52, PZ + 5];
      b.deco('flat:#9a968c', x0, GY + 0.016, z0, x1, GY + 0.022, z1);
      for (let x = x0 + 0.8; x < x1 - 0.4; x += 0.62) for (const z of [z0 + 1.1, z1 - 1.1]) {
        if (r() < 0.3) continue;
        const d = b.dir([1, 0]);
        b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
      }
      b.sign({ k: 'label', text: '海辺市役所前駅 自転車駐車場', sub: 'Station bicycle park', fg: '#ffffff', bg: '#1f5fae' }, x1 + 0.4, GY + 1.9, (z0 + z1) / 2, [1, 0], 2.6, 0.5);
      b.box('metal:#8d9094', x1 + 0.3, GY, (z0 + z1) / 2 - 0.06, x1 + 0.42, GY + 2.2, (z0 + z1) / 2 + 0.06);
      b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, '駅 自転車駐車場', 'Station bicycle park', true);
    }
  }

  // ═════════════════════════ The fill ═════════════════════════
  let seed = 0;
  /** One civic-set building, its front's middle at (x, line), facing `face`, lettered with who is in it. */
  const firmAt = (face: Face, x: number, ln: number, id: string, name: Named, fg = NAVY, bg = '#f1efe8') => at(face, x, ln, () => {
    const a = V[id];
    b.model('civic', id, 0, GY, 0, ++seed);
    b.block(-a.w / 2, GY, 0, a.w / 2, GY + a.h, a.d);
    signAt(a.pts.name, { k: 'label', text: name.ja, sub: name.en, fg, bg });
    signAt(a.pts.plate, { k: 'label', text: name.ja, fg: '#e8e6df', bg: '#55585c' });
  });
  const n = (ja: string, en: string): Named => ({ ja, en });
  let gaps = 0;
  /** A gap site: coin parking, or a fenced bicycle park. */
  const gapSite = (rc: Rect, frontZ: number, kind: 'coin' | 'bikes' = 'coin') => {
    const [x0, z0, x1, z1] = rc, into = Math.abs(frontZ - z0) < Math.abs(frontZ - z1) ? 1 : -1;
    gaps++;
    if (kind === 'coin') {
      b.deco('asphalt', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      const wide = x1 - x0 > 9.5;
      for (let z = frontZ + into * 3, i = 0; Math.abs(z - frontZ) < z1 - z0 - 3; z += into * 2.6, i++) {
        for (const [a, e] of wide ? [[x0 + 0.3, x0 + 5.2], [x1 - 5.2, x1 - 0.3]] : [[x0 + 0.3, x1 - 0.3]]) {
          b.deco(WHITE, a, GY + 0.012, z - 0.05, e, GY + 0.018, z + 0.05);
          if (r() < 0.5 && Math.abs(z + into * 1.3 - frontZ) < z1 - z0 - 2.5 && e - a > 4.6) {
            const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
            roadModel(b, id, (a + e) / 2, GY, z + into * 1.3, [1, 0]);
            b.block((a + e) / 2 - len / 2, GY, z + into * 1.3 - wd / 2, (a + e) / 2 + len / 2, GY + ht, z + into * 1.3 + wd / 2);
          }
        }
      }
      b.sign({ k: 'label', text: 'コインパーキング', sub: 'Coin parking, 24 h', fg: '#1c1c1e', bg: '#f2c200' }, x0 + 1.4, GY + 2.6, frontZ + into * 0.6, [0, -into], 2.4, 0.6);
      b.box('metal:#8d9094', x0 + 0.2, GY, frontZ + into * 0.54, x0 + 0.32, GY + 2.95, frontZ + into * 0.66);
      b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, 'コインパーキング', `Coin parking ${gaps}`, true);
    } else {
      b.deco('flat:#9a968c', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      for (let z = z0 + 1.5; z < z1 - 1; z += 2.2) for (let x = x0 + 0.7; x < x1 - 0.5; x += 0.62) {
        if (r() < 0.4) continue;
        const d = b.dir([0, 1]);
        b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
      }
      b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, '自転車駐車場', `Bicycle park ${gaps}`, true);
    }
  };
  /** A board across a gap too narrow to use. */
  const board = (x0: number, x1: number, z: number) => b.box('metal:#9aa0a6', x0, GY, z - 0.05, x1, GY + 2.0, z + 0.05);
  const [C0, C1, A0, A1, B0, B1, D0, D1] = [-X, MIO.c - MIO.half - MIO.pave, MIO.c + MIO.half + MIO.pave, -(HAM.half + HAM.pave), HAM.half + HAM.pave, TOD.c - TOD.half - TOD.pave, TOD.c + TOD.half + TOD.pave, X];
  void [B0, B1];
  const LN0 = AVN - 30, LN1 = URS + 26; // the service lane between the two rows (z −52.75…−48)

  // ── The avenue's north side (to the 31 m line): government offices, a bank, the telephone exchange, a hotel ──
  firmAt('s', C1 - 10, AVN, 'm20b', n('川湊商工会議所', 'Kawaminato Chamber of Commerce'));
  firmAt('s', C1 - 20.6 - 12, AVN, 'm24', n('川湊法務合同庁舎', 'Legal Affairs Joint Offices'));
  firmAt('s', A0 + 10, AVN, 'm20', n('西海電信電話 海辺ビル', 'Seikai Telegraph & Telephone, Umibe Bldg'));
  firmAt('s', A1 - 30.6 - 12, AVN, 'm24b', n('紬橋銀行 海辺支店', 'Tsumugibashi Bank, Umibe Branch'), '#e8d9b0', '#3b2a1e');
  firmAt('s', A1 - 15, AVN, 'm30', n('川湊第二地方合同庁舎', 'Kawaminato Joint Government Bldg No. 2'));
  firmAt('s', D0 + 9, AVN, 'm18', n('西海生命 川湊ビル', 'Seikai Life, Kawaminato Bldg'));
  firmAt('s', D0 + 18.6 + 12, AVN, 'm24c', n('ホテル海辺 川湊', 'Hotel Umibe Kawaminato'), '#ffffff', '#7a1f2b');
  // (West edge: a planted verge. Between the exchange and the bank: a passage through to the service lane.
  //  East edge: a bicycle park beside the hotel.)
  b.box('flat:#55703f', C0, GY + 0.002, LN0, C1 - 44.6, GY + 0.5, AVN - 0.4);
  board(C0, C1 - 44.6, AVN - 0.4);
  {
    const [p0, p1] = [A0 + 20, A1 - 54.6];
    b.deco(LANE, p0, GY + 0.002, LN0, p1, GY + 0.012, AVN);
    b.zone('street', p0, GY - 0.2, LN0, p1, GY + 6, AVN, '通り抜け', 'Passage to the service lane', true);
  }
  gapSite([D0 + 42.6 + 0.2, LN0, D1, AVN - 0.3], AVN - 0.3, 'bikes');

  // ── The back street's south side: lower offices, the post office, a pharmacy under a clinic, the old lunch room ──
  firmAt('n', C1 - 10, URS, 'b20', n('海辺郵便局', 'Umibe Post Office'), '#ffffff', '#c8102e');
  firmAt('n', C1 - 20.6 - 7, URS, 'b14', n('はまゆう薬局・海辺内科クリニック', 'Hamayū Pharmacy · Umibe Clinic'), '#ffffff', '#1d8a4e');
  gapSite([C0 + 0.2, URS + 0.3, C1 - 35.2, LN1], URS + 0.3);
  firmAt('n', A0 + 7, URS, 'b14b', n('食堂 浜千鳥', 'Hamachidori Lunch Room: set meals, udon'), '#f1ece0', '#3b2a1e');
  firmAt('n', A0 + 15.55 + 12, URS, 'b24', n('川湊市水道局 海辺庁舎', 'City Waterworks Bureau'));
  firmAt('n', A1 - 18.6 - 9, URS, 'b18', n('西海新報 川湊支社', 'Seikai Shinpō, Kawaminato Office'));
  firmAt('n', A1 - 9, URS, 'b18b', n('川湊行政書士会館', 'Administrative Scriveners’ Hall'));
  board(A0 + 14, A0 + 15.55, URS + 0.3);
  board(A0 + 14, A0 + 15.55, LN1 - 0.3);
  firmAt('n', D0 + 12, URS, 'b24', n('川湊市 海辺保健センター', 'Umibe Health Centre'));
  firmAt('n', D0 + 24.6 + 10, URS, 'b20', n('川湊港湾合同庁舎 別館', 'Port Joint Offices, Annex'));
  b.box('flat:#55703f', D0 + 44.6, GY + 0.002, URS + 0.4, D1, GY + 0.5, LN1);
  board(D0 + 44.6, D1, URS + 0.4);

  // ── The service lanes behind the avenue's rows: paved, lit, the buildings' back doors, drinks machines, bicycles ──
  for (const [a, e, name] of [[C0, C1, '庁舎裏小路 西'], [A0, A1, '庁舎裏小路'], [D0, D1, '庁舎裏小路 東']] as const) {
    b.deco(LANE, a, GY + 0.002, LN1, e, GY + 0.012, LN0);
    b.deco('flat:#6f6a60', a, GY + 0.012, (LN0 + LN1) / 2 - 0.08, e, GY + 0.016, (LN0 + LN1) / 2 + 0.08);
    const k = Math.ceil((e - a) / 36);
    for (let i = 0; i < k; i++) b.zone('street', a + ((e - a) * i) / k, GY - 0.2, LN1, a + ((e - a) * (i + 1)) / k, GY + 6, LN0, name, `Service lane behind the offices${a === C0 ? ' (west)' : a === D0 ? ' (east)' : ''}${k > 1 ? ` ${i + 1}` : ''}`, true);
    for (let x = a + 8; x < e - 3; x += 16) {
      streetLamp(b, 'lamp_small', x, LN0 - 0.3, [0, -1]);
      if (r() < 0.6) vending(b, x + 4, GY, LN0 - 0.4, [0, -1], r() < 0.5 ? 'vending' : 'vending2', 'new');
    }
    reserved.push([a, LN1, e, LN0]);
  }

  // ── North of the back street: the store on the boulevard's corner, the shrine the fishermen brought with them, ──
  // ── a children's park, apartments where an office was, and more offices; rear yards to the wall at the edge ──
  const YARD = URN - 26;
  at('s', B0 + 7, URN, () => konbini(b, { type: 'corner', chain: 'asanagi' }));
  gapSite([B0 + 0.2, YARD, B0 + 14, URN - 9.4], YARD);
  firmAt('s', B0 + 14.6 + 12, URN, 'b24', n('川湊市職員会館', 'City Employees’ Hall'));
  firmAt('s', B0 + 39.2 + 7, URN, 'b14b', n('海辺印刷', 'Umibe Printing'), '#f1ece0', '#27344f');
  firmAt('s', B1 - 10, URN, 'b20', n('川湊土地家屋調査士会館', 'Land & House Surveyors’ Hall'));
  {
    // The gap between the printer's and the surveyors': a drinks corner.
    const [x0, x1] = [B0 + 53.2, B1 - 20];
    b.deco(LANE, x0, GY + 0.002, URN - 6, x1, GY + 0.012, URN);
    for (let k = 0; k < 2; k++) vending(b, x0 + 0.9 + k * 1.1, GY, URN - 5.4, [0, 1], k ? 'vending2' : 'vending', 'new');
    b.box('metal:#9aa0a6', x0, GY, URN - 6.1, x1, GY + 2.0, URN - 6);
    b.zone('street', x0, GY - 0.2, URN - 6, x1, GY + 6, URN, 'ドリンクコーナー', 'Drinks corner', true);
  }
  at('s', A0 + 4.5, URN, () => place(b, { kind: 'shrine', ...NAMES.shrine }));
  for (const [x, z] of [[A0 + 2.5, URN - 17], [A0 + 6.5, URN - 21], [A0 + 3, URN - 24]]) modelTree(b, 'camphor', x, z, 'b');
  b.box('flat:#b3ac9c', A0 + 9, GY, YARD, A0 + 9.2, GY + 1.6, URN - 14);
  b.box('flat:#55703f', A0, GY, YARD, A0 + 9, GY + 0.45, URN - 14.2);
  firmAt('s', A1 - 9, URN, 'b18b', n('川湊建設会館', 'Kawaminato Builders’ Hall'));
  firmAt('s', A1 - 18.6 - 10, URN, 'b20', n('西海信用金庫 海辺支店', 'Seikai Shinkin Bank, Umibe Branch'), '#ffffff', '#1f5fae');
  {
    // Apartments where an office sold up (a stock model: plainly newer than its row), flush to the bank's side.
    const x1 = A1 - 39.2, x0 = A0 + 9.6;
    const m = BUILDING_MODELS.filter((q) => q.kind === 'manshon' && !q.corner && q.w <= x1 - x0 && q.d <= 26).sort((p, q) => q.w - p.w || q.h - p.h)[0];
    at('s', x1 - m.w / 2, URN, () => {
      b.model(m.kind, m.id, 0, GY, 0, 3);
      b.block(-m.w / 2, GY, 0, m.w / 2, GY + m.h, m.d);
    });
    if (26 - m.d > 1) b.box('flat:#55703f', x1 - m.w, GY, YARD, x1, GY + 0.5, URN - m.d - 0.3);
    if (x1 - m.w - x0 > 3) gapSite([x0, YARD, x1 - m.w - 0.4, URN - 0.3], URN - 0.3, 'coin');
    else board(x0, x1 - m.w, URN - 0.3);
  }
  at('s', C0 + 7, URN, () => place(b, { kind: 'park', ...NAMES.pocket }));
  for (const [x, z] of [[C0 + 3, URN - 16], [C0 + 9, URN - 19], [C0 + 5, URN - 23]]) modelTree(b, 'zelkova', x, z, 'b');
  b.box('flat:#55703f', C0, GY, YARD, C0 + 14, GY + 0.45, URN - 12.2);
  firmAt('s', C1 - 7, URN, 'b14', n('海辺歯科・司法書士事務所', 'Umibe Dental · Judicial Scrivener'), '#ffffff', '#3a6ea5');
  firmAt('s', C1 - 14.6 - 9, URN, 'b18', n('川湊税理士会館', 'Tax Accountants’ Hall'));
  board(C0 + 14, C1 - 32.6, URN - 0.3);
  firmAt('s', D0 + 9, URN, 'b18', n('西海海運 本社', 'Seikai Kaiun Shipping'));
  firmAt('s', D0 + 18.6 + 12, URN, 'b24', n('川湊市 海辺消防署', 'Umibe Fire Station'), '#ffffff', '#c8102e');
  b.box('flat:#55703f', D0 + 42.6, GY + 0.002, YARD, D1, GY + 0.5, URN - 0.4);
  board(D0 + 42.6, D1, URN - 0.4);
  // The rear yards: beaten ground to a block wall at the edge, between the streets that run on north.
  {
    let from = -X;
    for (const [p, q] of [...nsCorr, [X, X] as [number, number]]) {
      if (p - from > 2) {
        b.deco('flat:#8a8378', from, GY + 0.002, LANE_Z[1], p, GY + 0.012, YARD);
        b.box('flat:#b3ac9c', from, GY, LANE_Z[1], p, GY + 1.7, LANE_Z[1] + 0.3);
        b.box('flat:#b3ac9c', from, GY, YARD - 0.15, p, GY + 1.7, YARD);
      }
      from = q;
    }
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  {
    const BIZ = ['office', 'zakkyo', 'manshon'];
    const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, rows = 6) => {
      if (x1 - x0 < 4.6 || z1 - z0 < 4.6) return;
      const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
      if (e - a < 4.6 || f1 - f0 < 8) return;
      b.with(FRAME[face], () => {
        let z = f0;
        for (let k = 0; k < rows && f1 - z > 8.5; k++) {
          const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds: BIZ, lo: true, bare: k > 0 });
          if (!lots.length) break;
          z = Math.max(...lots.map((l) => l[3])) + 0.8;
        }
      });
    };
    const lampOut = (x: number, z: number, f: [number, number], wide: boolean) => roadModel(b, wide ? 'lamp_led' : 'lamp_small', x, GY, z, f);
    // East and west: the avenue and the back street run on 180 m; office rows north of the avenue, the park's
    // shore strip south of it (lawn, a walk, the sea wall at z 52).
    const OUT = 180, CROSS = 90, CWH = 3.5;
    for (const s of [-1] as const) {
      const [u0, u1] = s > 0 ? [X, X + OUT] : [-X - OUT, -X];
      b.deco('asphalt', u0, -0.03, -AV.half, u1, 0.004, AV.half);
      for (const k of [-1, 1]) b.deco('paver', u0, -0.03, Math.min(k * AV.half, k * -AVN), u1, GY, Math.max(k * AV.half, k * -AVN));
      b.deco('asphalt', u0, -0.03, URA.c - URA.half, u1, 0.004, URA.c + URA.half);
      for (const k of [-1, 1]) b.deco('paver', u0, -0.03, Math.min(URA.c + k * URA.half, URA.c + k * (URA.half + URA.pave)), u1, GY, Math.max(URA.c + k * URA.half, URA.c + k * (URA.half + URA.pave)));
      b.deco('grass', u0, -0.03, -AVN, u1, GY - 0.02, 46);
      b.deco(PATH, u0, -0.03, 46, u1, GY, 51);
      b.deco(STONE, u0, -0.03, 51, u1, 0.4, 52);
      const xc = s > 0 ? X + CROSS : -X - CROSS;
      b.deco('asphalt', xc - CWH, -0.03, -N - 30, xc + CWH, 0.004, -AV.half);
      for (let u = u0 + 10, k = 0; u < u1 - 4; u += 24, k++) {
        const e = k % 2 ? 1 : -1;
        lampOut(u, e * (AV.half + 0.7), [0, -e], true);
        lampOut(u, URA.c + e * (URA.half + 0.45), [0, -e], false);
        if (k % 2) b.out.models.push({ kind: 'trees', id: 'pine_b', pos: b.pt(u, GY, 42), yaw: k, seed: 0, merge: true });
        else b.out.models.push({ kind: 'trees', id: 'camphor_b', pos: b.pt(u, GY, 30), yaw: k, seed: 0, merge: true });
      }
      for (const [g0, g1] of [[0.3, CROSS - CWH], [CROSS + CWH, OUT]]) {
        const [w0, w1] = s > 0 ? [X + g0, X + g1] : [-X - g1, -X - g0];
        const m = (AVN + URS) / 2;
        fillRect(w0, m + 0.4, w1, AVN - 0.2, 's');
        fillRect(w0, URS + 0.2, w1, m - 0.4, 'n');
        fillRect(w0, URN - 30, w1, URN - 0.2, 's', 1);
      }
      b.clearScenery(s > 0 ? X : -X - OUT - 2, -N - 40, s > 0 ? X + OUT + 2 : -X, 60);
    }
    // ── The dock quay (walked since 2026-11-25) ──
    // The Shinshio dock's south quay, its wall at z −160 from x −120 east (data/geography.ts: west of that the
    // landfill goes on north as the dock's west quay). The three 筋 end at the quay road; along it the dock's working
    // side faces Shinshio across the water: seafood eateries, a transit shed and the harbour office, the red-brick
    // seafood hall (walked into) and its neighbour warehouse, another warehouse and an eatery. Behind them their
    // yards, then a back lane along the rear yards of the civic rows.
    const DOCK_W = -120;
    b.deco('asphalt', DOCK_W, -0.03, QW + 0.4, X, 0.004, QL);
    b.deco(STONE, DOCK_W, -0.03, QW, X, GY + 0.35, QW + 0.4);
    b.deco('flat:#9e9b93', -X, GY + 0.002, -N, DOCK_W, GY + 0.012, LANE_Z[0]);
    b.zone('street', DOCK_W, -0.3, QW + 0.4, X, 8, QL, '海辺岸壁', 'Umibe Quay');
    b.zone('street', -X, -0.3, -N, DOCK_W, 8, LANE_Z[0], '船溜西岸壁', 'Dock west quay');
    // (The plot's north edge west of the dock runs through the west quay, which goes on north: a low rail.)
    b.box('metal:#7d858a', -X, GY, -N, DOCK_W, GY + 0.9, -N + 0.08);
    // Chain and bollards along the edge, the dock's lamps on the landward side, boats alongside.
    b.deco('metal:#5d666c', DOCK_W, GY + 0.45, QW + 0.42, X, GY + 0.49, QW + 0.5);
    for (let x = DOCK_W + 6; x < X; x += 13) roadModel(b, 'bollard', x, GY, QW + 0.6, [0, -1]);
    for (let x = DOCK_W + 14; x < X; x += 30) streetLamp(b, 'lamp_led', x, QL - 0.6, [0, -1]);
    for (const [id, x] of [['boat_a', -60], ['boat_b', 40], ['boat_a', 118]] as [string, number][]) at('n', x, QW - 4.2, () => b.model('port', id, 0, SEA_Y, 0, 0));
    {
      type Pc = ['port' | 'ichiba' | 'umibe', string];
      const anchors = { port: PORT, ichiba: ICHIBA, umibe: U };
      const EAT = [n('海鮮食堂 船溜', 'Funadamari Seafood Diner'), n('浜焼き まるかつ', 'Marukatsu Beach Grill'), n('寿司 ゆりかもめ', 'Sushi Yurikamome'), n('鯛めし 湊屋', 'Minatoya Tai-meshi')];
      let eat = 0;
      /** One building on the quay, front on the quay road facing the water; its yard behind it to the back lane. */
      const dock = ([kind, id]: Pc, x0: number) => {
        const a = anchors[kind][id], x1 = x0 + a.w;
        at('n', x0 + a.w / 2, QL + 0.3, () => {
          b.model(kind, id, 0, GY, 0, 7);
          if (kind === 'ichiba') signAt([0, 2.75, -1.45, a.w - 0.6, 0.22, 0, -1], { k: 'label', text: EAT[eat % EAT.length].ja, fg: '#ffffff', bg: '#1d2f55' });
          if (kind !== 'umibe') b.block(-a.w / 2, GY, 0, a.w / 2, GY + a.h, a.d);
        });
        if (kind === 'ichiba') eat++;
        const back = QL + 0.3 + a.d;
        if (LANE_Z[0] - back > 1.2) {
          b.deco('flat:#8a8378', x0, GY + 0.002, back, x1, GY + 0.012, LANE_Z[0]);
          b.zone('street', x0 + 0.1, -0.3, back + 0.1, x1 - 0.1, 6, LANE_Z[0], '裏庭', `Yard behind ${id}`, true);
          for (let x = x0 + 1; x < x1 - 1.5; x += 3.1) b.box(x % 2 < 1 ? 'flat:#3b78b8' : 'flat:#9c7a52', x, GY, back + 0.4, x + 1.3, GY + 0.6 + (Math.round(x) % 3) * 0.3, back + 1.5);
        }
        return x1 + 0.6;
      };
      const rows: [number, Pc[]][] = [
        [DOCK_W + 0.3, [['ichiba', 'c'], ['ichiba', 'h'], ['ichiba', 'a']]],
        [MIO.c + MIO.half + MIO.pave + 0.2, [['port', 'shed_b'], ['port', 'office'], ['ichiba', 'c'], ['ichiba', 'h'], ['ichiba', 'a']]],
        [HAM.c + HAM.half + HAM.pave + 0.2, [['umibe', 'renga'], ['port', 'soko_b']]],
        [TOD.c + TOD.half + TOD.pave + 0.2, [['port', 'soko_a'], ['ichiba', 'c']]],
      ];
      for (const [x0, list] of rows) {
        let x = x0;
        for (const pc of list) x = dock(pc, x);
      }
      // The seafood hall: walls round its inside, the floor, the restaurant at the west end, the fish shop at the
      // east, lights; its quay doors and its lane door are the openings in the model.
      const H = HAM.c + HAM.half + HAM.pave + 0.2 + U.renga.w / 2, a = U.renga, P = a.pts, hw = a.w / 2, d = a.d, T = 0.4;
      at('n', H, QL + 0.3, () => {
        signAt(P.name, { k: 'label', text: '浜辺赤煉瓦 海鮮館', sub: 'Hamabe Red Brick Seafood Hall', fg: '#f1e6c8', bg: '#3a2a22' });
        const gapsF = [P._doorw, P._doore].map((q): [number, number] => [q[0] - q[3] / 2, q[0] + q[3] / 2]);
        const gapsB: [number, number][] = [[P._back[0] - P._back[3] / 2, P._back[0] + P._back[3] / 2]];
        const wallX = (z0: number, z1: number, gaps: [number, number][], h: number) => {
          let x = -hw;
          for (const [p, q] of [...gaps, [hw, hw] as [number, number]]) {
            if (p - x > 0.05) b.box('flat:#d9cfbe', Math.max(x, -hw + 0.03), GY, z0, Math.min(p, hw - 0.03), GY + h, z1);
            x = q;
          }
        };
        // (Set 3 cm inside the model's outside faces, so the two never share a plane.)
        const I = 0.03;
        wallX(I, T, gapsF, 4.6);
        wallX(d - T, d - I, gapsB, 4.6);
        b.box('flat:#d9cfbe', -hw + I, GY, T, -hw + T, GY + 4.6, d - T);
        b.box('flat:#d9cfbe', hw - T, GY, T, hw - I, GY + 4.6, d - T);
        // Above the doors, the wall carried over them inside.
        for (const [p, q] of gapsF) b.deco('flat:#d9cfbe', p, GY + P._doorw[4] + 0.46, I, q, GY + 4.6, T);
        b.deco('flat:#d9cfbe', gapsB[0][0], GY + P._back[4] + 0.46, d - T, gapsB[0][1], GY + 4.6, d - I);
        b.slab('tile:#c9bba4', -hw + T, T, hw - T, d - T, GY + 0.002, GY + 0.02, [], false);
        b.deco('paint:#3a2a22', -hw + T, GY + 4.6, T, hw - T, GY + 4.75, d - T);
        for (let x = -hw + 4; x < hw - 2; x += 6) for (const z of [6, 15]) ceilingLight(b, x, x + 2.4, z - 0.15, z + 0.15, GY + 4.6);
        // The restaurant: a counter along the back with stools, tables down the middle.
        b.box('flat:#6b4a32', -hw + 1.2, GY, d - 3.4, -4, GY + 1.05, d - 2.6);
        b.box('flat:#3a2a22', -hw + T, GY, d - 1.2, -4, GY + 2.2, d - T);
        for (let x = -hw + 2; x < -5; x += 1.4) b.box('flat:#2a2d30', x - 0.2, GY, d - 4.4, x + 0.2, GY + 0.7, d - 4.0);
        for (const x of [-18, -13.5, -4.5]) for (const z of [6, 11]) {
          b.box('flat:#8a6a4a', x - 1.1, GY, z - 0.6, x + 1.1, GY + 0.74, z + 0.6);
          for (const s of [-1, 1]) b.box('flat:#3a2a22', x - 1.0, GY, z + s * 1.0 - 0.2, x + 1.0, GY + 0.45, z + s * 1.0 + 0.2);
        }
        b.sign({ k: 'label', text: '海鮮丼・浜焼き', sub: 'Seafood bowls · grill', fg: '#ffffff', bg: '#7a1f2b' }, -12, GY + 3.2, d - T - 0.02, [0, -1], 4.0, 0.7);
        // The fish shop: ice cases in two runs, a counter and scales at the back.
        for (const z of [6.5, 11.5]) {
          b.box('flat:#6b6e70', 3, GY, z - 0.8, hw - 3, GY + 0.85, z + 0.8);
          b.deco('flat:#e9f1f4', 3.1, GY + 0.85, z - 0.75, hw - 3.1, GY + 0.95, z + 0.75);
          for (let x = 3.4; x < hw - 3.4; x += 0.9) b.deco(x % 1.8 < 0.9 ? 'flat:#9aa6ad' : 'flat:#c86a4a', x, GY + 0.95, z - 0.5, x + 0.6, GY + 1.05, z + 0.5);
        }
        b.box('flat:#ece6d6', 3, GY, d - 2.6, hw - 3, GY + 1.0, d - 1.8);
        b.sign({ k: 'label', text: '鮮魚 浜辺', sub: 'Fresh fish', fg: '#ffffff', bg: '#1f4e8c' }, 12, GY + 3.2, d - T - 0.02, [0, -1], 4.0, 0.7);
        b.zone('street', -hw + T, -0.3, T, hw - T, 4.5, d - T, '浜辺赤煉瓦 海鮮館', 'Hamabe Red Brick Seafood Hall');
      });
    }
    // The back lane behind the quay row: paved, lit, back doors' clutter, the net store.
    const offRoad = (x: number, m: number) => clearOf(x, NS.map((q): [number, number] => [q.c - q.half - q.pave, q.c + q.half + q.pave]), m);
    for (const [p, q] of [[-X, MIO.c - MIO.half - MIO.pave], [MIO.c + MIO.half + MIO.pave, -HAM.half - HAM.pave], [HAM.half + HAM.pave, TOD.c - TOD.half - TOD.pave], [TOD.c + TOD.half + TOD.pave, X]]) b.deco('tile:#8f8a80', p, GY + 0.002, LANE_Z[0], q, GY + 0.012, LANE_Z[1]);
    for (let x = -X + 10; x < X - 3; x += 22) if (offRoad(x, 1)) streetLamp(b, 'lamp_small', x, LANE_Z[1] - 0.3, [0, -1]);
    for (let x = -X + 4; x < X - 3; x += 9) {
      if (!offRoad(x, 1.5)) continue;
      const k = Math.floor(r() * 3);
      if (k === 0) b.box('flat:#4f7a8a', x, GY, LANE_Z[1] - 0.7, x + 1.2, GY + 1.0, LANE_Z[1] - 0.1);
      else if (k === 1) b.box('flat:#c8b23a', x, GY, LANE_Z[1] - 0.5, x + 0.9, GY + 0.6, LANE_Z[1] - 0.1);
    }
    {
      const k = Math.ceil((2 * X) / 36);
      for (let i = 0; i < k; i++) b.zone('street', -X + ((2 * X) * i) / k, -0.3, LANE_Z[0], -X + ((2 * X) * (i + 1)) / k, 6, LANE_Z[1], '岸壁裏小路', `Quay back lane ${i + 1}`, true);
    }
    // Past the east edge: the quay road goes on to the dock's corner, a last warehouse on it, and turns north up the
    // dock's east side (Shinshio's side quay).
    b.deco('asphalt', X, -0.03, QW + 0.4, 192, 0.004, QL);
    b.deco(STONE, X, -0.03, QW, 180, GY + 0.35, QW + 0.4);
    b.deco('flat:#9e9b93', 180, -0.03, -260, 192, GY, QW + 0.4);
    at('n', X + 0.6 + PORT.soko_b.w / 2, QL + 0.3, () => b.model('port', 'soko_b', 0, GY, 0, 7));
    b.clearScenery(X, -270, 200, -N);
    b.clearScenery(-X - 40, -N - 12, X + 40, -N);
  }
  void reserved;

  // ═════════════════════════ The link east to Kawaminato-kō ═════════════════════════
  umibeEast(c, { r, at, signAt, junction, lane, firmAt, gapSite, board, lampAt });
}
