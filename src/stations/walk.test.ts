// Walkability: flood-fill each station from its spawn point using the real character
// controller, and check that every platform, concourse, passage and the street can be
// reached on foot. Platform screen doors are closed during the test, so this also
// proves the track is NOT reachable.

import { describe, expect, it } from 'vitest';
import { STATION_WORLDS } from './index';
import { stepBody, toLocal, toWorld, type Body } from '../world/collision';
import type { V3 } from '../world/builder';
import { clock } from '../sim';
import { hallDims } from './kit';
import { LINES } from '../data/network';

const STEP = 0.6;
const SUB = 6;

function flood(w: (typeof STATION_WORLDS)[number], limitX: number, limitZ: number) {
  const f = w.frame;
  const start: V3 = [...w.spawn.pos];
  const seen = new Set<string>();
  const reached: V3[] = [];
  const queue: V3[] = [start];
  const l: V3 = [0, 0, 0];
  // The epsilon keeps rounding consistent at cell edges: without it a point clamped against a
  // wall (29.7 → 49.5 → 50) and the next step through a doorway (30.3 → 50.4999… → 50) share
  // a cell, and the flood stops at the doorway.
  const cell = (v: number) => Math.round(v + 1e-6);
  const key = (p: V3) => {
    toLocal(f, p, l);
    return `${cell(l[0] / STEP)},${cell(l[2] / STEP)},${cell(l[1] / 1.2)}`;
  };
  seen.add(key(start));
  const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([lx, lz]) => [lx * c + lz * s, -lx * s + lz * c]);
  while (queue.length) {
    const p = queue.pop()!;
    reached.push(p);
    for (const [dx, dz] of dirs) {
      const body: Body = { pos: [p[0], p[1], p[2]], vy: 0, grounded: true, ride: null };
      for (let i = 0; i < SUB; i++) stepBody(body, [f], (dx * STEP) / SUB, (dz * STEP) / SUB, 1 / 60, false);
      for (let i = 0; i < 20 && !body.grounded; i++) stepBody(body, [f], 0, 0, 1 / 60, false);
      if (!body.grounded) continue;
      if (Math.hypot(body.pos[0] - p[0], body.pos[2] - p[2]) < STEP * 0.5) continue;
      toLocal(f, body.pos, l);
      if (Math.abs(l[0]) > limitX || Math.abs(l[2]) > limitZ) continue;
      const k = key(body.pos);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push(body.pos);
    }
  }
  return reached;
}

describe('station walkability', () => {
  // Park the clock at a moment with no train at any platform (gates closed).
  clock.time = 3 * 3600 + 7;
  for (const w of STATION_WORLDS) {
    it(`${w.def.id}: all zones reachable from spawn, track is not`, () => {
      // Force every platform gate shut, whatever the timetable says.
      for (const k of w.frame.blockers) k.isOpen = () => false;
      // Explore at least the standard area, and further where a station's zones reach further.
      const inner = w.frame.zones.filter((z) => z.kind !== 'street');
      const reach = (i: 0 | 2) => Math.max(...inner.map((z) => Math.max(Math.abs(z.min[i]), Math.abs(z.max[i])))) + 4;
      const pts = flood(w, Math.max(72, reach(0)), Math.max(40, reach(2)));
      const l: V3 = [0, 0, 0];
      const local = pts.map((p) => [...toLocal(w.frame, p, l)] as V3);
      for (const z of w.frame.zones) {
        const hit = local.some((q) => q[0] >= z.min[0] && q[0] <= z.max[0] && q[1] >= z.min[1] - 0.1 && q[1] <= z.max[1] && q[2] >= z.min[2] && q[2] <= z.max[2]);
        expect(hit, `${w.def.id}: zone "${z.en}" unreachable`).toBe(true);
      }
      // Track beds (every line, however its hall is turned) and closed shells stay out of reach.
      for (const k of w.build.keepOut) {
        const inside = local.filter((q) => q[0] > k.min[0] && q[0] < k.max[0] && q[1] > k.min[1] && q[1] < k.max[1] && q[2] > k.min[2] && q[2] < k.max[2]);
        expect(inside.length, `${w.def.id}: player can reach ${k.en}`).toBe(0);
      }
      // Nothing reachable may be at track-bed level inside a hall.
      for (const line of LINES.filter((x) => x.stops.includes(w.def.id))) {
        const railY = line.railY[line.stops.indexOf(w.def.id)];
        const d = hallDims(line, railY);
        // (Only meaningful for halls aligned with the station frame, i.e. the primary line.)
        if (line.id !== w.primary) continue;
        const overTrack = (z: number) => (d.island ? Math.abs(z) > d.pe + 0.3 : Math.abs(z) < d.pe - 0.3);
        const onTrack = local.filter((q) => Math.abs(q[0]) < 60 && overTrack(q[2]) && Math.abs(q[2]) < d.wallZ && q[1] < d.pf + 0.5 && q[1] > railY - 1.5);
        expect(onTrack.length, `${w.def.id}: player can reach track level on ${line.id}`).toBe(0);
      }
      // The spawn itself must be standing on something.
      const body: Body = { pos: [...w.spawn.pos], vy: 0, grounded: false, ride: null };
      for (let i = 0; i < 30; i++) stepBody(body, [w.frame], 0, 0, 1 / 60, false);
      expect(body.grounded).toBe(true);
      expect(Math.abs(body.pos[1] - w.spawn.pos[1])).toBeLessThan(0.3);
      void toWorld;
    }, 120000);
  }
});
