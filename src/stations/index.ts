// Station registry: builds every station from the network data + its spec and
// exposes the result as a collision frame plus render data.

import { LINES, STATIONS, stationById } from '../data/network';
import type { StationDef } from '../data/types';
import { RAIL_NET, clock, lineSim } from '../sim';
import { builtRange, halfWidth } from '../world/structure';
import { platformDoorOpen } from '../sim/timetable';
import type { Build, V3 } from '../world/builder';
import { makeColliders, type Blocker, type Frame } from '../world/collision';
import { buildStation } from './build';
import { KAWAMINATO_SPAWN } from './kawaminato';
import { higashiKawaminato, miokami } from './rail';
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
    // (Every service type's trains: a Local and a Rapid both open the gates.)
    const sim = lineSim(line);
    v = Math.max(...(sim.services?.length ? sim.services : [{ tt: sim.tt }]).map((sv) => platformDoorOpen(sv.tt, stop, track, clock.time)));
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

/**
 * A main line built later along the edge of a station's plot (the AR viaduct along the north of
 * Suzukakedōri's): the plot's buildings are cut back to stand clear of it. Only a line that runs
 * square to the plot along one edge is handled; anything else must be cleared by hand.
 */
function clearRailCorridors(def: StationDef, build: Build, ox: number, oz: number, yaw: number) {
  const c = Math.cos(yaw), sn = Math.sin(yaw), { x: PX, z: PZ } = build.plot;
  const local = (x: number, z: number): [number, number] => [(x - ox) * c - (z - oz) * sn, (x - ox) * sn + (z - oz) * c];
  for (const { geom } of RAIL_NET) {
    const r = builtRange(geom);
    if (!r) continue;
    // (The station that hosts the line's own models builds round it itself.)
    if ((geom.def.built!.modelled ?? []).some((m) => {
      const p = geom.path.pointAt(geom.stopS[geom.def.stops.indexOf(m.station)]), [lx, lz] = local(p.x, p.z);
      return Math.abs(lx) < PX && Math.abs(lz) < PZ;
    })) continue;
    const M = halfWidth(geom) + 3;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let s = r[0]; s <= r[1]; s += 4) {
      if (geom.railY(s) < 2) continue;
      const p = geom.path.pointAt(s), [lx, lz] = local(p.x, p.z);
      if (Math.abs(lx) > PX + 4 || Math.abs(lz) > PZ + M) continue;
      x0 = Math.min(x0, lx - 4); x1 = Math.max(x1, lx + 4); z0 = Math.min(z0, lz - M); z1 = Math.max(z1, lz + M);
    }
    if (x0 > x1) continue;
    const north = z0 < -PZ, south = z1 > PZ;
    if (z1 - z0 > 2 * M + 1 || north === south) throw new Error(`${def.id}: the ${geom.def.id} line crosses the plot; clear its course by hand`);
    build.boxes = build.boxes.flatMap((bx) => {
      const outside = bx.min[0] >= PX || bx.max[0] <= -PX || bx.min[2] >= PZ || bx.max[2] <= -PZ;
      if (outside || bx.max[1] < 1 || bx.max[0] < x0 || bx.min[0] > x1) return [bx];
      if (north) return bx.max[2] <= z1 ? [] : bx.min[2] < z1 ? [{ ...bx, min: [bx.min[0], bx.min[1], z1] as [number, number, number] }] : [bx];
      return bx.min[2] >= z0 ? [] : bx.max[2] > z0 ? [{ ...bx, max: [bx.max[0], bx.max[1], z0] as [number, number, number] }] : [bx];
    });
  }
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
  clearRailCorridors(def, build, o.x, o.z, yaw);
  return place(def, build, primary, o.x, o.z, yaw);
}

/** A built station set down in the world: its collision frame (platform gates open with the trains) and its spawn point. */
function place(def: StationDef, build: Build, primary: string, x: number, z: number, yaw: number): StationWorld {
  const blockers: Blocker[] = build.gates.map((g) => {
    const hx = g.along[0] !== 0 ? g.width / 2 : 0.1, hz = g.along[0] !== 0 ? 0.1 : g.width / 2;
    return {
      min: [g.pos[0] - hx, g.pos[1], g.pos[2] - hz],
      max: [g.pos[0] + hx, g.pos[1] + Math.max(1.3, g.height), g.pos[2] + hz],
      isOpen: () => gateOpen(g.line!, g.stop!, g.track!) > 0.7,
    };
  });
  const frame: Frame = {
    id: def.id, kind: 'station', x, y: 0, z, yaw, pitch: 0,
    colliders: makeColliders(build), blockers, radius: Math.hypot(build.plot.x, build.plot.z) + 5, zones: build.zones,
  };
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  const sp = build.spawn.pos;
  return {
    def, build, frame, primary,
    spawn: { pos: [x + sp[0] * c + sp[2] * sn, sp[1], z - sp[0] * sn + sp[2] * c], yaw: build.spawn.yaw + yaw },
  };
}

export const STATION_WORLDS: StationWorld[] = STATIONS.map(make);
/**
 * The main line's stations that stand on its swept trackbed, each in a small world of its own along the
 * line (rail.ts): platforms only, so they are kept out of STATION_WORLDS, whose stations all have a
 * street, exits and a plot of ground.
 */
export const RAIL_WORLDS: StationWorld[] = ([['miokami', miokami], ['higashi-kawaminato', higashiKawaminato]] as const).map(([id, build]) => {
  const { geom } = RAIL_NET[0], s = geom.stopS[geom.def.stops.indexOf(id)], o = geom.path.pointAt(s);
  return place(stationById(id), build(), geom.def.id, o.x, o.z, geom.yawAt(s));
});
/** Every world there is to stand in. */
export const WORLDS: StationWorld[] = [...STATION_WORLDS, ...RAIL_WORLDS];
/**
 * A railway station built inside another station's plot (Kawaminato in Kita-Ōdōri's): the world it
 * stands in, and a place on its platform in that world's frame (where a teleport there lands).
 */
const HOSTED: Record<string, { host: string; pos: V3; yaw: number }> = { kawaminato: { host: 'kita-odori', ...KAWAMINATO_SPAWN } };
export const hostedPlace = (id: string) => HOSTED[id] as { host: string; pos: V3; yaw: number } | undefined;
export const stationWorld = (id: string): StationWorld => {
  const s = WORLDS.find((x) => x.def.id === (HOSTED[id]?.host ?? id));
  if (!s) throw new Error(`unknown station ${id}`);
  return s;
};
