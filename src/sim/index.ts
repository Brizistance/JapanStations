// Instantiates geometry + timetable for every line in the network data, and owns the sim clock.

import { LINES, RAIL_LINES } from '../data/network';
import type { Dir, LineId, ServiceType } from '../data/types';
import { LineGeom, carOf } from './geometry';
import { buildTimetable, nextDepartures, trainStateAt, type Departure, type Timetable, type TrainState } from './timetable';

export interface LineSim {
  geom: LineGeom;
  /** The line's timetable; on a line with service types, that of the first (the Local). */
  tt: Timetable;
  /** One timetable per service type (LineDef.services), each with its own trains. */
  services?: { type: ServiceType; tt: Timetable }[];
}

const mod = (a: number, m: number) => ((a % m) + m) % m;

/**
 * A timetable phased against a host's: in both directions it passes `from` (down) and `to` (up)
 * half a host headway after a host train. Its headway must be a whole number of host headways,
 * so the gap is the same for every train.
 */
function phasedTimetable(geom: LineGeom, host: LineSim, from: string, to: string, skip?: string[]): Timetable {
  const hS = host.tt.headway;
  if (geom.def.service.headwayS % hS !== 0) throw new Error(`${geom.def.id}: headway must be a multiple of ${host.geom.def.id}'s`);
  const at = (l: LineGeom, id: string) => l.def.stops.indexOf(id);
  const dep = (tt: Timetable, stop: number, dir: 'down' | 'up') => tt.departures.get(`${stop}:${dir}`)!.dep + tt.offset;
  // Down times don't depend on the layover split; up times move one-for-one with padEnd.
  const base = buildTimetable(geom, { skip, padEnd: { mod: hS, residue: 0 } });
  const offset = mod(dep(host.tt, at(host.geom, from), 'down') + hS / 2 - dep(base, at(geom, from), 'down'), hS);
  const residue = dep(host.tt, at(host.geom, to), 'up') + hS / 2 - offset - dep(base, at(geom, to), 'up');
  return buildTimetable(geom, { skip, offset, padEnd: { mod: hS, residue } });
}

/** A line that runs on another line's track (`shares`): phased into the gaps of that line's trains. */
const sharedTimetable = (geom: LineGeom, host: LineSim): Timetable =>
  phasedTimetable(geom, host, geom.def.shares!.from, geom.def.shares!.to);

export const NET: LineSim[] = [];
for (const def of LINES) {
  const geom = new LineGeom(def);
  const host = def.shares && NET.find((l) => l.geom.def.id === def.shares!.line);
  if (def.shares && !host) throw new Error(`${def.id} shares ${def.shares.line}, which must be defined before it`);
  NET.push({ geom, tt: host ? sharedTimetable(geom, host) : buildTimetable(geom) });
}

/**
 * Main-line railways (AR): timetabled and on the route map, but not in the 3D world yet, so
 * they are kept out of NET (which the world, the trains and the player are built from).
 */
export const RAIL_NET: LineSim[] = RAIL_LINES.map((def) => {
  const geom = new LineGeom(def);
  const types = def.services ?? [];
  const sim: LineSim = { geom, tt: buildTimetable(geom, { skip: types[0]?.skips }) };
  const meet = def.servicesMeetAt ?? def.stops[0];
  sim.services = types.map((type, i) => ({ type, tt: i === 0 ? sim.tt : phasedTimetable(geom, sim, meet, meet, type.skips) }));
  return sim;
});

/** Every line that has track and trains in the 3D world: the metro, and a main line once part of it is built. */
export const WORLD_NET: LineSim[] = [...NET, ...RAIL_NET.filter((l) => l.geom.def.built)];

export const lineSim = (id: LineId): LineSim => {
  const l = NET.find((x) => x.geom.def.id === id) ?? RAIL_NET.find((x) => x.geom.def.id === id);
  if (!l) throw new Error(`unknown line ${id}`);
  return l;
};

/** A line's timetable for one service type; the line's own when it has none (or `id` is not given). */
export function serviceSim(id: LineId, service?: string): { tt: Timetable; type?: ServiceType } {
  const l = lineSim(id);
  return l.services?.find((s) => s.type.id === service) ?? { tt: l.tt };
}

export interface LineDeparture extends Departure {
  /** The service type, on a line that has them. */
  service?: ServiceType;
}

/** Next boarding departures from a stop, over all the line's service types, in time order. */
export function lineDepartures(sim: LineSim, stop: number, dir: Dir, time: number, count = 3): LineDeparture[] {
  if (!sim.services?.length) return nextDepartures(sim.tt, stop, dir, time, count);
  return sim.services
    .flatMap((s) => nextDepartures(s.tt, stop, dir, time, count).map((d): LineDeparture => ({ ...d, service: s.type })))
    .sort((a, b) => a.dep - b.dep)
    .slice(0, count);
}

/** Sim clock. `time` is seconds since midnight of day 0 and keeps counting past 24h. */
export const clock = {
  time: 10 * 3600,
  scale: 1,
  advance(dtReal: number) {
    this.time += dtReal * this.scale;
  },
};

export const formatClock = (t: number, withSeconds = false): string => {
  const d = ((Math.floor(t) % 86400) + 86400) % 86400;
  const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60;
  const hm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return withSeconds ? `${hm}:${String(s).padStart(2, '0')}` : hm;
};

export interface CarPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 };

/** World pose of one car of a train. Car-local +x always points towards increasing chainage. */
export function carPose(geom: LineGeom, st: TrainState, car: number, out: CarPose): CarPose {
  const n = geom.def.service.cars, spec = carOf(geom.def);
  const sc = st.s + (car - (n - 1) / 2) * spec.pitch;
  geom.trackPoint(st.track, sc - spec.bogie, a);
  geom.trackPoint(st.track, sc + spec.bogie, b);
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  out.x = (a.x + b.x) / 2;
  out.y = (a.y + b.y) / 2;
  out.z = (a.z + b.z) / 2;
  out.yaw = Math.atan2(-dz, dx);
  out.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  return out;
}

export function allTrainStates(time: number): TrainState[] {
  const out: TrainState[] = [];
  for (const l of NET) for (let k = 0; k < l.tt.trainCount; k++) out.push(trainStateAt(l.tt, k, time));
  return out;
}
