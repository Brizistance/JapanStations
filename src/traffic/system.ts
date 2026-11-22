// Moving road traffic on one station's streets. Pure TS: no rendering, no station data.
//
// A street is a set of straight lanes (world/builder.ts LanePart, laid by stations/roads.ts and
// surface.ts). Where two lanes cross at a signalled junction a vehicle may turn from one into
// the other on a quarter circle: the turns are worked out here from the lanes' geometry. Each
// vehicle follows a route (a lane; or a lane, an arc and a second lane) from one edge of the
// plot to another.
//
// Each vehicle keeps a safe distance to whatever is ahead of it on its route: another vehicle
// (found by geometry, whatever lane it is in), a red or yellow signal's stop line, a junction it
// could not clear, oncoming traffic when it turns right, a bus stop (buses), and a person in the
// road. A vehicle never moves further than the room it has, so vehicles cannot overlap or run
// anybody over, whatever the time step.

import type { LanePart } from '../world/builder';
import { rng } from '../world/builder';
import { signalState } from './signals';
import { DRIVEN, HEAVY, VEH, family, timeFactor } from './vehicles';

/** A stretch of a route: a straight line, or an arc about (cx, cz) turning by `w` (+1 or −1) radians per radius. */
interface Piece {
  /** Distance along the route where it begins, and its length. */
  start: number;
  len: number;
  /** Where it begins, and the heading there. */
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Arc: centre, radius, the angle of its first point and the sense. Radius 0 for a line. */
  cx: number;
  cz: number;
  r: number;
  a0: number;
  w: number;
  /** Line: the lane it runs along, and the lane's distance where the piece begins. */
  lane: Lane | null;
  from: number;
}

export interface Route {
  pieces: Piece[];
  len: number;
  /** Signal stop lines and bus stops, as distances along the route. */
  stops: LanePart['stops'];
  /** Where its vehicles pull up (route distance of their middle), and how long they wait there, from … to seconds. */
  halts: number[];
  dwell: [number, number];
  /** Leaving a bay: the lane rejoined and the lane distance where, to give way to what comes up it. */
  merge: { lane: Lane; at: number } | null;
  /** Pulling in to a bay: where it waits (route distance) while anything is on that stretch (lane distances) of the lanes between it and the kerb. */
  enter: { hold: number; from: number; to: number; lanes: Lane[] } | null;
  yields: NonNullable<LanePart['yields']>;
  gates: NonNullable<LanePart['gates']>;
  turn: Turn | null;
}

/** A turn from one lane into another at a signalled junction. */
interface Turn {
  route: Route;
  left: boolean;
  /** Share of the lane's vehicles that take it, where they could also go straight on. */
  share: number;
  /** Distance along the first lane where the junction is: turns at the same junction share it. And the place itself. */
  at: number;
  px: number;
  pz: number;
  /** Route distances of the arc. */
  arc0: number;
  arc1: number;
  /** Top speed round the arc. */
  speed: number;
  /**
   * Where the vehicle's middle waits for a gap, and the lanes it must give way to with the lane
   * distance of the place it crosses each: the oncoming lanes for a right turn, and for a left turn
   * the lanes between it and the kerb (`same`: a bus lane, whose traffic comes up from behind).
   */
  hold: number;
  oncoming: { lane: Lane; at: number; same: boolean }[];
  /** The right turns that face this one across the junction: only one of them is on its arc at a time. */
  facing: Turn[];
}

export interface Vehicle {
  id: number;
  model: string;
  /** Distance of its middle along its route, and its speed. */
  s: number;
  v: number;
  len: number;
  wid: number;
  hgt: number;
  heavy: boolean;
  route: Route;
  /** The lane it entered by, and the one it is in now (null on an arc) with its distance along that. */
  origin: Lane;
  lane: Lane | null;
  ls: number;
  /** Bus stops served so far, and seconds still to wait at the current one. */
  served: number;
  dwell: number;
  /** Seconds it has stood blocked by crossing traffic (a jam nobody can leave is cleared). */
  jam: number;
  /** Seconds of green it has stood through at the start of its turn, unable to make it. */
  wait: number;
  /** On a curve of its route now, and how tight: 1 / radius, positive turning right. Its acceleration, smoothed. */
  curve: boolean;
  bend: number;
  acc: number;
  /** -1 turning left soon or now, 1 right, 0 neither; and whether it is slowing (for its lamps). */
  blink: -1 | 0 | 1;
  braking: boolean;
  /** Middle of its footprint on the road and its heading (unit), in the lanes' frame. */
  x: number;
  y: number;
  z: number;
  hx: number;
  hz: number;
}

export interface Lane {
  index: number;
  part: LanePart;
  len: number;
  /** Unit direction (x, z). */
  ux: number;
  uz: number;
  straight: Route;
  turns: Turn[];
  /** The way buses go (by their stop) and the way of a taxi bound for the stand, where the lane has them. */
  busRoute: Route | null;
  rankRoute: Route | null;
  rank: number;
  /** Seconds (of peak-hour traffic) until the next vehicle is due, and the one waiting to enter. */
  next: number;
  pending: Vehicle | null;
  sinceBus: number;
  rand: () => number;
}

export interface Traffic {
  lanes: Lane[];
  list: Vehicle[];
  /** Vehicles taken off the road because they stood in a jam nobody could leave. */
  cleared: number;
  ids: number;
  /** Sim time of the last step: the hour decides what kinds of vehicle set out. */
  time: number;
}

