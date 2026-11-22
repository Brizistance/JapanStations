// Station look: Kita-Ōdōri (北大通), the hub. The hub builds its own halls (hub.ts); this look only
// dresses the street entrances and their stairwells, so they match the grand avenue above them.
//
// Exits 1–8 on the avenue: a granite portal at the stair's mouth (piers, a lintel banded in gold
// with the station's name lit on it, globe lamps on the piers), a bronze-and-glass canopy down the
// stair on low granite walls with bronze rails. They stay under 3.7 m so the exits beneath the
// south deck fit. Exit 9, the Central entrance on the station plaza, is the grandest: a taller
// portal and a deep glass canopy reaching out over the plaza. The stairwells get a dark granite
// dado, bronze rails, and a low exit sign at the stair foot (the kit's sits up in the soffit).

import { exitDado, exitHandrails } from './parts';
import type { ExitInfo, StationLook } from './types';

const GRANITE = 'paint:#cfc6b4';
const GRANITE_DK = 'paint:#5a5650';
const GOLD = 'metal:#c9a227';
const BRONZE = 'metal:#7a5a32';
const GLOW = 'glow:#fff1d0';

function portal(e: ExitInfo, grand: boolean) {
  const { b, gy, run, ext } = e;
  const H = grand ? 4.4 : 3.4, xf = run + 0.35, zA = ext + 0.7, zB = ext + 4.5, zm = (zA + zB) / 2;
  // Granite piers with gold bands and globe lamps on them.
  for (const z of [zA, zB]) {
    b.box(GRANITE, xf - 0.38, gy, z - 0.38, xf + 0.38, gy + H, z + 0.38, true);
    b.deco(GRANITE_DK, xf - 0.42, gy, z - 0.42, xf + 0.42, gy + 0.45, z + 0.42);
    b.deco(GOLD, xf - 0.4, gy + H - 0.55, z - 0.4, xf + 0.4, gy + H - 0.47, z + 0.4);
    b.mesh(GOLD, 'cyl', xf, gy + H + 0.08, z, 0.3, 0.16, 0.3);
    b.mesh(GLOW, 'sphere', xf, gy + H + 0.38, z, 0.46, 0.46, 0.46);
  }
  // The lintel, its gold bands, the station's name on its street face.
  b.deco(GRANITE, xf - 0.4, gy + H - 0.8, zA - 0.4, xf + 0.4, gy + H, zB + 0.4);
  for (const y of [gy + H - 0.82, gy + H - 0.06]) b.deco(GOLD, xf - 0.42, y, zA - 0.42, xf + 0.42, y + 0.06, zB + 0.42);
  b.sign({ k: 'label', text: '地下鉄 北大通駅', sub: `Kita-Ōdōri Station — Exit ${e.num}`, fg: '#f3e3a0', bg: '#12382c' }, xf + 0.405, gy + H - 0.42, zm, [1, 0], 3.4, 0.56);
  // The dark board behind the kit's entrance sign.
  b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
}

/** Bronze-and-glass canopy down the stair on low granite walls; for the grand entrance, out over the plaza too. */
function canopy(e: ExitInfo, grand: boolean) {
  const { b, gy, run, ext } = e;
  const H = grand ? 4.1 : 3.15, x0 = -0.4, x1 = run + (grand ? 3.6 : 0.4), z0 = ext + 0.6, z1 = ext + 4.6;
  for (const [za, zb] of [[ext + 0.85, ext + 1.2], [ext + 4.0, ext + 4.35]]) {
    b.box(GRANITE, x0, gy, za, run, gy + 1.0, zb, true);
    b.deco(BRONZE, x0, gy + 1.0, za - 0.03, run, gy + 1.06, zb + 0.03);
  }
  const n = Math.max(2, Math.ceil((x1 - x0) / 3));
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    for (const z of [ext + 1.02, ext + 4.18]) b.deco(BRONZE, x - 0.05, gy + (x < run ? 1.06 : 0), z - 0.05, x + 0.05, gy + H, z + 0.05);
    b.deco(BRONZE, x - 0.04, gy + H - 0.08, z0, x + 0.04, gy + H + 0.02, z1);
  }
  b.deco('glass', x0, gy + H, z0, x1, gy + H + 0.03, z1);
  for (const z of [z0, z1]) b.deco(BRONZE, x0, gy + H - 0.12, Math.min(z, z + (z === z0 ? -0.05 : 0.05)), x1, gy + H + 0.06, Math.max(z, z + (z === z0 ? -0.05 : 0.05)));
  b.deco(GLOW, x0 + 0.3, gy + H - 0.14, (z0 + z1) / 2 - 0.08, x1 - 0.3, gy + H - 0.12, (z0 + z1) / 2 + 0.08);
  if (grand) {
    // Out over the plaza: bronze columns on granite bases where the canopy runs past the mouth.
    for (const z of [z0 + 0.2, z1 - 0.2]) {
      b.box(GRANITE_DK, x1 - 0.45, gy, z - 0.3, x1 + 0.15, gy + 0.5, z + 0.3, true);
      b.deco(BRONZE, x1 - 0.2, gy + 0.5, z - 0.08, x1 - 0.1, gy + H, z + 0.08);
    }
  }
}

export const look: StationLook = {
  canopy(e) {
    const grand = e.num === '9';
    canopy(e, grand);
    portal(e, grand);
  },

  exit(e) {
    exitDado(e, { mat: 'tile:#3a3d38', top: 1.2, cap: GOLD, steps: Math.max(4, Math.round(e.run / 2)) });
    exitHandrails(e);
    const { b, cf, ext } = e, L = ext + 4;
    b.deco(GOLD, -4, cf + 2.36, 0, -3.988, cf + 2.42, L);
    b.deco(GOLD, -4, cf + 2.36, L - 0.012, 0, cf + 2.42, L);
    // The kit's sign at the stair foot sits up in the soffit: one hung lower, under it.
    b.deco('flat:#26292b', -0.42, cf + 2.62, ext + 2.0, -0.4, cf + 2.75, ext + 2.02);
    b.deco('flat:#26292b', -0.42, cf + 2.62, ext + 3.2, -0.4, cf + 2.75, ext + 3.22);
    b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num: e.num, arrow: 'up' }, -0.45, cf + 2.4, ext + 2.6, [-1, 0], 2.3, 0.42);
    b.mesh(GLOW, 'sphere', -2, cf + 2.45, ext + 2, 0.36, 0.3, 0.36);
  },
};
