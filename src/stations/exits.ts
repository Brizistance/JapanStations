import { PIECES } from './pieces';
import { STACK_DY } from '../sim/geometry';
// Exits: for each station, which numbered exits it has and what is near each at street level.
//
// Derived from the station's spec (specs.ts) so that exit boards always match the street the
// surface builder actually draws. Nothing here is typed in per exit: each exit's position comes
// from the same arithmetic the composers use (build.ts, kit.ts exit(), hub.ts), and what is
// near it from what surface.ts (or buildElevated, or the hub's street) puts there.

import { LINES, linesAt, stationById } from '../data/network';
import type { LineDef, StationDef, StationId } from '../data/types';
import { SPECS, type ElevatedSpec } from './specs';
import type { BlockStyle, SurfaceSpec } from './surface';

export interface Named {
  ja: string;
  en: string;
}

/** Frame-local rectangle [x0, z0, x1, z1] (x along the primary line, z across it). */
export type PlanRect = [number, number, number, number];

export interface StationExit {
  /** Exit number as signed ('1', '2', …), or '' for an unnumbered street entrance. */
  num: string;
  /** What is near it, most notable first. May be empty. */
  near: Named[];
  /** Side of the main road it comes up on (frame −z or +z); 0 for an entrance in an end wall. */
  side: -1 | 0 | 1;
  /** Where it opens at street level, in the station frame. */
  rect: PlanRect;
}

// ── Runtime constants copied from the builders ──
// Importing kit.ts, build.ts, surface.ts or hub.ts here would make an import cycle with the
// sign code. exits.test.ts checks every exit against the built station, so a change there that
// is not mirrored here fails the test.
const GROUND_Y = 0.15; // kit.ts
const PF_H = 1.1; // kit.ts
const CONC_RISE = 4.9; // kit.ts
const EXIT_OPEN = 9.5; // kit.ts: only the top of a deep exit stair is open to the street
const STREET_CW = 12; // build.ts: where an ordinary station's exits come up
const INTERCHANGE_CW = 14; // build.ts buildInterchange, without a line beside the primary
const UNDER_MEZZ_Y = -4.2; // build.ts: B1 mezzanine under an elevated station
/**
 * atrium.ts: the transfer mezzanine's floor, and exit 5 off the harbour lobby: the doorway's
 * +x edge (where the stair starts climbing +x) and the lobby's −z wall it opens through. The
 * stair mouth runs z = wall − 4 … wall − 1.2.
 */
/** midlevel.ts (Harunodai): the ticket hall's x extent, half width and gate lines at ±g. */
export const MID = { x0: -41, x1: 41, cw: 21, g: 25 };
/** Level of a shared mid-level concourse: halfway between the two platforms. */
export const midCf = (pfUpper: number, pfLower: number) => Math.round(((pfUpper + pfLower) / 2) * 100) / 100;
/** mezzDrop: the transfer mezzanine is this far below the upper line's platforms. */
export const ATRIUM = { mezzDrop: 5.6, exit5: { door: 26, wallZ: 39.85, num: '5' } };
/** world/builder.ts DEFAULT_PLOT. */
export const PLOT = { x: 130, z: 85 };
/** surface.ts: fixed positions of the street's features (station frame, metres). */
export const STREET = {
  crossHalf: 3.5,
  aveHalf: 10,
  seaZ: 52,
  canalHalf: 7,
  arcadeHalf: 4.3,
  /** Park: x extent, and depth back from the sidewalk edge. */
  park: [-62, 22] as const,
  parkDepth: 40,
  /** Kawaminato Dome: centre x, centre distance behind the sidewalk edge, radius. */
  dome: { cx: -8, dz: 50, r: 37 },
  /** Ferry terminal on a port quay. */
  ferry: [-30, 10] as const,
};
/** build.ts buildElevated: the plaza in front of an elevated station. */
export const ELEVATED = {
  concourse: [-26, 26, 9] as const, // x0, x1, half width
  road: [26, 36] as const,
  crossSt: [68.5, 75.5] as const,
  back: [-24, -18] as const,
  bus: [-2.6, 22.4, 8.8, 24.4] as PlanRect,
  taxi: [-23, 26.6, -11, 28.2] as PlanRect,
  store: [34, 11, 52, 22] as PlanRect,
  bikes: [[-58, -30], [30, 58]] as const,
  bikeZ: [-3.2, -1.6] as const,
  apartments: [40, 58] as const,
  houses: [-64, -9.5] as const,
};
/** hub.ts: avenue half width, concourse half width, exit passages, plaza blocks. */
const HUB = { av: 11, bar: 12, exits: [76, 120], hx: 44, bldg: 112, front: -64 };

