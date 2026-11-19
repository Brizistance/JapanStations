import { describe, expect, it } from 'vitest';
import { SPECS } from './specs';

// CLAUDE.md rule 9: a station with its own exit plan must not share its whole plan (concourse,
// gates, platform stairs, exits, split, special composer) with any other station. Its look and
// surface do not count.
describe('station plans', () => {
  const plan = (s: (typeof SPECS)[keyof typeof SPECS]) => {
    const { style: _s, surface: _f, ...rest } = s as unknown as Record<string, unknown>;
    const sorted = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sorted(x)]))
        : v;
    return JSON.stringify(sorted(rest));
  };
  const all = Object.entries(SPECS);
  const done = all.filter(([, s]) => 'exits' in s && s.exits);

  it('has stations with their own plan', () => expect(done.length).toBeGreaterThanOrEqual(8));

  for (const [id, s] of done) {
    it(`${id} shares its plan with no other station`, () => {
      const twins = all.filter(([o, t]) => o !== id && plan(t) === plan(s)).map(([o]) => o);
      expect(twins).toEqual([]);
    });
  }
});
