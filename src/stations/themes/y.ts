// Yanagisuji Line theme: the first subway (1933), pre-war civic pride. Cream arch ribs and
// riveted steel, painted H-columns, warm globe pendants, a tiled dado and a willow frieze.
// See Plans/features/line-themes/plan.md.

import type { CeilSeg } from '../kit';
import { hash, hexOf, shade, type HallInfo, type LineTheme } from './types';

const CREAM = 'paint:#ece3ca';
const RIDGE = 'flat:#d6ccb0';
const RIVET = 'paint:#d2c8ab';
const IRON = 'flat:#2a2b29';
const BRASS = 'metal:#8c7a52';
const GLOBE = 'glow:#ffe2b0';
const WOOD = 'wood:#8a5a34';

// Must match the kit's faceted vault (9 strips across the hall).
const N = 9;
const MID = (N - 1) / 2;
const vaultW = (h: HallInfo) => (2 * h.wallZ) / N;
const stripRise = (h: HallInfo, k: number) => {
  const zc = -h.wallZ + (k + 0.5) * vaultW(h);
  return 1.6 * Math.sqrt(Math.max(0, 1 - (zc / h.wallZ) ** 2));
};
const riseAt = (h: HallInfo, z: number) =>
  stripRise(h, Math.min(N - 1, Math.max(0, Math.floor((z + h.wallZ) / vaultW(h)))));

/** Stretches of [x0, x1] with no stair, lift or shaft overhead. */
function freeRuns(h: HallInfo, x0: number, x1: number): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let x = x0; x < x1 - 1e-6; x += 0.5) {
    const free = !h.blocked(x, Math.min(x + 0.5, x1), 0.3);
    if (free && start === null) start = x;
    if (!free && start !== null) {
      out.push([start, x]);
      start = null;
    }
  }
  if (start !== null) out.push([start, x1]);
  return out.filter(([a, c]) => c - a > 0.5);
}

/** Broad stepped arch ribs every 6 m, springing from wall pilasters, and a ridge line. */
function vaultRibs(h: HallInfo, seg: CeilSeg, y: number) {
  const { b, wallZ } = h;
  const w = vaultW(h), D = 0.2;
  for (let x = seg.x0 + 3; x < seg.x1 - 0.25; x += 6) {
    if (h.blocked(x - 0.3, x + 0.3)) continue;
    for (let k = 0; k < N; k++) {
      // Each step reaches down past its outer neighbour so the arch reads as one piece.
      const o = k === MID ? k : k < MID ? Math.max(0, k - 1) : Math.min(N - 1, k + 1);
      const z0 = -wallZ + k * w;
      b.deco(CREAM, x - 0.25, y + stripRise(h, o) - D, z0, x + 0.25, y + stripRise(h, k), z0 + w);
    }
    for (const s of [-1, 1]) {
      b.deco(CREAM, x - 0.25, y - 0.3, s * (wallZ + 0.005), x + 0.25, y + stripRise(h, 0) - D + 0.01, s * (wallZ - 0.08));
    }
  }
  const crown = y + stripRise(h, MID);
  for (const [a, c] of freeRuns(h, seg.x0, seg.x1)) b.deco(RIDGE, a, crown - 0.05, -0.1, c, crown, 0.1);
}

/** Riveted cross-beams on the pillar grid, with haunches at the walls, and girders over the pillar rows. */
function steelBeams(h: HallInfo, seg: CeilSeg, y: number) {
  const { b, wallZ } = h;
  for (let x = -54; x <= 54; x += 6) {
    if (x < seg.x0 + 0.25 || x > seg.x1 - 0.25 || h.blocked(x - 0.25, x + 0.25)) continue;
    b.deco(CREAM, x - 0.1, y - 0.34, -wallZ, x + 0.1, y, wallZ);
    b.deco(CREAM, x - 0.19, y - 0.38, -wallZ, x + 0.19, y - 0.34, wallZ);
    for (const s of [-1, 1]) {
      b.deco(CREAM, x - 0.1, y - 0.52, s * (wallZ + 0.005), x + 0.1, y - 0.37, s * (wallZ - 0.36));
      b.deco(CREAM, x - 0.1, y - 0.64, s * (wallZ + 0.005), x + 0.1, y - 0.51, s * (wallZ - 0.18));
    }
    // A row of rivet heads under the flange.
    for (let z = -wallZ + 0.9; z < wallZ - 0.5; z += 3.2) b.deco(RIVET, x - 0.03, y - 0.396, z - 0.03, x + 0.03, y - 0.379, z + 0.03);
  }
  const rows = h.island ? [-2.05, 2.05] : [0];
  for (const [a, c] of freeRuns(h, seg.x0, seg.x1)) {
    for (const z of rows) {
      b.deco(CREAM, a, y - 0.28, z - 0.08, c, y, z + 0.08);
      b.deco(CREAM, a, y - 0.31, z - 0.16, c, y - 0.28, z + 0.16);
    }
  }
}