// ── What a block of each kind is called on a sign ──
export const KIND: Record<BlockStyle, Named> = {
  office: { ja: 'オフィス街', en: 'Office district' },
  mixed: { ja: '商店・オフィス街', en: 'Shops and offices' },
  neon: { ja: '飲食店街', en: 'Bars and restaurants' },
  apartment: { ja: '集合住宅', en: 'Apartments' },
  house: { ja: '住宅街', en: 'Residential area' },
  oldtown: { ja: '下町', en: 'Old town' },
  godown: { ja: '土蔵の町並み', en: 'Old storehouses' },
  warehouse: { ja: '倉庫街', en: 'Warehouses' },
  campus: { ja: '川湊大学', en: 'Kawaminato University' },
  park: { ja: '緑坂公園', en: 'Midorizaka Park' },
  sea: { ja: '港', en: 'Port' },
  dome: { ja: '川湊ドーム', en: 'Kawaminato Dome' },
};
// Names the builders put on signs in the street (surface.ts, build.ts), and plain words for
// what else is there.
export const PLACE = {
  canal: { ja: '瓢箪橋', en: 'Hyōtan-bashi' },
  arcade: { ja: '商店街', en: 'Shopping Arcade' },
  ferry: { ja: '川湊港フェリーターミナル', en: 'Kawaminato Ferry Terminal' },
  promenade: { ja: '夕凪プロムナード', en: 'Yūnagi Promenade' },
  sea: { ja: '海', en: 'Sea' },
  plaza: { ja: '駅前広場', en: 'Station plaza' },
  busTaxi: { ja: 'バス・タクシーのりば', en: 'Buses and taxis' },
  mart: { ja: 'マルホシマート', en: 'Maruhoshi Mart' },
  bikes: { ja: '駐輪場', en: 'Bicycle parking' },
} satisfies Record<string, Named>;
const { canal: DEFAULT_CANAL, arcade: DEFAULT_ARCADE, ferry: FERRY, promenade: PROMENADE, plaza: PLAZA, busTaxi: BUS_TAXI, mart: MART, bikes: BIKES } = PLACE;

/** Map fills for an open-air plan (draw.ts areaOpenAir). */
export type AreaFill = 'house' | 'apartment' | 'road' | 'plaza' | 'track' | 'green' | 'shop' | 'deck' | 'sea';
/**
 * open-air.ts: the plan of each open-air layout, shared by the builder, the exit boards and the
 * area map. Station frame (+x along the line towards Shiondai), metres.
 */
