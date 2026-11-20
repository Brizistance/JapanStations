// Toilets you can walk into, behind a concourse's −z wall (build.ts concourse()).
//
// One room 8.4 m wide and 5 m deep behind a 2.2 m doorway: an accessible cubicle faces the door
// and screens the view, men's to the left and women's to the right of it. Fittings are models
// (fittings.ts); stall doors stay shut. Built in a frame with the doorway's middle at x = 0 and
// the concourse wall's face at z = 0, the room towards −z.
import type { Builder } from '../world/builder';
import { fitting, type Era } from './fittings';

export const WC = { half: 4.2, depth: 5, door: 1.1, wall: 0.4, h: 2.5, lintel: 2.2 };

export function toilets(b: Builder, o: { cf: number; era: Era; wall: string }) {
  const { cf } = o, { half: X, depth: D, door, wall: T, h } = WC;
  const back = -T - D, top = cf + h;
  const tile = { old: 'tile:#d9e2dc', mid: 'tile:#e9e4d8', new: 'panel:#eceeef' }[o.era];
  const floor = { old: 'tile:#8fa39a', mid: 'tile:#b9b4a6', new: 'tile:#aeb6b8' }[o.era];
  b.box(floor, -X, cf - 0.3, back, X, cf, -T);
  b.box(floor, -door, cf - 0.3, -T, door, cf, 0);
  b.box(tile, -X - 0.2, cf, back - 0.2, X + 0.2, top, back);
  for (const s of [-1, 1]) b.box(tile, Math.min(s * X, s * (X + 0.2)), cf, back, Math.max(s * X, s * (X + 0.2)), top, -T);
  b.box('ceil', -X - 0.2, top, back - 0.2, X + 0.2, top + 0.2, -T);
  for (const s of [-1, 1]) {
    b.deco('paint:#e6e5e0', s * 2.75 - 0.6, top - 0.045, -3.4, s * 2.75 + 0.6, top, -3.0);
    b.deco('light', s * 2.75 - 0.55, top - 0.07, -3.35, s * 2.75 + 0.55, top - 0.045, -3.05);
  }
  b.deco('light', -0.6, top - 0.03, -1.3, 0.6, top, -1.0);
  // The accessible cubicle facing the doorway, and the partition behind it.
  const c0 = -T - 1.5, c1 = -T - 3.1;
  b.box(tile, -1.3, cf, c1, 1.3, top, c0);
  b.box(tile, -0.06, cf, back, 0.06, top, c1);
  b.deco('flat:#d9dcdf', -0.5, cf + 0.02, c0, 0.5, cf + 2.05, c0 + 0.02);
  b.deco('metal:#9da2a8', 0.34, cf + 0.85, c0 + 0.02, 0.38, cf + 1.25, c0 + 0.05);
  b.sign({ k: 'label', text: 'だれでもトイレ', sub: 'Accessible toilet', fg: '#fff', bg: '#2e7d32' }, 0, cf + 2.22, c0 + 0.012, [0, 1], 1.0, 0.24);
  b.sign({ k: 'label', text: '男', sub: 'Men', fg: '#fff', bg: '#1565c0' }, -0.95, cf + 1.6, c0 + 0.012, [0, 1], 0.42, 0.42);
  b.sign({ k: 'label', text: '女', sub: 'Women', fg: '#fff', bg: '#c2185b' }, 0.95, cf + 1.6, c0 + 0.012, [0, 1], 0.42, 0.42);
  const solid = (x0: number, z0: number, x1: number, z1: number, y: number) => b.block(Math.min(x0, x1), cf, Math.min(z0, z1), Math.max(x0, x1), cf + y, Math.max(z0, z1));
  for (const s of [-1, 1]) {
    // Stalls along the back wall (two for men, three for women), basins on the outer wall.
    const n = s < 0 ? 2 : 3;
    for (let k = 0; k < n; k++) fitting(b, 'wc_stall', s * (X - 0.475 - k * 0.95), cf, back + 0.7, [0, 1]);
    solid(s * X, back, s * (X - n * 0.95), back + 1.4, 2.0);
    fitting(b, 'wc_basin', s * (X - 0.25), cf, -T - 1.5, [-s, 0]);
    solid(s * X, -T - 0.4, s * (X - 0.5), -T - 2.6, 0.85);
  }
  for (const z of [back + 0.55, back + 1.3]) fitting(b, 'wc_urinal', -0.06 - 0.18, cf, z, [-1, 0]);
  solid(-0.06, back, -0.46, back + 1.7, 1.3);
  b.zone('passage', -X, cf - 0.2, back, X, cf + 2.4, -T, 'お手洗い', 'Toilets');
}
