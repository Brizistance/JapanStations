// The road kit: what stands and is painted on a station's streets, for a street built by
// surface.ts with `roadKit` set.
//
// Traffic keeps left, as in Japan, and this file is the one place that says so. In the station
// frame (+x along the main road, +z across it):
//   - on the main road, traffic going +x uses the z < 0 half, traffic going −x the z > 0 half;
//   - on a road crossing it, traffic going +z uses the x > centre half, traffic going −z the other.
// Everything else follows from `left()` below: a signal's mast stands on its traffic's left kerb
// at the far side of the junction, its arm reaching right over the lanes it controls; vehicles
// face the way their lane goes; kerb lanes (bus, bicycle) are the left-hand ones.
//
// What you see is models (road.glb, tools/blender/build_road.py: masts, poles, shelters, vehicles)
// and game signs laid on them: the signal lenses (live, signs/draw.ts signalState), sign faces,
// the blue direction boards (destinations from the network) and the paint on the road.
//
// Junction kinds, by the width of the crossing road:
//   - wide (half width ≥ 5 m): signals on all four approaches, pedestrian signals on all four
//     crosswalks, a direction board on each approach along the main road;
//   - narrow: a push-button crossing. The main road has signals and the crosswalks over it have
//     pedestrian signals; the side street has 止まれ signs and paint, and kerb mirrors.

import { LINES, stationById } from '../data/network';
import type { Arrow, SignContent } from '../signs/content';
import { rng, type Builder, type LanePart, type V2 } from '../world/builder';
import { CARS, VEH } from '../traffic/vehicles';
import { GROUND_Y as GY } from './kit';

/** Street lights by environment. */
export type LampKind = 'lamp_hw' | 'lamp_shop' | 'lamp_park' | 'lamp_led' | 'lamp_twin' | 'lamp_suzuran' | 'lamp_small';

/** A street light at (x, z) with its front (the arm, the banner) towards f. */
export function streetLamp(b: Builder, kind: LampKind, x: number, z: number, f: V2) {
  put(b, kind, x, GY, z, f);
  b.block(x - 0.12, GY, z - 0.12, x + 0.12, GY + 3, z + 0.12);
}

// build_road.py upole: where the wires hang on a pole, as (height, distance behind its front): the
// front faces the road, so a negative distance is on the road side.
const HV: [number, number][] = [[9.32, -1.35], [9.32, -0.8], [9.32, -0.2]];
const LV: [number, number][] = [[7.45, -0.3], [7.25, -0.3], [7.05, -0.3]];
const TEL: [number, number][] = [[5.95, -0.24], [5.6, -0.24]];
const WIRE = 'flat:#1b1b1d';

/** One wire between two points on a line along x or along z, hanging `sag` m low in the middle. Visual only. */
function wire(b: Builder, p: [number, number, number], q: [number, number, number], sag: number, r: number) {
  const alongX = Math.abs(q[0] - p[0]) >= Math.abs(q[2] - p[2]);
  const u0 = alongX ? p[0] : p[2], u1 = alongX ? q[0] : q[2];
  const [a, c, ya, yc] = u0 <= u1 ? [u0, u1, p[1], q[1]] : [u1, u0, q[1], p[1]];
  const n = Math.max(4, Math.min(12, Math.round((c - a) / 1.5)));
  const y = (t: number) => ya + (yc - ya) * t - sag * 4 * t * (1 - t);
  const run = () => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      b.slant(WIRE, a + (c - a) * t0, y(t0) - r, -r, a + (c - a) * t1, y(t0) + r, r, y(t1) - y(t0));
    }
  };
  if (alongX) b.with({ t: [0, 0, p[2]] }, run);
  else b.with({ rot: 1, t: [p[0], 0, 0] }, run);
}

export interface PoleLine {
  /** The line runs along x at z = `at`, or along z at x = `at`. */
  axis: 'x' | 'z';
  from: number;
  to: number;
  at: number;
  /** Which way the road lies from the line (the poles' fronts, lights and crossarms face it). */
  road: 1 | -1;
  step?: number;
  /** Positions along the line where no pole may stand (a junction, an exit). */
  skip?: (u: number) => boolean;
  /** Service drops to the buildings behind the poles, this far back. */
  drops?: number;
  /** Lines cross the road to this far on the other side, from every second pole. */
  cross?: number;
  /** For the address plates on the poles. */
  name?: { ja: string; en: string };
  /** The crossing wires end at the wall of the building across the road (`cross` m away): a bracket, insulators, a drop to the meter. */
  wall?: boolean;
}

/**
 * A line of utility poles with everything on them: three high-voltage wires on the crossarms,
 * three low-voltage wires on the rack, two telecom cables below, all sagging between the poles;
 * drops to the buildings, crossings over the road, and address plates. Every second pole carries
 * a transformer; all of them a street light.
 */
export function poleLine(b: Builder, o: PoleLine) {
  const step = o.step ?? 27;
  const KANJI = ['一', '二', '三', '四', '五', '六', '七', '八'];
  const f: V2 = o.axis === 'x' ? [0, o.road] : [o.road, 0];
  /** Frame point at `u` along the line, `back` m behind the pole's front. */
  const at = (u: number, back: number, y: number): [number, number, number] => (o.axis === 'x' ? [u, GY + y, o.at - back * o.road] : [o.at - back * o.road, GY + y, u]);
  const us: number[] = [];
  for (let u = Math.min(o.from, o.to) + step / 2; u < Math.max(o.from, o.to) - 2; u += step) if (!o.skip?.(u)) us.push(u);
  us.forEach((u, i) => {
    const [x, , z] = at(u, 0, 0);
    put(b, i % 2 ? 'upole_l' : 'upole', x, GY, z, f);
    b.block(x - 0.16, GY, z - 0.16, x + 0.16, GY + 3, z + 0.16);
    if (o.drops) {
      wire(b, at(u, LV[1][1], LV[1][0]), at(u, o.drops, 5.4), 0.25, 0.012);
      wire(b, at(u, TEL[0][1], TEL[0][0]), at(u, o.drops, 4.9), 0.2, 0.012);
    }
    const cross = o.cross;
    if (cross && i % 2 === 0) b.later(() => {
      // With `wall`, the wires run to the face of the building across (found from its hitbox once
      // everything is built), and only where one stands there tall enough to take them.
      let reach = cross;
      if (o.wall) {
        const solid = (t: number, y: number) => {
          const [wx, wy, wz] = b.pt(...at(u, -t, y));
          return b.out.boxes.some((bx) => bx.solid && bx.min[1] < wy && bx.max[1] > wy && bx.min[0] < wx && bx.max[0] > wx && bx.min[2] < wz && bx.max[2] > wz);
        };
        let face = NaN;
        for (let t = Math.max(1, cross - 1.5); t <= cross + 2.5; t += 0.05) if (solid(t, 4) && solid(t, 8.6)) { face = t; break; } // the hitbox reaches 1.5 m above the wall (roof railings)
        if (Number.isNaN(face)) return;
        reach = face - 0.03;
      }
      const sag = Math.min(0.35, reach * 0.04);
      wire(b, at(u, LV[0][1], LV[0][0]), at(u, -reach, 6.6), sag, 0.012);
      wire(b, at(u, TEL[1][1], TEL[1][0]), at(u, -reach, 5.6), sag, 0.02);
      if (o.wall) {
        // On the wall: a steel bracket with an insulator, the wire down to the meter box on the wall.
        for (const y of [6.6, 5.6]) {
          const [p, , q] = at(u, -reach, 0), [p2, , q2] = at(u, -reach - 0.3, 0);
          b.deco('flat:#5f6266', Math.min(p, p2) - 0.03, GY + y - 0.03, Math.min(q, q2) - 0.03, Math.max(p, p2) + 0.03, GY + y + 0.03, Math.max(q, q2) + 0.03);
          b.mesh('flat:#e8e6de', 'cyl', p, GY + y - 0.08, q, 0.05, 0.1, 0.05);
        }
        const [mx, , mz] = at(u, -reach + 0.04, 0), [bx0, , bz0] = at(u, -reach + 0.2, 0), [bx1, , bz1] = at(u, -reach - 0.02, 0);
        b.deco(WIRE, mx - 0.012, GY + 2.2, mz - 0.012, mx + 0.012, GY + 6.6, mz + 0.012);
        // The meter box against the wall: 0.44 along it, 0.2 out from it.
        const along = o.axis === 'x' ? 0 : 1;
        const lo: [number, number] = [Math.min(bx0, bx1), Math.min(bz0, bz1)], hi: [number, number] = [Math.max(bx0, bx1), Math.max(bz0, bz1)];
        if (along === 0) { lo[0] = mx - 0.22; hi[0] = mx + 0.22; } else { lo[1] = mz - 0.22; hi[1] = mz + 0.22; }
        b.deco('flat:#d9d5c4', lo[0], GY + 1.6, lo[1], hi[0], GY + 2.2, hi[1]);
      }
    });
    if (o.name && i % 2 === 0) {
      const n = Math.floor(i / 2);
      const [px, , pz] = at(u, -0.175, 0);
      b.sign({ k: 'address', ja: `${o.name.ja}${KANJI[n % KANJI.length]}丁目`, en: `${o.name.en} ${(n % KANJI.length) + 1}` }, px, GY + 2.1, pz, f, 0.15, 0.56);
    }
    const next = us[i + 1];
    if (next === undefined || next - u > step * 2 + 1) return;
    const span = next - u;
    for (const [y, back] of HV) wire(b, at(u, back, y), at(next, back, y), span * 0.014, 0.012);
    for (const [y, back] of LV) wire(b, at(u, back, y), at(next, back, y), span * 0.02, 0.016);
    for (const [y, back] of TEL) wire(b, at(u, back, y), at(next, back, y), span * 0.028, 0.032);
  });
}

