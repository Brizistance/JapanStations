// Render-only fix for z-fighting: where two boxes of different materials share a face plane
// (a pillar flush with a wall, an inlay flush with a floor), the box with the smaller face is
// pushed out by a few millimetres so it always draws in front. Collision is untouched.

import type { BoxPart } from '../world/builder';

const SAME = 0.0011, MIN_SIDE = 0.02, MIN_AREA = 0.0004;

export function separateCoplanar(boxes: BoxPart[], eps = 0.006): BoxPart[] {
  // Layers of three or more (an inlay on a panel on a wall) need a pass per layer.
  let out = boxes.filter((b) => b.mat !== 'none');
  for (let pass = 0; pass < 6; pass++) {
    const r = onePass(out, eps);
    if (!r.moved) break;
    out = r.boxes;
  }
  return out;
}

function onePass(vis: BoxPart[], eps: number): { boxes: BoxPart[]; moved: number } {
  // push[i] = bitmask over the six faces (axis*2 + (max ? 1 : 0)).
  const push = new Uint8Array(vis.length);
  for (let a = 0; a < 3; a++) {
    const o1 = (a + 1) % 3, o2 = (a + 2) % 3;
    for (const hi of [false, true]) {
      const key = (b: BoxPart) => Math.round((hi ? b.max[a] : b.min[a]) / 0.002);
      const buckets = new Map<number, number[]>();
      vis.forEach((b, i) => {
        if (b.max[o1] - b.min[o1] < MIN_SIDE || b.max[o2] - b.min[o2] < MIN_SIDE) return;
        const k = key(b);
        const l = buckets.get(k);
        if (l) l.push(i);
        else buckets.set(k, [i]);
      });
      for (const [k, list] of buckets) {
        // Pairs inside this bucket and with the next one up (so nothing near a bucket edge is missed).
        const next = buckets.get(k + 1) ?? [];
        for (let p = 0; p < list.length; p++) {
          const A = vis[list[p]];
          const pa = hi ? A.max[a] : A.min[a];
          for (const q of [...list.slice(p + 1), ...next]) {
            const B = vis[q];
            if (A.mat === B.mat) continue;
            if (Math.abs(pa - (hi ? B.max[a] : B.min[a])) > SAME) continue;
            const w1 = Math.min(A.max[o1], B.max[o1]) - Math.max(A.min[o1], B.min[o1]);
            const w2 = Math.min(A.max[o2], B.max[o2]) - Math.max(A.min[o2], B.min[o2]);
            if (w1 < MIN_SIDE || w2 < MIN_SIDE || w1 * w2 < MIN_AREA) continue;
            const fa = (A.max[o1] - A.min[o1]) * (A.max[o2] - A.min[o2]);
            const fb = (B.max[o1] - B.min[o1]) * (B.max[o2] - B.min[o2]);
            const small = fa <= fb ? list[p] : q;
            push[small] |= 1 << (a * 2 + (hi ? 1 : 0));
          }
        }
      }
    }
  }
  let moved = 0;
  const boxes = vis.map((b, i) => {
    if (!push[i]) return b;
    moved++;
    const min = [...b.min] as BoxPart['min'], max = [...b.max] as BoxPart['max'];
    for (let a = 0; a < 3; a++) {
      if (push[i] & (1 << (a * 2))) min[a] -= eps;
      if (push[i] & (1 << (a * 2 + 1))) max[a] += eps;
    }
    return { ...b, min, max };
  });
  return { boxes, moved };
}
