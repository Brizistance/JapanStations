// 潮見大橋 (Shiomi Ōhashi), the bascule bridge joining Shiomi and Minato Center (shiomi-street.ts builds it in Shiomi's world;
// minatocenter-street.ts opens its edge to it): it opens and closes on its cycle, its lanes hand over at the seam both
// ways, and there is ground under foot all the way across.

import { describe, expect, it } from 'vitest';
import { stationWorld } from './index';
import { BASCULE_EVERY, BASCULE_LINE, basculeState, crossingState } from '../signs/departures';
import { SHIOMI_BRIDGE as B } from './shiomi-plan';

const sh = stationWorld('shiomi'), mc = stationWorld('minato-center');
/** A Shiomi frame point in Minato Center's frame (both square to the world). */
const toMc = (x: number, z: number): [number, number] => [x + sh.frame.x - mc.frame.x, z + sh.frame.z - mc.frame.z];
const toSh = (x: number, z: number): [number, number] => [x + mc.frame.x - sh.frame.x, z + mc.frame.z - sh.frame.z];

describe('潮見大橋', () => {
  it('opens once a cycle: barriers down before the leaves lift, up again only after they are down', () => {
    let opens = 0, was = false;
    for (let t = 0; t < 2 * BASCULE_EVERY; t += 0.5) {
      const s = basculeState(t), x = crossingState(BASCULE_LINE, B.key, t);
      expect(x.on).toBe(s.on);
      if (s.leaf > 0.01) expect(s.arm, `leaf up at ${t} with the barriers not down`).toBeGreaterThan(0.99);
      if (s.on && !was) opens++;
      was = s.on;
    }
    expect(opens).toBe(2);
  });

  it('hands its lanes over at the seam, both ways', () => {
    const across = (from: typeof sh, to: typeof mc, conv: (x: number, z: number) => [number, number]) => {
      const out = from.build.lanes.filter((l) => l.hand?.station === to.def.id);
      expect(out.length).toBeGreaterThan(0);
      for (const l of out) {
        const [hx, hz] = conv(l.hand!.at[0], l.hand!.at[2]);
        const dz = Math.sign(l.to[2] - l.from[2]);
        const onto = to.build.lanes.find((m) => m.fed === from.def.id && Math.abs(m.from[0] - hx) < 0.1 && Math.abs(m.to[0] - hx) < 0.1
          && Math.sign(m.to[2] - m.from[2]) === dz && Math.min(m.from[2], m.to[2]) <= hz && Math.max(m.from[2], m.to[2]) >= hz);
        expect(onto, `${from.def.id} lane at x ${l.from[0]} has no ${to.def.id} lane through ${hx.toFixed(1)}, ${hz.toFixed(1)}`).toBeTruthy();
      }
    };
    across(sh, mc, toMc);
    across(mc, sh, toSh);
  });

  it('has ground under foot from Shiomi across the seam into Minato Center', () => {
    const floorAt = (w: typeof sh, x: number, z: number) =>
      w.build.boxes.some((b) => b.solid !== false && x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2] && b.max[1] > -0.1 && b.max[1] < 0.3);
    for (const x of [B.c - B.half - 2, B.c, B.c + B.half + 2]) {
      for (let z = B.z0 + 0.7; z < B.z1; z += 2) expect(floorAt(sh, x, z), `no deck at ${x}, ${z}`).toBe(true);
      const [mx, mz] = toMc(x, B.z1 + 0.5);
      expect(floorAt(mc, mx, mz), `no ground in Minato Center at ${mx}, ${mz}`).toBe(true);
    }
  });
});