// build_road.py XING: height of the lamps and their spacing, height of the gate's pivot.
const XING = { lampY: 2.35, lampDx: 0.32, pivotY: 1.0 };

export interface LevelCrossing {
  /** The road runs along x (the tracks cross it along z) or along z. */
  road: 'x' | 'z';
  /** Where the tracks' centre line crosses the road's centre line. */
  x: number;
  z: number;
  /** Half width of the road, and of the strip of tracks (two tracks: about 4 m). */
  rw: number;
  tracks: number;
  /** Whose trains close it: the lamps and arms follow this line's timetable at this station. */
  line: string;
  station: string;
}

/**
 * A railway level crossing (踏切) over a road: on each approach a warning mast with lamps on the
 * left kerb and a gate whose arm closes the entry lane, a panelled track bed with rails, stop
 * lines and yellow edge lines. The lamps flash and the arms come down while a train of the line
 * is near (never otherwise). No line has a crossing yet: this is ready for the first one.
 * The arms are drawn, not solid: nothing stops a walker.
 */
export function levelCrossing(b: Builder, o: LevelCrossing) {
  const run = () => {
    // Local frame: the road along x, the tracks across it at x = 0.
    const { rw, tracks } = o;
    b.deco('flat:#3a3d42', -tracks - 0.6, 0.012, -rw - 2.5, tracks + 0.6, 0.02, rw + 2.5);
    for (const tx of tracks > 2.5 ? [-tracks / 2, tracks / 2] : [0]) {
      for (const g of [-0.72, 0.72]) b.deco('flat:#8d9094', tx + g - 0.04, 0.02, -rw - 2.5, tx + g + 0.04, 0.035, rw + 2.5);
      b.deco('flat:#2a2c30', tx - 0.62, 0.02, -rw, tx + 0.62, 0.026, rw);
    }
    for (const s of [-1, 1]) {
      b.deco('flat:#f2c200', -tracks - 0.6, 0.02, s * rw - 0.12, tracks + 0.6, 0.027, s * rw + 0.12);
      b.deco('flat:#e9e9e4', s * (tracks + 2.2) - 0.2, 0.004, Math.min(0, -s * rw), s * (tracks + 2.2) + 0.2, 0.01, Math.max(0, -s * rw));
    }
    for (const sx of [1, -1] as const) {
      // Traffic travelling sx stops before the tracks; its mast and gate stand on its left kerb.
      const h: V2 = [sx, 0], l = left(h), f: V2 = [-sx, 0];
      const mx = -sx * (tracks + 1.6), mz = l[1] * (rw + 0.6);
      put(b, 'xing_mast', mx, GY, mz, f);
      b.block(mx - 0.1, GY, mz - 0.1, mx + 0.1, GY + 3, mz + 0.1);
      const [lx, lz] = off(f, 0, -0.16);
      b.sign({ k: 'crossing', v: 'lamps', line: o.line, station: o.station }, mx + lx, GY + XING.lampY, mz + lz, f, XING.lampDx * 2 + 0.44, 0.4);
      b.sign({ k: 'label', text: '踏切', sub: 'Level crossing', fg: '#1c1c1e', bg: '#f2c200' }, mx + lx, GY + 1.85, mz + lz * 0.9, f, 0.6, 0.24);
      // The gate, a little nearer the tracks: its arm reaches from the kerb to the road's centre line.
      const gx = -sx * (tracks + 0.9), gz = l[1] * (rw + 0.35), L = rw + 0.35;
      put(b, 'xing_gate', gx, GY, gz, f);
      b.block(gx - 0.22, GY, gz - 0.22, gx + 0.22, GY + 1.3, gz + 0.22);
      const cz = gz - l[1] * (L / 2);
      for (const back of [false, true]) {
        const n: V2 = back ? [sx, 0] : f;
        b.sign({ k: 'crossing', v: 'arm', line: o.line, station: o.station, flip: back }, gx - sx * (back ? 0.3 : 0.28), GY + XING.pivotY - 0.07 + L / 2, cz, n, L, L);
      }
    }
  };
  if (o.road === 'x') b.with({ t: [o.x, 0, o.z] }, run);
  else b.with({ rot: 1, t: [o.x, 0, o.z] }, run);
}