/** Somebody on foot, in the lanes' frame (feet). */
export interface Walker {
  x: number;
  y: number;
  z: number;
}

/** Gap kept behind a standing vehicle, comfortable braking, and the limits of acceleration and braking (m, m/s²). */
const GAP = 1.7, COMFORT = 2.6, ACCEL = 2.1, ACCEL_HEAVY = 1.2, BRAKE = 7.5;
/** How far in front of a person a vehicle stops, and how far to the side of its body a person still stops it. */
const PERSON_AHEAD = 1.3, PERSON_SIDE = 0.9;
/** Seconds between buses on a lane at the busiest hour. */
const BUS_EVERY = 100;
/** Radius of a left (near) and a right (far) turn, and the sideways pull a turn is taken at (m, m/s²). */
const R_LEFT = 6, R_RIGHT = 9.5, TURN_PULL = 1.7;
/** Share of vehicles turning left and right at a junction where they could also go straight on. */
/** Seconds of green a driver waits to make a turn before going another way. */
const GIVE_UP = 18;
const P_LEFT = 0.15, P_RIGHT = 0.1, P_RIGHT_NARROW = 0.04;
/** The share of a main road's kerb-side traffic turning off into any one small street. */
const P_MINOR = 0.04;

// ── Routes ──

function line(start: number, lane: Lane, from: number, to: number): Piece {
  const p = lane.part;
  return { start, len: to - from, x: p.from[0] + lane.ux * from, z: p.from[2] + lane.uz * from, hx: lane.ux, hz: lane.uz, cx: 0, cz: 0, r: 0, a0: 0, w: 0, lane, from };
}

const pose = { x: 0, z: 0, hx: 1, hz: 0 };
/** Position and heading at distance s along a route (before its start: on the first lane, run back). Fills `pose`. */
function poseAt(route: Route, s: number) {
  let p = route.pieces[0];
  for (let i = 1; i < route.pieces.length && s >= route.pieces[i].start; i++) p = route.pieces[i];
  const t = s - p.start;
  if (p.r === 0) {
    pose.x = p.x + p.hx * t; pose.z = p.z + p.hz * t; pose.hx = p.hx; pose.hz = p.hz;
  } else {
    const a = p.a0 + (p.w * Math.min(t, p.len)) / p.r, c = Math.cos(a), sn = Math.sin(a);
    pose.x = p.cx + p.r * c; pose.z = p.cz + p.r * sn; pose.hx = -p.w * sn; pose.hz = p.w * c;
  }
  return p;
}

/** Lanes going the same way on the same road as `a`, with how far each lies to its right. */
function beside(a: Lane, lanes: Lane[]): { lane: Lane; off: number }[] {
  const out: { lane: Lane; off: number }[] = [];
  for (const o of lanes) {
    if (o.ux * a.ux + o.uz * a.uz < 0.9 || Math.abs(o.part.from[1] - a.part.from[1]) > 2) continue;
    const dx = o.part.from[0] - a.part.from[0], dz = o.part.from[2] - a.part.from[2];
    const off = dx * -a.uz + dz * a.ux;
    if (Math.abs(off) < 14) out.push({ lane: o, off });
  }
  return out;
}

/** A bus lane or a bicycle lane: nobody turns out of or into one. */
const kerbside = (l: Lane) => l.part.use === 'bus' || l.part.use === 'cycle';

