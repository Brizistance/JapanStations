// Shinshio's street (新潮): the fish-market town at the end of the Kikyō Line, after a big city's outer market
// and the wholesale hall on its quay (docs/theme-notes.md "Fish market town").
//
// THE PLAN (station frame: +x east along the Kikyō Line, +z south; plot x ±150, z −91.5…51.5, shinshio-plan.ts,
// where the same streets are the table SHINSHIO_STREETS that street-rules.test.ts holds this build to)
//
//   The ground is the port landfill between two walls of water: the river mouth's sea wall at z −92 and the
//   Shinshio dock's quay wall at z 52, which runs the plot's whole width. Land goes on east and west.
//
//   Street                       Centre line   Width   What it is
//   新潮臨港通 Shinshio-rinkō-dōri z = 0         35 m    the bay road over the station: four lanes (|z| ≤ 9), a hatched
//                                                      centre, pavements 8.5 m with the two exits in them
//   浜通 Hama-dōri                z = −66       10.5 m  the back street along the sea-wall strip, two lanes
//   場外筋 Jōgai-suji             x = −45       11 m    the outer market's street, from the bay road (Exit 1 at its
//                                                      mouth) to Hama-dōri, where the ferry terminal closes the view
//   冷蔵庫筋 Reizōko-suji         x = 100       12 m    the trucks' street, Hama-dōri to the quay across the bay road
//   場外横丁 the covered alley    z = −39       3.5 m   through both outer-market blocks; 3 m alleys off it at x −100
//                                                      and 0, a dead end at x 50
//   新潮岸壁 Shinshio Quay        z 44…51.5     7.5 m   the apron along the dock, walked the plot's width
//   The sea-wall promenade       z −91.5…−84.5  7 m    behind the ferry terminal, the pontoon's gangway off it
//
//   Pavements on the three small streets are 3 m (widened 2026-11-25).
//   Blocks: the outer market x −150…−51.5 and −38.5…93, z −59.75…−17.5; the corner x 107…150 the same; the
//   sea-wall strip north of Hama-dōri; the market south of the bay road, x −150…93, z 17.5…44; the shrine's
//   corner x 107…150, z 17.5…44.
//
//   Landmarks: 新潮魚市場 the fish market hall, x −95…55, z 24…44 (its truck bays to the building line in
//   front, its roof over the quay behind), the auction floor walked; 新潮フェリーターミナル the ferry terminal,
//   x −65…−25, z −84.25…−72.25, walked through to the promenade and the gangway; 潮守恵比須神社 the harbour
//   shrine, x 115…133, z 22…44, its torii on the quay.
//
//   Edges: north the sea wall, south the dock (real boundaries). East and west the bay road and Hama-dōri run
//   on 130 m between rows of cold stores and flats. No neighbour's plot touches this one.
//
// Step 1 (streets and landmarks) and step 2 (the fill, signal mountings by junction), 2026-11-25.

import { CARS, VEH, family } from '../traffic/vehicles';
import { rng, type LanePart } from '../world/builder';
import { SHINSHIO as S } from './anchors/shinshio';
import { ICHIBA } from './anchors/ichiba';
import { PORT } from './anchors/port';
import { CIVIC } from './anchors/civic';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import type { Ctx } from './kit';
import { GROUND_Y, vending } from './kit';
import { konbini } from './konbini';
import { BUILDING_MODELS } from './buildings';
import { place } from './places';
import { leftovers } from './tsumugibashi-street';
import { kerbRail, pedSignal, poleLine, roadModel, roadName, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal, type PoleStyle } from './roads';
import { crosswalk, fillModelLots, isAlleyLot, type SurfaceSpec } from './surface';
import { modelTree } from './trees';
import { SHINSHIO_LANES as LN, SHINSHIO_LINES as BL, SHINSHIO_PLOT, SHINSHIO_RESERVED, SHINSHIO_SITES as SITE, SHINSHIO_STREETS } from './shinshio-plan';

const S_ICE = ICHIBA.ice;

type Rect = [number, number, number, number];
type Named = { ja: string; en: string };
type Face = 'n' | 's' | 'e' | 'w';
type St = (typeof SHINSHIO_STREETS)[number];
const X = SHINSHIO_PLOT.x, Z = SHINSHIO_PLOT.z, N = SHINSHIO_PLOT.north;
/** The bay road's building line, which the pavement exits are fitted to (the structure's edge + 5.5). */
const FRONT = 17.5;
const BARE = 'flat:#8d877b', WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#bdb9b0', LANE = 'tile:#8f8a80';
const CONC = 'flat:#a9a69e', QUAY = 'flat:#9e9b93', YARD = 'flat:#7d7a74', GRAVEL = 'flat:#cbc5b8';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const SL = 5.2;

const st = (en: string) => SHINSHIO_STREETS.find((s) => s.en.startsWith(en))!;
const AV = st('Shinshio'), HA = st('Hama'), JO = st('Jōgai'), RE = st('Reizōko');
const NS = [JO, RE], EW = [HA, AV];
const short = (s: Named): Named => ({ ja: s.ja, en: s.en.split(' (')[0] });
const span = (s: St): [number, number] => [s.a0 ?? -N, s.a1 ?? Z];
export const SHINSHIO_NAMES = {
  hall: { ja: '新潮魚市場', en: 'Shinshio Fish Market' },
  terminal: { ja: '新潮フェリーターミナル', en: 'Shinshio Ferry Terminal' },
  pier: { ja: 'フェリーのりば', en: 'Ferry pier' },
  shrine: { ja: '潮守恵比須神社', en: 'Shiomori Ebisu Shrine' },
  alley: { ja: '新潮場外横丁', en: 'Shinshio Jōgai Yokochō' },
  quay: { ja: '新潮岸壁', en: 'Shinshio Quay' },
  prom: { ja: '新潮海岸通路', en: 'Shinshio Sea-wall Walk' },
};

