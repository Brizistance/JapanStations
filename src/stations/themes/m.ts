// Sumire Line theme (opened 2023). See Plans/features/line-themes/plan.md.
// Newest line: warm timber battens floating under a dark ceiling, soft continuous light lines,
// timber posts with a violet light slot, and a drift of violet petals along the walls.

import type { CeilSeg } from '../kit';
import { hash, shade, type HallInfo, type LineTheme } from './types';

const TIMBER = 'wood:#c79a62';
const TIMBER_DK = 'wood:#a87a48';
const TIMBER_DEEP = 'wood:#8a5f33';
const SHADOW = 'flat:#1c1a19';
const WARM = 'glow:#f6d3a3';
const SLOT = 'glow:#e7a8d6';
const CUSHION = 'flat:#8e3a74';
const LEAF = 'flat:#7d9a5a';
const PITCH = 0.28; // batten spacing

const span = (s: number, a: number, b: number): [number, number] => [Math.min(s * a, s * b), Math.max(s * a, s * b)];

/** Stretches of [x0, x1] with nothing coming through the ceiling. */
function clear(h: HallInfo, x0: number, x1: number): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let x = x0; x < x1 - 1e-6; x += 0.5) {
    const xb = Math.min(x + 0.5, x1);
    if (h.blocked(x, xb)) {
      if (start !== null && x - start > 0.3) out.push([start, x]);
      start = null;
    } else if (start === null) start = x;
  }
  if (start !== null && x1 - start > 0.3) out.push([start, x1]);
  return out;
}

/** The batten field over the platform: batten centrelines, and where the light lines go. */
function field(h: HallInfo) {
  const { pe, wallZ, island } = h;
  const zones: [number, number][] = island ? [[-pe + 0.15, pe - 0.15]] : [[-wallZ + 0.15, -pe - 0.15], [pe + 0.15, wallZ - 0.15]];
  const battens: number[] = [];
  for (const [za, zb] of zones) {
    const n = Math.floor((zb - za - 0.07) / PITCH) + 1;
    for (let k = 0; k < n; k++) battens.push((za + zb) / 2 + (k - (n - 1) / 2) * PITCH);
  }
  // Snap each light line into the gap between the two battens around its target.
  const snap = (g: number) => {
    for (let i = 0; i + 1 < battens.length; i++) {
      if (battens[i] <= g && g <= battens[i + 1] && battens[i + 1] - battens[i] < PITCH + 0.01) return (battens[i] + battens[i + 1]) / 2;
    }
    return g;
  };
  const gapT = island ? [-1.3, 1.3] : [-(wallZ - 1.3), -(pe + 1.3), pe + 1.3, wallZ - 1.3];
  const edgeT = island ? [-(pe - 0.5), pe - 0.5] : [-(pe + 0.5), pe + 0.5];
  return { battens, gaps: gapT.map(snap), edges: edgeT.map(snap), gapT, edgeT };
}

/** Underside of the kit's faceted vault (9 flat strips) at z. */
function facetY(h: HallInfo, y: number, z: number): number {
  const n = 9, w = (2 * h.wallZ) / n;
  const k = Math.min(n - 1, Math.max(0, Math.floor((z + h.wallZ) / w)));
  const zc = -h.wallZ + (k + 0.5) * w;
  return y + 1.6 * Math.sqrt(Math.max(0, 1 - (zc / h.wallZ) ** 2));
}

const isVault = (seg: CeilSeg) => !!seg.vault && seg.emit;

