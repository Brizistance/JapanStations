// Render-only fix for z-fighting: where two boxes of different materials share a face plane
// (a pillar flush with a wall, an inlay flush with a floor), the box with the smaller face is
// pushed out by a few millimetres so it always draws in front. Collision is untouched.

import type { BoxPart } from '../world/builder';

const SAME = 0.0011, MIN_SIDE = 0.02, MIN_AREA = 0.0004;

export function separateCoplanar(boxes: BoxPart[], eps = 0.006): BoxPart[] {
  const steps = separateCoplanarSteps(boxes, eps);
  for (let s = steps.next(); ; s = steps.next()) if (s.done) return s.value;
}

/** `separateCoplanar` a face direction per step (a plot's 15 000 boxes take ~0.1 s: a station mount spreads it). */
export function* separateCoplanarSteps(boxes: BoxPart[], eps = 0.006): Generator<string, BoxPart[]> {
  // Layers of three or more (an inlay on a panel on a wall) need a pass per layer.
  let out = boxes.filter((b) => b.mat !== 'none');
  for (let pass = 0; pass < 6; pass++) {
    const r = yield* onePass(out, eps);
    if (!r.moved) break;
    out = r.boxes;
  }
  return out;
}

function* onePass(vis: BoxPart[], eps: number): Generator<string, { boxes: BoxPart[]; moved: number }> {
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
        // Pairs inside this bucket and with the next one up (so nothing near a bucket edge is missed): every pair with
        // at least one box in this bucket. Swept along o1 so only boxes that overlap there are compared (a plot's
        // ground plane holds thousands of boxes: comparing them all took ~0.2 s a mount, 2026-11-26).
        const next = buckets.get(k + 1) ?? [];
        // rank: the order the pair loop used to take them in (this bucket in order, then the next), so that of two
        // equal faces the same box as before is pushed.
        const items = [...list.map((i, r) => ({ i, r, own: true })), ...next.map((i, r) => ({ i, r: list.length + r, own: false }))];
        items.sort((x, y) => vis[x.i].min[o1] - vis[y.i].min[o1]);
        const active: typeof items = [];
        for (const it of items) {
          const C = vis[it.i];
          let n = 0;
          for (const o of active) if (vis[o.i].max[o1] >= C.min[o1] + MIN_SIDE) active[n++] = o;
          active.length = n;
          for (const o of active) {
            if (!it.own && !o.own) continue;
            const [pA, pB] = o.r < it.r ? [o, it] : [it, o];
            const A = vis[pA.i], B = vis[pB.i];
            if (A.mat === B.mat) continue;
            if (Math.abs((hi ? A.max[a] : A.min[a]) - (hi ? B.max[a] : B.min[a])) > SAME) continue;
            const w1 = Math.min(A.max[o1], B.max[o1]) - Math.max(A.min[o1], B.min[o1]);
            const w2 = Math.min(A.max[o2], B.max[o2]) - Math.max(A.min[o2], B.min[o2]);
            if (w1 < MIN_SIDE || w2 < MIN_SIDE || w1 * w2 < MIN_AREA) continue;
            const fa = (A.max[o1] - A.min[o1]) * (A.max[o2] - A.min[o2]);
            const fb = (B.max[o1] - B.min[o1]) * (B.max[o2] - B.min[o2]);
            const small = fa <= fb ? pA.i : pB.i;
            push[small] |= 1 << (a * 2 + (hi ? 1 : 0));
          }
          active.push(it);
        }
      }
      yield 'coplanar faces';
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