/** Square riveted H-column: stepped base, flanges and web, rivet band, line band, stepped capital. */
function column(h: HallInfo, x: number, z: number, y0: number, y1: number) {
  const { b, pf } = h;
  const hex = hexOf(h.style.pillar);
  const paint = `paint:${hex}`, dark = `paint:${shade(hex, -0.3)}`;
  const F = 0.215, T = 0.045;
  const sq = (mat: string, r: number, ya: number, yb: number) => b.deco(mat, x - r, ya, z - r, x + r, yb, z + r);
  sq(dark, 0.3, y0, y0 + 0.1);
  sq(dark, 0.255, y0 + 0.1, y0 + 0.24);
  b.deco(paint, x - F, y0 + 0.24, z - F, x - F + T, y1 - 0.3, z + F);
  b.deco(paint, x + F - T, y0 + 0.24, z - F, x + F, y1 - 0.3, z + F);
  b.deco(paint, x - F + T, y0 + 0.24, z - 0.035, x + F - T, y1 - 0.3, z + 0.035);
  sq(dark, 0.225, pf + 0.96, pf + 1.04);
  sq(`paint:${h.line.color}`, 0.23, pf + 1.905, pf + 2.055);
  sq(dark, 0.225, y1 - 0.62, y1 - 0.54);
  sq(paint, 0.26, y1 - 0.3, y1 - 0.16);
  sq(dark, 0.31, y1 - 0.16, y1);
}

/** Warm globe on a dark rod with a brass cap; `top` is where the rod meets the ceiling. */
function pendant(h: HallInfo, x: number, z: number, gy: number, top: number) {
  const { b } = h;
  b.mesh(GLOBE, 'sphere', x, gy, z, 0.34, 0.34, 0.34);
  b.mesh(BRASS, 'cyl', x, gy + 0.19, z, 0.12, 0.06, 0.12);
  if (top > gy + 0.22) b.mesh(IRON, 'cyl', x, (gy + 0.22 + top) / 2, z, 0.025, top - gy - 0.2, 0.025);
}