export const theme: LineTheme = {
  opened: 2023,
  // Timber and violet light: warm neutral, violet in the shadows.
  grade: { warmth: 0.15, tint: 0.12, sat: 1.02, contrast: 0.12, fade: 0, shadow: [0.008, 0, 0.012] },
  ceilMat: 'flat:#2b2826',
  soffitMat: 'flat:#24211f',
  pillarHalf: 0.22,

  ceiling(h, seg, y) {
    const { b } = h;
    if (isVault(seg)) {
      // Slim timber ribs every 3 m, stepping with the vault's facets.
      const n = 9, w = (2 * h.wallZ) / n;
      for (let x = seg.x0 + 1.5; x < seg.x1 - 0.1; x += 3) {
        if (h.blocked(x - 0.05, x + 0.05)) continue;
        for (let k = 0; k < n; k++) {
          const z0 = -h.wallZ + k * w, fy = facetY(h, y, z0 + w / 2);
          b.deco(TIMBER_DK, x - 0.05, fy - 0.13, z0, x + 0.05, fy - 0.005, z0 + w);
        }
      }
      return;
    }
    const f = field(h);
    for (const [xa, xb] of clear(h, seg.x0, seg.x1)) {
      // Battens float 0.04 under the dark ceiling; every fourth one a shade darker.
      f.battens.forEach((z, k) => b.deco(k % 4 === 3 ? TIMBER_DK : TIMBER, xa, y - 0.14, z - 0.035, xb, y - 0.04, z + 0.035));
      // Dark carriers across the field every 3 m, tight to the ceiling.
      const z0 = f.battens[0] - 0.035, z1 = f.battens[f.battens.length - 1] + 0.035;
      for (let x = xa + 1.5; x < xb - 0.1; x += 3) b.deco(SHADOW, x - 0.02, y - 0.04, z0, x + 0.02, y - 0.005, z1);
    }
  },

  lights(h, seg, y) {
    const { b } = h;
    if (isVault(seg)) {
      // Light lines laid along the vault's facets.
      const { gapT, edgeT } = field(h);
      for (const [xa, xb] of clear(h, seg.x0, seg.x1)) {
        for (const [zs, mat, w] of [[gapT, 'light', 0.05], [edgeT, WARM, 0.08]] as const) {
          for (const z of zs) {
            const fy = Math.min(facetY(h, y, z - w), facetY(h, y, z + w));
            b.deco(mat, xa, fy - 0.025, z - w, xb, fy - 0.005, z + w);
          }
        }
      }
      return;
    }
    const f = field(h);
    // The ceiling is cut open where stairs rise, so the lines break there too.
    for (const [xa, xb] of clear(h, seg.x0, seg.x1)) {
      for (const z of f.gaps) {
        b.deco(SHADOW, xa, y - 0.115, z - 0.07, xb, y - 0.005, z + 0.07);
        b.deco('light', xa, y - 0.135, z - 0.04, xb, y - 0.115, z + 0.04);
      }
      // Softer warm line along each platform edge, glowing through the battens.
      for (const z of f.edges) b.deco(WARM, xa, y - 0.02, z - 0.08, xb, y - 0.005, z + 0.08);
    }
  },

  pillar(h, x, z, y0, y1) {
    const { b } = h;
    const top = Math.max(y0 + 1, y1 - 0.14);
    b.deco('metal:#b9bdc2', x - 0.245, y0, z - 0.245, x + 0.245, y0 + 0.06, z + 0.245);
    b.deco(h.style.pillar, x - 0.228, y0 + 0.06, z - 0.228, x + 0.228, y0 + 0.3, z + 0.228);
    b.deco(TIMBER_DK, x - 0.22, y0 + 0.3, z - 0.22, x + 0.22, top, z + 0.22);
    // Shadow gap where the post meets the ceiling.
    b.deco(SHADOW, x - 0.2, top, z - 0.2, x + 0.2, y1, z + 0.2);
    // Violet light slot on the faces looking along the platform, in a dark frame.
    const s0 = y0 + 0.4, s1 = Math.max(s0 + 0.5, top - 0.16);
    b.deco(SHADOW, x - 0.232, s0, z - 0.035, x + 0.232, s1, z + 0.035);
    b.deco(SLOT, x - 0.236, s0 + 0.01, z - 0.02, x + 0.236, s1 - 0.01, z + 0.02);
    // Inlaid line-colour band.
    b.deco(`paint:${h.line.color}`, x - 0.24, y0 + 1.965, z - 0.24, x + 0.24, y0 + 1.995, z + 0.24);
  },

  wallTrim(h, s) {
    const { b, pf, wallZ, H } = h;
    const wz = (d: number) => span(s, wallZ - d, wallZ);
    // Timber wainscot with a deeper capping strip and panel joints every 2.4 m.
    const base = h.island ? pf - 0.2 : pf;
    for (const [xa, xb] of h.wallRuns(s)) {
      b.deco(TIMBER, xa, base, wz(0.035)[0], xb, pf + 0.96, wz(0.035)[1]);
      b.deco(TIMBER_DEEP, xa, pf + 0.96, wz(0.05)[0], xb, pf + 1.0, wz(0.05)[1]);
      for (let x = Math.ceil((xa + 0.2) / 2.4) * 2.4; x < xb - 0.2; x += 2.4) {
        b.deco(TIMBER_DEEP, x - 0.006, base, wz(0.04)[0], x + 0.006, pf + 0.96, wz(0.04)[1]);
      }
    }
    b.deco(`flat:${h.line.color}`, -H, pf + 2.58, wz(0.02)[0], H, pf + 2.62, wz(0.02)[1]);

    // Violet petals blown along the wall: loose clusters every ~8 m, strays between.
    const seed = (h.station.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 97) + (s > 0 ? 0 : 50);
    const runs = h.wallRuns(s);
    const mats = [`flat:${h.line.color}`, `flat:${shade(h.line.color, 0.5)}`, LEAF];
    let c = 0;
    for (let cx = -H + 3 + hash(1, seed) * 4; cx < H - 1; cx += 8, c++) {
      const n = 4 + Math.floor(hash(c, seed + 1) * 5);
      const cy = pf + 1.5 + hash(c, seed + 2) * 1.5;
      for (let j = 0; j < n + 2; j++) {
        const i = c * 16 + j, stray = j >= n;
        const dx = (hash(i, seed + 3) + hash(i, seed + 4) - 1) * (stray ? 4 : 1.8);
        const x = cx + dx;
        const y = Math.min(pf + 3.2, Math.max(pf + 1.2, cy + dx * 0.15 + (hash(i, seed + 5) - 0.5) * (stray ? 1.6 : 0.7)));
        const r = hash(i, seed + 6);
        const [pw, ph] = r < 0.5 ? [0.1, 0.07] : [0.07, 0.1];
        if (Math.abs(x) > H - 0.2 || (y + ph > pf + 2.55 && y < pf + 2.65)) continue;
        // Keep clear of the name boards and posters, and of doorways.
        if (y < pf + 2.35 && Math.abs(((x + 52) % 13 + 13) % 13 - 6.5) > 6.5 - 1.7) continue;
        if (y < pf + 2.5 && !runs.some(([a, e]) => x - pw > a && x + pw < e)) continue;
        const mat = mats[hash(i, seed + 7) < 0.12 ? 2 : r < 0.25 || r > 0.75 ? 1 : 0];
        b.deco(mat, x - pw / 2, y, wz(0.012)[0], x + pw / 2, y + ph, wz(0.012)[1]);
      }
    }
  },

  bench(h, x, y, z, s) {
    const { b } = h;
    const dz = s === 0 ? 0.5 : 0.28, top = s === 0 ? 0.4 : 0.36;
    // Solid timber block on a recessed dark plinth, with a slim violet pad.
    b.deco(SHADOW, x - 0.82, y, z - dz + 0.08, x + 0.82, y + 0.08, z + dz - 0.08);
    b.deco(TIMBER, x - 0.9, y + 0.08, z - dz, x + 0.9, y + top, z + dz);
    b.deco(CUSHION, x - 0.86, y + top, z - dz + 0.04, x + 0.86, y + top + 0.04, z + dz - 0.04);
    // Island benches are back to back: a low timber spine down the middle.
    if (s === 0) b.deco(TIMBER_DK, x - 0.88, y + top, z - 0.06, x + 0.88, y + 0.86, z + 0.06);
  },
};