/** The turns out of lane `a`: into every lane that crosses it just after one of its stop lines. */
function turnsOf(a: Lane, lanes: Lane[]): Turn[] {
  const out: Turn[] = [];
  if (kerbside(a)) return out;
  const mine = beside(a, lanes).filter((s) => !kerbside(s.lane));
  const leftmost = !mine.some((s) => s.off < -0.5), rightmost = !mine.some((s) => s.off > 0.5);
  for (const b of lanes) {
    // (Nor between levels: an expressway over a junction is not a turning.)
    if (kerbside(b) || Math.abs(a.ux * b.ux + a.uz * b.uz) > 0.1 || Math.abs(a.part.from[1] - b.part.from[1]) > 2) continue;
    const dx = b.part.from[0] - a.part.from[0], dz = b.part.from[2] - a.part.from[2];
    // Where the two cross: t along a, u along b.
    const t = dx * a.ux + dz * a.uz, u = -(dx * b.ux + dz * b.uz);
    if (t <= 0 || t > a.len + 0.5 || u < 0 || b.len - u < 15) continue;
    const stop = [...a.part.stops].reverse().find((s) => s.at < t);
    // Into a small street from the main road: a left turn anywhere along the block, no stop line needed.
    const intoMinor = b.part.use === 'minor' && a.part.use !== 'minor';
    if (!intoMinor && (!stop || t - stop.at > 45)) continue;
    const left = a.ux * b.uz - a.uz * b.ux < 0;
    if (intoMinor && !left) continue;
    // Out of a small street only to the left, into the near side of the road: no crossing the traffic.
    if (a.part.use === 'minor' && !left) continue;
    // Turn from the lane on that side into the lane on that side: nobody cuts across a lane going the same way.
    const theirs = beside(b, lanes).filter((s) => !kerbside(s.lane));
    if (left ? !leftmost || theirs.some((s) => s.off < -0.5) : !rightmost || theirs.some((s) => s.off > 0.5)) continue;
    const r = Math.min(left ? R_LEFT : R_RIGHT, stop ? t - stop.at - 0.5 : R_LEFT, b.len - u - 6);
    if (r < 3.5) continue;
    const first = line(0, a, 0, t - r);
    const sx = first.x + a.ux * first.len, sz = first.z + a.uz * first.len;
    const cx = sx + b.ux * r, cz = sz + b.uz * r, a0 = Math.atan2(sz - cz, sx - cx);
    const w = -Math.sin(a0) * a.ux + Math.cos(a0) * a.uz > 0 ? 1 : -1;
    const arcLen = (Math.PI / 2) * r;
    const arc: Piece = { start: first.len, len: arcLen, x: sx, z: sz, hx: a.ux, hz: a.uz, cx, cz, r, a0, w, lane: null, from: 0 };
    const last = line(first.len + arcLen, b, u + r, b.len);
    const route: Route = {
      pieces: [first, arc, last], len: last.start + last.len, turn: null, dwell: [0, 0], merge: null, enter: null, yields: [], gates: [],
      stops: [...a.part.stops.filter((s) => s.at < t - r), ...b.part.stops.filter((s) => s.at > u + r).map((s) => ({ at: s.at - (u + r) + last.start, axis: s.axis, exit: s.exit - (u + r) + last.start }))],
      halts: [],
    };
    // A right turn crosses the lanes coming the other way: it waits short of the middle of the road.
    const oncoming: Turn['oncoming'] = [];
    let near = Infinity;
    if (!left) {
      for (const o of lanes) {
        if (o.ux * a.ux + o.uz * a.uz > -0.9) continue;
        const ox = o.part.from[0] - a.part.from[0], oz = o.part.from[2] - a.part.from[2];
        const off = ox * -a.uz + oz * a.ux;
        if (off <= 0 || off > 40) continue;
        // Where lane o meets lane b's line.
        const at = (b.part.from[0] - o.part.from[0]) * o.ux + (b.part.from[2] - o.part.from[2]) * o.uz;
        if (at < 0 || at > o.len) continue;
        oncoming.push({ lane: o, at, same: false });
        near = Math.min(near, off);
      }
    } else {
      for (const s of beside(a, lanes)) {
        if (s.off > -0.5) continue;
        const at = (b.part.from[0] - s.lane.part.from[0]) * s.lane.ux + (b.part.from[2] - s.lane.part.from[2]) * s.lane.uz;
        if (at >= 0 && at <= s.lane.len) oncoming.push({ lane: s.lane, at, same: true });
      }
    }
    // A right-turner waiting for a gap holds up everybody behind it: few turn right into a narrow side street.
    const share = intoMinor ? P_MINOR : left ? P_LEFT : theirs.length > 1 ? P_RIGHT : P_RIGHT_NARROW;
    const turn: Turn = { route, left, share, at: t, px: a.part.from[0] + a.ux * t, pz: a.part.from[2] + a.uz * t, arc0: first.len, arc1: first.len + arcLen, speed: Math.sqrt(TURN_PULL * r), hold: first.len, oncoming, facing: [] };
    if (near < Infinity) {
      // As far round the arc as a car's front right corner stays on its own side of the road.
      const room = near / 2 - 0.25;
      for (let th = 0; th < Math.PI / 2; th += 0.04) {
        if (r * (1 - Math.cos(th)) + 2.25 * Math.sin(th) + 0.86 * Math.cos(th) > room) break;
        turn.hold = first.len + r * th;
      }
    }
    route.turn = turn;
    out.push(turn);
  }
  return out.sort((p, q) => p.at - q.at);
}

export function makeTraffic(parts: LanePart[], seed: number): Traffic {
  const lanes = parts.map((part, index): Lane => {
    const dx = part.to[0] - part.from[0], dz = part.to[2] - part.from[2], len = Math.hypot(dx, dz) || 1;
    const rand = rng(seed * 31 + index * 977 + 5);
    const lane: Lane = {
      index, part, len, ux: dx / len, uz: dz / len, straight: null as unknown as Route, turns: [], busRoute: null, rankRoute: null, rank: 0,
      next: part.flow > 0 ? rand() * (60 / part.flow) : Infinity, pending: null, sinceBus: rand() * BUS_EVERY, rand,
    };
    lane.straight = { pieces: [line(0, lane, 0, len)], len, stops: part.stops, halts: [], dwell: [0, 0], merge: null, enter: null, yields: part.yields ?? [], gates: part.gates ?? [], turn: null };
    const round = part.avoid && aside(lane, part.avoid.from, part.avoid.to, -part.avoid.side);
    if (round) lane.straight = round.route;
    for (const h of part.halts) {
      const route = bayRoute(lane, h);
      if (!route) continue;
      if (h.rank) {
        lane.rankRoute = route;
        lane.rank = h.rank;
      } else lane.busRoute = route;
    }
    return lane;
  });
  for (const lane of lanes) lane.turns = turnsOf(lane, lanes);
  // A bay lies across whatever lanes run between its lane and the kerb (the bicycle lane).
  for (const lane of lanes) {
    for (const route of [lane.busRoute, lane.rankRoute]) {
      if (route?.enter) route.enter.lanes = beside(lane, lanes).filter((s) => s.off < -0.5).map((s) => s.lane);
    }
  }
  // Two right turns facing each other across a junction cross each other's way in the middle of it:
  // there each waits at the start of its arc, clear of the other's, not out in the middle.
  for (const a of lanes) {
    for (const t of a.turns) {
      if (t.left) continue;
      for (const o of lanes) {
        if (o.ux * a.ux + o.uz * a.uz > -0.9) continue;
        for (const q of o.turns) if (!q.left && Math.hypot(q.px - t.px, q.pz - t.pz) < 30) t.facing.push(q);
      }
      if (t.facing.length) t.hold = t.arc0;
    }
  }
  const tr: Traffic = { lanes, list: [], cleared: 0, ids: 0, time: 12 * 3600 };
  // A taxi stand starts with taxis on it.
  for (const lane of lanes) {
    const route = lane.rankRoute;
    for (let k = 0; route && k < lane.rank; k++) {
      const v = create(tr, lane, 'taxi', route);
      v.s = route.halts[0] - k * RANK_PITCH;
      if (k === 0) v.dwell = 5 + lane.rand() * 40;
      place(v);
      tr.list.push(v);
    }
  }
  return tr;
}

