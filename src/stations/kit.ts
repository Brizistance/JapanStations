// Reusable station parts. Each function adds boxes/ramps/signs to a Builder in
// "hall-local" coords: +x along the track towards the last stop, origin at the
// station centre at street level (y = 0).

import type { LineDef, StationDef } from '../data/types';
import { CAR_PITCH, HALL_HALF, PLATFORM_HALF } from '../sim/geometry';
import type { Builder } from '../world/builder';
import { lookFor } from './looks';
import type { ExitInfo } from './looks/types';
import { themeFor } from './themes';
import type { HallInfo } from './themes/types';

export const PF_H = 1.1; // platform height above rail
export const CONC_RISE = 4.9; // platform floor → concourse floor
export const SLAB = 0.8;
export const CONC_CLEAR = 3.0;
export const STAIR_RUN = 8.4; // horizontal run of a platform ↔ concourse stair
export const GROUND_Y = 0.15; // sidewalk level
export const DOOR_OFFSETS = [-5.8, 0, 5.8];
export const BED = 0.2; // track bed top is this far below rail level

export interface StationStyle {
  /** Wall finish at platform level. */
  wall: string;
  /** Wall finish in the concourse and exits. */
  concWall: string;
  floor: string;
  pillar: string;
  /** Accent colour (hex) used for trims besides the line colour. */
  accent: string;
  mural: { v: string; color: string };
  /** High vaulted ceiling over the open part of the platform hall. */
  vault?: boolean;
}

export interface Ctx {
  b: Builder;
  line: LineDef;
  station: StationDef;
  stop: number;
  railY: number;
  style: StationStyle;
}

export const doorXs = (cars: number): number[] => {
  const out: number[] = [];
  for (let c = 0; c < cars; c++) for (const d of DOOR_OFFSETS) out.push((c - (cars - 1) / 2) * CAR_PITCH + d);
  return out;
};

export interface HallDims {
  pf: number;
  /** |z| of the platform edge. */
  pe: number;
  /** |z| of the hall's inner wall face. */
  wallZ: number;
  island: boolean;
}
export function hallDims(line: LineDef, railY: number): HallDims {
  const island = line.platformType === 'island';
  const L = line.trackOffset;
  const pe = island ? L - 1.48 : L + 1.48;
  return { pf: railY + PF_H, pe, wallZ: island ? L + 2.2 : pe + 5.2, island };
}

export interface CeilSeg {
  x0: number;
  x1: number;
  /** Underside height. */
  y: number;
  /** False where another slab (the concourse floor) already forms the ceiling. */
  emit: boolean;
  vault?: boolean;
}

export interface HallOpts {
  ceil: CeilSeg[];
  /** x-ranges on the platform taken up by stairs: no furniture or pillars there. */
  blocks: [number, number][];
  /** Open-air viaduct station: deck, back walls and canopies instead of a tunnel box. */
  elevated?: boolean;
  /** Holes in the platform slab (stairs arriving from below), [x0, z0, x1, z1]. */
  platHoles?: number[][];
  /** Holes in the ceiling (stair shafts rising out of the hall). */
  ceilHoles?: number[][];
  /** Doorways through a side wall at platform level (s = which wall, ±z). */
  gaps?: { s: 1 | -1; x0: number; x1: number }[];
}

const inBlocks = (x: number, blocks: [number, number][], m = 1.2) => blocks.some(([a, c]) => x > a - m && x < c + m);

/** Height of the full-height screens used on newer lines. */
export const PSD_FULL_H = 2.5;

