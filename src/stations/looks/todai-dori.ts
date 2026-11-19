// Tōdai-dōri (灯台通), the lighthouse avenue on the southern heights: a mined cavern. Both tracks
// and the island lie in one great rock-cut vault, sprayed concrete on harbour-blue steel ribs,
// lit by a row of pendant lighthouse lenses along its crown. The concourse crosses the middle of
// the cavern as an enclosed bridge: from the platform you see its girder deck, its lit glazing
// and the station name on each end facing out over the tracks.
//
// The composer raises the open ceiling (spec `cavern`); this look draws the arch beneath it,
// dresses the bridge's two end faces (the kit's bulkheads) and hangs girders under its deck.

import type { CeilSeg } from '../kit';
import type { HallInfo } from '../themes/types';
import type { StationLook } from './types';

const ROCK = 'concrete';
const STEEL = 'flat:#3a4048';
const BRASS = 'metal:#b08a3a';
/** Where the arch springs from the side walls, above the platform. */
const SPRING = 4.6;
/** Strips across the arch (drawn faceted, like the kit's vaults). */
const STRIPS = 24;
/** Rib spacing along the cavern, and lens pendants every other rib. */
const RIB = 7.5;

function cavern(h: HallInfo, seg: CeilSeg) {
  const { b, pf, wallZ, style } = h;
  const crown = seg.y - pf, top = seg.y + 1.6 + 0.9;
  const w = (2 * wallZ) / STRIPS;
  const yAt = (z: number) => pf + SPRING + (crown - SPRING) * Math.sqrt(Math.max(0, 1 - (z / wallZ) ** 2));
  const ribs: number[] = [];
  for (let x = Math.ceil(seg.x0 / RIB) * RIB; x <= seg.x1 - 0.3; x += RIB) if (x - 0.3 >= seg.x0) ribs.push(x);

  for (let k = 0; k < STRIPS; k++) {
    const za = -wallZ + k * w, zb = za + w, y = yAt((za + zb) / 2);
    b.deco(ROCK, seg.x0, y, za, seg.x1, top, zb);
    for (const x of ribs) b.deco(`paint:${style.accent}`, x - 0.22, y - 0.28, za, x + 0.22, y, zb);
  }
  for (const s of [-1, 1]) {
    const zi = s * (wallZ - 0.02), ze = yAt(s * (wallZ - w / 2));
    for (const x of ribs) {
      // Each rib comes down the wall to a brass shoe just above the signs' band.
      b.deco(`paint:${style.accent}`, x - 0.22, pf + 3.0, Math.min(zi, s * (wallZ - 0.3)), x + 0.22, ze, Math.max(zi, s * (wallZ - 0.3)));
      b.deco(BRASS, x - 0.26, pf + 2.9, Math.min(zi, s * (wallZ - 0.34)), x + 0.26, pf + 3.0, Math.max(zi, s * (wallZ - 0.34)));
    }
    // Uplight trough along the springing, washing the arch.
    const zt = s * (wallZ - 0.35);
    b.deco(STEEL, seg.x0, pf + SPRING - 0.25, Math.min(zi, zt), seg.x1, pf + SPRING - 0.1, Math.max(zi, zt));
    b.deco('light', seg.x0, pf + SPRING - 0.1, Math.min(zi, zt) + 0.05, seg.x1, pf + SPRING - 0.08, Math.max(zi, zt) - 0.05);
  }
  // Lighthouse-lens pendants down the crown, between the ribs.
  for (let i = 0; i + 1 < ribs.length; i += 2) {
    const x = (ribs[i] + ribs[i + 1]) / 2, y = pf + 6.6, cy = yAt(0);
    b.mesh('metal:#2b2e33', 'cyl', x, (y + 0.8 + cy) / 2, 0, 0.06, cy - y - 0.8, 0.06);
    b.mesh(BRASS, 'cyl', x, y + 0.75, 0, 0.9, 0.12, 0.9);
    b.mesh('glass', 'cyl', x, y, 0, 1.25, 1.4, 1.25);
    b.mesh('light', 'cyl', x, y, 0, 0.55, 0.95, 0.55);
    b.mesh(BRASS, 'cyl', x, y - 0.75, 0, 0.9, 0.12, 0.9);
    for (const dy of [-0.35, 0, 0.35]) b.mesh('metal:#c9b27a', 'cyl', x, y + dy, 0, 1.3, 0.04, 1.3);
  }
}

