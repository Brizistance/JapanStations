// Live train state: one runtime per timetabled train, with a collision frame per car.
// `updateTrains` is called once per tick; everything else (renderer, player, HUD) reads it.

import { CAR_PITCH } from '../sim/geometry';
import { NET, carPose, type CarPose, type LineSim } from '../sim';
import { trainStateAt, type TrainState } from '../sim/timetable';
import { makeColliders, type ColliderSet, type Frame } from '../world/collision';
import type { Build } from '../world/builder';
import { buildCar, CAR_INSIDE, type CarKind } from './car';

export interface TrainRuntime {
  id: string;
  sim: LineSim;
  index: number;
  state: TrainState;
  cars: Frame[];
  /** Which side (+1 = car-local +z) the platform is on right now. */
  doorSide: 1 | -1;
}

const carBuilds = new Map<string, { build: Build; colliders: ColliderSet }>();
export function carBuild(line: string, kind: CarKind) {
  const k = `${line}:${kind}`;
  let v = carBuilds.get(k);
  if (!v) {
    const sim = NET.find((l) => l.geom.def.id === line)!;
    const build = buildCar(sim.geom.def, kind);
    v = { build, colliders: makeColliders(build) };
    carBuilds.set(k, v);
  }
  return v;
}
export const carKind = (car: number, cars: number): CarKind => (car === 0 ? 'cabLow' : car === cars - 1 ? 'cabHigh' : 'mid');

const pose: CarPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };

function makeTrain(sim: LineSim, index: number, time: number): TrainRuntime {
  const n = sim.geom.def.service.cars;
  const t: TrainRuntime = {
    id: `${sim.geom.def.id}${index + 1}`, sim, index, state: trainStateAt(sim.tt, index, time), cars: [], doorSide: 1,
  };
  for (let c = 0; c < n; c++) {
    const { build, colliders } = carBuild(sim.geom.def.id, carKind(c, n));
    const f: Frame = {
      id: `${t.id}-${c}`, kind: 'car', x: 0, y: 0, z: 0, yaw: 0, pitch: 0,
      colliders, radius: CAR_PITCH, zones: [], inside: CAR_INSIDE, prev: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
      blockers: build.gates.map((g) => ({
        min: [g.pos[0] - g.width / 2, g.pos[1], g.pos[2] - 0.08],
        max: [g.pos[0] + g.width / 2, g.pos[1] + g.height, g.pos[2] + 0.08],
        isOpen: () => t.state.doorOpen > 0.7 && g.side === t.doorSide,
      })),
    };
    t.cars.push(f);
  }
  place(t, true);
  return t;
}

function place(t: TrainRuntime, snap: boolean) {
  const { geom } = t.sim;
  t.doorSide = geom.doorSide(geom.lateral(t.state.track, t.state.s), t.state.s);
  t.cars.forEach((f, c) => {
    const p = f.prev!;
    p.x = f.x; p.y = f.y; p.z = f.z; p.yaw = f.yaw; p.pitch = f.pitch;
    carPose(geom, t.state, c, pose);
    f.x = pose.x; f.y = pose.y; f.z = pose.z; f.yaw = pose.yaw; f.pitch = pose.pitch;
    if (snap) {
      p.x = f.x; p.y = f.y; p.z = f.z; p.yaw = f.yaw; p.pitch = f.pitch;
    }
  });
}

export const trains: TrainRuntime[] = [];

export function updateTrains(time: number) {
  if (trains.length === 0) {
    for (const sim of NET) for (let k = 0; k < sim.tt.trainCount; k++) trains.push(makeTrain(sim, k, time));
    return;
  }
  for (const t of trains) {
    t.state = trainStateAt(t.sim.tt, t.index, time);
    place(t, false);
  }
}

/** The train a car frame belongs to. */
export function trainOfFrame(f: Frame): TrainRuntime | null {
  for (const t of trains) if (t.cars.includes(f)) return t;
  return null;
}