export function shinshioStreet(c: Ctx, spec: SurfaceSpec, cw: number) {
  const { b } = c, sta = c.station, GY = GROUND_Y;
  if (Math.abs(cw + 5.5 - FRONT) > 0.01) throw new Error(`shinshioStreet: the exits' building line moved (${cw + 5.5}); the bay road's pavements are fitted to ${FRONT}`);
  if (AV.half + AV.pave !== FRONT) throw new Error('shinshioStreet: the bay road no longer meets the exits’ building line');
  b.out.plot = { ...SHINSHIO_PLOT };
  const r = rng(spec.seed);
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);
  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: Parameters<typeof b.sign>[0]) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);

  // ═════════════════════════ Ground ═════════════════════════
  const wells: Rect[] = b.out.holes.map(([x0, z0, x1, z1]): Rect => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  const carriage: Rect[] = [
    [-X, -AV.half, X, AV.half], [-X, HA.c - HA.half, X, HA.c + HA.half],
    ...NS.map((s): Rect => [s.c - s.half, span(s)[0], s.c + s.half, span(s)[1]]),
  ];
  b.slab('asphalt', -X, -N, X, Z, -0.6, 0, wells);
  b.slab(BARE, -X, -N, X, Z, 0, GY, [...wells, ...carriage]);
  const pave = (x0: number, z0: number, x1: number, z1: number, mat = 'paver') => b.slab(mat, x0, z0, x1, z1, GY + 0.002, GY + 0.014, [...wells, ...carriage], false);
  pave(-X, BL.avN, X, -AV.half);
  pave(-X, AV.half, X, BL.avS);
  pave(-X, BL.haN, X, BL.haS);
  for (const s of NS) pave(s.c - s.half - s.pave, span(s)[0], s.c + s.half + s.pave, s === RE ? BL.quay : BL.avN);
  pave(RE.c - RE.half - RE.pave, BL.avS, RE.c + RE.half + RE.pave, BL.quay);
  // The quay apron and its wall; the sea-wall promenade and its parapet.
  pave(-X, BL.quay, X, Z, QUAY);
  b.deco(STONE, -X - 140, -0.4, Z, X + 140, GY + 0.02, 52);
  for (let x = -X + 6; x < X; x += 12) {
    roadModel(b, 'bollard', x, GY, Z - 0.3, [0, 1]);
  }
  pave(-X, -N, X, BL.prom, 'tile:#b5ad9d');
  b.box(STONE, -X, 0, -92, X, GY + 1.0, -N + 0.35);
  b.zone('street', -X, -0.3, -N, X, 120, Z, `${sta.nameJa}駅前`, `${sta.nameRomaji} — street level`);
  // Plot edges: the parapet and the quay's rail are the walls on the water sides; open ends east and west are walled
  // where the streets run on (only seen).
  b.block(-X - 1, -1, -N - 1, -X, 60, Z + 1);
  b.block(X, -1, -N - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -N - 1, X, 60, -N);
  b.block(-X, -1, Z, X, 60, Z + 1);
  // The quay rail: a low chain between bollards along the dock's edge.
  b.deco('metal:#5d666c', -X, GY + 0.45, Z - 0.34, X, GY + 0.49, Z - 0.26);
  b.out.district = { radius: 420, old: [0, -40], oldRadius: 0, towers: 0 };

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
  // The bay road: two lanes each way (3.5 m), a 2 m hatched centre between yellow lines, a 1 m strip at each kerb.
  for (const s of [-1, 1]) {
    dash('x', s * 4.5, -X, X, boxX);
    line('x', s * 1.0, -X, X, boxX, YELLOW, 0.06);
    line('x', s * (AV.half - 1.0), -X, X, boxX);
  }
  for (let x = -X + 2; x < X - 2; x += 4) if (clearOf(x, boxX)) b.deco(WHITE, x, 0.004, -0.9, x + 0.25, 0.01, 0.9);
  dash('x', HA.c, -X, X, [...boxX, [RE.c - 12, RE.c + 12]]);
  for (const s of NS) dash('z', s.c, span(s)[0], span(s)[1], boxZ);

  // ═════════════════════════ Junctions and lanes ═════════════════════════
  const inPlot = (x: number, z: number) => x > -X + 0.5 && x < X - 0.5 && z > -N + 0.6 && z < Z - 0.5;
  /**
   * A signalled junction of a north–south street (cx, hx, driven the ways `ns`: 1 south, −1 north) and an east–west
   * one (cz, hz, `ew`). `north`/`south` false: the north–south street does not go on that way (a T).
   * `style`: the mast (street-design.md "Traffic signals"); `mast`: masts on the narrow street too, not the
   * short-arm pole; `zebra`: hooded heads with the striped back board on the old curved arm.
   */
  const junction = (cx: number, hx: number, ns: (1 | -1)[], cz: number, hz: number, ew: (1 | -1)[], name: Named, north: boolean, south: boolean, o: { style?: PoleStyle; mast?: boolean; zebra?: boolean } = {}) => {
    const wideNS = hx > 4.6 || !!o.mast, wideEW = hz > 4.6 || !!o.mast, so = { style: o.style ?? 'new', zebra: o.zebra, flat: o.style === 'old' ? false : undefined };
    for (const sz of [-1, 1] as const) {
      if ((sz === 1 && !south) || (sz === -1 && !north)) continue;
      const zc = cz + sz * (hz + 2.6);
      crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
      for (const sx of [-1, 1] as const) pedSignal(b, cx + sx * (hx + 0.8), zc + sz * 2.0, [-sx, 0], 0, { flat: true, button: !wideNS, speaker: wideNS });
    }
    for (const sx of [-1, 1] as const) {
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
      for (const sz of [-1, 1] as const) pedSignal(b, xc + sx * 2.0, cz + sz * (hz + 0.8), [0, -sz], 1, { flat: true, button: !wideEW, speaker: wideEW });
    }
    for (const sx of ew) {
      const lz = -sx, xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      // (Across a T from its stem the building line is close: the pole stands at the kerb, its arm clear of the fronts.)
      const pz = cz + lz * (hz + (lz < 0 && !north ? 0.75 : 1.5));
      if (wideEW) vehicleSignal(b, cx + sx * (hx + 1.9), pz, [sx, 0], 6.5, 0, name, { ...so, back: false });
      else shortSignal(b, cx + sx * (hx + 1.9), pz, [sx, 0], 0, name);
    }
    for (const sz of ns) {
      if ((sz === 1 && !north) || (sz === -1 && !south)) continue;
      const lx = sz, zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      const pz = cz + sz * (hz + (sz < 0 && !north ? 0.75 : 2.0));
      if (wideNS) vehicleSignal(b, cx + lx * (hx + 1.6), pz, [0, sz], hx + 1.6 - hx / 2, 1, name, { ...so, back: ns.length > 1 });
      else shortSignal(b, cx + lx * (hx + 1.5), pz, [0, sz], 1, name);
    }
    // The control cabinet on a corner with a pavement behind it: the south side across from a T's closed north.
    const [gx, gz] = [cx - hx - 2.6, north ? cz - hz - 3.2 : cz + hz + 2.2];
    if (inPlot(gx, gz)) {
      roadModel(b, 'sigbox', gx, GY, gz, [0, 1]);
      b.block(gx - 0.36, GY, gz - 0.26, gx + 0.36, GY + 1.56, gz + 0.26);
    }
  };
  const J = {
    ekimae: { ja: '新潮駅前', en: 'Shinshio-ekimae' },
    ichiba: { ja: '魚市場前', en: 'Uoichiba-mae' },
    ferry: { ja: 'フェリーのりば前', en: 'Ferī-noriba-mae' },
    reizo: { ja: '冷蔵庫筋北', en: 'Reizōko-suji-kita' },
  };
  // Four mountings, by street and age: by the station the bay road's signals share the street lights' grey poles
  // (a rebuilt station front); at the market the lorry road's long 6.5 m arms; at the ferry the old curved arms with
  // hooded heads and striped boards; on the cold-store street the short-arm pole of a narrow street.
  junction(JO.c, JO.half, [1, -1], AV.c, AV.half, [1, -1], J.ekimae, true, false, { style: 'shared' });
  junction(RE.c, RE.half, [1, -1], AV.c, AV.half, [1, -1], J.ichiba, true, true, { style: 'long' });
  junction(JO.c, JO.half, [1, -1], HA.c, HA.half, [1, -1], J.ferry, false, true, { style: 'old', mast: true, zebra: true });
  junction(RE.c, RE.half, [1, -1], HA.c, HA.half, [1, -1], J.reizo, false, true);

  type Cross = { c: number; half: number };
  const stops = (dir: 1 | -1, from: number, cross: Cross[], axis: 0 | 1, len: number): LanePart['stops'] =>
    cross.map((q) => {
      const t = (q.c - from) * dir;
      return { at: t - q.half - SL - 0.5, axis, exit: Math.min(len, t + q.half + SL) };
    }).filter((q) => q.at > 2 && q.at < len).sort((p, q) => p.at - q.at);
  const lane = (o: { speed: number; flow: number; use: LanePart['use'] }, x0: number, z0: number, x1: number, z1: number, more: Partial<LanePart> = {}) => {
    const alongX = Math.abs(x1 - x0) > 1, dir = Math.sign(alongX ? x1 - x0 : z1 - z0) as 1 | -1;
    trafficLane(b, x0, z0, x1, z1, {
      speed: o.speed / 3.6, flow: o.flow, use: o.use, taxi: 0.1, halts: [],
      stops: alongX ? stops(dir, x0, NS, 0, Math.abs(x1 - x0)) : stops(dir, z0, EW, 1, Math.abs(z1 - z0)),
      ...more,
    });
  };
  const big = { speed: 50, flow: 2.0, use: 'all' as const }, small = { speed: 30, flow: 0.7, use: 'general' as const };
  // Traffic keeps left: eastbound on the north half, southbound on the east half. Lorries all day on the bay road.
  for (const z of [2.75, 6.25]) {
    lane(big, -X, -z, X, -z);
    lane(big, X, z, -X, z);
  }
  lane(small, -X, HA.c - 1.6, X, HA.c - 1.6);
  lane(small, X, HA.c + 1.6, -X, HA.c + 1.6);
  for (const s of NS) {
    const [a0, a1] = span(s), z0 = HA.c - 1, z1 = s === RE ? a1 - 2 : AV.c + 1;
    void a0;
    lane(small, s.c + 1.6, z0, s.c + 1.6, z1, { dead: true });
    lane({ ...small, flow: s === RE ? 0.4 : 0 }, s.c - 1.6, s === RE ? a1 - 2 : -1, s.c - 1.6, HA.c + 1, { dead: true });
  }

  // ═════════════════════════ Lamps, rails, trees, boards ═════════════════════════
  const carrX = NS.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const carrZ = EW.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const EXITS: [number, number][] = [[-61, -52], [36, 45]];
  const lampAt = (a0: number, a1: number, corr: [number, number][], step = 18) => {
    const out: number[] = [];
    for (let u = a0 + step / 2; u < a1 - 1; u += step) {
      const hit = corr.find(([p, q]) => u > p - 3.8 && u < q + 3.8);
      out.push(hit ? (u - hit[0] < hit[1] - u ? hit[0] - 3.9 : hit[1] + 3.9) : u);
    }
    return out;
  };
  lampAt(-X, X, [...carrX, ...EXITS]).forEach((x, k) => {
    const s = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_led', x, s * (AV.half + 0.7), [0, -s]);
  });
  // The three small streets keep their wires overhead (the bay road's are buried): a pole line along one kerb, whose
  // poles carry lights, drops to the buildings behind and lines across; plain lamps along the other kerb.
  const poleName = { ja: sta.nameJa, en: sta.nameRomaji };
  poleLine(b, { axis: 'x', from: -X + 6, to: X - 6, at: HA.c - HA.half - 0.4, road: 1, step: 26, skip: (u) => !clearOf(u, carrX, 6), drops: 0.7, cross: 2 * HA.half + HA.pave + 0.4, name: poleName });
  lampAt(-X, X, carrX, 24).forEach((x) => streetLamp(b, 'lamp_small', x, HA.c + HA.half + 0.45, [0, -1]));
  for (const s of NS) {
    const [a0, a1] = span(s);
    const runs: [number, number][] = s === RE ? [[a0 + 4, -AV.half - 6], [AV.half + 6, a1 - 2]] : [[a0 + 4, a1 - 6]];
    for (const [u0, u1] of runs) poleLine(b, { axis: 'z', from: u0, to: u1, at: s.c + s.half + 0.4, road: -1, step: 24, drops: 0.7, cross: 2 * s.half + s.pave + 0.4, name: poleName });
    lampAt(a0, a1, carrZ, 22).forEach((z) => streetLamp(b, 'lamp_small', s.c - s.half - 0.45, z, [1, 0]));
  }
  // The quay and the promenade: harbour lamps on the landward side.
  for (let x = -X + 15; x < X; x += 26) {
    streetLamp(b, 'lamp_led', x, BL.quay + 0.8, [0, 1]);
    streetLamp(b, 'lamp_small', x + 8, -84.2, [0, -1]);
  }
  // Guard rail along the bay road's kerbs, open at the corners, by the exits and at the bus stops.
  const BUS: [number, number][] = [[-120, -100], [60, 80]];
  const mouths: [number, number][] = [...nsCorr.map(([p, q]): [number, number] => [p - 5, q + 5]), ...EXITS, ...BUS];
  for (const s of [-1, 1]) {
    let run: number | null = null;
    for (let x = -X + 1.25; x <= X; x += 2.5) {
      // (South of the bay road Jōgai-suji has no mouth: the rail runs on past it.)
      const ok = x < X - 1 && clearOf(x, s > 0 ? mouths.filter(([p]) => p !== nsCorr[0][0] - 5) : mouths, 1.3);
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
  // Japanese black pines along the bay road, as on a sea front.
  for (let x = -X + 14; x < X - 4; x += 16) if (clearOf(x, nsCorr, 7) && clearOf(x, EXITS, 3) && clearOf(x, BUS, 1)) for (const s of [-1, 1]) modelTree(b, 'pine', x, s * (AV.half + 2.2), 'b', GY, true);
  roadName(b, JO.c - JO.half - JO.pave - 2, BL.avN + 0.6, [0, 1], short(AV));
  roadName(b, RE.c + RE.half + RE.pave + 2, BL.avS - 0.6, [0, -1], short(AV));
  roadName(b, JO.c + JO.half + JO.pave - 0.6, BL.avN - 8, [-1, 0], short(JO));
  roadName(b, RE.c - RE.half - RE.pave + 0.6, BL.avN - 8, [1, 0], short(RE));
  roadName(b, RE.c + RE.half + RE.pave + 2, BL.haS - 0.4, [0, -1], short(HA));
  roadName(b, JO.c - JO.half - JO.pave - 2, BL.haS - 0.4, [0, -1], short(HA));
  for (const s of NS) roadSign(b, 'speed30', s.c + s.half + 0.5, BL.avN - 14, [0, 1], 0.6);
  for (const sx of [-1, 1]) roadSign(b, 'speed30', sx * (X - 10), HA.c - sx * (HA.half + 0.5), [-sx, 0], 0.6);
  // A bus stop each way on the bay road; buses stop in the kerb lane.
  for (const [sx, x] of [[1, 70], [-1, -110]] as const) {
    const s = -sx, f: [number, number] = [0, -s];
    roadModel(b, 'busstop', x + sx * 6.5, GY, s * (AV.half + 0.75), f);
    b.block(x + sx * 6.5 - 0.15, GY, s * (AV.half + 0.75) - 0.15, x + sx * 6.5 + 0.15, GY + 2.6, s * (AV.half + 0.75) + 0.15);
    roadModel(b, 'shelter', x, GY, s * (AV.half + 2.7), f);
    for (const px of [x - 1.9, x + 1.9]) b.block(px - 0.1, GY, s * (AV.half + 2.7) - 0.1, px + 0.1, GY + 2.5, s * (AV.half + 2.7) + 0.1);
    b.sign({ k: 'label', text: sx > 0 ? '魚市場前' : '新潮駅前', sub: sx > 0 ? 'Uoichiba-mae (bus stop)' : 'Shinshio-ekimae (bus stop)', fg: '#ffffff', bg: '#1f5fae' }, x + sx * 6.5, GY + 2.2, s * (AV.half + 0.75) - s * 0.12, f, 0.5, 0.5);
    for (const ln of b.out.lanes) if (Math.abs(ln.from[2] - s * 6.25) < 0.1 && Math.abs(ln.to[2] - s * 6.25) < 0.1) ln.halts = [...ln.halts, { at: (x + sx * 6.5 - ln.from[0]) * sx, side: 0 }];
  }

  // ═════════════════════════ The outer market's lanes ═════════════════════════
  // Paved and lit now; their shop rows come in step 2. The covered alley gets its roof with the rows.
  for (const [x0, x1] of LN.alley.runs) {
    b.slab(LANE, x0, LN.alley.z0, x1, LN.alley.z1, GY + 0.002, GY + 0.016, [], false);
    for (let x = x0 + 6; x < x1 - 2; x += 12) streetLamp(b, 'lamp_small', x, LN.alley.z0 + 0.3, [0, 1]);
    b.zone('street', x0, -0.3, LN.alley.z0, x1, 8, LN.alley.z1, SHINSHIO_NAMES.alley.ja, SHINSHIO_NAMES.alley.en);
  }
  for (const [x0, x1, z0, z1] of LN.cuts) {
    b.slab(LANE, x0, z0, x1, z1, GY + 0.002, GY + 0.016, [], false);
    for (let z = z0 + 5; z < z1 - 2; z += 12) streetLamp(b, 'lamp_small', x0 + 0.3, z, [1, 0]);
  }

  // ═════════════════════════ The fish market hall ═════════════════════════
  {
    const a = S.ichiba, P = a.pts, hx0 = SITE.hall.x - a.w / 2, hx1 = SITE.hall.x + a.w / 2, z0 = SITE.hall.line, z1 = z0 + a.d;
    // The truck bays: concrete from the building line to the hall, kerbed off the pavement.
    b.slab(CONC, -X, BL.avS, RE.c - RE.half - RE.pave, z0, GY + 0.002, GY + 0.012, [], false);
    b.slab(CONC, hx0, z0, hx1, z1, GY + 0.002, GY + 0.02, [], false);
    for (let x = hx0 + 20; x < hx1 - 2; x += 7.5) b.deco(YELLOW, x - 0.06, GY + 0.012, z0 - 5.5, x + 0.06, GY + 0.016, z0 - 0.3);
    at('n', SITE.hall.x, z0, () => {
      b.model('shinshio', 'ichiba', 0, GY, 0, 0);
      signAt(P.name, { k: 'label', text: SHINSHIO_NAMES.hall.ja, sub: SHINSHIO_NAMES.hall.en, fg: '#ffffff', bg: '#1d2f55' });
      signAt(P.gate, { k: 'label', text: '見学者入口', sub: 'Visitors’ entrance', fg: '#1d2f55', bg: '#f4f1ea' });
    });
    // Colliders: the office, the columns, the low walls between the truck bays.
    const [ox, , oz, ow, od] = P._office;
    b.block(SITE.hall.x + ox - ow / 2, GY, z0 + oz - od / 2, SITE.hall.x + ox + ow / 2, GY + 7.4, z0 + oz + od / 2);
    const BAY = 7.5, n = Math.round(a.w / BAY);
    for (let k = 0; k <= n; k++) {
      const x = hx0 + k * BAY;
      for (const z of [0.3, a.d / 2, a.d - 0.3]) {
        if (x < hx0 + ow - 0.1 && z < a.d - 1) continue;
        b.block(x - 0.2, GY, z0 + z - 0.2, x + 0.2, GY + 7.2, z0 + z + 0.2);
      }
      if (k < n && k % 2 === 0 && hx0 + k * BAY + 0.2 >= hx0 + ow) b.block(x + 0.2, GY, z0 + 0.1, x + BAY - 0.2, GY + 1.25, z0 + 0.5);
    }
    // The auction floor's pallets: low blocks you walk round.
    b.zone('street', hx0 + ow, -0.3, z0, hx1, 9, z1, SHINSHIO_NAMES.hall.ja + ' 卸売場', 'Shinshio Fish Market — auction floor');
    b.zone('street', -X, -0.3, BL.quay, X, 8, Z, SHINSHIO_NAMES.quay.ja, SHINSHIO_NAMES.quay.en);
  }

  // ═════════════════════════ The ferry terminal and the pontoon ═════════════════════════
  {
    const a = S.terminal, P = a.pts, hw = a.w / 2, d = a.d, [, , , dw] = P._door;
    at('s', SITE.terminal.x, SITE.terminal.line, () => {
      b.model('shinshio', 'terminal', 0, GY, 0, 0);
      signAt(P.name, { k: 'label', text: SHINSHIO_NAMES.terminal.ja, sub: SHINSHIO_NAMES.terminal.en, fg: '#ffffff', bg: '#1d2f55' });
      signAt(P.board, { k: 'label', text: '乗船券売場', sub: 'Ferry tickets', fg: '#1d2f55', bg: '#f4f1ea' });
      // Walls, open at the street door and the pier door; the floor inside; the waiting benches.
      for (const z of [0, d - 0.35]) {
        b.block(-hw, GY, z, -dw / 2, GY + 4.2, z + 0.35);
        b.block(dw / 2, GY, z, hw, GY + 4.2, z + 0.35);
      }
      for (const s of [-1, 1]) b.block(s * P._post[0] - 0.12, GY, P._post[2] - 0.12, s * P._post[0] + 0.12, GY + 3.2, P._post[2] + 0.12);
      b.block(-hw, GY, 0, -hw + 0.3, GY + 4.2, d);
      b.block(hw - 0.3, GY, 0, hw, GY + 4.2, d);
      b.slab('tile:#d9d6cf', -hw + 0.3, 0.35, hw - 0.3, d - 0.35, GY + 0.002, GY + 0.02, [], false);
      for (const x of [-14, -9, 9, 14]) {
        b.box('flat:#3d6fae', x - 1.8, GY, 5.2, x + 1.8, GY + 0.45, 5.7);
        b.box('flat:#3d6fae', x - 1.8, GY, 7.2, x + 1.8, GY + 0.45, 7.7);
      }
      b.box('flat:#ece6d6', -hw + 0.3, GY, 9.5, -hw + 6.0, GY + 1.05, 10.4);
      b.zone('street', -hw + 0.3, -0.3, 0.35, hw - 0.3, 6, d - 0.35, SHINSHIO_NAMES.terminal.ja + ' 待合室', 'Shinshio Ferry Terminal — waiting hall');
    });
    at('s', SITE.pontoon.x, SITE.pontoon.line, () => {
      b.model('shinshio', 'pontoon', 0, GY, 0, 0);
    });
    // The gangway's gate in the parapet: shut between sailings.
    b.deco('metal:#5d666c', SITE.pontoon.x - 1.2, GY, -N + 0.1, SITE.pontoon.x + 1.2, GY + 1.2, -N + 0.25);
    b.sign({ k: 'label', text: SHINSHIO_NAMES.pier.ja, sub: SHINSHIO_NAMES.pier.en, fg: '#ffffff', bg: '#1d2f55' }, SITE.pontoon.x + 3.2, GY + 1.6, -N + 0.4, [0, 1], 1.6, 0.5);
    b.zone('street', -X, -0.3, -N, X, 8, BL.prom, SHINSHIO_NAMES.prom.ja, SHINSHIO_NAMES.prom.en);
  }

  // ═════════════════════════ The harbour shrine ═════════════════════════
  {
    const a = S.jinja, P = a.pts, hw = a.w / 2, d = a.d;
    at('s', SITE.shrine.x, SITE.shrine.line, () => {
      b.model('shinshio', 'jinja', 0, GY, 0, 0);
      signAt(P.plaque, { k: 'label', text: '潮守恵比須', sub: '', fg: '#1d1d1d', bg: '#d9c48a' });
      b.slab(GRAVEL, -hw + 0.2, 0.4, hw - 0.2, d - 0.4, GY + 0.002, GY + 0.018, [], false);
      b.block(-hw - 0.2, GY, 0.2, -hw + 0.2, GY + 1.1, d);
      b.block(hw - 0.2, GY, 0.2, hw + 0.2, GY + 1.1, d);
      b.block(-hw, GY, d - 0.4, hw, GY + 1.1, d);
      b.block(-hw, GY, 0, -2.4, GY + 1.1, 0.4);
      b.block(2.4, GY, 0, hw, GY + 1.1, 0.4);
      const [hx, , hz, hww, hd] = P._hall;
      b.block(hx - hww / 2, GY, hz - hd / 2, hx + hww / 2, GY + 6, hz + hd / 2);
      for (const s of [-1, 1]) b.block(s * 2.1 - 0.3, GY, 0.9, s * 2.1 + 0.3, GY + 4.6, 1.5);
      for (const z of [4.5, 9.0]) for (const s of [-1, 1]) b.block(s * 2.6 - 0.45, GY, z - 0.45, s * 2.6 + 0.45, GY + 2.4, z + 0.45);
      for (const s of [-1, 1]) b.block(s * 2.4 - 0.45, GY, 11.6, s * 2.4 + 0.45, GY + 1.8, 12.5);
      b.block(4.2, GY, 6.0, 6.8, GY + 2.4, 7.2);
      b.zone('street', -hw, -0.3, 0, hw, 8, d, SHINSHIO_NAMES.shrine.ja, SHINSHIO_NAMES.shrine.en);
    });
  }

  // ═════════════════════════ The fill ═════════════════════════
  // Lot table (z ranges; x segments stop at the alleys):
  //   Outer market, both blocks: the bay road's row of market shop-houses (ichiba, 18 m) z −35.5…−17.5 facing south;
  //   the covered alley z −39…−35.5; its north side, old shop-houses (≤ 10.5 m) facing it; Hama-dōri's row of small
  //   buildings (machi, ≤ 10.25 m) z −59.75…−49.5 facing north; the backs between them boarded at the alleys.
  //   West block: the bicycle park by Exit 1 at Jōgai-suji's corner. East block: the ice plant at Reizōko-suji's corner.
  //   Corner block (x 107…150): the post office and flats on the bay road; the store and small buildings on Hama-dōri.
  //   Sea-wall strip: flats and small buildings facing Hama-dōri (≤ 12.25 m), the kōban and a pocket park by the terminal.
  //   Market side: the fisheries co-op and the clinic west of the hall; a cold store east of it; market shop-houses
  //   beside the shrine. leftovers() puts what is left to use.
  const reserved: Rect[] = [];
  const interiors: Rect[] = [];
  let seed = 0;
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], signs: 0 | 1 | 2 = 0) => {
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 3.5 || f1 - f0 < 8) return;
    b.with(FRAME[face], () => {
      const lots = fillModelLots(b, r, a, e, f0, f1 + 2.01, { noBack: true, kinds, signs });
      // What the row leaves at its end: the filler's walled pocket alley (named, so it is walked), or, if it left
      // nothing there and the gap is wider than a sliver, bicycle parking open to the street.
      for (const l of lots.filter(isAlleyLot)) b.zone('street', l[0] + 0.1, -0.3, l[1], l[2] - 0.1, 6, l[3] - 0.3, '路地', 'Alley', true);
      const end = lots.length ? Math.max(...lots.map((l) => l[2])) : a;
      if (e - end >= 2.4) {
        const d = Math.min(f1 - f0, 10);
        b.deco('flat:#9a968c', end + 0.1, GY + 0.002, f0, e, GY + 0.012, f0 + d);
        for (let u = end + 0.6; u < e - 0.4; u += 0.62) if (r() < 0.6) {
          const dd = b.dir([0, 1]);
          b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(u, GY, f0 + 1.2), yaw: Math.atan2(-dd[0], -dd[1]), seed: 0, merge: true });
        }
        b.box('metal:#9aa0a6', end + 0.1, GY, f0 + d - 0.1, e, GY + 1.8, f0 + d);
        b.zone('street', end + 0.1, -0.3, f0, e, 6, f0 + d - 0.1, '駐輪場', 'Bicycle parking', true);
      }
    });
  };
  const piece = (kind: string, A: Anchors, id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void, solid = true) =>
    at(face, x, z, () => {
      const a = A[id];
      b.model(kind, id, 0, GY, 0, ++seed);
      if (solid) b.block(-a.w / 2, GY, 0, a.w / 2, GY + Math.max(a.h, 3), a.d);
      fn?.(a);
    });
  /** A civic-set office, lettered with who is in it. */
  const firm = (face: Face, x: number, ln: number, id: string, name: Named, fg = '#1d2f55', bg = '#f1efe8') =>
    piece('civic', CIVIC, id, face, x, ln, (a) => {
      signAt(a.pts.name, { k: 'label', text: name.ja, sub: name.en, fg, bg });
      signAt(a.pts.plate, { k: 'label', text: name.ja, fg: '#e8e6df', bg: '#55585c' });
    });
  /** A board across a gap too narrow to use. */
  const board = (x0: number, x1: number, z0: number, z1: number) => b.box('metal:#9aa0a6', x0, GY, z0, x1, GY + 2.0, z1);
  const n = (ja: string, en: string): Named => ({ ja, en });

  // ── The outer market ──
  const A0 = -X, A1 = JO.c - JO.half - JO.pave, B0 = JO.c + JO.half + JO.pave, B1 = RE.c - RE.half - RE.pave;
  const [cutA, cutB, dead] = LN.cuts;
  const AZ0 = LN.alley.z0, AZ1 = LN.alley.z1, HZ = BL.haS + 10.25;
  const segs = (a: number, e: number, cuts: number[][]) => {
    const out: [number, number][] = [];
    let from = a;
    for (const [p, q] of cuts.filter(([p]) => p > a && p < e).sort((u, v) => u[0] - v[0])) {
      out.push([from, p]);
      from = q;
    }
    out.push([from, e]);
    return out;
  };
  // The bay road's row: west block to the bicycle park; east block to the ice plant.
  const ICE: [number, number] = [B1 - S_ICE.w, B1];
  for (const [a, e] of [...segs(A0, -61.7, [cutA]), ...segs(B0, ICE[0] - 0.3, [cutB])]) fillRect(a + 0.15, AZ1, e - 0.15, BL.avN, 's', ['ichiba'], 2);
  piece('ichiba', ICHIBA, 'ice', 's', (ICE[0] + ICE[1]) / 2, BL.avN, (a) => void a);
  // The alley's north side and Hama-dōri's row, back to back; their backs boarded off at every alley.
  for (const [a, e] of [...segs(A0, A1, [cutA]), ...segs(B0, B1, [cutB, dead])]) {
    fillRect(a + 0.15, AZ0 - 10.5, e - 0.15, AZ0, 's', ['shophouse'], 2);
  }
  for (const [a, e] of [...segs(A0, A1, [cutA]), ...segs(B0, B1, [cutB])]) {
    fillRect(a + 0.15, BL.haS, e - 0.15, HZ, 'n', ['machi'], 1);
    for (const x of [a, e]) if (x > A0 + 1) board(x - 0.1, x + 0.1, HZ - 2, AZ0 - 8.9);
  }
  interiors.push([A0, BL.haS, A1, BL.avN], [B0, BL.haS, B1, BL.avN]);
  // The bicycle park by Exit 1, drinks machines at its front.
  {
    const [x0, x1] = [-61.7, A1];
    b.deco('flat:#9a968c', x0, GY + 0.002, AZ1, x1, GY + 0.012, BL.avN);
    for (let z = AZ1 + 1.5; z < BL.avN - 4; z += 2.2) for (let x = x0 + 0.7; x < x1 - 0.5; x += 0.62) {
      if (r() < 0.35) continue;
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: 0, seed: 0, merge: true });
    }
    for (let k = 0; k < 3; k++) vending(b, x0 + 1.0 + k * 1.05, GY, BL.avN - 0.5, [0, 1], k % 2 ? 'vending2' : 'vending', 'new');
    b.box('metal:#9aa0a6', x0, GY, AZ1, x1, GY + 1.2, AZ1 + 0.1);
    b.zone('street', x0, -0.3, AZ1, x1, 6, BL.avN, '新潮駅前自転車駐車場', 'Bicycle park by Exit 1', true);
  }
  // The covered alley's roof: translucent panels on steel portals, lamps under it.
  for (const [x0, x1] of LN.alley.runs) {
    b.deco('glassTint', x0, GY + 5.6, AZ0, x1, GY + 5.65, AZ1);
    for (let x = x0 + 0.3; x < x1; x += 6) {
      b.deco('metal:#5d666c', x - 0.08, GY + 5.4, AZ0, x + 0.08, GY + 5.6, AZ1);
      for (const z of [AZ0 + 0.12, AZ1 - 0.12]) b.box('metal:#5d666c', x - 0.07, GY, z - 0.07, x + 0.07, GY + 5.6, z + 0.07);
    }
    for (let x = x0 + 3; x < x1; x += 6) b.deco('light', x - 0.6, GY + 5.32, (AZ0 + AZ1) / 2 - 0.05, x + 0.6, GY + 5.36, (AZ0 + AZ1) / 2 + 0.05);
    b.sign({ k: 'label', text: SHINSHIO_NAMES.alley.ja, sub: SHINSHIO_NAMES.alley.en, fg: '#ffffff', bg: '#b3261e' }, x1 > 0 ? x0 + 0.05 : x1 - 0.05, GY + 4.6, (AZ0 + AZ1) / 2, [x1 > 0 ? -1 : 1, 0], 3.2, 0.6);
  }

  // ── The corner block: the post office and new flats on the bay road; the store and small buildings on Hama-dōri ──
  {
    const C0 = RE.c + RE.half + RE.pave, C1 = X;
    firm('s', C0 + 10.3, BL.avN, 'b20', n('新潮郵便局', 'Shinshio Post Office'), '#ffffff', '#c8102e');
    fillRect(C0 + 20.9, BL.avN - 13, C1 - 0.2, BL.avN, 's', ['manshon']);
    at('n', C0 + 7, BL.haS, () => konbini(b, { type: 'corner', chain: 'maruhoshi' }));
    fillRect(C0 + 14.3, BL.haS, C1 - 0.2, HZ, 'n', ['machi'], 1);
    // Behind them one yard, in from Reizōko-suji: the post office's vans, then the flats' car park round the corner.
    const Y0 = BL.haS + 9.05, PO = BL.avN - 26;
    b.deco(YARD, C0, GY + 0.002, Y0, C1, GY + 0.01, BL.avN - 0.2);
    b.zone('street', C0 + 0.2, -0.3, Y0 + 0.15, C0 + 20.6, 6, PO - 0.15, '新潮郵便局 裏', 'Post office yard', true);
    b.zone('street', C0 + 21.2, -0.3, Y0 + 0.15 + 2.2, C1 - 0.2, 6, BL.avN - 10.2, 'マンション駐車場', 'Flats’ car park', true);
    for (const x of [C0 + 4, C0 + 9]) {
      roadModel(b, 'keitruck', x, GY, PO - 3, [0, 1]);
      b.block(x - 0.74, GY, PO - 3 - 1.7, x + 0.74, GY + 1.8, PO - 3 + 1.7);
    }
    for (let x = C0 + 24; x < C1 - 3; x += 2.6) b.deco(WHITE, x - 0.05, GY + 0.01, BL.avN - 20, x + 0.05, GY + 0.016, BL.avN - 15.5);
    streetLamp(b, 'lamp_small', C0 + 12, PO - 0.4, [0, -1]);
    streetLamp(b, 'lamp_small', C1 - 8, BL.avN - 15.2, [0, -1]);
  }

  // ── The sea-wall strip: flats facing the river mouth, small buildings, the kōban and a pocket park by the terminal ──
  {
    const T0 = SITE.terminal.x - S.terminal.w / 2, T1 = SITE.terminal.x + S.terminal.w / 2;
    fillRect(-X + 0.2, BL.prom, T0 - 16.6, BL.haN, 's', ['manshon', 'machi']);
    // The terminal's car park beside it: kerbed off the pavement, cars waiting for the ferry, a low rail at the back.
    {
      const [x0, x1] = [T0 - 16.4, T0 - 0.4];
      b.deco('asphalt', x0, GY + 0.002, BL.prom, x1, GY + 0.012, BL.haN);
      for (let x = x0 + 2.6; x < x1 - 0.5; x += 2.6) b.deco(WHITE, x - 0.05, GY + 0.012, BL.prom + 0.4, x + 0.05, GY + 0.018, BL.prom + 5.4);
      for (let x = x0 + 1.3, k = 0; x < x1 - 1; x += 2.6, k++) {
        if (r() < 0.45) continue;
        const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
        roadModel(b, id, x, GY, BL.prom + 2.9, [0, 1]);
        b.block(x - wd / 2, GY, BL.prom + 2.9 - len / 2, x + wd / 2, GY + ht, BL.prom + 2.9 + len / 2);
      }
      b.box('metal:#9aa0a6', x0, GY, BL.prom - 0.1, x1, GY + 0.9, BL.prom);
      b.box('metal:#9aa0a6', x0 - 0.1, GY, BL.prom, x0, GY + 0.9, BL.haN);
      b.sign({ k: 'label', text: 'フェリー駐車場', sub: 'Ferry car park', fg: '#ffffff', bg: '#1d2f55' }, x0 + 1.6, GY + 2.4, BL.haN - 0.3, [0, 1], 2.4, 0.6);
      b.box('metal:#8d9094', x0 + 0.4, GY, BL.haN - 0.36, x0 + 0.52, GY + 2.75, BL.haN - 0.24);
      b.zone('street', x0, -0.3, BL.prom, x1, 6, BL.haN, 'フェリー駐車場', 'Ferry car park', true);
    }
    at('s', T1 + 0.4 + 3.3, BL.haN, () => place(b, { kind: 'koban', ja: '新潮港交番', en: 'Shinshio Port Police Box' }));
    at('s', T1 + 7.5 + 7, BL.haN, () => place(b, { kind: 'park', ja: '潮見ポケットパーク', en: 'Shiomi Pocket Park' }));
    fillRect(T1 + 21.9, BL.prom, X - 0.2, BL.haN, 's', ['machi', 'manshon']);
    interiors.push([-X, BL.prom, X, BL.haN]);
  }

  // ── The market side ──
  {
    const z0 = BL.avS;
    firm('n', -X + 12.2, z0, 'b24', n('新潮漁業協同組合・信用事業', 'Shinshio Fisheries Co-op · Co-op Bank'), '#ffffff', '#1d2f55');
    firm('n', -X + 24.6 + 7.2, z0, 'b14', n('うしお薬局・新潮みなと診療所', 'Ushio Pharmacy · Shinshio Minato Clinic'), '#ffffff', '#1d8a4e');
    // Between the clinic and the hall: coin parking for the market's buyers.
    {
      const [x0, x1] = [-X + 39.0, SITE.hall.x - S.ichiba.w / 2 - 0.3];
      b.deco('asphalt', x0, GY + 0.002, z0, x1, GY + 0.012, BL.quay);
      for (let z = z0 + 3; z < BL.quay - 2; z += 2.6) for (const [a, e] of [[x0 + 0.3, x0 + 5.2], [x1 - 5.2, x1 - 0.3]]) {
        b.deco(WHITE, a, GY + 0.012, z - 0.05, e, GY + 0.018, z + 0.05);
        if (r() < 0.55 && z + 1.3 < BL.quay - 1) {
          const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
          roadModel(b, id, (a + e) / 2, GY, z + 1.3, [1, 0]);
          b.block((a + e) / 2 - len / 2, GY, z + 1.3 - wd / 2, (a + e) / 2 + len / 2, GY + ht, z + 1.3 + wd / 2);
        }
      }
      b.sign({ k: 'label', text: 'コインパーキング', sub: 'Coin parking, 24 h', fg: '#1c1c1e', bg: '#f2c200' }, x0 + 1.4, GY + 2.6, z0 + 0.6, [0, -1], 2.4, 0.6);
      b.box('metal:#8d9094', x0 + 0.2, GY, z0 + 0.54, x0 + 0.32, GY + 2.95, z0 + 0.66);
      b.zone('street', x0, -0.3, z0, x1, 6, BL.quay, 'コインパーキング', 'Market coin parking', true);
      streetLamp(b, 'lamp_small', (x0 + x1) / 2, BL.quay - 0.6, [0, -1]);
    }
    // The cold store east of the hall, behind the truck bays.
    piece('ichiba', ICHIBA, 'cs_b', 'n', 69, SITE.hall.line);
    b.deco(YARD, 55, GY + 0.002, SITE.hall.line, 93, GY + 0.01, BL.quay);
    // Refrigerated lorries backed up to the yard, nose to the quay.
    for (const x of [85.5, 89.5]) {
      roadModel(b, 'truck', x, GY, 34, [0, 1]);
      b.block(x - 1.05, GY, 34 - 3.1, x + 1.05, GY + 2.9, 34 + 3.1);
    }
    // Market shop-houses beside the shrine, facing the bay road; boat gear stacked behind them.
    fillRect(133.3, z0, X - 0.2, z0 + 18, 'n', ['ichiba'], 2);
    b.deco(YARD, 133, GY + 0.002, z0 + 18, X, GY + 0.01, BL.quay);
    for (let x = 134.5; x < X - 2; x += 3.4) {
      b.box('flat:#3b78b8', x, GY, z0 + 19, x + 1.4, GY + 0.3 + (Math.round(x) % 3) * 0.3, z0 + 20.1);
      b.box('flat:#c9a26a', x + 1.6, GY, z0 + 19.1, x + 2.6, GY + 0.9, z0 + 20.0);
    }
    b.zone('street', 133, -0.3, z0 + 18.2, X, 6, BL.quay, '漁具置場', 'Fishing gear yard', true);
    // The shrine's approach from the bay road to the quay, and its grove.
    b.slab('tile:#c9c4b8', 107.3, z0, 114.7, BL.quay, GY + 0.002, GY + 0.016, [], false);
    b.zone('street', 107.3, -0.3, z0, 114.7, 6, BL.quay, '潮守恵比須神社 参道', 'Shiomori Ebisu Shrine approach', true);
    b.deco('grass', 115, GY + 0.002, z0, 133, GY + 0.03, 22);
    for (const x of [117.5, 122, 126.5, 131]) modelTree(b, x % 2 ? 'pine' : 'camphor', x, 19.8, 'b');
    b.box('flat:#b3ac9c', 115, GY, 17.6, 133, GY + 0.6, 17.8);
    interiors.push([55, z0 + 6.5, 93, BL.quay], [133, z0, X, BL.quay]);
  }
  reserved.push(...SHINSHIO_RESERVED.map((q) => q.r));
  leftovers(b, r, interiors, reserved, b.out.holes.map(([x0, z0, x1, z1]): Rect => [x0, z0, x1, z1]), { park: [n('浜通児童遊園', 'Hama-dōri Children’s Park'), n('魚河岸ひろば', 'Uogashi Square')] }, piece);

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  // The streets carry on along the map (data/geography.ts and the neighbours' plots), seen but not walked:
  //   East: the bay road and Hama-dōri run 360 m through the port's cold-storage quarter to the foot of
  //   Kamome-ga-oka's bluff (its west retaining walls at x 525, kamome-street.ts), where they end at a T with the
  //   foot road, which runs south to Hokushin-dōri's line (z 135). Cross streets at x 215 and 365.
  //   West: they run 380 m through the bay new town's flats to the connector road at x −536, which turns south
  //   toward Minato Center's streets. A cross street at x −215.
  //   North: the river mouth's sea wall, carried on both ways to the bluff's cliff. South: the Shinshio dock, whose
  //   east and west quays turn south at x ±150.
  //   Across the river mouth: the mainland shore's front row stands as library flats and offices (not the backdrop's
  //   mixed blocks), either side of Nishi-Yūnagi's plot, with an embankment walk along the water.
  {
    const inRect = (p: number[], x0: number, z0: number, x1: number, z1: number) => p[0] >= x0 - 0.5 && p[0] <= x1 + 0.5 && p[2] >= z0 - 0.5 && p[2] <= z1 + 0.5;
    const lowRows = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], rows = 1, maxH = 99) => {
      const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
      if (e - a < 4.6 || f1 - f0 < 8) return;
      b.with(FRAME[face], () => {
        let z = f0;
        for (let k = 0; k < rows && f1 - z > 8.5; k++) {
          const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds, lo: true, bare: k > 0 });
          if (!lots.length) break;
          z = Math.max(...lots.map((l) => l[3])) + 0.8;
        }
      });
      // (The filler picks by kind only: a height limit drops what is too tall afterwards, for a steady skyline.)
      if (maxH < 99) {
        const tall = (m: { kind: string; id: string }) => (BUILDING_MODELS.find((q) => `${q.id}_lo` === m.id && q.kind === m.kind)?.h ?? 0) > maxH;
        b.out.models = b.out.models.filter((m) => !(m.id.endsWith('_lo') && tall(m) && inRect(m.pos, x0, z0, x1, z1)));
      }
    };
    /** Cold stores and ice plants in a row from u0, fronts at `line` facing `face`. */
    const coldRow = (u0: number, u1: number, line: number, face: 'n' | 's', ids: string[]) => {
      let x = u0;
      for (let k = 0; ; k++) {
        const id = ids[k % ids.length], a = ICHIBA[id];
        if (x + a.w > u1) break;
        piece('ichiba', ICHIBA, id, face, x + a.w / 2, line);
        x += a.w + 0.6;
      }
    };
    const lampOut = (x: number, z: number, f: [number, number], wide: boolean) => roadModel(b, wide ? 'lamp_led' : 'lamp_small', x, GY, z, f);
    /** A street seen past the edge: carriageway, pavements, centre paint. */
    const roadOut = (axis: 'x' | 'z', c: number, half: number, pave: number, u0: number, u1: number, wide: boolean) => {
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (axis === 'x' ? b.deco(mat, a, y0, c + v0, e, y1, c + v1) : b.deco(mat, c + v0, y0, a, c + v1, y1, e));
      R('asphalt', -half, half, -0.03, 0.004);
      for (const k of [-1, 1]) R('paver', Math.min(k * half, k * (half + pave)), Math.max(k * half, k * (half + pave)), -0.03, GY);
      if (wide) for (const k of [-1, 1]) R(YELLOW, k * 1.0 - 0.06, k * 1.0 + 0.06, 0.004, 0.01);
      else for (let u = u0 + 2; u + 3 < u1; u += 6) R(WHITE, -0.07, 0.07, 0.004, 0.01, u, u + 3);
    };
    const FOOT = 515, BLUFF = 525, HOKU = 135, WEST = -536, CR_E = [215, 365], CR_W = [-215], CW = 4, SOUTH_W = 234.5; // (south to Minato Center's back street, minatocenter-street.ts)

    // ── East, to the bluff ──
    roadOut('x', 0, AV.half, AV.pave, X, FOOT - 3.25, true);
    roadOut('x', HA.c, HA.half, HA.pave, X, FOOT - 3.25, false);
    roadOut('z', FOOT, 3.25, 2.5, -N, HOKU, false);
    for (const xc of CR_E) roadOut('z', xc, CW, 2.5, BL.haS, 45, false);
    b.deco('tile:#b5ad9d', X, -0.03, -N, BLUFF, GY, BL.prom);
    b.deco(STONE, X, 0, -92, BLUFF, GY + 1.0, -N + 0.35);
    for (let u = X + 10, k = 0; u < FOOT - 8; u += 24, k++) {
      const e = k % 2 ? 1 : -1;
      lampOut(u, e * (AV.half + 0.7), [0, -e], true);
      lampOut(u, HA.c + HA.half + 0.45, [0, -1], false);
    }
    for (let z = -N + 8; z < HOKU; z += 24) lampOut(FOOT - 3.7, z, [1, 0], false);
    {
      const segs: [number, number][] = [];
      let from = X + 0.3;
      for (const xc of [...CR_E, FOOT]) {
        segs.push([from, xc - CW - 2.8]);
        from = xc + CW + 2.8;
      }
      segs.forEach(([a, e], k) => {
        coldRow(a, e, BL.avN, 's', k % 2 ? ['cs_a', 'ice', 'cs_b'] : ['cs_b', 'cs_a']);
        coldRow(Math.max(a, X + 12.3), e, BL.avS, 'n', k % 2 ? ['cs_b', 'cs_a'] : ['cs_a', 'ice', 'cs_b']);
        lowRows(a, BL.haS + 0.2, e, BL.haS + 11.5, 'n', ['machi']);
        lowRows(a, BL.prom, e, BL.haN - 0.2, 's', ['machi']);
      });
    }
    // The bluff's west face: retaining walls stepping up with its terraces (15 m over the river mouth, down to the
    // foot at Hokushin-dōri), planting on top, pines and camphors along its edge.
    {
      const steps: [number, number, number][] = [[-92, -35.5, 15], [-35.5, 12.5, 12.5], [12.5, 58.5, 7.5], [58.5, 106.5, 3]];
      for (const [z0, z1, h] of steps) {
        b.deco('tile:#8f877a', BLUFF - 1.4, 0, z0, BLUFF, h, z1);
        b.deco('flat:#cdbfa6', BLUFF - 1.6, h, z0, BLUFF + 0.2, h + 0.25, z1);
        b.deco('grass', BLUFF, h, z0, BLUFF + 30, h + 0.05, z1);
        for (let z = z0 + 6; z < z1 - 3; z += 9) modelTree(b, Math.round(z) % 2 ? 'pine' : 'camphor', BLUFF + 3, z, 'b', h);
      }
      b.deco('grass', FOOT + 5.75, -0.03, -N, BLUFF - 1.4, GY + 0.02, HOKU);
    }
    b.clearScenery(X, -N - 2, BLUFF + 40, 45);
    b.clearScenery(FOOT - 10, 45, BLUFF + 40, HOKU + 6);
    for (const xc of CR_E) b.clearScenery(xc - CW - 3, 45, xc + CW + 3, 60);

    // ── West, to the connector road ──
    roadOut('x', 0, AV.half, AV.pave, WEST + CW, -X, true);
    roadOut('x', HA.c, HA.half, HA.pave, WEST + CW, -X, false);
    roadOut('z', WEST, CW, 3, -N, SOUTH_W, false);
    for (const xc of CR_W) roadOut('z', xc, CW, 2.5, BL.haS, 45, false);
    b.deco('tile:#b5ad9d', WEST - 30, -0.03, -N, -X, GY, BL.prom);
    b.deco(STONE, WEST - 30, 0, -92, -X, GY + 1.0, -N + 0.35);
    for (let u = WEST + 14, k = 0; u < -X - 4; u += 24, k++) {
      const e = k % 2 ? 1 : -1;
      lampOut(u, e * (AV.half + 0.7), [0, -e], true);
      lampOut(u, HA.c + HA.half + 0.45, [0, -1], false);
    }
    for (let z = -N + 8; z < SOUTH_W; z += 24) lampOut(WEST + CW + 0.7, z, [-1, 0], true);
    {
      const segs: [number, number][] = [];
      let from = WEST + CW + 3.3;
      for (const xc of [...CR_W, -X]) {
        segs.push([from, xc === -X ? -X - 0.3 : xc - CW - 2.8]);
        from = xc + CW + 2.8;
      }
      const m = (BL.avN + BL.haS) / 2;
      for (const [a, e] of segs) {
        lowRows(a, m + 0.4, e, BL.avN - 0.2, 's', ['manshon']);
        lowRows(a, BL.haS + 0.2, e, m - 0.4, 'n', ['manshon', 'machi']);
        lowRows(a, BL.avS + 0.2, Math.min(e, -X - 40.3), BL.avS + 30, 'n', ['manshon', 'machi'], 2, 24);
        lowRows(a, BL.prom, e, BL.haN - 0.2, 's', ['manshon']);
      }
    }
    b.clearScenery(WEST - 8, -N - 2, -X, 45);
    for (const xc of CR_W) b.clearScenery(xc - CW - 3, 45, xc + CW + 3, 60);
    b.clearScenery(WEST - CW - 3, 45, WEST + CW + 3, SOUTH_W);

    // ── The dock's side quays ──
    for (const s of [-1, 1] as const) {
      const qx = s * X;
      // (They run to the dock's south end at z 240, where Umibe-shiyakusho-mae's quay takes over: umibe-street.ts.)
      b.deco(QUAY, Math.min(qx, qx + s * 12), -0.03, BL.quay, Math.max(qx, qx + s * 12), GY, 240);
      b.deco(STONE, Math.min(qx, qx - s * 0.35), 0, 52, Math.max(qx, qx - s * 0.35), GY + 0.02, 240);
      for (let z = 60; z < 240; z += 26) lampOut(qx + s * 10, z, [-s, 0], true);
      b.clearScenery(Math.min(qx, qx + s * 14), 45, Math.max(qx, qx + s * 14), 240);
    }

    // ── Round the dock: the port quarter on the land either side of it, as seen from Umibe's quay (2026-11-25) ──
    // Full models in rows facing the water and the cross streets: transit sheds, brick warehouses, cold stores.
    // East of the dock they fill the land to Umibe's plot (z 280); the cross streets run on south to it.
    {
      type Pc = ['port' | 'ichiba', string];
      const A = { port: PORT, ichiba: ICHIBA };
      /** A row of port pieces along a north–south line, fronts at x = `line` facing `face` ('e' west side, 'w' east). */
      const portRow = (line: number, face: 'e' | 'w', z0: number, z1: number, list: Pc[]) => {
        let z = z0;
        for (let k = 0; ; k++) {
          const [kind, id] = list[k % list.length], a = A[kind][id];
          if (z + a.w > z1) break;
          at(face, line, z + a.w / 2, () => {
            b.model(kind, id, 0, GY, 0, 3);
            b.block(-a.w / 2, GY, 0, a.w / 2, GY + a.h, a.d);
          });
          z += a.w + 2.4;
        }
      };
      const SOUTH_E = 278;
      // East: the dock's east quay row, then both sides of the two cross streets.
      portRow(X + 12.3, 'w', 53, 239, [['port', 'shed_a'], ['port', 'soko_c'], ['ichiba', 'cs_b'], ['port', 'shed_b'], ['port', 'soko_a']]);
      for (const [xc, k] of [[CR_E[0], 0], [CR_E[1], 1]] as const) {
        roadOut('z', xc, CW, 2.5, 45, SOUTH_E, false);
        for (let z = 60; z < SOUTH_E; z += 26) lampOut(xc + CW + 0.6, z, [-1, 0], false);
        portRow(xc - CW - 2.5, 'e', 47, SOUTH_E - 2, k ? [['port', 'soko_b'], ['ichiba', 'cs_a'], ['port', 'shed_b']] : [['ichiba', 'cs_a'], ['port', 'soko_b'], ['ichiba', 'ice']]);
        portRow(xc + CW + 2.5, 'w', 47, SOUTH_E - 2, k ? [['port', 'shed_a'], ['ichiba', 'cs_b'], ['port', 'soko_c']] : [['port', 'soko_a'], ['ichiba', 'cs_b'], ['port', 'shed_b']]);
      }
      b.clearScenery(X, 45, FOOT + 6, SOUTH_E + 2);
      // West: the dock's west quay row facing it, the land behind kept low.
      portRow(-X - 12.3, 'e', 53, 239, [['port', 'soko_a'], ['port', 'shed_b'], ['ichiba', 'cs_b'], ['port', 'soko_c'], ['port', 'shed_a']]);
      b.clearScenery(-X - 40, 45, -X, 240);
    }

    // ── Across the river mouth: the mainland's front row and its embankment walk ──
    {
      const SHORE = -212, NY0 = -50, NY1 = 232;
      for (const [x0, x1] of [[-430, NY0 - 2], [NY1 + 2, 430]] as [number, number][]) {
        b.deco(STONE, x0, 0, SHORE - 0.4, x1, GY + 0.9, SHORE);
        b.deco('tile:#b5ad9d', x0, -0.03, SHORE - 8, x1, GY, SHORE - 0.4);
        for (let x = x0 + 8; x < x1; x += 22) lampOut(x, SHORE - 1.2, [0, 1], false);
        lowRows(x0 + 1, SHORE - 8 - 26, x1 - 1, SHORE - 8.4, 's', ['manshon', 'office'], 2, 32);
        b.clearScenery(x0, SHORE - 70, x1, SHORE);
      }
    }
  }
}
