// Timetable + train kinematics. Pure TS.
//
// Each line runs one repeating "cycle": down the line, turn back in the siding beyond
// the last stop, up the line, turn back beyond the first stop. Every train follows the
// same cycle, offset by one headway. A train's position is a closed-form function of
// the clock, so trains never drift from the timetable and departure boards can be
// computed from the same data the trains use.

import type { Dir } from '../data/types';
import { LineGeom, TAIL_STOP, type Track } from './geometry';

export type DwellRole = 'intermediate' | 'arrival' | 'departure' | 'reverse';

export interface RunPhase {
  kind: 'run';
  t0: number;
  t1: number;
  sFrom: number;
  sTo: number;
  track: Track;
  /** Service direction this movement belongs to. */
  dir: Dir;
  /** Stop index being run towards, or -1 for siding moves. */
  toStop: number;
  inService: boolean;
  vCruise: number;
}
export interface DwellPhase {
  kind: 'dwell';
  t0: number;
  t1: number;
  s: number;
  track: Track;
  /** Stop index, or -1 in the siding. */
  stop: number;
  role: DwellRole;
  /** Direction the train will leave in (for arrival: the direction it came in). */
  dir: Dir;
  doors: boolean;
}
export type Phase = RunPhase | DwellPhase;

export interface StopTimes {
  /** Cycle offsets (seconds) of arrival and departure at this stop/direction. */
  arr: number;
  dep: number;
}

export interface Timetable {
  geom: LineGeom;
  phases: Phase[];
  cycle: number;
  headway: number;
  trainCount: number;
  /** Boarding departures keyed by `${stopIndex}:${dir}`. */
  departures: Map<string, StopTimes>;
  /** Terminating arrivals keyed by `${stopIndex}:${dir}` (dir = direction of arrival). */
  arrivals: Map<string, StopTimes>;
  /** The whole timetable runs this many seconds later than its cycle times (phasing against a shared line). */
  offset: number;
  /** The service type these trains run as, on a line that has them. */
  service?: string;
}

export interface TimetableOptions {
  /** Shift the whole timetable later by this many seconds. */
  offset?: number;
  /**
   * Choose how much of the layover padding goes to the far terminus (which shifts every "up"
   * time against every "down" time): the smallest pad ≥ 0 with pad ≡ residue (mod mod).
   */
  padEnd?: { mod: number; residue: number };
  /** Stations this service type passes without stopping (never the first or last stop). */
  skip?: string[];
  /** The service type's id. */
  service?: string;
}

const DOOR_OPEN_DELAY = 1.5;
const DOOR_MOVE = 2.5;
const DOOR_CLOSE_BEFORE = 3;

/** Fastest possible run time over distance d. */
export function minRunTime(d: number, vmax: number, a: number, b: number): number {
  const k = 1 / (2 * a) + 1 / (2 * b);
  if (d >= vmax * vmax * k) return d / vmax + vmax * k;
  return 2 * Math.sqrt(d * k);
}

/** Cruise speed that makes a trapezoidal run over d take exactly T seconds. */
export function cruiseSpeed(d: number, T: number, a: number, b: number): number {
  const k = 1 / (2 * a) + 1 / (2 * b);
  const disc = Math.max(0, T * T - 4 * k * d);
  return (T - Math.sqrt(disc)) / (2 * k);
}

/** Distance covered and speed, `tau` seconds into a run. */
export function runProfile(
  tau: number, T: number, d: number, v: number, a: number, b: number,
): { dist: number; speed: number } {
  const ta = v / a, tb = v / b;
  if (tau <= 0) return { dist: 0, speed: 0 };
  if (tau >= T) return { dist: d, speed: 0 };
  if (tau < ta) return { dist: 0.5 * a * tau * tau, speed: a * tau };
  if (tau < T - tb) return { dist: 0.5 * a * ta * ta + v * (tau - ta), speed: v };
  const r = T - tau;
  return { dist: d - 0.5 * b * r * r, speed: b * r };
}

const round5 = (t: number) => Math.ceil(t / 5) * 5;

