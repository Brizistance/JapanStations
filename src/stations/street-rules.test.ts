// Street rules (docs/station-playbook.md): every station rebuilt from a street table (street-plan.ts)
// is held to it. Each failure is a plain sentence saying what stands where it must not.

import { describe, expect, it } from 'vitest';
// The registry first: it pulls in the looks before any single station module (import order).
import { stationWorld } from './index';
import { STREET_PLANS, edgeProblems, plotRect, streetProblems, streetRects } from './street-plan';

describe('street rules', () => {
  for (const [id, plan] of Object.entries(STREET_PLANS)) {
    const w = stationWorld(id);

    it(`${id}: the table is the built plot`, () => {
      expect(w.build.plot).toEqual(plan.plot);
      const r = plotRect(plan.plot);
      for (const s of plan.streets) {
        // Every street crosses the plot, and no two parallel streets share ground.
        expect(s.axis === 'x' ? s.c > r[1] && s.c < r[3] : s.c > r[0] && s.c < r[2], `${s.en} lies outside the plot`).toBe(true);
        for (const t of plan.streets) {
          if (t === s || t.axis !== s.axis) continue;
          expect(Math.abs(t.c - s.c) >= t.half + t.pave + s.half + s.pave, `${s.en} and ${t.en} overlap`).toBe(true);
        }
        expect(streetRects(plan, s).road.length).toBeGreaterThan(0);
      }
    });

    it(`${id}: the street keeps to its plan (stage ${plan.stage})`, () => {
      expect(streetProblems(id, plan, w.build)).toEqual([]);
    });
  }

  it('streets meet across shared edges', () => {
    const ids = Object.keys(STREET_PLANS), out: string[] = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const [a, b] = [ids[i], ids[j]].map((id) => {
        const w = stationWorld(id);
        expect(Math.abs(Math.sin(w.frame.yaw)) < 1e-6 && Math.cos(w.frame.yaw) > 0, `${id}: only frames square to the world are handled`).toBe(true);
        return { id, at: [w.frame.x, w.frame.z] as [number, number], plan: STREET_PLANS[id] };
      });
      out.push(...edgeProblems(a, b));
    }
    expect(out).toEqual([]);
  });
});
