// Exits: for each station, which numbered exits it has and what is near each at street level.
//
// Derived from the station's spec (specs.ts) so that exit boards always match the street the
// surface builder actually draws. Nothing here is typed in per exit: each exit's position comes
// from the same arithmetic the composers use (build.ts, kit.ts exit(), hub.ts), and what is
// near it from what surface.ts (or buildElevated, or the hub's street) puts there.

import { LINES, linesAt, stationById } from '../data/network';
import type { LineDef, StationDef, StationId } from '../data/types';
import { SPECS } from './specs';
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
const STREET_CW = 12; // build.ts: where an ordinary station's exits come up
const INTERCHANGE_CW = 14; // build.ts buildInterchange, without a line beside the primary
const UNDER_MEZZ_Y = -4.2; // build.ts: B1 mezzanine under an elevated station
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

/** A thing at street level: its extent along the road and which side it is on (0 = both). */
interface Feature {
  n: Named;
  x0: number;
  x1: number;
  side: -1 | 0 | 1;
  /** A named or landmark place, listed before the plain blocks around an exit. */
  named: boolean;
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
    case 'underground': return pf(linesAt(id)[0]) + CONC_RISE; // build.ts uses the first serving line
    case 'interchange': return pf(LINES.find((l) => l.id === spec.primary)!) + CONC_RISE;
    case 'hub': return pf(crossingLine(st, spec.primary, spec.beside)) + CONC_RISE;
    case 'elevated': return 0.2;
  }
}

/** B1 transfer mezzanine level under an elevated station with a line crossing below, if any. */
export function mezzanineY(id: StationId): number | null {
  return SPECS[id].kind === 'elevated' && linesAt(id).length > 1 ? UNDER_MEZZ_Y : null;
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
 * One end's pair of exits. The doorway is at x = door in the concourse wall; the stair climbs
 * away from the station (dir) by `run` and comes up between z = half + 1.2 and half + 4.
 * nums[0] is the −z exit, nums[1] the +z one.
 */
function exitPair(door: number, dir: 1 | -1, half: number, run: number, nums: [string, string]) {
  const x0 = Math.min(door, door + dir * run), x1 = Math.max(door, door + dir * run);
  return ([-1, 1] as const).map((s) => ({
    num: nums[s < 0 ? 0 : 1],
    side: s,
    rect: [x0, s < 0 ? -half - 4 : half + 1.2, x1, s < 0 ? -half - 1.2 : half + 4] as PlanRect,
  }));
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
    .filter((c) => c.d <= 150)
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
      // Gate ends in spec order, numbered 1–2 then 3–4 (build.ts buildUnderground).
      const es = spec.gates.flatMap((g, i) => {
        const nums: [string, string] = [String(i * 2 + 1), String(i * 2 + 2)];
        return g === 'hi' ? exitPair(cx1 - 16 + 13, 1, STREET_CW, run, nums) : exitPair(cx0 + 16 - 13, -1, STREET_CW, run, nums);
      });
      // The concourse's width follows the line's age (build.ts concourseHalf); 10 m is its usual.
      const cw = spec.width ?? 10;
      return { kind: 'street', surface: spec.surface, box: [cx0, -cw, cx1, cw], swOut: STREET_CW + 5.5, exits: withNear(streetFeatures(spec.surface), es) };
    }
    case 'interchange': {
      const cw = interchangeHalf(st, spec.primary);
      // Exits 1–2 at the +x end, 3–4 at the −x end (gate lines at x = ±29).
      const es = [...exitPair(42, 1, cw, run, ['1', '2']), ...exitPair(-42, -1, cw, run, ['3', '4'])];
      return { kind: 'street', surface: spec.surface, box: [-45, -cw, 45, cw], swOut: cw + 5.5, exits: withNear(streetFeatures(spec.surface), es) };
    }
    case 'hub': {
      // Exits 1–4 in the east wing (−z then +z at each passage), 5–8 mirrored west.
      let n = 1;
      const es = ([1, -1] as const).flatMap((dir) =>
        HUB.exits.flatMap((x) => exitPair(dir * x, dir, HUB.bar, run, [String(n++), String(n++)])));
      return { kind: 'hub', exits: withNear(hubFeatures(), es) };
    }
    case 'elevated': {
      // Two street entrances: the wide south front onto the plaza, and the west end.
      const [x0, , cw] = ELEVATED.concourse;
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
