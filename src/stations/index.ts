// Station registry: builds every station from the network data + its spec and
// exposes the result as a collision frame plus render data.

import { LINES, STATIONS, stationById } from '../data/network';
import type { StationDef } from '../data/types';
import { RAIL_NET, clock, lineSim } from '../sim';
import { builtRange, halfWidth } from '../world/structure';
import { platformDoorOpen } from '../sim/timetable';
import { inPlot, plotReach, type Build, type V3 } from '../world/builder';
import { isWater } from '../data/geography';
import { makeColliders, type Blocker, type Frame } from '../world/collision';
import { buildStation } from './build';
import { KAWAMINATO_SPAWN } from './kawaminato';
import { higashiKawaminato, konyahama, miokami } from './rail';
import { TOSEN_FRAME, TOSEN_NAMES, tosenMachi } from './tosen-street';
import { KAMOME_FRAME, KAMOME_NAME, kamomeGaOka } from './kamome-street';
import { HATOBA_FRAME, HATOBA_NAME, kitaHatoba } from './hatoba-street';
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
export function gateOpen(line: string, stop: number, track: 'down' | 'up', service?: string): number {
  if (clock.time !== gateCacheTime) {
    gateCache.clear();
    gateCacheTime = clock.time;
  }
  const k = `${line}:${stop}:${track}:${service ?? ''}`;
  let v = gateCache.get(k);
  if (v === undefined) {
    // (Every service type's trains: a Local and a Rapid both open the gates.)
    const sim = lineSim(line);
    v = Math.max(0, ...(sim.services?.length ? sim.services.filter((sv) => !service || sv.type.id === service) : [{ tt: sim.tt }]).map((sv) => platformDoorOpen(sv.tt, stop, track, clock.time)));
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
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  const wet = (lx: number, lz: number) => isWater(x + lx * c + lz * sn, z - lx * sn + lz * c);
  // Beyond its plot a station's street runs on between rows of buildings: none of them stands in the
  // water (data/geography.ts), at its frontage or 10 m back into its lot.
  build.models = build.models.filter((m) => {
    const [lx, , lz] = m.pos;
    // (Afloat, below the ground: a moored boat.)
    if (inPlot(build.plot, lx, lz) || m.pos[1] < -0.5) return true;
    // (Placed on the water on purpose: Minatoura-bashi, the breakwater's lighthouse, the cranes across the harbour.)
    // (And Watayamachi's expressway, which leaves the shore on piers.)
    if (m.kind === 'minato' || (m.kind === 'port' && m.id === 'crane') || (m.kind === 'watacentre' && (m.id === 'deck' || m.id === 'pier_sea'))) return true;
    return !wet(lx, lz) && !wet(lx + Math.sin(m.yaw) * 10, lz + Math.cos(m.yaw) * 10);
  });
  const blockers: Blocker[] = build.gates.map((g) => {
    const hx = g.along[0] !== 0 ? g.width / 2 : 0.1, hz = g.along[0] !== 0 ? 0.1 : g.width / 2;
    return {
      min: [g.pos[0] - hx, g.pos[1], g.pos[2] - hz],
      max: [g.pos[0] + hx, g.pos[1] + Math.max(1.3, g.height), g.pos[2] + hz],
      isOpen: () => gateOpen(g.line!, g.stop!, g.track!, g.service) > 0.7,
    };
  });
  const frame: Frame = {
    id: def.id, kind: 'station', x, y: 0, z, yaw, pitch: 0,
    colliders: makeColliders(build), blockers, radius: Math.hypot(build.plot.x, Math.max(build.plot.z, build.plot.north ?? 0)) + 5,
    // (A plot's arms are solid and walked out to their ends: collision/near.)
    reach: build.plot.arms || build.reach ? Math.max(build.plot.arms ? plotReach(build.plot) + 5 : 0, build.reach ?? 0) : undefined, zones: build.zones,
  };
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
export const RAIL_WORLDS: StationWorld[] = ([['miokami', miokami], ['higashi-kawaminato', higashiKawaminato], ['konyahama', konyahama]] as const).map(([id, build]) => {
  const { geom } = RAIL_NET[0], s = geom.stopS[geom.def.stops.indexOf(id)], o = geom.path.pointAt(s);
  return place(stationById(id), build(), geom.def.id, o.x, o.z, geom.yawAt(s));
});
/**
 * The north districts (2026-11-24): streets with no station, each a world of its own that mounts by distance
 * like a station's. Their def is a stand-in (an id and names only): never a station, so never where.station,
 * a teleport or a route's end (player.ts keeps them to zones).
 */
const districtDef = (id: string, ja: string, en: string, x: number, z: number): StationDef => ({
  id, nameJa: ja, nameKana: '', nameRomaji: en, numbers: {}, position: { x, y: z }, diagram: { x: 0, y: 0 },
  district: en, districtJa: ja, platforms: {}, blurb: '',
});
export const DISTRICT_WORLDS: StationWorld[] = [
  place(districtDef('tosen-machi', TOSEN_NAMES.district.ja, TOSEN_NAMES.district.en, TOSEN_FRAME.x, TOSEN_FRAME.z), tosenMachi(), 'district', TOSEN_FRAME.x, TOSEN_FRAME.z, 0),
  place(districtDef('kita-hatoba', HATOBA_NAME.ja, HATOBA_NAME.en, HATOBA_FRAME.x, HATOBA_FRAME.z), kitaHatoba(), 'district', HATOBA_FRAME.x, HATOBA_FRAME.z, 0),
  place(districtDef('kamome-ga-oka', KAMOME_NAME.ja, KAMOME_NAME.en, KAMOME_FRAME.x, KAMOME_FRAME.z), kamomeGaOka(), 'district', KAMOME_FRAME.x, KAMOME_FRAME.z, 0),
];
/** Every world there is to stand in. */
export const WORLDS: StationWorld[] = [...STATION_WORLDS, ...RAIL_WORLDS, ...DISTRICT_WORLDS];
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