/** One end of the concourse bridge, on the face at x = xf, facing `n` (±1) out over the cavern. */
function bridgeEnd(h: HallInfo, xf: number, n: 1 | -1, cw: number) {
  const { b, pf, wallZ, style, station, line } = h;
  const t = 0.06;
  const [xa, xb] = n < 0 ? [xf - t, xf] : [xf, xf + t];
  const [xa2, xb2] = n < 0 ? [xf - 2 * t, xf - t] : [xf + t, xf + 2 * t];
  // The rock face the bridge is set into, then the bridge itself.
  b.deco(ROCK, xa, pf + 4.1, -wallZ, xb, pf + 14.5, wallZ);
  b.deco(STEEL, xa2, pf + 4.1, -wallZ, xb2, pf + 4.95, wallZ);
  b.deco(`paint:${style.accent}`, xa2, pf + 4.83, -wallZ, xb2, pf + 4.95, wallZ);
  // Lit glazing: the concourse inside, behind mullions and a transom.
  b.deco('glow:#fff0cc', xa2, pf + 5.05, -cw, xb2, pf + 7.75, cw);
  for (let z = -cw; z <= cw + 1e-6; z += 1.5) b.deco(STEEL, xa2 - 0.02, pf + 5.05, z - 0.05, xb2 + 0.02, pf + 7.75, z + 0.05);
  b.deco(STEEL, xa2 - 0.02, pf + 6.15, -cw, xb2 + 0.02, pf + 6.23, cw);
  b.deco(STEEL, xa2, pf + 7.75, -cw - 0.3, xb2, pf + 8.4, cw + 0.3);
  b.deco(`paint:${line.color}`, xa2 - 0.01, pf + 8.2, -cw - 0.3, xb2 + 0.01, pf + 8.3, cw + 0.3);
  // The station name over the tracks, lit from below.
  b.sign({ k: 'name', station: station.id, line: line.id }, xf + n * 0.14, pf + 9.4, 0, [n, 0], 4.8, 1.6);
  b.deco('light', xf + n * 0.12, pf + 8.5, -2.2, xf + n * 0.3, pf + 8.55, 2.2);
}

function platform(h: HallInfo) {
  const { b, pf, wallZ } = h;
  const segs = h.o.ceil;
  for (const s of segs) if (s.emit && s.vault) cavern(h, s);
  // The bridge: the concourse span. The kit's bulkhead box at each end is 0.4 m thick.
  const deck = segs.find((s) => !s.emit);
  if (!deck) return;
  const cw = 8;
  if (segs.some((s) => s.emit && s.x1 <= deck.x0 + 1e-6)) bridgeEnd(h, deck.x0 - 0.4, -1, cw);
  if (segs.some((s) => s.emit && s.x0 >= deck.x1 - 1e-6)) bridgeEnd(h, deck.x1 + 0.4, 1, cw);
  // Girders under the deck, clear of the stairs rising through it.
  for (let x = deck.x0 + 1.5; x < deck.x1 - 1; x += 3) {
    if (h.blocked(x - 0.2, x + 0.2, 0.5)) continue;
    const y = h.ceilAt(x);
    b.deco(STEEL, x - 0.12, y - 0.42, -wallZ, x + 0.12, y, wallZ);
  }
}

export const look: StationLook = {
  finishes: { floor: 'floor:#cfd2d0' },
  platform,
};