export interface OpenAirPlan {
  /** The station building or concourse. */
  box: PlanRect;
  areas: { r: PlanRect; fill: AreaFill; label?: Named }[];
  bus: [number, number];
  taxi?: [number, number];
  /** Street entrances (no exit numbers, as at the other open-air stations). */
  exits: { rect: PlanRect; side: -1 | 0 | 1; near: Named[] }[];
}
const KASUMIDANI_BUS: Named = { ja: '霞谷バスのりば', en: 'Kasumidani bus stop' };
const SHIONDAI_BUS: Named = { ja: '紫苑台バスターミナル', en: 'Shiondai Bus Terminal' };
const SHIONDAI_MALL: Named = { ja: '紫苑台タウンプラザ', en: 'Shiondai Town Plaza' };
const SHIONDAI_PARK: Named = { ja: '紫苑台中央公園', en: 'Shiondai Central Park' };
const SEASIDE_DECK: Named = { ja: '新鴎シーサイドデッキ', en: 'Shin-Kamome Seaside Deck' };
const SHIN_KAMOME_BUS: Named = { ja: '新鴎バスのりば', en: 'Shin-Kamome bus stop' };
const ASAHINO_ARCADE: Named = { ja: 'あさひの高架下商店街', en: 'Asahino Under-the-Tracks Shops' };
const ASAHINO_BUS: Named = { ja: '旭野駅前バスのりば', en: 'Asahino bus stop' };
const TAKANODAI_RIDGE: Named = { ja: '高野台団地', en: 'Takanodai Estate (ridge)' };
const TAKANODAI_VALLEY: Named = { ja: '谷戸の住宅地', en: 'Valley houses' };
const TAKANODAI_BUS: Named = { ja: '高野台団地バスのりば', en: 'Takanodai Estate bus stop' };
const IZUMI_DECK: Named = { ja: '泉ヶ丘デッキ', en: 'Izumigaoka Deck' };
const IZUMI_BUS: Named = { ja: '泉ヶ丘駅前バスターミナル', en: 'Izumigaoka Bus Terminal' };
const IZUMI_PARK: Named = { ja: '泉ヶ丘公園', en: 'Izumigaoka Park' };
const IZUMI_CENTRE: Named = { ja: '泉ヶ丘センター', en: 'Izumigaoka Centre' };
export const OPEN_AIR: Record<NonNullable<ElevatedSpec['layout']>, OpenAirPlan> = {
  // Asahino: a gate hall for each direction under the viaduct (platform 1 west, platform 2
  // east), a free passage under the tracks between them, shops in the arches beyond. The box
  // is hall B, where you arrive (the whole pair is too long for the area map's label).
  arcade: {
    box: [6, -9, 40, 9],
    areas: [
      { r: [-130, -9.2, 130, 9.2], fill: 'track' },
      { r: [-58, -8, -36, 8], fill: 'shop', label: ASAHINO_ARCADE },
      { r: [42, -8, 58, 8], fill: 'shop', label: ASAHINO_ARCADE },
      { r: [-40, 9.2, 40, 22], fill: 'plaza', label: PLACE.plaza },
      { r: [-130, 22, 130, 30], fill: 'road' },
      { r: [-130, -24, 130, -18], fill: 'road' },
      { r: [-126, 34, 124, 58], fill: 'apartment', label: KIND.mixed },
      { r: [-126, -70, 124, -28], fill: 'house', label: KIND.house },
    ],
    bus: [12, 19],
    taxi: [-16, 19],
    exits: [
      { rect: [-32, 8.85, -26, 9], side: 1, near: [PLACE.plaza, ASAHINO_BUS, ASAHINO_ARCADE] },
      { rect: [-34.15, -3, -34, 3], side: 0, near: [ASAHINO_ARCADE, KIND.house] },
      { rect: [8, 8.85, 18, 9], side: 1, near: [PLACE.plaza, ASAHINO_BUS] },
      { rect: [6, -8, 6.15, -3], side: 0, near: [KIND.house] },
    ],
  },
  // Takanodai: the ridge (−z) is level with the platforms; the station building stands on it.
  // The valley (+z) is at street level, reached by the underpass under the viaduct.
  hillside: {
    box: [-8, -22, 24, 20],
    areas: [
      { r: [-130, -8.6, 130, 8.6], fill: 'track' },
      { r: [-130, -85, 130, -8.6], fill: 'green', label: TAKANODAI_RIDGE },
      { r: [-20, -26, 40, -22], fill: 'plaza', label: PLACE.plaza },
      { r: [-130, -32, 130, -26], fill: 'road' },
      { r: [-126, -80, 124, -36], fill: 'apartment', label: TAKANODAI_RIDGE },
      { r: [-130, 24, 130, 32], fill: 'road' },
      { r: [-126, 36, 124, 80], fill: 'house', label: TAKANODAI_VALLEY },
    ],
    bus: [34, -29],
    exits: [
      { rect: [2, -22.15, 14, -22], side: -1, near: [TAKANODAI_RIDGE, TAKANODAI_BUS] },
      { rect: [1, 20, 9, 20.15], side: 1, near: [TAKANODAI_VALLEY] },
    ],
  },
  // Izumigaoka: the concourse bridges the tracks past the platforms' +x end (where the line
  // will carry on); decks on both sides step down to the bus terminal (+z) and the estate (−z).
  railhead: {
    box: [54, -14, 70, 14],
    areas: [
      { r: [-130, -9.2, 130, 9.2], fill: 'track' },
      { r: [62, 14, 68, 35], fill: 'deck', label: IZUMI_DECK },
      { r: [62, -35, 68, -14], fill: 'deck' },
      { r: [10, 36, 120, 46], fill: 'road', label: IZUMI_BUS },
      { r: [10, 48, 70, 82], fill: 'green', label: IZUMI_PARK },
      { r: [74, 48, 124, 82], fill: 'shop', label: IZUMI_CENTRE },
      { r: [-130, -44, 130, -38], fill: 'road' },
      { r: [-126, -80, 124, -48], fill: 'apartment', label: KIND.apartment },
    ],
    bus: [40, 41],
    taxi: [96, 38],
    exits: [
      { rect: [62, 14, 68, 14.15], side: 1, near: [IZUMI_DECK, IZUMI_BUS, IZUMI_PARK, IZUMI_CENTRE] },
      { rect: [62, -14.15, 68, -14], side: -1, near: [KIND.apartment] },
    ],
  },
  // Shin-Kamome: the hall is under the middle of the viaduct, the sea and its boardwalk on the
  // +z side, the towers across the road on −z. Unpaid side x < −12.
  seaside: {
    box: [-24, -8, 14, 8],
    areas: [
      { r: [-130, -8.3, 130, 8.3], fill: 'track' },
      { r: [-34, 8, 24, 18], fill: 'plaza', label: PLACE.plaza },
      { r: [-130, 18, 130, 42], fill: 'deck', label: SEASIDE_DECK },
      { r: [-130, 42, 130, 85], fill: 'sea' },
      { r: [-130, -24, 130, -16], fill: 'road' },
      { r: [-126, -80, 124, -32], fill: 'apartment', label: KIND.apartment },
    ],
    bus: [-40, -13],
    exits: [
      { rect: [-21, 7.85, -14, 8], side: 1, near: [SEASIDE_DECK, PLACE.plaza] },
      { rect: [-24, -3, -23.85, 3], side: 0, near: [KIND.apartment, SHIN_KAMOME_BUS] },
    ],
  },
  // Kasumidani: the cutting runs the whole plot; the bridge building spans it at x = 0 … 15.
  cutting: {
    box: [0, -15, 15, 15],
    areas: [
      { r: [-130, -8.1, 130, 8.1], fill: 'track' },
      { r: [-130, -12, -116, 12], fill: 'green', label: { ja: '霞谷トンネル', en: 'Kasumidani Tunnel' } },
      { r: [-6, -30, 26, -15], fill: 'plaza', label: PLACE.plaza },
      { r: [-130, -38, 130, -30], fill: 'road' },
      { r: [-130, 16, 130, 22], fill: 'road' },
      { r: [-126, -80, 124, -42], fill: 'house', label: KIND.house },
      { r: [-126, 24, 124, 80], fill: 'house', label: KIND.house },
    ],
    bus: [8, -26],
    exits: [
      { rect: [9, -15.2, 14, -15], side: -1, near: [KASUMIDANI_BUS, PLACE.plaza] },
      { rect: [9, 15, 14, 15.2], side: 1, near: [KIND.house] },
    ],
  },
  // Shiondai: the concourse is under the platform's +x end; the bus terminal and the deck to
  // the shopping centre are on the +z side.
  terminus: {
    box: [24, -8, 60, 8],
    areas: [
      { r: [-130, -8.3, 130, 8.3], fill: 'track' },
      { r: [20, 8, 60, 22], fill: 'plaza', label: PLACE.plaza },
      { r: [-130, 22, 130, 44], fill: 'road', label: SHIONDAI_BUS },
      { r: [-130, -26, 130, -18], fill: 'road' },
      { r: [-10, 50, 80, 82], fill: 'shop', label: SHIONDAI_MALL },
      { r: [-126, 50, -20, 82], fill: 'green', label: SHIONDAI_PARK },
      { r: [-126, -80, 124, -32], fill: 'apartment', label: KIND.apartment },
      { r: [26, 12, 34, 50], fill: 'deck' },
    ],
    bus: [-25, 33],
    taxi: [53, 27],
    exits: [
      { rect: [27, 7.85, 35, 8], side: 1, near: [SHIONDAI_BUS, SHIONDAI_MALL, PLACE.plaza] },
      { rect: [23.85, -3, 24, 3], side: 0, near: [KIND.apartment, SHIONDAI_PARK] },
    ],
  },
};

