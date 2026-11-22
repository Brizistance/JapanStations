// Route search over the timetable: the earliest arrival from one station to another, leaving at
// a given time. Every ride is a real departure of a real train; nothing here invents a time
// except the two allowances below, which the route panel states.

import { ALL_STATIONS, linesAt, stationById } from '../data/network';
import type { Dir, LineDef, ServiceType, StationId } from '../data/types';
import { lineSim } from './index';
import { nextDepartures, type Timetable } from './timetable';

/** Allowed for changing trains inside a station, seconds. An allowance, not a measured walk. */
export const CHANGE_S = 120;
/** Allowed for a walking transfer between two stations outside the gates, seconds. */
export const WALK_S = 300;

export interface RideLeg {
  kind: 'ride';
  line: LineDef;
  /** The service type, on a line that has them. */
  service?: ServiceType;
  dir: Dir;
  from: StationId;
  to: StationId;
  /** Indices of `from` and `to` in the line's stops. */
  fromStop: number;
  toStop: number;
  /** Absolute sim times: the train leaves `from` and reaches `to`. */
  dep: number;
  arr: number;
}
export interface WalkLeg {
  kind: 'walk';
  from: StationId;
  to: StationId;
  dep: number;
  arr: number;
}
export type Leg = RideLeg | WalkLeg;
export interface Route {
  legs: Leg[];
  /** When the traveller leaves the first station and reaches the last. */
  dep: number;
  arr: number;
}

const mod = (a: number, m: number) => ((a % m) + m) % m;

/** Walking transfers, both ways. */
const WALKS = new Map<StationId, StationId[]>();
for (const s of ALL_STATIONS) {
  if (!s.transfer) continue;
  for (const [a, b] of [[s.id, s.transfer], [s.transfer, s.id]]) {
    if (!WALKS.get(a)?.includes(b)) WALKS.set(a, [...(WALKS.get(a) ?? []), b]);
  }
}

/** Earliest-arrival route from `from` to `to` for someone on the platform at `time`. Null if there is none. */
export function findRoute(from: StationId, to: StationId, time: number): Route | null {
  stationById(from);
  stationById(to);
  const best = new Map<StationId, { t: number; leg?: Leg }>([[from, { t: time }]]);
  const done = new Set<StationId>();
  const relax = (id: StationId, leg: Leg) => {
    const b = best.get(id);
    if (!done.has(id) && (!b || leg.arr < b.t)) best.set(id, { t: leg.arr, leg });
  };
  for (;;) {
    let u: StationId | undefined;
    for (const [id, b] of best) if (!done.has(id) && (u === undefined || b.t < best.get(u)!.t)) u = id;
    if (u === undefined) return null;
    if (u === to) break;
    done.add(u);
    const { t, leg: via } = best.get(u)!;
    // Getting off one train and onto another takes the change allowance; starting out, or arriving on foot, does not.
    const ready = via?.kind === 'ride' ? t + CHANGE_S : t;
    for (const line of linesAt(u)) {
      const sim = lineSim(line.id), i = line.stops.indexOf(u);
      const tts: { tt: Timetable; service?: ServiceType }[] = sim.services?.length ? sim.services.map((s) => ({ tt: s.tt, service: s.type })) : [{ tt: sim.tt }];
      for (const { tt, service } of tts) {
        for (const dir of ['down', 'up'] as Dir[]) {
          const st = tt.departures.get(`${i}:${dir}`);
          if (!st) continue; // this service does not call here, or nothing boards in this direction
          const dep = nextDepartures(tt, i, dir, ready, 1)[0].dep;
          const step = dir === 'down' ? 1 : -1;
          for (let j = i + step; j >= 0 && j < line.stops.length; j += step) {
            const at = tt.departures.get(`${j}:${dir}`) ?? tt.arrivals.get(`${j}:${dir}`);
            if (!at) continue; // passed without stopping
            // The same train: its arrival there, this far on in the cycle from its departure here.
            const arr = dep + mod(at.arr - st.dep, tt.cycle);
            relax(line.stops[j], { kind: 'ride', line, service, dir, from: u, to: line.stops[j], fromStop: i, toStop: j, dep, arr });
          }
        }
      }
    }
    for (const v of WALKS.get(u) ?? []) relax(v, { kind: 'walk', from: u, to: v, dep: t, arr: t + WALK_S });
  }
  const legs: Leg[] = [];
  for (let id = to; id !== from; ) {
    const leg = best.get(id)!.leg!;
    legs.unshift(leg);
    id = leg.from;
  }
  return { legs, dep: legs[0]?.dep ?? time, arr: best.get(to)!.t };
}
