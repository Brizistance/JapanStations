// Yanagisuji Line theme: the first subway (1933), pre-war civic pride. Cream arch ribs and
// riveted steel, painted H-columns, warm globe pendants, a tiled dado and a willow frieze.
// Under the concourse the platform is low and busy: a hung ceiling at 3.4 m, shallow beams,
// ceiling-mounted globes and exposed pipes, cable trays and ducts. The vaults stay grand.
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
// Services under the low ceiling.
const PIPE = 'paint:#6f726b';
const GALV = 'metal:#8e9294';
const DUCT = 'flat:#37393a';

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

/** A flat ceiling this far above the platform or less is the low, busy kind. */
const LOW = 3.8;
const isLow = (h: HallInfo, seg: CeilSeg, y: number) => !seg.vault && y < h.pf + LOW;

// Where the kit hangs the direction and departure signs (pf + 2.4 … 3.1, across the platform).
const SIGN_XS = [-49, -38, -27, 0, 27, 38, 49];
const nearSign = (x: number, m: number) => SIGN_XS.some((sx) => Math.abs(x - sx) < m);

/** Stretches of [x0, x1] with no stair, lift or shaft overhead. */
function freeRuns(h: HallInfo, x0: number, x1: number, margin = 0.3): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let x = x0; x < x1 - 1e-6; x += 0.5) {
    const free = !h.blocked(x, Math.min(x + 0.5, x1), margin);
    if (free && start === null) start = x;
    if (!free && start !== null) {
      out.push([start, x]);
      start = null;
    }
  }
  if (start !== null) out.push([start, x1]);
  return out.filter(([a, c]) => c - a > 0.5);
}

/** Broad stepped arch ribs every 6 m, springing from wall pilasters, a cornice and a ridge line. */
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
  // Moulded cornice along the spring line, tying the pilasters together.
  for (const s of [-1, 1]) b.deco(CREAM, seg.x0, y - 0.12, s * (wallZ + 0.005), seg.x1, y, s * (wallZ - 0.08));
  const crown = y + stripRise(h, MID);
  for (const [a, c] of freeRuns(h, seg.x0, seg.x1)) b.deco(RIDGE, a, crown - 0.05, -0.1, c, crown, 0.1);
}

/**
 * Riveted cross-beams on the pillar grid, with haunches at the walls, and girders over the
 * pillar rows. Under a low ceiling they are shallow (0.22 m) and skip the hanging signs.
 */
function steelBeams(h: HallInfo, seg: CeilSeg, y: number) {
  const { b, wallZ } = h;
  const low = isLow(h, seg, y);
  const D = low ? 0.2 : 0.34;
  for (let x = -54; x <= 54; x += 6) {
    if (x < seg.x0 + 0.25 || x > seg.x1 - 0.25 || h.blocked(x - 0.25, x + 0.25)) continue;
    if (low && nearSign(x, 1)) continue;
    b.deco(CREAM, x - 0.1, y - D, -wallZ, x + 0.1, y, wallZ);
    b.deco(CREAM, x - (low ? 0.17 : 0.19), y - D - (low ? 0.02 : 0.04), -wallZ, x + (low ? 0.17 : 0.19), y - D, wallZ);
    for (const s of [-1, 1]) {
      if (low) {
        // A short knee bracket: bottom at y − 0.34.
        b.deco(CREAM, x - 0.1, y - D - 0.14, s * (wallZ + 0.005), x + 0.1, y - D + 0.01, s * (wallZ - 0.2));
        continue;
      }
      b.deco(CREAM, x - 0.1, y - 0.52, s * (wallZ + 0.005), x + 0.1, y - 0.37, s * (wallZ - 0.36));
      b.deco(CREAM, x - 0.1, y - 0.64, s * (wallZ + 0.005), x + 0.1, y - 0.51, s * (wallZ - 0.18));
    }
    // A row of rivet heads under the flange (only where there is room to see them).
    if (!low) for (let z = -wallZ + 0.9; z < wallZ - 0.5; z += 3.2) b.deco(RIVET, x - 0.03, y - 0.396, z - 0.03, x + 0.03, y - 0.379, z + 0.03);
  }
  const rows = h.island ? [-2.05, 2.05] : [0];
  const [gw, gf] = low ? [0.2, 0.23] : [0.28, 0.31];
  for (const [a, c] of freeRuns(h, seg.x0, seg.x1)) {
    for (const z of rows) {
      b.deco(CREAM, a, y - gw, z - 0.08, c, y, z + 0.08);
      b.deco(CREAM, a, y - gf, z - 0.16, c, y - gw, z + 0.16);
    }
  }
}