export function buildTimetable(geom: LineGeom, opts: TimetableOptions = {}): Timetable {
  const sv = geom.def.service;
  const S = geom.stopS;
  const n = S.length;
  const phases: Phase[] = [];
  const departures = new Map<string, StopTimes>();
  const arrivals = new Map<string, StopTimes>();
  let t = 0;

  const run = (sFrom: number, sTo: number, track: Track, dir: Dir, toStop: number, inService: boolean) => {
    const d = Math.abs(sTo - sFrom);
    const vmax = inService ? sv.maxSpeed : sv.sidingSpeed;
    const T = round5(minRunTime(d, vmax, sv.accel, sv.decel) + 3);
    phases.push({
      kind: 'run', t0: t, t1: t + T, sFrom, sTo, track, dir, toStop, inService,
      vCruise: cruiseSpeed(d, T, sv.accel, sv.decel),
    });
    t += T;
  };
  const dwell = (s: number, track: Track, stop: number, role: DwellRole, dir: Dir, dur: number): DwellPhase => {
    const p: DwellPhase = { kind: 'dwell', t0: t, t1: t + dur, s, track, stop, role, dir, doors: role !== 'reverse' };
    phases.push(p);
    t += dur;
    return p;
  };

  // Stops this service calls at, as stop indices. The end stops are always among them.
  const calls = S.map((_, i) => i).filter((i) => i === 0 || i === n - 1 || !opts.skip?.includes(geom.def.stops[i]));
  const call = (i: number, dir: Dir) => {
    const p = dwell(S[i], dir, i, 'intermediate', dir, sv.dwellS);
    departures.set(`${i}:${dir}`, { arr: p.t0, dep: p.t1 });
  };
  // A main line runs on past its end stops (LineDef.beyond): out to the map edge and back, as
  // the next train from the city beyond. The wait at the edge takes the place of the layover.
  const edge = geom.def.beyond?.runM;
  let layEnd: DwellPhase, layStart: DwellPhase;

  // Down direction: stop 0 → stop n-1.
  if (edge) call(0, 'down');
  for (let j = 1; j < calls.length; j++) {
    run(S[calls[j - 1]], S[calls[j]], 'down', 'down', calls[j], true);
    if (j < calls.length - 1) call(calls[j], 'down');
  }
  if (edge) {
    call(n - 1, 'down');
    run(S[n - 1], S[n - 1] + edge, 'down', 'down', -1, true);
    layEnd = dwell(S[n - 1] + edge, 'up', -1, 'reverse', 'up', sv.reverseS);
    run(S[n - 1] + edge, S[n - 1], 'up', 'up', n - 1, true);
    call(n - 1, 'up');
  } else {
    const p = dwell(S[n - 1], 'down', n - 1, 'arrival', 'down', sv.terminalArrivalDwellS);
    arrivals.set(`${n - 1}:down`, { arr: p.t0, dep: p.t1 });
    run(S[n - 1], S[n - 1] + TAIL_STOP, 'down', 'down', -1, false);
    dwell(S[n - 1] + TAIL_STOP, 'down', -1, 'reverse', 'up', sv.reverseS);
    run(S[n - 1] + TAIL_STOP, S[n - 1], 'xoverEnd', 'up', n - 1, false);
    layEnd = dwell(S[n - 1], 'up', n - 1, 'departure', 'up', sv.minLayoverS);
  }

  // Up direction: stop n-1 → stop 0.
  for (let j = calls.length - 2; j >= 0; j--) {
    run(S[calls[j + 1]], S[calls[j]], 'up', 'up', calls[j], true);
    if (j > 0) call(calls[j], 'up');
  }
  if (edge) {
    call(0, 'up');
    run(S[0], S[0] - edge, 'up', 'up', -1, true);
    layStart = dwell(S[0] - edge, 'down', -1, 'reverse', 'down', sv.reverseS);
    run(S[0] - edge, S[0], 'down', 'down', 0, true);
  } else {
    const p = dwell(S[0], 'up', 0, 'arrival', 'up', sv.terminalArrivalDwellS);
    arrivals.set(`0:up`, { arr: p.t0, dep: p.t1 });
    run(S[0], S[0] - TAIL_STOP, 'up', 'up', -1, false);
    dwell(S[0] - TAIL_STOP, 'up', -1, 'reverse', 'down', sv.reverseS);
    run(S[0] - TAIL_STOP, S[0], 'xoverStart', 'down', 0, false);
    layStart = dwell(S[0], 'down', 0, 'departure', 'down', sv.minLayoverS);
  }

  // Pad the two layovers so the cycle is a whole number of headways.
  let padEnd: number, trainCount: number;
  if (opts.padEnd) {
    const { mod: m, residue } = opts.padEnd;
    padEnd = ((residue % m) + m) % m;
    trainCount = Math.ceil((t + padEnd) / sv.headwayS);
  } else {
    trainCount = Math.ceil(t / sv.headwayS);
    padEnd = Math.floor((trainCount * sv.headwayS - t) / 2);
  }
  const cycle = trainCount * sv.headwayS;
  const padStart = cycle - t - padEnd;
  const iEnd = phases.indexOf(layEnd);
  layEnd.t1 += padEnd;
  for (let i = iEnd + 1; i < phases.length; i++) {
    phases[i].t0 += padEnd;
    phases[i].t1 += padEnd;
  }
  for (const m of [departures, arrivals]) {
    for (const [k, v] of m) {
      if (k.endsWith(':up')) m.set(k, { arr: v.arr + padEnd, dep: v.dep + padEnd });
    }
  }
  layStart.t1 += padStart;
  for (let i = phases.indexOf(layStart) + 1; i < phases.length; i++) {
    phases[i].t0 += padStart;
    phases[i].t1 += padStart;
  }
  if (!edge) {
    departures.set(`${n - 1}:up`, { arr: layEnd.t0, dep: layEnd.t1 });
    departures.set(`0:down`, { arr: layStart.t0, dep: layStart.t1 });
  }

  return { geom, phases, cycle, headway: sv.headwayS, trainCount, departures, arrivals, offset: opts.offset ?? 0, service: opts.service };
}