/** Radius of the gentle curves into and out of a bay, and the length of a place on a taxi stand. */
const R_BAY = 30, RANK_PITCH = 6.2;

/** The piece that follows `p`: an arc of `len` to the left (w −1) or right (w +1), or with r 0 a straight run off any lane. */
function after(p: Piece, r: number, w: number, len: number): Piece {
  poseAt({ pieces: [p] } as Route, p.start + p.len);
  const { x, z, hx, hz } = pose;
  const a0 = Math.atan2(-w * hx, w * hz);
  return { start: p.start + p.len, len, x, z, hx, hz, cx: x - r * Math.cos(a0), cz: z - r * Math.sin(a0), r, a0, w, lane: null, from: 0 };
}

/**
 * The route by a kerbside bay: along the lane, a gentle S to the left, straight along the kerb past
 * the stopping place, and an S back into the lane. With `side` 0 the vehicle stops in the lane.
 */
function bayRoute(lane: Lane, h: LanePart['halts'][number]): Route | null {
  const part = lane.part, dwell: [number, number] = h.rank ? [25, 70] : [11, 18];
  const base = { stops: part.stops, yields: part.yields ?? [], gates: part.gates ?? [], turn: null, dwell, enter: null };
  if (h.side < 0.3) return { ...base, pieces: [line(0, lane, 0, lane.len)], len: lane.len, halts: [h.at], merge: null };
  const f0 = h.at - (h.rank ? (h.rank - 1) * RANK_PITCH + 4 : 1.5);
  const way = aside(lane, f0, h.at + 1.5, h.side);
  return way && { ...way.route, halts: [way.free + (h.at - f0)], dwell, merge: { lane, at: way.back }, enter: { hold: way.route.pieces[1].start, from: way.route.pieces[1].start - 14, to: f0 + 3, lanes: [] } };
}

/**
 * A lane's route with a stretch (lane distances f0 … f1) driven `side` metres to its left (to the
 * right if negative): a gentle S out, straight, and an S back. Null if the lane is too short for it.
 */
function aside(lane: Lane, f0: number, f1: number, side: number): { route: Route; free: number; back: number } | null {
  const part = lane.part, w = side > 0 ? -1 : 1;
  const th = Math.acos(1 - Math.abs(side) / (2 * R_BAY)), run = 2 * R_BAY * Math.sin(th), arc = R_BAY * th;
  const out = f0 - run, back = f1 + run;
  if (out < 5 || back > lane.len - 5) return null;
  const p0 = line(0, lane, 0, out), p1 = after(p0, R_BAY, w, arc), p2 = after(p1, R_BAY, -w, arc), p3 = after(p2, 0, 0, f1 - f0);
  const p4 = after(p3, R_BAY, -w, arc), p5 = after(p4, R_BAY, w, arc), p6 = line(p5.start + p5.len, lane, back, lane.len);
  // The curves are a little longer than the lane they leave: what lies beyond moves down the route by that much.
  const extra = p6.start - back;
  const move = (at: number) => (at < out ? at : at + (at > back ? extra : extra / 2));
  return {
    free: p3.start, back: back - run / 2,
    route: {
      pieces: [p0, p1, p2, p3, p4, p5, p6], len: p6.start + p6.len, halts: [], dwell: [0, 0], turn: null, merge: null, enter: null,
      stops: part.stops.map((s) => ({ ...s, at: move(s.at), exit: move(s.exit) })),
      yields: (part.yields ?? []).map((s) => ({ ...s, at: move(s.at) })),
      gates: (part.gates ?? []).map((s) => ({ ...s, at: move(s.at) })),
    },
  };
}

/**
 * What sets out next on a lane. The hour shifts the mix: more taxis at the rush hours and late at
 * night, when little else is about; delivery trucks through the morning; few cyclists after dark.
 */