/**
 * Exposed services under a low ceiling, hung just below the beam flanges (y − 0.23) and kept
 * out of the hanging signs' band: pipes on a trapeze and a cable tray over the platform (on the
 * centreline and the edges of an island, by the wall and the edge of a side platform), and over
 * the tracks a dark ventilation duct and a cable. Hangers every 6 m, midway between beams.
 */
function services(h: HallInfo, seg: CeilSeg, y: number) {
  const { b, pe, wallZ, island } = h;
  const runs = freeRuns(h, seg.x0, seg.x1, 0.45);
  if (!runs.length) return;
  const top = y - 0.23;
  const run = (mat: string, z0: number, z1: number, y0: number, y1: number) => {
    for (const [a, c] of runs) b.deco(mat, a, y0, Math.min(z0, z1), c, y1, Math.max(z0, z1));
  };
  const hangers: ((x: number) => void)[] = [];
  const rod = (x: number, z: number, y0: number) => b.deco(GALV, x - 0.015, y0, z - 0.015, x + 0.015, y, z + 0.015);

  // Two pipes (0.08 and 0.1) side by side on a trapeze spanning z0 → z0 + 0.3·dir.
  const pipes = (z0: number, dir: number) => {
    run(PIPE, z0 + dir * 0.04, z0 + dir * 0.12, top - 0.1, top - 0.02);
    run(IRON, z0 + dir * 0.17, z0 + dir * 0.27, top - 0.1, top);
    hangers.push((x) => {
      b.deco(GALV, x - 0.03, top - 0.13, Math.min(z0, z0 + dir * 0.3), x + 0.03, top - 0.1, Math.max(z0, z0 + dir * 0.3));
      rod(x, z0 + dir * 0.145, top - 0.1);
    });
  };
  // A 0.25 m cable tray from z0 towards z0 + 0.25·dir, with cables in it.
  const tray = (z0: number, dir: number) => {
    const z1 = z0 + dir * 0.25;
    run(GALV, z0, z1, top - 0.1, top - 0.085);
    for (const e of [z0, z1 - dir * 0.015]) run(GALV, e, e + dir * 0.015, top - 0.1, top - 0.03);
    run(IRON, z0 + dir * 0.03, z1 - dir * 0.03, top - 0.085, top - 0.05);
    hangers.push((x) => rod(x, z0 + dir * 0.125, top - 0.05));
  };
  // A single 0.1 m pipe.
  const pipe = (z0: number, dir: number) => {
    run(IRON, z0, z0 + dir * 0.1, top - 0.1, top);
    hangers.push((x) => rod(x, z0 + dir * 0.05, top));
  };
  // Ventilation duct over a track, with a strap at each hanger.
  const duct = (z0: number, z1: number) => {
    run(DUCT, z0, z1, top - 0.24, top);
    hangers.push((x) => b.deco(GALV, x - 0.03, top - 0.255, Math.min(z0, z1) - 0.015, x + 0.03, y, Math.max(z0, z1) + 0.015));
  };
  const cable = (z0: number, dir: number) => run(IRON, z0, z0 + dir * 0.06, top - 0.06, top);

  if (island) {
    // Platform: pipes on the centreline (|z| < 0.3), a tray and a pipe over the edges.
    pipes(-0.15, 1);
    tray(pe - 0.02, -1);
    pipe(-(pe - 0.04), 1);
    // Tracks: a duct by each wall (bottom y − 0.47, well above the car roofs at pf + 2.45).
    for (const s of [-1, 1]) {
      duct(s * (wallZ - 0.8), s * (wallZ - 0.25));
      cable(s * (pe + 0.4), s);
    }
  } else {
    for (const s of [-1, 1]) {
      // Platform: pipes by the wall (inside the knee brackets), a tray or pipe over the edge.
      pipes(s * (wallZ - 0.2), -s);
      if (s > 0) tray(pe + 0.05, 1);
      else pipe(-(pe + 0.1), -1);
      // Tracks: ducts beside the centre columns, a cable near each platform edge.
      duct(s * 0.35, s * 0.9);
      cable(s * (pe - 0.5), s);
    }
  }

  for (let x = -51; x <= 51; x += 6) {
    if (nearSign(x, 0.5) || !runs.some(([a, c]) => x > a + 0.2 && x < c - 0.2)) continue;
    for (const f of hangers) f(x);
  }
}

