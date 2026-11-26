import { describe, expect, it } from 'vitest';
import type { BoxPart } from '../world/builder';
import { separateCoplanar } from './zfight';

// The pass before the sweep (2026-11-26): every pair in a plane's bucket and the next, compared directly.
const SAME = 0.0011, MIN_SIDE = 0.02, MIN_AREA = 0.0004;
function reference(boxes: BoxPart[], eps = 0.006): BoxPart[] {
  let out = boxes.filter((b) => b.mat !== 'none');
  for (let pass = 0; pass < 6; pass++) {
    const push = new Uint8Array(out.length);
    const vis = out;
    for (let a = 0; a < 3; a++) {
      const o1 = (a + 1) % 3, o2 = (a + 2) % 3;
      for (const hi of [false, true]) {
        const buckets = new Map<number, number[]>();
        vis.forEach((b, i) => {
          if (b.max[o1] - b.min[o1] < MIN_SIDE || b.max[o2] - b.min[o2] < MIN_SIDE) return;
          const k = Math.round((hi ? b.max[a] : b.min[a]) / 0.002);
          (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(i);
        });
        for (const [k, list] of buckets) {
          const next = buckets.get(k + 1) ?? [];
          for (let p = 0; p < list.length; p++) {
            const A = vis[list[p]];
            for (const q of [...list.slice(p + 1), ...next]) {
              const B = vis[q];
              if (A.mat === B.mat) continue;
              if (Math.abs((hi ? A.max[a] : A.min[a]) - (hi ? B.max[a] : B.min[a])) > SAME) continue;
              const w1 = Math.min(A.max[o1], B.max[o1]) - Math.max(A.min[o1], B.min[o1]);
              const w2 = Math.min(A.max[o2], B.max[o2]) - Math.max(A.min[o2], B.min[o2]);
              if (w1 < MIN_SIDE || w2 < MIN_SIDE || w1 * w2 < MIN_AREA) continue;
              const fa = (A.max[o1] - A.min[o1]) * (A.max[o2] - A.min[o2]);
              const fb = (B.max[o1] - B.min[o1]) * (B.max[o2] - B.min[o2]);
              push[fa <= fb ? list[p] : q] |= 1 << (a * 2 + (hi ? 1 : 0));
            }
          }
        }
      }
    }
    let moved = 0;
    out = vis.map((b, i) => {
      if (!push[i]) return b;
      moved++;
      const min = [...b.min] as BoxPart['min'], max = [...b.max] as BoxPart['max'];
      for (let a = 0; a < 3; a++) {
        if (push[i] & (1 << (a * 2))) min[a] -= eps;
        if (push[i] & (1 << (a * 2 + 1))) max[a] += eps;
      }
      return { ...b, min, max };
    });
    if (!moved) break;
  }
  return out;
}

describe('separateCoplanar', () => {
  it('pushes the same boxes as the pairwise pass', () => {
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const snap = (v: number) => Math.round(v * 4) / 4; // shared planes, as on a real plot
    const boxes: BoxPart[] = [];
    for (let i = 0; i < 600; i++) {
      const x = snap(r() * 40), y = r() < 0.6 ? 0 : snap(r() * 6), z = snap(r() * 40);
      boxes.push({ mat: ['a', 'b', 'c'][Math.floor(r() * 3)], min: [x, y, z], max: [x + snap(0.25 + r() * 6), y + snap(0.25 + r() * 3), z + snap(0.25 + r() * 6)], solid: false } as BoxPart);
    }
    expect(separateCoplanar(boxes)).toEqual(reference(boxes));
  });
});
