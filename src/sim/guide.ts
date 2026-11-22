// Route guidance: what the traveller should do next to reach a station, from where they really
// are (on foot in a station, or on a particular train). Built on findRoute and the timetable, so
// every time shown is a real one; the only allowance is the change time findRoute already states.

import type { Dir, StationId } from '../data/types';
import { CHANGE_S, findRoute, type Leg, type RideLeg, type WalkLeg } from './route';
import type { Phase, Timetable } from './timetable';

const mod = (a: number, m: number) => ((a % m) + m) % m;

/** A stop the train the traveller is on will call at, and when. */
export interface Call {
  stop: number;
  arr: number;
}

/**
 * The stops a train will still call at on this run, nearest first, with its real arrival times.
 * Empty when it is not carrying passengers (running empty, turning back, or just terminated).
 */
export function trainCalls(tt: Timetable, phase: Phase, tau: number, time: number): Call[] {
  const dwell = phase.kind === 'dwell';
  if (dwell ? phase.role === 'arrival' || phase.role === 'reverse' : !phase.inService) return [];
  const first = dwell ? phase.stop : phase.toStop;
  if (first < 0) return [];
  const dir: Dir = phase.dir, step = dir === 'down' ? 1 : -1, n = tt.geom.def.stops.length;
  const out: Call[] = [];
  for (let j = first; j >= 0 && j < n; j += step) {
    const at = tt.departures.get(`${j}:${dir}`) ?? tt.arrivals.get(`${j}:${dir}`);
    if (!at) continue; // passed without stopping
    out.push({ stop: j, arr: dwell && j === first ? time : time + mod(at.arr - tau, tt.cycle) });
  }
  return out;
}

export type Step =
  /** On foot at the destination. */
  | { kind: 'arrived' }
  /** On foot: take this train. `rest` is what follows it. */
  | { kind: 'board'; leg: RideLeg; rest: Leg[]; arr: number }
  /** On foot: walk to the next station outside the gates. */
  | { kind: 'walk'; leg: WalkLeg; rest: Leg[]; arr: number }
  /** On a train: stay on to `alight`, `stops` calls from now (1 = the next stop, or this one while stopped at it). */
  | { kind: 'ride'; alight: StationId; alightStop: number; stops: number; at: number; here: boolean; rest: Leg[]; arr: number }
  /** On a train that is not carrying passengers. */
  | { kind: 'off' };

export interface OnFoot { station: StationId }
export interface OnTrain { tt: Timetable; phase: Phase; tau: number }

/** The next thing to do to reach `to`. Null when there is no route. */
export function nextStep(to: StationId, time: number, pos: OnFoot | OnTrain): Step | null {
  if ('station' in pos) {
    if (pos.station === to) return { kind: 'arrived' };
    const r = findRoute(pos.station, to, time);
    if (!r || !r.legs.length) return null;
    const [leg, ...rest] = r.legs;
    return leg.kind === 'ride' ? { kind: 'board', leg, rest, arr: r.arr } : { kind: 'walk', leg, rest, arr: r.arr };
  }
  const calls = trainCalls(pos.tt, pos.phase, pos.tau, time);
  if (!calls.length) return { kind: 'off' };
  const stops = pos.tt.geom.def.stops;
  // Get off wherever the journey from there ends soonest; of equals, the first.
  let best: Step | null = null;
  calls.forEach((c, i) => {
    const id = stops[c.stop];
    const r = id === to ? { legs: [] as Leg[], arr: c.arr } : findRoute(id, to, c.arr + CHANGE_S);
    if (!r || (best && best.kind === 'ride' && r.arr >= best.arr)) return;
    best = { kind: 'ride', alight: id, alightStop: c.stop, stops: i + 1, at: c.arr, here: i === 0 && pos.phase.kind === 'dwell', rest: r.legs, arr: r.arr };
  });
  return best;
}
