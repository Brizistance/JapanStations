// Instantiates geometry + timetable for every line in the network data, and owns the sim clock.

import { LINES } from '../data/network';
import type { LineId } from '../data/types';
import { BOGIE_OFFSET, CAR_PITCH, LineGeom } from './geometry';
import { buildTimetable, trainStateAt, type Timetable, type TrainState } from './timetable';

export interface LineSim {
  geom: LineGeom;
  tt: Timetable;
}

const mod = (a: number, m: number) => ((a % m) + m) % m;

/**
 * Timetable for a line that runs on another line's track (`shares`): phased so that, in both
 * directions, it enters the shared section half a host headway after a host train. Its headway
 * must be a whole number of host headways, so the gap is the same for every train.
 */
function sharedTimetable(geom: LineGeom, host: LineSim): Timetable {
  const sh = geom.def.shares!;
  const hS = host.tt.headway;
  if (geom.def.service.headwayS % hS !== 0) throw new Error(`${geom.def.id}: headway must be a multiple of ${sh.line}'s`);
  const at = (l: LineGeom, id: string) => l.def.stops.indexOf(id);
  const dep = (tt: Timetable, stop: number, dir: 'down' | 'up') => tt.departures.get(`${stop}:${dir}`)!.dep + tt.offset;
  // Down times don't depend on the layover split; up times move one-for-one with padEnd.
  const base = buildTimetable(geom, { padEnd: { mod: hS, residue: 0 } });
  const offset = mod(dep(host.tt, at(host.geom, sh.from), 'down') + hS / 2 - dep(base, at(geom, sh.from), 'down'), hS);
  const residue = dep(host.tt, at(host.geom, sh.to), 'up') + hS / 2 - offset - dep(base, at(geom, sh.to), 'up');
  return buildTimetable(geom, { offset, padEnd: { mod: hS, residue } });
}

export const NET: LineSim[] = [];
for (const def of LINES) {
  const geom = new LineGeom(def);
  const host = def.shares && NET.find((l) => l.geom.def.id === def.shares!.line);
  if (def.shares && !host) throw new Error(`${def.id} shares ${def.shares.line}, which must be defined before it`);
  NET.push({ geom, tt: host ? sharedTimetable(geom, host) : buildTimetable(geom) });
}

export const lineSim = (id: LineId): LineSim => {
  const l = NET.find((x) => x.geom.def.id === id);
  if (!l) throw new Error(`unknown line ${id}`);
  return l;
};

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
  const n = geom.def.service.cars;
  const sc = st.s + (car - (n - 1) / 2) * CAR_PITCH;
  geom.trackPoint(st.track, sc - BOGIE_OFFSET, a);
  geom.trackPoint(st.track, sc + BOGIE_OFFSET, b);
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