/** A thing at street level: its extent along the road and which side it is on (0 = both). */
interface Feature {
  n: Named;
  x0: number;
  x1: number;
  side: -1 | 0 | 1;
  /** A named or landmark place, listed before the plain blocks around an exit. */
  named: boolean;
  /** Listed only for exits within this distance (default 150 m): a building with its own entrance. */
  reach?: number;
}

/** Rail level of a line at this station. */
const railAt = (l: LineDef, id: StationId) => l.railY[l.stops.indexOf(id)];
/** Horizontal run of an exit stair from a concourse at cf (kit.ts exit()). */
const exitRun = (cf: number) => Math.round((GROUND_Y - cf) * 1.72 * 100) / 100;

/** The line a hub or interchange is reached through from its concourse (build.ts buildStation). */
function crossingLine(st: StationDef, primary: string, beside?: string): LineDef {
  return linesAt(st.id).find((l) => l.id !== primary && l.id !== beside && !st.at?.[l.id])!;
}

/** Floor level of the station's main concourse (street level for an elevated station). */
export function concourseY(id: StationId): number {
  const spec = SPECS[id], st = stationById(id);
  const pf = (l: LineDef) => railAt(l, id) + PF_H;
  switch (spec.kind) {
    // build.ts uses the first serving line; a stacked station's concourse is over its upper level.
    case 'underground': return pf(linesAt(id)[0]) + CONC_RISE + (spec.stacked ? STACK_DY : 0);
    case 'interchange':
      if (spec.mid) return midCf(pf(LINES.find((l) => l.id === spec.primary)!), pf(crossingLine(st, spec.primary)));
      return pf(LINES.find((l) => l.id === spec.primary)!) + CONC_RISE;
    case 'atrium': return pf(LINES.find((l) => l.id === spec.primary)!) + CONC_RISE;
    case 'hub': return pf(crossingLine(st, spec.primary, spec.beside)) + CONC_RISE;
    case 'elevated': return 0.2;
  }
}