/** Platform screen doors along one platform edge: waist-high gates, or full-height glass screens. */
function psd(c: Ctx, zEdge: number, inward: 1 | -1, track: 'down' | 'up', pf: number) {
  const { b, line } = c;
  const z = zEdge + inward * 0.14;
  const xs = doorXs(line.service.cars);
  const half = 0.95;
  const full = line.platformDoors === 'full';
  let from = -PLATFORM_HALF;
  const panel = (xa: number, xb: number) => {
    if (full) {
      // Floor-to-header glass screen with a line-colour fascia.
      b.block(xa, pf, z - 0.09, xb, pf + PSD_FULL_H, z + 0.09);
      b.deco('paint:#e9eaec', xa, pf, z - 0.07, xb, pf + 0.3, z + 0.07);
      b.deco('glass', xa + 0.12, pf + 0.3, z - 0.02, xb - 0.12, pf + 2.12, z + 0.02);
      b.deco('paint:#e9eaec', xa, pf + 2.12, z - 0.1, xb, pf + PSD_FULL_H - 0.14, z + 0.1);
      b.deco(`paint:${line.color}`, xa, pf + PSD_FULL_H - 0.14, z - 0.11, xb, pf + PSD_FULL_H, z + 0.11);
      for (const x of [xa, xb - 0.12]) b.deco('metal:#c3c7cb', x, pf, z - 0.1, x + 0.12, pf + 2.12, z + 0.1);
      return;
    }
    b.block(xa, pf, z - 0.09, xb, pf + 1.3, z + 0.09);
    b.deco('flat:#3a3d41', xa + 0.2, pf, z - 0.065, xb - 0.2, pf + 0.07, z + 0.065);
    b.deco('paint:#f3f2ec', xa + 0.2, pf + 0.07, z - 0.06, xb - 0.2, pf + 0.72, z + 0.06);
    b.deco('glass', xa + 0.2, pf + 0.72, z - 0.02, xb - 0.2, pf + 1.16, z + 0.02);
    b.deco('metal:#c3c7cb', xa + 0.2, pf + 0.72, z - 0.035, xb - 0.2, pf + 0.76, z + 0.035);
    // Glazing bars every ~1.2 m.
    const bars = Math.max(1, Math.round((xb - xa - 0.4) / 1.2));
    for (let k = 1; k < bars; k++) {
      const xm = xa + 0.2 + ((xb - xa - 0.4) * k) / bars;
      b.deco('metal:#c3c7cb', xm - 0.02, pf + 0.72, z - 0.035, xm + 0.02, pf + 1.16, z + 0.035);
    }
    b.deco(`paint:${line.color}`, xa + 0.2, pf + 1.16, z - 0.07, xb - 0.2, pf + 1.3, z + 0.07);
    // Gate housings at each end, with a door-status lamp on top.
    for (const [ha, hb] of [[xa, xa + 0.2], [xb - 0.2, xb]]) {
      b.deco('paint:#e9e8e2', ha, pf + 0.07, z - 0.1, hb, pf + 1.36, z + 0.1);
      b.deco('flat:#3a3d41', ha, pf, z - 0.105, hb, pf + 0.07, z + 0.105);
      b.deco('flat:#2c2f33', ha, pf + 1.36, z - 0.1, hb, pf + 1.39, z + 0.1);
      b.deco('glow:#ffb020', (ha + hb) / 2 - 0.035, pf + 1.39, z - 0.035, (ha + hb) / 2 + 0.035, pf + 1.43, z + 0.035);
    }
  };
  for (const xd of xs) {
    panel(from, xd - half);
    if (full) {
      // Header over the doorway carries the fascia across the opening.
      b.deco('paint:#e9eaec', xd - half, pf + 2.12, z - 0.1, xd + half, pf + PSD_FULL_H - 0.14, z + 0.1);
      b.deco(`paint:${line.color}`, xd - half, pf + PSD_FULL_H - 0.14, z - 0.11, xd + half, pf + PSD_FULL_H, z + 0.11);
      b.block(xd - half, pf + 2.12, z - 0.09, xd + half, pf + PSD_FULL_H, z + 0.09);
    }
    b.gate({
      x: xd, y: pf, z, along: [1, 0], width: half * 2, height: full ? 2.1 : 1.22, thick: 0.07,
      mat: 'paint:#f3f2ec', window: full, line: line.id, stop: c.stop, track,
    });
    from = xd + half;
  }
  panel(from, PLATFORM_HALF);
  // Tactile warning strip behind the gates.
  const t0 = zEdge + inward * 0.5, t1 = zEdge + inward * 0.8;
  b.deco('tactile', -PLATFORM_HALF, pf, Math.min(t0, t1), PLATFORM_HALF, pf + 0.008, Math.max(t0, t1));
  // Platform edge: dark non-slip coping under the doors, and a white line behind the tactile strip.
  const e0 = zEdge, e1 = zEdge + inward * 0.3;
  b.deco('flat:#4a4c4f', -PLATFORM_HALF, pf, Math.min(e0, e1), PLATFORM_HALF, pf + 0.004, Math.max(e0, e1));
  const w0 = zEdge + inward * 0.86, w1 = zEdge + inward * 0.94;
  b.deco('paint:#f1f0ea', -PLATFORM_HALF, pf, Math.min(w0, w1), PLATFORM_HALF, pf + 0.004, Math.max(w0, w1));
}

/** Round clad column with a steel base ring and a colour band. The collider stays a square post. */
export function pillar(b: Builder, x: number, z: number, y0: number, y1: number, half: number, mat: string, band: string, bandY: number) {
  b.block(x - half, y0, z - half, x + half, y1, z + half);
  pillarLook(b, x, z, y0, y1, half, mat, band, bandY);
}
function pillarLook(b: Builder, x: number, z: number, y0: number, y1: number, half: number, mat: string, band: string, bandY: number) {
  const d = half * 2.2;
  b.mesh(mat, 'cyl', x, (y0 + y1) / 2, z, d, y1 - y0, d);
  b.mesh('metal:#9da2a8', 'cyl', x, y0 + 0.06, z, d + 0.07, 0.12, d + 0.07);
  b.mesh('metal:#9da2a8', 'cyl', x, y1 - 0.04, z, d + 0.07, 0.08, d + 0.07);
  b.mesh(`paint:${band}`, 'cyl', x, bandY, z, d + 0.025, 0.15, d + 0.025);
}

/** Ceiling light: a white housing with the glowing diffuser on its underside. `y` is the ceiling. */
export function ceilingLight(b: Builder, x0: number, x1: number, z0: number, z1: number, y: number) {
  b.deco('paint:#e6e5e0', x0 - 0.05, y - 0.045, z0 - 0.05, x1 + 0.05, y, z1 + 0.05);
  b.deco('light', x0, y - 0.07, z0, x1, y - 0.045, z1);
}

