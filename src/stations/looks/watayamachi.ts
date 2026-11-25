// Watayamachi (綿屋町): the basement arcade of the 1970 wholesale centre that stands over it
// (../wata-centre.ts). Small cream tile with a madder band, terrazzo, a low ceiling under unbroken
// strip lights, madder-tiled pillars, and glazed cases of cloth bolts along the walls inside the gates.

import type { ConcInfo, StationLook } from './types';

const MADDER = 'tile:#8c3b35', CREAM = '#f1ece0', DARK = 'flat:#2b2e33';
const BOLTS = ['#f1ece0', '#b7282e', '#27344f', '#d9b44a', '#6f8f6a', '#c97b5a', '#8aa0b8', '#e8cfd3', '#7a4a6a', '#2f6f73'];
const CASES: [string, string][] = [['綿布の見本', 'Cotton cloth samples'], ['晒と手拭', 'Bleached cotton and tenugui'], ['糸と釦', 'Thread and buttons'], ['服地の見本', 'Dress fabric samples']];

function cases(i: ConcInfo) {
  const { b, cf, cw } = i;
  let n = 0;
  for (let x = i.paid[0] + 2.5; x + 3.6 < i.paid[1] - 2; x += 4.4) {
    for (const s of [-1, 1] as const) {
      const za = s > 0 ? cw - 0.55 : -cw, zb = s > 0 ? cw : -cw + 0.55;
      if (!i.free(x, za, x + 3.6, zb, 0.25)) continue;
      i.claim(x - 0.2, za - 0.3, x + 3.8, zb + 0.3);
      const zf = s > 0 ? za : zb; // the glass, facing the hall
      b.box(DARK, x, cf, za, x + 3.6, cf + 0.55, zb);
      b.block(x, cf + 0.55, za, x + 3.6, cf + 2.3, zb);
      b.deco('paint:#f4f0e6', x, cf + 0.55, s > 0 ? zb - 0.03 : za, x + 3.6, cf + 2.2, s > 0 ? zb : za + 0.03);
      b.deco(DARK, x, cf + 2.2, za, x + 3.6, cf + 2.3, zb);
      b.deco('light', x + 0.1, cf + 2.17, za + 0.1, x + 3.5, cf + 2.2, zb - 0.1);
      for (const px of [x, x + 3.56]) b.deco(DARK, px, cf + 0.55, za, px + 0.04, cf + 2.2, zb);
      b.deco('glass', x + 0.04, cf + 0.55, zf - 0.01, x + 3.56, cf + 2.2, zf + 0.01);
      // Bolts standing on end, and a row lying on a shelf above.
      for (let k = 0, bx = x + 0.2; bx + 0.24 < x + 3.4; k++, bx += 0.3) {
        const h = 0.75 + i.rand() * 0.35;
        b.deco(`flat:${BOLTS[Math.floor(i.rand() * BOLTS.length)]}`, bx, cf + 0.55, za + 0.14, bx + 0.22, cf + 0.55 + h, zb - 0.14);
      }
      b.deco('wood:#6b4a30', x + 0.04, cf + 1.62, za + 0.08, x + 3.56, cf + 1.66, zb - 0.08);
      for (let bx = x + 0.2; bx + 0.7 < x + 3.4; bx += 0.82) b.deco(`flat:${BOLTS[Math.floor(i.rand() * BOLTS.length)]}`, bx, cf + 1.66, za + 0.12, bx + 0.7, cf + 1.84, zb - 0.12);
      const [ja, en] = CASES[n++ % CASES.length];
      b.sign({ k: 'label', text: ja, sub: en, fg: '#27344f', bg: CREAM }, x + 1.8, cf + 2.5, s * (cw - 0.02), [0, -s], 2.6, 0.34);
    }
  }
}

export const look: StationLook = {
  finishes: { wall: 'tile:#efe8d8', floor: 'floor:#cfc9bb', pillar: 'tile:#9c2a30', ceil: 'panel:#e9e4d6' },
  posters: false,
  skirting: false,
  lights(i) {
    // Unbroken strips the length of the hall, as a 1970 arcade has them.
    const y = i.cf + i.clear;
    for (const z of [-i.cw + 2.2, -1.2, 1.2, i.cw - 2.2]) {
      i.b.deco('paint:#e6e5e0', i.x0 + 1, y - 0.045, z - 0.14, i.x1 - 1, y, z + 0.14);
      i.b.deco('light', i.x0 + 1.05, y - 0.07, z - 0.09, i.x1 - 1.05, y - 0.045, z + 0.09);
    }
  },
  pillar(i, x, z, y0, y1) {
    const { b } = i;
    b.deco('tile:#9c2a30', x - 0.35, y0, z - 0.35, x + 0.35, y1, z + 0.35);
    b.deco(`paint:${CREAM}`, x - 0.36, y0 + 2.1, z - 0.36, x + 0.36, y0 + 2.27, z + 0.36);
    b.deco('flat:#4b4d50', x - 0.37, y0, z - 0.37, x + 0.37, y0 + 0.13, z + 0.37);
  },
  concourse(i) {
    const { b, cf, cw } = i;
    // The madder band along both long walls, with a dark skirting.
    for (const s of [-1, 1]) {
      const za = s > 0 ? cw - 0.012 : -cw, zb = s > 0 ? cw : -cw + 0.012;
      b.deco(MADDER, i.x0, cf + 0.13, za, i.x1, cf + 1.0, zb);
      b.deco('flat:#4b4d50', i.x0, cf, za - 0.004, i.x1, cf + 0.13, zb + 0.004);
    }
    cases(i);
  },
};