/**
 * Transfer mezzanine level, if any: B1 under an elevated station with a line crossing below, or
 * the deck across an atrium between its two platform levels.
 */
export function mezzanineY(id: StationId): number | null {
  const kind = SPECS[id].kind;
  if (kind === 'atrium') return concourseY(id) - CONC_RISE - ATRIUM.mezzDrop;
  return kind === 'elevated' && linesAt(id).length > 1 ? UNDER_MEZZ_Y : null;
}

/** Half width of an interchange concourse (build.ts buildInterchange). */
function interchangeHalf(st: StationDef, primary: string): number {
  const o = crossingLine(st, primary);
  const side = linesAt(st.id).find((l) => l.id !== primary && l !== o && st.at?.[l.id]);
  if (!side) return INTERCHANGE_CW;
  // The beside line sits off the station point, square to the primary: the offset is its distance.
  const at = st.at![side.id]!;
  const z = Math.hypot(at.x - st.position.x, at.y - st.position.y);
  const wallZ = side.platformType === 'island' ? side.trackOffset + 2.2 : side.trackOffset + 1.48 + 5.2;
  return Math.ceil(z + wallZ + 0.5 + 4.3 + 1.7);
}

/**
 * Where one gate end's exits are (specs.ts `exits`). Distances run from the gate line out into
 * the unpaid hall (16 m long). Pairs are [−z wall, +z wall].
 */
export interface ExitPlan {
  /** Doorway's near edge past the gate line: 4.6 (by the gates) … 11.8 (far corner). Default 9. */
  at?: number | [number, number];
  /** Which long walls have an exit. Default both. */
  sides?: (-1 | 1)[];
  /** 'out': the stair climbs away from the station (default); 'back': back over the concourse. */
  climb?: 'out' | 'back' | ['out' | 'back', 'out' | 'back'];
}
const pick = <T>(v: T | [T, T] | undefined, s: -1 | 1, d: T): T => (v === undefined ? d : Array.isArray(v) ? v[s < 0 ? 0 : 1] : v);
export const exitAt = (p: ExitPlan | undefined, s: -1 | 1) => pick(p?.at, s, 9);
export const exitClimb = (p: ExitPlan | undefined, s: -1 | 1) => pick(p?.climb, s, 'out' as const);
export const exitSides = (p: ExitPlan | undefined): (-1 | 1)[] => p?.sides ?? [-1, 1];