export interface RoadGeo {
  /** Half extents of the plot. */
  X: number;
  Z: number;
  /** Half width of the main road, and the outer edge of its sidewalk. */
  rw: number;
  swOut: number;
  /** Roads crossing the main one, as x-ranges of their carriageways. */
  streets: [number, number][];
  canal?: number;
  seed: number;
  name: { ja: string; en: string };
  /** The station, and the main road's direction (+x) on the network map. */
  at?: { id: string; dir: [number, number] };
  /** The crossing roads only run to the +z side (T-junctions): nothing drives in from −z. */
  tee?: boolean;
  /** Crossing roads (by index, west to east) that only run to the +z side, where the others run through. */
  tees?: number[];
  /** The tee roads run to the −z side instead (Daigaku-mae: the town north of the main road, the campus wall south). */
  teeNorth?: boolean;
  /** The big streets' way: signals hang on dark grey poles shared with the street lights. */
  shared?: boolean;
  /** An old street: single curved arms, hooded heads, a striped back board here and there. */
  old?: boolean;
  /** Signals on long mast arms (6.5 m) reaching over the inner lane (Daigaku-mae's Gakufu-dōri). */
  long?: boolean;
  /** Street lights along the main road (build_road.py): highway masts, shopping-street lamps or park lanterns. None: the utility poles carry the lights. */
  lamp?: LampKind;
  /** Names of the junctions, west to east, where the default (the area's name and a chōme number) will not do. */
  junctions?: { ja: string; en: string }[];
  /** Road names (docs/worldbuilding.md): the main road's and the crossing roads', west to east, on blue boards on the signal masts. */
  roads?: { main: { ja: string; en: string }; cross: { ja: string; en: string }[] };
  /** How busy the street is (1: an ordinary shopping street) and the share of taxis among its cars. */
  busy?: number;
  /** Per crossing road (west to east): how far it runs from the main road's middle, if short of the plot's edge. */
  ends?: (number | undefined)[];
  /** Where the bus stops stand (x of the shelter, for traffic going +x and −x), where the default would block something. */
  busX?: [number | undefined, number | undefined];
  /** Narrow crossing roads (by index) that get a signal of their own; default every other one. */
  lit?: number[];
  /** Where the taxi stand begins on the −x-bound kerb, where the default would block something. */
  taxiX?: number;
  /** Per crossing road: a share of the usual traffic coming in from it (default 1). */
  flows?: number[];
  /** Crossing roads (by index) whose junction is a scramble: diagonal crosswalks, an all-walk phase. */
  scramble?: number[];
  taxi?: number;
}

// build_road.py: arm lengths, the lens housing's place on an arm, the direction board's place.
const ARMS: [string, number][] = [['signal3', 2.6], ['signal7', 6.4], ['signal9', 8.7]];
const HEAD_Y = 5.55, HEAD_IN = 0.75;
const BOARD = { cx: -4.6, cy: 6.4, w: 3.5, h: 2.94 }; // the sign's face: 1.19 : 1, as sign 108の2-A
/** A main road this wide (half width) has a bus lane clear of the taxi stand: buses, taxis and scooters drive in it. */
const BUS_LANE_RW = 11;
/** True while the road kit builds a scramble junction: its signals and stop lines run the scramble cycle. */
let SCR = false;
const sa = (a: 0 | 1): 0 | 1 | 2 | 3 => (SCR ? ((a + 2) as 2 | 3) : a);

/**
 * A traffic lane for the moving vehicles (traffic/system.ts), from (x0, z0) to (x1, z1) on the road
 * surface. Stop lines and bus stops are given as distances from its start.
 */
export function trafficLane(b: Builder, x0: number, z0: number, x1: number, z1: number, o: Omit<LanePart, 'from' | 'to'>) {
  b.out.lanes.push({ from: b.pt(x0, 0, z0), to: b.pt(x1, 0, z1), ...o });
}

/** The left of someone travelling in direction h (unit, frame xz). */
const left = (h: V2): V2 => [h[1], -h[0]];
/** Frame offset of a model's local point (lx, lz) when its front faces f. */
const off = (f: V2, lx: number, lz: number): V2 => [-lx * f[1] - lz * f[0], lx * f[0] - lz * f[1]];

/** A road model with its front facing f (any direction), drawn merged with the others. */
export function roadModel(b: Builder, id: string, x: number, y: number, z: number, f: V2) {
  put(b, id, x, y, z, f);
}
function put(b: Builder, id: string, x: number, y: number, z: number, f: V2) {
  const d = b.dir(f);
  b.out.models.push({ kind: 'road', id, pos: b.pt(x, y, z), yaw: Math.atan2(-d[0], -d[1]) + 0, seed: 0, merge: true });
}

/** Where the taxi stand begins (first cab), on the −x-bound kerb. */
const TAXI_X = 40;

/** x of the bus shelter for traffic going sx: past the first wide junction going +x, before it going −x. */
function busStopX(streets: [number, number][], sx: 1 | -1): number | null {
  const j = streets.filter(([a, c]) => (c - a) / 2 >= 5).sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1]))[0] ?? streets[0];
  return j ? (sx > 0 ? j[1] + 17 : j[0] - 27) : null;
}

/**
 * Stretches of the main road's kerb left without guard rail, so people can reach a bus or a taxi:
 * `s` is the side (the sign of z), x0 … x1 the gap. surface.ts builds the rail round them.
 */
export function kerbGaps(streets: [number, number][], busX?: RoadGeo['busX'], taxiX = TAXI_X): { s: 1 | -1; x0: number; x1: number }[] {
  const out: { s: 1 | -1; x0: number; x1: number }[] = [];
  for (const sx of [1, -1] as const) {
    const x = busX?.[sx > 0 ? 0 : 1] ?? busStopX([...streets].sort((p, q) => p[0] - q[0]), sx);
    if (x !== null) out.push({ s: left([sx, 0])[1] as 1 | -1, x0: Math.min(x - sx * 5.5, x + sx * 8), x1: Math.max(x - sx * 5.5, x + sx * 8) });
  }
  out.push({ s: left([-1, 0])[1] as 1 | -1, x0: taxiX - 3, x1: taxiX + 14.5 });
  return out;
}

/** One 2.5 m panel of kerb guard rail along the main road (surface.ts adds the collider). */
export function kerbRail(b: Builder, x: number, z: number) {
  put(b, 'rail', x, GY, z, [0, -1]);
}

/**
 * A vehicle signal head with its lamps, its middle at (x, y, z), facing f. `flat` is the thin LED type
 * (250 mm lenses, no hoods) of the newer avenues; otherwise the hooded 300 mm head with its back board.
 */
function carHead(b: Builder, x: number, y: number, z: number, f: V2, axis: 0 | 1, flat: boolean, vertical = false, zebra = false) {
  put(b, zebra && !vertical ? 'head_zebra' : `head_${flat ? 'flat' : vertical ? 'v' : 'h'}${flat && vertical ? '_v' : ''}`, x, y, z, f);
  const [w, hh, dz] = flat ? [1.03, 0.33, 0.052] : [1.3, 0.44, 0.15];
  const [ox, oz] = off(f, 0, -dz);
  b.sign({ k: 'signal', v: vertical ? 'carv' : 'car', axis: sa(axis) }, x + ox, y, z + oz, f, vertical ? hh : w, vertical ? w : hh);
}

/**
 * How a signal is mounted (build_road.py). 'new': today's standard, a straight steel pole with a short
 * arm of two parallel beams and thin LED heads. 'old': the single curved arm and hooded heads of older
 * streets. 'shared': the big streets' dark grey pole that carries the street light too. 'long': the
 * new pole with a 6.5 m mast arm and a stay rod, the heads out over the inner lane.
 */