function bench(b: Builder, x: number, y: number, z: number, color: string) {
  // Back-to-back seats on a steel beam, the usual island-platform bench.
  b.deco('metal:#7f858b', x - 0.9, y + 0.3, z - 0.04, x + 0.9, y + 0.38, z + 0.04);
  for (const lx of [-0.75, 0.75]) {
    b.deco('metal:#7f858b', x + lx - 0.03, y, z - 0.03, x + lx + 0.03, y + 0.3, z + 0.03);
    b.deco('metal:#7f858b', x + lx - 0.04, y, z - 0.4, x + lx + 0.04, y + 0.03, z + 0.4);
  }
  for (const s of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const cx = x + i * 0.6;
      b.deco(`paint:${color}`, cx - 0.26, y + 0.38, z + s * 0.07, cx + 0.26, y + 0.44, z + s * 0.5);
      b.deco(`paint:${color}`, cx - 0.26, y + 0.44, z + s * 0.03, cx + 0.26, y + 0.84, z + s * 0.08);
    }
    b.deco('metal:#7f858b', x - 0.86, y + 0.36, z + s * 0.2, x + 0.86, y + 0.385, z + s * 0.36);
  }
}

export function vending(b: Builder, x: number, y: number, z: number, face: [number, number], v: 'vending' | 'vending2' = 'vending') {
  // Box 1.0 wide, 0.7 deep, 1.83 tall, front towards `face`.
  const [fx, fz] = face;
  const hw = fx !== 0 ? 0.35 : 0.5, hd = fx !== 0 ? 0.5 : 0.35;
  b.box(v === 'vending' ? 'paint:#c62828' : 'paint:#1565c0', x - hw, y, z - hd, x + hw, y + 1.83, z + hd);
  b.sign({ k: 'machine', v }, x + fx * 0.36, y + 0.915, z + fz * 0.36, face, 0.98, 1.8);
}

