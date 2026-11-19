// Station look: Shiosai-kōen (A-02), the shallow park station by the sea. Side platforms, a
// small concourse over the west end only. A swell of pale slats under the concourse ceiling,
// and a wave line running the length of both platform walls.

import { defaultLook } from './default';
import type { StationLook } from './types';

const FOAM = 'panel:#eef6f4';

export const look: StationLook = {
  ...defaultLook,

  concourse(i) {
    defaultLook.concourse?.(i);
    // Slats across the hall, hung on a slow swell: lowest over the middle of each wave.
    const top = i.cf + i.clear;
    for (let x = i.x0 + 0.8; x < i.x1 - 0.6; x += 0.9) {
      const drop = 0.18 + 0.16 * (1 + Math.sin(x * 0.42));
      i.b.deco(FOAM, x - 0.05, top - drop - 0.06, -i.cw + 0.8, x + 0.05, top - drop, i.cw - 0.8);
      i.b.deco('metal:#c3c7cb', x - 0.01, top - drop, -0.02, x + 0.01, top, 0.02);
    }
  },

  platform(h) {
    // The wave line: a band of short teal segments rising and falling along each back wall,
    // under the name boards and posters.
    const teal = `paint:${h.style.accent}`;
    for (const s of [-1, 1] as const) {
      const z0 = Math.min(s * (h.wallZ - 0.02), s * (h.wallZ + 0.005)), z1 = Math.max(s * (h.wallZ - 0.02), s * (h.wallZ + 0.005));
      for (const [a, c] of h.wallRuns(s)) {
        for (let x = a + 0.25; x + 0.5 < c; x += 0.5) {
          const y = h.pf + 0.78 + 0.16 * Math.sin((x + (s > 0 ? 3 : 0)) * 0.55);
          h.b.deco(teal, x, y, z0, x + 0.5, y + 0.07, z1);
          h.b.deco(FOAM, x, y + 0.07, z0, x + 0.5, y + 0.1, z1);
        }
      }
    }
  },
};
