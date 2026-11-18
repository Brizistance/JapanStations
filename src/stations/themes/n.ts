// Nagisa Line theme. See Plans/features/line-themes/plan.md.
//
// 1961, high-growth era, built fast and plain: a flat slab on concrete downstand beams, square
// tiled columns between the tracks, bare fluorescent battens, small two-tone wall tiles with a
// stepped "shoreline" band, and moulded shell seats. Elevated stations get a toothed valance.
//
// Under the concourse the platform is low and busy, the way an early subway is: a hung ceiling
// at 3.45 m, shallow beams, and the services left on show (pipes and a cable tray along the
// walls, a ventilation duct over the tracks, conduit drops, loudspeaker horns).

import type { CeilSeg } from '../kit';
import { hexOf, shade, type HallInfo, type LineTheme } from './types';

const BEAM_D = 0.3; // transverse beam depth where there is room
const BEAM_W = 0.45;
const LONG_D = 0.18; // longitudinal beam along the column row
const DUCT_D = 0.28; // ventilation duct over the tracks (side halls)
/** Height above the platform that hanging signs reach up to: everything hung over them stays above it. */
const SIGN_TOP = 3.15;
/** A ceiling lower than this above the platform counts as a low one (and gets the duct and horns). */
const LOW = 3.8;
const CREAM = '#ece4cf';
const STEEL = 'metal:#9aa0a6';
const HANGER = 'metal:#6f757b';
const BATTEN = 'paint:#e6e5e0';
const PIPE = 'paint:#8c9088';
const FIRE_PIPE = 'paint:#a8433a';
const DUCT = 'paint:#9a9d94';
const GRILLE = 'flat:#3d4146';
/** x of the hanging signs: keep the elevated brackets and the horns clear of them. */
const SIGN_XS = [-49, -38, -27, 0, 27, 38, 49];

/** Rise of the kit's faceted vault at z (it is drawn as 9 flat strips). */
function rise(h: HallInfo, z: number): number {
  const w = (2 * h.wallZ) / 9;
  const k = Math.min(8, Math.max(0, Math.floor((z + h.wallZ) / w)));
  const zc = -h.wallZ + (k + 0.5) * w;
  return 1.6 * Math.sqrt(Math.max(0, 1 - (zc / h.wallZ) ** 2));
}
const under = (h: HallInfo, seg: CeilSeg, y: number, z: number) => y + (seg.vault ? rise(h, z) : 0);

const isLow = (h: HallInfo, y: number) => y - h.pf < LOW;
/**
 * Depth of the cross beams for a ceiling at `y`: full depth where there is room, shallow under a
 * low ceiling so that the battens and services slung below them still clear the hanging signs.
 */
const beamD = (h: HallInfo, y: number) => Math.min(BEAM_D, Math.max(0.12, y - h.pf - SIGN_TOP - 0.15));

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

/** Stretches of a low segment that carry the ventilation duct (none over a stair). */
function ductRuns(h: HallInfo, seg: CeilSeg) {
  // Cells of about 1 m that fit the segment exactly, so the duct reaches its ends.
  const x0 = seg.x0 + 0.3, x1 = seg.x1 - 0.3;
  const len = (x1 - x0) / Math.max(1, Math.round(x1 - x0));
  return runs(x0, x1, len, 0, (a, c) => !h.blocked(a, c)).merged;
}
/** Underside of the duct: it passes just under the cross beams, and the track columns carry it. */
const ductBottom = (h: HallInfo, seg: CeilSeg, y: number) => under(h, seg, y, 0) - beamD(h, y) - 0.01 - (h.island ? 0.12 : DUCT_D);

/** A flat ventilation duct along the hall: over the column row (side halls) or the island's centre. */
function duct(h: HallInfo, seg: CeilSeg, y: number) {
  const { b, H } = h;
  const hw = h.island ? 0.3 : 0.75;
  const yc = under(h, seg, y, 0);
  const bot = ductBottom(h, seg, y), top = yc - beamD(h, y) - 0.01;
  for (const [x0, x1] of ductRuns(h, seg)) {
    b.deco(DUCT, x0, bot, -hw, x1, top, hw);
    // A strap up to the ceiling mid-bay, and louvred grilles facing the platforms every other bay.
    for (let x = -H + 6; x < H; x += 6) {
      if (x - 0.6 < x0 || x + 0.6 > x1) continue;
      b.deco(HANGER, x - 0.03, top, -hw + 0.06, x + 0.03, yc, hw - 0.06);
      if (Math.round((x + H) / 6) % 2) continue;
      for (const s of [-1, 1]) {
        const za = s * hw, zb = s * (hw + 0.015);
        b.deco(GRILLE, x - 0.5, bot + 0.05, Math.min(za, zb), x + 0.5, top - 0.05, Math.max(za, zb));
      }
    }
  }
}

/**
 * Exposed services along each side wall, slung just under the beams: two pipes on brackets, and
 * under a low ceiling a cable tray as well. Above the hanging signs everywhere.
 */
