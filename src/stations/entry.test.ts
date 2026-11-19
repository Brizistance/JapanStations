import { describe, expect, it } from 'vitest';
import { STATIONS } from '../data/network';
import { ENTRY, type EntrySpec } from './entry-specs';

// CLAUDE.md rule 9: no two stations share an entrance, a stairwell or a ticket hall.
describe('entry areas', () => {
  const all = Object.entries(ENTRY);

  it('only names real stations', () => {
    const ids = new Set(STATIONS.map((s) => s.id));
    for (const [id] of all) expect(ids.has(id as never), id).toBe(true);
  });

  const unique = (what: string, key: (s: EntrySpec) => string) =>
    it(`no two stations share ${what}`, () => {
      const seen = new Map<string, string>();
      for (const [id, s] of all) {
        const k = key(s!);
        expect(seen.get(k), `${id} repeats ${seen.get(k)}'s ${what}`).toBeUndefined();
        seen.set(k, id);
      }
    });
  unique('a street entrance', (s) => `${s.street} ${s.frame}`);
  unique('a street-entrance colour pair', (s) => `${s.frame} ${s.trim}`);
  unique('a stairwell', (s) => `${s.well.clad} ${s.well.stripe}`);
  unique('a ticket hall', (s) => JSON.stringify([s.hall.wall, s.hall.floor, s.hall.pillar, s.hall.ceil]));
});
