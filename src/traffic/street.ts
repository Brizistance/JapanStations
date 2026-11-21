// Runs the road traffic (system.ts) on the streets of the stations near the camera, and makes
// the vehicles solid: each is a blocker in its station's collision frame, moved every tick.

import { STATION_WORLDS, type StationWorld } from '../stations';
import type { V3 } from '../world/builder';
import { toLocal, type Blocker } from '../world/collision';
import { longLanes } from '../world/runon';
import { crossingActive } from '../signs/departures';
import { makeTraffic, stepTraffic, warmUp, type Traffic } from './system';

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
    if (!on || reset || Math.hypot(f.x - cam.x, f.z - cam.z) > f.radius + OUT) close(s);
  }
  if (!on) return;
  for (const world of STATION_WORLDS) {
    const f = world.frame;
    if (!world.build.lanes.length || streets.some((s) => s.world === world)) continue;
    if (Math.hypot(f.x - cam.x, f.z - cam.z) > f.radius + IN) continue;
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
    solid(s);
  }
}
