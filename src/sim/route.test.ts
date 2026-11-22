import { describe, expect, it } from 'vitest';
import { ALL_STATIONS, LINES, linesAt } from '../data/network';
import { lineSim } from './index';
import { CHANGE_S, findRoute, type RideLeg } from './route';
import { nextDepartures } from './timetable';

const T = 10 * 3600;

describe('findRoute', () => {
  it('is empty from a station to itself', () => {
    const r = findRoute(LINES[0].stops[0], LINES[0].stops[0], T)!;
    expect(r.legs).toEqual([]);
    expect(r.arr).toBe(T);
  });

  it('reaches every station from every line end, on real departures in time order', () => {
    for (const line of LINES) {
      const from = line.stops[0];
      for (const s of ALL_STATIONS) {
        const r = findRoute(from, s.id, T);
        expect(r, `${from} -> ${s.id}`).not.toBeNull();
        let t = T;
        for (const leg of r!.legs) {
          expect(leg.dep).toBeGreaterThanOrEqual(t);
          expect(leg.arr).toBeGreaterThan(leg.dep);
          t = leg.arr;
          if (leg.kind !== 'ride') continue;
          // The departure is one the timetable really has.
          const sim = lineSim(leg.line.id);
          const tt = leg.service ? sim.services!.find((x) => x.type.id === leg.service!.id)!.tt : sim.tt;
          expect(nextDepartures(tt, leg.fromStop, leg.dir, leg.dep - 1, 1)[0].dep).toBeCloseTo(leg.dep, 6);
          expect(linesAt(leg.to).some((l) => l.id === leg.line.id)).toBe(true);
        }
        expect(r!.arr).toBe(t);
      }
    }
  });

  it('rides one train along a single line', () => {
    const y = LINES[0];
    const r = findRoute(y.stops[0], y.stops[y.stops.length - 1], T)!;
    expect(r.legs.length).toBe(1);
    expect((r.legs[0] as RideLeg).line.id).toBe(y.id);
  });

  it('allows time to change trains', () => {
    for (const s of ALL_STATIONS) {
      const r = findRoute(LINES[0].stops[0], s.id, T)!;
      for (let i = 1; i < r.legs.length; i++) {
        if (r.legs[i].kind === 'ride' && r.legs[i - 1].kind === 'ride') expect(r.legs[i].dep - r.legs[i - 1].arr).toBeGreaterThanOrEqual(CHANGE_S);
      }
    }
  });
});
