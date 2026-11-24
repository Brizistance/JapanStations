// Live train state: one runtime per timetabled train, with a collision frame per car.
// `updateTrains` is called once per tick; everything else (renderer, player, HUD) reads it.

import { hasPlatform } from '../data/network';
import type { ServiceType } from '../data/types';
import { carOf } from '../sim/geometry';
import { WORLD_NET, carPose, lineSim, type CarPose, type LineSim } from '../sim';
import { trainStateAt, type Timetable, type TrainState } from '../sim/timetable';
import { makeColliders, type ColliderSet, type Frame } from '../world/collision';
import type { Build } from '../world/builder';
import { buildCar, carInside, type CarKind } from './car';

export interface TrainRuntime {
  id: string;
  sim: LineSim;
  /** The timetable this train runs to: the line's, or its service type's. */
  tt: Timetable;
  /** Its service type (Local, Rapid…), on a line that has them. */
  service?: ServiceType;
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
    const build = buildCar(lineSim(line).geom.def, kind);
    v = { build, colliders: makeColliders(build) };
    carBuilds.set(k, v);
  }
  return v;
}
export const carKind = (car: number, cars: number): CarKind => (car === 0 ? 'cabLow' : car === cars - 1 ? 'cabHigh' : 'mid');

const pose: CarPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };

function makeTrain(sim: LineSim, tt: Timetable, service: ServiceType | undefined, index: number, time: number): TrainRuntime {
  const n = sim.geom.def.service.cars, spec = carOf(sim.geom.def);
  const t: TrainRuntime = {
    id: `${sim.geom.def.id}${service ? `-${service.id}-` : ''}${index + 1}`, sim, tt, service, index, state: trainStateAt(tt, index, time), cars: [], doorSide: 1,
  };
  for (let c = 0; c < n; c++) {
    const { build, colliders } = carBuild(sim.geom.def.id, carKind(c, n));
    const f: Frame = {
      id: `${t.id}-${c}`, kind: 'car', x: 0, y: 0, z: 0, yaw: 0, pitch: 0,
      colliders, radius: spec.pitch, zones: [], inside: carInside(spec), prev: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
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

/** On a line built in part (LineDef.built), doors open only at the stops that have platforms. */
function doorRule(t: TrainRuntime) {
  const def = t.sim.geom.def, p = t.state.phase;
  if (!def.built || t.state.doorOpen === 0) return;
  if (p.kind !== 'dwell' || !hasPlatform(def, p.stop)) t.state.doorOpen = 0;
}

function place(t: TrainRuntime, snap: boolean) {
  doorRule(t);
  const { geom } = t.sim;
  t.doorSide = geom.doorSide(geom.lateral(t.state.track, t.state.s, t.state.service), t.state.s);
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
    for (const sim of WORLD_NET) {
      for (const { tt, type } of sim.services?.length ? sim.services : [{ tt: sim.tt, type: undefined }]) {
        for (let k = 0; k < tt.trainCount; k++) trains.push(makeTrain(sim, tt, type, k, time));
      }
    }
    return;
  }
  for (const t of trains) {
    t.state = trainStateAt(t.tt, t.index, time);
    place(t, false);
  }
}

/** The train a car frame belongs to. */
export function trainOfFrame(f: Frame): TrainRuntime | null {
  for (const t of trains) if (t.cars.includes(f)) return t;
  return null;
}