export type PoleStyle = 'new' | 'old' | 'shared' | 'long';
/** Each style's poles: the arm's length, and the head's middle in from its tip. */
const POLES: Record<PoleStyle, { id: string; arm: number; inn: number }[]> = {
  new: [{ id: 'sigp2', arm: 2.0, inn: 0.55 }, { id: 'sigp3', arm: 3.5, inn: 0.55 }],
  old: [{ id: 'signal3', arm: 2.6, inn: HEAD_IN }],
  shared: [{ id: 'siglight2', arm: 2.0, inn: 0.55 }, { id: 'siglight3', arm: 3.5, inn: 0.55 }],
  long: [{ id: 'sigp3', arm: 3.5, inn: 0.55 }, { id: 'sigp6', arm: 6.5, inn: 0.55 }],
};
/**
 * build_road.py PLATE: the junction's name plate on the arm, road side, between the pole and the head
 * (x from the pole along the arm, z behind the pole's front). The old curved arm carries it higher.
 */
const PLATE = { x: 1.2, y: HEAD_Y + 0.66, yOld: 6.5, w: 1.7, h: 0.5, z: 0.12 };
/** Middle of a pedestrian head: its underside 2.7 m over the pavement (build_road.py PED_Y). */
const PED_Y = 3.1;

export interface SignalOpts {
  /** Thin LED heads. Default: every style but 'old'. */
  flat?: boolean;
  /** A right-turn arrow lamp under the head's red lens. */
  arrow?: boolean;
  style?: PoleStyle;
  /** A second head back to back with the first, for the traffic coming the other way: its near-side head. */
  back?: boolean;
  /** An old hooded head with the green-and-white striped back board. */
  zebra?: boolean;
}

/**
 * A vehicle signal for traffic travelling h: a pole at (mx, mz) on the left kerb at the far side of
 * the junction, its arm out over the road, the head facing the traffic. Arms are short, as they are
 * in Japan: 2 m, or 3.5 m where `reach` asks for more.
 */
export function vehicleSignal(b: Builder, mx: number, mz: number, h: V2, reach: number, axis: 0 | 1, name?: { ja: string; en: string }, o: SignalOpts = {}) {
  const f: V2 = [-h[0], -h[1]];
  const style = o.style ?? 'new', list = POLES[style];
  // (A pole that carries the junction's plate has the longer arm: plate and head sit side by side on it.)
  // ('long' picks by reach alone: both its poles carry a plate; the cross streets keep the 3.5 m arm.)
  const pole = (name && style !== 'long' ? undefined : list.find((q) => q.arm - q.inn >= reach - 0.6)) ?? list[list.length - 1];
  const flat = o.flat ?? style !== 'old', hx = pole.arm - pole.inn;
  put(b, pole.id, mx, GY, mz, f);
  b.block(mx - 0.16, GY, mz - 0.16, mx + 0.16, GY + 3, mz + 0.16);
  const [ox, oz] = off(f, -hx, 0);
  carHead(b, mx + ox, GY + HEAD_Y, mz + oz, f, axis, flat, false, !flat && !!o.zebra);
  if (o.back) {
    // Behind the beams, facing the other way.
    const [bx, bz] = off(f, -hx, flat ? 0.24 : 0.36);
    carHead(b, mx + bx, GY + HEAD_Y, mz + bz, h, axis, flat);
  }
  if (o.arrow) {
    // Under the red lens (the head's right as the driver sees it).
    const [ax, az] = off(f, -hx - (flat ? 0.35 : 0.42), 0), ay = GY + HEAD_Y - (flat ? 0.36 : 0.5);
    put(b, flat ? 'head_flat_arrow' : 'head_arrow', mx + ax, ay, mz + az, f);
    const [dx, dz] = off(f, 0, -(flat ? 0.052 : 0.15)), sz = flat ? 0.33 : 0.44;
    b.sign({ k: 'signal', v: 'arrow', axis: sa(0) }, mx + ax + dx, ay, mz + az + dz, f, sz, sz);
  }
  // The junction's name plate on the arm between the pole and the head, read from both ways.
  if (name) {
    const pz0 = style === 'old' ? 0 : PLATE.z, py = style === 'old' ? PLATE.yOld : PLATE.y;
    for (const s of [1, -1]) {
      const [px, pz] = off(f, -PLATE.x, pz0 - s * 0.035);
      b.sign({ k: 'junction', ...name }, mx + px, GY + py, mz + pz, s > 0 ? f : [-f[0], -f[1]], PLATE.w, PLATE.h);
    }
  }
}

/** A standing head on a short bracket at the side of a straight pole at (x, z): a repeater at the stop line. */
export function sideSignal(b: Builder, x: number, z: number, h: V2, axis: 0 | 1, flat: boolean) {
  const f: V2 = [-h[0], -h[1]];
  put(b, 'sigside', x, GY, z, f);
  b.block(x - 0.12, GY, z - 0.12, x + 0.12, GY + 3, z + 0.12);
  const [ox, oz] = off(f, -(0.42 + (flat ? 0.175 : 0.24)), 0);
  carHead(b, x + ox, GY + 3.6, z + oz, f, axis, flat, true);
}

/** A hooded head carried on a bracket from a concrete utility pole at (x, z): the side street's own signal. */
function poleSignal(b: Builder, x: number, z: number, h: V2, axis: 0 | 1) {
  const f: V2 = [-h[0], -h[1]];
  put(b, 'upole_l', x, GY, z, f);
  b.block(x - 0.18, GY, z - 0.18, x + 0.18, GY + 3, z + 0.18);
  put(b, 'sigbracket', x, GY + 4.9, z, f);
  const [ox, oz] = off(f, -1.5, 0);
  carHead(b, x + ox, GY + 4.9, z + oz, f, axis, false);
}

/**
 * A pedestrian signal at (x, z) facing f (towards the people crossing to it). `flat` is the thin head
 * with countdown bars; `button` adds the push-button box, `speaker` the audible signal.
 */
export function pedSignal(b: Builder, x: number, z: number, f: V2, axis: 0 | 1, o: { flat?: boolean; button?: boolean; speaker?: boolean } = {}) {
  put(b, 'pedpole', x, GY, z, f);
  b.block(x - 0.1, GY, z - 0.1, x + 0.1, GY + 2.2, z + 0.1);
  const [hx, hz] = off(f, 0, -0.24);
  put(b, o.flat ? 'pedhead_flat' : 'pedhead', x + hx, GY + PED_Y, z + hz, f);
  const [ox, oz] = off(f, 0, -(0.24 + (o.flat ? 0.047 : 0.105)));
  b.sign({ k: 'signal', v: 'ped', axis: sa(axis), bars: !!o.flat }, x + ox, GY + PED_Y, z + oz, f, 0.42, 0.74);
  if (o.button) {
    const [bx, bz] = off(f, 0, -0.07);
    put(b, 'pushbtn', x + bx, GY + 1.2, z + bz, f);
  }
  if (o.speaker) {
    const [sx, sz] = off(f, 0, -0.06);
    put(b, 'speaker', x + sx, GY + PED_Y + 0.45, z + sz, f);
  }
}

type SignV = Extract<SignContent, { k: 'roadsign' }>['v'];
const BACK: Record<string, SignV> = { stop: 'back-tri', speed40: 'back-round', speed30: 'back-round', noparking: 'back-round', nostopping: 'back-round', hydrant: 'back-round', noentry: 'back-round', crossing: 'back-penta', school: 'back-diamond' };
// build_road.py fingerpost: each arm's height and which way it points along the post's x.
const FINGER: [number, number][] = [[2.5, 1], [2.26, -1], [2.02, 1]];

/** A road sign on its own pole at (x, z), its face towards f. */
/** build_road.py SHORT: the short-arm signal's head and plate. */
const SHORT = { hx: -1.9, hy: 5.45, plateX: -1.2, plateY: 6.0, plateW: 1.7, plateH: 0.5 };

