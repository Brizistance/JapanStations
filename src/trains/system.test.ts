import { describe, expect, it } from 'vitest';
import { trains, updateTrains } from './system';

describe('a line built in part (the AR Main Line)', () => {
  it('opens its doors only at the stations that have platforms', () => {
    const open = new Map<string, number>();
    // Half an hour of sim time, every 5 s: several Locals and Rapids call at every stop.
    for (let t = 10 * 3600; t < 10 * 3600 + 1800; t += 5) {
      updateTrains(t);
      for (const tr of trains) {
        const def = tr.sim.geom.def, p = tr.state.phase;
        if (!def.built) continue;
        const at = p.kind === 'dwell' ? def.stops[p.stop] : 'running';
        open.set(at, Math.max(open.get(at) ?? 0, tr.state.doorOpen));
      }
    }
    const built = trains.find((tr) => tr.sim.geom.def.built)!.sim.geom.def.built!.stations!;
    expect(built.length).toBeGreaterThan(0);
    for (const [at, v] of open) {
      if (built.includes(at)) expect(v, at).toBeGreaterThan(0.9);
      else expect(v, at).toBe(0);
    }
    for (const id of built) expect(open.has(id), id).toBe(true);
  });
});
