// Akanesuji Line theme: the deep line of the bubble years, stone and brass.
// A dark coffered soffit with a brass-edged light cove, fat stone columns with stacked brass
// collars, and madder-dyed warp threads hanging from a brass picture rail. See
// Plans/features/line-themes/plan.md.

import type { CeilSeg } from '../kit';
import { hash, hexOf, shade, type HallInfo, type LineTheme } from './types';

const BRASS = 'metal:#b08d3c';
const RIB = 'flat:#4c4f55';
const GLOW = 'glow:#ffd9a0';
const BAY = 3; // coffer pitch along the hall

/** Darker polished stone for base courses and plinths, from the station's wall colour. */
const darkStone = (h: HallInfo) => `floor:${shade(hexOf(h.style.wall), -0.6)}`;

/** Unblocked stretches of a segment, cut on the coffer grid so ribs and coves stop cleanly. */
function runs(h: HallInfo, seg: CeilSeg): [number, number][] {
  const out: [number, number][] = [];
  let cur: [number, number] | null = null;
  for (let x = Math.floor(seg.x0 / BAY) * BAY; x < seg.x1; x += BAY) {
    const a = Math.max(seg.x0, x), b = Math.min(seg.x1, x + BAY);
    if (b - a < 0.01) continue;
    // 0.45: under a concourse the hung panels are cut 0.4 either side of a stair.
    if (h.blocked(a, b, 0.45)) cur = null;
    else if (cur && Math.abs(cur[1] - a) < 0.01) cur[1] = b;
    else out.push((cur = [a, b]));
  }
  return out;
}

/** Where the coves, coffer ribs and downlight rows go across the hall (z). */
function layout(h: HallInfo) {
  const { pe, wallZ } = h;
  if (h.island) {
    return {
      coves: [{ z: 0, w: 1.25 }],
      ribs: [[-pe - 0.2, -1.25], [1.25, pe + 0.2]] as [number, number][],
      // Mid ribs between the capitals (|z| ≤ 2.68) and the downlight rows.
      longs: [-(pe + 0.12), -(pe - 1.12), pe - 1.12, pe + 0.12],
      rows: [-(pe - 0.82), pe - 0.82],
    };
  }
  // Side platforms: one cove down the middle of each platform, over its hanging signs.
  const m = (s: number, a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a]);
  return {
    coves: [-1, 1].map((s) => ({ z: s * (pe + 2.6), w: 1.0 })),
    ribs: [-1, 1].flatMap((s) => [m(s, pe - 0.2, pe + 1.6), m(s, pe + 3.6, wallZ + 0.05)]),
    longs: [-(pe - 0.12), pe - 0.12],
    rows: [-(wallZ - 0.8), -(pe + 0.9), pe + 0.9, wallZ - 0.8],
  };
}

/** Faceted vault underside at z, matching the kit's nine strips. */
function vaultRise(h: HallInfo, z: number) {
  const w = (2 * h.wallZ) / 9;
  const k = Math.min(8, Math.max(0, Math.floor((z + h.wallZ) / w)));
  const zc = -h.wallZ + (k + 0.5) * w;
  return 1.6 * Math.sqrt(Math.max(0, 1 - (zc / h.wallZ) ** 2));
}

/** Small round downlight in a thin dark ring, flush under a ceiling at y. */
function downlight(h: HallInfo, x: number, y: number, z: number, d: number) {
  h.b.mesh('flat:#1c1d20', 'cyl', x, y - 0.017, z, d + 0.08, 0.02, d + 0.08);
  h.b.mesh('light', 'cyl', x, y - 0.025, z, d, 0.03, d);
}

