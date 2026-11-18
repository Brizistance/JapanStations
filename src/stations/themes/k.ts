// Kikyō Line theme (2015): "night garden". A dark ceiling that disappears, round columns that
// open into a bell capital lit from within, five downlights in a bellflower star round each
// column, and rows of small star studs on a pale frieze. See Plans/features/line-themes/plan.md.

import type { CeilSeg } from '../kit';
import type { HallInfo, LineTheme } from './types';
import { hexOf, shade } from './types';

const PALE = 'flat:#eeeaf2'; // capitals and vault ribs: catches the light
const DARK = 'flat:#2a2531'; // charcoal-violet: wall base, column foot, bench plinth
const JOINT = 'flat:#2e2f37'; // a shade lighter than the ceiling, so the joints barely read
const RING = 'glow:#e9dcff';
const STEM = 'glow:#7a5bb5'; // darker violet so the centreline glow stays faint
const LILAC = 'flat:#c7b2e3';
/** Hanging sign positions (kit.ts): capitals near them stay above the signs. */
const SIGN_X = [0, 27, -27, 38, -38, 49, -49];
/** Bell capital step diameters, bottom to top. */
const BELL = [0.64, 0.86, 1.14, 1.5];

/** Underside at z: the vault facet kit.ts builds there (nine strips), or the flat `y`. */
function under(h: HallInfo, seg: CeilSeg, y: number, z: number): number {
  if (!seg.vault) return y;
  const n = 9, w = (2 * h.wallZ) / n;
  const k = Math.min(n - 1, Math.max(0, Math.floor((z + h.wallZ) / w)));
  const zc = -h.wallZ + (k + 0.5) * w;
  return y + 1.6 * Math.sqrt(Math.max(0, 1 - (zc / h.wallZ) ** 2));
}

/** Small round downlight flush under the ceiling (the lower facet wins where it straddles two). */
function downlight(h: HallInfo, seg: CeilSeg, y: number, x: number, z: number) {
  const u = Math.min(under(h, seg, y, z - 0.09), under(h, seg, y, z + 0.09));
  h.b.mesh('light', 'cyl', x, u - 0.015, z, 0.18, 0.03, 0.18);
}

/** Stretches of [x0, x1] clear of stairs and shafts, in 0.5 m steps. */
function openRuns(h: HallInfo, x0: number, x1: number): [number, number][] {
  const out: [number, number][] = [];
  let a: number | null = null;
  for (let x = x0; x < x1 - 1e-6; x += 0.5) {
    if (h.blocked(x, Math.min(x + 0.5, x1), 0.2)) {
      if (a !== null) out.push([a, x]);
      a = null;
    } else if (a === null) a = x;
  }
  if (a !== null) out.push([a, x1]);
  return out;
}

