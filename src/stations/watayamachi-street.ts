// Watayamachi's street (綿屋町, the cotton wholesalers' town), after Osaka's Senba: docs/theme-notes.md
// "Textile wholesale grid", built by docs/station-playbook.md in three stages.
//
// THE PLAN (station frame: +x east along the Kikyō Line, +z south; plot x ±170, z −100…150, wata-plan.ts,
// where the same streets are the table WATA_STREETS that street-rules.test.ts holds this build to)
//
//   Street                       Centre line   Width   What it is
//   木綿大通 Momen-ōdōri          z = 0         40 m    building lines z ±20; pavements 5.6 m (|z| 14.4…20, the kerb clear
//                                                      of the exits' canopies); two lanes eastbound (z −14.4…−9), two westbound; the middle
//                                                      strip |z| ≤ 9 holds the wholesale centre under the expressway
//   茜筋 Akane-suji               x = 0         22 m    four lanes (|x| ≤ 6), pavements 5 m; the Akanesuji Line is under it
//   晒通 Sarashi-dōri             z = −96       8 m     the canal's bank street, one-way west, built on its south side only
//   綛通 Kase-dōri                z = 96        8 m     one-way east, painted side strips: the wholesalers' fronts
//   糸巻筋 Itomaki-suji           x = −86       6 m     one-way north; under the deck between two halls
//   筬筋 Osa-suji                 x = 86        6 m     one-way south; under the deck between two halls
//   紡錘筋 Tsumu-suji             x = −164      6 m     access only (nobody drives through): ends at the bank street
//   綿打筋 Watauchi-suji          x = 164       6 m     access only: ends at the bank street
//   Drain alleys                 z = ±56, 136  1.8 m   the old back-lot drain line down the middle of each block
//
//   Blocks are 72 m square (x 11…83 and 89…161 each side; z 20…92; the north ones run to the bank street).
//   Hyōtan-bori, the canal (14 m), lies just past the north edge (z −115…−101): the plot ends at its south wall.
//   Akane-suji, Itomaki-suji and Osa-suji cross it on bridges. No neighbour's plot touches this one: every
//   street runs on past the edge (west only as far as the other canal, 90 m out).
//
//   The wholesale centre fills the avenue's middle strip in four halls between the cross streets (wata-plan.ts
//   WATA.halls), under the expressway's deck; the two by the crossing are walked into and hold exits 3 and 4.
//   Exits 1 and 2 rise in the avenue's north and south pavements east of Akane-suji.
//
//   Landmarks: 綿屋町ビルヂング the courtyard tenant building, lot x 11…47, z −55…−20 (exit 1 rises at its
//   passage); 枡綿商店 the cotton merchant's house and kura, lot x 30…57, z 58…92; 綿守神社 the weavers'
//   shrine, lot x −83…−50, z 58…92; 晒の雁木 the landing steps on the canal at x 40…52.
//   Also: convenience store x 11…25, z −92…−83; police box x 11.2…17.8, z 20…25.2.
//
//   The AR Main Line (rerouted 2026-11-25, data/network.ts) runs due south at street level 15 m beyond the west
//   edge, as it does past Aizomechō: over Hyōtan-bori on its bridge, and over the bank street, the avenue (under
//   the expressway) and Kase-dōri on level crossings. Kase-dōri's is walked: the plot has an arm out over it
//   (wata-plan.ts WATA_ARM). No strip is kept through the blocks any more; the gap under the deck by Akane-suji
//   stays the bicycle park.
//
//   Past the edge (2026-11-25): the expressway ramps down and ends 180 m east of the plot; west it goes out over
//   the bay on piers. West of the railway is the waterfront: a quay, sheds and brick warehouses, no mid-rises.
//
// STAGE 1 (2026-11-24): the station: the exits' wells, the centre and its deck.
// STAGE 2 (2026-11-24): the streets and the landmarks.
// STAGE 3 (2026-11-25): the fill. Wholesalers' buildings of the generic `wholesale` set (rebuilt the same day at
// the level of Aizomechō's fronts, each with a second front down its sides for Akane-suji) on every lot (34 m deep,
// half a block less the drain alley): 27 to 31 m on the avenue and at Akane-suji's corners, 13 to 23 m on the
// back streets; a bank, a post office, a pharmacy with a clinic over it, standing soba and a kissaten among
// them; one apartment block where a wholesaler sold up; low shop-houses on the last strip by the south edge;
// coin parking, a vacant lot and a yard where a row leaves a gap; poles and wires on the two 8 m streets; two
// bus stops on the avenue. Not here: a taxi stand, exit pylons.

import { RAIL_LINES } from '../data/network';
import { CARS, VEH, family } from '../traffic/vehicles';
import { lineSim } from '../sim';
import { rng, type LanePart } from '../world/builder';
import { PORT as P } from './anchors/port';
import { WATA as A } from './anchors/wata';
import { WATACENTRE as C } from './anchors/watacentre';
import { WHOLESALE as W } from './anchors/wholesale';
import { BUILDING_MODELS } from './buildings';
import type { AnchorPt } from './anchors/types';
import type { Ctx } from './kit';
import { GROUND_Y } from './kit';
import { konbini } from './konbini';
import { place } from './places';
import { kerbRail, levelCrossing, pedSignal, poleLine, roadModel, roadName, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal } from './roads';
import { crosswalk, fillModelLots, type SurfaceSpec } from './surface';
import { modelTree } from './trees';
import { centreAbove } from './wata-centre';
import { WATA, WATA_ARM, WATA_PLOT, WATA_STREETS } from './wata-plan';

type Rect = [number, number, number, number];
type Named = { ja: string; en: string };
type Face = 'n' | 's' | 'e' | 'w';
const X = WATA_PLOT.x, Z = WATA_PLOT.z, N = WATA_PLOT.north;
/** The avenue's old building line, which the pavement exits are fitted to (the structure's edge + 5.5). */
const FRONT = 19.5;
const BARE = 'flat:#8d877b', WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#a39c8c', LANE = 'tile:#857e73';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
/** Stop line to the junction's edge: past a crosswalk, or at a small street's mouth. */
const SL = 5.2;

/** The streets by what they are (WATA_STREETS is the one table). */
const st = (en: string) => WATA_STREETS.find((s) => s.en.startsWith(en))!;
const AV = st('Momen'), AKA = st('Akane'), BANK = st('Sarashi'), KASE = st('Kase'), ITO = st('Itomaki'), OSA = st('Osa'), TSU = st('Tsumu'), UCHI = st('Watauchi');
const NS = [TSU, ITO, AKA, OSA, UCHI], EW = [BANK, AV, KASE];
const short = (s: { ja: string; en: string }): Named => ({ ja: s.ja, en: s.en.split(' (')[0] });
const NAMES = {
  court: { ja: '綿屋町ビルヂング', en: 'Watayamachi Building' },
  tonya: { ja: '木綿問屋 枡綿商店', en: 'Masuwata Cotton Merchants' },
  shrine: { ja: '綿守神社', en: 'Watamori Shrine' },
  steps: { ja: '晒の雁木', en: 'Sarashi Landing Steps' },
  koban: { ja: '綿屋町交番', en: 'Watayamachi Police Box' },
  bridge: { ja: '晒橋', en: 'Sarashi-bashi' },
  bikes: { ja: '高架下 自転車駐車場', en: 'Bicycle park under the expressway' },
};

