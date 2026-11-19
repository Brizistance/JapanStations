// Exit data: every exit board must match the station that is really built. The numbers, the
// side of the road and the place each exit comes up are checked against the "Exit n" zones of
// the built station, and the landmarks against the street spec.

import { describe, expect, it } from 'vitest';
// The registry first: it pulls in the looks before any single station module (import order).
import { STATION_WORLDS } from './index';
import { SPECS } from './specs';
import { stationExits } from './exits';

const exitZones = (w: (typeof STATION_WORLDS)[number]) =>
  w.build.zones
    .map((z) => ({ z, m: /^Exit (\d+)$/.exec(z.en) }))
    .filter((q) => q.m)
    .map(({ z, m }) => ({ num: m![1], cx: (z.min[0] + z.max[0]) / 2, cz: (z.min[2] + z.max[2]) / 2 }))
    .sort((a, b) => Number(a.num) - Number(b.num));

describe('station exits', () => {
  for (const w of STATION_WORLDS) {
    const id = w.def.id, spec = SPECS[id], exits = stationExits(id);

    it(`${id}: exits match the built station`, () => {
      if (spec.kind === 'elevated') {
        expect(exits.length).toBeGreaterThan(0);
        for (const e of exits) expect(e.num).toBe('');
        return;
      }
      const zones = exitZones(w);
      expect(exits.map((e) => e.num)).toEqual(zones.map((z) => z.num));
      for (const e of exits) {
        const z = zones.find((q) => q.num === e.num)!;
        // Same side of the road, and the opening within the exit passage's extent along it.
        expect(e.side, `exit ${e.num} side`).toBe(Math.sign(z.cz));
        expect(Math.abs((e.rect[0] + e.rect[2]) / 2 - z.cx), `exit ${e.num} x`).toBeLessThan(3);
        expect(Math.abs((e.rect[1] + e.rect[3]) / 2 - z.cz), `exit ${e.num} z`).toBeLessThan(3);
      }
    });

    it(`${id}: every exit says what is near it, in both languages`, () => {
      for (const e of exits) {
        expect(e.near.length, `exit ${e.num}`).toBeGreaterThan(0);
        for (const n of e.near) {
          expect(n.ja.trim()).not.toBe('');
          expect(n.en.trim()).not.toBe('');
        }
      }
    });

    if (spec.kind === 'underground' || spec.kind === 'interchange' || spec.kind === 'atrium') {
      const s = spec.surface;
      const named = [s.parkName && (s.left === 'park' || s.right === 'park') ? s.parkName : null, s.arcadeAt !== undefined ? s.arcadeName : null, s.canalAt !== undefined ? s.canalName : null]
        .filter((n): n is { ja: string; en: string } => !!n);
      it(`${id}: named park, arcade and canal bridge appear on an exit board`, () => {
        for (const n of named) expect(exits.some((e) => e.near.some((q) => q.ja === n.ja && q.en === n.en)), n.en).toBe(true);
      });
      it(`${id}: an exit listed first for a park, the dome, the campus or the sea is on that side`, () => {
        const zones = exitZones(w);
        for (const e of exits) {
          const z = zones.find((q) => q.num === e.num)!;
          for (const [kind, side] of [[s.left, -1], [s.right, 1]] as const) {
            const first = e.near[0];
            const isIt = (kind === 'park' && first.ja === (s.parkName?.ja ?? '緑坂公園'))
              || (kind === 'dome' && first.ja === '川湊ドーム')
              || (kind === 'campus' && first.ja === '川湊大学')
              || (kind === 'sea' && /港|プロムナード/.test(first.ja));
            if (isIt) expect(Math.sign(z.cz), `exit ${e.num} (${first.en})`).toBe(side);
          }
          // An arcade is only ever on the −z side.
          if (s.arcadeName && e.near[0].ja === s.arcadeName.ja) expect(Math.sign(z.cz)).toBe(-1);
        }
      });
    }
  }
});
