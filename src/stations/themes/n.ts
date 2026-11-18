// Nagisa Line theme. See Plans/features/line-themes/plan.md.
//
// 1961, high-growth era, built fast and plain: a flat slab on concrete downstand beams, square
// tiled columns between the tracks, bare fluorescent battens, small two-tone wall tiles with a
// stepped "shoreline" band, and moulded shell seats. Elevated stations get a toothed valance.

import type { CeilSeg } from '../kit';
import { hexOf, shade, type HallInfo, type LineTheme } from './types';

const BEAM_D = 0.3; // transverse beam depth
const BEAM_W = 0.45;
const LONG_D = 0.18; // longitudinal beam along the column row
const CREAM = '#ece4cf';
const STEEL = 'metal:#9aa0a6';
const BATTEN = 'paint:#e6e5e0';
/** x of the hanging signs: keep the elevated brackets clear of them. */
const SIGN_XS = [-49, -38, -27, 0, 27, 38, 49];

/** Rise of the kit's faceted vault at z (it is drawn as 9 flat strips). */
function rise(h: HallInfo, z: number): number {
  const w = (2 * h.wallZ) / 9;
  const k = Math.min(8, Math.max(0, Math.floor((z + h.wallZ) / w)));
  const zc = -h.wallZ + (k + 0.5) * w;
  return 1.6 * Math.sqrt(Math.max(0, 1 - (zc / h.wallZ) ** 2));
}
const under = (h: HallInfo, seg: CeilSeg, y: number, z: number) => y + (seg.vault ? rise(h, z) : 0);

/** Cells of length `len` (plus `gap`) along [x0, x1] that pass `ok`, merged into continuous runs. */
function runs(x0: number, x1: number, len: number, gap: number, ok: (a: number, b: number) => boolean) {
  const cells: [number, number][] = [];
  for (let x = x0; x + len <= x1 + 1e-6; x += len + gap) if (ok(x, x + len)) cells.push([x, x + len]);
  const merged: [number, number][] = [];
  for (const c of cells) {
    const last = merged[merged.length - 1];
    if (last && c[0] - last[1] <= gap + 1e-6) last[1] = c[1];
    else merged.push([c[0], c[1]]);
  }
  return { cells, merged };
}

/** Beam lines match the track columns: x = −H + 3 + 6k. */
function beamXs(h: HallInfo, x0: number, x1: number): number[] {
  const out: number[] = [];
  for (let x = -h.H + 3; x < h.H; x += 6) if (x - BEAM_W / 2 >= x0 && x + BEAM_W / 2 <= x1) out.push(x);
  return out;
}

/** Four moulded shell seats on a steel rail. `zb` is the back's outer face, `d` the way the sitter faces. */
function seats(h: HallInfo, x: number, y: number, zb: number, d: number, first: 0 | 1) {
  const { b } = h;
  for (let i = 0; i < 4; i++) {
    const cx = x + (i - 1.5) * 0.44;
    const mat = (i + first) % 2 ? `paint:${CREAM}` : `paint:${h.line.color}`;
    b.deco(mat, cx - 0.2, y + 0.38, zb, cx + 0.2, y + 0.82, zb + d * 0.06);
    b.deco(mat, cx - 0.2, y + 0.38, zb + d * 0.06, cx + 0.2, y + 0.44, zb + d * 0.44);
  }
}

