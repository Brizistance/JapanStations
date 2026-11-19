// Station look: Tsukimizaka (A-08), deep under the moon-viewing slope. A tall vault over most of
// the island with the phases of the moon hung down its crown, and the concourse only at the
// uphill end, where pampas grass stands by the gates as at a moon-viewing.

import { defaultLook } from './default';
import type { StationLook } from './types';

const MOON = 'glow:#fff1c8';
const NIGHT = 'flat:#1c2236';

export const look: StationLook = {
  ...defaultLook,

  concourse(i) {
    defaultLook.concourse?.(i);
    // Susuki in low stone planters, wherever there is room inside the unpaid halls.
    for (const e of i.ends) {
      const n = e.hi ? 1 : -1;
      for (const z of [-i.cw + 4, i.cw - 4]) {
        const x = e.g + n * 7;
        if (!i.free(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 0.3)) continue;
        i.claim(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
        i.b.box('floor:#5b5f66', x - 0.6, i.cf, z - 0.6, x + 0.6, i.cf + 0.5, z + 0.6);
        for (let k = 0; k < 14; k++) {
          const a = k * 2.4, r = 0.1 + (k % 4) * 0.09;
          const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, hgt = 0.9 + (k % 5) * 0.12;
          i.b.deco('flat:#b8a77a', px - 0.012, i.cf + 0.5, pz - 0.012, px + 0.012, i.cf + 0.5 + hgt, pz + 0.012);
          i.b.deco('flat:#e8dcc0', px - 0.03, i.cf + 0.5 + hgt - 0.22, pz - 0.03, px + 0.03, i.cf + 0.5 + hgt, pz + 0.03);
        }
      }
    }
  },

  platform(h) {
    // Five moons along the vault, waxing towards the concourse: a lit disc, partly hidden by a
    // dark one just below it, on rods from the crown.
    const seg = h.o.ceil.find((s) => s.vault && s.emit);
    if (!seg) return;
    const crown = seg.y + 1.6, y = seg.y + 0.9, d = 2.8;
    const shades = [0.85, 0.5, 0.2, -0.45, null];
    const span = seg.x1 - seg.x0 - 16;
    shades.forEach((off, k) => {
      const x = seg.x0 + 8 + (span * k) / (shades.length - 1);
      h.b.mesh('metal:#b08d3c', 'cyl', x, y + 0.05, 0, d + 0.16, 0.05, d + 0.16);
      h.b.mesh(MOON, 'cyl', x, y, 0, d, 0.06, d);
      if (off !== null) h.b.mesh(NIGHT, 'cyl', x + off * d, y - 0.04, 0, d, 0.04, d);
      for (const dz of [-0.6, 0.6]) h.b.deco('metal:#8a8f94', x - 0.015, y + 0.08, dz - 0.015, x + 0.015, crown, dz + 0.015);
    });
  },
};