function services(h: HallInfo, seg: CeilSeg, y: number) {
  const { b, wallZ, H } = h;
  const low = isLow(h, y);
  const { merged } = runs(seg.x0, seg.x1, 0.5, 0, (a, c) => !h.blocked(a, c));
  const clear = (x: number) => merged.some(([a, c]) => x - 0.1 >= a && x + 0.1 <= c);
  for (const s of [-1, 1]) {
    // d metres out from the wall face.
    const box = (mat: string, x0: number, y0: number, d0: number, x1: number, y1: number, d1: number) => {
      const za = s * (wallZ - d0), zb = s * (wallZ - d1);
      b.deco(mat, x0, y0, Math.min(za, zb), x1, y1, Math.max(za, zb));
    };
    // Under the wall-side beam ends (the vault's lowest facet, if any).
    const top = under(h, seg, y, s * (wallZ - 0.02)) - beamD(h, y) - 0.02;
    for (const [x0, x1] of merged) {
      box(PIPE, x0, top - 0.1, 0.36, x1, top, 0.46);
      box(FIRE_PIPE, x0, top - 0.085, 0.5, x1, top - 0.015, 0.57);
      if (!low) continue;
      box(STEEL, x0, top - 0.08, 0.06, x1, top - 0.06, 0.31);
      box(STEEL, x0, top - 0.06, 0.06, x1, top, 0.075);
      box(STEEL, x0, top - 0.06, 0.295, x1, top, 0.31);
    }
    // Brackets off the wall, each with a rod up to the ceiling: every 3 m when low, else every 6 m.
    for (let x = -H + 4.5; x < H; x += low ? 3 : 6) {
      if (!clear(x)) continue;
      box(HANGER, x - 0.02, top - 0.125, 0.04, x + 0.02, top - 0.1, 0.62);
      box(HANGER, x - 0.0125, top - 0.1, 0.6, x + 0.0125, under(h, seg, y, s * (wallZ - 0.61)), 0.625);
    }
    // Old loudspeaker horns between the signs, under a low ceiling.
    if (!low) continue;
    const zh = s * (wallZ - 1.0);
    for (const x of [-44, -32, -20, -8, 8, 20, 32, 44]) {
      if (x < seg.x0 + 1 || x > seg.x1 - 1 || !clear(x) || SIGN_XS.some((q) => Math.abs(q - x) < 2.5)) continue;
      const yt = under(h, seg, y, zh);
      b.deco(HANGER, x - 0.015, h.pf + 3.18, zh - 0.015, x + 0.015, yt, zh + 0.015);
      b.mesh(`paint:${CREAM}`, 'cone', x, h.pf + 3.07, zh, 0.26, 0.24, 0.26);
    }
  }
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
  // Bare fluorescent battens: a slight green cast, flat.
  grade: { warmth: -0.15, tint: -0.45, sat: 0.92, contrast: 0.06, fade: 0.015 },
  lowCeil: 3.45,

  ceiling(h, seg, y) {
    const { b, wallZ } = h;
    const bd = beamD(h, y);
    const low = isLow(h, y);
    // Downstand beams across the hall, one per column bay.
    for (const x of beamXs(h, seg.x0, seg.x1)) {
      if (h.blocked(x - BEAM_W / 2, x + BEAM_W / 2)) continue;
      if (!seg.vault) {
        b.deco('concrete', x - BEAM_W / 2, y - bd, -wallZ - 0.05, x + BEAM_W / 2, y, wallZ + 0.05);
        continue;
      }
      // Under a vault the beam follows the facets as a stepped rib.
      const w = (2 * wallZ) / 9;
      for (let k = 0; k < 9; k++) {
        const zc = -wallZ + (k + 0.5) * w, yt = y + rise(h, zc);
        b.deco('concrete', x - BEAM_W / 2, yt - bd, zc - w / 2, x + BEAM_W / 2, yt, zc + w / 2);
      }
    }
    // Shallower beam along the column row (island halls: over the two pillar rows). Under a low
    // ceiling in a side hall the duct runs there instead.
    for (const z of h.island ? [-2.05, 2.05] : low ? [] : [0]) {
      const yt = under(h, seg, y, z);
      for (const [x0, x1] of runs(seg.x0, seg.x1, 1, 0, (a, c) => !h.blocked(a, c)).merged) {
        b.deco('concrete', x0, yt - Math.min(LONG_D, bd), z - 0.2, x1, yt, z + 0.2);
      }
    }
    services(h, seg, y);
    if (low) duct(h, seg, y);
  },

  lights(h, seg, y) {
    const { b, pe } = h;
    // Two rows per platform, slung tight under the beams so they read as unbroken lines.
    const rows = h.island ? [-0.75 * pe, -0.25 * pe, 0.25 * pe, 0.75 * pe] : [pe + 1.2, pe + 3.4].flatMap((z) => [-z, z]);
    const { cells, merged } = runs(seg.x0 + 0.2, seg.x1 - 0.2, 2.4, 0.1, (a, c) => !h.blocked(a, c));
    const bd = beamD(h, y);
    for (const z of rows) {
      const yb = under(h, seg, y, z) - bd;
      for (const [x0, x1] of merged) b.deco(BATTEN, x0 - 0.05, yb - 0.05, z - 0.06, x1 + 0.05, yb, z + 0.06);
      for (const [x0, x1] of cells) b.deco('light', x0 + 0.03, yb - 0.095, z - 0.025, x1 - 0.03, yb - 0.05, z + 0.025);
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
    // y1 is ceilAt(x): the slab underside where open, the top of the hung ceiling under a concourse.
    const ys = !seg || seg.emit ? y1 : y1 - 0.05;
    const yc = seg ? under(h, seg, ys, 0) : y1;
    // Under a low ceiling the columns carry the duct; elsewhere the capital meets the cross beam.
    const onDuct = !!seg && isLow(h, ys) && ductRuns(h, seg).some(([a, c]) => a <= x - 0.32 && c >= x + 0.32);
    const top = seg && onDuct ? ductBottom(h, seg, ys) : yc - beamD(h, ys);
    // Dark plinth below platform level, then tile, a line band and a plain capital block.
    b.deco('concreteDark', x - 0.28, y0, -0.28, x + 0.28, pf, 0.28);
    b.deco(`tile:${hexOf(h.style.pillar)}`, x - 0.25, pf, -0.25, x + 0.25, top - 0.28, 0.25);
    b.deco(`paint:${h.line.color}`, x - 0.255, pf + 2.0, -0.255, x + 0.255, pf + 2.15, 0.255);
    b.deco('concrete', x - 0.32, top - 0.28, -0.3, x + 0.32, top, 0.3);
    // No beam over a stair bay: carry the column on up to the slab (the hung ceiling is cut there).
    if (!onDuct && h.blocked(x - BEAM_W / 2, x + BEAM_W / 2)) {
      b.deco('concrete', x - 0.225, top, -0.225, x + 0.225, seg && !seg.emit ? seg.y : yc, 0.225);
    }
  },

  wallTrim(h, s) {
    const { b, pf, wallZ, H, P } = h;
    const z = (d: number) => s * (wallZ - d); // d metres out from the wall face
    const wall = hexOf(h.style.wall);
    const blue = `tile:${h.line.color}`;
    const runsS = h.wallRuns(s);
    // Darker dado of small tiles, with a cap course; island walls carry on down to the track bed.
    const y0 = h.island ? pf - 0.2 : pf;
    for (const [x0, x1] of runsS) {
      b.deco(`tile:${shade(wall, -0.28)}`, x0, y0, z(-0.01), x1, pf + 0.94, z(0.015));
      b.deco(`tile:${shade(wall, -0.45)}`, x0, pf + 0.94, z(-0.01), x1, pf + 1.0, z(0.025));
    }
    // Shoreline: a pale foam line, a blue base and stepped wave crests leaning along +x.
    b.deco(`tile:${shade(h.line.color, 0.72)}`, -H, pf + 2.5, z(-0.01), H, pf + 2.57, z(0.02));
    b.deco(blue, -H, pf + 2.57, z(-0.01), H, pf + 2.63, z(0.03));
    for (let xc = -H + 0.8; xc + 0.6 <= H; xc += 2.5) {
      b.deco(blue, xc - 0.8, pf + 2.63, z(-0.01), xc + 0.6, pf + 2.73, z(0.03));
      b.deco(blue, xc - 0.2, pf + 2.73, z(-0.01), xc + 0.5, pf + 2.83, z(0.03));
    }
    // Conduit drops between the signs and benches: a junction box above the shoreline, a conduit
    // up to the ceiling, and a flat run down the wall to a low box.
    for (const x of [-42, -30, -18, -6, 6, 18, 30, 42]) {
      if (Math.abs(x) > P - 1 || !runsS.some(([a, c]) => x - 0.4 >= a && x + 0.4 <= c)) continue;
      const seg = h.o.ceil.find((q) => x >= q.x0 && x <= q.x1) ?? h.o.ceil[0];
      if (!seg) continue;
      const yt = under(h, seg, seg.emit ? h.ceilAt(x) : h.ceilAt(x) - 0.05, z(0.02));
      b.deco(PIPE, x - 0.025, pf + 2.35, Math.min(z(0), z(0.05)), x + 0.025, yt, Math.max(z(0), z(0.05)));
      b.deco(PIPE, x - 0.09, pf + 2.92, Math.min(z(0), z(0.075)), x + 0.09, pf + 3.12, Math.max(z(0), z(0.075)));
      b.deco(PIPE, x - 0.02, pf + 0.85, Math.min(z(0), z(0.012)), x + 0.02, pf + 2.35, Math.max(z(0), z(0.012)));
      b.deco(PIPE, x - 0.08, pf + 0.55, Math.min(z(0), z(0.045)), x + 0.08, pf + 0.85, Math.max(z(0), z(0.045)));
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