function pickModel(lane: Lane, time: number): string {
  const { part, rand } = lane;
  const hour = (((time / 3600) % 24) + 24) % 24;
  const night = hour >= 22 || hour < 5, rush = (hour >= 7 && hour < 9.5) || (hour >= 17 && hour < 19.5);
  const taxis = Math.min(0.7, part.taxi * (night ? 5 : rush ? 1.4 : 1)), trucks = hour >= 5 && hour < 11.5 ? 2 : night ? 0.3 : 1;
  const buses = part.use !== 'general';
  if (part.use === 'cycle') return rand() < 0.5 ? 'cycle' : 'cycle_b';
  // A small street: mostly scooters and bicycles, kei trucks on their rounds, now and then a small car.
  if (part.use === 'minor') {
    const m = rand();
    return m < 0.18 ? 'scooter' : m < 0.28 ? 'scooter_b' : m < 0.36 ? 'scooter_k' : m < 0.42 ? 'scooter_w' : m < 0.58 ? 'cycle' : m < 0.68 ? 'cycle_b' : m < 0.8 ? 'keitruck' : m < 0.88 ? (rand() < 0.5 ? 'kei_v' : 'kei_vb') : rand() < 0.5 ? 'kei_w' : 'compact_w';
  }
  // Two bus companies run in the city: one keeps to the bus lanes.
  if (buses && lane.sinceBus >= BUS_EVERY * (part.use === 'bus' ? 1 : 1.3)) return part.use === 'bus' || rand() < 0.5 ? 'bus' : 'bus_c';
  const u = rand();
  if (part.use === 'bus') return u < 0.62 ? 'taxi' : u < 0.82 ? 'scooter' : 'scooter_b';
  if (u < taxis) return 'taxi';
  const w = (u - taxis) / (1 - taxis);
  if (w < 0.055 * trucks) return 'truck';
  if (w < 0.07 * trucks) return hour < 10 ? 'gomi' : 'truck';
  if (w < 0.13 * trucks) return 'keitruck';
  if (w < 0.13 * trucks + 0.05) return 'scooter';
  if (w < 0.13 * trucks + 0.08) return 'scooter_b';
  return DRIVEN[Math.floor(rand() * DRIVEN.length)];
}

/**
 * The way a new vehicle of this lane will go: straight on, or one turn. A lane that ends in the
 * plot makes everybody turn. Buses go by their stop; some taxis make for the stand while it has room.
 */
function pickRoute(tr: Traffic, lane: Lane, model: string, heavy: boolean): Route {
  const { turns, rand } = lane;
  if (family(model) === 'bus' && lane.busRoute) return lane.busRoute;
  if (lane.part.use === 'cycle') return lane.straight;
  if (model === 'taxi' && lane.rankRoute) {
    const rank = lane.rankRoute;
    let bound = 0;
    for (const o of tr.list) if (o.route === rank && o.served === 0) bound++;
    if (bound < lane.rank && rand() < 0.8) return rank;
  }
  if (lane.part.dead) return turns.length ? turns[Math.floor(rand() * turns.length)].route : lane.straight;
  if (heavy) return lane.straight;
  for (let i = 0; i < turns.length;) {
    // The turns of one junction.
    let j = i;
    while (j < turns.length && turns[j].at - turns[i].at < 25) j++;
    const u = rand();
    let edge = 0;
    for (let k = i; k < j; k++) {
      edge += turns[k].share;
      if (u < edge) return turns[k].route;
    }
    i = j;
  }
  return lane.straight;
}

function place(v: Vehicle) {
  const p = poseAt(v.route, v.s);
  v.x = pose.x; v.z = pose.z; v.hx = pose.hx; v.hz = pose.hz;
  v.lane = p.lane;
  v.curve = p.r !== 0;
  v.bend = p.r ? p.w / p.r : 0;
  v.ls = p.lane ? p.from + (v.s - p.start) : 0;
}

function create(tr: Traffic, lane: Lane, model = pickModel(lane, tr.time), way?: Route): Vehicle {
  const [len, wid, hgt] = VEH[family(model)];
  const heavy = HEAVY.has(family(model));
  const v: Vehicle = {
    id: tr.ids++, model, s: -len / 2, v: 0, len, wid, hgt, heavy, route: way ?? pickRoute(tr, lane, model, heavy), origin: lane, lane, ls: 0,
    served: 0, dwell: 0, jam: 0, wait: 0, curve: false, bend: 0, acc: 0, blink: 0, braking: false, x: 0, y: lane.part.from[1], z: 0, hx: 1, hz: 0,
  };
  place(v);
  return v;
}

// ── Keeping clear of each other ──

/** Discs along a vehicle's length that cover its footprint: how many, and how far apart. */
const discs = (len: number, wid: number) => Math.max(2, Math.round(len / wid));
let sampled = false;

/**
 * How far `v` may still drive before it would touch `o` (with `margin` to spare), or Infinity if
 * `o` is not in its way. Sets `sampled` when the answer came from following v's route round a
 * bend or across o's path, not from simply driving up behind it.
 */