/** Platform level: track bed, platforms, screen doors, walls, ceiling, signage and furniture. */
export function hall(c: Ctx, o: HallOpts): HallDims {
  const { b, line, station, style, railY } = c;
  const d = hallDims(line, railY);
  const { pf, pe, wallZ, island } = d;
  const L = line.trackOffset;
  const H = HALL_HALF, P = PLATFORM_HALF;
  const bedY = railY - BED;
  const th = themeFor(line.id);
  // Visible ceiling underside of a segment. Under a concourse it is a hung ceiling, which an
  // old line's theme can drop well below the slab.
  const vis = (s: CeilSeg) => (s.emit || o.elevated ? s.y : Math.min(s.y - 0.05, th.lowCeil ? pf + th.lowCeil : Infinity));
  const dropped = (s: CeilSeg) => !s.emit && !o.elevated && vis(s) < s.y - 0.06;
  const ceilAt = (x: number) => {
    const s = o.ceil.find((q) => x >= q.x0 && x <= q.x1) ?? o.ceil[0];
    return s.emit || o.elevated ? s.y : vis(s) + 0.05;
  };
  const maxCeil = o.elevated ? pf + 3.6 : Math.max(...o.ceil.map((s) => s.y + (s.vault ? 1.6 : 0)));
  const holes = o.platHoles ?? [];
  const nums = station.platforms[line.id];
  const info: HallInfo = {
    b, line, station, style, o, pf, pe, wallZ, island, P, H, ceilAt,
    blocked: (x0, x1, m = 0.4) =>
      o.blocks.some(([a, c]) => x1 > a - m && x0 < c + m) || (o.ceilHoles ?? []).some((q) => x1 > q[0] - m && x0 < q[2] + m),
    wallRuns: (s) => {
      const runs: [number, number][] = [];
      let x = -H;
      for (const g of (o.gaps ?? []).filter((q) => q.s === s).sort((p, q) => p.x0 - q.x0)) {
        if (g.x0 > x) runs.push([x, g.x0]);
        x = Math.max(x, g.x1);
      }
      if (x < H) runs.push([x, H]);
      return runs;
    },
  };

  // ── Structure ──
  const gaps = o.gaps ?? [];
  const inGap = (s: number, x: number, m = 1.6) => gaps.some((g) => g.s === s && x > g.x0 - m && x < g.x1 + m);
  if (o.elevated) {
    b.slab('concrete', -H, -wallZ - 0.6, H, wallZ + 0.6, railY - 1.3, bedY, holes);
  } else {
    b.box('concrete', -H, railY - 1.0, -wallZ - 0.5, H, bedY, wallZ + 0.5);
  }
  const platform = (z0: number, z1: number) => {
    b.slab('concrete', -P, z0, P, z1, bedY, pf - 0.06, holes);
    b.slab(style.floor, -P, z0, P, z1, pf - 0.06, pf, holes);
  };
  if (island) platform(-pe, pe);
  else {
    platform(pe, wallZ);
    platform(-wallZ, -pe);
  }

  // Screen doors: negative-z edge serves the down track.
  psd(c, island ? -pe : -pe, island ? 1 : -1, 'down', pf);
  psd(c, island ? pe : pe, island ? -1 : 1, 'up', pf);

  // Platform end barriers.
  for (const s of [-1, 1]) {
    const xa = s * P, xb = s * (P - 0.15);
    const seg = (z0: number, z1: number) => {
      b.box('panel:#d5d8db', Math.min(xa, xb), pf, z0, Math.max(xa, xb), pf + 2.4, z1);
      b.sign({ k: 'machine', v: 'door' }, s * (P - 0.17), pf + 1.05, (z0 + z1) / 2, [-s, 0], 1.0, 2.1);
    };
    if (island) seg(-pe, pe);
    else {
      seg(pe, wallZ);
      seg(-wallZ, -pe);
    }
  }

  if (!o.elevated) {
    // Side walls, with a darker band below platform level and a line-colour stripe.
    for (const s of [-1, 1] as const) {
      const z0 = s * wallZ, z1 = s * (wallZ + 0.5);
      const lo = Math.min(z0, z1), hi = Math.max(z0, z1);
      const g = gaps.filter((q) => q.s === s).map((q) => [q.x0, q.x1]);
      for (const seg of o.ceil) {
        const top = seg.y + (seg.vault ? 1.6 : 0) + (seg.emit ? SLAB : 0);
        b.wallX(style.wall, seg.x0, seg.x1, lo, hi, pf - 0.2, top, g);
        for (const [ga, gb] of g) if (ga >= seg.x0 && gb <= seg.x1) b.box(style.wall, ga, pf + 2.5, lo, gb, top, hi);
      }
      b.box('concreteDark', -H, railY - 1, lo, H, pf - 0.2, hi);
      const zi = s * (wallZ - 0.02);
      if (th.wallTrim) th.wallTrim(info, s);
      else {
        b.deco(`paint:${line.color}`, -H, pf + 2.62, Math.min(z0, zi), H, pf + 2.8, Math.max(z0, zi));
        b.deco(`paint:${style.accent}`, -H, pf + 2.56, Math.min(z0, zi), H, pf + 2.62, Math.max(z0, zi));
      }
      // Skirting where the wall meets a platform (side platforms only).
      if (!island) {
        const zk = s * (wallZ - 0.025);
        b.deco('flat:#4b4d50', -P, pf, Math.min(z0, zk), P, pf + 0.13, Math.max(z0, zk));
      }
    }
    // End walls with tunnel mouths.
    const mouthTop = railY + 4.65;
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? H : -H - 0.5, x1 = x0 + 0.5;
      const yb = railY - 1, yt = maxCeil + SLAB;
      if (island) {
        b.box('concreteDark', x0, yb, -(L - 2.2), x1, yt, L - 2.2);
        b.box('concreteDark', x0, mouthTop, -wallZ, x1, yt, -(L - 2.2));
        b.box('concreteDark', x0, mouthTop, L - 2.2, x1, yt, wallZ);
      } else {
        b.box('concreteDark', x0, yb, 4.1, x1, yt, wallZ);
        b.box('concreteDark', x0, yb, -wallZ, x1, yt, -4.1);
        b.box('concreteDark', x0, mouthTop, -4.1, x1, yt, 4.1);
      }
    }
    // Ceilings.
    o.ceil.forEach((s, i) => {
      if (s.emit) {
        if (s.vault) {
          // Faceted barrel vault: strips rising towards the centreline.
          const n = 9, w = (2 * wallZ) / n;
          for (let k = 0; k < n; k++) {
            const zc = -wallZ + (k + 0.5) * w;
            const rise = 1.6 * Math.sqrt(Math.max(0, 1 - (zc / wallZ) ** 2));
            b.box(th.vaultMat ?? 'flat:#f3f1ea', s.x0, s.y + rise, zc - w / 2, s.x1, s.y + rise + SLAB, zc + w / 2);
          }
          // Vault ribs.
          if (!th.ceiling) for (let x = s.x0 + 3; x < s.x1; x += 6) b.deco(`flat:${style.accent}`, x - 0.15, s.y - 0.05, -wallZ, x + 0.15, s.y + 0.12, wallZ);
        } else b.slab(th.ceilMat ?? 'ceil', s.x0, -wallZ - 0.5, s.x1, wallZ + 0.5, s.y, s.y + SLAB, o.ceilHoles ?? []);
      } else if (!o.elevated) {
        // Under the concourse: hang ceiling panels below its slab, except where stairs come through.
        const cuts = o.blocks.filter(([a, c]) => c > s.x0 && a < s.x1).map(([a, c]) => [a - 0.4, -wallZ, c + 0.4, wallZ]);
        b.slab(th.ceilMat ?? 'ceil', s.x0, -wallZ, s.x1, wallZ, vis(s), vis(s) + 0.05, cuts, false);
        if (dropped(s)) {
          // Bulkheads closing the void above a dropped ceiling, at its ends and round the stairs.
          const xs = [s.x0, s.x1 - 0.06, ...cuts.flatMap((q) => [q[0] - 0.06, q[2]])];
          for (const x of xs) b.deco('flat:#dcdad3', x, vis(s), -wallZ, x + 0.06, s.y, wallZ);
        }
      }
      const soffit = th.soffitMat === undefined ? 'flat:#26282b' : th.soffitMat;
      if (!s.vault && !o.elevated && soffit) {
        // Exposed dark soffit over the tracks, as if the panels stop at the platform edge.
        const over: [number, number][] = island ? [[-wallZ, -pe - 0.2], [pe + 0.2, wallZ]] : [[-pe + 0.2, pe - 0.2]];
        for (const [za, zb] of over) b.deco(soffit, s.x0, vis(s) - 0.02, za, s.x1, vis(s), zb);
      }
      if (!o.elevated) th.ceiling?.(info, s, vis(s));
      const nx = o.ceil[i + 1];
      if (nx && Math.abs(nx.y - s.y) > 0.01) {
        const lo = Math.min(s.y, nx.y), hi = Math.max(s.y, nx.y) + (s.vault || nx.vault ? 1.6 : 0) + SLAB;
        const xa = nx.y > s.y ? s.x1 : s.x1 - 0.4;
        b.box('flat:#e9e7e0', xa, lo, -wallZ - 0.5, xa + 0.4, hi, wallZ + 0.5);
      }
    });
  } else {
    // Elevated: back walls with a window band, canopies on posts, open sky over the tracks.
    for (const s of [-1, 1]) {
      const z0 = s * wallZ, z1 = s * (wallZ + 0.2);
      const lo = Math.min(z0, z1), hi = Math.max(z0, z1);
      b.wallX('panel:#e4e6e8', -P, P, lo, hi, pf, pf + 1.1);
      b.block(-P, pf + 1.1, lo, P, pf + 3.3, hi);
      b.deco('glass', -P, pf + 1.1, lo + 0.07, P, pf + 2.5, hi - 0.07);
      b.deco('panel:#e4e6e8', -P, pf + 2.5, lo, P, pf + 3.3, hi);
      for (let x = -P; x <= P; x += 5.8) b.deco('flat:#8d949b', x - 0.1, pf, lo - 0.05, x + 0.1, pf + 3.4, hi + 0.05);
      // Canopy.
      const c0 = s * (pe - 0.7), c1 = s * (wallZ + 0.7);
      b.deco('flat:#eef0f2', -P - 1, pf + 3.3, Math.min(c0, c1), P + 1, pf + 3.45, Math.max(c0, c1));
      b.deco(`flat:${line.color}`, -P - 1, pf + 3.1, s * (pe - 0.7) - 0.04, P + 1, pf + 3.3, s * (pe - 0.7) + 0.04);
    }
    // Deck parapets beyond the platforms.
    for (const s of [-1, 1]) {
      for (const [xa, xb] of [[-H, -P], [P, H]]) {
        b.box('concrete', xa, bedY, Math.min(s * wallZ, s * (wallZ + 0.6)), xb, bedY + 1.3, Math.max(s * wallZ, s * (wallZ + 0.6)));
      }
    }
    th.elevated?.(info);
  }

  // Centre columns between the tracks (double-track box).
  if (!island && !o.elevated) {
    for (let x = -H + 3; x < H; x += 6) {
      if (th.trackColumn) th.trackColumn(info, x, bedY, ceilAt(x));
      else b.deco('concrete', x - 0.2, bedY, -0.2, x + 0.2, ceilAt(x) + 0.1, 0.2);
    }
  }

  // ── Lighting ──
  const lightRows = island ? [-2.6, 2.6] : [-(pe + 2.2), pe + 2.2];
  for (const s of o.elevated ? [] : o.ceil) {
    if (th.lights) {
      th.lights(info, s, vis(s));
      continue;
    }
    for (let x = s.x0 + 1.5; x + 3 <= s.x1; x += 4) {
      for (const z of lightRows) {
        if (s.vault) {
          const y = s.y + 0.9;
          b.deco('paint:#e6e5e0', x - 0.05, y + 0.03, z - 0.17, x + 3.05, y + 0.09, z + 0.17);
          b.deco('light', x, y, z - 0.13, x + 3, y + 0.03, z + 0.13);
          b.deco('metal:#8a8f94', x + 1.48, y + 0.09, z - 0.02, x + 1.52, s.y + 2.3, z + 0.02);
        } else ceilingLight(b, x, x + 3, z - 0.13, z + 0.13, vis(s));
      }
    }
  }
  if (o.elevated) {
    for (let x = -P + 2; x + 3 <= P; x += 5) {
      for (const z of lightRows) ceilingLight(b, x, x + 3, z - 0.1, z + 0.1, pf + 3.3);
    }
  }

  // ── Pillars (island platforms, not under a vault) ──
  if (island) {
    for (let x = -54; x <= 54; x += 6) {
      const seg = o.ceil.find((s) => x >= s.x0 && x <= s.x1);
      if (seg?.vault || inBlocks(x, o.blocks, 0.6)) continue;
      for (const z of [-2.05, 2.05]) {
        const half = Math.min(th.pillarHalf ?? 0.27, 0.42);
        b.block(x - half, pf, z - half, x + half, ceilAt(x), z + half);
        if (th.pillar) th.pillar(info, x, z, pf, ceilAt(x));
        else pillarLook(b, x, z, pf, ceilAt(x), 0.27, style.pillar, line.color, pf + 1.98);
      }
    }
  }

  // ── Signage ──
  const signY = pf + 2.72;
  const hangCeil = (x: number) => (o.elevated ? pf + 3.3 : ceilAt(x));
  const edgeZ = island ? 2.05 : pe + 2.6;
  const sides: { z: number; dir: 'down' | 'up' }[] = [
    { z: -edgeZ, dir: 'down' },
    { z: edgeZ, dir: 'up' },
  ];
  for (const x of [-49, -27, 27, 49]) {
    if (inBlocks(x, o.blocks, 2)) continue;
    for (const sd of sides) {
      const w = island ? 3.3 : 4.2;
      const zc = island ? sd.z * 0.98 : sd.z;
      b.hang({ k: 'dir', station: station.id, line: line.id, dir: sd.dir }, x, signY, zc, w, 0.46, { ceil: hangCeil(x) });
    }
  }
  for (const x of [-38, 38, 0]) {
    if (inBlocks(x, o.blocks, 2)) continue;
    for (const sd of sides) {
      b.hang({ k: 'dep', station: station.id, line: line.id, dir: sd.dir }, x, signY + 0.06, island ? sd.z * 0.98 : sd.z, island ? 3.0 : 3.4, 0.62, { ceil: hangCeil(x), dynamic: true });
    }
  }
  // Station name boards and posters on the walls.
  const nameZ = wallZ - 0.03;
  let poster = (station.id.length * 3) % 8;
  for (let x = -52; x <= 52; x += 13) {
    for (const s of [-1, 1] as const) {
      const isName = Math.round((x + 52) / 13) % 2 === 0;
      if (!island && inBlocks(x, o.blocks, 1.5)) continue;
      if (o.elevated && !isName) continue;
      if (inGap(s, x)) continue;
      if (isName) b.sign({ k: 'name', station: station.id, line: line.id }, x, pf + 1.75, s * nameZ, [0, -s], 2.7, 0.9, { arrow: [1, 0] });
      else b.sign({ k: 'poster', v: poster++ }, x, pf + 1.65, s * nameZ, [0, -s], 1.8, 1.2);
    }
  }
  // Platform number plates on the end barriers' side.
  void nums;

  // ── Furniture ──
  if (island) {
    let i = 0;
    for (let x = -51; x <= 51; x += 8.5, i++) {
      if (inBlocks(x, o.blocks, 1.5)) continue;
      if (i % 3 === 1) {
        vending(b, x - 0.55, pf, 0, [0, -1], 'vending');
        vending(b, x + 0.55, pf, 0, [0, 1], 'vending2');
      } else {
        b.block(x - 0.9, pf, -0.5, x + 0.9, pf + 0.46, 0.5);
        if (th.bench) th.bench(info, x, pf, 0, 0);
        else bench(b, x, pf, 0, style.accent);
      }
    }
  } else {
    for (const s of [-1, 1]) {
      let i = 0;
      for (let x = -46; x <= 46; x += 11.5, i++) {
        if (inBlocks(x, o.blocks, 1.5) || inGap(s, x, 2)) continue;
        const z = s * (wallZ - 0.45);
        if (i % 4 === 2) vending(b, x, pf, z, [0, -s], s > 0 ? 'vending' : 'vending2');
        else {
          b.block(x - 0.9, pf, z - 0.28, x + 0.9, pf + 0.4, z + 0.28);
          if (th.bench) th.bench(info, x, pf, z, s as 1 | -1);
          else {
            b.deco('metal:#7f858b', x - 0.9, pf, z - 0.28, x + 0.9, pf + 0.4, z + 0.28);
            b.deco(`paint:${style.accent}`, x - 0.92, pf + 0.4, z - 0.3, x + 0.92, pf + 0.46, z + 0.3);
          }
        }
      }
    }
  }

  // ── Zones ──
  // The track beds, whichever way this hall is turned inside its station.
  const bedTop = pf - 0.3;
  if (island) {
    b.keepOut(-H, railY - 1.5, pe + 0.3, H, bedTop, wallZ, `${line.nameEn} track`);
    b.keepOut(-H, railY - 1.5, -wallZ, H, bedTop, -pe - 0.3, `${line.nameEn} track`);
  } else b.keepOut(-H, railY - 1.5, -pe + 0.3, H, bedTop, pe - 0.3, `${line.nameEn} track`);
  const dn = nums[0], up = nums[1];
  if (island) b.zone('platform', -P, pf - 0.5, -pe, P, pf + 3, pe, `${line.nameJa} ${dn}・${up}番線ホーム`, `${line.nameEn} platforms ${dn}/${up}`, false, line.id);
  else {
    b.zone('platform', -P, pf - 0.5, -wallZ, P, pf + 3, -pe, `${line.nameJa} ${dn}番線ホーム`, `${line.nameEn} platform ${dn}`, false, line.id);
    b.zone('platform', -P, pf - 0.5, pe, P, pf + 3, wallZ, `${line.nameJa} ${up}番線ホーム`, `${line.nameEn} platform ${up}`, false, line.id);
  }
  return d;
}