/** Exit numbers for each gate end in order, −z wall before +z; '' where a wall has none. */
export function endNums(plans: (ExitPlan | undefined)[]): [string, string][] {
  let n = 1;
  return plans.map((p) => {
    const has = exitSides(p);
    const nums: [string, string] = ['', ''];
    for (const s of [-1, 1] as const) if (has.includes(s)) nums[s < 0 ? 0 : 1] = String(n++);
    return nums;
  });
}

/**
 * One gate end's exits. The gate line is at x = g, the unpaid hall on its +x side if `hi`. Each
 * doorway is at..at+4 past the gate; the stair starts at its far edge climbing away from the
 * station ('out') or at its near edge climbing back ('back'), and comes up between
 * |z| = half + 1.2 and half + 4.
 */
function endExits(g: number, hi: boolean, half: number, run: number, plan: ExitPlan | undefined, nums: [string, string]) {
  const o = hi ? 1 : -1;
  return exitSides(plan).map((s) => {
    const at = exitAt(plan, s), back = exitClimb(plan, s) === 'back';
    const start = g + o * (back ? at : at + 4), dir = back ? -o : o;
    // Where it opens: the last EXIT_OPEN m of the stair.
    const a = start + dir * Math.max(0, run - EXIT_OPEN), e = start + dir * run;
    return {
      num: nums[s < 0 ? 0 : 1],
      side: s,
      rect: [Math.min(a, e), s < 0 ? -half - 4 : half + 1.2, Math.max(a, e), s < 0 ? -half - 1.2 : half + 4] as PlanRect,
    };
  });
}

/** Both ends of an interchange-type concourse: gate lines at ±g, exits 1… from the +x end. */
function twoEnds(g: number, half: number, run: number, plans?: [ExitPlan, ExitPlan]) {
  const nums = endNums([plans?.[0], plans?.[1]]);
  return [...endExits(g, true, half, run, plans?.[0], nums[0]), ...endExits(-g, false, half, run, plans?.[1], nums[1])];
}

/** Everything on the street around an ordinary or interchange station (surface.ts). */
function streetFeatures(s: SurfaceSpec): Feature[] {
  const X = PLOT.x, out: Feature[] = [];
  for (const side of [-1, 1] as const) {
    const style = side < 0 ? s.left : s.right;
    if (style === 'park') {
      out.push({ n: s.parkName ?? KIND.park, x0: STREET.park[0], x1: STREET.park[1], side, named: true });
      // Houses either side of the park.
      out.push({ n: KIND.house, x0: -X, x1: STREET.park[0] - 2, side, named: false });
      out.push({ n: KIND.house, x0: STREET.park[1] + 2, x1: X, side, named: false });
    } else if (style === 'sea') {
      if (s.waterfront === 'promenade') out.push({ n: s.promenadeName ?? PROMENADE, x0: -X, x1: X, side, named: true });
      else {
        out.push({ n: s.quayName ?? FERRY, x0: STREET.ferry[0], x1: STREET.ferry[1], side, named: true });
        out.push({ n: KIND.sea, x0: -X, x1: X, side, named: false });
      }
    } else if (style === 'dome') {
      const { cx, r } = STREET.dome;
      out.push({ n: KIND.dome, x0: cx - r, x1: cx + r, side, named: true });
    } else out.push({ n: style === 'campus' ? s.campusName ?? KIND.campus : KIND[style], x0: -X, x1: X, side, named: style === 'campus' });
  }
  if (s.landmark) out.push({ n: { ja: s.landmark.ja, en: s.landmark.en }, x0: s.landmark.x0, x1: s.landmark.x1, side: s.landmark.side, named: true, reach: 30 });
  // The station's own pieces (pieces.ts), unless the landmark already names the lot.
  for (const k of s.pieces ?? []) {
    if (s.landmark && k.en === s.landmark.en) continue;
    out.push({ n: { ja: k.ja, en: k.en }, x0: k.x0, x1: k.x0 + PIECES[k.id].w, side: k.side, named: true, reach: 30 });
  }
  if (s.arcadeAt !== undefined) {
    const a = s.arcadeAt, h = STREET.arcadeHalf;
    out.push({ n: s.arcadeName ?? DEFAULT_ARCADE, x0: a - h, x1: a + h, side: -1, named: true });
  }
  if (s.canalAt !== undefined) {
    // The bridge carries the main road over the canal, so it is on both sides.
    const c = s.canalAt, h = STREET.canalHalf;
    out.push({ n: s.canalName ?? DEFAULT_CANAL, x0: c - h, x1: c + h, side: 0, named: true });
  }
  return out;
}

