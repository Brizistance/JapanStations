import { describe, expect, it } from 'vitest';
import { STATIONS, lineById } from '../data/network';
import { allClips, announcement, dirVoice } from './phrases';
import { edge, speakerRows } from './platform';

describe('platform announcement triggers', () => {
  it('fires once per status change, never on first sight', () => {
    expect(edge(undefined, 'approach')).toBeNull();
    expect(edge('wait', 'wait')).toBeNull();
    expect(edge('wait', 'approach')).toBe('approach');
    expect(edge('closing', 'approach')).toBe('approach');
    expect(edge('approach', 'boarding')).toBe('arrive');
    expect(edge('boarding', 'closing')).toBeNull(); // timed by the departure melody instead
    expect(edge('approach', 'terminating')).toBe('terminating');
    expect(edge('closing', 'wait')).toBeNull();
  });
});

describe('platform phrases', () => {
  it('inbound is female, outbound male, safety always male', () => {
    const y = lineById('Y');
    expect(dirVoice(y, 'up')).toBe('F');
    expect(dirVoice(y, 'down')).toBe('M');
    const st = STATIONS.find((s) => y.stops.includes(s.id) && s.id !== y.stops[0] && s.id !== y.stops.at(-1))!;
    const [jp, , safety] = announcement('approach', st, y, 'up', 2);
    expect(jp.voice).toBe('F');
    expect(safety.voice).toBe('M');
  });

  it('every clip key is unique to its voice and text', () => {
    const clips = allClips();
    expect(new Set(clips.map((c) => c.key)).size).toBe(new Set(clips.map((c) => c.voice + c.text)).size);
  });
});

describe('PA speaker rows', () => {
  it('puts down speakers on the low side and up on the high side, along the long axis', () => {
    const r = speakerRows([-60, 0, -5], [60, 3.5, 5]);
    expect(r.down.length).toBeGreaterThanOrEqual(3);
    expect(r.down.every((p) => p[2] < 0 && Math.abs(p[0]) < 60)).toBe(true);
    expect(r.up.every((p) => p[2] > 0)).toBe(true);
    const turned = speakerRows([-5, 0, -60], [5, 3.5, 60]);
    expect(turned.up.every((p) => p[0] > 0)).toBe(true);
  });
});