export interface StairOpts {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  yLow: number;
  yHigh: number;
  /** Side balustrades (solid). Default both. */
  rails?: [boolean, boolean];
  mat?: string;
}

/** A straight stair ascending along +x. Use Builder.with() to turn it. */
export function stairs(b: Builder, o: StairOpts) {
  const rise = o.yHigh - o.yLow, run = o.x1 - o.x0;
  const n = Math.max(2, Math.round(rise / 0.165));
  const tread = run / n, riser = rise / n;
  b.ramp(o.x0, o.z0, o.x1, o.z1, o.yLow, o.yHigh, [1, 0]);
  for (let i = 0; i < n; i++) {
    const xa = o.x0 + i * tread, top = o.yLow + (i + 1) * riser;
    b.deco(o.mat ?? 'flat:#a8a59d', xa, o.yLow - 0.02, o.z0, xa + tread, top, o.z1);
    b.deco('flat:#d9a400', xa, top - 0.02, o.z0, xa + 0.03, top + 0.004, o.z1);
  }
  balustrade(b, o, 'paint:#dfe1e3', o.rails ?? [true, true]);
}

function balustrade(b: Builder, o: StairOpts, mat: string, rails: [boolean, boolean]) {
  const chunks = 7;
  for (let k = 0; k < chunks; k++) {
    const xa = o.x0 + ((o.x1 - o.x0) * k) / chunks, xb = o.x0 + ((o.x1 - o.x0) * (k + 1)) / chunks;
    const top = o.yLow + ((o.yHigh - o.yLow) * (k + 1)) / chunks + 0.95;
    if (rails[0]) b.box(mat, xa, o.yLow, o.z0 - 0.08, xb, top, o.z0);
    if (rails[1]) b.box(mat, xa, o.yLow, o.z1, xb, top, o.z1 + 0.08);
    // Stainless handrail cap following the slope in steps.
    if (rails[0]) b.deco('metal:#b9bdc2', xa, top, o.z0 - 0.1, xb, top + 0.05, o.z0 + 0.02);
    if (rails[1]) b.deco('metal:#b9bdc2', xa, top, o.z1 - 0.02, xb, top + 0.05, o.z1 + 0.1);
  }
}