/** Square riveted H-column: stepped base, flanges and web, line band, stepped capital. */
function column(h: HallInfo, x: number, z: number, y0: number, y1: number) {
  const { b, pf } = h;
  const hex = hexOf(h.style.pillar);
  const paint = `paint:${hex}`, dark = `paint:${shade(hex, -0.3)}`;
  const F = 0.215, T = 0.045;
  // A low hung ceiling gets a shallower capital that meets the girders (y1 − 0.28).
  const cap = y1 < pf + LOW + 0.1 ? 0.26 : 0.3;
  const sq = (mat: string, r: number, ya: number, yb: number) => b.deco(mat, x - r, ya, z - r, x + r, yb, z + r);
  sq(dark, 0.28, y0, y0 + 0.22);
  b.deco(paint, x - F, y0 + 0.22, z - F, x - F + T, y1 - cap, z + F);
  b.deco(paint, x + F - T, y0 + 0.22, z - F, x + F, y1 - cap, z + F);
  b.deco(paint, x - F + T, y0 + 0.22, z - 0.035, x + F - T, y1 - cap, z + 0.035);
  sq(`paint:${h.line.color}`, 0.23, pf + 1.905, pf + 2.055);
  sq(dark, 0.225, y1 - cap - 0.32, y1 - cap - 0.24);
  sq(paint, 0.25, y1 - cap, y1 - 0.14);
  sq(dark, 0.31, y1 - 0.14, y1);
}

/** Warm globe on a dark rod with a brass cap; `top` is where the rod meets the ceiling. */
function pendant(h: HallInfo, x: number, z: number, gy: number, top: number) {
  const { b } = h;
  b.mesh(GLOBE, 'sphere', x, gy, z, 0.34, 0.34, 0.34);
  b.mesh(BRASS, 'cyl', x, gy + 0.19, z, 0.12, 0.06, 0.12);
  if (top > gy + 0.22) b.mesh(IRON, 'cyl', x, (gy + 0.22 + top) / 2, z, 0.025, top - gy - 0.2, 0.025);
}

/** Schoolhouse globe on a brass ceiling plate, for a low ceiling: bottom at pf + 3.05 or above. */
function ceilingGlobe(h: HallInfo, x: number, z: number, y: number) {
  const { b, pf } = h;
  const d = Math.min(0.26, y - 0.06 - (pf + 3.05));
  b.mesh(BRASS, 'cyl', x, y - 0.03, z, 0.16, 0.06, 0.16);
  if (d >= 0.12) b.mesh(GLOBE, 'sphere', x, y - 0.06 - d / 2, z, d, d, d);
  else b.mesh(GLOBE, 'cyl', x, y - 0.075, z, 0.2, 0.03, 0.2);
}

