// Kon'yahama's shore is walked in its own world (a rail world, which walk.test.ts does not cover):
// flood-fill it from Tsumugi-dōri west of the crossing with the real character controller, and
// check that every place on the shore can be reached and the track cannot.

import { describe, expect, it } from 'vitest';
import { RAIL_WORLDS } from './index';
import { stepBody, toLocal, toWorld, type Body } from '../world/collision';
import type { V3 } from '../world/builder';
import { clock } from '../sim';
import { stationById } from '../data/network';

const STEP = 0.6;
const SUB = 6;

describe("Kon'yahama's shore", () => {
  clock.time = 3 * 3600 + 7;
  const w = RAIL_WORLDS.find((x) => x.def.id === 'konyahama')!;
  const f = w.frame;

  /** Every point reached on foot from `start` (frame-local), inside the plot. */
  function flood(start: V3): V3[] {
    const p0: V3 = [0, 0, 0];
    toWorld(f, start, p0);
    const body0: Body = { pos: [...p0], vy: 0, grounded: false, ride: null };
    for (let i = 0; i < 60 && !body0.grounded; i++) stepBody(body0, [f], 0, 0, 1 / 60, false);
    expect(body0.grounded, 'the start stands on something').toBe(true);
    const seen = new Set<string>(), reached: V3[] = [], queue: V3[] = [body0.pos];
    const l: V3 = [0, 0, 0];
    const cell = (v: number) => Math.round(v + 1e-6);
    const key = (p: V3) => {
      toLocal(f, p, l);
      return `${cell(l[0] / STEP)},${cell(l[2] / STEP)},${cell(l[1] / 1.2)}`;
    };
    seen.add(key(body0.pos));
    const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
    const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([lx, lz]) => [lx * c + lz * s, -lx * s + lz * c]);
    const plot = w.build.plot;
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
        if (Math.abs(l[0]) > plot.x || l[2] > plot.z || l[2] < -(plot.north ?? plot.z)) continue;
        const k = key(body.pos);
        if (seen.has(k)) continue;
        seen.add(k);
        queue.push(body.pos);
      }
    }
    const out: V3 = [0, 0, 0];
    return reached.map((p) => [...toLocal(f, p, out)] as V3);
  }

  it('every place at the station and on the shore is reachable from Tsumugi-dōri, and the track is not', () => {
    for (const k of f.blockers) k.isOpen = () => false;
    // Tsumugi-dōri's north pavement west of the crossing (Aizomechō frame x −210, z −14): this frame is
    // turned from it, +x south and +z west.
    const kon = w.def.position, aiz = stationById('aizomecho').position;
    const start: V3 = [-14 + (aiz.y - kon.y), 0.6, 210 + (kon.x - aiz.x)];
    const pts = flood(start);
    expect(pts.length).toBeGreaterThan(1000);
    // (Everything: the shore, the station house, both platforms and the footbridge, from the street.)
    for (const z of f.zones) {
      const hit = pts.some((q) => q[0] >= z.min[0] && q[0] <= z.max[0] && q[1] >= z.min[1] - 0.1 && q[1] <= z.max[1] && q[2] >= z.min[2] && q[2] <= z.max[2]);
      expect(hit, `zone "${z.en}" unreachable`).toBe(true);
    }
    for (const k of w.build.keepOut) {
      const inside = pts.filter((q) => q[0] > k.min[0] && q[0] < k.max[0] && q[1] > k.min[1] && q[1] < k.max[1] && q[2] > k.min[2] && q[2] < k.max[2]);
      expect(inside.length, `the player can reach ${k.en}`).toBe(0);
    }
  }, 240000);
});