/** Escalator ascending along +x. `dir` = +1 runs up, -1 runs down. */
export function escalator(b: Builder, o: StairOpts & { dir: 1 | -1 }) {
  const rise = o.yHigh - o.yLow, run = o.x1 - o.x0;
  const n = Math.round(run / 0.4);
  b.ramp(o.x0, o.z0, o.x1, o.z1, o.yLow, o.yHigh, [1, 0], 0.45 * o.dir);
  for (let i = 0; i < n; i++) {
    const xa = o.x0 + (i * run) / n, top = o.yLow + ((i + 1) * rise) / n;
    b.deco('metal:#4d5156', xa, o.yLow - 0.02, o.z0, xa + run / n, top, o.z1);
    b.deco('flat:#e2b100', xa, top - 0.01, o.z0, xa + 0.03, top + 0.004, o.z1);
  }
  balustrade(b, o, 'metal:#b4b9be', o.rails ?? [true, true]);
  // Direction marker at the boarding end.
  const xb = o.dir > 0 ? o.x0 - 0.5 : o.x1 + 0.1, yb = o.dir > 0 ? o.yLow : o.yHigh;
  b.deco('flat:#1f9d55', xb, yb, o.z0, xb + 0.4, yb + 0.006, o.z1);
}

/** Glass railing, 1.1 m. */
export function rail(b: Builder, x0: number, z0: number, x1: number, z1: number, y: number) {
  b.block(x0, y, z0, x1, y + 1.1, z1);
  b.deco('glass', x0, y + 0.08, z0, x1, y + 1.02, z1);
  b.deco('metal:#b0b5ba', x0, y + 1.02, z0, x1, y + 1.1, z1);
  b.deco('metal:#b0b5ba', x0, y, z0, x1, y + 0.08, z1);
}

