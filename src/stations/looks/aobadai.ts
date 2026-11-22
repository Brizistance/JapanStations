// Aobadai (Y10): the hillside garden suburb's ticket hall. The old sage tiles and the rolling-hills
// mural stay (specs.ts style); over them a cedar-slatted ceiling (entry-specs.ts) and, like the
// Hazuki arcade's gates up in the street, a sage gateway over the gate line with paper lanterns,
// and lanterns hung down the hall.

import type { StationLook } from './types';

const SAGE = 'paint:#4e7a5a', CREAM = 'flat:#f4f1e8', LANTERN = 'glow:#f4d6a0', CORD = 'flat:#2b2f34';

export const look: StationLook = {
  concourse(i) {
    const { b, cf, cw, clear, x0, x1 } = i;
    const top = cf + clear;
    // A lantern on a cord from the ceiling, its bottom at y.
    const lantern = (x: number, z: number, y: number) => {
      b.deco(CORD, x - 0.01, y + 0.5, z - 0.01, x + 0.01, top, z + 0.01);
      b.deco(LANTERN, x - 0.14, y + 0.06, z - 0.14, x + 0.14, y + 0.5, z + 0.14);
      b.deco(CORD, x - 0.12, y + 0.5, z - 0.12, x + 0.12, y + 0.53, z + 0.12);
    };
    for (const e of i.ends) {
      // The gateway: sage posts against both long walls, a beam across under the ceiling, a cream
      // band on it like the arcade gates' boards (the gate line's header sign hangs below it).
      for (const s of [-1, 1]) {
        b.deco(SAGE, e.g - 0.22, cf, s * cw - (s > 0 ? 0.36 : -0.02), e.g + 0.22, top, s * cw + (s > 0 ? -0.02 : 0.36));
        b.deco('flat:#9a948a', e.g - 0.3, cf, s * cw - (s > 0 ? 0.42 : -0.02), e.g + 0.3, cf + 0.35, s * cw + (s > 0 ? -0.02 : 0.42));
        b.block(e.g - 0.3, cf, s * cw - (s > 0 ? 0.42 : -0.02), e.g + 0.3, top, s * cw + (s > 0 ? -0.02 : 0.42));
      }
      b.deco(SAGE, e.g - 0.25, top - 0.32, -cw, e.g + 0.25, top, cw);
      b.deco(CREAM, e.g - 0.26, top - 0.26, -cw + 0.6, e.g + 0.26, top - 0.08, cw - 0.6);
      for (let z = -cw + 1.0; z <= cw - 1.0; z += 1.1) {
        if (Math.abs(z) < 3.2) continue; // clear of the header sign
        for (const s of [-1, 1]) lantern(e.g + s * 0.55, z, top - 1.0);
      }
    }
    // Lanterns down both sides of the hall, every 6 m, off the gate ends.
    for (let x = x0 + 3; x < x1 - 2; x += 6) {
      if (i.ends.some((e) => Math.abs(x - e.g) < 3)) continue;
      for (const s of [-1, 1]) {
        const z = s * (cw - 1.3);
        if (!i.free(x - 0.2, z - 0.2, x + 0.2, z + 0.2)) continue;
        lantern(x, z, top - 0.9);
      }
    }
  },
};