export const theme: LineTheme = {
  opened: 1933,
  vault: true,
  pillarHalf: 0.21,

  ceiling(h, seg, y) {
    if (seg.vault) vaultRibs(h, seg, y);
    else steelBeams(h, seg, y);
  },

  lights(h, seg, y) {
    const len = seg.x1 - seg.x0;
    if (len < 1.5) return;
    const zs = h.island ? [-2.6, 2.6] : [-(h.pe + 2.2), h.pe + 2.2];
    const n = Math.max(1, Math.round(len / 4.5));
    for (let i = 0; i < n; i++) {
      const x = seg.x0 + ((i + 0.5) * len) / n;
      if (h.blocked(x - 0.3, x + 0.3)) continue;
      for (const z of zs) {
        // Under a vault the globe hangs at the spring line + 0.3; under a flat ceiling it stays
        // above the hanging signs (pf + 3.15).
        if (seg.vault) pendant(h, x, z, y + 0.3, y + riseAt(h, z) + 0.01);
        else pendant(h, x, z, Math.min(Math.max(h.pf + 3.33, y - 0.7), y - 0.25), y + 0.01);
      }
    }
  },

  pillar: column,
  trackColumn: (h, x, y0, y1) => column(h, x, 0, y0, y1),

  wallTrim(h, s) {
    const { b, pf, wallZ, H } = h;
    const wd = (mat: string, x0: number, y0: number, x1: number, y1: number, d: number) =>
      b.deco(mat, x0, y0, s * (wallZ + 0.005), x1, y1, s * (wallZ - d));
    const wall = hexOf(h.style.wall);
    const green = `paint:${h.line.color}`, pale = `paint:${shade(h.line.color, 0.35)}`;
    // Tiled dado with a projecting capping course (down to the track bed in island halls).
    for (const [a, c] of h.wallRuns(s)) {
      wd(`tile:${shade(wall, -0.3)}`, a, h.island ? pf - 0.2 : pf, c, pf + 0.94, 0.012);
      wd(`paint:${shade(wall, -0.45)}`, a, pf + 0.94, c, pf + 1.0, 0.045);
    }
    // Picture rail in line green with a thin accent line.
    wd(green, -H, pf + 2.58, H, pf + 2.8, 0.04);
    wd(`paint:${h.style.accent}`, -H, pf + 2.655, H, pf + 2.685, 0.05);
    // Willow frieze: strands of uneven length drooping from a slim upper rail, in groups every
    // 3 m, kept 1.5 m off the cross-beam grid so the haunches stay clear.
    for (const seg of h.o.ceil) {
      const u = seg.emit ? seg.y : seg.y - 0.05;
      const yR = Math.min(u - 0.3, pf + 3.6);
      const room = yR - 0.05 - (pf + 2.86);
      if (room < 0.2) continue;
      wd(green, seg.x0, yR - 0.05, seg.x1, yR, 0.05);
      for (let k = Math.ceil((seg.x0 + 0.6 + 55.5) / 3); -55.5 + 3 * k <= seg.x1 - 0.6; k++) {
        const gx = -55.5 + 3 * k;
        for (let j = -1; j <= 1; j++) {
          const i = k * 3 + j + 2;
          const xs = gx + j * 0.3 + (hash(i, s + 3) - 0.5) * 0.1;
          const len = Math.min(room, 0.28 + 0.5 * hash(i, s));
          wd(hash(i, s + 7) > 0.55 ? pale : green, xs - 0.022, yR - 0.05 - len, xs + 0.022, yR - 0.04, 0.02);
        }
      }
    }
  },

  bench(h, x, y, z, s) {
    const { b } = h;
    if (s === 0) {
      // Back to back: cast-iron ends, three seat slats and two back rails a side.
      for (const lx of [x - 0.8, x + 0.8]) {
        b.deco(IRON, lx - 0.025, y, z - 0.46, lx + 0.025, y + 0.05, z + 0.46);
        b.deco(IRON, lx - 0.025, y, z - 0.04, lx + 0.025, y + 0.86, z + 0.04);
        b.deco(IRON, lx - 0.025, y + 0.36, z - 0.47, lx + 0.025, y + 0.4, z + 0.47);
      }
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 3; i++) b.deco(WOOD, x - 0.88, y + 0.4, z + sd * (0.08 + i * 0.13), x + 0.88, y + 0.44, z + sd * (0.18 + i * 0.13));
        for (const yb of [0.52, 0.68]) b.deco(WOOD, x - 0.88, y + yb, z + sd * 0.04, x + 0.88, y + yb + 0.1, z + sd * 0.07);
      }
      return;
    }
    // Against side wall `s`: back towards the wall, seat facing the track.
    for (const lx of [x - 0.8, x + 0.8]) {
      b.deco(IRON, lx - 0.025, y, z - s * 0.26, lx + 0.025, y + 0.05, z + s * 0.25);
      b.deco(IRON, lx - 0.025, y, z + s * 0.2, lx + 0.025, y + 0.82, z + s * 0.25);
      b.deco(IRON, lx - 0.025, y + 0.36, z - s * 0.27, lx + 0.025, y + 0.4, z + s * 0.25);
    }
    for (let i = 0; i < 3; i++) b.deco(WOOD, x - 0.88, y + 0.4, z + s * (0.2 - i * 0.15), x + 0.88, y + 0.44, z + s * (0.08 - i * 0.15));
    for (const yb of [0.5, 0.66]) b.deco(WOOD, x - 0.88, y + yb, z + s * 0.17, x + 0.88, y + yb + 0.1, z + s * 0.2);
  },
};
