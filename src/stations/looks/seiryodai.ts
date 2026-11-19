// Station look: Seiryōdai (A-11), the upland estate by the institute of technology. A full-length
// concourse with two railed voids down onto the island: their edges lined in pale timber, a
// screen of pine-green fins hung over each, and a ring of light round them below.

import { SPECS } from '../specs';
import { defaultLook } from './default';
import type { StationLook } from './types';

const WOOD = 'wood:#c8a77c';
const voids = () => {
  const s = SPECS.seiryodai;
  return s.kind === 'underground' ? s.voids ?? [] : [];
};

export const look: StationLook = {
  ...defaultLook,

  concourse(i) {
    defaultLook.concourse?.(i);
    const top = i.cf + i.clear;
    for (const [x0, z0, x1, z1] of voids()) {
      // Timber lining the slab edge, seen from the platform.
      i.b.deco(WOOD, x0 - 0.02, i.cf - 0.8, z0 - 0.02, x1 + 0.02, i.cf, z0);
      i.b.deco(WOOD, x0 - 0.02, i.cf - 0.8, z1, x1 + 0.02, i.cf, z1 + 0.02);
      i.b.deco(WOOD, x0 - 0.02, i.cf - 0.8, z0, x0, i.cf, z1);
      i.b.deco(WOOD, x1, i.cf - 0.8, z0, x1 + 0.02, i.cf, z1);
      // Pine-green fins across the ceiling over the void.
      for (let x = x0; x <= x1 + 0.01; x += 0.5) {
        i.b.deco(`paint:${i.style.accent}`, x - 0.03, top - 0.55, z0 - 0.6, x + 0.03, top, z1 + 0.6);
      }
    }
  },

  platform(h) {
    // A light strip round each void's edge in the hung ceiling over the island.
    for (const [x0, z0, x1, z1] of voids()) {
      const y = h.ceilAt((x0 + x1) / 2) - 0.07;
      for (const z of [z0 - 0.12, z1]) h.b.deco('light', x0 - 0.12, y, z, x1 + 0.12, y + 0.02, z + 0.12);
      for (const x of [x0 - 0.12, x1]) h.b.deco('light', x, y, z0, x + 0.12, y + 0.02, z1);
    }
  },
};