function roomTo(v: Vehicle, o: Vehicle, margin: number, far = 0): number {
  sampled = false;
  const dx = o.x - v.x, dz = o.z - v.z, d2 = dx * dx + dz * dz;
  // (A vehicle on another level, an expressway overhead, is never in the way.)
  if (d2 > 4900 || Math.abs(o.y - v.y) > 3) return Infinity;
  const fwd = dx * v.hx + dz * v.hz, lat = dx * v.hz - dz * v.hx, par = v.hx * o.hx + v.hz * o.hz;
  // How much of the way to it is straight road.
  const ps = v.route.pieces;
  let p = ps[0];
  for (let i = 1; i < ps.length && v.s >= ps[i].start; i++) p = ps[i];
  const ahead = p.r === 0 ? p.start + p.len - v.s : 0;
  const last = p === ps[ps.length - 1];
  if (Math.abs(par) > 0.95 && !o.curve && (last || ahead >= fwd + o.len / 2)) {
    // (Behind it, or beside it; one overlapping it from behind still counts, so nothing enters on top of a queue.)
    if (par < 0 || fwd <= -(v.len + o.len) / 2 || Math.abs(lat) > (v.wid + o.wid) / 2 + 0.3) return Infinity;
    return fwd - (v.len + o.len) / 2 - (v.len < 2.5 ? 1.0 : GAP);
  }
  sampled = true;
  const look = Math.max(far, Math.min(30, (v.v * v.v) / (2 * COMFORT) + 10));
  const reach = look + (v.len + o.len) / 2 + 2;
  if (d2 > reach * reach) return Infinity;
  const no = discs(o.len, o.wid), so = no > 1 ? (o.len - o.wid) / (no - 1) : 0;
  const nv = discs(v.len, v.wid), sv = nv > 1 ? (v.len - v.wid) / (nv - 1) : 0;
  const touch = (v.wid + o.wid) / 2 + margin, touch2 = touch * touch;
  for (let d = 0; d <= look; d += 1) {
    poseAt(v.route, v.s + d);
    for (let i = 0; i < nv; i++) {
      const a = -(v.len - v.wid) / 2 + i * sv, px = pose.x + pose.hx * a, pz = pose.z + pose.hz * a;
      for (let j = 0; j < no; j++) {
        const c = -(o.len - o.wid) / 2 + j * so, qx = o.x + o.hx * c - px, qz = o.z + o.hz * c - pz;
        if (qx * qx + qz * qz < touch2) return Math.max(0, d - 1);
      }
    }
  }
  return Infinity;
}

/** How far `v` may drive before it would reach a person at (x, z), or Infinity. */
function roomToPerson(v: Vehicle, x: number, z: number): number {
  const dx = x - v.x, dz = z - v.z;
  if (dx * dx + dz * dz > 1600) return Infinity;
  const touch = v.wid / 2 + PERSON_SIDE, touch2 = touch * touch;
  const look = Math.min(34, (v.v * v.v) / (2 * COMFORT) + 12);
  for (let d = 0; d <= look; d += 0.5) {
    poseAt(v.route, v.s + d);
    // Only the front of the vehicle: somebody beside or behind it does not hold it.
    const a = (v.len - v.wid) / 2, px = pose.x + pose.hx * a, pz = pose.z + pose.hz * a;
    const qx = x - px, qz = z - pz;
    if (qx * qx + qz * qz < touch2) {
      // Beside the nose already (not in front of it): let it go.
      if (d === 0 && qx * pose.hx + qz * pose.hz < 0.2) return Infinity;
      return d - (PERSON_AHEAD - PERSON_SIDE);
    }
  }
  return Infinity;
}

/** True if the vehicle is short of a stop line whose signal is red: it will not come through. */
function stopping(o: Vehicle, time: number): boolean {
  const nose = o.s + o.len / 2;
  for (const st of o.route.stops) {
    if (nose > st.at + 0.3) continue;
    return signalState(st.axis, time).car === 'red';
  }
  return false;
}

/** True if the vehicle is past a stop line and not yet out of that junction. */
function inJunction(o: Vehicle): boolean {
  for (const st of o.route.stops) if (o.s + o.len / 2 > st.at + 0.3 && o.s - o.len / 2 < st.exit) return true;
  return false;
}

/**
 * Which of two vehicles in each other's way goes first. Going much the same way (one pulling out
 * of a bay in front of another): the one in front. Otherwise by `rank`.
 */
function first(v: Vehicle, o: Vehicle): boolean {
  // (Measured along the way the two are going between them, so that each gives the same answer about the other.)
  if (v.hx * o.hx + v.hz * o.hz > 0.7) return (o.x - v.x) * (v.hx + o.hx) + (o.z - v.z) * (v.hz + o.hz) < 0;
  return rank(v) > rank(o);
}

/** A vehicle on a line counts for more than one turning; then the older one. */
const rank = (v: Vehicle) => (v.lane ? 1e9 : 0) - v.id;

/**
 * Advance the traffic by dt seconds at sim time `time`. `walker`: someone the vehicles must not hit.
 * `closed`: whether a line's level crossing at a station is closed now. `level`: the traffic
 * density setting, a share of the normal amount.
 */
