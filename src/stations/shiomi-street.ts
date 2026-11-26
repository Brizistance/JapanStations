// Shiomi's outside (潮見, rebuilt from 2026-11-25): a leisure waterfront at the tip of the river-mouth landfill, after
// Osaka's Tempozan. The station (open-cut terminus, head house, east hall) is shiomi.ts; this is the ground round it.
//
// THE PLAN (station frame: +x east along the Shiokaze Line, +z south; plot x ±150, z −198 … 52, and the tip west to
// the open bay, x −319.5 … −150, z −120 … 52; numbers in shiomi-plan.ts, where SHIOMI_STREETS is the table that
// street-rules.test.ts holds this build to)
//
//   Street                       Centre      Width   What it is
//   潮見ベイ通り Shiomi Bay-dōri   z = −29     24 m    the main road, four lanes, 5 m pavements, pines; from Misaki-suji (a
//                                                    T) east past the plot
//   岬筋 Misaki-suji              x = −135    11.5 m  two lanes; the plaza's west side, from the north past the plot down to
//                                                    the greenway's lane
//   汐入筋 Shioiri-suji           x = 80      12 m    two lanes, past the cutting's east end (the line is in tunnel there)
//   潮見中通 Shiomi-naka-dōri      z = −95     9 m     the back street, two lanes, east past the plot
//   潮見北通 Shiomi-kita-dōri      z = −150    6.5 m   small street, painted side lines
//   灯台小路, 浜木綿小路           x = −40, 20 6.5 m   small streets from the north down to the main road
//   水族館通り Suizokukan-dōri     z = 0       9 m     the shopping street on the station's axis, west from the plaza to the
//                                                    aquarium's square
//   緑道裏通 Ryokudō-ura-dōri      z = 19      5 m     one-way service lane east between the station and the greenway
//   潮見海浜緑道                    z 21.5 … 52         the greenway: planted strip, then the promenade on the sea wall
//   水族館北通 (the coach road)     z = −62     12 m    from Misaki-suji west to the aquarium's coach bay (the tip only)
//
//   Lots: the station plaza (x −129 … −92); the bus terminal north-west of it; 川湊水族館 at the tip, its square at the
//   shopping street's end; the harbour market hall on the shopping street's south side. Other lots bare (stage 3).
//
//   Edges: west the open bay, south the river mouth (sea walls, real). North Misaki-suji, the two 小路 and Shioiri-suji
//   run on to the landfill's north sea wall (z −296). East the main road, the back street, Shiomi-kita-dōri, the lane
//   and the greenway run on 150 m towards Nishi-Yūnagi.

import type { LanePart } from '../world/builder';
import type { Ctx } from './kit';
import { SHIOMI as SA } from './anchors/shiomi';
import type { AnchorPt } from './anchors/types';
import { GROUND_Y, ceilingLight, rail, stairs } from './kit';
import { MCENTER } from './anchors/mcenter';
import type { Rect } from './looks/types';
import { SHIOMI as S, SHIOMI_BRIDGE as BRG, SHIOMI_LINES as BL, SHIOMI_PLOT, SHIOMI_SITES as SITE, SHIOMI_STREETS } from './shiomi-plan';
import { BASCULE_LINE } from '../signs/departures';
import { mark, pedSignal, poleLine, roadModel, roadName, roadSign, streetLamp, trafficLane, vehicleSignal } from './roads';
import { crosswalk } from './surface';
import { BRIDGE_LANE, CYCLE } from './shiomi-extras';
import { modelTree, type TreeKind } from './trees';

type Named = { ja: string; en: string };
type Face = 'n' | 's' | 'e' | 'w';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
type St = (typeof SHIOMI_STREETS)[number];
const X = SHIOMI_PLOT.x, Z = SHIOMI_PLOT.z, N = SHIOMI_PLOT.north;
const [AX0, AZ0] = SHIOMI_PLOT.arms[0];
const st = (en: string) => SHIOMI_STREETS.find((s) => s.en.startsWith(en))!;
const BAY = st('Shiomi Bay'), MIS = st('Misaki'), SHI = st('Shioiri'), NAKA = st('Shiomi-naka'), KITA = st('Shiomi-kita');
const HK = st('Hamakaze'), HAM = st('Hamayū'), SHOP = st('Suizokukan'), URA = st('Ryokudō');
const HANPU = st('Hanpu'), SD = st('Shiomi-hokugan'), ECR = st('Shiomi-higashi'), MKN = st('Misaki-kita'), BLN = st('Shiomi Bay-dōri back'), NAG = st('Shiomi-nagisa');
const short = (s: Named): Named => ({ ja: s.ja, en: s.en.split(' (')[0] });
/** How far a street runs along its axis inside the plot (its T ends, or the plot's edges). */
const span = (s: St): [number, number] => (s.axis === 'x' ? [s.a0 ?? -X, s.a1 ?? X] : [s.a0 ?? -N, s.a1 ?? Z]);

const BARE = 'flat:#8d877b', WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#bdb9b0';
const PAVE = 'tile:#c8c3b8', PLAZA = 'tile:#d9d4c8', WALK = 'tile:#c4b49a', LAWN = 'flat:#6d8a48', SHOPPAVE = 'tile:#cfc4b0';
const SL = 5.2;
/** How far the streets run on east past the plot. */
const EAST_RUN = 300;
/** The cycle lanes on the bridge's footways, painted on its leaves too (shiomi-extras.ts). */
const LEAF_PAINT = [{ z0: BRIDGE_LANE[0], z1: BRIDGE_LANE[1], mat: CYCLE.mat }, { z0: -BRIDGE_LANE[1], z1: -BRIDGE_LANE[0], mat: CYCLE.mat }];
/** The pavilion's name board (mcenter/pavilion), for the corner café. */
const M_PAV = MCENTER.pavilion.pts.name;
/** The marina's boathouse (mcenter/boathouse), its size. */
const M_BOAT = MCENTER.boathouse;
/** The waterfront round the tip: the coach bay, the marine terrace's pools, the lookout, the west park, the boat landing's gangway (x span) and pontoon. */
const WF = {
  bay: [-278, -78, -252, -58.2] as Rect, isle: [-270, -72, -260, -64] as Rect,
  pool: [-311, -106, -290, -82] as Rect, stands: [-288, -104, -283, -84] as Rect,
  look: [-318, -119, -306, -107] as Rect, lookY: 3.2,
  park: [-282, -118, -254, -84] as Rect,
  landing: [-202.5, -197.5] as [number, number], pontoon: [-212, 58, -188, 63] as Rect,
  cafe: { x: -141.5, z: 21 },
  /** The fishing pier out into the open bay (its walk, its head), the marina off the north shore (its spine, the fingers' reach, the gangway's x span), the boathouse. */
  pier: { z: -200, x1: -360, head: [-367, -209, -360, -191] as Rect },
  marina: { spine: [-300, -306, -240, -303] as Rect, reach: -316, gang: [-271, -267] as [number, number] },
  boathouse: { x: -285 },
  /** The shopping street's lanes: north to the coach road (x), south down the market's east end. */
  lanesN: [-170, -215], laneS: -158.5,
};

export const SHIOMI_NAMES = {
  aquarium: { ja: '川湊水族館', en: 'Kawaminato Aquarium' },
  market: { ja: '潮見ハーバーマーケット', en: 'Shiomi Harbour Market' },
  plaza: { ja: '潮見駅前広場', en: 'Shiomi Station Plaza' },
  bus: { ja: '潮見駅バスターミナル', en: 'Shiomi Station Bus Terminal' },
  green: { ja: '潮見海浜緑道', en: 'Shiomi Seaside Greenway' },
  square: { ja: '水族館前広場', en: 'Aquarium Square' },
  coach: { ja: '水族館北通', en: 'Suizokukan-kita-dōri' },
  bay: { ja: '潮見ベイ', en: 'Shiomi Bay' },
  // (Web-checked 2026-11-25: カフェ 潮だまり and 潮見ベイ西公園 not in use; ミナモカフェ is real, so not that.)
  cafe: { ja: 'カフェ 潮だまり', en: 'Café Shiodamari' },
  westPark: { ja: '潮見ベイ西公園', en: 'Shiomi Bay West Park' },
  // (Web-checked 2026-11-25, none in use.)
  bayDrive: { ja: '潮見西岸通', en: 'Shiomi-seigan-dōri' },
  tipCross: { ja: '時計筋', en: 'Tokei-suji' },
  pier: { ja: '潮見ベイ釣り桟橋', en: 'Shiomi Bay Fishing Pier' },
  marina: { ja: '潮見北岸マリーナ', en: 'Shiomi North Shore Marina' },
  // (Web-checked 2026-11-25: only Nagoya's 潮見橋 bus stop and 潮見ふ頭 found.)
  bridge: { ja: '潮見大橋', en: 'Shiomi Ōhashi' },
  northProm: { ja: '潮見北岸プロムナード', en: 'Shiomi North Shore Promenade' },
};