export const theme: LineTheme = {
  opened: 1933,
  // Pre-war: warm globes, faded like an old print.
  grade: { warmth: 0.45, tint: 0.05, sat: 0.88, contrast: 0.1, fade: 0.03, shadow: [0.012, 0.006, 0] },
  vault: true,
  lowCeil: 3.4,
  pillarHalf: 0.21,

  ceiling(h, seg, y) {
    if (seg.vault) vaultRibs(h, seg, y);
    else {
      steelBeams(h, seg, y);
      if (isLow(h, seg, y)) services(h, seg, y);
    }
  },

  lights(h, seg, y) {
    const len = seg.x1 - seg.x0;
    if (len < 1.5) return;
    const zs = h.island ? [-2.6, 2.6] : [-(h.pe + 2.2), h.pe + 2.2];
    if (isLow(h, seg, y)) {
      // Two flush globes a bay, 1.5 m off the beams, none where a sign hangs.
      for (let x = -52.5; x <= 52.5; x += 3) {
        if (x < seg.x0 + 0.4 || x > seg.x1 - 0.4 || nearSign(x, 0.7) || h.blocked(x - 0.2, x + 0.2)) continue;
        for (const z of zs) ceilingGlobe(h, x, z, y);
      }
      return;
    }
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
    const runs = h.wallRuns(s);
    const onWall = (x0: number, x1: number) => runs.some(([a, c]) => x0 >= a && x1 <= c);
    // Tiled dado with a projecting capping course (down to the track bed in island halls).
    for (const [a, c] of runs) {
      wd(`tile:${shade(wall, -0.3)}`, a, h.island ? pf - 0.2 : pf, c, pf + 0.94, 0.012);
      wd(`paint:${shade(wall, -0.45)}`, a, pf + 0.94, c, pf + 1.0, 0.045);
    }
    // Picture rail in line green with a thin accent line.
    wd(green, -H, pf + 2.58, H, pf + 2.8, 0.04);
    wd(`paint:${h.style.accent}`, -H, pf + 2.655, H, pf + 2.685, 0.05);
    for (const seg of h.o.ceil) {
      const u = seg.emit ? seg.y : h.ceilAt((seg.x0 + seg.x1) / 2) - 0.05;
      if (!seg.emit && !seg.vault && u < pf + LOW) {
        // Low ceiling: no frieze, but a conduit above the picture rail with junction boxes every
        // 6.5 m, conduits rising to the ceiling between the name boards, and some dropping to
        // switch boxes under the rail. Everything stays under the knee brackets (u − 0.34).
        const cy = Math.max(pf + 2.9, u - 0.48);
        wd(PIPE, seg.x0, cy, seg.x1, cy + 0.06, 0.06);
        for (let k = Math.ceil((seg.x0 + 0.4 + 45.5) / 6.5); -45.5 + 6.5 * k <= seg.x1 - 0.4; k++) {
          const x = -45.5 + 6.5 * k;
          if (k % 2 !== 0) {
            wd(GALV, x - 0.08, cy - 0.04, x + 0.08, cy + 0.1, 0.07);
            continue;
          }
          wd(PIPE, x - 0.12, cy - 0.06, x + 0.12, cy + 0.12, 0.08);
          wd(PIPE, x - 0.025, cy + 0.12, x + 0.025, u, 0.05);
          if (k % 4 === 0 && onWall(x - 0.1, x + 0.1)) {
            wd(PIPE, x - 0.025, pf + 2.54, x + 0.025, cy - 0.06, 0.065);
            wd(GALV, x - 0.09, pf + 2.38, x + 0.09, pf + 2.54, 0.08);
          }
        }
        continue;
      }
      // Willow frieze: strands of uneven length drooping from a slim upper rail, in groups every
      // 6 m, kept 3 m off the cross-beam grid so the haunches stay clear.
      const yR = Math.min(u - 0.3, pf + 3.6);
      const room = yR - 0.05 - (pf + 2.86);
      if (room < 0.2) continue;
      wd(green, seg.x0, yR - 0.05, seg.x1, yR, 0.05);
      for (let k = Math.ceil((seg.x0 + 0.6 + 51) / 6); -51 + 6 * k <= seg.x1 - 0.6; k++) {
        const gx = -51 + 6 * k;
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
      // Back to back: cast-iron ends, two seat slats and a back rail a side.
      for (const lx of [x - 0.8, x + 0.8]) {
        b.deco(IRON, lx - 0.025, y, z - 0.46, lx + 0.025, y + 0.05, z + 0.46);
        b.deco(IRON, lx - 0.025, y, z - 0.04, lx + 0.025, y + 0.86, z + 0.04);
        b.deco(IRON, lx - 0.025, y + 0.36, z - 0.47, lx + 0.025, y + 0.4, z + 0.47);
      }
      for (const sd of [-1, 1]) {
        b.deco(WOOD, x - 0.88, y + 0.4, z + sd * 0.08, x + 0.88, y + 0.44, z + sd * 0.25);
        b.deco(WOOD, x - 0.88, y + 0.4, z + sd * 0.28, x + 0.88, y + 0.44, z + sd * 0.45);
        b.deco(WOOD, x - 0.88, y + 0.54, z + sd * 0.04, x + 0.88, y + 0.8, z + sd * 0.07);
      }
      return;
    }
    // Against side wall `s`: back towards the wall, seat facing the track.
    for (const lx of [x - 0.8, x + 0.8]) {
      b.deco(IRON, lx - 0.025, y, z - s * 0.26, lx + 0.025, y + 0.05, z + s * 0.25);
      b.deco(IRON, lx - 0.025, y, z + s * 0.2, lx + 0.025, y + 0.82, z + s * 0.25);
      b.deco(IRON, lx - 0.025, y + 0.36, z - s * 0.27, lx + 0.025, y + 0.4, z + s * 0.25);
    }
    b.deco(WOOD, x - 0.88, y + 0.4, z + s * 0.2, x + 0.88, y + 0.44, z + s * 0.02);
    b.deco(WOOD, x - 0.88, y + 0.4, z - s * 0.02, x + 0.88, y + 0.44, z - s * 0.22);
    b.deco(WOOD, x - 0.88, y + 0.52, z + s * 0.17, x + 0.88, y + 0.78, z + s * 0.2);
  },
};