/** The hub's street: the station plaza north of Kita-Ōdōri, office blocks south (hub.ts). */
function hubFeatures(): Feature[] {
  const { hx, bldg } = HUB, X = 190;
  const n = (ja: string, en: string): Named => ({ ja, en });
  return [
    { n: n('バスのりば', 'Bus terminal'), x0: 56, x1: 176, side: -1, named: true },
    { n: n('タクシーのりば', 'Taxi rank'), x0: -176, x1: -56, side: -1, named: true },
    { n: n('川湊ステーションビル', 'Kawaminato Station Building'), x0: hx + 0.4, x1: bldg, side: -1, named: true },
    { n: n('川湊ステーションホテル', 'Kawaminato Station Hotel'), x0: -bldg, x1: -hx - 0.4, side: -1, named: true },
    { n: n('川湊駅前広場', 'Kawaminato Station Plaza'), x0: -56, x1: 56, side: -1, named: true },
    { n: n('川湊駅', 'Kawaminato Station'), x0: -hx, x1: hx, side: -1, named: true },
    // The avenue's landmarks (hub.ts LANDMARKS).
    { n: n('秋津島生命ビル', 'Akitsushima Life Building'), x0: -130.7, x1: -86.7, side: 1, named: true },
    { n: n('北大通交番', 'Kita-Ōdōri Kōban'), x0: -82, x1: -75, side: 1, named: true },
    { n: n('川湊信用金庫 本店', 'Kawaminato Shinkin Bank Head Office'), x0: -39.4, x1: -13.4, side: 1, named: true },
    { n: n('澪屋百貨店', 'Mioya Department Store'), x0: 13.3, x1: 53.3, side: 1, named: true },
    // The walk-in convenience store on the avenue (hub.ts SHOP_X0).
    { n: n('マルホシマート', 'Maruhoshi Mart'), x0: -72, x1: -48, side: 1, named: true },
    { n: KIND.office, x0: -X, x1: -13, side: 1, named: false },
    { n: KIND.office, x0: 13, x1: X, side: 1, named: false },
  ];
}

/**
 * What to list for an exit: things on its own side first, nearest first, named places ahead of
 * plain blocks; across the road counts as 45 m further. Up to three, within 150 m.
 */
function nearExit(fs: Feature[], rect: PlanRect, side: -1 | 1): Named[] {
  const [x0, , x1] = rect;
  const seen = new Set<string>();
  return fs
    .map((f, i) => {
      const gap = Math.max(0, f.x0 - x1, x0 - f.x1), across = f.side && f.side !== side ? 45 : 0;
      return { f, i, d: gap + across, key: gap + across - (f.named ? 40 : 0) };
    })
    .filter((c) => c.d <= (c.f.reach ?? 150))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map((c) => c.f.n)
    .filter((n) => !seen.has(n.ja) && !!seen.add(n.ja))
    .slice(0, 3);
}

/** The street plan a station's exits and area map are drawn from. */
export type StationStreet =
  | {
    kind: 'street';
    surface: SurfaceSpec;
    /** The concourse under the road (schematic: its true x extent, a typical width). */
    box: PlanRect;
    /** Sidewalk outer edge (surface.ts swOut). */
    swOut: number;
    exits: StationExit[];
  }
  | { kind: 'elevated'; exits: StationExit[] }
  | { kind: 'hub'; exits: StationExit[] };

const cache = new Map<StationId, StationStreet>();

export function stationStreet(id: StationId): StationStreet {
  let s = cache.get(id);
  if (!s) cache.set(id, (s = derive(id)));
  return s;
}

