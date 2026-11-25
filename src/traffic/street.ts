// Runs the road traffic (system.ts) on the streets of the stations near the camera, and makes
// the vehicles solid: each is a blocker in its station's collision frame, moved every tick.

import { STATION_WORLDS, type StationWorld } from '../stations';
import type { V3 } from '../world/builder';
import { toLocal, toWorld, type Blocker } from '../world/collision';
import { longLanes } from '../world/runon';
import { crossingActive } from '../signs/departures';
import { adopt, makeTraffic, stepTraffic, warmUp, type Traffic } from './system';

export interface Street {
  world: StationWorld;
  sim: Traffic;
  /** The frame's own blockers (platform gates) come first; the vehicles' follow. */
  gates: number;
  boxes: Blocker[];
}

/** The streets with traffic running now. */
export const streets: Street[] = [];

const IN = 240, OUT = 320;
/** A street carried on into a neighbour's (LanePart.hand, .fed) also opens and closes by how near its lanes come. */
const LANE_IN = IN, LANE_OUT = OUT;

/** World-space lane segments of a station whose street is carried on into a neighbour's, and how far they reach from its middle. */
const linked = new Map<StationWorld, { segs: [number, number, number, number][]; reach: number } | null>();
function links(w: StationWorld) {
  let k = linked.get(w);
  if (k !== undefined) return k;
  k = null;
  if (w.build.lanes.some((l) => l.hand || l.fed)) {
    const a: V3 = [0, 0, 0], e: V3 = [0, 0, 0], f = w.frame;
    const segs = longLanes(w).map((l): [number, number, number, number] => {
      toWorld(f, l.from, a);
      toWorld(f, l.to, e);
      return [a[0], a[2], e[0], e[2]];
    });
    const reach = Math.max(...segs.flatMap(([x0, z0, x1, z1]) => [Math.hypot(x0 - f.x, z0 - f.z), Math.hypot(x1 - f.x, z1 - f.z)]));
    k = { segs, reach };
  }
  linked.set(w, k);
  return k;
}
function laneDist(w: StationWorld, x: number, z: number): number {
  const k = links(w);
  if (!k) return Infinity;
  let best = Infinity;
  for (const [x0, z0, x1, z1] of k.segs) {
    const dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x0 + t * dx - x, z0 + t * dz - z));
  }
  return best;
}

/** Each `hand` lane of a street: its lane, the distance along it where vehicles move over, and the neighbour's lane and distance there. */
type Hand = { lane: number; at: number; station: string; to: number; ls: number };
const hands = new Map<StationWorld, Hand[]>();
function handsOf(s: Street): Hand[] {
  let out = hands.get(s.world);
  if (out) return out;
  out = [];
  const p: V3 = [0, 0, 0], q: V3 = [0, 0, 0];
  for (const lane of s.sim.lanes) {
    const h = lane.part.hand;
    if (!h) continue;
    const at = (h.at[0] - lane.part.from[0]) * lane.ux + (h.at[2] - lane.part.from[2]) * lane.uz;
    const other = STATION_WORLDS.find((w) => w.def.id === h.station);
    if (!other) throw new Error(`${s.world.def.id}: hand to unknown station ${h.station}`);
    toWorld(s.world.frame, h.at, p);
    toLocal(other.frame, p, q);
    const dyaw = s.world.frame.yaw - other.frame.yaw, c = Math.cos(dyaw), sn = Math.sin(dyaw);
    const ux = lane.ux * c + lane.uz * sn, uz = -lane.ux * sn + lane.uz * c;
    const to = longLanes(other).findIndex((l) => {
      const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], n = Math.hypot(dx, dz), along = (q[0] - l.from[0]) * dx / n + (q[2] - l.from[2]) * dz / n;
      return (dx * ux + dz * uz) / n > 0.99 && Math.abs((q[0] - l.from[0]) * dz / n - (q[2] - l.from[2]) * dx / n) < 0.3 && along > 0 && along < n;
    });
    if (to < 0) throw new Error(`${s.world.def.id}: no lane of ${h.station} takes over lane ${lane.index}`);
    const l = longLanes(other)[to], n = Math.hypot(l.to[0] - l.from[0], l.to[2] - l.from[2]);
    out.push({ lane: lane.index, at, station: h.station, to, ls: ((q[0] - l.from[0]) * (l.to[0] - l.from[0]) + (q[2] - l.from[2]) * (l.to[2] - l.from[2])) / n });
  }
  hands.set(s.world, out);
  return out;
}

