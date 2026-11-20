// Dev-only camera jumps for checking a station by screenshot (window.__sim.look / views / go).
// Positions are in the station's own frame (+x along its primary line), as in the look files.

import { player } from '../player/player';
import { perfStats } from '../render/perf';
import { stationWorld } from '../stations';
import { useUI } from '../ui/store';
import { FILL_SPOTS } from '../stations/fill';
import { crossingTest } from '../signs/departures';

type V3 = [number, number, number];
export type View = { label: string; pos: V3; yaw: number; pitch: number };

/** Stand at `l` (station frame), facing local yaw (0 = −z, π/2 = −x), pitch down < 0. */
export function look(id: string, l: V3, yaw = 0, pitch = 0) {
  const w = stationWorld(id);
  const c = Math.cos(w.frame.yaw), sn = Math.sin(w.frame.yaw);
  if (useUI.getState().mode !== 'play') useUI.getState().start(id);
  const b = player.body;
  b.pos = [w.frame.x + l[0] * c + l[2] * sn, l[1] + 0.05, w.frame.z - l[0] * sn + l[2] * c];
  b.vy = 0;
  b.ride = null;
  player.yaw = yaw + w.frame.yaw;
  player.pitch = pitch;
  player.eyeY = l[1];
}

const face = (from: V3, to: V3) => Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]));

/** A standard set of views: each platform, each concourse, each exit from the street and from its foot. */
export function views(id: string): View[] {
  const zs = stationWorld(id).build.zones;
  const v: View[] = [];
  const mid = (z: (typeof zs)[number]): V3 => [(z.min[0] + z.max[0]) / 2, z.min[1] + 0.3, (z.min[2] + z.max[2]) / 2];
  for (const z of zs.filter((z) => z.kind === 'platform')) {
    const m = mid(z), lx = z.max[0] - z.min[0], lz = z.max[2] - z.min[2];
    // Along the platform edge, which stairs, pillars and signs keep clear of.
    const p: V3 = lx > lz ? [z.min[0] + lx * 0.15, m[1], z.max[2] - 1.0] : [z.max[0] - 1.0, m[1], z.min[2] + lz * 0.15];
    v.push({ label: `platform: ${z.en}`, pos: p, yaw: face(p, lx > lz ? [z.max[0], m[1], m[2]] : [m[0], m[1], z.max[2]]), pitch: 0 });
  }
  for (const z of zs.filter((z) => z.kind === 'concourse')) {
    const m = mid(z), lx = z.max[0] - z.min[0], lz = z.max[2] - z.min[2];
    const p: V3 = lx > lz ? [z.min[0] + 2, m[1], m[2]] : [m[0], m[1], z.min[2] + 2];
    v.push({ label: `concourse: ${z.en}`, pos: p, yaw: face(p, m), pitch: 0 });
  }
  for (const z of zs.filter((z) => z.kind === 'passage' && /Exit/.test(z.en))) {
    const lx = z.max[0] - z.min[0], lz = z.max[2] - z.min[2];
    const ax = lx > lz ? 0 : 2, side = ax === 0 ? 2 : 0;
    // The street end: where the zone's highest stair (ramp) climbs to.
    const inZone = stationWorld(id).build.ramps.filter((r) => r.yHigh > -0.5 && r.yHigh < 1
      && r.x0 >= z.min[0] - 0.1 && r.x1 <= z.max[0] + 0.1 && r.z0 >= z.min[2] - 0.1 && r.z1 <= z.max[2] + 0.1);
    const st = inZone[0];
    const far = st
      ? (ax === 0 ? (st.up[0] > 0 ? z.max[0] : z.min[0]) : (st.up[1] > 0 ? z.max[2] : z.min[2]))
      : Math.abs(z.max[ax]) > Math.abs(z.min[ax]) ? z.max[ax] : z.min[ax];
    const near = far === z.max[ax] ? z.min[ax] : z.max[ax];
    const sgn = Math.sign(far - near) || 1, cs = (z.min[side] + z.max[side]) / 2;
    const top: V3 = [0, 0.2, 0], street: V3 = [0, 0.2, 0], foot: V3 = [0, z.min[1] + 0.3, 0];
    top[ax] = far - sgn * 4; top[side] = cs;
    // Straight out in front of the mouth, where people walk (off to the side can be a building or a river).
    street[ax] = far + sgn * 8; street[side] = cs + (cs >= 0 ? 1.5 : -1.5);
    foot[ax] = near + sgn * 1.5; foot[side] = cs;
    v.push({ label: `street: ${z.en}`, pos: street, yaw: face(street, top), pitch: -0.12 });
    v.push({ label: `stairs: ${z.en}`, pos: foot, yaw: face(foot, top), pitch: 0.1 });
  }
  return v;
}

/** Jump to view `i` of `views(id)`; returns its label. */
export function go(id: string, i: number): string {
  const x = views(id)[i];
  if (!x) return `${id} has ${views(id).length} views`;
  look(id, x.pos, x.yaw, x.pitch);
  return x.label;
}

/** Look at the k-th hall item placed by fill.ts at a station, from 5 m off on its +x side (or −x). */
export function feature(id: string, k = 0, side: 1 | -1 = 1): string {
  const f = (FILL_SPOTS.get(id) ?? [])[k];
  if (!f) return `${id} has ${(FILL_SPOTS.get(id) ?? []).length} placed items`;
  const p: V3 = [f.x + side * 5, f.cf + 0.1, f.z + (f.z > 0 ? -2 : 2)];
  look(id, p, face(p, [f.x, f.cf, f.z]), -0.2);
  return f.k;
}

/** The live three.js scene, for counting what is in it. */
/** Force every level crossing closed (true) or open (false); null lets them follow the trains again. */
export function crossing(force: boolean | null) {
  crossingTest.force = force;
  return force;
}

export const scene = () => perfStats.scene;

/** This frame's cost: draw calls and triangles over every pass, and the frame's smoothed JavaScript time in ms. */
export function perf() {
  return { calls: perfStats.calls, tris: perfStats.tris, ms: Math.round(perfStats.ms * 10) / 10 };
}