export function watayaStreet(c: Ctx, spec: SurfaceSpec, cw: number, cf: number) {
  const { b } = c, sta = c.station, GY = GROUND_Y;
  if (Math.abs(cw + 5.5 - FRONT) > 0.01) throw new Error(`watayaStreet: the avenue's building line moved (${cw + 5.5}); the exits are fitted to ${FRONT}`);
  b.out.plot = { ...WATA_PLOT, arms: [[...WATA_ARM]] };
  const r = rng(spec.seed);
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);
  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: Parameters<typeof b.sign>[0]) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  /** A collider over a model's mark (its centre x, z and size w × d), h high. */
  const solid = (p: AnchorPt, h: number) => b.block(p[0] - p[3] / 2, GY, p[2] - p[4] / 2, p[0] + p[3] / 2, GY + h, p[2] + p[4] / 2);

  // ═════════════════════════ Ground ═════════════════════════
  const wells: Rect[] = [...b.out.holes.map(([x0, z0, x1, z1]): Rect => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]), WATA.lift.shaft];
  const carriage: Rect[] = [
    [-X, -AV.half, X, -AV.mid!], [-X, AV.mid!, X, AV.half],
    ...[BANK, KASE].map((s): Rect => [-X, s.c - s.half, X, s.c + s.half]),
    ...NS.map((s): Rect => [s.c - s.half, -N, s.c + s.half, Z]),
  ];
  const halls: Rect[] = WATA.halls.filter((h) => h.walk).map((h): Rect => [h.x0 + 0.3, WATA.z0 + 0.3, h.x1 - 0.3, WATA.z1 - 0.3]);
  b.slab('asphalt', -X, -N, X, Z, -0.6, 0, wells);
  b.slab(BARE, -X, -N, X, Z, 0, GY, [...wells, ...carriage]);
  const pave = (x0: number, z0: number, x1: number, z1: number, mat = 'paver') => b.slab(mat, x0, z0, x1, z1, GY + 0.002, GY + 0.014, [...wells, ...carriage, ...halls], false);
  for (const s of [-1, 1]) pave(-X, Math.min(s * AV.half, s * (AV.half + AV.pave)), X, Math.max(s * AV.half, s * (AV.half + AV.pave)));
  pave(-X, -AV.mid!, X, AV.mid!);
  for (const s of [-1, 1]) pave(Math.min(s * AKA.half, s * (AKA.half + AKA.pave)), -N, Math.max(s * AKA.half, s * (AKA.half + AKA.pave)), Z);
  b.zone('street', -X, -0.3, -N, X, 80, Z, `${sta.nameJa}駅前`, `${sta.nameRomaji} — street level`);
  // (The west edge is open at the arm over the level crossing; the arm has its own walls.)
  b.block(-X - 1, -1, -N - 1, -X, 60, WATA_ARM[1]);
  b.block(-X - 1, -1, WATA_ARM[3], -X, 60, Z + 1);
  b.block(WATA_ARM[0], -1, WATA_ARM[1] - 1, -X, 60, WATA_ARM[1]);
  b.block(WATA_ARM[0], -1, WATA_ARM[3], -X, 60, WATA_ARM[3] + 1);
  b.block(WATA_ARM[0] - 1, -1, WATA_ARM[1] - 1, WATA_ARM[0], 60, WATA_ARM[3] + 1);
  b.block(X, -1, -N - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -N - 1, X, 60, -N);
  b.block(-X, -1, Z, X, 60, Z + 1);
  b.out.district = { radius: 520, old: [0, 96], oldRadius: 60, towers: 3 };

  // The drain alleys: the old back-lot line down the middle of each block, paved, a gutter down the middle.
  const nsCorr = NS.map((s): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave]);
  for (const z of [-56, 56, 136]) {
    let from = -X;
    for (const [p, q] of [...nsCorr, [X, X] as [number, number]]) {
      if (p - from > 2) {
        b.deco(LANE, from, GY + 0.002, z - 0.9, p, GY + 0.012, z + 0.9);
        b.deco('flat:#6f6a60', from, GY + 0.012, z - 0.08, p, GY + 0.016, z + 0.08);
        // (Named in stretches under 40 m, so the walk test counts each as a small place and walks out to it.)
        const n = Math.ceil((p - from) / 36);
        // (The one east of Osa-suji on the south side is boarded up at both ends: see the fill.)
        for (let k = 0; k < n && p - from > 30 && !(z === 56 && from > 88); k++) b.zone('street', from + ((p - from) * k) / n, GY - 0.2, z - 0.9, from + ((p - from) * (k + 1)) / n, GY + 6, z + 0.9, '背割の路地', 'Drain alley', true);
      }
      from = q;
    }
  }

  // ═════════════════════════ Paint ═════════════════════════
  const boxX = NS.map((s): [number, number] => [s.c - s.half - s.pave - 7, s.c + s.half + s.pave + 7]);
  const boxZ = EW.map((s): [number, number] => [s.c - s.half - s.pave - 7, s.c + s.half + s.pave + 7]);
  // The avenue: a lane line down each carriageway, edge lines at the kerbs and along the middle strip.
  for (const s of [-1, 1]) {
    const zm = s * (AV.mid! + AV.half) / 2;
    for (let x = -X; x < X; x += 6) if (clearOf(x + 1.5, boxX)) b.deco(WHITE, x, 0.004, zm - 0.07, x + 3, 0.01, zm + 0.07);
    for (const z of [s * (AV.mid! + 0.35), s * (AV.half - 0.35)]) {
      let from = -X;
      for (const [p, q] of [...boxX, [X + 7, X + 7] as [number, number]]) {
        if (p + 7 - from > 1) b.deco(WHITE, from, 0.004, z - 0.06, p + 7, 0.01, z + 0.06);
        from = q - 7;
      }
    }
  }
  // Akane-suji: a yellow centre line, lane lines.
  for (let z = -N + 1; z < Z - 2; z += 6) {
    if (!clearOf(z + 1.5, boxZ)) continue;
    for (const x of [-AKA.half / 2, AKA.half / 2]) b.deco(WHITE, x - 0.07, 0.004, z, x + 0.07, 0.01, z + 3);
    b.deco(YELLOW, -0.08, 0.004, z, 0.08, 0.01, z + 6);
  }
  // The small streets: a painted side strip each side.
  for (const s of [BANK, KASE]) for (const e of [-1, 1]) {
    let from = -X;
    for (const [p, q] of [...nsCorr, [X, X] as [number, number]]) {
      if (p - from > 1) b.deco(WHITE, from, 0.004, s.c + e * (s.half - 0.9) - 0.05, p, 0.01, s.c + e * (s.half - 0.9) + 0.05);
      from = q;
    }
  }
  const ewCorr = EW.map((s): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave]);
  for (const s of [TSU, ITO, OSA, UCHI]) for (const e of [-1, 1]) {
    let from = -N;
    for (const [p, q] of [...ewCorr, [Z, Z] as [number, number]]) {
      if (p - from > 1) b.deco(WHITE, s.c + e * (s.half - 0.8) - 0.05, 0.004, from, s.c + e * (s.half - 0.8) + 0.05, 0.01, p);
      from = q;
    }
  }

  // ═════════════════════════ Junctions and lanes ═════════════════════════
  const inPlot = (x: number, z: number) => Math.abs(x) < X - 0.5 && z > -N + 0.6 && z < Z - 0.5;
  /**
   * A signalled junction of a north–south street (centre cx, half hx, driven the ways `ns`: 1 south, −1 north)
   * and an east–west one (cz, hz, `ew`: 1 east, −1 west). `walkEW`: zebras across the east–west street beside
   * the junction (not where the avenue's halls stand in the way: there the cross street's own strips are the way over).
   */
  const junction = (cx: number, hx: number, ns: (1 | -1)[], cz: number, hz: number, ew: (1 | -1)[], name: Named, walkEW = true) => {
    const wideNS = hx > 4.6, wideEW = hz > 4.6;
    for (const sz of [-1, 1] as const) {
      const zc = cz + sz * (hz + 2.6);
      if (!inPlot(cx, zc + sz * 2)) continue;
      crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
      for (const sx of [-1, 1] as const) pedSignal(b, cx + sx * (hx + 0.8), zc + sz * 2.0, [-sx, 0], 0, { flat: true, button: !wideNS, speaker: wideNS });
    }
    for (const sx of [-1, 1] as const) {
      if (!walkEW) {
        // The cross street's side strips carry people over each carriageway of the avenue, under the deck.
        for (const sz of [-1, 1]) crosswalk(b, cx + sx * (hx - 0.9), cz + sz * (AV.mid! + AV.half) / 2, AV.half - AV.mid! - 0.4, 1.6, true);
        continue;
      }
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
      for (const sz of [-1, 1] as const) if (inPlot(xc, cz + sz * (hz + 0.8))) pedSignal(b, xc + sx * 2.0, cz + sz * (hz + 0.8), [0, -sz], 1, { flat: true, button: !wideEW });
    }
    for (const sx of ew) {
      const lz = -sx, xs = cx - sx * (hx + (walkEW ? SL : 1.2));
      const [za, zb] = wideEW ? [lz * AV.mid!, lz * AV.half] : [cz - hz + 0.2, cz + hz - 0.2];
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(za, zb), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(za, zb));
      const pz = cz + lz * (hz + 1.5);
      if (!inPlot(cx, pz)) continue;
      if (wideEW) vehicleSignal(b, cx + sx * (hx + 1.9), pz, [sx, 0], 5, 0, name, { style: 'new', back: false });
      else shortSignal(b, cx + sx * (hx + 1.9), pz, [sx, 0], 0, name);
    }
    for (const sz of ns) {
      const lx = sz, zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      const pz = cz + sz * (hz + 2.0);
      // (For traffic leaving north over a bridge the pole stands on the bridge, just past the plot's edge.)
      if (!inPlot(cx, pz) && pz > -N - 0.6) continue;
      if (wideNS) vehicleSignal(b, cx + lx * (hx + 1.6), pz, [0, sz], hx + 1.6 - hx / 2, 1, name, { style: 'new', back: ns.length > 1 });
      else shortSignal(b, cx + lx * (hx + 1.5), pz, [0, sz], 1, name);
    }
    const [gx, gz] = [cx - hx - 2.6, cz + hz + 3.2];
    if (inPlot(gx, gz)) {
      roadModel(b, 'sigbox', gx, GY, gz, [0, -1]);
      b.block(gx - 0.36, GY, gz - 0.26, gx + 0.36, GY + 1.56, gz + 0.26);
    }
  };
  /** Which way each driven street runs: 1 = towards +x or +z, −1 the other way; both for the two big ones. */
  const WAYS = new Map<(typeof WATA_STREETS)[number], (1 | -1)[]>([[AV, [1, -1]], [AKA, [1, -1]], [BANK, [-1]], [KASE, [1]], [ITO, [-1]], [OSA, [1]]]);
  const drivenNS = [ITO, AKA, OSA], drivenEW = [BANK, AV, KASE];
  const jName = (e: (typeof WATA_STREETS)[number], n: (typeof WATA_STREETS)[number]): Named => {
    if (e === AV) return n === AKA ? { ja: '綿屋町', en: 'Watayamachi' } : n === ITO ? { ja: '綿屋町西', en: 'Watayamachi-nishi' } : { ja: '綿屋町東', en: 'Watayamachi-higashi' };
    if (n === AKA) return e === BANK ? { ja: `${NAMES.bridge.ja}南詰`, en: `${NAMES.bridge.en}-minamizume` } : { ja: '綿屋町南', en: 'Watayamachi-minami' };
    return { ja: `${short(e).ja.replace('通', '')}${short(n).ja.replace('筋', '')}`, en: `${short(e).en.replace('-dōri', '')} ${short(n).en.replace('-suji', '')}` };
  };
  for (const e of drivenEW) for (const n of drivenNS) junction(n.c, n.half, WAYS.get(n)!, e.c, e.half, WAYS.get(e)!, jName(e, n), !(e === AV && n !== AKA));

  /**
   * `tight`: an avenue lane, which stops 1.2 m short of a 6 m street's mouth (no zebra beside it there).
   * A stop before the lane's own start is kept: the lane runs on past the plot's edge (world/runon.ts),
   * which moves its stops out with it, so traffic coming in over a bridge obeys the bank street's signal.
   */
  const stops = (dir: 1 | -1, from: number, cross: typeof drivenNS, axis: 0 | 1, len: number, tight: boolean): LanePart['stops'] =>
    cross.map((q) => {
      const t = (q.c - from) * dir, sl = tight && q.half <= 4.6 ? 1.2 : SL;
      return { at: t - q.half - sl - 0.5, axis, exit: t + q.half + sl };
    }).filter((q) => q.at > -14 && q.exit < len + 12).sort((p, q) => p.at - q.at);
  const lane = (o: { speed: number; flow: number; use: LanePart['use'] }, x0: number, z0: number, x1: number, z1: number, closed?: LanePart['closed']) => {
    const alongX = Math.abs(x1 - x0) > 1, dir = Math.sign(alongX ? x1 - x0 : z1 - z0) as 1 | -1;
    trafficLane(b, x0, z0, x1, z1, {
      speed: o.speed / 3.6, flow: o.flow, use: o.use, taxi: 0.12, halts: [],
      stops: alongX ? stops(dir, x0, drivenNS, 0, Math.abs(x1 - x0), Math.abs(z0) < AV.half) : stops(dir, z0, drivenEW, 1, Math.abs(z1 - z0), false),
      ...(closed ? { closed } : {}),
    });
  };
  const big = { speed: 50, flow: 3.2, use: 'all' as const }, mid = { speed: 40, flow: 2.4, use: 'all' as const }, small = { speed: 20, flow: 0.7, use: 'minor' as const };
  // Traffic keeps left: eastbound on the avenue's north carriageway, southbound on Akane-suji's east half.
  // (The kerb lane keeps 0.5 m off the kerb: exit 1's canopy stands at the pavement's edge.)
  // The kerb lane takes the buses (2.6 m of room between the inner lane and the canopies); the inner lane, cars.
  for (const s of [-1, 1]) {
    // (s −1: the north carriageway, eastbound. The inner lane keeps 1.3 m off the halls: turns cut their corners.)
    lane({ ...big, use: 'general' }, s * X, s * 10.3, -s * X, s * 10.3);
    lane(big, s * X, s * 13.05, -s * X, s * 13.05);
  }
  for (const x of [1.5, 4.5]) lane(mid, x, -N, x, Z);
  for (const x of [-1.5, -4.5]) lane(mid, x, Z, x, -N);
  // (No run-on east of the plot for the bank street: the canal bends south across its line there.)
  lane(small, X, BANK.c, -X, BANK.c, ['from']);
  lane(small, -X, KASE.c, X, KASE.c);
  lane(small, ITO.c, Z, ITO.c, -N);
  lane(small, OSA.c, -N, OSA.c, Z);

  // ═════════════════════════ Lamps, rails, trees, boards ═════════════════════════
  /** Lamp places along a street every 18 m, moved out of any crossing carriageway. */
  const carrX = NS.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const carrZ: [number, number][] = [[-AV.half, -AV.mid!], [AV.mid!, AV.half], ...[BANK, KASE].map((s): [number, number] => [s.c - s.half, s.c + s.half])];
  const lampAt = (a0: number, a1: number, corr: [number, number][]) => {
    const out: number[] = [];
    for (let u = a0 + 9; u < a1 - 1; u += 18) {
      // (3.9 m back from the kerb line of the crossing street: clear of the corner that turning vehicles cut.)
      const hit = corr.find(([p, q]) => u > p - 3.8 && u < q + 3.8);
      out.push(hit ? (u - hit[0] < hit[1] - u ? hit[0] - 3.9 : hit[1] + 3.9) : u);
    }
    return out;
  };
  // (None among the pavement exits' canopies, x 28…52.)
  lampAt(-X, X, [...carrX, [31.9, 48.1]]).forEach((x, k) => {
    const s = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_shop', x, s * (AV.half + 0.7), [0, -s]);
  });
  lampAt(-N, Z, carrZ).forEach((z, k) => {
    const s = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_shop', s * (AKA.half + 0.7), z, [-s, 0]);
  });
  for (const s of [BANK, KASE]) lampAt(-X, X, carrX).forEach((x, k) => {
    // (The bank street's lamps all stand on its built side.)
    const e = s === BANK ? 1 : k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_small', x, s.c + e * (s.half - 0.3), [0, -e]);
  });
  for (const s of [TSU, ITO, OSA, UCHI]) lampAt(-N, Z, carrZ).forEach((z, k) => {
    const e = k % 2 ? 1 : -1;
    streetLamp(b, 'lamp_small', s.c + e * (s.half - 0.3), z, [-e, 0]);
  });
  // Guard rail along the avenue's kerbs, open at every corner and by the exits' canopies.
  const mouths: [number, number][] = [...nsCorr.map(([p, q]): [number, number] => [p - 5, q + 5]), [28, 52], [-70, -50], [50, 70]];
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
  // Ginkgos down Akane-suji, zelkovas along the avenue.
  for (let z = -N + 18; z < Z - 4; z += 18) if (clearOf(z, ewCorr, 6)) for (const s of [-1, 1]) modelTree(b, 'ginkgo', s * (AKA.half + 1.6), z, 'b', GY, true);
  for (let x = -X + 18; x < X - 4; x += 18) if (clearOf(x, nsCorr, 6) && clearOf(x, [[28, 52]], 2)) for (const s of [-1, 1]) modelTree(b, 'zelkova', x, s * (AV.half + 1.7), 'b', GY, true);
  // Road names on blue boards, speed limits at the small streets' ends.
  roadName(b, -AKA.half - 2.2, -AV.half - AV.pave + 0.6, [1, 0], short(AV));
  roadName(b, AKA.half + 2.2, AV.half + AV.pave - 0.6, [-1, 0], short(AV));
  roadName(b, AKA.half + AKA.pave - 0.6, -AV.half - 8, [0, 1], short(AKA));
  roadName(b, -AKA.half - AKA.pave + 0.6, AV.half + 8, [0, -1], short(AKA));
  for (const s of [BANK, KASE]) {
    roadName(b, AKA.half + AKA.pave - 0.6, s.c + s.half + 1.2, [-1, 0], short(s));
    roadSign(b, 'speed30', WAYS.get(s)![0] > 0 ? -X + 12 : X - 12, s.c + s.half - 0.4, [WAYS.get(s)![0] > 0 ? -1 : 1, 0], 0.6);
  }
  for (const s of [ITO, OSA]) roadSign(b, 'speed30', s.c + s.half - 0.4, WAYS.get(s)![0] > 0 ? -N + 14 : Z - 12, [0, WAYS.get(s)![0] > 0 ? -1 : 1], 0.6);

  // ═════════════════════════ The canal's bank ═════════════════════════
  // A stone parapet along the bank street's water side, open at the three bridges and at the landing steps.
  const steps: [number, number] = [40, 52];
  const bridges = [ITO, AKA, OSA].map((s): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave]);
  {
    let from = -X;
    for (const [p, q] of [...bridges, steps, [X, X] as [number, number]].sort((m, n) => m[0] - n[0])) {
      if (p - from > 0.5) {
        b.box(STONE, from, 0, -N, p, 0.95, -N + 0.35);
        b.deco('flat:#cfc6b2', from, 0.95, -N - 0.05, p, 1.05, -N + 0.4);
      }
      from = q;
    }
  }
  at('s', (steps[0] + steps[1]) / 2, -N + 0.1, () => {
    b.model('wata', 'gangi', 0, 0, 0, 1);
    b.sign({ k: 'label', text: NAMES.steps.ja, sub: `${NAMES.steps.en}: where the cotton bales came ashore`, fg: '#f1ece0', bg: '#3b2a1e' }, -7.0, 1.3, -0.4, [0, -1], 1.9, 0.7);
    b.box('wood:#3b2a1e', -7.06, 0, -0.5, -6.94, 1.75, -0.38);
  });
  // The bridges, seen from the bank: a deck over the water with stone parapets, the road going on beyond.
  for (const s of [ITO, AKA, OSA]) {
    const h = s.half + s.pave;
    b.deco('asphalt', s.c - s.half, -0.03, -N - 17, s.c + s.half, 0.004, -N);
    if (s.pave) for (const e of [-1, 1]) b.deco('paver', Math.min(s.c + e * s.half, s.c + e * h), -0.03, -N - 17, Math.max(s.c + e * s.half, s.c + e * h), GY, -N);
    b.deco('flat:#8d8f8c', s.c - h - 0.4, -1.1, -N - 16.5, s.c + h + 0.4, -0.03, -N - 0.5);
    for (const e of [-1, 1]) {
      b.deco(STONE, Math.min(s.c + e * h, s.c + e * (h + 0.4)), 0, -N - 17, Math.max(s.c + e * h, s.c + e * (h + 0.4)), 1.0, -N);
      for (const z of [-N - 16.6, -N - 0.4]) b.deco('flat:#cfc6b2', s.c + e * (h + 0.2) - 0.35, 0, z - 0.35, s.c + e * (h + 0.2) + 0.35, 1.5, z + 0.35);
    }
  }
  b.sign({ k: 'label', text: NAMES.bridge.ja, sub: NAMES.bridge.en, fg: '#2b2e33', bg: '#cfc6b2' }, AKA.half + AKA.pave + 0.2, 0.95, -N - 0.76, [0, 1], 0.6, 0.5);

  // ═════════════════════════ The station's own quarter ═════════════════════════
  centreAbove(c, cf);
  // The gap under the deck between the west hall and Akane-suji's pavement: the bicycle park.
  {
    const x0 = WATA.halls[2].x1 + 2.5, x1 = -AKA.half - AKA.pave - 2.5;
    for (let x = x0 + 1; x < x1 - 0.5; x += 5.2) for (const z of [-6.2, -2.1, 2.1, 6.2]) {
      for (let k = 0; k < 6; k++) {
        if (r() < 0.25) continue;
        const d = b.dir([1, 0]);
        b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x + k * 0.62, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
      }
      b.block(x - 0.2, GY, z - 0.85, x + 3.6, GY + 1.0, z + 0.85);
    }
    b.zone('street', x0, GY - 0.2, WATA.z0 + 0.5, x1, GY + 6, WATA.z1 - 0.5, NAMES.bikes.ja, NAMES.bikes.en, true);
    b.sign({ k: 'label', text: NAMES.bikes.ja, sub: NAMES.bikes.en, fg: '#ffffff', bg: '#1f5fae' }, x1 + 0.4, GY + 2.2, 0, [1, 0], 3.2, 0.5);
    b.box('metal:#8d9094', x1 + 0.3, GY, -1.75, x1 + 0.42, GY + 2.5, -1.63);
    b.box('metal:#8d9094', x1 + 0.3, GY, 1.63, x1 + 0.42, GY + 2.5, 1.75);
  }

  // ═════════════════════════ Landmarks ═════════════════════════
  // 綿屋町ビルヂング: north of the avenue at Akane-suji's corner; you walk through its passage into the courtyard.
  at('s', 29, -AV.half - AV.pave, () => {
    const a = A.court, [px, , , pw, ph] = a.pts._pass, [yx, , yz, yw, yd] = a.pts._yard;
    b.model('wata', 'court', 0, GY, 0, 1);
    const [p0, p1, y0, y1, za, ze] = [px - pw / 2, px + pw / 2, yx - yw / 2, yx + yw / 2, yz - yd / 2, yz + yd / 2];
    b.block(-a.w / 2, GY, 0, p0, GY + a.h, za);
    b.block(p1, GY, 0, a.w / 2, GY + a.h, za);
    b.block(p0, GY + ph, 0, p1, GY + a.h, za);
    b.block(-a.w / 2, GY, za, y0, GY + a.h, ze);
    b.block(y1, GY, za, a.w / 2, GY + a.h, ze);
    b.block(-a.w / 2, GY, ze, a.w / 2, GY + a.h, a.d);
    b.deco('tile:#8a8378', p0, GY + 0.002, 0, p1, GY + 0.014, za);
    b.deco('tile:#a39c8c', y0, GY + 0.002, za, y1, GY + 0.014, ze);
    b.deco('tile:#8c3b35', y0 + 2.5, GY + 0.014, za + 2.5, y1 - 2.5, GY + 0.02, ze - 2.5);
    b.deco('tile:#a39c8c', y0 + 2.9, GY + 0.02, za + 2.9, y1 - 2.9, GY + 0.026, ze - 2.9);
    signAt(a.pts.name, { k: 'label', text: NAMES.court.ja, sub: NAMES.court.en, fg: '#3b2a1e', bg: '#cfc6b2' });
    signAt(a.pts.board, { k: 'label', text: `${NAMES.court.ja} 大正十四年竣工`, sub: 'Built 1925: carts drove in through the passage', fg: '#27344f', bg: '#f1ece0' });
    b.zone('street', y0, GY - 0.2, za, y1, GY + 8, ze, `${NAMES.court.ja} 中庭`, `${NAMES.court.en} courtyard`, true);
  });
  // 枡綿商店: the last merchant's house, north of Kase-dōri, its storehouse behind in the yard.
  at('s', 43.5, KASE.c - KASE.half, () => {
    const a = A.tonya;
    b.model('wata', 'tonya', 0, GY, 0, 1);
    solid(a.pts._house, 9);
    solid(a.pts._kura, 9);
    const gate = a.pts._gate;
    b.block(a.pts._house[0] + a.pts._house[3] / 2, GY, 0, gate[0] - gate[3] / 2, GY + 2.6, 0.2);
    b.block(gate[0] + gate[3] / 2, GY, 0, a.w / 2, GY + 2.6, 0.2);
    b.zone('street', a.pts._house[0] + a.pts._house[3] / 2 + 0.3, GY - 0.2, 0.5, a.w / 2 - 0.3, GY + 6, a.d - 0.5, `${NAMES.tonya.ja} 裏庭`, 'Masuwata’s yard', true);
    b.block(a.w / 2 - 0.15, GY, 0.2, a.w / 2, GY + 2.2, a.d);
    b.block(-a.w / 2, GY, a.pts._house[4], -a.w / 2 + 0.15, GY + 2.2, a.d);
    b.block(-a.w / 2, GY, a.d - 0.15, a.w / 2, GY + 2.2, a.d);
    signAt(a.pts.noren, { k: 'label', text: '枡綿', sub: 'Masuwata', fg: '#f1ece0', bg: '#27344f' });
    signAt(a.pts.kanban, { k: 'label', text: NAMES.tonya.ja, sub: NAMES.tonya.en, fg: '#e8d9b0', bg: '#3b2a1e' });
    signAt(a.pts.crest, { k: 'label', text: '綿', fg: '#2a2622', bg: '#ece4d2' });
  });
  // 綿守神社: the weavers' and cotton merchants' shrine, north of Kase-dōri; the precinct is open.
  at('s', -66.5, KASE.c - KASE.half, () => {
    const a = A.yashiro, g = a.pts._gate, hw = a.w / 2;
    b.model('wata', 'yashiro', 0, GY, 0, 1);
    b.block(-hw, GY, 0, g[0] - g[3] / 2, GY + 1.2, 0.25);
    b.block(g[0] + g[3] / 2, GY, 0, hw, GY + 1.2, 0.25);
    b.block(-hw, GY, 0, -hw + 0.25, GY + 1.2, a.d);
    b.block(hw - 0.25, GY, 0, hw, GY + 1.2, a.d);
    b.block(-hw, GY, a.d - 0.25, hw, GY + 1.2, a.d);
    solid(a.pts._hall, 6);
    solid(a.pts._honden, 4);
    solid(a.pts._inari, 2);
    solid(a.pts._basin, 2.3);
    for (const z of [6, 13]) for (const x of [-2.6, 2.6]) b.block(x - 0.4, GY, z - 0.4, x + 0.4, GY + 2.3, z + 0.4);
    for (const x of [-2.4, 2.4]) b.block(x - 0.4, GY, 18.3, x + 0.4, GY + 1.5, 19.3);
    for (const x of [-2.1, 2.1]) b.block(x - 0.28, GY, 1.32, x + 0.28, GY + 4.6, 1.88);
    b.deco('flat:#b9b08f', -hw + 0.3, GY + 0.002, 0.3, hw - 0.3, GY + 0.01, a.d - 0.3);
    modelTree(b, 'camphor', 10.5, 16, 'a');
    modelTree(b, 'camphor', -11, 8, 'b');
    modelTree(b, 'pine', 11, 29, 'b');
    signAt(a.pts.gaku, { k: 'label', text: '綿守', fg: '#e8d9b0', bg: '#3b2a1e' });
    signAt(a.pts.yuisho, { k: 'label', text: `${NAMES.shrine.ja} 由緒`, sub: 'Guardian of the cotton trade and the weavers', fg: '#2a2622', bg: '#ece4d2' });
    signAt(a.pts.ema, { k: 'label', text: '絵馬', sub: 'Votive tablets', fg: '#3b2a1e', bg: '#e6dfcc' });
    b.zone('street', -hw + 0.3, GY - 0.2, 0.3, hw - 0.3, GY + 8, a.d - 0.3, NAMES.shrine.ja, NAMES.shrine.en, true);
  });
  // The convenience store on the corner of Akane-suji and the bank street; the police box on the avenue's south-east corner.
  at('n', 18, BANK.c + BANK.half, () => konbini(b, { type: 'corner', chain: 'asanagi' }));
  at('n', 14.5, AV.half + AV.pave, () => place(b, { kind: 'koban', ...NAMES.koban }));

  // ═════════════════════════ Stage 3: the fill ═════════════════════════
  // Firms are named from the town's own invented streets and places with a trade: nothing real can share them.
  const FIRMS: [string, string][] = [
    ['綿屋町繊維', 'Watayamachi Textiles'], ['茜筋服地', 'Akanesuji Dress Fabrics'], ['晒通タオル', 'Sarashi-dōri Towels'], ['綛通ボタン', 'Kase-dōri Buttons'],
    ['糸巻産業', 'Itomaki Sangyō'], ['筬筋帆布', 'Osasuji Canvas'], ['川湊綿布', 'Kawaminato Cotton Cloth'], ['西海メリヤス', 'Seikai Knitwear'],
    ['木綿大通商事', 'Momen-ōdōri Trading'], ['綿守産業', 'Watamori Sangyō'], ['晒橋商店', 'Sarashibashi Shōten'], ['瓢箪堀繊維', 'Hyōtanbori Textiles'],
    ['紡錘筋毛糸', 'Tsumusuji Yarns'], ['綿打ふとん', 'Watauchi Futon'], ['川湊裏地', 'Kawaminato Linings'], ['西海レース', 'Seikai Lace'],
    ['綿屋町作業服', 'Watayamachi Workwear'], ['茜染料', 'Akane Dyestuffs'], ['糸巻ミシン糸', 'Itomaki Sewing Thread'], ['晒手拭本舗', 'Sarashi Tenugui Honpo'],
  ];
  const BOARDS: [string, string][] = [['#f1ece0', '#27344f'], ['#27344f', '#ffffff'], ['#9c2a30', '#ffffff'], ['#f4f1e8', '#3a2a1e'], ['#2a2622', '#e8d9b0'], ['#f4f1e8', '#9c2a30']];
  const MAIN = ['m27', 'm18a', 'm9', 'm18b', 'm12', 'm27b', 'm18c', 'm12b'], BACKS = ['b18a', 'b9b', 'b27', 'b12', 'b18b', 'b9a', 'b18c', 'b9c', 'b27b'];
  const DEPTH = W.m27.d;
  let firm = 0;
  /** One firm's building, its front's middle at (x, line), facing `face`. `name` for the few that are not wholesalers. */
  const firmAt = (face: Face, x: number, line: number, id: string, name?: Named, extra?: () => void) => at(face, x, line, () => {
    const a = W[id], n = name ?? { ja: FIRMS[firm % FIRMS.length][0], en: FIRMS[firm % FIRMS.length][1] }, [bg, fg] = BOARDS[firm % BOARDS.length];
    firm++;
    b.model('wholesale', id, 0, GY, 0, firm);
    b.block(-a.w / 2, GY, 0, a.w / 2, GY + a.h, a.d);
    // The firm's name wherever the model has a board: over the street storey, on the roof frame, down the front,
    // and on each side wall over the side entrance and on the upright board (both of its faces).
    if (a.pts.name) signAt(a.pts.name, { k: 'label', text: n.ja, sub: n.en, fg, bg });
    if (a.pts.roof) signAt(a.pts.roof, { k: 'label', text: n.ja, sub: n.en, fg: bg, bg: fg });
    if (a.pts.vertical) signAt(a.pts.vertical, { k: 'shop', ja: n.ja, bg, fg, vertical: true });
    for (const t of ['l', 'r']) {
      if (a.pts[`name_${t}`]) signAt(a.pts[`name_${t}`], { k: 'label', text: n.ja, sub: n.en, fg, bg });
      const u = a.pts[`up_${t}`];
      if (u) for (const sz of [-1, 1]) b.sign({ k: 'shop', ja: n.ja, bg, fg, vertical: true }, u[0], u[1] + GY, u[2] + (sz > 0 ? 0.16 : 0), [0, sz], u[3], u[4]);
    }
    extra?.();
  });
  /** A second board at the street, left of the door: who else is in the building. */
  const tenant = (ja: string, en: string, bg: string, fg = '#ffffff') => () => b.sign({ k: 'label', text: ja, sub: en, fg, bg }, -2.6, GY + 2.2, -0.2, [0, -1], 2.4, 0.6);
  /** The rectangle a 34 m lot takes behind the building line, for a row facing `face`. */
  const lot = (face: 'n' | 's', line: number, a: number, e: number): Rect => (face === 'n' ? [a, line, e, line + DEPTH] : [a, line - DEPTH, e, line]);
  let gaps = 0;
  /** What stands where a row leaves a gap too narrow to build on: coin parking, a vacant lot kept by its owner, a yard of bales. */
  const gapSite = (rc: Rect, frontZ: number) => {
    const [x0, z0, x1, z1] = rc, k = gaps++ % 3, into = frontZ === z0 ? 1 : -1;
    if (k === 0) {
      b.deco('asphalt', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      for (let z = frontZ + into * 4, i = 0; Math.abs(z - frontZ) < z1 - z0 - 5; z += into * 5.6, i++) {
        b.deco(WHITE, x0 + 0.3, GY + 0.012, z - 0.05, x1 - 0.3, GY + 0.018, z + 0.05);
        if (i % 2 === 0 && x1 - x0 > 4.8) {
          const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
          roadModel(b, id, (x0 + x1) / 2, GY, z + into * 2.8, [1, 0]);
          b.block((x0 + x1) / 2 - len / 2, GY, z + into * 2.8 - wd / 2, (x0 + x1) / 2 + len / 2, GY + ht, z + into * 2.8 + wd / 2);
        }
      }
      b.sign({ k: 'label', text: 'コインパーキング', sub: 'Coin parking, 24 h', fg: '#1c1c1e', bg: '#f2c200' }, x0 + 0.12, GY + 2.6, frontZ + into * 0.6, [0, -into], Math.min(2.4, x1 - x0 - 0.4), 0.6);
      b.box('metal:#8d9094', x0 + 0.06, GY, frontZ + into * 0.54, x0 + 0.18, GY + 2.95, frontZ + into * 0.66);
      b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, 'コインパーキング', 'Coin parking', true);
    } else if (k === 1) {
      b.deco('flat:#7f8a66', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      b.sign({ k: 'label', text: '管理地 立入禁止', sub: 'Private land: keep out', fg: '#c8102e', bg: '#f4f3ee' }, (x0 + x1) / 2, GY + 1.1, frontZ + into * 0.5, [0, -into], Math.min(1.6, x1 - x0 - 0.6), 0.5);
      for (const px of [x0 + 0.4, x1 - 0.4]) b.box('wood:#6b4a30', px - 0.05, GY, frontZ + into * 0.45, px + 0.05, GY + 1.0, frontZ + into * 0.55);
      b.deco('flat:#d9c35a', x0 + 0.4, GY + 0.82, frontZ + into * 0.48, x1 - 0.4, GY + 0.86, frontZ + into * 0.52);
      b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, '空き地', 'Vacant lot', true);
    } else {
      b.deco('flat:#8a8378', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      for (let z = frontZ + into * 6; Math.abs(z - frontZ) < z1 - z0 - 3; z += into * 4.5) {
        const cx = x0 + 1.2 + r() * Math.max(0.1, x1 - x0 - 3.6);
        b.box('wood:#b9a970', cx, GY, z - 0.6, cx + 1.2, GY + 0.14, z + 0.6);
        b.box('flat:#e6dfcc', cx + 0.05, GY + 0.14, z - 0.5, cx + 1.15, GY + 0.9 + Math.floor(r() * 2) * 0.7, z + 0.5);
      }
      b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, '荷置き場', 'Bale yard', true);
    }
  };
  /**
   * A row of firms from a to e along x: the lot widths that fill it best, hard on the corner at both ends (no
   * strip of leftover ground between a side wall and a street), in a shuffled order; what little is left over
   * is one gap in the middle of the row. `site`: one of the small lots is left as a gap site instead.
   */
  const WIDTHS = [26.7, 17.7, 11.7, 8.7];
  const row = (face: 'n' | 's', line: number, a: number, e: number, pool: string[], site = false) => {
    const L = e - a;
    let best: number[] = [], bestUsed = -1;
    const go = (i: number, acc: number[], sum: number) => {
      const used = sum + 0.4 * Math.max(0, acc.length - 1);
      if (used > L + 0.01) return;
      if (used > bestUsed) {
        bestUsed = used;
        best = acc;
      }
      if (acc.length >= 7) return;
      for (let k = i; k < WIDTHS.length; k++) go(k, [...acc, WIDTHS[k]], sum + WIDTHS[k]);
    };
    go(0, [], 0);
    const ws = best.map((wd) => ({ wd, o: r() })).sort((p, q) => p.o - q.o).map((q) => q.wd);
    const slack = L - bestUsed, mid = Math.floor(ws.length / 2);
    const siteAt = site ? ws.findIndex((q, i) => q < 12 && i > 0 && i < ws.length - 1) : -1;
    let x = a;
    ws.forEach((wd, i) => {
      if (i === mid && slack > 0.3) {
        const z = face === 'n' ? line + 0.2 : line - 0.3, [lx0, lz0, lx1, lz1] = lot(face, line, x - 0.4, x + slack);
        // Wide enough to walk: a paved passage through to the drain alley. Narrower: closed with a board.
        if (slack + 0.4 >= 1.6) {
          b.deco(LANE, lx0, GY + 0.002, lz0, lx1, GY + 0.012, lz1);
          b.deco('flat:#6f6a60', (lx0 + lx1) / 2 - 0.08, GY + 0.012, lz0, (lx0 + lx1) / 2 + 0.08, GY + 0.016, lz1);
          b.zone('street', lx0, GY - 0.2, lz0, lx1, GY + 6, lz1, '通り抜け', 'Passage to the drain alley', true);
        }
        else b.box('wood:#5a4030', x - 0.4, GY, z, x + slack, GY + 2.1, z + 0.1);
        x += slack;
      }
      if (i === siteAt) gapSite(lot(face, line, x, x + wd), line);
      else {
        const ids = pool.filter((id) => Math.abs(W[id].w - wd) < 0.01);
        firmAt(face, x + wd / 2, line, ids[Math.floor(r() * ids.length)]);
      }
      x += wd + 0.4;
    });
  };
  const FRN = AV.half + AV.pave, [W2a, W2e, W1a, W1e, E1a, E1e, E2a, E2e] = [TSU.c + 3, ITO.c - 3, ITO.c + 3, -(AKA.half + AKA.pave), AKA.half + AKA.pave, OSA.c - 3, OSA.c + 3, UCHI.c - 3];
  const w = (id: string) => W[id].w;
  // ── The avenue: the tall fronts. North side (the courtyard building holds E1's corner). ──
  row('s', -FRN, W2a, W2e, MAIN);
  row('s', -FRN, W1a, W1e, MAIN);
  row('s', -FRN, 47.4, E1e, MAIN);
  row('s', -FRN, E2a, E2e, MAIN);
  // South side: the bank on Akane-suji's west corner; east of the police box, standing soba at the street.
  row('n', FRN, W2a, W2e, MAIN);
  firmAt('n', W1e - w('m18b') / 2, FRN, 'm18b', { ja: '紬橋銀行 綿屋町支店', en: 'Tsumugibashi Bank, Watayamachi Branch' });
  row('n', FRN, W1a, W1e - w('m18b') - 0.4, MAIN);
  firmAt('n', 18.2 + w('m9') / 2, FRN, 'm9', undefined, tenant('立ち食いそば わた庵', 'Wata-an standing soba', '#3b2a1e', '#f1ece0'));
  row('n', FRN, 18.2 + w('m9') + 0.4, E1e, MAIN);
  row('n', FRN, E2a, E2e, MAIN);
  // ── The bank street (built on its south side only): a tall corner on Akane-suji, the post office by the store. ──
  const BL = BANK.c + BANK.half, KN = KASE.c - KASE.half, KS = KASE.c + KASE.half;
  row('n', BL, W2a, W2e, BACKS, true);
  firmAt('n', W1e - w('m12') / 2, BL, 'm12');
  row('n', BL, W1a, W1e - w('m12') - 0.4, BACKS);
  firmAt('n', 25.4 + w('b18a') / 2, BL, 'b18a', { ja: '綿屋町郵便局', en: 'Watayamachi Post Office' });
  row('n', BL, 25.4 + w('b18a') + 0.4, E1e, BACKS);
  row('n', BL, E2a, E2e, BACKS);
  // ── Kase-dōri, north side: round the shrine and the merchant's house. ──
  row('s', KN, W2a, W2e, BACKS);
  firmAt('s', W1e - w('m9') / 2, KN, 'm9');
  row('s', KN, -49.6, W1e - w('m9') - 0.4, BACKS);
  firmAt('s', E1a + w('m18a') / 2, KN, 'm18a');
  row('s', KN, 57.4, E1e, BACKS);
  row('s', KN, E2a, E2e, BACKS, true);
  // ── Kase-dōri, south side: the kissaten's corner, the pharmacy with the clinic over it, and in the far block an
  // apartment building where a wholesaler sold up (a stock model: plainly newer than its row). ──
  {
    const m = BUILDING_MODELS.filter((q) => q.kind === 'manshon' && !q.corner && q.w <= 27 && q.d <= DEPTH).sort((p, q) => q.h - p.h)[0];
    at('n', W2a + m.w / 2, KS, () => {
      b.model(m.kind, m.id, 0, GY, 0, 3);
      b.block(-m.w / 2, GY, 0, m.w / 2, GY + m.h, m.d);
    });
    if (DEPTH - m.d > 3) gapSite([W2a, KS + m.d + 0.4, W2a + m.w, KS + DEPTH], KS + DEPTH);
    row('n', KS, W2a + m.w + 0.4, W2e, BACKS);
  }
  firmAt('n', W1e - w('m18b') / 2, KS, 'm18b', undefined, tenant('純喫茶 かせ', 'Kase coffee house', '#6b4a30', '#f1ece0'));
  row('n', KS, W1a, W1e - w('m18b') - 0.4, BACKS);
  firmAt('n', E1a + w('m12') / 2, KS, 'm12', { ja: '調剤薬局 わたや', en: 'Wataya Pharmacy' }, tenant('2階 内科・小児科クリニック', '2F: clinic', '#1d8a4e'));
  row('n', KS, E1a + w('m12') + 0.4, E1e, BACKS);
  row('n', KS, E2a, E2e, BACKS, true);
  // ── The last strip by the south edge (13 m): low shop-houses on the drain alley, a roji of small shops. ──
  for (const [a, e] of [[W2a, W2e], [W1a, W1e], [E1a, E1e], [E2a, E2e]]) fillModelLots(b, r, a + 0.2, e - 0.2, 136.9, Z + 2.01, { noBack: true, kinds: ['shophouse', 'machi'], old: true });
  // Their back yards: beaten earth to a block wall at the edge, between the streets that run on south.
  {
    let from = -X;
    for (const [p, q] of [...nsCorr, [X, X] as [number, number]]) {
      if (p - from > 2) {
        b.deco('flat:#8a8378', from, GY + 0.002, Z - 4.2, p, GY + 0.012, Z);
        b.box('flat:#b3ac9c', from, GY, Z - 0.3, p, GY + 1.7, Z);
      }
      from = q;
    }
  }
  // ── Behind the store: coin parking. Behind the police box: bicycles. The boarded alley. The verges at the outer streets. ──
  gaps = 0;
  gapSite([E1a, BL + 9.4, 25, BL + DEPTH], BL + DEPTH);
  {
    const [x0, z0, x1, z1] = [E1a + 0.2, FRN + 5.6, 17.8, FRN + DEPTH];
    b.deco('flat:#9a968c', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    for (let z = z0 + 1.5; z < z1 - 1; z += 2.4) {
      for (let k = 0; k < 7; k++) {
        if (r() < 0.3) continue;
        const d = b.dir([0, 1]);
        b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x0 + 0.8 + k * 0.62, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
      }
    }
    b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, '綿屋町駅 南自転車駐車場', 'Station bicycle park, south', true);
  }
  for (const x of [E2a + 0.3, E2e - 0.4]) b.box('wood:#5a4030', x, GY, 55.1, x + 0.1, GY + 2.1, 56.9);
  // (A block wall and a hedge between the streets that run on over the edge; none across a street.)
  for (const s of [-1, 1]) {
    let from = -N + 2 * BANK.half;
    for (const [p, q] of [[-FRN, FRN], [KN - 2.5, KS + 2.5], [Z, Z]]) {
      if (p - from > 1) {
        b.box('flat:#b3ac9c', Math.min(s * (X - 0.3), s * X), GY, from, Math.max(s * (X - 0.3), s * X), GY + 1.7, p);
        b.deco('flat:#55703f', Math.min(s * 167.1, s * (X - 0.3)), GY + 0.002, from, Math.max(s * 167.1, s * (X - 0.3)), GY + 0.5, p);
      }
      from = q;
    }
  }
  // ── Poles and wires along the two 8 m streets (the avenue and Akane-suji have theirs underground). ──
  for (const s of [BANK, KASE]) poleLine(b, { axis: 'x', from: -X + 8, to: X - 8, at: s.c + s.half - 0.35, road: -1, skip: (u) => !clearOf(u, nsCorr, 7), drops: 1.5, name: short(s) });
  // ── A bus stop each way on the avenue; buses stop in the kerb lane. ──
  for (const [sx, x] of [[1, -60], [-1, 60]] as const) {
    const s = -sx, f: [number, number] = [0, -s];
    roadModel(b, 'busstop', x + sx * 6.5, GY, s * (AV.half + 0.75), f);
    b.block(x + sx * 6.5 - 0.15, GY, s * (AV.half + 0.75) - 0.15, x + sx * 6.5 + 0.15, GY + 2.6, s * (AV.half + 0.75) + 0.15);
    roadModel(b, 'shelter', x, GY, s * (AV.half + 2.7), f);
    for (const px of [x - 1.9, x + 1.9]) b.block(px - 0.1, GY, s * (AV.half + 2.7) - 0.1, px + 0.1, GY + 2.5, s * (AV.half + 2.7) + 0.1);
    b.sign({ k: 'label', text: '綿屋町', sub: 'Watayamachi (bus stop)', fg: '#ffffff', bg: '#1f5fae' }, x + sx * 6.5, GY + 2.2, s * (AV.half + 0.75) - s * 0.12, f, 0.5, 0.5);
    for (const ln of b.out.lanes) if (ln.use === 'all' && Math.abs(ln.from[2] - s * 13.05) < 0.1) ln.halts = [...ln.halts, { at: (x + sx * 6.5 - ln.from[0]) * sx, side: 0 }];
  }

  // ═════════════════════════ The AR Main Line past the west edge ═════════════════════════
  // The line's bed, track, wires and its bridge over the canal are the line's own (the swept trackbed). Here:
  // the three level crossings, the stops they give the streets' lanes, and the arm's ground over Kase-dōri's.
  const rails = RAIL_LINES.flatMap((l) => (l.crossings ?? []).filter((q) => q.station === sta.id).map((q) => ({ l, q, lx: q.at[0] - sta.position.x, lz: q.at[1] - sta.position.y })));
  const railX = rails.length ? rails[0].lx : null;
  for (const { l, q, lx, lz } of rails) {
    const road = [BANK, AV, KASE].find((s) => Math.abs(s.c - lz) < s.half);
    if (!road) throw new Error(`watayaStreet: a level crossing at z ${lz} is on no street`);
    const geom = lineSim(l.id).geom, ry = geom.railY(geom.path.project(q.at[0], q.at[1]).s);
    const key = q.key ?? q.station, tracks = l.trackOffset + 2.2;
    // (Down trains run south here. The bank street has the canal's wall at its north side: a narrow footway only.)
    levelCrossing(b, { road: 'x', x: lx, z: lz, rw: road.half, tracks, line: l.id, station: key, downTo: 1, ry, name: q.name, walk: road === AV ? AV.pave : road === BANK ? 0.9 : WATA_ARM[3] - KASE.c - KASE.half });
    // The street's traffic waits at the stop lines while the gates are down (its lanes run on over the line: world/runon.ts).
    for (const ln of b.out.lanes) {
      const ux = Math.sign(ln.to[0] - ln.from[0]);
      if (Math.abs(ln.to[2] - ln.from[2]) > 0.5 || Math.abs(ln.from[2] - lz) > road.half || !ux) continue;
      const stop = lx - ux * (tracks + 3.2), t = (stop - ln.from[0]) * ux;
      if (t > Math.abs(ln.to[0] - ln.from[0]) + 60) continue;
      (ln.gates ??= []).push({ at: t, line: l.id, station: key });
    }
    if (road === KASE) {
      // The arm: solid ground out over the crossing, the footways either side of the road, the panels' hump.
      const [a0, z0, a1, z1] = WATA_ARM;
      b.box('asphalt', a0, -0.6, z0, a1, 0, z1);
      b.box('paver', a0, 0, z0, a1, GY, KASE.c - KASE.half);
      b.box('paver', a0, 0, KASE.c + KASE.half, a1, GY, z1);
      b.box('flat:#3a3d42', lx - tracks - 0.6, 0, KASE.c - KASE.half, lx + tracks + 0.6, Math.max(0.05, ry - 0.03), KASE.c + KASE.half);
      b.zone('street', a0, GY - 0.2, z0, a1, GY + 6, z1, q.name.ja, q.name.en, true);
      b.zone('street', a0, GY - 0.2, z0, lx - tracks - 2, GY + 6, z1, `${q.name.ja} 西側`, `${q.name.en}, west side`, true);
    }
  }
  if (railX !== null) {
    // Lanes along the line (線路沿いの道) south of the bank street, and no backdrop city on the line's course.
    for (const [x0, x1] of [[railX + 9.4, -X], [railX - 16, railX - 9.4]]) b.deco('asphalt', x0, -0.03, BANK.c + BANK.half, x1, 0.002, Z + 180);
    b.clearScenery(railX - 16, -N - 240, railX + 16, Z + 180);
    b.clearScenery(railX - 16, Z + 180, railX + 110, Z + 360);
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  // Every street runs on between rows of stock buildings, with a cross street half way: 180 m east and south,
  // 90 m west (the other canal lies beyond), and north over Hyōtan-bori on the bridges.
  {
    const CW = 3.5, BIZ = ['office', 'zakkyo', 'manshon'];
    const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face) => {
      if (x1 - x0 < 4.6 || z1 - z0 < 4.6) return;
      const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
      if (e - a < 4.6 || f1 - f0 < 8) return;
      b.with(FRAME[face], () => {
        let z = f0;
        for (let k = 0; k < 6 && f1 - z > 8.5; k++) {
          const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds: BIZ, lo: true, bare: k > 0 });
          if (!lots.length) break;
          z = Math.max(...lots.map((l) => l[3])) + 0.8;
        }
      });
    };
    /** One side: `alongZ` for the north and south edges (the 筋 run on), else east and west (the 通). `d0`: where the ground starts again (past the canal). */
    const side = (alongZ: boolean, s: 1 | -1, out: number, d0 = 0, rowsFrom = d0 + 0.3, cross = true) => {
      const lim = alongZ ? (s > 0 ? Z : N) : X, streets = alongZ ? NS : EW;
      const u0 = s > 0 ? lim + d0 : -lim - out, u1 = s > 0 ? lim + out : -lim - d0;
      for (const q of streets) {
        if (alongZ && s < 0 && (q === TSU || q === UCHI)) continue; // they end at the bank street
        if (!alongZ && s > 0 && q === BANK) continue; // the canal bends across its line east of the plot
        const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
        if (q.mid) for (const k of [-1, 1]) R('asphalt', Math.min(k * q.mid, k * q.half), Math.max(k * q.mid, k * q.half), -0.03, 0.004);
        else R('asphalt', -q.half, q.half, -0.03, 0.004);
        if (q.mid) R('paver', -q.mid, q.mid, -0.03, GY);
        if (q.pave) for (const k of [-1, 1]) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY);
        for (let u = u0 + 10, k = 0; u < u1 - 4; u += 24, k++) {
          const e = k % 2 ? 1 : -1, v = e * (q.half + (q.pave ? 0.7 : -0.3));
          roadModel(b, q.half > 5 ? 'lamp_led' : 'lamp_small', alongZ ? q.c + v : u, GY, alongZ ? u : q.c + v, alongZ ? [-e, 0] : [0, -e]);
        }
      }
      const corr = streets.filter((q) => !(alongZ && s < 0 && (q === TSU || q === UCHI))).map((q): [number, number] => [q.c - q.half - q.pave, q.c + q.half + q.pave]).sort((m, n) => m[0] - n[0]);
      // (East of the plot the canal bends south to z −81: nothing is laid north of z −75 there.)
      const lo = alongZ ? -X : s > 0 ? -75 : -N, hi = alongZ ? X : Z, CROSS = d0 + (out - d0) / 2;
      let from = lo;
      for (const [p, q] of [...corr, [hi, hi] as [number, number]]) {
        const a = from + 0.2, e = p - 0.2, m = (a + e) / 2;
        if (e - a > 12) for (const [g0, g1] of cross ? [[rowsFrom, CROSS - CW], [CROSS + CW, out]] : [[rowsFrom, out]]) {
          const [w0, w1] = s > 0 ? [lim + g0, lim + g1] : [-lim - g1, -lim - g0];
          if (alongZ) {
            fillRect(a, w0, m - 0.4, w1, 'w');
            fillRect(m + 0.4, w0, e, w1, 'e');
          } else {
            fillRect(w0, a, w1, m - 0.4, 'n');
            fillRect(w0, m + 0.4, w1, e, 's');
          }
        }
        from = q;
      }
      const uc = s > 0 ? lim + CROSS : -lim - CROSS;
      if (!cross) {
        // (No cross street: the railway takes its place.)
      } else if (alongZ) b.deco('asphalt', lo - 9, -0.03, uc - CW, hi + 9, 0.004, uc + CW);
      else b.deco('asphalt', uc - CW, -0.03, lo, uc + CW, 0.004, hi + 9);
      if (alongZ) b.clearScenery(lo - 9, s > 0 ? Z : -N - out - 2, hi + 9, s > 0 ? Z + out + 2 : -N);
      else b.clearScenery(s > 0 ? X : -X - out - 2, lo - 9, s > 0 ? X + out + 2 : -X, hi + 9);
    };
    side(true, 1, 180);
    side(true, -1, 180, 17);
    side(false, 1, 180);
    // West: the railway runs 15 m out, so the rows start beyond its far lane and there is no cross street.
    side(false, -1, 88, 0, 999, false);

    // ── The expressway past the plot (the owner's choice, 2026-11-25): east it ramps down and ends, west it leaves over the bay ──
    const span = WATA.span, cz0 = WATA.z0;
    const pierAt = (x: number) => b.model('watacentre', 'pier', x, GY, cz0, 0);
    // East: four more spans on piers, then the ramp down into the avenue's middle strip. A spur into the city ends here.
    for (let k = 0; k < 4; k++) b.model('watacentre', 'deck', X + span / 2 + k * span, GY, cz0, 0);
    for (let k = 0; k <= 4; k++) pierAt(X + k * span);
    b.model('watacentre', 'ramp', X + 4 * span + C.ramp.w / 2, GY, cz0, 0);
    // West: over the railway (no pier on the line) to the quay, then out over the bay on piers, curving north-west
    // towards the port (R 500), fifteen spans before it is out of sight.
    for (let k = 0; k < 4; k++) b.model('watacentre', 'deck', -X - span / 2 - k * span, GY, cz0, 0);
    for (const x of [-X, -X - 2 * span, -X - 3 * span]) pierAt(x);
    {
      const STEP = span - 0.25, TURN = STEP / 500;
      let px = -X - 4 * span, pz = 0;
      for (let k = 0; k < 15; k++) {
        const a = Math.PI + TURN * (k + 0.5), dx = Math.cos(a), dz = Math.sin(a), yaw = Math.atan2(-dz, dx);
        // (A model's origin is the middle of its front: 9 m to one side of the deck's centre line.)
        const ox = -9 * Math.sin(yaw), oz = -9 * Math.cos(yaw);
        b.out.models.push({ kind: 'watacentre', id: 'pier_sea', pos: [px + ox, GY, pz + oz], yaw, seed: 0 });
        b.out.models.push({ kind: 'watacentre', id: 'deck', pos: [px + (dx * STEP) / 2 + ox, GY, pz + (dz * STEP) / 2 + oz], yaw, seed: 0 });
        px += dx * STEP;
        pz += dz * STEP;
      }
    }

    // ── The waterfront west of the railway: a quay along the bay, sheds and brick warehouses facing it, yards behind ──
    {
      const SHORE = -259, QUAY = -246, LINE = -244, BACK = railX !== null ? railX - 16 : -201;
      const zN = BANK.c - BANK.half, zS = Z + 180;
      b.deco('flat:#9a968c', SHORE, -0.03, zN, BACK, 0.001, zS);
      b.deco('flat:#77736a', SHORE - 0.6, -2.5, zN, SHORE + 0.8, 0.3, zS);
      b.deco(WHITE, QUAY - 0.08, 0.004, zN, QUAY + 0.08, 0.008, zS);
      const model = (kind: string, id: string, x: number, z: number, f: [number, number]) => b.out.models.push({ kind, id, pos: [x, GY, z], yaw: Math.atan2(-f[0], -f[1]), seed: 0, merge: true });
      for (let z = zN + 6; z < zS - 4; z += 12) model('port', 'bollard', SHORE + 1.4, z, [-1, 0]);
      for (let z = zN + 15; z < zS - 4; z += 30) model('port', 'quaylamp', SHORE + 3.2, z, [-1, 0]);
      // Rows between the streets, fronts to the water (face w), each as wide as it comes, 4 m apart.
      const roads: [number, number][] = [AV, KASE].map((s) => [s.c - s.half - s.pave - 3, s.c + s.half + s.pave + 3]);
      const SHEDS = ['shed_a', 'soko_b', 'soko_a', 'shed_b', 'soko_c', 'shed_a', 'soko_b', 'shed_b', 'soko_a'];
      let z = zN + 6, k = 0;
      while (z < zS - 30) {
        const id = SHEDS[k++ % SHEDS.length], w = P[id].w;
        const hit = roads.find(([p, q]) => z < q && z + w > p);
        if (hit) {
          z = hit[1];
          continue;
        }
        at('w', LINE, z + w / 2, () => b.model('port', id, 0, GY, 0, k));
        if (k % 3 === 0) model('port', k % 2 ? 'lorry_a' : 'lorry_b', LINE - 5, z + w / 2, [0, 1]);
        z += w + 4;
      }
      b.clearScenery(SHORE - 10, zN, BACK, zS);
    }
  }
}
