// Station registry: builds every station from the network data + its spec and
// exposes the result as a collision frame plus render data.

import { LINES, STATIONS } from '../data/network';
import type { StationDef } from '../data/types';
import { clock, lineSim } from '../sim';
import { platformDoorOpen } from '../sim/timetable';
import type { Build, V3 } from '../world/builder';
import { makeColliders, type Blocker, type Frame } from '../world/collision';
import { buildStation } from './build';
import { SPECS } from './specs';

export interface StationWorld {
  def: StationDef;
  build: Build;
  frame: Frame;
  /** Line whose direction the station frame follows. */
  primary: string;
  /** World spawn point (concourse, facing the gates). */
  spawn: { pos: V3; yaw: number };
}

// Gate state is asked for many times per tick; cache it per sim time.
const gateCache = new Map<string, number>();
let gateCacheTime = -1;
export function gateOpen(line: string, stop: number, track: 'down' | 'up'): number {
  if (clock.time !== gateCacheTime) {
    gateCache.clear();
    gateCacheTime = clock.time;
  }
  const k = `${line}:${stop}:${track}`;
  let v = gateCache.get(k);
  if (v === undefined) {
    v = platformDoorOpen(lineSim(line).tt, stop, track, clock.time);
    // Through-running lines stop at this line's platforms too (Sumire at Shiokaze platforms).
    const station = lineSim(line).geom.def.stops[stop];
    for (const l of LINES) {
      if (l.shares?.line !== line) continue;
      const i = l.stops.indexOf(station);
      if (i >= 0) v = Math.max(v, platformDoorOpen(lineSim(l.id).tt, i, track, clock.time));
    }
    gateCache.set(k, v);
  }
  return v;
}

function make(def: StationDef): StationWorld {
  const spec = SPECS[def.id];
  if (!spec) throw new Error(`no 3D spec for station ${def.id}`);
  const lines = LINES.filter((l) => l.stops.includes(def.id)).map((line) => {
    const { geom } = lineSim(line.id);
    const stop = line.stops.indexOf(def.id);
    const p = geom.path.pointAt(geom.stopS[stop]);
    return { line, stop, railY: line.railY[stop], dir: [p.tx, p.tz] as [number, number], geom };
  });
  const { build, primary } = buildStation({ station: def, spec, lines });
  const pl = lines.find((l) => l.line.id === primary)!;
  const s = pl.geom.stopS[pl.stop];
  const o = pl.geom.path.pointAt(s);
  const yaw = pl.geom.yawAt(s);
  const blockers: Blocker[] = build.gates.map((g) => {
    const hx = g.along[0] !== 0 ? g.width / 2 : 0.1, hz = g.along[0] !== 0 ? 0.1 : g.width / 2;
    return {
      min: [g.pos[0] - hx, g.pos[1], g.pos[2] - hz],
      max: [g.pos[0] + hx, g.pos[1] + Math.max(1.3, g.height), g.pos[2] + hz],
      isOpen: () => gateOpen(g.line!, g.stop!, g.track!) > 0.7,
    };
  });
  const frame: Frame = {
    id: def.id, kind: 'station', x: o.x, y: 0, z: o.z, yaw, pitch: 0,
    colliders: makeColliders(build), blockers, radius: Math.hypot(build.plot.x, build.plot.z) + 5, zones: build.zones,
  };
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  const sp = build.spawn.pos;
  return {
    def, build, frame, primary,
    spawn: { pos: [o.x + sp[0] * c + sp[2] * sn, sp[1], o.z - sp[0] * sn + sp[2] * c], yaw: build.spawn.yaw + yaw },
  };
}

export const STATION_WORLDS: StationWorld[] = STATIONS.map(make);
export const stationWorld = (id: string): StationWorld => {
  const s = STATION_WORLDS.find((x) => x.def.id === id);
  if (!s) throw new Error(`unknown station ${id}`);
  return s;
};