export function stepTraffic(tr: Traffic, dt: number, time: number, walker: Walker | null = null, closed?: (line: string, station: string) => boolean, level = 1) {
  const busy = timeFactor(time) * level, list = tr.list;
  tr.time = time;
  for (let n = 0; n < list.length; n++) {
    const v = list[n], route = v.route, turn = route.turn;
    let room = Infinity, lead: Vehicle | null = null, jammed = false;
    /** The nearest vehicle crossing its route ahead (not one it simply follows). */
    let crossing = Infinity;
    // Coming up to a stop line it looks right across the junction: it must not drive in while somebody is still in there.
    let far = 0;
    for (const st of route.stops) {
      const d = st.at - (v.s + v.len / 2);
      if (d < -0.3) continue;
      if (d < 12) far = Math.min(60, st.exit - v.s + 4);
      break;
    }
    for (const o of list) {
      if (o === v) continue;
      let r = roomTo(v, o, 0.5, far);
      if (r === Infinity) continue;
      if (!sampled) {
        if (r < room) lead = o;
      } else if (r < room) {
        // Each in the other's way: the one with the right of way only keeps from touching.
        const mutual = roomTo(o, v, 0.5) !== Infinity;
        if (mutual && first(v, o)) {
          r = roomTo(v, o, 0.3, far);
          if (r === Infinity) continue;
        } else if (mutual) {
          // The one giving way keeps well back, so the other has room to get past.
          r = Math.min(r, roomTo(v, o, 1.3, far));
          if (r < 1.5) jammed = true;
        }
      }
      if (sampled && r < crossing) crossing = r;
      if (r < room) room = r;
    }
    // At the stop line: somebody still inside the junction whose way on crosses its own counts too, wherever they are now.
    if (far > 0) {
      for (const o of list) {
        if (o !== v && Math.abs(o.y - v.y) > 3) continue;
        if (o === v || Math.abs(o.hx * v.hx + o.hz * v.hz) > 0.95 || !inJunction(o)) continue;
        const ox = o.x, oz = o.z, ohx = o.hx, ohz = o.hz;
        for (let k = 5; k <= 20; k += 5) {
          poseAt(o.route, o.s + k);
          o.x = pose.x; o.z = pose.z; o.hx = pose.hx; o.hz = pose.hz;
          const r = roomTo(v, o, 0.5, far);
          if (r < crossing) crossing = r;
        }
        o.x = ox; o.z = oz; o.hx = ohx; o.hz = ohz;
      }
    }
    const nose = v.s + v.len / 2;
    /** Where the vehicle it follows is, as a distance along this one's route (whatever route that one is on). */
    const leadAt = lead ? v.s + (lead.x - v.x) * v.hx + (lead.z - v.z) * v.hz : 0;
    for (const st of route.stops) {
      if (nose > st.at + 0.3) continue;
      const d = st.at - nose, light = signalState(st.axis, time).car;
      // Yellow: stop if that takes no hard braking. Green: only drive in if the far side is free.
      const hold = light === 'red' || (light === 'yellow' && d > (v.v * v.v) / (2 * 3.2))
        || (lead !== null && !turn && leadAt + lead.len / 2 > st.at && leadAt - lead.len / 2 < st.exit + v.len + GAP && lead.v < 5)
        // Nor while somebody is still crossing its way inside the junction.
        || (nose + crossing > st.at && nose + crossing < st.exit + 4);
      if (hold && d < room) {
        room = d;
        jammed = false;
      }
      break;
    }
    // A right turn waits in the junction until nothing is coming the other way.
    v.blink = 0;
    if (turn) {
      if (v.s < turn.arc1 && v.s > turn.arc0 - 30) v.blink = turn.left ? -1 : 1;
      if (v.s <= turn.hold + 0.05 && (turn.oncoming.length || turn.facing.length)) {
        let coming = false;
        for (const o of list) {
          if (o !== v && Math.abs(o.y - v.y) > 3) continue;
          const ot = o.route.turn;
          if (ot && o.s > ot.arc0 + 0.01 && o.s < ot.arc1 + o.len / 2 && turn.facing.includes(ot)) coming = true;
          if (!o.lane || o === v || stopping(o, time)) continue;
          for (const c of turn.oncoming) {
            if (c.lane !== o.lane || (!c.same && o.v < 0.3)) continue;
            const d = c.at - o.ls;
            if (d > -(o.len / 2 + 3) && d < (c.same ? Math.max(12, o.v * 3) : Math.max(28, o.v * 5))) coming = true;
          }
        }
        if (coming && turn.hold - v.s < room) {
          room = turn.hold - v.s;
          jammed = false;
        }
      }
    }
    // Before swinging in to a bay: wait for whoever is beside it in the lanes it crosses.
    const enter = route.enter;
    if (enter && enter.lanes.length && v.served === 0 && v.s <= enter.hold + 0.05) {
      for (const o of list) {
        if (o !== v && Math.abs(o.y - v.y) > 3) continue;
        if (o.lane && enter.lanes.includes(o.lane) && o.ls > enter.from && o.ls < enter.to && enter.hold - v.s < room) {
          room = enter.hold - v.s;
          jammed = false;
        }
      }
    }
    // Bus stops and the taxi stand: pull up, wait, and pull out when nothing is coming up the lane.
    if (v.served < route.halts.length) {
      const d = route.halts[v.served] + v.len / 2 - nose;
      if (v.dwell > 0) {
        room = 0;
        jammed = false;
        v.dwell -= dt;
        if (v.dwell <= 0) {
          const m = route.merge;
          let coming = false;
          for (const o of list) {
            if (o !== v && Math.abs(o.y - v.y) > 3) continue;
            // (One standing behind it is waiting for it to go.)
            if (!m || o === v || o.lane !== m.lane || o.v < 0.3) continue;
            // From just ahead of its nose back to what will reach it while it swings out.
            const here = (v.x - m.lane.part.from[0]) * m.lane.ux + (v.z - m.lane.part.from[2]) * m.lane.uz;
            if (o.ls < here + v.len / 2 + o.len / 2 + 3 && o.ls > here - v.len / 2 - Math.max(14, o.v * 3)) coming = true;
          }
          // The last taxi on a stand stays until another has come.
          const alone = route.merge !== null && route.dwell[1] > 20 && !list.some((o) => o !== v && o.route === route && o.served === 0 && o.v < 0.1 && o.s > route.halts[0] - 3 * RANK_PITCH);
          if (coming) v.dwell = 0.5;
          else if (alone) v.dwell = 4;
          else v.served++;
        }
      } else if (d < 0.4 && v.v < 0.1) v.dwell = route.dwell[0] + v.origin.rand() * (route.dwell[1] - route.dwell[0]);
      else if (d < room) {
        room = Math.max(0, d);
        jammed = false;
      }
      if (route.merge) v.blink = v.dwell > 0 && v.dwell < 3 ? 1 : v.dwell > 0 ? 0 : -1;
    }
    // A zebra crossing somebody is on or about to step onto; a closed level crossing.
    for (const y of route.yields) {
      if (nose > y.at + 0.3 || !walker || Math.abs(walker.y - v.y) > 2.5) continue;
      if (walker.x > y.zone[0] && walker.x < y.zone[2] && walker.z > y.zone[1] && walker.z < y.zone[3] && y.at - nose < room) {
        room = y.at - nose;
        jammed = false;
      }
    }
    for (const g of route.gates) {
      if (nose > g.at + 0.3 || !closed?.(g.line, g.station) || g.at - nose >= room) continue;
      room = g.at - nose;
      jammed = false;
    }
    // A person in the road ahead.
    if (walker && Math.abs(walker.y - v.y) < 2.5) {
      const r = roomToPerson(v, walker.x, walker.z);
      if (r < room) {
        room = r;
        jammed = false;
      }
    }

    // The speed limit, lower for heavy vehicles, and lower still for a turn coming up.
    let limit = (v.lane ?? v.origin).part.speed * (v.heavy ? 0.88 : 1);
    if (turn && v.s < turn.arc1) limit = Math.min(limit, Math.sqrt(turn.speed * turn.speed + 2 * COMFORT * Math.max(0, turn.arc0 - v.s)));
    const want = room === Infinity ? limit : Math.min(limit, Math.sqrt(2 * COMFORT * Math.max(0, room - 0.15)));
    const before = v.v;
    v.v += Math.max(-BRAKE * dt, Math.min((v.heavy ? ACCEL_HEAVY : ACCEL) * dt, want - v.v));
    if (v.v < 0) v.v = 0;
    const step = Math.min(v.v * dt, Math.max(0, room));
    if (step < v.v * dt) v.v = step / dt;
    v.braking = v.v < before - 0.02 * dt || v.v < 0.05;
    v.acc += ((v.v - before) / dt - v.acc) * Math.min(1, dt * 4);
    v.s += step;
    place(v);
    v.jam = jammed && v.v < 0.05 ? v.jam + dt : 0;
    // A driver who cannot make a turn through most of a green gives it up: straight on instead, or the
    // other way where the road ends.
    if (turn && v.s <= turn.arc0 + 0.05) {
      if (v.v > 1) v.wait = 0;
      else if (v.v < 0.05 && !stopping(v, time) && !lead) v.wait += dt;
      if (v.wait > GIVE_UP) {
        const other = v.origin.turns.find((t) => t !== turn && Math.abs(t.at - turn.at) < 25);
        if (!v.origin.part.dead) v.route = v.origin.straight;
        else if (other) v.route = other.route;
        v.wait = 0;
      }
    }
  }
  // Off the far end of the plot; or stuck in a knot nobody can leave.
  for (let n = list.length - 1; n >= 0; n--) {
    const v = list[n];
    if (v.s - v.len / 2 > v.route.len) list.splice(n, 1);
    else if (v.jam > 25) {
      list.splice(n, 1);
      tr.cleared++;
    }
  }

  // The next vehicle enters when it is due and the way in is free.
  for (const lane of tr.lanes) {
    const part = lane.part;
    lane.next -= dt * busy;
    lane.sinceBus += dt * busy;
    if (lane.next > 0) continue;
    const v = (lane.pending ??= create(tr, lane));
    let free = Infinity;
    for (const o of list) free = Math.min(free, roomTo(v, o, 0.5));
    const person = walker !== null && Math.abs(walker.y - v.y) < 2.5 && roomToPerson(v, walker.x, walker.z) < 6;
    if (free > 1 && !person) {
      // It comes in at the speed that still lets it stop behind the one in front.
      v.v = Math.min(part.speed * 0.9, Math.sqrt(2 * COMFORT * Math.max(0, free - 1)));
      list.push(v);
      if (family(v.model) === 'bus') lane.sinceBus = 0;
      lane.pending = null;
      // (Few cycle after dark.)
      const dark = part.use === 'cycle' && (time % 86400 >= 20 * 3600 || time % 86400 < 6 * 3600) ? 3 : 1;
      lane.next = (60 / part.flow) * (0.35 + 1.3 * lane.rand()) * dark;
    }
  }
}

/** Run the street for a while before anyone looks, so it is not empty when they do. */
export function warmUp(tr: Traffic, time: number, seconds = 150, level = 1) {
  const dt = 0.5;
  for (let t = time - seconds; t < time; t += dt) stepTraffic(tr, dt, t, null, undefined, level);
}

/** The point at distance s along a route, as [x, z] (for tests and tools). */
export function routePoint(route: Route, s: number): [number, number] {
  poseAt(route, s);
  return [pose.x, pose.z];
}

/** The vehicles that entered by lane `i`, the one furthest along first. */
export function entered(tr: Traffic, i: number): Vehicle[] {
  return tr.list.filter((v) => v.origin.index === i).sort((a, b) => b.s - a.s);
}