export const theme: LineTheme = {
  opened: 2015,
  ceilMat: 'flat:#1c1d22',
  vaultMat: 'flat:#202128',
  soffitMat: 'flat:#15161a',

  ceiling(h, seg, y) {
    const { b, wallZ } = h;
    // Transverse joints / ribs halfway between the columns, so they never run into a capital.
    for (let x = 3 + 6 * Math.ceil((seg.x0 + 0.1 - 3) / 6); x <= seg.x1 - 0.1; x += 6) {
      if (h.blocked(x - 0.1, x + 0.1)) continue;
      if (!seg.vault) {
        b.deco(JOINT, x - 0.025, y - 0.008, -wallZ, x + 0.025, y, wallZ);
        continue;
      }
      // Slim pale rib following the vault's facets, with risers where the facets step.
      const n = 9, w = (2 * wallZ) / n;
      const u: number[] = [];
      for (let k = 0; k < n; k++) u.push(under(h, seg, y, -wallZ + (k + 0.5) * w));
      for (let k = 0; k < n; k++) {
        const zc = -wallZ + (k + 0.5) * w;
        b.deco(PALE, x - 0.06, u[k] - 0.06, zc - w / 2, x + 0.06, u[k], zc + w / 2);
      }
      for (let j = 0; j <= n; j++) {
        const zb = -wallZ + j * w;
        const a = j > 0 ? u[j - 1] : y, c = j < n ? u[j] : y;
        b.deco(PALE, x - 0.06, Math.min(a, c) - 0.06, zb - 0.03, x + 0.06, Math.max(a, c), zb + 0.03);
      }
    }
  },

  lights(h, seg, y) {
    const { b, island, pe, wallZ } = h;
    const onPlat = (z: number) =>
      island ? Math.abs(z) < pe - 0.3 : Math.abs(z) > pe + 0.3 && Math.abs(z) < wallZ - 0.3;
    const inSeg = (x: number) => x >= seg.x0 + 0.1 && x <= seg.x1 - 0.1;
    const ok = (x: number, z: number) => inSeg(x) && onPlat(z) && !h.blocked(x - 0.1, x + 0.1);
    // The bellflower: five lights in a pentagon round every column position (one point towards
    // the platform edge), also where the column is left out. Points falling in another segment
    // are drawn by that segment's call, at its height.
    const starZ = island ? 2.05 : (pe + wallZ) / 2;
    for (let cx = -54; cx <= 54; cx += 6) {
      for (const s of [-1, 1]) {
        for (let k = 0; k < 5; k++) {
          const a = Math.PI / 2 + (k * 2 * Math.PI) / 5;
          const x = cx + Math.cos(a), z = s * (starZ + Math.sin(a));
          if (ok(x, z)) downlight(h, seg, y, x, z);
        }
      }
    }
    // A row along each platform edge so the screen doors are well lit.
    const edgeZ = island ? pe - 0.62 : pe + 0.6;
    for (let x = -57; x <= 57; x += 2) {
      for (const s of [-1, 1]) if (ok(x, s * edgeZ)) downlight(h, seg, y, x, s * edgeZ);
    }
    // The stem: a faint violet line along the ceiling over the middle of each platform.
    const stems = island ? [0] : [-(pe + 2.6), pe + 2.6];
    for (const z of stems) {
      const u = under(h, seg, y, z);
      for (const [xa, xb] of openRuns(h, seg.x0, seg.x1)) b.deco(STEM, xa, u - 0.02, z - 0.02, xb, u, z + 0.02);
    }
  },

  pillar(h, x, z, y0, y1) {
    const { b, pf, style, line } = h;
    // The bell opens 0.9 m under the ceiling, never below pf + 2.55, and above the signs near them.
    const nearSign = SIGN_X.some((sx) => Math.abs(sx - x) < 2.5);
    const c0 = Math.max(y1 - 0.9, pf + 2.55, nearSign ? pf + 3.17 : -Infinity);
    const bell = y1 - c0 >= 0.3;
    const top = bell ? c0 : y1;
    b.mesh(style.pillar, 'cyl', x, (y0 + top) / 2, z, 0.56, top - y0, 0.56);
    b.mesh(DARK, 'cyl', x, y0 + 0.05, z, 0.62, 0.1, 0.62);
    b.mesh(`paint:${line.color}`, 'cyl', x, y0 + 1.98, z, 0.585, 0.15, 0.585);
    if (!bell) {
      // Ceiling too low for the flare: a pale collar only.
      b.mesh(PALE, 'cyl', x, y1 - 0.06, z, 0.66, 0.12, 0.66);
      return;
    }
    const dh = (y1 - c0) / BELL.length;
    BELL.forEach((d, i) => b.mesh(PALE, 'cyl', x, c0 + (i + 0.5) * dh, z, d, dh, d));
    // Glowing ring tucked under the top step, wider than the step below: lit from within.
    const yb = c0 + (BELL.length - 1) * dh;
    const dr = (BELL[BELL.length - 2] + BELL[BELL.length - 1]) / 2;
    b.mesh(RING, 'cyl', x, yb - 0.02, z, dr, 0.04, dr);
  },

  wallTrim(h, s) {
    const { b, pf, wallZ, island, line, style, H, o } = h;
    const Z = (d: number): [number, number] => {
      const a = s * wallZ, c = s * (wallZ - d);
      return [Math.min(a, c), Math.max(a, c)];
    };
    // Dark base; in island halls it runs down to the track bed.
    const [b0, b1] = Z(0.03);
    for (const [xa, xb] of h.wallRuns(s)) b.deco(DARK, xa, island ? pf - 1.3 : pf, b0, xb, pf + 1.0, b1);
    const [r0, r1] = Z(0.04);
    b.deco(`paint:${line.color}`, -H, pf + 2.56, r0, H, pf + 2.66, r1);
    // Pale frieze above the rail (a light tint of the station's wall colour), with star studs.
    const lowCeil = Math.min(...o.ceil.map((c) => (c.emit ? c.y : c.y - 0.05)));
    const top = Math.min(pf + 3.5, lowCeil - 0.02);
    if (top < pf + 2.75) return;
    const [f0, f1] = Z(0.01);
    b.deco(`flat:${shade(hexOf(style.wall), 0.75)}`, -H, pf + 2.66, f0, H, top, f1);
    const [s0, s1] = Z(0.025);
    // Two rows every 4 m, offset 2 m: a staggered grid with a star every 2 m along the wall.
    const rows = [
      { y: pf + 2.92, off: 0, mat: `paint:${line.color}` },
      { y: pf + 3.24, off: 2, mat: LILAC },
    ];
    for (const r of rows) {
      if (r.y + 0.08 > top - 0.03) continue;
      for (let x = -H + 2 + r.off; x <= H - 1; x += 4) {
        b.deco(r.mat, x - 0.08, r.y - 0.02, s0, x + 0.08, r.y + 0.02, s1);
        b.deco(r.mat, x - 0.02, r.y - 0.08, s0, x + 0.02, r.y + 0.08, s1);
      }
    }
  },

  bench(h, x, y, z, s) {
    const { b, line, style } = h;
    // Round drum seats on a slim dark plinth: a quincunx on the island, a row against a wall.
    const ht = s === 0 ? 0.44 : 0.4, d = s === 0 ? 0.46 : 0.5, hz = s === 0 ? 0.49 : 0.27;
    const spots = s === 0
      ? [[-0.64, -0.25], [-0.64, 0.25], [0, 0], [0.64, -0.25], [0.64, 0.25]]
      : [[-0.6, 0], [0, 0], [0.6, 0]];
    b.deco(DARK, x - 0.88, y, z - hz, x + 0.88, y + 0.04, z + hz);
    for (const [dx, dz] of spots) {
      b.mesh(`flat:${style.accent}`, 'cyl', x + dx, y + 0.04 + (ht - 0.1) / 2, z + dz, d - 0.02, ht - 0.1, d - 0.02);
      b.mesh(`paint:${line.color}`, 'cyl', x + dx, y + ht - 0.03, z + dz, d, 0.06, d);
    }
  },
};
