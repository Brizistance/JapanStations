// Platform departure boards: a platform shared by two lines (Sumire trains at the Shiokaze
// platforms) must list both lines' trains, with times read from each line's timetable.

import { describe, expect, it } from 'vitest';
import { lineById, stationById } from '../data/network';
import { lineSim } from '../sim';
import { nextDepartures } from '../sim/timetable';
import { platformTrains } from './draw';

const S = lineById('S'), M = lineById('M');

describe('platform departure boards', () => {
  for (const id of ['daigaku-mae', 'hanamizuki']) {
    for (const dir of ['down', 'up'] as const) {
      it(`${id} (${dir}): Shiokaze platform lists Sumire trains too, in order, at their real times`, () => {
        const st = stationById(id);
        const mDeps = new Set(nextDepartures(lineSim('M').tt, M.stops.indexOf(id), dir, 36000, 20).map((d) => d.dep));
        const sDeps = new Set(nextDepartures(lineSim('S').tt, S.stops.indexOf(id), dir, 36000, 20).map((d) => d.dep));
        let sawM = 0;
        // Sample the board every 20 s for an hour.
        for (let t = 36000; t < 39600; t += 20) {
          const rows = platformTrains(S, st, dir, t, 2);
          expect(rows.length).toBe(2);
          expect(rows[0].arr).toBeLessThanOrEqual(rows[1].arr);
          for (const r of rows) {
            expect(r.boarding).toBe(true);
            expect(r.dep).toBeGreaterThanOrEqual(t);
            expect((r.line.id === 'M' ? mDeps : sDeps).has(r.dep)).toBe(true);
            if (r.line.id === 'M') sawM++;
          }
        }
        expect(sawM).toBeGreaterThan(0);
      });
    }
  }
  it('a station the Sumire Line passes without stopping lists no Sumire trains', () => {
    for (let t = 36000; t < 39600; t += 60) {
      for (const dir of ['down', 'up'] as const) {
        expect(platformTrains(S, stationById('tomyobori'), dir, t, 2).every((r) => r.line.id === 'S')).toBe(true);
      }
    }
  });
});