/**
 * A ticket gate line across z at x = 0, with fences and a station office.
 * The unpaid side is +x. `cw` is the half-width of the concourse.
 */
export function gateLine(c: Ctx, cf: number, cw: number, lines: string[], clear = CONC_CLEAR) {
  const { b, station } = c;
  // A narrow (old) concourse has five gates and a shallower office.
  const narrow = cw < 9;
  const n = narrow ? 5 : 7;
  const first = (-(n - 1) / 2) * 1.05, edge = -first + 0.12;
  const oz = narrow ? 3.7 : 5.0;
  for (let i = 0; i < n; i++) {
    const z = first + i * 1.05;
    b.box('metal:#c4c8cc', -0.8, cf, z - 0.13, 0.8, cf + 1.0, z + 0.13);
    b.deco('flat:#3a3f45', -0.8, cf + 1.0, z - 0.13, 0.8, cf + 1.03, z + 0.13);
    b.deco('glow:#29a9ff', 0.42, cf + 1.03, z - 0.1, 0.72, cf + 1.05, z + 0.1);
    b.deco('glow:#29a9ff', -0.72, cf + 1.03, z - 0.1, -0.42, cf + 1.05, z + 0.1);
    b.deco(i % 3 === 0 ? 'glow:#e53935' : 'glow:#32c86a', 0.78, cf + 0.72, z - 0.06, 0.81, cf + 0.86, z + 0.06);
  }
  // Fences either side.
  b.box('metal:#c4c8cc', -0.05, cf, edge, 0.05, cf + 1.15, oz);
  b.box('metal:#c4c8cc', -0.05, cf, -cw, 0.05, cf + 1.15, -edge);
  b.deco('glass', -0.02, cf + 1.15, -cw, 0.02, cf + 1.9, -edge);
  // Station office.
  b.box(c.style.concWall, -3, cf, oz, 3, cf + CONC_CLEAR, cw);
  b.sign({ k: 'machine', v: 'window' }, 0, cf + 1.5, oz - 0.03, [0, -1], 5.2, 2.2);
  b.sign({ k: 'machine', v: 'door' }, 3.02, cf + 1.05, narrow ? (oz + cw) / 2 : 8, [1, 0], 1.0, 2.1);
  // Header signs: platforms (seen from the unpaid side) / exit (seen from the paid side).
  b.hang(
    { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' },
    0, cf + 2.6, 0, narrow ? 4.4 : 5.6, 0.5,
    { ceil: cf + clear, back: { k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' } },
  );
  // Live departures screen facing the unpaid side.
  const sz = narrow ? -(edge + cw) / 2 : -7.25;
  b.deco('flat:#15181c', 1.2, cf + 1.72, sz - 1.35, 1.3, cf + 2.9, sz + 1.35);
  b.sign({ k: 'depAll', station: station.id }, 1.31, cf + 2.3, sz, [1, 0], 2.6, 1.12, { dynamic: true });
  b.deco('flat:#555a60', 1.23, cf + 2.9, sz - 0.02, 1.27, cf + CONC_CLEAR, sz + 0.02);
}

/**
 * An exit: passage off the concourse, stair up to the street, canopy and signs.
 * Canonical coords: the concourse wall line is z = 0 (concourse at z < 0), the
 * passage is x ∈ [-4, 0], and the stair climbs along +x from x = 0. `ext` puts a low corridor
 * of that length between the concourse and the lobby, so a narrower concourse still comes up
 * at the same place in the street.
 */
export function exit(c: Ctx, cf: number, num: string, ext = 0) {
  const { b, station, style } = c;
  const look = lookFor(station.id);
  const GY = GROUND_Y;
  const rise = GY - cf, run = Math.round(rise * 1.72 * 100) / 100;
  const wall = style.concWall, ceil = look.finishes?.ceil ?? 'ceil';
  if (ext > 0) {
    b.box(style.floor, -4, cf - 0.5, 0, 0, cf, ext);
    b.box(wall, -4.3, cf, 0, -4, cf + 3.2, ext);
    b.box(wall, 0, cf, 0, 0.3, cf + 3.2, ext);
    b.box(ceil, -4.3, cf + 2.5, 0, 0.3, cf + 3.2, ext);
    ceilingLight(b, -2.25, -1.75, 0.5, ext - 0.3, cf + 2.5);
    b.deco('flat:#4b4d50', -4, cf, 0, -3.975, cf + 0.13, ext);
    b.deco('flat:#4b4d50', -0.025, cf, 0, 0, cf + 0.13, ext);
    let v = num.charCodeAt(0) + station.id.length + 3;
    for (let z = 1.2; z + 0.8 <= ext; z += 2) {
      b.sign({ k: 'poster', v: v++ }, -3.98, cf + 1.45, z, [1, 0], 1.2, 1.7);
      b.sign({ k: 'poster', v: v++ }, -0.02, cf + 1.45, z, [-1, 0], 1.2, 1.7);
    }
    b.zone('passage', -4, cf - 0.2, 0, 0, cf + 2.5, ext, `${num}番出口 通路`, `Exit ${num} passage`);
  }
  b.with({ t: [0, 0, ext] }, () => {
    b.box(style.floor, -4, cf - 0.5, 0, 0, cf, 4.0);
    stairs(b, { x0: 0, x1: run, z0: 1.2, z1: 4.0, yLow: cf, yHigh: GY, rails: [false, false], mat: 'flat:#aaa79f' });
    b.box(wall, -4.3, cf, 4.0, 0, cf + 3.2, 4.3);
    b.box(wall, 0, cf - 0.5, 4.0, run, GY + 1.0, 4.3);
    b.box(wall, -4.3, cf, 0, -4, cf + 3.2, 4.0);
    b.box(wall, 0, cf - 0.5, 0.9, run, GY + 1.0, 1.2);
    b.box(wall, 0, cf, 0, 0.3, cf + 3.2, 0.9);
    b.box(wall, -0.3, cf + 2.7, 1.2, 0, GY + 1.0, 4.0);
    b.box(ceil, -4.3, cf + 2.7, 0, -0.3, cf + 3.2, 4.3);
    ceilingLight(b, -3.2, -1, 1.6, 2.2, cf + 2.7);
    b.deco('flat:#4b4d50', -4, cf, 3.975, 0, cf + 0.13, 4.0);
    b.hole(0, 1.2, run, 4.0);
    if (!look.canopy) {
      // Street-level canopy.
      b.deco('flat:#eef0f2', -0.6, GY + 2.5, 0.6, run + 0.7, GY + 2.64, 4.6);
      b.deco('glass', 0, GY + 1.0, 4.12, run, GY + 2.5, 4.18);
      b.deco('glass', 0, GY + 1.0, 1.02, run, GY + 2.5, 1.08);
      for (const [px, pz] of [[0, 1.05], [0, 4.15], [run, 1.05], [run, 4.15]]) {
        b.box('metal:#9aa0a6', px - 0.07, GY, pz - 0.07, px + 0.07, GY + 2.5, pz + 0.07);
      }
      b.deco('flat:#22262b', run - 0.04, GY + 1.88, 1.1, run + 0.05, GY + 2.52, 4.1);
    }
    b.sign({ k: 'entrance', station: station.id, exit: num }, run + 0.06, GY + 2.2, 2.6, [1, 0], 2.9, 0.6);
    // Signs inside.
    b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num, arrow: 'up' }, -0.31, cf + 2.95, 2.6, [-1, 0], 2.4, 0.42);
    b.sign({ k: 'poster', v: num.charCodeAt(0) + station.id.length }, -2, cf + 1.5, 3.98, [0, -1], 1.2, 1.7);
    b.zone('passage', -4, cf - 0.2, 0, run, GY + 2.4, 4.0, `${num}番出口`, `Exit ${num}`);
  });
  b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num }, -2, cf + (ext > 0 ? 2.25 : 2.72), -0.02, [0, -1], 2.6, 0.5);
  const info: ExitInfo = { b, station, style, wall, floor: style.floor, cf, gy: GY, num, ext, run };
  look.canopy?.(info);
  look.exit?.(info);
}

/** Wall-mounted row of ticket machines with the fare board above, along a wall facing +z. */
export function ticketMachines(c: Ctx, cf: number, x0: number, z: number, count: number) {
  const { b, station } = c;
  b.box('metal:#b9bdc2', x0 - 0.2, cf, z, x0 + count * 1.05 + 0.2, cf + 1.95, z + 0.6);
  for (let i = 0; i < count; i++) {
    b.sign({ k: 'machine', v: i === count - 1 ? 'charge' : 'ticket' }, x0 + 0.525 + i * 1.05, cf + 1.0, z + 0.61, [0, 1], 0.98, 1.8);
  }
  b.sign({ k: 'faremap', station: station.id }, x0 + (count * 1.05) / 2, cf + 2.46, z + 0.02, [0, 1], count * 1.05 + 0.4, 0.95);
}