export const theme: LineTheme = {
  opened: 1961,

  ceiling(h, seg, y) {
    const { b, wallZ } = h;
    // Downstand beams across the hall, one per column bay.
    for (const x of beamXs(h, seg.x0, seg.x1)) {
      if (h.blocked(x - BEAM_W / 2, x + BEAM_W / 2)) continue;
      if (!seg.vault) {
        b.deco('concrete', x - BEAM_W / 2, y - BEAM_D, -wallZ - 0.05, x + BEAM_W / 2, y, wallZ + 0.05);
        continue;
      }
      // Under a vault the beam follows the facets as a stepped rib.
      const w = (2 * wallZ) / 9;
      for (let k = 0; k < 9; k++) {
        const zc = -wallZ + (k + 0.5) * w, yt = y + rise(h, zc);
        b.deco('concrete', x - BEAM_W / 2, yt - BEAM_D, zc - w / 2, x + BEAM_W / 2, yt, zc + w / 2);
      }
    }
    // Shallower beam along the column row (island halls: over the two pillar rows).
    for (const z of h.island ? [-2.05, 2.05] : [0]) {
      const yt = under(h, seg, y, z);
      for (const [x0, x1] of runs(seg.x0, seg.x1, 1, 0, (a, c) => !h.blocked(a, c)).merged) {
        b.deco('concrete', x0, yt - LONG_D, z - 0.2, x1, yt, z + 0.2);
      }
    }
  },

  lights(h, seg, y) {
    const { b, pe } = h;
    // Two rows per platform, slung under the beams so they read as unbroken lines.
    const rows = h.island ? [-0.75 * pe, -0.25 * pe, 0.25 * pe, 0.75 * pe] : [pe + 1.2, pe + 3.4].flatMap((z) => [-z, z]);
    const { cells, merged } = runs(seg.x0 + 0.2, seg.x1 - 0.2, 2.4, 0.1, (a, c) => !h.blocked(a, c));
    for (const z of rows) {
      const yb = under(h, seg, y, z) - BEAM_D;
      for (const [x0, x1] of merged) b.deco(BATTEN, x0 - 0.05, yb - 0.06, z - 0.06, x1 + 0.05, yb, z + 0.06);
      for (const [x0, x1] of cells) b.deco('light', x0 + 0.03, yb - 0.11, z - 0.025, x1 - 0.03, yb - 0.06, z + 0.025);
    }
  },

  pillar(h, x, z, y0, y1) {
    const { b } = h;
    const tile = `tile:${hexOf(h.style.pillar)}`;
    b.deco(tile, x - 0.28, y0, z - 0.28, x + 0.28, y1, z + 0.28);
    b.deco(`tile:${shade(hexOf(h.style.pillar), -0.35)}`, x - 0.29, y0, z - 0.29, x + 0.29, y0 + 0.15, z + 0.29);
    b.deco(`paint:${h.line.color}`, x - 0.285, y0 + 1.95, z - 0.285, x + 0.285, y0 + 2.1, z + 0.285);
    b.deco('concrete', x - 0.36, y1 - 0.25, z - 0.36, x + 0.36, y1, z + 0.36);
  },

  trackColumn(h, x, y0, y1) {
    const { b, pf } = h;
    const seg = h.o.ceil.find((s) => x >= s.x0 && x <= s.x1) ?? h.o.ceil[0];
    const yc = seg ? under(h, seg, seg.emit ? seg.y : seg.y - 0.05, 0) : y1;
    const top = yc - BEAM_D; // the capital meets the cross beam
    // Dark plinth below platform level, then tile, a line band and a plain capital block.
    b.deco('concreteDark', x - 0.28, y0, -0.28, x + 0.28, pf, 0.28);
    b.deco(`tile:${hexOf(h.style.pillar)}`, x - 0.25, pf, -0.25, x + 0.25, top - 0.28, 0.25);
    b.deco(`paint:${h.line.color}`, x - 0.255, pf + 2.0, -0.255, x + 0.255, pf + 2.15, 0.255);
    b.deco('concrete', x - 0.32, top - 0.28, -0.3, x + 0.32, top, 0.3);
    // No beam over a stair bay: carry the column on up to the slab.
    if (h.blocked(x - BEAM_W / 2, x + BEAM_W / 2)) b.deco('concrete', x - 0.225, top, -0.225, x + 0.225, yc, 0.225);
  },

  wallTrim(h, s) {
    const { b, pf, wallZ, H } = h;
    const z = (d: number) => s * (wallZ - d); // d metres out from the wall face
    const wall = hexOf(h.style.wall);
    const blue = `tile:${h.line.color}`;
    // Darker dado of small tiles, with a cap course; island walls carry on down to the track bed.
    const y0 = h.island ? pf - 0.2 : pf;
    for (const [x0, x1] of h.wallRuns(s)) {
      b.deco(`tile:${shade(wall, -0.28)}`, x0, y0, z(-0.01), x1, pf + 0.94, z(0.015));
      b.deco(`tile:${shade(wall, -0.45)}`, x0, pf + 0.94, z(-0.01), x1, pf + 1.0, z(0.025));
    }
    // Shoreline: a pale foam line, a blue base and stepped wave crests leaning along +x.
    b.deco(`tile:${shade(h.line.color, 0.72)}`, -H, pf + 2.5, z(-0.01), H, pf + 2.57, z(0.02));
    b.deco(blue, -H, pf + 2.57, z(-0.01), H, pf + 2.63, z(0.03));
    for (let xc = -H + 0.8; xc + 0.6 <= H; xc += 2) {
      b.deco(blue, xc - 0.8, pf + 2.63, z(-0.01), xc + 0.6, pf + 2.71, z(0.03));
      b.deco(blue, xc - 0.35, pf + 2.71, z(-0.01), xc + 0.55, pf + 2.79, z(0.03));
      b.deco(blue, xc + 0.05, pf + 2.79, z(-0.01), xc + 0.5, pf + 2.87, z(0.03));
    }
  },

  bench(h, x, y, z, s) {
    const { b } = h;
    if (s === 0) {
      // Island: two rows back to back on one frame.
      b.deco(STEEL, x - 0.88, y + 0.3, z - 0.32, x + 0.88, y + 0.38, z + 0.32);
      for (const lx of [-0.6, 0.6]) b.deco(STEEL, x + lx - 0.04, y, z - 0.04, x + lx + 0.04, y + 0.3, z + 0.04);
      seats(h, x, y, z - 0.03, -1, 0);
      seats(h, x, y, z + 0.03, 1, 1);
      return;
    }
    // Against the wall: backs to the wall, facing the tracks.
    const zr = z - s * 0.03;
    b.deco(STEEL, x - 0.88, y + 0.3, zr - 0.06, x + 0.88, y + 0.38, zr + 0.06);
    for (const lx of [-0.6, 0.6]) b.deco(STEEL, x + lx - 0.03, y, zr - 0.03, x + lx + 0.03, y + 0.3, zr + 0.03);
    seats(h, x, y, z + s * 0.22, -s, s > 0 ? 0 : 1);
  },

  elevated(h) {
    const { b, pf, pe, wallZ, P } = h;
    const steel = 'paint:#4f5a63';
    for (const s of [-1, 1]) {
      // Stepped steel knee brackets off the wall mullions, under the canopy.
      const zw = s * (wallZ - 0.05);
      for (let x = -P; x <= P + 1e-6; x += 5.8) {
        if (SIGN_XS.some((q) => Math.abs(q - x) < 0.8)) continue;
        b.deco(steel, x - 0.04, pf + 3.18, zw, x + 0.04, pf + 3.3, zw - s * 1.4);
        b.deco(steel, x - 0.04, pf + 3.04, zw, x + 0.04, pf + 3.18, zw - s * 0.9);
        b.deco(steel, x - 0.04, pf + 2.9, zw, x + 0.04, pf + 3.04, zw - s * 0.45);
      }
      // Toothed cream valance just inside the blue fascia; each tooth has a blue rim.
      const zf = s * (pe - 0.7 + 0.045);
      const zo = (d: number) => zf + s * d;
      b.deco(`paint:${CREAM}`, -P - 1, pf + 3.14, zo(0), P + 1, pf + 3.3, zo(0.04));
      for (let xc = -P - 0.4; xc <= P + 0.4 + 1e-6; xc += 1.2) {
        b.deco(`paint:${h.line.color}`, xc - 0.22, pf + 2.95, zo(0.008), xc + 0.22, pf + 3.14, zo(0.032));
        b.deco(`paint:${CREAM}`, xc - 0.18, pf + 2.99, zo(0), xc + 0.18, pf + 3.14, zo(0.04));
      }
    }
  },
};
