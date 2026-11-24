// Trains passing, heard from outside: from the street, a crossing or a lane beside the line (on a
// platform, in a concourse or riding, platform.ts and car.ts play them instead). For the nearest
// trains on open track (cutting, viaduct, embankment or street level, not in a tunnel): the
// rolling rumble and the clatter of the rail joints, faster with speed; the motors' whine; and on
// a viaduct the deep boom of the structure. Each follows the point of the train nearest the listener.

import { trains, type TrainRuntime } from '../trains/system';
import { carOf } from '../sim/geometry';
import { structureAt } from '../world/structure';
import type { V3 } from '../world/builder';
import { audioLive, loopAt, type PosLoopHandle } from './engine';

const VOICES = 2, REACH = 220;
type Layer = 'ext-roll' | 'ext-motor' | 'rail-joints' | 'viaduct-boom';
/** How near each layer must be to be heard at full level (it fades as 1/distance beyond). */
const REF: Record<Layer, number> = { 'ext-roll': 26, 'ext-motor': 16, 'rail-joints': 20, 'viaduct-boom': 30 };

class Voice {
  at: V3 = [0, 0, 0];
  on: TrainRuntime | null = null;
  private loops = new Map<Layer, PosLoopHandle>();
  set(name: Layer, rate: number, gain: number, cutoff: number) {
    if (gain > 0 && !this.loops.has(name) && audioLive()) this.loops.set(name, loopAt(name, () => this.at, true, REF[name]));
    this.loops.get(name)?.set(rate, gain, cutoff);
  }
  hush() {
    for (const l of this.loops.values()) l.set(1, 0);
  }
}
const voices = Array.from({ length: VOICES }, () => new Voice());

/** The point of a train nearest (x, z), if it is on open track and within reach: where, how far, and on what. */
function nearest(t: TrainRuntime, x: number, y: number, z: number) {
  const g = t.sim.geom, def = g.def, car = carOf(def), half = (car.pitch * def.service.cars) / 2;
  const mid = g.path.pointAt(t.state.s);
  if (Math.hypot(mid.x - x, mid.z - z) > REACH + half) return null;
  const s = Math.min(t.state.s + half, Math.max(t.state.s - half, g.path.project(x, z).s));
  const type = structureAt(g, s);
  if (type === 'tunnel' || type === 'station') return null;
  const p = g.path.pointAt(s), ry = g.railY(s);
  const at: V3 = [p.x, ry + 0.8, p.z];
  const d = Math.hypot(at[0] - x, at[1] - y, at[2] - z);
  return d < REACH ? { at, d, high: type === 'viaduct' && ry > 2.5 } : null;
}

/** `quiet`: on a platform, in a concourse, riding, below ground or not playing: nothing from here. */
export function tickTracksideAudio(cam: { x: number; y: number; z: number }, quiet: boolean) {
  const found = quiet ? [] : trains
    .filter((t) => Math.abs(t.state.speed) > 0.3)
    .map((t) => ({ t, n: nearest(t, cam.x, cam.y, cam.z) }))
    .filter((c): c is { t: TrainRuntime; n: NonNullable<ReturnType<typeof nearest>> } => c.n !== null)
    .sort((a, b) => a.n.d - b.n.d);
  // A voice stays with its train while it is still among the nearest.
  for (const v of voices) if (v.on && !found.slice(0, VOICES).some((c) => c.t === v.on)) v.on = null;
  for (const c of found.slice(0, VOICES)) {
    if (voices.some((v) => v.on === c.t)) continue;
    const free = voices.find((v) => !v.on);
    if (free) free.on = c.t;
  }
  for (const v of voices) {
    const c = v.on && found.find((f) => f.t === v.on);
    if (!c) {
      v.hush();
      continue;
    }
    v.at = c.n.at;
    const speed = Math.abs(c.t.state.speed), k = Math.min(1, speed / c.t.sim.geom.def.service.maxSpeed);
    // Far off, the highs go first.
    const air = 2500 + 14000 * Math.exp(-c.n.d / 70);
    v.set('ext-roll', 0.7 + 0.5 * k, Math.min(1.3, 0.25 + 1.2 * k), air);
    v.set('rail-joints', 0.55 + 0.75 * k, Math.min(1.1, 0.15 + 1.1 * k), air);
    v.set('ext-motor', 0.5 + 1.1 * k, 0.35 + 0.35 * k, air);
    v.set('viaduct-boom', 0.8 + 0.3 * k, c.n.high ? 0.4 + 1.0 * k : 0, 700);
  }
}