const mod = (a: number, m: number) => ((a % m) + m) % m;

export interface TrainState {
  line: string;
  index: number;
  phase: Phase;
  phaseIndex: number;
  /** Chainage of the train centre. */
  s: number;
  speed: number;
  track: Track;
  /** +1 when moving/facing towards increasing chainage. */
  heading: 1 | -1;
  /** 0 closed … 1 fully open. */
  doorOpen: number;
  /** Cycle time, seconds. */
  tau: number;
  /** Its service type, on a line that has them (it decides the track at a station with LineDef.fanAt). */
  service?: string;
}

function phaseAt(tt: Timetable, tau: number): number {
  const ph = tt.phases;
  let lo = 0, hi = ph.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ph[mid].t1 <= tau) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function doorFraction(p: DwellPhase, tau: number): number {
  if (!p.doors) return 0;
  const opening = (tau - p.t0 - DOOR_OPEN_DELAY) / DOOR_MOVE;
  const closing = (p.t1 - DOOR_CLOSE_BEFORE - tau) / DOOR_MOVE;
  return Math.min(1, Math.max(0, Math.min(opening, closing)));
}

export function trainStateAt(tt: Timetable, index: number, time: number): TrainState {
  const sv = tt.geom.def.service;
  const tau = mod(time - tt.offset - index * tt.headway, tt.cycle);
  const phaseIndex = phaseAt(tt, tau);
  const phase = tt.phases[phaseIndex];
  const base = { line: tt.geom.def.id, index, phase, phaseIndex, tau, track: phase.track, service: tt.service };
  if (phase.kind === 'dwell') {
    return { ...base, s: phase.s, speed: 0, heading: phase.dir === 'down' ? 1 : -1, doorOpen: doorFraction(phase, tau) };
  }
  const d = Math.abs(phase.sTo - phase.sFrom);
  const sign = phase.sTo >= phase.sFrom ? 1 : -1;
  const r = runProfile(tau - phase.t0, phase.t1 - phase.t0, d, phase.vCruise, sv.accel, sv.decel);
  return { ...base, s: phase.sFrom + sign * r.dist, speed: r.speed, heading: sign as 1 | -1, doorOpen: 0 };
}

export interface Departure {
  /** Absolute sim times. */
  arr: number;
  dep: number;
  /** Index of the train that will make this departure. */
  train: number;
}

function upcoming(tt: Timetable, st: StopTimes | undefined, time: number, count: number): Departure[] {
  if (!st) return [];
  const out: Departure[] = [];
  // Train k departs at st.dep + k·headway (+ whole cycles), all shifted by the offset.
  const arr0 = st.arr + tt.offset, dep0 = st.dep + tt.offset;
  let j = Math.ceil((time - dep0) / tt.headway);
  for (let i = 0; i < count; i++, j++) {
    out.push({
      arr: arr0 + j * tt.headway,
      dep: dep0 + j * tt.headway,
      train: mod(j, tt.trainCount),
    });
  }
  return out;
}

/** Next boarding departures from a stop in a direction. Empty if no trains board there. */
export function nextDepartures(tt: Timetable, stop: number, dir: Dir, time: number, count = 3): Departure[] {
  return upcoming(tt, tt.departures.get(`${stop}:${dir}`), time, count);
}

/** Next terminating arrivals at a terminus platform. */
export function nextArrivals(tt: Timetable, stop: number, dir: Dir, time: number, count = 3): Departure[] {
  return upcoming(tt, tt.arrivals.get(`${stop}:${dir}`), time, count);
}

/**
 * Door/gate open fraction at a platform right now. `track` is the platform's track
 * ('down' = platform for trains heading to the last stop).
 */
export function platformDoorOpen(tt: Timetable, stop: number, track: 'down' | 'up', time: number): number {
  let best = 0;
  for (let k = 0; k < tt.trainCount; k++) {
    const tau = mod(time - tt.offset - k * tt.headway, tt.cycle);
    const p = tt.phases[phaseAt(tt, tau)];
    if (p.kind === 'dwell' && p.stop === stop && p.track === track) best = Math.max(best, doorFraction(p, tau));
  }
  return best;
}
