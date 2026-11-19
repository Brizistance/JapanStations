// Station look: Yamabukidai (A-09), the line's terminus when it opened. Side platforms under a
// long central concourse; the old terminal siding behind the +z platform, framed in kerria yellow,
// and a panel in the concourse remembering when the line ended here.

import { defaultLook } from './default';
import type { StationLook } from './types';

export const look: StationLook = {
  ...defaultLook,

  concourse(i) {
    defaultLook.concourse?.(i);
    // The heritage panel, midway along the paid area, on whichever long wall has room.
    const x = (i.paid[0] + i.paid[1]) / 2;
    for (const s of [1, -1] as const) {
      const z = s * i.cw;
      const r: [number, number, number, number] = [x - 1.8, s > 0 ? z - 0.4 : z, x + 1.8, s > 0 ? z : z + 0.4];
      if (!i.free(...r)) continue;
      i.claim(...r);
      const f = s * (i.cw - 0.03);
      i.b.deco(`paint:${i.style.accent}`, x - 1.7, i.cf + 0.75, Math.min(f, z), x + 1.7, i.cf + 2.45, Math.max(f, z));
      i.b.sign({ k: 'label', text: '開業時の終着駅', sub: 'Terminus of the Akanesuji Line when it opened', fg: '#3a2f00', bg: '#fff6d6' }, x, i.cf + 1.95, s * (i.cw - 0.05), [0, -s], 3.2, 0.7);
      i.b.sign({ k: 'poster', v: 3 }, x, i.cf + 1.15, s * (i.cw - 0.05), [0, -s], 1.2, 0.7);
      break;
    }
  },

  platform(h) {
    // Kerria-yellow frames round the openings onto the old siding.
    const y = `paint:${h.style.accent}`;
    const z0 = h.wallZ - 0.04, z1 = h.wallZ + 0.01;
    for (const g of h.o.gaps ?? []) {
      if (g.s !== 1) continue;
      h.b.deco(y, g.x0, h.pf + 2.42, z0, g.x1, h.pf + 2.5, z1);
      for (const x of [g.x0, g.x1 - 0.08]) h.b.deco(y, x, h.pf, z0, x + 0.08, h.pf + 2.5, z1);
    }
  },
};