export const theme: LineTheme = {
  opened: 1994,
  ceilMat: 'flat:#3a3c40',
  soffitMat: 'flat:#1f2023',
  vaultMat: 'flat:#ddd6c8',
  pillarHalf: 0.4,

  ceiling(h, seg, y) {
    const { b } = h;
    if (seg.vault) {
      // Dark ribs following the facets, with a brass strip on their underside.
      const w = (2 * h.wallZ) / 9;
      for (let x = Math.ceil((seg.x0 + 0.2) / 6) * 6; x <= seg.x1 - 0.2; x += 6) {
        if (h.blocked(x - 0.2, x + 0.2)) continue;
        for (let k = 0; k < 9; k++) {
          const zc = -h.wallZ + (k + 0.5) * w, r = y + vaultRise(h, zc);
          b.deco('flat:#3a3c40', x - 0.15, r - 0.12, zc - w / 2, x + 0.15, r + 0.02, zc + w / 2);
          b.deco(BRASS, x - 0.06, r - 0.135, zc - w / 2, x + 0.06, r - 0.12, zc + w / 2);
        }
      }
      return;
    }
    const L = layout(h);
    for (const [a, c] of runs(h, seg)) {
      // Transverse coffer ribs on the grid, stopping at the cove fascias.
      for (let x = Math.ceil(a / BAY) * BAY; x <= c; x += BAY) {
        if (x - 0.08 < seg.x0 || x + 0.08 > seg.x1) continue;
        for (const [z0, z1] of L.ribs) b.deco(RIB, x - 0.08, y - 0.1, z0, x + 0.08, y + 0.02, z1);
      }
      for (const z of L.longs) b.deco(RIB, a, y - 0.1, z - 0.08, c, y + 0.02, z + 0.08);
      // Light cove: brass fascias hide a warm strip on the ceiling, so the light reads as indirect.
      for (const { z, w } of L.coves) {
        for (const s of [-1, 1]) b.deco(BRASS, a, y - 0.22, z + s * w - 0.015, c, y + 0.02, z + s * w + 0.015);
        for (const xe of [a, c - 0.03]) b.deco(BRASS, xe, y - 0.22, z - w, xe + 0.03, y + 0.02, z + w);
        b.deco(GLOW, a, y - 0.016, z - w + 0.06, c, y - 0.006, z + w - 0.06);
      }
    }
  },

  lights(h, seg, y) {
    const L = layout(h);
    // Downlights sit in the coffers (between the ribs), so they keep clear of them; they run
    // everywhere the ceiling is, including under blocked stretches where the cove stops.
    const offs = h.island ? [0.75, 2.25] : [1.5];
    for (let x0 = Math.floor(seg.x0 / BAY) * BAY; x0 < seg.x1; x0 += BAY) {
      for (const o of offs) {
        const x = x0 + o;
        if (x - 0.15 < seg.x0 || x + 0.15 > seg.x1 || h.blocked(x - 0.15, x + 0.15, 0.45)) continue;
        for (const z of L.rows) {
          if (seg.vault) downlight(h, x, y + vaultRise(h, z), z, 0.22);
          else downlight(h, x, y, z, 0.16);
        }
      }
    }
    // Under a vault the crown carries a warm strip instead of the cove.
    if (seg.vault) {
      for (const [a, c] of runs(h, seg)) h.b.deco(GLOW, a, y + 1.6 - 0.016, -0.6, c, y + 1.6 - 0.006, 0.6);
    }
  },

  pillar(h, x, z, y0, y1) {
    const { b } = h;
    // Under the concourse the visible ceiling is the hung panel, 0.05 below the slab.
    const seg = h.o.ceil.find((s) => x >= s.x0 && x <= s.x1);
    const top = seg && !seg.emit && !h.o.elevated ? y1 - 0.05 : y1;
    const stone = `panel:${hexOf(h.style.pillar)}`;
    b.mesh(stone, 'cyl', x, (y0 + top) / 2, z, 0.84, top - y0, 0.84);
    b.mesh(darkStone(h), 'cyl', x, y0 + 0.15, z, 0.94, 0.3, 0.94);
    b.mesh(BRASS, 'cyl', x, y0 + 0.32, z, 0.9, 0.04, 0.9);
    b.mesh(`paint:${h.line.color}`, 'cyl', x, h.pf + 1.98, z, 0.87, 0.12, 0.87);
    // Capital: three brass collars stepping out towards the ceiling.
    b.mesh(BRASS, 'cyl', x, top - 0.21, z, 0.92, 0.08, 0.92);
    b.mesh(BRASS, 'cyl', x, top - 0.12, z, 1.05, 0.1, 1.05);
    b.mesh(BRASS, 'cyl', x, top - 0.03, z, 1.25, 0.08, 1.25);
  },

  trackColumn(h, x, y0, y1) {
    // Side-platform halls only: a slimmer stone column between the tracks.
    const { b } = h;
    b.mesh(`panel:${hexOf(h.style.pillar)}`, 'cyl', x, (y0 + y1) / 2, 0, 0.46, y1 - y0, 0.46);
    b.mesh(BRASS, 'cyl', x, h.pf + 0.3, 0, 0.5, 0.04, 0.5);
    b.mesh(`paint:${h.line.color}`, 'cyl', x, h.pf + 1.98, 0, 0.49, 0.12, 0.49);
  },

  wallTrim(h, s) {
    const { b, pf, wallZ } = h;
    // z of a layer standing `t` proud of the wall face (its back sinks 0.01 into the wall).
    const zz = (t: number): [number, number] => {
      const a = s * (wallZ - t), c = s * (wallZ + 0.01);
      return [Math.min(a, c), Math.max(a, c)];
    };
    const runs = h.wallRuns(s);
    // Polished dark stone base course with a brass cap.
    for (const [a, c] of runs) {
      const [z0, z1] = zz(0.03), [q0, q1] = zz(0.04);
      b.deco(darkStone(h), a, pf - 0.2, z0, c, pf + 0.6, z1);
      b.deco(BRASS, a, pf + 0.6, q0, c, pf + 0.63, q1);
    }
    // Brass picture rail with a madder stripe: the loom beam the threads hang from.
    {
      const [r0, r1] = zz(0.06), [m0, m1] = zz(0.04);
      b.deco(BRASS, -h.H, pf + 2.56, r0, h.H, pf + 2.62, r1);
      b.deco(`paint:${h.line.color}`, -h.H, pf + 2.62, m0, h.H, pf + 2.74, m1);
      b.deco(BRASS, -h.H, pf + 2.74, r0, h.H, pf + 2.8, r1);
    }
    // Madder-dyed warp threads: flat inlay, a group every 3 m, clear of the wall signs.
    const red = `flat:${h.line.color}`, dark = `flat:${shade(h.line.color, -0.35)}`;
    const [t0, t1] = zz(0.012);
    for (let g = Math.ceil((-h.H + 1) / BAY); g * BAY + 1.5 < h.H - 1; g++) {
      const xc = g * BAY + 1.5;
      if (Math.abs(((xc + 52) % 13 + 13) % 13 - 6.5) > 6.5 - 1.6 - 0.25) continue;
      if (!runs.some(([a, c]) => xc - 0.3 > a && xc + 0.3 < c)) continue;
      for (let i = 0; i < 4; i++) {
        const n = g * 7 + i + (s > 0 ? 500 : 0);
        const x = xc - 0.2 + i * 0.13 + (hash(n, 3) - 0.5) * 0.04;
        const len = 0.45 + hash(n, 1) * 1.05;
        const v = hash(n, 2);
        const mat = v > 0.88 ? BRASS : v > 0.55 ? dark : red;
        b.deco(mat, x - 0.022, pf + 2.56 - len, t0, x + 0.022, pf + 2.56, t1);
      }
    }
  },

  bench(h, x, y, z, s) {
    const { b } = h;
    const stone = `floor:${shade(hexOf(h.style.pillar), -0.2)}`;
    const cushion = `flat:${h.line.color}`;
    // Footprint: island 1.8 × 1.0 around (x, z); side 1.8 × 0.56.
    const dz = s === 0 ? 0.5 : 0.28;
    b.deco(darkStone(h), x - 0.82, y, z - dz + 0.06, x + 0.82, y + 0.08, z + dz - 0.06);
    b.deco(stone, x - 0.88, y + 0.08, z - dz + 0.04, x + 0.88, y + 0.36, z + dz - 0.04);
    b.deco(BRASS, x - 0.9, y + 0.36, z - dz + 0.02, x + 0.9, y + 0.38, z + dz - 0.02);
    if (s !== 0) {
      b.deco(cushion, x - 0.86, y + 0.38, z - dz + 0.04, x + 0.86, y + 0.44, z + dz - 0.04);
      return;
    }
    // Island: a low stone spine down the middle, cushions either side.
    b.deco(stone, x - 0.86, y + 0.38, z - 0.07, x + 0.86, y + 0.76, z + 0.07);
    b.deco(BRASS, x - 0.87, y + 0.76, z - 0.08, x + 0.87, y + 0.78, z + 0.08);
    for (const t of [-1, 1]) {
      b.deco(cushion, x - 0.86, y + 0.38, Math.min(z + t * 0.07, z + t * 0.46), x + 0.86, y + 0.44, Math.max(z + t * 0.07, z + t * 0.46));
    }
  },
};
