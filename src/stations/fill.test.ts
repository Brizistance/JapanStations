import { describe, expect, it } from 'vitest';
// The registry first: it builds every station (and pulls in the looks in the right order).
import { STATION_WORLDS } from './index';
import { ENTRY } from './entry-specs';
import { FILL_PLACED } from './fill';

describe('ticket hall fill', () => {
  const filled = Object.entries(ENTRY).filter(([, s]) => s?.fill?.length);

  it('builds the stations', () => expect(STATION_WORLDS.length).toBeGreaterThan(0));

  for (const [id, s] of filled) {
    it(`${id}: every item found room`, () => {
      const placed = FILL_PLACED.get(id) ?? new Set<number>();
      const missed = s!.fill!.filter((_, k) => !placed.has(k)).map((f) => f.k + ('brand' in f ? ` ${f.brand}` : '') + ('theme' in f ? ` ${f.theme}` : ''));
      expect(missed).toEqual([]);
    });
  }

  it('no two stations share a local feature', () => {
    const themes = filled.flatMap(([, s]) => s!.fill!.filter((f) => f.k === 'display' || f.k === 'gallery').map((f) => ('theme' in f ? f.theme : '')));
    expect(new Set(themes).size).toBe(themes.length);
  });

  it('no two stations share a whole fill', () => {
    const keys = filled.map(([, s]) => JSON.stringify(s!.fill!.map((f) => ({ ...f, ja: undefined, en: undefined }))));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