export function shiomiStreet(c: Ctx, wells: Rect[]) {
  const { b } = c, sta = c.station, GY = GROUND_Y;
  b.out.plot = { ...SHIOMI_PLOT, arms: SHIOMI_PLOT.arms.map((a) => [...a] as Rect) };
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);
  const CO = BL.coach;
  const corr = (s: { c: number; half: number; pave: number }): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];

  // ═════════════════════════ Ground ═════════════════════════
  const carriage: Rect[] = [];
  for (const s of SHIOMI_STREETS) {
    const [a0, a1] = span(s);
    // (Each street's carriageway reaches through the junction at its T end, to the far kerb of the street it meets.)
    const far = (end: number, other: St | undefined) => (other ? other.half : 0) * Math.sign(end - (a0 + a1) / 2);
    if (s.axis === 'x') {
      const o0 = s.a0 !== undefined ? SHIOMI_STREETS.find((t) => t.axis === 'z' && t.c === s.a0) : undefined;
      const o1 = s.a1 !== undefined ? SHIOMI_STREETS.find((t) => t.axis === 'z' && t.c === s.a1) : undefined;
      carriage.push([a0 + far(a0, o0), s.c - s.half, a1 + far(a1, o1), s.c + s.half]);
    } else {
      const o0 = s.a0 !== undefined ? SHIOMI_STREETS.find((t) => t.axis === 'x' && t.c === s.a0) : undefined;
      const o1 = s.a1 !== undefined ? SHIOMI_STREETS.find((t) => t.axis === 'x' && t.c === s.a1) : undefined;
      carriage.push([s.c - s.half, a0 + far(a0, o0), s.c + s.half, a1 + far(a1, o1)]);
    }
  }
  // Through the tip: the shopping street on to the square, the coach road to the aquarium's bay.
  carriage.push([BL.square[1], -SHOP.half, -X, SHOP.half]);
  carriage.push([CO.x0, CO.c - CO.half, MIS.c, CO.c + CO.half]);
  // The coaches' bay at the aquarium's north door, round an island.
  carriage.push([WF.bay[0], WF.bay[1], WF.bay[2], WF.bay[3]]);
  // The tip's new roads: the north shore drive on west, the bay drive down the open bay, 岬北通 on west, 時計筋.
  const BD = BL.bayDrive, TC = BL.tipCross;
  carriage.push([BD.c - BD.half, SD.c - SD.half, -X, SD.c + SD.half]);
  carriage.push([BD.c - BD.half, SD.c - SD.half, BD.c + BD.half, MKN.c + MKN.half]);
  carriage.push([BD.c - BD.half, MKN.c - MKN.half, -X, MKN.c + MKN.half]);
  carriage.push([TC.c - TC.half, SD.c + SD.half, TC.c + TC.half, -SHOP.half]);
  carriage.push([BD.c + BD.half, NAG.c - NAG.half, -X, NAG.c + NAG.half]);
  const TL = BL.tipLane, TW = BL.tipCut;
  carriage.push([TL.c - TL.half, SD.c + SD.half, TL.c + TL.half, MKN.c - MKN.half]);
  carriage.push([BD.c + BD.half, TW.c - TW.half, MIS.c - MIS.half, TW.c + TW.half]);
  // The tip's streets outside the street table, named as places (so the plan's checks see their ground as used).
  for (const [x0, z0, x1, z1, ja, en] of [
    [BD.c - BD.half - BD.pave, SD.c - SD.half, BD.c + BD.half + BD.pave, MKN.c + MKN.half, SHIOMI_NAMES.bayDrive.ja, SHIOMI_NAMES.bayDrive.en],
    [BD.c + BD.half, SD.c - SD.half, -X, SD.c + SD.half + SD.pave, SD.ja, short(SD).en],
    [BD.c + BD.half, MKN.c - MKN.half - MKN.pave, MIS.c - MIS.half, MKN.c + MKN.half + MKN.pave, MKN.ja, MKN.en],
    [BD.c + BD.half, NAG.c - NAG.half - NAG.pave, MIS.c - MIS.half, NAG.c + NAG.half + NAG.pave, NAG.ja, NAG.en],
    [BD.c + BD.half, TW.c - TW.half, MIS.c - MIS.half, TW.c + TW.half, '西岬通', 'Nishi-misaki-dōri'],
    [TL.c - TL.half, SD.c + SD.half, TL.c + TL.half, MKN.c - MKN.half, '灯台小路', 'Tōdai-kōji'],
    [TC.c - TC.half - TC.pave, SD.c + SD.half, TC.c + TC.half + TC.pave, -SHOP.half, SHIOMI_NAMES.tipCross.ja, SHIOMI_NAMES.tipCross.en],
    [CO.x0, CO.c - CO.half - CO.pave, MIS.c - MIS.half, CO.c + CO.half + CO.pave, SHIOMI_NAMES.coach.ja, SHIOMI_NAMES.coach.en],
  ] as [number, number, number, number, string, string][]) b.zone('street', x0, -0.3, z0, x1, 8, z1, ja, en, true);
  for (const [x0, z0, x1, z1] of [[-X, -N, X, Z], [AX0, AZ0, -X, Z]] as Rect[]) {
    const inside = (r: Rect) => r[0] < x1 && r[2] > x0 && r[1] < z1 && r[3] > z0;
    b.slab('asphalt', x0, z0, x1, z1, -0.6, 0, wells.filter(inside));
    b.slab(BARE, x0, z0, x1, z1, 0, GY, [...wells, ...carriage].filter(inside));
  }
  const holes = [...wells, ...carriage];
  const pave = (x0: number, z0: number, x1: number, z1: number, mat = PAVE) => b.slab(mat, x0, z0, x1, z1, GY + 0.002, GY + 0.014, holes, false);
  // Pavements: each street's, clipped at the streets it meets (the corners are paved by both).
  const misE = MIS.c + MIS.half + MIS.pave, misW = MIS.c - MIS.half - MIS.pave;
  pave(misE, BL.bayN, X, BAY.c - BAY.half);
  pave(misE, BAY.c + BAY.half, X, BL.bayS);
  const sdS = SD.c + SD.half, sdLine = sdS + SD.pave;
  pave(misW, sdS, MIS.c - MIS.half, URA.c + URA.half);
  pave(MIS.c + MIS.half, sdS, misE, URA.c - URA.half);
  for (const s2 of [SHI, ECR]) for (const k of [-1, 1]) pave(Math.min(s2.c + k * s2.half, s2.c + k * (s2.half + s2.pave)), sdS, Math.max(s2.c + k * s2.half, s2.c + k * (s2.half + s2.pave)), URA.c - URA.half);
  // The north shore drive's land-side pavement, the bay drive's, 岬北通's and 時計筋's.
  pave(BD.c + BD.half, sdS, X, sdLine);
  pave(BD.c + BD.half, sdS, BD.c + BD.half + BD.pave, MKN.c - MKN.half);
  pave(BD.c + BD.half, MKN.c - MKN.half - MKN.pave, misW, MKN.c - MKN.half);
  pave(BD.c - BD.half, MKN.c + MKN.half, misW, MKN.c + MKN.half + MKN.pave);
  for (const k of [-1, 1]) pave(Math.min(TC.c + k * TC.half, TC.c + k * (TC.half + TC.pave)), sdS, Math.max(TC.c + k * TC.half, TC.c + k * (TC.half + TC.pave)), BL.shopN);
  pave(BD.c + BD.half, NAG.c - NAG.half - NAG.pave, X, NAG.c - NAG.half);
  pave(BD.c + BD.half, NAG.c + NAG.half, X, NAG.c + NAG.half + NAG.pave);
  // The small streets' pavements (2 m each side).
  {
    const TL = BL.tipLane, TW = BL.tipCut;
    for (const s2 of [HANPU, HAM]) for (const k of [-1, 1]) pave(Math.min(s2.c + k * s2.half, s2.c + k * (s2.half + s2.pave)), sdS, Math.max(s2.c + k * s2.half, s2.c + k * (s2.half + s2.pave)), BAY.c - BAY.half);
    for (const k of [-1, 1]) pave(misE, Math.min(KITA.c + k * KITA.half, KITA.c + k * (KITA.half + KITA.pave)), X, Math.max(KITA.c + k * KITA.half, KITA.c + k * (KITA.half + KITA.pave)));
    for (const k of [-1, 1]) pave(Math.min(TL.c + k * TL.half, TL.c + k * (TL.half + TL.pave)), sdS, Math.max(TL.c + k * TL.half, TL.c + k * (TL.half + TL.pave)), MKN.c - MKN.half);
    for (const k of [-1, 1]) pave(BD.c + BD.half, Math.min(TW.c + k * TW.half, TW.c + k * (TW.half + TW.pave)), MIS.c - MIS.half, Math.max(TW.c + k * TW.half, TW.c + k * (TW.half + TW.pave)));
  }
  // The promenades on the north sea wall and the open bay's (north of the marine terrace).
  pave(AX0, -N, X, BL.northProm, WALK);
  pave(AX0, BL.northProm, BL.westProm, MKN.c + MKN.half, WALK);
  pave(misE, BL.nakaN, X, NAKA.c - NAKA.half);
  pave(misE, NAKA.c + NAKA.half, X, BL.nakaS);
  pave(BL.square[1], BL.shopN, misW, -SHOP.half, SHOPPAVE);
  pave(BL.square[1], SHOP.half, misW, BL.shopS, SHOPPAVE);
  pave(CO.x0, CO.c - CO.half - CO.pave, misW, CO.c - CO.half);
  pave(CO.x0, CO.c + CO.half, misW, CO.c + CO.half + CO.pave);
  // The station plaza, the strips along the cutting (people only), the east hall's forecourt.
  pave(misE, BL.bayS, S.cut.x0 + 14, URA.c - URA.half, PLAZA);
  pave(S.head.x1, BL.bayS, SHI.c - SHI.half - SHI.pave, -S.cut.z, PLAZA);
  pave(S.head.x1, S.cut.z, SHI.c - SHI.half - SHI.pave, URA.c - URA.half, PLAZA);
  pave(SHI.c + SHI.half + SHI.pave, BL.bayS, X, URA.c - URA.half, BARE);
  // The aquarium's square and the walk round the tip.
  pave(BL.square[0], -30, BL.square[1], 20, PLAZA);
  pave(AX0, SITE.aquarium.z0, SITE.aquarium.line - SITE.aquarium.depth, Z, WALK);
  pave(SITE.aquarium.line - SITE.aquarium.depth, SITE.aquarium.z1, misW, Z, WALK);
  // The greenway: a planted strip from the lane, the promenade along the sea wall.
  b.slab(LAWN, misW, BL.green, X, BL.prom, GY + 0.002, GY + 0.02, holes, false);
  pave(misW, BL.prom, X, Z, WALK);
  pave(misW, URA.c + URA.half, X, BL.green, PAVE);

  // The sea walls: a granite coping and a railing, along the river mouth and the open bay.
  const quay = (x0: number, z0: number, x1: number, z1: number) => {
    b.box(STONE, x0, -2.6, z0, x1, GY + 0.08, z1);
    b.block(x0, GY, z0, x1, GY + 1.1, z1);
    b.deco('metal:#5f6b74', x0, GY + 1.02, z0, x1, GY + 1.1, z1);
    b.deco('metal:#5f6b74', x0, GY + 0.5, z0, x1, GY + 0.56, z1);
    const alongX = x1 - x0 > z1 - z0;
    for (let u = alongX ? x0 + 1 : z0 + 1; u < (alongX ? x1 : z1); u += 2.5) {
      if (alongX) b.deco('metal:#5f6b74', u - 0.03, GY, z0 + 0.25, u + 0.03, GY + 1.02, z0 + 0.31);
      else b.deco('metal:#5f6b74', x0 + 0.25, GY, u - 0.03, x0 + 0.31, GY + 1.02, u + 0.03);
    }
  };
  // (Open for the market's boat landing: its gangway goes down to the pontoon there.)
  quay(AX0, Z - 0.6, WF.landing[0], Z);
  quay(WF.landing[1], Z - 0.6, BRG.c - BRG.half - BRG.pave, Z);
  quay(BRG.c + BRG.half + BRG.pave, Z - 0.6, X, Z);
  // The open bay's wall, open where the fishing pier leaves it; the north shore's, open for the marina's gangway.
  quay(AX0, AZ0, AX0 + 0.6, WF.pier.z - 2);
  quay(AX0, WF.pier.z + 2, AX0 + 0.6, Z - 0.6);
  quay(AX0 + 0.6, -N, WF.marina.gang[0], -N + 0.6);
  quay(WF.marina.gang[1], -N, X, -N + 0.6);
  b.zone('street', AX0, -0.3, -N, X, 40, Z, `${sta.nameJa}駅周辺`, `${sta.nameRomaji} — around the station`);
  // Plot edges: walls only where no street runs on (the walked part ends at the last junction or low rail inside).
  b.block(X, -1, -N, X + 1, 60, Z + 1);
  b.out.district = { radius: 420, old: [0, -120], oldRadius: 0, towers: 0 };

  // ═════════════════════════ Paint ═════════════════════════
  const xs: { c: number; half: number; pave: number }[] = [MIS, HK, HAM, SHI, ECR, TC, BD, HANPU, BL.tipLane];
  const zs: { c: number; half: number; pave: number }[] = [BAY, NAKA, KITA, SHOP, URA, { c: CO.c, half: CO.half, pave: CO.pave }, SD, MKN, NAG, BL.tipCut];
  const boxX = xs.map((s) => corr(s)).map(([p, q]): [number, number] => [p - 5, q + 5]);
  const boxZ = zs.map((s) => corr(s)).map(([p, q]): [number, number] => [p - 5, q + 5]);
  const dash = (axis: 'x' | 'z', cc: number, a: number, e: number, box: [number, number][], mat = WHITE) => {
    for (let u = a; u < e - 3; u += 6) {
      if (!clearOf(u + 1.5, box)) continue;
      if (axis === 'x') b.deco(mat, u, 0.004, cc - 0.07, u + 3, 0.01, cc + 0.07);
      else b.deco(mat, cc - 0.07, 0.004, u, cc + 0.07, 0.01, u + 3);
    }
  };
  const line = (axis: 'x' | 'z', cc: number, a: number, e: number, box: [number, number][], mat = WHITE, w = 0.06) => {
    let from = a;
    for (const [p, q] of [...box.filter(([p, q]) => q > a && p < e).sort((u, v) => u[0] - v[0]), [e, e] as [number, number]]) {
      if (p - from > 1) {
        if (axis === 'x') b.deco(mat, from, 0.004, cc - w, Math.min(p, e), 0.01, cc + w);
        else b.deco(mat, cc - w, 0.004, from, cc + w, 0.01, Math.min(p, e));
      }
      from = Math.max(from, q);
    }
  };
  // The main road: two 3.5 m lanes each way, a yellow centre line, edge lines.
  line('x', BAY.c, MIS.c, EAST_RUN, boxX, YELLOW, 0.08);
  for (const k of [-1, 1]) {
    dash('x', BAY.c + k * 3.5, MIS.c, EAST_RUN, boxX);
    line('x', BAY.c + k * (BAY.half - 0.5), MIS.c + MIS.half, EAST_RUN, boxX);
  }
  // Two-lane streets: a white centre line, edge lines; the small streets and the lane: side lines only.
  for (const s of [MIS, SHI, ECR]) {
    line('z', s.c, sdS, URA.c - URA.half, boxZ, WHITE, 0.07);
    for (const k of [-1, 1]) line('z', s.c + k * (s.half - 0.4), sdS, URA.c - URA.half, boxZ);
  }
  // The drives and the tip's streets: a white centre line, edge lines.
  line('x', SD.c, BD.c + BD.half, EAST_RUN, boxX, WHITE, 0.07);
  line('z', BD.c, sdS, MKN.c - MKN.half, boxZ, WHITE, 0.07);
  line('x', MKN.c, BD.c + BD.half, MIS.c - MIS.half, boxX, WHITE, 0.07);
  line('z', TC.c, sdS, -SHOP.half, boxZ, WHITE, 0.07);
  dash('x', NAG.c, BD.c + BD.half, EAST_RUN, boxX);
  for (const k of [-1, 1]) {
    line('x', SD.c + k * (SD.half - 0.4), BD.c + BD.half, EAST_RUN, boxX);
    line('z', BD.c + k * (BD.half - 0.4), sdS, MKN.c - MKN.half, boxZ);
    line('x', MKN.c + k * (MKN.half - 0.4), BD.c + BD.half, MIS.c - MIS.half, boxX);
    line('z', TC.c + k * (TC.half - 0.4), sdS, -SHOP.half, boxZ);
    line('x', NAG.c + k * (NAG.half - 0.4), BD.c + BD.half, EAST_RUN, boxX);
  }
  for (const s of [NAKA]) {
    dash('x', s.c, MIS.c, EAST_RUN, boxX);
    for (const k of [-1, 1]) line('x', s.c + k * (s.half - 0.4), MIS.c + MIS.half, EAST_RUN, boxX);
  }
  for (const k of [-1, 1]) {
    line('x', KITA.c + k * (KITA.half - 0.3), MIS.c + MIS.half, EAST_RUN, boxX);
    line('x', URA.c + k * (URA.half - 0.3), MIS.c + MIS.half, EAST_RUN, boxX);
    for (const s of [HAM, HANPU]) line('z', s.c + k * (s.half - 0.3), sdS, BAY.c - BAY.half, boxZ);
    line('z', TL.c + k * (TL.half - 0.3), sdS, MKN.c - MKN.half, boxZ);
    line('x', TW.c + k * (TW.half - 0.3), BD.c + BD.half, MIS.c - MIS.half, boxX);
    line('x', SHOP.c + k * (SHOP.half - 0.4), BL.square[1], MIS.c - MIS.half, boxX);
    line('x', CO.c + k * (CO.half - 0.4), CO.x0, MIS.c - MIS.half, boxX);
  }
  dash('x', SHOP.c, BL.square[1], MIS.c - MIS.half, boxX);
  line('x', CO.c, CO.x0 + 6, MIS.c - MIS.half, boxX, WHITE, 0.07);
  // The one-way lane: arrows east.
  for (let x = MIS.c + 20; x < X; x += 40) mark(b, 'ahead', x, URA.c, [1, 0], 1.4, 4);

  // ═════════════════════════ Junctions ═════════════════════════
  const inPlot = (x: number, z: number) => (x > -X + 0.5 && x < X - 0.5 && z > -N + 0.6 && z < Z - 0.5) || (x > AX0 + 0.5 && x < -X && z > AZ0 + 0.6 && z < Z);
  type Arms = { n?: boolean; s?: boolean; e?: boolean; w?: boolean };
  /**
   * A junction of a north–south street (centre cx, half hx) with an east–west one (cz, hz), with the arms it has.
   * Signalled: zebras on every arm, pedestrian heads, a stop line and a vehicle head for each way in. Not signalled:
   * zebras on the arms given, a stop line, 止まれ and the stop sign on the minor street's ways in (`stop`).
   */
  const junction = (cx: number, hx: number, cz: number, hz: number, arms: Arms, name: Named, signal: boolean, stop: ('n' | 's' | 'e' | 'w')[] = [], zebra: Arms = arms) => {
    for (const sz of [-1, 1] as const) {
      if (!(sz < 0 ? zebra.n : zebra.s)) continue;
      const zc = cz + sz * (hz + 2.6);
      crosswalk(b, cx, zc, 2 * hx - 0.4, 4, false);
      if (signal) for (const sx of [-1, 1] as const) pedSignal(b, cx + sx * (hx + 0.8), zc + sz * 2.4, [-sx, 0], 0, { flat: true, speaker: true });
    }
    for (const sx of [-1, 1] as const) {
      if (!(sx < 0 ? zebra.w : zebra.e)) continue;
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 4, true);
      if (signal) for (const sz of [-1, 1] as const) pedSignal(b, xc + sx * 2.4, cz + sz * (hz + 0.8), [0, -sz], 1, { flat: true, speaker: true });
    }
    // Ways in along x: heading +x comes from the west arm (keeps to the north half), heading −x from the east.
    for (const sx of [1, -1] as const) {
      if (!(sx > 0 ? arms.w : arms.e)) continue;
      const lz = -sx, xs0 = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs0, xs0 - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs0, xs0 - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      if (signal) vehicleSignal(b, cx + sx * (hx + 1.9), cz + lz * (hz + 1.5), [sx, 0], hz > 6 ? 6.5 : 3.5, 0, name, { style: 'new', back: false });
      else if (stop.includes(sx > 0 ? 'w' : 'e')) {
        mark(b, 'stop', xs0 - sx * 2.6, cz + (lz * hz) / 2, [sx, 0], Math.min(2.6, hz - 0.4), 2.2);
        roadSign(b, 'stop', xs0 - sx * 0.8, cz + lz * (hz + 0.5), [-sx, 0], 0.6);
      }
    }
    // Ways in along z: heading +z from the north arm (keeps to the east half), heading −z from the south.
    for (const sz of [1, -1] as const) {
      if (!(sz > 0 ? arms.n : arms.s)) continue;
      const lx = sz, zs0 = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs0, zs0 - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs0, zs0 - sz * 0.35));
      if (signal) vehicleSignal(b, cx + lx * (hx + 1.6), cz + sz * (hz + 2.0), [0, sz], hx > 6 ? 6.5 : 3.5, 1, name, { style: 'new', back: !!(arms.n && arms.s) });
      else if (stop.includes(sz > 0 ? 'n' : 's')) {
        mark(b, 'stop', cx + (lx * hx) / 2, zs0 - sz * 2.6, [0, sz], Math.min(2.6, hx - 0.4), 2.2);
        roadSign(b, 'stop', cx + lx * (hx + 0.5), zs0 - sz * 0.8, [0, -sz], 0.6);
      }
    }
    if (signal) {
      const [gx, gz] = [cx - hx - 2.4, arms.n ? cz - hz - 3.4 : cz + hz + 2.2];
      if (inPlot(gx, gz)) {
        roadModel(b, 'sigbox', gx, GY, gz, [0, 1]);
        b.block(gx - 0.36, GY, gz - 0.26, gx + 0.36, GY + 1.56, gz + 0.26);
      }
    }
  };
  const J = {
    ekimae: { ja: '潮見駅前', en: 'Shiomi-ekimae' },
    eki_e: { ja: '潮見駅東', en: 'Shiomi-eki-higashi' },
    misNaka: { ja: '岬筋中通', en: 'Misaki-suji-nakadōri' },
    shiNaka: { ja: '汐入筋中通', en: 'Shioiri-suji-nakadōri' },
    suizoku: { ja: '水族館通り口', en: 'Suizokukan-dōri-guchi' },
    misHoku: { ja: '岬筋北岸', en: 'Misaki-suji-hokugan' },
    shiHoku: { ja: '汐入筋北岸', en: 'Shioiri-suji-hokugan' },
    higashi: { ja: '潮見東', en: 'Shiomi-higashi' },
    hkHoku: { ja: '浜風筋北岸', en: 'Hamakaze-suji-hokugan' },
    hkNagisa: { ja: '浜風筋なぎさ', en: 'Hamakaze-suji-nagisa' },
    hkNaka: { ja: '浜風筋潮見中通', en: 'Hamakaze-suji-Shiomi-nakadōri' },
    ekiW: { ja: '潮見駅西', en: 'Shiomi-eki-nishi' },
    misNagisa: { ja: '岬筋なぎさ', en: 'Misaki-suji-nagisa' },
    shiNagisa: { ja: '汐入筋なぎさ', en: 'Shioiri-suji-nagisa' },
    none: { ja: '', en: '' },
  };
  // Signalled: the main road's two junctions, the back street's two, the shopping street's mouth.
  junction(MIS.c, MIS.half, BAY.c, BAY.half, { n: true, s: true, e: true }, J.ekimae, true);
  junction(SHI.c, SHI.half, BAY.c, BAY.half, { n: true, s: true, e: true, w: true }, J.eki_e, true);
  junction(MIS.c, MIS.half, NAKA.c, NAKA.half, { n: true, s: true, e: true }, J.misNaka, true);
  junction(SHI.c, SHI.half, NAKA.c, NAKA.half, { n: true, s: true, e: true, w: true }, J.shiNaka, true);
  junction(MIS.c, MIS.half, SHOP.c, SHOP.half, { n: true, s: true, w: true }, J.suizoku, true, [], { n: true, s: true, w: true });
  // Not signalled: stops on the minor street.
  junction(MIS.c, MIS.half, KITA.c, KITA.half, { n: true, s: true, e: true }, J.none, false, ['e'], { e: true });
  junction(SHI.c, SHI.half, KITA.c, KITA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['e', 'w'], { e: true, w: true });
  junction(MIS.c, MIS.half, CO.c, CO.half, { n: true, s: true, w: true }, J.none, false, ['w'], { w: true });
  junction(SHI.c, SHI.half, URA.c, URA.half, { n: true, e: true, w: true }, J.none, false, ['n'], { n: true });
  // The north shore drive's: signals at the two 筋, stops on the 小路 and 潮見東筋.
  junction(MIS.c, MIS.half, SD.c, SD.half, { s: true, e: true, w: true }, J.misHoku, true);
  junction(SHI.c, SHI.half, SD.c, SD.half, { s: true, e: true, w: true }, J.shiHoku, true);
  for (const s of [HAM, ECR, HANPU]) junction(s.c, s.half, SD.c, SD.half, { s: true, e: true, w: true }, J.none, false, ['s'], { s: true });
  // 帆布小路: stops on it at the back street and なぎさ通, both ways at 潮見北通, a T at the main road.
  junction(HANPU.c, HANPU.half, NAG.c, NAG.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's'], { n: true, s: true });
  junction(HANPU.c, HANPU.half, KITA.c, KITA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's']);
  junction(HANPU.c, HANPU.half, NAKA.c, NAKA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's'], { n: true, s: true });
  junction(HANPU.c, HANPU.half, BAY.c, BAY.half, { n: true, e: true, w: true }, J.none, false, ['n'], { n: true });
  // The tip's 灯台小路 and 西岬通.
  junction(TL.c, TL.half, SD.c, SD.half, { s: true, e: true, w: true }, J.none, false, ['s'], { s: true });
  junction(TL.c, TL.half, NAG.c, NAG.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's']);
  junction(TL.c, TL.half, TW.c, TW.half, { n: true, s: true, e: true, w: true }, J.none, false, ['e', 'w']);
  junction(TL.c, TL.half, MKN.c, MKN.half, { n: true, e: true, w: true }, J.none, false, ['n'], { n: true });
  junction(TC.c, TC.half, TW.c, TW.half, { n: true, s: true, e: true, w: true }, J.none, false, ['e', 'w'], { e: true, w: true });
  junction(MIS.c, MIS.half, TW.c, TW.half, { n: true, s: true, w: true }, J.none, false, ['w'], { w: true });
  // 潮見東筋: signals at the main road, stops elsewhere.
  junction(ECR.c, ECR.half, BAY.c, BAY.half, { n: true, s: true, e: true, w: true }, J.higashi, true);
  junction(ECR.c, ECR.half, NAKA.c, NAKA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's'], { n: true, s: true });
  junction(ECR.c, ECR.half, KITA.c, KITA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['e', 'w'], { e: true, w: true });
  junction(ECR.c, ECR.half, URA.c, URA.half, { n: true, e: true, w: true }, J.none, false, ['n'], { n: true });
  // The tip: 岬北通 at 岬筋, 時計筋 at 岬北通, the coach road and the shopping street.
  junction(MIS.c, MIS.half, MKN.c, MKN.half, { n: true, s: true, w: true }, J.none, false, ['w'], { w: true });
  junction(TC.c, TC.half, MKN.c, MKN.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's'], { n: true, s: true });
  junction(TC.c, TC.half, SD.c, SD.half, { s: true, e: true, w: true }, J.none, false, ['s'], { s: true });
  junction(TC.c, TC.half, NAG.c, NAG.half, { n: true, s: true, e: true, w: true }, J.none, false, ['e', 'w'], { e: true, w: true });
  // 潮見なぎさ通 across the north blocks: signals at the two 筋, stops at the 小路 and 潮見東筋; a corner at the bay drive.
  junction(MIS.c, MIS.half, NAG.c, NAG.half, { n: true, s: true, e: true, w: true }, J.misNagisa, true);
  junction(SHI.c, SHI.half, NAG.c, NAG.half, { n: true, s: true, e: true, w: true }, J.shiNagisa, true);
  for (const s of [HAM, ECR]) junction(s.c, s.half, NAG.c, NAG.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's'], { n: true, s: true });
  // 浜風筋, the avenue from the bridge: signals at the shore drive, なぎさ通, the back street and the main road; stops on the
  // small street and on the lane.
  junction(HK.c, HK.half, SD.c, SD.half, { s: true, e: true, w: true }, J.hkHoku, true);
  junction(HK.c, HK.half, NAG.c, NAG.half, { n: true, s: true, e: true, w: true }, J.hkNagisa, true);
  junction(HK.c, HK.half, KITA.c, KITA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['e', 'w'], { e: true, w: true });
  junction(HK.c, HK.half, NAKA.c, NAKA.half, { n: true, s: true, e: true, w: true }, J.hkNaka, true);
  junction(HK.c, HK.half, BAY.c, BAY.half, { n: true, s: true, e: true, w: true }, J.ekiW, true);
  junction(HK.c, HK.half, URA.c, URA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['w'], { e: true, w: true });
  junction(TC.c, TC.half, CO.c, CO.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's'], { n: true, s: true, e: true, w: true });
  junction(TC.c, TC.half, SHOP.c, SHOP.half, { n: true, e: true, w: true }, J.none, false, ['n'], { n: true, e: true, w: true });
  for (const s of [HAM]) {
    junction(s.c, s.half, BAY.c, BAY.half, { n: true, e: true, w: true }, J.none, false, ['n'], { n: true });
    junction(s.c, s.half, NAKA.c, NAKA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's'], { n: true, s: true });
    junction(s.c, s.half, KITA.c, KITA.half, { n: true, s: true, e: true, w: true }, J.none, false, ['n', 's']);
  }

  // ═════════════════════════ Traffic ═════════════════════════
  type Cross = { c: number; half: number };
  const stops = (dir: 1 | -1, from: number, cross: Cross[], axis: 0 | 1, len: number): LanePart['stops'] =>
    cross.map((q) => {
      const t = (q.c - from) * dir;
      return { at: t - q.half - SL - 0.5, axis, exit: Math.min(len, t + q.half + SL) };
    }).filter((q) => q.at > 2 && q.at < len).sort((p, q) => p.at - q.at);
  const ALL_Z: Cross[] = [MIS, HK, HAM, SHI, ECR, HANPU], ALL_X: Cross[] = [BAY, NAKA, KITA, SHOP, URA, { c: CO.c, half: CO.half }, SD, MKN, NAG];
  const lane = (o: { speed: number; flow: number; use: LanePart['use'] }, x0: number, z0: number, x1: number, z1: number, more: Partial<LanePart> = {}) => {
    const alongX = Math.abs(x1 - x0) > 1, dir = Math.sign(alongX ? x1 - x0 : z1 - z0) as 1 | -1;
    trafficLane(b, x0, z0, x1, z1, {
      speed: o.speed / 3.6, flow: o.flow, use: o.use, taxi: 0.2, halts: [],
      stops: alongX ? stops(dir, x0, ALL_Z, 0, Math.abs(x1 - x0)) : stops(dir, z0, ALL_X, 1, Math.abs(z1 - z0)),
      ...more,
    });
  };
  const big = { speed: 50, flow: 0.8, use: 'all' as const }, mid = { speed: 40, flow: 0.6, use: 'general' as const }, small = { speed: 30, flow: 0.3, use: 'general' as const };
  // Traffic keeps left: eastbound on the north half, southbound on the east half.
  for (const d of [1.75, 5.25]) {
    lane(big, MIS.c + MIS.half + 1, BAY.c - d, X, BAY.c - d, { closed: ['from'] });
    lane(big, X, BAY.c + d, MIS.c + MIS.half + 1, BAY.c + d, { dead: true, closed: ['to'] });
  }
  for (const s of [MIS, SHI, ECR]) {
    lane(mid, s.c + 1.6, SD.c + SD.half + 0.5, s.c + 1.6, URA.c - URA.half - 0.5, { dead: true, closed: ['from', 'to'] });
    lane(mid, s.c - 1.6, URA.c - URA.half - 0.5, s.c - 1.6, SD.c + SD.half + 0.5, { dead: true, closed: ['from', 'to'] });
  }
  // The north shore drive: from 岬筋 east past the plot.
  lane(mid, MIS.c + MIS.half + 1, SD.c - 1.6, X, SD.c - 1.6, { closed: ['from'] });
  lane(mid, X, SD.c + 1.6, MIS.c + MIS.half + 1, SD.c + 1.6, { dead: true, closed: ['to'] });
  lane(mid, MIS.c + MIS.half + 1, NAKA.c - 1.5, X, NAKA.c - 1.5, { closed: ['from'] });
  lane(mid, X, NAKA.c + 1.5, MIS.c + MIS.half + 1, NAKA.c + 1.5, { dead: true, closed: ['to'] });
  lane({ ...small, use: 'minor' }, MIS.c + MIS.half + 1, URA.c, X, URA.c, { closed: ['from'] });
  // (The shopping street ends at the aquarium's square, with no way on: no through traffic is drawn on it.)

  // ═════════════════════════ Lamps, trees, boards ═════════════════════════
  const carrX = xs.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const carrZ = zs.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const lampAt = (a0: number, a1: number, cor: [number, number][], step = 18) => {
    const out: number[] = [];
    for (let u = a0 + step / 2; u < a1 - 1; u += step) {
      const hit = cor.find(([p, q]) => u > p - 3.8 && u < q + 3.8);
      out.push(hit ? (u - hit[0] < hit[1] - u ? hit[0] - 3.9 : hit[1] + 3.9) : u);
    }
    return out;
  };
  // The main road: LED lamps both sides, pines in the pavements between them.
  lampAt(MIS.c, X, carrX, 22).forEach((x) => {
    for (const k of [-1, 1]) streetLamp(b, 'lamp_led', x, BAY.c + k * (BAY.half + 0.7), [0, -k]);
  });
  for (let x = MIS.c + 16; x < X - 4; x += 11) {
    if (!clearOf(x, xs.map(corr), 4)) continue;
    for (const k of [-1, 1]) modelTree(b, 'pine', x, BAY.c + k * (BAY.half + 2.6), 'b', GY, true);
  }
  // The two 筋, the back street, the small streets and the lane.
  for (const s of [MIS, SHI, ECR]) lampAt(sdS, URA.c - URA.half, carrZ, 19).forEach((z, k) => streetLamp(b, 'lamp_led', s.c + (k % 2 ? 1 : -1) * (s.half + 0.6), z, [k % 2 ? -1 : 1, 0]));
  lampAt(MIS.c, X, carrX, 22).forEach((x, k) => streetLamp(b, 'lamp_small', x, NAKA.c + (k % 2 ? 1 : -1) * (NAKA.half + 0.45), [0, k % 2 ? -1 : 1]));
  lampAt(MIS.c, X, carrX, 22).forEach((x) => streetLamp(b, 'lamp_small', x, KITA.c - KITA.half - 0.5, [0, 1]));
  for (const s of [HAM, HANPU]) lampAt(sdS, BAY.c - BAY.half, carrZ, 22).forEach((z) => streetLamp(b, 'lamp_small', s.c - s.half - 0.5, z, [1, 0]));
  lampAt(MIS.c, X, carrX, 22).forEach((x) => streetLamp(b, 'lamp_small', x, URA.c - URA.half - 0.4, [0, 1]));
  for (let x = MIS.c - 12; x > -X; x -= 14) for (const k of [-1, 1]) streetLamp(b, 'lamp_shop', x, SHOP.c + k * (SHOP.half + 0.4), [0, -k]);
  for (let x = -X - 8; x > BL.square[1]; x -= 14) for (const k of [-1, 1]) streetLamp(b, 'lamp_shop', x, SHOP.c + k * (SHOP.half + 0.4), [0, -k]);
  for (let x = MIS.c - 14; x > CO.x0 + 4; x -= 22) for (const k of [-1, 1]) streetLamp(b, 'lamp_led', x, CO.c + k * (CO.half + 0.6), [0, -k]);
  // Ginkgos on the 筋, dogwoods on the back street.
  for (const s of [MIS, SHI]) for (let z = sdLine + 8; z < URA.c - 10; z += 12) {
    if (!clearOf(z, zs.map(corr), 5)) continue;
    if (s === MIS && z > BL.bayS) continue;
    for (const k of [-1, 1]) modelTree(b, 'ginkgo', s.c + k * (s.half + 1.4), z, 'b', GY, true);
  }
  for (let x = MIS.c + 12; x < X - 4; x += 14) if (clearOf(x, xs.map(corr), 4)) modelTree(b, 'dogwood', x, NAKA.c + NAKA.half + 0.9, 'b', GY, true);
  // Road names at the corners.
  roadName(b, misE + 1.5, BL.bayN + 0.5, [0, 1], short(BAY));
  roadName(b, SHI.c - SHI.half - SHI.pave - 1.5, BL.bayS - 0.5, [0, -1], short(BAY));
  roadName(b, misE - 0.5, BL.bayN - 6, [1, 0], short(MIS));
  roadName(b, SHI.c + SHI.half + SHI.pave - 0.5, BL.bayN - 6, [-1, 0], short(SHI));
  roadName(b, misE + 1.5, BL.nakaN + 0.4, [0, 1], short(NAKA));
  roadName(b, misW + 0.5, BL.shopN - 0.4, [0, -1], short(SHOP));
  roadName(b, misW + 0.5, CO.c - CO.half - CO.pave + 0.4, [0, 1], SHIOMI_NAMES.coach);
  for (const s of [HAM, HANPU]) roadName(b, s.c + s.half + 0.6, BL.bayN - 1, [0, 1], short(s));
  // The tip's small streets: lamps, names.
  lampAt(sdS, MKN.c - MKN.half, carrZ, 22).forEach((z) => streetLamp(b, 'lamp_small', TL.c - TL.half - 0.4, z, [1, 0]));
  lampAt(BD.c, MIS.c, carrX, 22).forEach((x) => streetLamp(b, 'lamp_small', x, TW.c - TW.half - 0.4, [0, 1]));
  roadName(b, TL.c + TL.half + 0.6, MKN.c - MKN.half - MKN.pave - 1, [0, 1], { ja: '灯台小路', en: 'Tōdai-kōji' });
  roadName(b, MIS.c - MIS.half - MIS.pave - 1, TW.c - TW.half - 0.6, [1, 0], { ja: '西岬通', en: 'Nishi-misaki-dōri' });
  roadName(b, misE + 1.5, KITA.c - KITA.half - 0.4, [0, 1], short(KITA));
  roadSign(b, 'speed40', misE + 0.6, BAY.c - BAY.half - 3, [0, 1], 0.6);
  roadSign(b, 'noentry', X - 2, URA.c - URA.half - 0.4, [1, 0], 0.6);

  // ═════════════════════════ The station plaza and the strips along the cutting ═════════════════════════
  // Camphor trees round the plaza's edges, benches between, the way to the aquarium marked down the middle.
  for (const [x, z] of [[-124, -13], [-124, 12], [-112, -13], [-112, 12], [-100, -15.5], [-100, 14.5]] as [number, number][]) {
    b.box('flat:#b9b4a8', x - 1.6, GY, z - 1.6, x + 1.6, GY + 0.45, z + 1.6);
    b.deco('flat:#4a3b2c', x - 1.45, GY + 0.45, z - 1.45, x + 1.45, GY + 0.47, z + 1.45);
    modelTree(b, 'camphor', x, z, 'b', GY + 0.45);
  }
  for (let x = -126; x < -94; x += 1.2) b.deco('tile:#e7dfcd', x, GY + 0.015, -1.2, x + 0.6, GY + 0.02, 1.2);
  roadModel(b, 'fingerpost', -127.5, GY, -4.5, [-1, 0]);
  b.block(-127.65, GY, -4.65, -127.35, GY + 3, -4.35);
  for (const z of [-7.5, 7.5]) {
    roadModel(b, 'bench_s', -106, GY, z, [0, z < 0 ? 1 : -1]);
    b.block(-107, GY, z - 0.35, -105, GY + 0.5, z + 0.35);
  }
  for (const [x, z, f] of [[-120, -16, [0, 1]], [-120, 15.6, [0, -1]]] as [number, number, [number, number]][]) streetLamp(b, 'lamp_park', x, z, f);
  b.zone('street', misE, -0.3, BL.bayS, S.head.x0 - S.head.bow, 10, URA.c - URA.half, SHIOMI_NAMES.plaza.ja, SHIOMI_NAMES.plaza.en);
  // The strips along the cutting: a row of street trees and the bicycle racks (the bicycles are the fill's).
  for (const k of [-1, 1]) {
    const zc = k < 0 ? (BL.bayS - S.cut.z - 0.4) / 2 : (URA.c - URA.half + S.cut.z + 0.4) / 2;
    for (let x = S.head.x1 + 6; x < S.canopy.x1 - 2; x += 12) {
      if (x > BRG.c - 15 && x < BRG.c + 15) continue;
      if (k < 0 && x > S.deck.land[0] - 13 && x < S.deck.land[1] + 4) continue;
      modelTree(b, 'tokaede', x, zc + k * 1.6, 'b', GY, true);
    }
    for (let x = S.canopy.x0 + 6; x < S.canopy.x1 - 4; x += 24) {
      roadModel(b, 'bikerack', x, GY, zc - k * 1.2, [0, k]);
      b.block(x - 1.25, GY, zc - k * 1.2 - 0.3, x + 1.25, GY + 0.9, zc - k * 1.2 + 0.3);
    }
    b.zone('street', S.head.x1, -0.3, k < 0 ? BL.bayS : S.cut.z, SHI.c - SHI.half - SHI.pave, 10, k < 0 ? -S.cut.z : URA.c - URA.half,
      k < 0 ? '潮見駅 北側歩道' : '潮見駅 南側歩道', k < 0 ? 'Shiomi Station, north walk' : 'Shiomi Station, south walk');
  }

  // The east hall's forecourt on 汐入筋: a bicycle park.
  {
    const fx0 = S.east.x1 + 0.4, fx1 = SHI.c - SHI.half - SHI.pave - 0.4;
    for (let z = -S.east.z + 1.5; z < S.east.z - 1; z += 3.2) {
      roadModel(b, 'bikerack', (fx0 + fx1) / 2, GY, z, [1, 0]);
      b.block((fx0 + fx1) / 2 - 0.3, GY, z - 1.25, (fx0 + fx1) / 2 + 0.3, GY + 0.9, z + 1.25);
    }
    b.zone('street', S.east.x1, -0.3, -S.east.z, SHI.c - SHI.half - SHI.pave, 8, S.east.z, '潮見駅 東口駐輪場', 'Shiomi Station east bicycle park', true);
  }

  // ═════════════════════════ The bus terminal ═════════════════════════
  // An island of four covered stands in the middle, the bus road round it in from the main road; the taxi rank on
  // the island's Misaki-suji side.
  {
    const T = SITE.bus, ix0 = T.x0 + 8, ix1 = T.x1 - 8, iz0 = T.z0 + 9, iz1 = T.z1 - 8;
    b.deco('asphalt', T.x0, GY - 0.13, T.z0, T.x1, GY + 0.004, T.z1);
    b.box('flat:#cfc9bd', ix0, GY, iz0, ix1, GY + 0.17, iz1);
    b.deco(PAVE, ix0 + 0.15, GY + 0.17, iz0 + 0.15, ix1 - 0.15, GY + 0.185, iz1 - 0.15);
    const dests = ['水族館・ハーバーマーケット Aquarium & Market', '川湊駅・北大通 Kawaminato Sta.', 'みなとセンター Minato Center', '夕凪浜・市内循環 Yūnagihama Loop'];
    [iz0 + 7, iz0 + 19, iz0 + 31].slice(0, 3).forEach((z, i) => {
      for (const [x, f] of [[ix0 + 1.6, [-1, 0]], [ix1 - 1.6, [1, 0]]] as [number, [number, number]][]) {
        roadModel(b, 'shelter', x, GY + 0.17, z, f);
        for (const pz of [z - 1.9, z + 1.9]) b.block(x - 0.1, GY, pz - 0.1, x + 0.1, GY + 2.6, pz + 0.1);
        roadModel(b, 'busstop', x + f[0] * 1.2, GY + 0.17, z + 3.2, f);
        b.block(x + f[0] * 1.2 - 0.15, GY, z + 3.05, x + f[0] * 1.2 + 0.15, GY + 2.6, z + 3.35);
        const n = i * 2 + (f[0] > 0 ? 2 : 1);
        b.sign({ k: 'label', text: `${n}番のりば`, sub: dests[(n - 1) % 4], fg: '#ffffff', bg: '#1f5fae' }, x + f[0] * 1.2 + f[0] * 0.12, GY + 2.35, z + 3.2, f, 0.6, 0.5);
      }
    });
    for (let z = iz0 + 2; z < iz1 - 1; z += 12) for (const x of [ix0 + 0.6, ix1 - 0.6]) streetLamp(b, 'lamp_led', x, z, [x < (ix0 + ix1) / 2 ? -1 : 1, 0]);
    // Arrows round the bus road, a way in and out at the main road.
    for (const [x, z, h] of [[T.x0 + 3.5, T.z1 - 4, [0, -1]], [T.x0 + 3.5, T.z0 + 12, [0, -1]], [(ix0 + ix1) / 2, T.z0 + 4, [1, 0]], [T.x1 - 3.5, T.z0 + 12, [0, 1]], [T.x1 - 3.5, T.z1 - 6, [0, 1]]] as [number, number, [number, number]][]) mark(b, 'ahead', x, z, h, 1.4, 4);
    for (const [x, z] of [[T.x0 + 1.5, T.z1 - 0.6], [T.x1 - 1.5, T.z1 - 0.6]] as [number, number][]) b.deco(YELLOW, x - 0.06, 0.004, z - 0.06, x + 0.06, 0.01, z + 0.06);
    b.box('flat:#b7bcc2', T.x0, GY, T.z0, T.x1, GY + 0.9, T.z0 + 0.15);
    b.box('flat:#b7bcc2', T.x1 - 0.15, GY, T.z0, T.x1, GY + 0.9, T.z1 - 8);
    b.sign({ k: 'label', text: SHIOMI_NAMES.bus.ja, sub: SHIOMI_NAMES.bus.en, fg: '#ffffff', bg: '#1f5fae' }, (ix0 + ix1) / 2, GY + 2.8, iz1 + 0.05, [0, 1], 4.6, 0.6);
    b.box('flat:#8d949b', (ix0 + ix1) / 2 - 0.08, GY, iz1 - 0.1, (ix0 + ix1) / 2 + 0.08, GY + 3.2, iz1);
    // The taxi rank on Misaki-suji's side of the island.
    for (const z of [iz1 - 3, iz1 - 8.5]) {
      roadModel(b, 'taxi', ix0 - 1.5, GY, z, [0, -1]);
      b.block(ix0 - 2.35, GY, z - 2.3, ix0 - 0.65, GY + 1.55, z + 2.3);
    }
    b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111111', bg: '#ffd100' }, ix0 + 0.2, GY + 2.3, iz1 - 0.6, [-1, 0], 1.6, 0.45);
    // A bus waiting at stands 1 and 2.
    for (const [x, f] of [[ix0 - 2.2, [0, -1]], [ix1 + 2.2, [0, 1]]] as [number, [number, number]][]) {
      roadModel(b, 'bus', x, GY, iz0 + 8, f);
      b.block(x - 1.3, GY, iz0 + 2.6, x + 1.3, GY + 3.2, iz0 + 13.4);
    }
    b.zone('street', T.x0, -0.3, T.z0, T.x1, 10, T.z1, SHIOMI_NAMES.bus.ja, SHIOMI_NAMES.bus.en);
  }

  // ═════════════════════════ The greenway ═════════════════════════
  // (Hamakaze-suji crosses the greenway to the bridge: nothing stands in its way.)
  const onAvenue = (x: number, m = 2) => x > BRG.c - BRG.half - BRG.pave - m && x < BRG.c + BRG.half + BRG.pave + m;
  for (let x = misW + 8; x < X - 3; x += 13) {
    if (!onAvenue(x)) modelTree(b, (Math.round(x / 13) % 3 ? 'pine' : 'cherry') as TreeKind, x, BL.green + 5 + ((Math.abs(Math.round(x)) % 3) - 1) * 2, 'b');
    if (x + 6 < X - 2 && !onAvenue(x + 6)) modelTree(b, 'camphor', x + 6, BL.prom - 6, 'b');
    if (!onAvenue(x + 3, 0.5)) streetLamp(b, 'lamp_park', x + 3, BL.prom + 0.6, [0, 1]);
  }
  for (let x = misW + 12; x < X - 8; x += 24) {
    if (onAvenue(x)) continue;
    roadModel(b, 'bench_s', x, GY, Z - 2.2, [0, -1]);
    b.block(x - 1, GY, Z - 2.55, x + 1, GY + 0.5, Z - 1.85);
  }
  b.zone('street', misW, -0.3, BL.green, X, 10, Z, SHIOMI_NAMES.green.ja, SHIOMI_NAMES.green.en);
  // Along the tip: the promenade on round the market's back and the aquarium to the open bay.
  for (let x = SITE.aquarium.line - SITE.aquarium.depth + 10; x < misW - 4; x += 20) streetLamp(b, 'lamp_park', x, Z - 1.8, [0, -1]);
  for (let z = AZ0 + 10; z < Z - 4; z += 20) streetLamp(b, 'lamp_park', AX0 + 1.8, z, [1, 0]);
  b.zone('street', AX0, -0.3, SITE.aquarium.z0, SITE.aquarium.line - SITE.aquarium.depth, 10, Z, '潮見ベイ 西岸プロムナード', 'Shiomi Bay west promenade');
  b.zone('street', SITE.aquarium.line - SITE.aquarium.depth, -0.3, SITE.aquarium.z1, misW, 10, Z, '潮見ベイ 南岸プロムナード', 'Shiomi Bay south promenade');
  b.zone('street', BL.square[0], -0.3, -30, BL.square[1], 10, 20, SHIOMI_NAMES.square.ja, SHIOMI_NAMES.square.en);
  for (const [x, z] of [[-248, -24], [-248, 14], [-232, -24], [-232, 14]] as [number, number][]) streetLamp(b, 'lamp_park', x, z, [1, 0]);

  // ═════════════════════════ The landmarks ═════════════════════════
  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (pt: AnchorPt, content: Parameters<typeof b.sign>[0]) => b.sign(content, pt[0], pt[1] + GY, pt[2], [pt[5], pt[6]], pt[3], pt[4]);
  // 川湊水族館 at the tip, facing its square (and, down the shopping street, the station's doors).
  {
    const A = SITE.aquarium, zc = (A.z0 + A.z1) / 2;
    at('e', A.line, zc, () => {
      b.model('shiomi', 'aquarium', 0, GY, 0, 1);
      signAt(SA.aquarium.pts.name, { k: 'label', text: SHIOMI_NAMES.aquarium.ja, sub: SHIOMI_NAMES.aquarium.en, fg: '#ffffff', bg: '#1f5f8f' });
      signAt(SA.aquarium.pts.cafe, { k: 'label', text: '水族館カフェ うみのまど', sub: 'Aquarium Café — Umi-no-mado', fg: '#ffffff', bg: '#1b2f4f' });
    });
    b.block(A.line - A.depth, GY, A.z0, A.line - 6, GY + 14, A.z1);
    // The glass drum's round foot, out to the frontage, and the canopy's posts on the square.
    b.block(A.line - 6, GY, zc - 12, A.line + 1, GY + 24, zc + 12);
    for (const dz of [-10, 10]) b.block(A.line + 7.3, GY, zc + dz - 0.15, A.line + 7.7, GY + 6, zc + dz + 0.15);
  }
  // The harbour market hall on the shopping street's south side.
  {
    const M = SITE.market, xc = (M.x0 + M.x1) / 2;
    at('n', xc, BL.shopS, () => {
      b.model('shiomi', 'market', 0, GY, 0, 1);
      signAt(SA.market.pts.name, { k: 'label', text: SHIOMI_NAMES.market.ja, sub: SHIOMI_NAMES.market.en, fg: '#f4efe2', bg: '#3b2a22' });
    });
    b.block(M.x0, GY, BL.shopS, M.x1, GY + 13, BL.shopS + M.depth);
  }

  // ═════════════════════════ The waterfront round the tip ═════════════════════════
  // A café table under a parasol, two chairs (the parasol's colour from the place it belongs to).
  const table = (x: number, z: number, col: string) => {
    b.deco('metal:#5f6b74', x - 0.04, GY, z - 0.04, x + 0.04, GY + 2.3, z + 0.04);
    b.box('wood:#9c7b58', x - 0.45, GY + 0.72, z - 0.45, x + 0.45, GY + 0.76, z + 0.45);
    for (const s of [-1, 1]) {
      b.deco('flat:#3d4a55', x + s * 0.75 - 0.2, GY + 0.42, z - 0.2, x + s * 0.75 + 0.2, GY + 0.46, z + 0.2);
      b.deco('flat:#3d4a55', x + s * 0.95 - 0.02, GY + 0.46, z - 0.2, x + s * 0.95 + 0.02, GY + 0.86, z + 0.2);
    }
    b.mesh(col, 'cone', x, GY + 2.45, z, 2.6, 0.6, 2.6);
    b.block(x - 1.0, GY, z - 0.5, x + 1.0, GY + 0.8, z + 0.5);
  };
  const SEA = -1.2;
  let wseed = 40;
  // ── The coaches' bay at the aquarium's north door ──
  {
    const [ix0, iz0, ix1, iz1] = WF.isle;
    b.box('flat:#cfc9bd', ix0, 0, iz0, ix1, GY + 0.02, iz1);
    b.deco(LAWN, ix0 + 0.3, GY + 0.02, iz0 + 0.3, ix1 - 0.3, GY + 0.04, iz1 - 0.3);
    modelTree(b, 'camphor', (ix0 + ix1) / 2, (iz0 + iz1) / 2, 'b', GY + 0.04);
    for (const [x, z, h] of [[-265, -75.5, [-1, 0]], [-275.5, -68, [0, 1]], [-265, -60.5, [1, 0]]] as [number, number, [number, number]][]) mark(b, 'ahead', x, z, h, 1.4, 4);
    roadModel(b, 'busstop', WF.bay[0] + 8, GY, WF.bay[3] + 0.6, [0, -1]);
    b.block(WF.bay[0] + 7.85, GY, WF.bay[3] + 0.45, WF.bay[0] + 8.15, GY + 2.6, WF.bay[3] + 0.75);
    b.sign({ k: 'label', text: '観光バスのりば', sub: 'Coaches — Kawaminato Aquarium', fg: '#ffffff', bg: '#1f5fae' }, WF.bay[0] + 8, GY + 2.25, WF.bay[3] + 0.48, [0, -1], 0.6, 0.5);
    roadModel(b, 'bus_c', -266, GY, WF.bay[1] + 2.2, [1, 0]);
    b.block(-271.25, GY, WF.bay[1] + 0.9, -260.75, GY + 3.2, WF.bay[1] + 3.5);
    b.zone('street', WF.bay[0], -0.3, WF.bay[1], WF.bay[2], 10, WF.bay[3], '水族館 観光バスのりば', 'Aquarium coach bay');
  }
  // ── 水族館マリンテラス: the aquarium's outdoor pool on the bay, its seals and penguins, the stands ──
  {
    const [px0, pz0, px1, pz1] = WF.pool, top = GY + 1.0;
    b.slab(PLAZA, AX0 + 0.6, MKN.c + MKN.half + MKN.pave, WF.park[0], SITE.aquarium.z0, GY + 0.002, GY + 0.014, [WF.pool, WF.look], false);
    // The tank: a white rim and clear sides, the water a little below the rim, rocks and the beach the animals use.
    for (const [x0, z0, x1, z1] of [[px0, pz0, px1, pz0 + 0.4], [px0, pz1 - 0.4, px1, pz1], [px0, pz0, px0 + 0.4, pz1], [px1 - 0.4, pz0, px1, pz1]] as Rect[]) {
      b.box('flat:#f2f0ea', x0, GY, z0, x1, top, z1);
      b.block(x0, GY, z0, x1, top + 0.1, z1);
    }
    for (const [x0, z0, x1, z1] of [[px0 - 0.08, pz0, px0, pz1], [px1, pz0, px1 + 0.08, pz1], [px0, pz0 - 0.08, px1, pz0], [px0, pz1, px1, pz1 + 0.08]] as Rect[]) {
      b.deco('glass', x0, top, z0, x1, top + 1.1, z1);
      b.deco('metal:#b0b5ba', x0 - 0.02, top + 1.05, z0 - 0.02, x1 + 0.02, top + 1.12, z1 + 0.02);
      b.block(x0, top, z0, x1, top + 1.1, z1);
    }
    b.box('flat:#2c6f86', px0 + 0.4, GY, pz0 + 0.4, px1 - 0.4, top - 0.35, pz1 - 0.4);
    b.deco('water', px0 + 0.4, top - 0.35, pz0 + 0.4, px1 - 0.4, top - 0.33, pz1 - 0.4);
    for (const [x, z, w, h] of [[-306, -98, 5, 2.2], [-301, -95, 3.5, 1.6], [-296, -101, 4, 1.8], [-307, -88, 4.5, 2.0]] as [number, number, number, number][]) b.mesh('flat:#8a8479', 'sphere', x, top - 0.4, z, w, h, w * 0.8);
    b.box('flat:#d9cfb5', px1 - 6, top - 0.35, pz0 + 0.4, px1 - 0.4, top - 0.1, pz0 + 7);
    // Seals on the rocks and the beach (sleek grey), penguins in a huddle (black backs, white fronts).
    for (const [x, y, z] of [[-306, top + 0.65, -98], [-301, top + 0.35, -95], [-293, top - 0.05, -102.5], [-305.5, top + 0.5, -88]] as [number, number, number][]) {
      b.mesh('flat:#5d6266', 'sphere', x, y, z, 1.6, 0.55, 0.6);
      b.mesh('flat:#5d6266', 'sphere', x + 0.75, y + 0.18, z, 0.42, 0.42, 0.4);
    }
    for (let k = 0; k < 9; k++) {
      const x = px1 - 5 + (k % 3) * 0.7, z = pz0 + 2 + Math.floor(k / 3) * 0.8;
      b.mesh('flat:#1d1f22', 'cone', x, top - 0.1 + 0.3, z, 0.36, 0.6, 0.32);
      b.mesh('flat:#f4f2ec', 'sphere', x + 0.1, top - 0.1 + 0.28, z, 0.2, 0.4, 0.22);
      b.mesh('flat:#1d1f22', 'sphere', x, top - 0.1 + 0.68, z, 0.2, 0.2, 0.2);
    }
    // The stands: three steps of seats facing the pool.
    const [sx0, sz0, sx1, sz1] = WF.stands;
    for (let k = 0; k < 3; k++) {
      const x0 = sx0 + k * 1.6;
      b.box(k % 2 ? 'wood:#a07d5a' : 'wood:#8f6f50', x0, GY, sz0, sx1, GY + 0.45 * (k + 1), sz1);
    }
    b.sign({ k: 'label', text: '水族館マリンテラス', sub: 'Aquarium Marine Terrace — seals and penguins', fg: '#ffffff', bg: '#1f5f8f' }, sx1 + 0.05, GY + 2.2, (sz0 + sz1) / 2, [1, 0], 3.2, 0.6);
    b.box('flat:#8d949b', sx1 + 0.01, GY, (sz0 + sz1) / 2 - 1.7, sx1 + 0.1, GY + 2.6, (sz0 + sz1) / 2 - 1.6);
    b.zone('street', AX0, -0.3, MKN.c + MKN.half + MKN.pave, WF.park[0], 10, SITE.aquarium.z0, '水族館マリンテラス', 'Aquarium Marine Terrace');
  }
  // ── The lookout on the tip's corner: a timber deck up a flight, telescopes over the bay ──
  {
    const [lx0, lz0, lx1, lz1] = WF.look, ly = GY + WF.lookY;
    b.box('wood:#9c7b58', lx0, ly - 0.3, lz0, lx1, ly, lz1);
    for (const [x, z] of [[lx0 + 0.4, lz0 + 0.4], [lx1 - 0.4, lz0 + 0.4], [lx0 + 0.4, lz1 - 0.4], [lx1 - 0.4, lz1 - 0.4], [(lx0 + lx1) / 2, (lz0 + lz1) / 2]] as [number, number][]) {
      b.box('flat:#5d6266', x - 0.2, GY, z - 0.2, x + 0.2, ly - 0.3, z + 0.2);
    }
    const sRun = Math.round(WF.lookY * 1.7 * 100) / 100, sz0 = lz1 - 2.6, sz1 = lz1 - 0.2;
    b.with({ rot: 2, t: [lx1 + sRun, 0, 0] }, () => stairs(b, { x0: 0, x1: sRun, z0: -sz1, z1: -sz0, yLow: GY, yHigh: ly, mat: 'wood:#8f6f50' }));
    rail(b, lx0, lz0 - 0.08, lx1, lz0, ly);
    rail(b, lx0 - 0.08, lz0, lx0, lz1, ly);
    rail(b, lx0, lz1, lx1, lz1 + 0.08, ly);
    rail(b, lx1, lz0, lx1 + 0.08, sz0, ly);
    for (const [x, z, f] of [[lx0 + 0.8, lz0 + 2.5, 'w'], [lx0 + 0.8, lz0 + 6.5, 'w'], [lx0 + 4, lz0 + 0.8, 'n']] as [number, number, Face][]) {
      at(f, x, z, () => b.model('mcenter', 'scope', 0, ly, 0, ++wseed));
      b.block(x - 0.3, ly, z - 0.3, x + 0.3, ly + 1.5, z + 0.3);
    }
    b.zone('street', lx0, ly - 0.3, lz0, lx1, ly + 4, lz1, '潮見ベイ西公園 展望デッキ', 'Shiomi Bay West Park lookout deck');
  }
  // ── 潮見ベイ西公園: lawns and trees between the pool and the coach bay, paths, benches ──
  {
    const [kx0, kz0, kx1, kz1] = WF.park;
    b.slab(LAWN, kx0, kz0, kx1, kz1, GY + 0.002, GY + 0.02, [], false);
    b.slab(WALK, kx0, (kz0 + kz1) / 2 - 1.5, kx1, (kz0 + kz1) / 2 + 1.5, GY + 0.02, GY + 0.026, [], false);
    b.slab(WALK, (kx0 + kx1) / 2 - 1.5, kz0, (kx0 + kx1) / 2 + 1.5, kz1, GY + 0.02, GY + 0.026, [], false);
    for (const [x, z, k] of [[-278, -114, 'pine'], [-270, -112, 'cherry'], [-260, -114, 'pine'], [-277, -92, 'camphor'], [-259, -90, 'cherry'], [-276, -104, 'cherry'], [-258, -106, 'camphor']] as [number, number, TreeKind][]) modelTree(b, k, x, z, 'b');
    for (const [x, z, f] of [[-272, -99, [0, 1]], [-264, -103, [0, -1]]] as [number, number, [number, number]][]) {
      roadModel(b, 'bench_s', x, GY, z, f);
      b.block(x - 1, GY, z - 0.35, x + 1, GY + 0.5, z + 0.35);
    }
    for (const [x, z] of [[-279, -100], [-257, -100], [-268, -86], [-268, -116]] as [number, number][]) streetLamp(b, 'lamp_park', x, z, [1, 0]);
    b.zone('street', kx0, -0.3, kz0, kx1, 10, kz1, '潮見ベイ西公園', 'Shiomi Bay West Park');
  }
  // ── The aquarium's sea-view café on the open bay: tables along the west walk ──
  for (let z = SITE.aquarium.z0 + 14; z < SITE.aquarium.z1 - 6; z += 6) table(AX0 + 4.2, z, 'flat:#2a9d9a');
  // ── The market hall's water side: its restaurant terrace, the boat landing and the pontoon ──
  {
    const M = SITE.market, tz = BL.shopS + M.depth + 3.5;
    for (let x = M.x0 + 4; x < M.x1 - 2; x += 5.5) table(x, tz + 2.2, ['flat:#c8102e', 'flat:#f4f2ec', 'flat:#1f5fa8'][Math.abs(Math.round(x / 5.5)) % 3]);
    for (let x = M.x0 + 1; x < M.x1 - 1; x += 8) {
      b.box('flat:#b9b4a8', x, GY, tz + 4.2, x + 1.6, GY + 0.55, tz + 4.8);
      b.deco(LAWN, x + 0.1, GY + 0.55, tz + 4.3, x + 1.5, GY + 0.58, tz + 4.7);
    }
    const [g0, g1] = WF.landing, [qx0, qz0, qx1, qz1] = WF.pontoon, ptop = SEA + 0.45;
    b.box('wood:#8a6a4a', qx0, SEA - 0.3, qz0, qx1, ptop, qz1);
    for (let x = qx0 + 1; x < qx1; x += 4) b.deco('flat:#e9e9e4', x - 0.4, ptop, qz1 - 0.2, x + 0.4, ptop + 0.15, qz1);
    b.ramp(g0, Z, g1, qz0, ptop, GY, [0, -1]);
    for (let k = 0; k < 8; k++) {
      const za = Z + ((qz0 - Z) * k) / 8, y = GY + ((ptop - GY) * (k + 0.5)) / 8;
      b.deco('wood:#8a6a4a', g0, y - 0.12, za, g1, y, za + (qz0 - Z) / 8);
    }
    for (const x of [g0 - 0.08, g1]) b.block(x, ptop, Z, x + 0.08, GY + 1.1, qz0);
    for (const x of [g0 - 0.08, g1]) b.deco('metal:#5f6b74', x, GY + 0.95, Z, x + 0.08, GY + 1.05, qz0);
    rail(b, qx0, qz1, qx1, qz1 + 0.08, ptop);
    rail(b, qx0 - 0.08, qz0, qx0, qz1, ptop);
    rail(b, qx1, qz0, qx1 + 0.08, qz1, ptop);
    for (const [x, f] of [[qx0, 'w'], [qx1, 'e']] as [number, Face][]) at(f, x, qz1 + 3, () => b.model('mcenter', 'yacht', 0, SEA - 0.55, 0, ++wseed));
    b.sign({ k: 'label', text: '潮見ハーバー桟橋', sub: 'Shiomi Harbour landing', fg: '#ffffff', bg: '#123a63' }, g0 - 0.6, GY + 1.6, Z - 0.7, [0, -1], 1.8, 0.45);
    b.box('flat:#8d949b', g0 - 0.66, GY, Z - 0.76, g0 - 0.54, GY + 1.4, Z - 0.64);
    b.zone('street', qx0, ptop - 0.3, Z, qx1, ptop + 4, qz1, '潮見ハーバー桟橋', 'Shiomi Harbour landing');
    b.zone('street', M.x0, -0.3, BL.shopS + M.depth, M.x1, 8, BL.prom + 6, `${SHIOMI_NAMES.market.ja} テラス`, `${SHIOMI_NAMES.market.en} terrace`);
  }
  // ── カフェ 潮だまり on the corner by Misaki-suji: a pavilion café facing the greenway, its garden and tables ──
  {
    const { x, z } = WF.cafe;
    at('e', x, z, () => {
      b.model('mcenter', 'pavilion', 0, GY, 0, ++wseed);
      const a = M_PAV;
      b.sign({ k: 'label', text: SHIOMI_NAMES.cafe.ja, sub: SHIOMI_NAMES.cafe.en, fg: '#1f3550', bg: '#f4efe2' }, a[0], a[1] + GY, a[2], [a[5], a[6]], a[3], a[4]);
    });
    b.block(x - 11.5, GY, z - 14, x, GY + 4.6, z + 14);
    b.slab(PLAZA, SITE.market.x1, BL.shopS, misW, SITE.aquarium.z1, GY + 0.002, GY + 0.014, [[x - 11.5, z - 14, x, z + 14]], false);
    for (const [tx, tz] of [[-155, 38.5], [-149, 38.5], [-143.5, 38.5], [-155, 4.5 + 2.2], [-147, 4.5 + 2.2]] as [number, number][]) table(tx, tz, 'flat:#e6a700');
    for (const tz of [10, 22, 33]) modelTree(b, 'tokaede', SITE.market.x1 + 3.5, tz, 'b');
    b.zone('street', SITE.market.x1, -0.3, BL.shopS, misW, 8, BL.prom, `${SHIOMI_NAMES.cafe.ja} 前庭`, `${SHIOMI_NAMES.cafe.en} garden`);
  }


  // ═════════════════════════ The new roads' lamps, trees and names ═════════════════════════
  // The north shore drive: lamps on the land side, park lamps and pines on the promenade.
  lampAt(BD.c, X, carrX, 22).forEach((x) => streetLamp(b, 'lamp_led', x, sdS + 0.6, [0, -1]));
  for (let x = AX0 + 14; x < X - 4; x += 18) {
    if (x > WF.marina.gang[0] - 3 && x < WF.marina.gang[1] + 3) continue;
    streetLamp(b, 'lamp_park', x, BL.northProm - 0.6, [0, 1]);
    modelTree(b, 'pine', x + 9, (BL.northProm - N) / 2 - 0.5 * ((Math.abs(Math.round(x)) % 3) - 1), 'b');
  }
  // The bay drive and 岬北通: lamps on the land side; 時計筋, 潮見東筋: lamps both sides in turn.
  lampAt(sdS, MKN.c - MKN.half, carrZ, 22).forEach((z) => streetLamp(b, 'lamp_led', BD.c + BD.half + 0.6, z, [-1, 0]));
  for (let z = sdS + 10; z < MKN.c - 10; z += 18) modelTree(b, 'pine', (BL.westProm + AX0) / 2, z, 'b');
  lampAt(BD.c, MIS.c, carrX, 22).forEach((x, k) => streetLamp(b, 'lamp_led', x, MKN.c + (k % 2 ? 1 : -1) * (MKN.half + 0.6), [0, k % 2 ? -1 : 1]));
  lampAt(sdS, -SHOP.half, carrZ, 18).forEach((z, k) => streetLamp(b, 'lamp_led', TC.c + (k % 2 ? 1 : -1) * (TC.half + 0.6), z, [k % 2 ? -1 : 1, 0]));
  for (let z = sdLine + 8; z < URA.c - 10; z += 12) if (clearOf(z, zs.map(corr), 5)) for (const k of [-1, 1]) modelTree(b, 'dogwood', ECR.c + k * (ECR.half + 1.4), z, 'b', GY, true);
  roadName(b, misW - 0.5, sdLine + 0.5, [0, 1], short(SD));
  roadName(b, SHI.c + SHI.half + SHI.pave + 1.5, sdLine + 0.5, [0, 1], short(SD));
  roadName(b, ECR.c + ECR.half + ECR.pave - 0.5, BL.bayN - 6, [-1, 0], short(ECR));
  roadName(b, BD.c + BD.half + BD.pave - 0.4, sdLine + 4, [-1, 0], SHIOMI_NAMES.bayDrive);
  roadName(b, misW - 0.5, MKN.c - MKN.half - MKN.pave + 0.4, [0, 1], short(MKN));
  lampAt(BD.c, X, carrX, 20).forEach((x, k) => streetLamp(b, 'lamp_small', x, NAG.c + (k % 2 ? 1 : -1) * (NAG.half + 0.5), [0, k % 2 ? -1 : 1]));
  for (let x = BD.c + 14; x < X - 4; x += 13) if (clearOf(x, xs.map(corr), 4)) modelTree(b, 'cherry', x, NAG.c - NAG.half - 1.2, 'b', GY, true);
  roadName(b, misE + 1.5, NAG.c - NAG.half - NAG.pave + 0.4, [0, 1], short(NAG));
  roadName(b, misW - 1.5, NAG.c + NAG.half + NAG.pave - 0.4, [0, -1], short(NAG));
  roadName(b, TC.c + TC.half + TC.pave - 0.4, CO.c - CO.half - CO.pave - 3, [-1, 0], SHIOMI_NAMES.tipCross);
  // (Named in lengths under 40 m, as a lane is: the walk test reaches only as far as its narrow places.)
  for (let k = 0, n = Math.ceil((X - AX0) / 36); k < n; k++) {
    const a = AX0 + ((X - AX0) * k) / n, e = AX0 + ((X - AX0) * (k + 1)) / n;
    b.zone('street', a, -0.3, -N, e, 10, BL.northProm, SHIOMI_NAMES.northProm.ja, SHIOMI_NAMES.northProm.en, true);
  }

  // ═════════════════════════ The lanes ═════════════════════════
  // The shopping street's lanes: 3 m, paved, shop lamps on brackets, open to the coach road and the promenade.
  for (const x of WF.lanesN) {
    b.slab(SHOPPAVE, x - 1.5, CO.c + CO.half + CO.pave, x + 1.5, BL.shopN, GY + 0.002, GY + 0.014, [], false);
    for (let z = BL.shopN - 8; z > CO.c + CO.half + CO.pave + 2; z -= 12) streetLamp(b, 'lamp_shop', x + (Math.round(z / 12) % 2 ? 1.2 : -1.2), z, [Math.round(z / 12) % 2 ? -1 : 1, 0]);
    b.zone('street', x - 1.5, -0.3, CO.c + CO.half + CO.pave, x + 1.5, 8, BL.shopN, `${SHOP.ja} 横丁`, `${SHOP.en} lane`, true);
  }
  for (let z = BL.shopS + 6; z < SITE.aquarium.z1 - 2; z += 12) streetLamp(b, 'lamp_shop', WF.laneS + 1.2, z, [-1, 0]);
  b.zone('street', WF.laneS - 1.5, -0.3, BL.shopS, WF.laneS + 1.5, 8, SITE.aquarium.z1, `${SHOP.ja} 南横丁`, `${SHOP.en} south lane`, true);
  // The back lane behind the main road's north blocks: 3 m, wires overhead on a pole line (its poles light it).
  {
    const [a0, a1] = span(BLN);
    lampAt(a0, a1, carrX, 16).forEach((x) => streetLamp(b, 'lamp_small', x, BLN.c - BLN.half - 0.3, [0, 1]));
    poleLine(b, { axis: 'x', from: a0 + 6, to: a1 - 6, at: BLN.c + BLN.half + 0.3, road: -1, step: 24, skip: (u) => !clearOf(u, carrX, 5), drops: 0.7, cross: 2 * BLN.half + 0.6, name: { ja: sta.nameJa, en: sta.nameRomaji } });
    for (const k of [-1, 1]) line('x', BLN.c + k * (BLN.half - 0.2), a0, a1, boxX);
    b.zone('street', a0, -0.3, BLN.c - BLN.half, a1, 8, BLN.c + BLN.half, BLN.ja, BLN.en, true);
  }

  // ═════════════════════════ The fishing pier, the marina, the boathouse ═════════════════════════
  const deckOver = (x0: number, z0: number, x1: number, z1: number) => {
    b.box('wood:#8a6a4a', x0, GY - 0.3, z0, x1, GY, z1);
    for (let x = x0 + 1; x < x1; x += 4) for (const z of [z0 + 0.4, z1 - 0.4]) b.deco('flat:#4a4540', x - 0.2, -3.5, z - 0.2, x + 0.2, GY - 0.3, z + 0.2);
  };
  const railing = (x0: number, z0: number, x1: number, z1: number, y = GY) => {
    b.block(x0, y, z0, x1, y + 1.1, z1);
    for (const [ya, yb] of [[1.02, 1.1], [0.55, 0.6]]) b.deco('paint:#3d4a55', x0, y + ya, z0, x1, y + yb, z1);
    const alongX = x1 - x0 > z1 - z0;
    for (let u = alongX ? x0 : z0; u <= (alongX ? x1 : z1) + 0.01; u += 2) {
      const [px, pz] = alongX ? [u, (z0 + z1) / 2] : [(x0 + x1) / 2, u];
      b.deco('paint:#3d4a55', px - 0.04, y, pz - 0.04, px + 0.04, y + 1.1, pz + 0.04);
    }
  };
  // 潮見ベイ釣り桟橋: a timber pier 4 m wide out 40 m into the open bay, a wider head; anglers' rods, stools, coolers.
  {
    const P = WF.pier, [hx0, hz0, hx1, hz1] = P.head;
    deckOver(P.x1, P.z - 2, AX0, P.z + 2);
    deckOver(hx0, hz0, hx1, hz1);
    railing(P.x1, P.z - 2.08, AX0, P.z - 2);
    railing(P.x1, P.z + 2, AX0, P.z + 2.08);
    railing(hx0 - 0.08, hz0, hx0, hz1);
    railing(hx0, hz0 - 0.08, hx1, hz0);
    railing(hx0, hz1, hx1, hz1 + 0.08);
    railing(hx1, hz0, hx1 + 0.08, P.z - 2);
    railing(hx1, P.z + 2, hx1 + 0.08, hz1);
    for (const [x, z, sz] of [[-364, -208.6, -1], [-366.6, -203, 0], [-366.6, -196, 0], [-362, -191.4, 1], [-345, -202.4, -1], [-336, -197.6, 1]] as [number, number, number][]) {
      const ox = sz === 0 ? -1 : 0, oz = sz;
      b.deco('flat:#2b2e33', x - 0.02, GY + 1.0, z - 0.02, x + 0.02, GY + 3.2, z + 0.02);
      b.deco('flat:#2b2e33', x + ox * 0.6 - 0.015, GY + 3.2, z + oz * 0.6 - 0.015, x + 0.015, GY + 3.25, z + 0.015);
      b.box('flat:#3d6f8f', x - ox * 0.8 - 0.25 + (sz ? 0.6 : 0), GY, z - oz * 0.8 - 0.25, x - ox * 0.8 + 0.25 + (sz ? 0.6 : 0), GY + 0.45, z - oz * 0.8 + 0.25);
      b.box('flat:#e8e4d8', x - ox * 1.4 - 0.3 + (sz ? -0.6 : 0), GY, z - oz * 1.4 - 0.2, x - ox * 1.4 + 0.3 + (sz ? -0.6 : 0), GY + 0.35, z - oz * 1.4 + 0.2);
    }
    for (const x of [-350, -334]) for (const s2 of [-1, 1]) streetLamp(b, 'lamp_park', x, P.z + s2 * 1.6, [0, -s2]);
    streetLamp(b, 'lamp_park', hx0 + 0.6, hz0 + 0.6, [1, 0]);
    streetLamp(b, 'lamp_park', hx0 + 0.6, hz1 - 0.6, [1, 0]);
    b.sign({ k: 'label', text: SHIOMI_NAMES.pier.ja, sub: `${SHIOMI_NAMES.pier.en} — fishing allowed 6:00–21:00`, fg: '#ffffff', bg: '#123a63' }, AX0 - 0.1, GY + 1.6, P.z - 2.6, [1, 0], 2.2, 0.5);
    b.box('flat:#8d949b', AX0 - 0.05, GY, P.z - 2.66, AX0 + 0.05, GY + 1.4, P.z - 2.54);
    b.zone('street', P.x1, -0.3, P.z - 2, AX0, 8, P.z + 2, SHIOMI_NAMES.pier.ja, SHIOMI_NAMES.pier.en);
    b.zone('street', hx0, -0.3, hz0, hx1, 8, hz1, `${SHIOMI_NAMES.pier.ja} 先端`, `${SHIOMI_NAMES.pier.en}, the head`);
  }
  // 潮見北岸マリーナ: a gangway down from the north promenade to a pontoon spine, fingers out north, boats between.
  {
    const M = WF.marina, [mx0, mz0, mx1, mz1] = M.spine, ptop = SEA + 0.45;
    b.box('wood:#8a6a4a', mx0, SEA - 0.3, mz0, mx1, ptop, mz1);
    const [g0, g1] = M.gang;
    b.ramp(g0, mz1, g1, -N, ptop, GY, [0, 1]);
    for (let k = 0; k < 8; k++) {
      const za = mz1 + ((-N - mz1) * k) / 8, y = ptop + ((GY - ptop) * (k + 0.5)) / 8;
      b.deco('wood:#8a6a4a', g0, y - 0.12, za, g1, y, za + (-N - mz1) / 8);
    }
    for (const x of [g0 - 0.08, g1]) {
      b.block(x, ptop, mz1, x + 0.08, GY + 1.1, -N);
      b.deco('metal:#5f6b74', x, GY + 0.95, mz1, x + 0.08, GY + 1.05, -N);
    }
    for (let x = mx0 + 2; x < mx1 - 1; x += 10) {
      b.box('wood:#8a6a4a', x - 0.6, SEA - 0.3, M.reach, x + 0.6, ptop, mz0);
      b.deco('flat:#e9e9e4', x - 0.2, ptop, M.reach, x + 0.2, ptop + 0.3, M.reach + 0.4);
      if (x + 5 < mx1) at('n', x + 5, M.reach, () => b.model('mcenter', 'yacht', 0, SEA - 0.55, 0, ++wseed));
      b.block(x - 0.6, ptop, M.reach - 0.1, x + 0.6, ptop + 1.0, M.reach);
    }
    railing(mx0, mz0 - 0.08, mx1, mz0, ptop);
    railing(mx0 - 0.08, mz0, mx0, mz1, ptop);
    railing(mx1, mz0, mx1 + 0.08, mz1, ptop);
    for (const [x0, x1] of [[mx0, g0], [g1, mx1]] as [number, number][]) railing(x0, mz1, x1, mz1 + 0.08, ptop);
    for (let x = mx0 + 7; x < mx1; x += 20) streetLamp(b, 'lamp_small', x, mz1 - 0.4, [0, -1]);
    b.sign({ k: 'label', text: SHIOMI_NAMES.marina.ja, sub: `${SHIOMI_NAMES.marina.en} — berth holders only beyond the gate`, fg: '#ffffff', bg: '#123a63' }, g1 + 0.6, GY + 1.6, -N + 0.9, [0, 1], 2.2, 0.5);
    b.box('flat:#8d949b', g1 + 0.55, GY, -N + 0.85, g1 + 0.65, GY + 1.4, -N + 0.95);
    for (const [a, e, nm] of [[mx0, (mx0 + mx1) / 2, 'west'], [(mx0 + mx1) / 2, mx1, 'east']] as [number, number, string][]) b.zone('street', a, ptop - 0.3, mz0, e, ptop + 4, -N, SHIOMI_NAMES.marina.ja, SHIOMI_NAMES.marina.en);
  }
  // The marina's boathouse across the drive, facing the water.
  {
    const x = WF.boathouse.x, a = M_BOAT;
    at('n', x, sdLine, () => b.model('mcenter', 'boathouse', 0, GY, 0, ++wseed));
    b.block(x - a.w / 2, GY, sdLine, x + a.w / 2, GY + 6, sdLine + a.d);
    b.sign({ k: 'label', text: `${SHIOMI_NAMES.marina.ja} クラブハウス`, sub: `${SHIOMI_NAMES.marina.en} boathouse`, fg: '#ffffff', bg: '#123a63' }, x, GY + 4.4, sdLine - 0.1, [0, -1], 6, 0.6);
  }


  // ═════════════════════════ 浜風筋 and 潮見大橋, the bascule bridge to Minato Center ═════════════════════════
  {
    const B = BRG, xW = B.c - B.half - B.pave, xE = B.c + B.half + B.pave, [h0, h1] = B.hinge, [g0, g1] = B.gate, sea = -1.2;
    // The avenue's pavements on land (the cutting's opening is a hole in them: its deck follows).
    pave(xW, sdS, B.c - B.half, Z);
    pave(B.c + B.half, sdS, xE, Z);
    // Its deck over the open cutting: asphalt between kerbs, the footways, a parapet each side, lights under it.
    b.box('asphalt', B.c - B.half, -0.6, -S.cut.z - 0.4, B.c + B.half, 0, S.cut.z + 0.4);
    for (const k of [-1, 1]) {
      const [a, e] = k < 0 ? [xW, B.c - B.half] : [B.c + B.half, xE];
      b.box(PAVE, a, -0.6, -S.cut.z - 0.4, e, GY, S.cut.z + 0.4);
      const px = k < 0 ? xW : xE - 0.3;
      b.box('concrete', px, GY, -S.cut.z - 0.4, px + 0.3, GY + 1.1, S.cut.z + 0.4);
      b.deco('metal:#b0b5ba', px - 0.02, GY + 1.1, -S.cut.z - 0.4, px + 0.32, GY + 1.16, S.cut.z + 0.4);
    }
    for (let x = xW + 2; x + 2.4 <= xE - 1; x += 4) for (const z of [-5, 0, 5]) ceilingLight(b, x, x + 2.4, z - 0.15, z + 0.15, -0.62);
    b.zone('street', xW, -0.3, -S.cut.z - 0.4, xE, 8, S.cut.z + 0.4, `${HK.ja} 跨線橋`, `${HK.en} over the station`);
    // The bridge: two fixed spans on steel girders and piers, the opening between them (its leaves are world-view's).
    const span = (z0: number, z1: number) => {
      b.box('asphalt', B.c - B.half, -0.6, z0, B.c + B.half, 0, z1);
      for (const [a, e] of [[xW, B.c - B.half], [B.c + B.half, xE]]) b.box(PAVE, a, -0.6, z0, e, GY, z1);
      b.deco('paint:#3d5f7a', xW + 1, -2.4, z0, xE - 1, -0.6, z1);
      for (const x of [xW, xE - 0.08]) b.deco('paint:#3d5f7a', x, -1.0, z0, x + 0.08, -0.6, z1);
    };
    span(Z, h0);
    span(h1, B.z1);
    // The opening: a floor where the leaves lie when down (people are held at the barriers while it is open).
    b.block(xW, GY - 0.4, h0, xE, GY, h1);
    for (const z of [Z + 15, Z + 30]) b.box('concrete', B.c - 9, sea - 4, z - 1.2, B.c + 9, -2.4, z + 1.2);
    for (const z of [B.z1 - 15, B.z1 - 30]) b.box('concrete', B.c - 9, sea - 4, z - 1.2, B.c + 9, -2.4, z + 1.2);
    // The bascule piers under the hinges: the counterweight pits and the machinery, granite-faced.
    b.box('flat:#a9a397', xW - 1, sea - 4, h0 - 7, xE + 1, -0.6, h0);
    b.box('flat:#a9a397', xW - 1, sea - 4, h1, xE + 1, -0.6, h1 + 7);
    for (const [z0, z1] of [[Z, h0], [h1, B.z1]] as [number, number][]) {
      railing(xW - 0.08, z0, xW, z1);
      railing(xE, z0, xE + 0.08, z1);
      for (let z = z0 + 8; z < z1 - 2; z += 20) for (const k of [-1, 1]) streetLamp(b, 'lamp_led', k < 0 ? xW + 0.5 : xE - 0.5, z, [-k, 0]);
    }
    for (const k of [-1, 1]) b.block(k < 0 ? xW - 0.08 : xE, GY, h0, k < 0 ? xW : xE + 0.08, GY + 1.1, h1);
    // The leaves (world-view.ts leafMesh): 15 m each, meeting over the middle of the channel.
    b.out.leaves = [
      { pivot: [B.c, 0, h0], along: [0, 1], len: (h1 - h0) / 2, width: xE - xW, lift: 1.15, key: B.key, paint: LEAF_PAINT },
      { pivot: [B.c, 0, h1], along: [0, -1], len: (h1 - h0) / 2, width: xE - xW, lift: 1.15, key: B.key, paint: LEAF_PAINT },
    ];
    // Barriers either side of the opening: an arm across the lanes coming in and its footway, a short one over the other
    // footway; a post with warning lamps at each; people held there while it is open.
    const arms = b.out.arms ?? (b.out.arms = []), lamps = b.out.xingLamps ?? (b.out.xingLamps = []);
    for (const [z, k] of [[g0, 1], [g1, -1]] as [number, 1 | -1][]) {
      const long = k > 0 ? xE - 0.5 : xW + 0.5, short = k > 0 ? xW + 0.5 : xE - 0.5;
      for (const [px, len] of [[long, B.half + B.pave - 0.5], [short, B.pave - 0.5]] as [number, number][]) {
        const dir: [number, number] = [px > B.c ? -1 : 1, 0];
        arms.push({ pivot: [px, GY + 1.0, z], along: dir, len, line: BASCULE_LINE, key: B.key });
        b.box('paint:#f2c200', px - 0.14, GY, z - 0.14, px + 0.14, GY + 1.2, z + 0.14);
        b.box('flat:#1c1c1e', px - 0.5, GY + 2.0, z - 0.06, px + 0.5, GY + 2.4, z + 0.06);
        for (const s2 of [-1, 1]) {
          b.deco('flat:#4a0c08', px + s2 * 0.32 - 0.13, GY + 2.07, z - k * 0.07 - 0.005, px + s2 * 0.32 + 0.13, GY + 2.33, z - k * 0.07 + 0.005);
          lamps.push({ pos: b.pt(px + s2 * 0.32, GY + 2.2, z - k * 0.1), line: BASCULE_LINE, key: B.key, left: s2 < 0 });
        }
        b.deco('paint:#1c1c1e', px - 0.05, GY + 1.2, z - 0.05, px + 0.05, GY + 2.0, z + 0.05);
      }
      (b.out.barriers ?? (b.out.barriers = [])).push({ min: [xW, GY, z - 0.4], max: [xE, GY + 2.2, z + 0.4], key: B.key });
      mark(b, 'stop', B.c + k * 3.5, z - k * 3, [0, k], 3, 2.2);
      b.deco(WHITE, B.c, 0.004, Math.min(z - k * 1.6, z - k * 1.95), B.c + k * B.half, 0.01, Math.max(z - k * 1.6, z - k * 1.95));
    }
    // The control towers on their piers, on opposite sides; the bridge's name on them and at each end.
    for (const [T, face, pz0, pz1] of [[B.towerE, 'w', B.towerE.z - 3.6, B.towerE.z + 3.6], [B.towerW, 'e', B.towerW.z - 3.6, B.towerW.z + 3.6]] as [{ x: number; z: number }, Face, number, number][]) {
      const out = face === 'w' ? 1 : -1;
      b.box('flat:#a9a397', Math.min(T.x, T.x + out * 7.4), sea - 4, pz0 - 0.2, Math.max(T.x, T.x + out * 7.4), GY, pz1 + 0.2);
      at(face, T.x, T.z, () => {
        b.model('shiomi', 'bridgetower', 0, GY, 0, 1);
        signAt(SA.bridgetower.pts.name, { k: 'label', text: SHIOMI_NAMES.bridge.ja, sub: SHIOMI_NAMES.bridge.en, fg: '#ffffff', bg: '#1b2f4f' });
      });
      b.block(Math.min(T.x, T.x + out * 7.2), GY, pz0, Math.max(T.x, T.x + out * 7.2), GY + 14, pz1);
    }
    for (const z of [Z + 1.2, B.z1 - 1.2]) b.sign({ k: 'label', text: SHIOMI_NAMES.bridge.ja, sub: SHIOMI_NAMES.bridge.en, fg: '#ffffff', bg: '#1b2f4f' }, xW + 0.02, GY + 1.6, z, [1, 0], 2.4, 0.6);
    b.zone('street', xW, -0.3, Z, xE, 8, B.z1, SHIOMI_NAMES.bridge.ja, SHIOMI_NAMES.bridge.en);
    // The avenue's paint: a yellow centre, lane lines, edge lines, on the land and across the fixed spans.
    for (const [a, e] of [[sdS, h0], [h1, B.z1]] as [number, number][]) {
      line('z', B.c, a, e, boxZ, YELLOW, 0.08);
      for (const k of [-1, 1]) {
        dash('z', B.c + k * 3.5, a, e, boxZ);
        line('z', B.c + k * (B.half - 0.5), a, e, boxZ);
      }
    }
    // Its lamps and trees on land, its names.
    lampAt(sdS, Z, carrZ, 20).forEach((z, k) => streetLamp(b, 'lamp_led', B.c + (k % 2 ? 1 : -1) * (B.half + 0.7), z, [k % 2 ? -1 : 1, 0]));
    for (let z = sdLine + 8; z < Z - 4; z += 12) {
      if (!clearOf(z, zs.map(corr), 5) || Math.abs(z) < S.cut.z + 3) continue;
      for (const k of [-1, 1]) modelTree(b, 'zelkova', B.c + k * (B.half + 2.6), z, 'b', GY, true);
    }
    roadName(b, xE - 0.5, BL.bayN - 6, [-1, 0], short(HK));
    roadName(b, xW + 0.5, NAG.c - NAG.half - NAG.pave - 6, [1, 0], short(HK));
    // Traffic: two lanes each way, handed to Minato Center's Hamakaze-suji at its plot's edge (and back), stopped at the
    // barriers while the bridge is open.
    const hkStops = (dir: 1 | -1, from: number, len: number) => stops(dir, from, [SD, NAG, KITA, NAKA, BAY, URA], 1, len);
    for (const d of [1.75, 5.25]) {
      const zs0 = sdS + 0.5, ze = B.z1 + 20;
      lane(big, B.c + d, zs0, B.c + d, ze, { closed: ['from', 'to'], hand: { station: 'minato-center', at: [B.c + d, 0, B.z1] }, stops: hkStops(1, zs0, ze - zs0), gates: [{ at: g0 - 1.5 - zs0, line: BASCULE_LINE, station: B.key }] });
      lane(big, B.c - d, ze, B.c - d, zs0, { closed: ['from'], fed: 'minato-center', dead: true, stops: hkStops(-1, ze, ze - zs0), gates: [{ at: ze - (g1 + 1.5), line: BASCULE_LINE, station: B.key }] });
    }
  }

  // ═════════════════════════ Past the edges (seen, not walked) ═════════════════════════
  const lampOut = (x: number, z: number, f: [number, number], wide: boolean) => roadModel(b, wide ? 'lamp_led' : 'lamp_small', x, GY, z, f);
  const roadOut = (axis: 'x' | 'z', cc: number, half: number, pv: number, u0: number, u1: number, centre: 'yellow' | 'dash' | 'none') => {
    const R = (mat: string, v0: number, v1: number, y0: number, y1: number) => (axis === 'x' ? b.deco(mat, u0, y0, cc + v0, u1, y1, cc + v1) : b.deco(mat, cc + v0, y0, u0, cc + v1, y1, u1));
    R('asphalt', -half, half, -0.03, 0.004);
    if (pv) for (const k of [-1, 1]) R(PAVE, Math.min(k * half, k * (half + pv)), Math.max(k * half, k * (half + pv)), -0.03, GY);
    if (centre === 'yellow') R(YELLOW, -0.08, 0.08, 0.004, 0.01);
    else if (centre === 'dash') for (let u = u0 + 2; u + 3 < u1; u += 6) (axis === 'x' ? b.deco(WHITE, u, 0.004, cc - 0.07, u + 3, 0.01, cc + 0.07) : b.deco(WHITE, cc - 0.07, 0.004, u, cc + 0.07, 0.01, u + 3));
    for (const k of [-1, 1]) R(WHITE, k * (half - 0.4) - 0.05, k * (half - 0.4) + 0.05, 0.004, 0.01);
  };
  // East, towards Nishi-Yūnagi.
  roadOut('x', BAY.c, BAY.half, BAY.pave, X, EAST_RUN, 'yellow');
  roadOut('x', NAKA.c, NAKA.half, NAKA.pave, X, EAST_RUN, 'dash');
  roadOut('x', KITA.c, KITA.half, 0, X, EAST_RUN, 'none');
  roadOut('x', URA.c, URA.half, 0, X, EAST_RUN, 'none');
  b.deco(PAVE, X, -0.03, URA.c + URA.half, EAST_RUN, GY, BL.green);
  b.deco(LAWN, X, -0.03, BL.green, EAST_RUN, GY + 0.02, BL.prom);
  b.deco(WALK, X, -0.03, BL.prom, EAST_RUN, GY, Z);
  b.deco(STONE, X, -2.6, Z - 0.6, EAST_RUN, GY + 0.08, Z);
  for (let u = X + 10; u < EAST_RUN; u += 22) {
    lampOut(u, BAY.c - BAY.half - 0.7, [0, 1], true);
    lampOut(u, BAY.c + BAY.half + 0.7, [0, -1], true);
    lampOut(u, NAKA.c - NAKA.half - 0.45, [0, 1], false);
    lampOut(u + 11, KITA.c - KITA.half - 0.4, [0, 1], false);
    lampOut(u, URA.c - URA.half - 0.4, [0, 1], false);
    for (const k of [-1, 1]) modelTree(b, 'pine', u + 5, BAY.c + k * (BAY.half + 2.6), 'b');
    modelTree(b, (Math.round(u / 22) % 2 ? 'pine' : 'cherry') as TreeKind, u + 3, BL.green + 6, 'b');
  }
  // The north shore drive on east, its promenade and wall.
  roadOut('x', SD.c, SD.half, 0, X, EAST_RUN, 'dash');
  roadOut('x', NAG.c, NAG.half, NAG.pave, X, EAST_RUN, 'dash');
  b.deco(PAVE, X, -0.03, SD.c + SD.half, EAST_RUN, GY, SD.c + SD.half + SD.pave);
  b.deco(WALK, X, -0.03, -N, EAST_RUN, GY, BL.northProm);
  b.deco(STONE, X, -2.6, -N, EAST_RUN, GY + 0.08, -N + 0.6);
  for (let x = X + 10; x < EAST_RUN; x += 22) {
    lampOut(x, SD.c + SD.half + 0.6, [0, -1], false);
    lampOut(x + 11, BL.northProm + 0.6, [0, -1], false);
  }
  // (The rows along these roads are the fill's, stage 3; the backdrop city keeps off them.)
  b.clearScenery(X, BAY.c - BAY.half - 30, EAST_RUN + 10, Z + 2);
  b.clearScenery(X, KITA.c - 30, EAST_RUN + 10, BAY.c - BAY.half);
  b.clearScenery(X, -N - 4, EAST_RUN + 10, KITA.c - 30);
}