/**
 * The narrow junction's other signal: a straight pole with a short arm and a horizontal head at
 * its tip, the junction's name plate standing on top, a no-parking sign clamped low on the pole
 * (the pedestrian head goes on it too: mastPed).
 */
export function shortSignal(b: Builder, x: number, z: number, h: V2, axis: 0 | 1, name: { ja: string; en: string }, back = false) {
  const f: V2 = [-h[0], -h[1]];
  put(b, 'sigshort', x, GY, z, f);
  b.block(x - 0.13, GY, z - 0.13, x + 0.13, GY + 3, z + 0.13);
  // The model turns but never flips: in a mirrored frame its arm and plate lie on the other side.
  const d1 = b.dir([1, 0]), d2 = b.dir([0, 1]), lat = d1[0] * d2[1] - d1[1] * d2[0] < 0 ? -1 : 1;
  const [ox, oz] = off(f, lat * SHORT.hx, 0);
  carHead(b, x + ox, GY + SHORT.hy, z + oz, f, axis, true);
  if (back) {
    const [bx, bz] = off(f, lat * SHORT.hx, 0.2);
    carHead(b, x + bx, GY + SHORT.hy, z + bz, h, axis, true);
  }
  for (const s of [1, -1]) {
    const [px, pz] = off(f, lat * SHORT.plateX, 0.1 - s * 0.035);
    b.sign({ k: 'junction', ...name }, x + px, GY + SHORT.plateY, z + pz, s > 0 ? f : [-f[0], -f[1]], SHORT.plateW, SHORT.plateH);
  }
  const [nx, nz] = off(f, 0, -0.15);
  b.sign({ k: 'roadsign', v: 'noparking' }, x + nx, GY + 1.75, z + nz, f, 0.55, 0.55);
  b.sign({ k: 'roadsign', v: BACK.noparking }, x + nx - f[0] * 0.02, GY + 1.75, z + nz - f[1] * 0.02, [-f[0], -f[1]], 0.55, 0.55);
}

/** A pedestrian head hung on a signal mast at (x, z) on two bands, facing f (across the crosswalk), with its push button. */
export function mastPed(b: Builder, x: number, z: number, f: V2, axis: 0 | 1, o: { flat?: boolean; button?: boolean } = {}) {
  put(b, 'pedband', x, GY, z, f);
  const [hx, hz] = off(f, 0, -0.3);
  put(b, o.flat ? 'pedhead_flat' : 'pedhead', x + hx, GY + PED_Y, z + hz, f);
  const [ox, oz] = off(f, 0, -(0.3 + (o.flat ? 0.047 : 0.105)));
  b.sign({ k: 'signal', v: 'ped', axis: sa(axis), bars: !!o.flat }, x + ox, GY + PED_Y, z + oz, f, 0.42, 0.74);
  if (o.button) {
    const [bx, bz] = off(f, 0, -0.15);
    put(b, 'pushbtn', x + bx, GY + 1.2, z + bz, f);
  }
}

/** A blue road-name board on a mast at (x, z), facing f, 4.3 m up. */
export function roadName(b: Builder, x: number, z: number, f: V2, n: { ja: string; en: string }) {
  const [ox, oz] = off(f, 0, -0.17);
  b.sign({ k: 'label', text: n.ja, sub: n.en, fg: '#ffffff', bg: '#1f5fae' }, x + ox, GY + 4.3, z + oz, f, 1.5, 0.46);
}

export function roadSign(b: Builder, v: 'stop' | 'speed40' | 'speed30' | 'noparking' | 'nostopping' | 'crossing' | 'school' | 'hydrant' | 'noentry', x: number, z: number, f: V2, size = 0.7, below?: 'school') {
  put(b, 'signpole', x, GY, z, f);
  b.block(x - 0.06, GY, z - 0.06, x + 0.06, GY + 2, z + 0.06);
  const y = GY + 2.72;
  if (below) {
    // A second sign on the same pole, under the first.
    const [bx, bz] = off(f, 0, -0.05);
    b.sign({ k: 'roadsign', v: below }, x + bx, y - size * 0.98, z + bz, f, size * 0.9, size * 0.9);
    b.sign({ k: 'roadsign', v: BACK[below] }, x - bx, y - size * 0.98, z - bz, [-f[0], -f[1]], size * 0.9, size * 0.9);
  }
  const [ox, oz] = off(f, 0, -0.05);
  b.sign({ k: 'roadsign', v }, x + ox, y, z + oz, f, size, size);
  b.sign({ k: 'roadsign', v: BACK[v] }, x - ox, y, z - oz, [-f[0], -f[1]], size, size);
}

/** Paint on the road at (x, z), its top towards the direction of travel h. */
export function mark(b: Builder, v: Extract<SignContent, { k: 'roadmark' }>['v'], x: number, z: number, h: V2, w: number, len: number) {
  b.sign({ k: 'roadmark', v }, x, 0.016, z, null, w, len, { top: h });
}

/**
 * Where the roads lead: the nearest neighbouring station of this one in each direction of the
 * frame, from the network (never typed in). Keys: +x, −x, +z, −z.
 */
function destinations(at: RoadGeo['at']): Partial<Record<'px' | 'nx' | 'pz' | 'nz', { ja: string; en: string }>> {
  if (!at) return {};
  const here = stationById(at.id);
  const [tx, tz] = at.dir;
  const best: Partial<Record<string, { d: number; ja: string; en: string }>> = {};
  for (const line of LINES) {
    const i = line.stops.indexOf(at.id);
    if (i < 0) continue;
    for (const j of [i - 1, i + 1]) {
      const id = line.stops[j];
      if (!id) continue;
      const n = stationById(id);
      const dx = n.position.x - here.position.x, dz = n.position.y - here.position.y;
      const lx = dx * tx + dz * tz, lz = -dx * tz + dz * tx;
      const key = Math.abs(lx) >= Math.abs(lz) ? (lx > 0 ? 'px' : 'nx') : lz > 0 ? 'pz' : 'nz';
      const d = Math.hypot(lx, lz);
      if (!best[key] || d < best[key]!.d) best[key] = { d, ja: n.nameJa, en: n.nameRomaji };
    }
  }
  return best;
}