/** Vehicles past a `hand` point move over to the neighbour's street, if it runs; `fed` lanes set out nothing while theirs runs. */
function handOver() {
  for (const s of streets) {
    for (const lane of s.sim.lanes) lane.muted = !!lane.part.fed && streets.some((o) => o.world.def.id === lane.part.fed);
    for (const h of handsOf(s)) {
      const o = streets.find((x) => x.world.def.id === h.station);
      if (!o) continue;
      const from = s.sim.lanes[h.lane], into = o.sim.lanes[h.to], list = s.sim.list;
      for (let n = list.length - 1; n >= 0; n--) {
        const v = list[n];
        if (v.lane !== from || v.ls < h.at || v.ls > h.at + 20) continue;
        if (adopt(o.sim, into, v, h.ls + (v.ls - h.at))) list.splice(n, 1);
      }
    }
  }
}
const never = () => false;
const local: V3 = [0, 0, 0];
let last = NaN, lastLevel = 1;

function close(s: Street) {
  s.world.frame.blockers.length = s.gates;
  streets.splice(streets.indexOf(s), 1);
}

function solid(s: Street) {
  const blockers = s.world.frame.blockers;
  blockers.length = s.gates;
  let n = 0;
  for (const v of s.sim.list) {
    // The box round its footprint, whichever way it is turned.
    const ax = Math.abs(v.hx), az = Math.abs(v.hz);
    const hx = (ax * v.len + az * v.wid) / 2, hz = (az * v.len + ax * v.wid) / 2;
    const b = (s.boxes[n++] ??= { min: [0, 0, 0], max: [0, 0, 0], isOpen: never });
    b.min[0] = v.x - hx; b.min[1] = v.y; b.min[2] = v.z - hz;
    b.max[0] = v.x + hx; b.max[1] = v.y + v.hgt; b.max[2] = v.z + hz;
    blockers.push(b);
  }
}

/**
 * Advance the traffic to sim time `time`. `cam`: where it is watched from. `walker`: the player's
 * feet (world), whom the vehicles stop for, or null. `on`: the settings switch. `level`: the density setting.
 */
export function updateTraffic(time: number, cam: { x: number; z: number }, walker: V3 | null, on: boolean, level = 1) {
  const dt = time - last;
  last = time;
  // The clock was set (main menu) or ran backwards: start the streets afresh.
  // The same when the density setting changes: the streets fill to the new level at once, not over minutes.
  const reset = !(dt >= 0) || dt > 20 || level !== lastLevel;
  lastLevel = level;
  for (let i = streets.length - 1; i >= 0; i--) {
    const s = streets[i], f = s.world.frame;
    if (!on || reset || (Math.hypot(f.x - cam.x, f.z - cam.z) > f.radius + OUT && laneDist(s.world, cam.x, cam.z) > LANE_OUT)) close(s);
  }
  if (!on) return;
  for (const world of STATION_WORLDS) {
    const f = world.frame;
    if (!world.build.lanes.length || streets.some((s) => s.world === world)) continue;
    if (Math.hypot(f.x - cam.x, f.z - cam.z) > f.radius + IN && laneDist(world, cam.x, cam.z) > LANE_IN) continue;
    const k = links(world);
    if (k) f.reach = Math.max(f.reach ?? 0, k.reach + 4);
    const sim = makeTraffic(longLanes(world), world.build.lanes.length * 131 + Math.round(f.x));
    warmUp(sim, time, 150, level);
    streets.push({ world, sim, gates: f.blockers.length, boxes: [] });
  }
  const steps = reset || dt <= 0 ? 0 : Math.min(8, Math.ceil(dt / 0.1));
  for (const s of streets) {
    const w = walker ? toLocal(s.world.frame, walker, local) : null;
    const who = w ? { x: w[0], y: w[1], z: w[2] } : null;
    for (let i = 0; i < steps; i++) {
      const t = time - dt + ((i + 1) * dt) / steps;
      stepTraffic(s.sim, dt / steps, t, who, (line, station) => crossingActive(line, station, t), level);
    }
  }
  if (steps) handOver();
  for (const s of streets) solid(s);
}