function derive(id: StationId): StationStreet {
  const spec = SPECS[id], st = stationById(id);
  const run = exitRun(concourseY(id));
  const withNear = (fs: Feature[], es: Omit<StationExit, 'near'>[]): StationExit[] =>
    es.map((e) => ({ ...e, near: nearExit(fs, e.rect, e.side as -1 | 1) }));
  switch (spec.kind) {
    case 'underground': {
      const [cx0, cx1] = spec.concourse;
      // Gate ends in spec order, exits numbered on through them (build.ts buildUnderground).
      const nums = endNums(spec.gates.map((_, i) => spec.exits?.[i]));
      const es = spec.gates.flatMap((g, i) =>
        endExits(g === 'hi' ? cx1 - 16 : cx0 + 16, g === 'hi', STREET_CW, run, spec.exits?.[i], nums[i]));
      // The concourse's width follows the line's age (build.ts concourseHalf); 10 m is its usual.
      const cw = spec.width ?? 10;
      return { kind: 'street', surface: spec.surface, box: [cx0, -cw, cx1, cw], swOut: STREET_CW + 5.5, exits: withNear(streetFeatures(spec.surface), es) };
    }
    case 'interchange': {
      if (spec.mid) {
        // midlevel.ts: gates at ±MID.g, exits 1–2 east, 3–4 west, from the hall's long walls.
        const es = twoEnds(MID.g, MID.cw, run, spec.exits);
        return { kind: 'street', surface: spec.surface, box: [MID.x0, -MID.cw, MID.x1, MID.cw], swOut: MID.cw + 5.5, exits: withNear(streetFeatures(spec.surface), es) };
      }
      const cw = interchangeHalf(st, spec.primary);
      // Exits 1–2 at the +x end, 3–4 at the −x end (gate lines at x = ±29).
      const es = twoEnds(29, cw, run, spec.exits);
      return { kind: 'street', surface: spec.surface, box: [-45, -cw, 45, cw], swOut: cw + 5.5, exits: withNear(streetFeatures(spec.surface), es) };
    }
    case 'atrium': {
      // The interchange's four exits, and exit 5 from the harbour lobby: its stair climbs +x
      // from the doorway and comes up on the quay between the lobby wall and the road.
      const cw = INTERCHANGE_CW;
      const { door, wallZ, num } = ATRIUM.exit5;
      const es: Omit<StationExit, 'near'>[] = [
        ...twoEnds(29, cw, run, spec.exits),
        { num, side: 1, rect: [door + Math.max(0, run - EXIT_OPEN), wallZ - 4, door + run, wallZ - 1.2] },
      ];
      return { kind: 'street', surface: spec.surface, box: [-45, -cw, 45, cw], swOut: cw + 5.5, exits: withNear(streetFeatures(spec.surface), es) };
    }
    case 'hub': {
      // Exits 1–4 in the east wing (−z then +z at each passage), 5–8 mirrored west.
      let n = 1;
      const es = ([1, -1] as const).flatMap((dir) =>
        // A pair climbing out from a doorway ending at x: as a gate end 13 m before it.
        HUB.exits.flatMap((x) => endExits(dir * (x - 13), dir > 0, HUB.bar, run, undefined, [String(n++), String(n++)])));
      // Exit 9 climbs north from the Central Passage onto the plaza; exit 10 north from the South
      // Gate onto Yanagi-suji's west sidewalk (hub.ts P9, SG).
      const own: Omit<StationExit, 'near'>[] = [
        { num: '9', side: -1, rect: [26.2, -31, 29, -22.8] },
        { num: '10', side: 1, rect: [-13, 34, -10.2, 42.5] },
      ];
      return { kind: 'hub', exits: withNear(hubFeatures(), [...es, ...own]) };
    }
    case 'elevated': {
      if (spec.layout) return { kind: 'elevated', exits: OPEN_AIR[spec.layout].exits.map((e) => ({ num: '', ...e })) };
      // Two street entrances: the wide south front onto the plaza, and the west end.
      const [x0, , cw0] = ELEVATED.concourse, cw = spec.width ?? cw0;
      return {
        kind: 'elevated',
        exits: [
          { num: '', side: 1, rect: [-22, cw - 0.15, -9, cw], near: [PLAZA, BUS_TAXI, MART] },
          { num: '', side: 0, rect: [x0 - 0.15, -3, x0, 3], near: [BIKES, KIND.house] },
        ],
      };
    }
  }
}

/** Every exit of a station, in number order. */
export function stationExits(station: StationId): StationExit[] {
  return stationStreet(station).exits;
}