export function roadKit(b: Builder, g: RoadGeo) {
  const { X, Z, rw } = g;
  const r = rng(g.seed * 7 + 101);
  const streets = [...g.streets].sort((p, q) => p[0] - q[0]);
  const dest = destinations(g.at);
  // Lanes of the main road, per direction, by |z|: the general lane next to the centre line, the
  // bus lane, and the bicycle lane at the kerb.
  const LANE = rw / 2, GEN = LANE / 2, BUS = LANE + (rw - 1.5 - LANE) / 2, BIKE = rw - 0.75;
  /** z of a main-road lane for traffic travelling sx (+1 or −1 along x). */
  const laneZ = (sx: number, d: number) => left([sx, 0])[1] * d;

  // ── Vehicles: placed facing their lane's direction, never overlapping ──
  const parked: [number, number, number, number][] = [];
  const vehicle = (id: string, x: number, z: number, h: V2): boolean => {
    const [len, wid, hgt] = VEH[id.split('_')[0]];
    const hx = h[0] !== 0 ? len / 2 : wid / 2, hz = h[0] !== 0 ? wid / 2 : len / 2;
    const box: [number, number, number, number] = [x - hx - 0.6, z - hz - 0.3, x + hx + 0.6, z + hz + 0.3];
    if (Math.abs(x) + hx > X - 2 || Math.abs(z) + hz > Z - 2) return false;
    if (parked.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) return false;
    parked.push(box);
    put(b, id, x, 0, z, h);
    b.block(x - hx, 0, z - hz, x + hx, hgt, z + hz);
    return true;
  };
  const anyCar = () => CARS[Math.floor(r() * CARS.length)];
  const busLane = rw >= BUS_LANE_RW, busy = g.busy ?? 1, taxi = g.taxi ?? 0.15;
  /** Stop lines and bus stops along the main road, for traffic going +x and −x, as distances from where it enters. */
  const mainStops: LanePart['stops'][] = [[], []], halts: LanePart['halts'][] = [[], []];
  /** How far from the centre line the lane runs that buses and taxis use: the bus lane where the road has a clear one. */
  const KERB_LANE = busLane ? BUS : GEN;

  // ── Junctions ──
  const zones: [number, number][] = []; // x-ranges of the main road taken by a junction
  // Junction names come from the area: the station's name, with a chōme number where it has several.
  const KANJI = ['一', '二', '三', '四', '五', '六'];
  const nameOf = (i: number) => g.junctions?.[i] ?? (streets.length > 1 ? { ja: `${g.name.ja}${KANJI[i] ?? i + 1}丁目`, en: `${g.name.en} ${i + 1}` } : { ja: g.name.ja, en: g.name.en });
  for (const [a, c] of streets) {
    const mid = (a + c) / 2, half = (c - a) / 2, wide = half >= 5;
    const ji = streets.findIndex((q) => q[0] === a), jname = nameOf(ji);
    /** How far this road runs from the main road's middle (a tee road may stop short of the plot's edge). */
    const ZE = g.ends?.[ji] ?? Z;
    SCR = !!g.scramble?.includes(ji);
    const tee = !!g.tee || !!g.tees?.includes(ji);
    /** The side a tee road does not run to. */
    const shut = g.teeNorth ? -1 : 1;
    // An avenue has the thin LED heads, arrow lamps and audible signals; every other narrow junction
    // gives its side street a signal of its own on a utility pole instead of a stop sign.
    const avenue = rw >= 8, sideLit = !wide && (g.lit ? g.lit.includes(ji) : ji % 2 === 0);
    const style: PoleStyle = g.shared ? 'shared' : g.long ? 'long' : g.old ? 'old' : 'new', flatHeads = style !== 'old';
    // The junction's control cabinet, on the pavement at a corner.
    put(b, 'sigbox', a - 1.5, GY, -(rw + 2.7), [0, 1]);
    b.block(a - 1.86, GY, -(rw + 2.96), a - 1.14, GY + 1.56, -(rw + 2.44));
    zones.push([a - 9, c + 9]);
    /** Signal masts standing at this junction's corners: a pedestrian head goes on one beside a crosswalk instead of a post of its own. */
    const masts: { x: number; z: number }[] = [];
    // Narrow junctions with a signal of their own take either the utility-pole bracket or the short-arm pole.
    // (Never a head on a utility pole: a narrow street's own signal stands on the short-arm steel pole.)
    const short = sideLit;
    if (short) for (const sz of [1, -1] as const) {
      if (tee && sz === shut) continue;
      masts.push({ x: mid + left([0, sz])[0] * (half + 0.9), z: sz * (rw + 1.3) });
    }
    // Main road: far-side signals, heads over the general and bus lanes.
    for (const sx of [1, -1] as const) {
      const h: V2 = [sx, 0], l = left(h);
      const mx = sx > 0 ? c + 1.2 : a - 1.2, mz = l[1] * (rw + 0.7);
      // The main head beyond the junction on the left; back to back with it, the near-side head for the other way.
      vehicleSignal(b, mx, mz, h, rw + 0.7 - (GEN + LANE) / 2, 0, jname, { style, arrow: avenue && wide, back: true, zebra: (g.seed + ji) % 3 === 0 });
      masts.push({ x: mx, z: mz });
      const cn = g.roads?.cross[ji];
      if (cn) roadName(b, mx, mz, [-sx, 0], cn);
      // Queue at the stop line (x = a − 7 going +x, c + 7 going −x).
      const stop = sx > 0 ? a - 7.4 : c + 7.4;
      // (The queue is moving traffic now; the draws stay so the street keeps its look.)
      for (let k = 0; k < 2; k++) anyCar();
      if (r() < 0.6) anyCar();
      const at = sx > 0 ? stop + X : X - stop, exit = sx > 0 ? c + 7.4 + X : X - (a - 7.4);
      mainStops[sx > 0 ? 0 : 1].push({ at: at - 0.5, axis: sa(0), exit });
      // Arrows before the stop line: ahead or right from the general lane, ahead or left from the bus lane.
      mark(b, wide ? 'ahead-right' : 'ahead', stop - sx * 16, laneZ(sx, GEN), h, 1.3, 5);
      mark(b, 'ahead-left', stop - sx * 16, laneZ(sx, BUS), h, 1.3, 5);
      // Crosswalk warning: two diamonds, and the sign at the kerb.
      for (const d of [30, 42]) mark(b, 'diamond', stop - sx * d, laneZ(sx, GEN), h, 1.5, 5);
      roadSign(b, 'crossing', stop - sx * 14, l[1] * (rw + 0.75), [-sx, 0]);
    }
    // Pedestrian signals on the crosswalks over the main road (at a − 4 and c + 4): walk with the cross traffic.
    for (const xw of [a - 4, c + 4]) {
      const e = xw < mid ? -2.4 : 2.4;
      const po = { flat: flatHeads, button: !wide, speaker: avenue || wide };
      for (const s of [-1, 1] as const) {
        const m = masts.find((q) => Math.sign(q.z) === s && Math.abs(q.x - xw) < 4.5);
        if (m) mastPed(b, m.x, m.z, [0, -s], 1, po);
        else pedSignal(b, xw + e, s * (rw + 0.8), [0, -s], 1, po);
      }
      // Bollards at the crosswalk mouths.
      for (const s of [-1, 1]) for (const dx of [-1.6, 0, 1.6]) {
        put(b, 'bollard', xw + dx, GY, s * (rw + 0.35), [0, -1]);
        b.block(xw + dx - 0.08, GY, s * (rw + 0.35) - 0.08, xw + dx + 0.08, GY + 0.85, s * (rw + 0.35) + 0.08);
      }
    }
    // The crossing road.
    for (const sz of [1, -1] as const) {
      if (tee && sz === shut) continue;
      const h: V2 = [0, sz], l = left(h);
      // Its traffic's half: x from the centre line out to the kerb on its left.
      const lx = (d: number) => mid + l[0] * d;
      /**
       * A lane of this road for the moving traffic, d from its centre line. A road that runs through is
       * one lane from edge to edge. One that ends at the main road (a tee) is a lane in, which everybody
       * leaves by turning, and a lane out on its other half, which only turning traffic feeds.
       */
      const crossLane = (dir: 1 | -1, d: number, o: { speed: number; flow: number; use: 'general' | 'all' }) => {
        const stops = [{ at: ZE - (rw + 6.4) - 0.5, axis: sa(1), exit: ZE + rw + 6.4 }];
        o = { ...o, flow: o.flow * (g.flows?.[ji] ?? 1) };
        if (!tee) return trafficLane(b, lx(d), -dir * ZE, lx(d), dir * ZE, { ...o, taxi, stops, halts: [] });
        trafficLane(b, lx(d), -dir * ZE, lx(d), dir * (GEN + 0.1), { ...o, taxi, stops, halts: [], dead: true });
        trafficLane(b, 2 * mid - lx(d), dir * (GEN + 0.1), 2 * mid - lx(d), -dir * ZE, { ...o, flow: 0, taxi, stops: [], halts: [] });
      };
      // Stop line before the crosswalk (which lies 1.2 … 5.2 m outside the main road's kerb).
      const stopZ = -sz * (rw + 6.4);
      b.deco('flat:#e9e9e4', Math.min(mid, lx(half - 0.2)), 0.004, stopZ - 0.2, Math.max(mid, lx(half - 0.2)), 0.01, stopZ + 0.2);
      if (wide) {
        vehicleSignal(b, lx(half + 0.7), sz * (rw + 1.2), h, half + 0.7 - half / 2, 1, jname, { style, back: !tee });
        if (g.roads) roadName(b, lx(half + 0.7), sz * (rw + 1.2), [0, -sz], g.roads.main);
        // Two lanes each way: a queue in each.
        for (const [d, n] of [[half * 0.27, 2], [half * 0.74, 1]] as const) {
          // (The queue is moving traffic now; the draws stay so the street keeps its look.)
          for (let k = 0; k < n; k++) anyCar();
          crossLane(sz, d, { speed: 30 / 3.6, flow: (n > 1 ? 5 : 3.5) * busy, use: tee ? 'general' : 'all' });
        }
        mark(b, 'ahead', lx(half * 0.27), stopZ - sz * 16, h, 1.3, 5);
        mark(b, 'ahead-left', lx(half * 0.74), stopZ - sz * 16, h, 1.3, 5);
        // Pedestrian signals on the crosswalk over this road: walk with the main road's traffic.
        const zc = -sz * (rw + 3.2);
        pedSignal(b, a - 0.8, zc - sz * 2.4, [1, 0], 0, { flat: flatHeads, speaker: true });
        pedSignal(b, c + 0.8, zc - sz * 2.4, [-1, 0], 0, { flat: flatHeads, speaker: true });
      } else {
        // A side street: stop sign on the left kerb, 止まれ on the road, a mirror at the far corner.
        if (short) {
          shortSignal(b, lx(half + 0.9), sz * (rw + 1.3), h, 1, jname, !tee);
          if (g.roads) roadName(b, lx(half + 0.9), sz * (rw + 1.3), [0, -sz], g.roads.main);
        } else {
          roadSign(b, 'stop', lx(half + 0.55), stopZ - sz * 0.6, [0, -sz], 0.8);
          mark(b, 'stop', lx(half / 2), stopZ - sz * 4.6, h, 1.9, 5.6);
        }
        put(b, 'mirror', lx(-(half + 0.7)) , GY, sz * (rw + 1.2), [0, -sz]);
        if (r() < 0.8) r();
        // Side-street traffic waits for the main road's red, signal or stop sign alike.
        crossLane(sz, half / 2, { speed: 25 / 3.6, flow: 1.6 * busy, use: 'general' });
        // Delineator posts at the corner on its left as you turn in.
        for (const dz of [0.5, 1.5, 2.5]) put(b, 'wand', lx(half + 0.35), GY, -sz * (rw + 0.4 + dz), [0, -1]);
        // 30 km/h and the school route warning as you turn in; utility poles and their wires down its left kerb.
        roadSign(b, 'speed30', lx(-(half + 0.55)), stopZ - sz * 9, [0, sz], 0.6, 'school');
        poleLine(b, { axis: 'z', from: -sz * (rw + 12), to: -sz * (ZE - 4), at: lx(half + 0.9), road: -l[0] as 1 | -1, drops: 2.2, cross: 2 * half + 2.4, name: g.name });
      }
    }
    // For people on foot at every junction: a finger post and a map on the −z side, and a hydrant sign.
    {
      const fx = c + 6.5, fz = -(rw + 3.4);
      put(b, 'fingerpost', fx, GY, fz, [0, 1]);
      b.block(fx - 0.08, GY, fz - 0.08, fx + 0.08, GY + 2.6, fz + 0.08);
      const arms: [string, string][] = [[`${g.name.ja}駅`, `${g.name.en} Sta.`], ['バスのりば', 'Buses'], ['タクシーのりば', 'Taxis']];
      FINGER.forEach(([y, sx], i) => {
        for (const s of [1, -1] as const) {
          // The post faces +z, so its +x is frame −x.
          b.sign({ k: 'label', text: arms[i][0], sub: arms[i][1], fg: '#fff', bg: '#1f5fae' }, fx - sx * 0.56, GY + y, fz + s * 0.025, [0, s], 0.96, 0.17);
        }
      });
      if (g.at) {
        const mx = a - 6.5;
        put(b, 'mapstand', mx, GY, fz, [0, 1]);
        b.block(mx - 0.8, GY, fz - 0.06, mx + 0.8, GY + 2.1, fz + 0.06);
        b.sign({ k: 'areamap', station: g.at.id }, mx, GY + 1.45, fz + 0.05, [0, 1], 1.44, 1.04);
      }
      roadSign(b, 'hydrant', c + 13, rw + 0.75, [-1, 0], 0.5);
    }
    // Direction boards over the main road's approaches to a wide junction.
    if (wide) {
      for (const sx of [1, -1] as const) {
        const h: V2 = [sx, 0], l = left(h), f: V2 = [-sx, 0];
        const ahead = sx > 0 ? dest.px : dest.nx, toLeft = l[1] > 0 ? dest.pz : dest.nz, toRight = l[1] > 0 ? dest.nz : dest.pz;
        const rows: { ja: string; en: string; arrow: Arrow }[] = [];
        if (toLeft) rows.push({ ...toLeft, arrow: 'left' });
        if (ahead) rows.push({ ...ahead, arrow: 'up' });
        if (toRight) rows.push({ ...toRight, arrow: 'right' });
        if (!rows.length) continue;
        const mx = (sx > 0 ? a : c) - sx * 46, mz = l[1] * (rw + 0.9);
        if (Math.abs(mx) > X - 4) continue;
        put(b, 'gantry', mx, GY, mz, f);
        b.block(mx - 0.3, GY, mz - 0.3, mx + 0.3, GY + 3, mz + 0.3);
        const [ox, oz] = off(f, BOARD.cx, -0.16);
        b.sign({ k: 'roadboard', rows: rows.map(({ ja, en, arrow }) => ({ ja, en, arrow })) }, mx + ox, GY + BOARD.cy, mz + oz, f, BOARD.w, BOARD.h);
      }
    }
    // A scramble: two diagonal crosswalks over the junction box, as rows of short bars.
    if (SCR) {
      const x0 = a - 2, x1 = c + 2, z0 = -(rw - 0.6), z1 = rw - 0.6;
      for (const flip of [1, -1]) {
        const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (flip * (z1 - z0)) / len, nx = -uz, nz = ux;
        for (let t = 1.2; t < len - 1.2; t += 0.9) {
          for (let w = -1.6; w <= 1.6; w += 0.8) {
            const x = (x0 + x1) / 2 + (t - len / 2) * ux + w * nx, z = (t - len / 2) * uz + w * nz;
            b.deco('flat:#e9e9e4', x - 0.22, 0.004, z - 0.22, x + 0.22, 0.01, z + 0.22);
          }
        }
      }
    }
  }
  SCR = false;

  // ── Between the junctions: bus and bicycle lanes, speed limit, parking, traffic ──
  const clear = (x: number, m: number) => !zones.some(([p, q]) => x > p - m && x < q + m);
  const cuts = [-X, ...zones.flatMap(([p, q]) => [p, q]), X];
  // ── Bus stops: one each way, on the longest stretch, clear of the junctions ──
  for (const sx of [1, -1] as const) {
    const h: V2 = [sx, 0], s = left(h)[1];
    const x = g.busX?.[sx > 0 ? 0 : 1] ?? busStopX(streets, sx);
    if (x === null || !clear(x, 6) || Math.abs(x) > X - 20) continue;
    const f: V2 = [0, -s]; // facing the road
    put(b, 'busstop', x + sx * 6.5, GY, s * (rw + 0.75), f);
    b.block(x + sx * 6.5 - 0.1, GY, s * (rw + 0.75) - 0.1, x + sx * 6.5 + 0.1, GY + 2.2, s * (rw + 0.75) + 0.1);
    const [ox, oz] = off(f, 0, -0.045);
    b.sign({ k: 'label', text: 'バス', sub: 'BUS', fg: '#1f2023', bg: '#f4f4f0' }, x + sx * 6.5 + ox, GY + 2.62, s * (rw + 0.75) + oz, f, 0.34, 0.34);
    b.sign({ k: 'label', text: g.name.ja, sub: `${g.name.en} · Bus stop`, fg: '#1f2023', bg: '#f4f4f0' }, x + sx * 6.5 + ox, GY + 1.5, s * (rw + 0.75) + oz, f, 0.5, 0.82);
    roadSign(b, 'nostopping', x - sx * 9, s * (rw + 0.75), [-sx, 0], 0.6);
    put(b, 'shelter', x, GY, s * (rw + 2.7), f);
    b.block(x - 1.95, GY, s * (rw + 2.7) + s * 0.6, x + 1.95, GY + 2.4, s * (rw + 2.7) + s * 0.8);
    b.block(x - 1.4, GY, s * (rw + 2.7) + s * 0.15, x + 1.4, GY + 0.5, s * (rw + 2.7) + s * 0.6);
    // Buses pull in to the kerb here, wait and pull out again (the guard rail is left open here: kerbGaps).
    halts[sx > 0 ? 0 : 1].push({ at: (sx > 0 ? x + X : X - x) + 0.5, side: rw - 1.45 - KERB_LANE });
  }
  // Taxis waiting at the kerb on the −x-bound side, behind one another.
  // They come and go (traffic/system.ts): the stand is as long as the kerb is clear behind its first place.
  let places = 0;
  const TX = g.taxiX ?? TAXI_X;
  while (places < 3 && clear(TX + places * 5.6, 3)) places++;
  if (places) halts[1].push({ at: X - TX, side: rw - 1.05 - KERB_LANE, rank: places });

  // Along a canal: shopping-street lamps on both banks, clear of the bridge.
  if (g.canal !== undefined) {
    for (const s of [-1, 1]) for (const e of [-1, 1]) {
      for (let d = 16; d < Z - rw - 8; d += 24) streetLamp(b, 'lamp_shop', g.canal + e * 9.4, s * (rw + d), [-e, 0]);
    }
  }

  for (let i = 0; i < cuts.length; i += 2) {
    const x0 = cuts[i], x1 = cuts[i + 1];
    if (x1 - x0 < 12) continue;
    for (const sx of [1, -1] as const) {
      const h: V2 = [sx, 0], l = left(h), s = l[1];
      // Bicycle lane, as Japanese roads paint it: blue arrow-feather dashes at the kerb, not a solid
      // strip. Bus lane: no tint, a broad white line and its lettering.
      for (let x = x0 + 2; x < x1 - 2; x += 5) {
        const zi = s * (rw - 1.35), zo = s * (rw - 0.25);
        b.deco('flat:#2f6fb0', x, 0.004, Math.min(zi, zo), x + 1.6, 0.009, Math.max(zi, zo));
      }
      b.deco('flat:#e9e9e4', x0, 0.004, s * (rw - 1.5) - 0.06, x1, 0.01, s * (rw - 1.5) + 0.06);
      b.deco('flat:#e9e9e4', x0, 0.004, s * (LANE + 0.15) - 0.1, x1, 0.01, s * (LANE + 0.15) + 0.1);
      const from = sx > 0 ? x0 : x1; // where this direction enters the stretch
      for (let d = 14; d < x1 - x0 - 26; d += 44) {
        mark(b, 'bus', from + sx * d, laneZ(sx, BUS), h, 1.9, 7.4);
        mark(b, 'bike', from + sx * (d + 14), laneZ(sx, BIKE), h, 1.0, 1.6);
      }
      if (x1 - x0 > 50) {
        mark(b, '40', from + sx * 30, laneZ(sx, GEN), h, 1.9, 4.6);
        roadSign(b, 'speed40', from + sx * 9, s * (rw + 0.75), [-sx, 0]);
        roadSign(b, 'noparking', from + sx * (x1 - x0) * 0.55, s * (rw + 0.75), [-sx, 0], 0.6);
      }
      // Street lights on this kerb, staggered between the two sides.
      if (g.lamp) {
        const gaps = kerbGaps(streets, g.busX, g.taxiX).filter((k) => k.s === s);
        for (let x = x0 + (s > 0 ? 8 : 19); x < x1 - 6; x += 22) if (!gaps.some((k) => x > k.x0 - 1 && x < k.x1 + 1)) streetLamp(b, g.lamp, x, s * (rw + 0.95), [0, -s]);
      }
      // (Mid-block traffic moves now; the draws stay so the street keeps its look.)
      for (let k = 0; k < Math.floor((x1 - x0) / 34); k++) {
        const x = x0 + 8 + r() * (x1 - x0 - 16);
        if (clear(x, 4)) {
          anyCar();
          r();
        }
      }
    }
  }

  // ── Moving traffic: the main road's lanes, each way ──
  const main = rw >= 8 ? 40 / 3.6 : 30 / 3.6;
  for (const sx of [1, -1] as const) {
    const i = sx > 0 ? 0 : 1, stops = mainStops[i].sort((p, q) => p.at - q.at);
    trafficLane(b, -sx * X, laneZ(sx, GEN), sx * X, laneZ(sx, GEN), { speed: main, flow: (rw >= BUS_LANE_RW ? 7 : rw >= 8 ? 6.5 : 5) * busy, use: busLane ? 'general' : 'all', taxi, stops, halts: busLane ? [] : halts[i] });
    if (busLane) trafficLane(b, -sx * X, laneZ(sx, BUS), sx * X, laneZ(sx, BUS), { speed: main, flow: 2.6 * busy, use: 'bus', taxi, stops, halts: halts[i] });
    // Cyclists keep to the bicycle lane at the kerb, and go round the taxi stand that stands in it.
    const round = sx < 0 && places ? { from: X - TX - (places - 1) * 6.2 - 11, to: X - TX + 4, side: 2.3 } : undefined;
    trafficLane(b, -sx * X, laneZ(sx, BIKE), sx * X, laneZ(sx, BIKE), { speed: 15 / 3.6, flow: 1.5 * busy, use: 'cycle', taxi: 0, stops, halts: [], avoid: round });
  }

}
