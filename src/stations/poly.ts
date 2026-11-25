// Shapes at any angle (2026-11-24, for the diagonal Shiomi-dōri): polygons in frame x, z, clipped and laid
// as Builder.poly (what is seen) and as thin strips of boxes (what is walked on, or bumped into), since
// collision knows only boxes square to the frame. Convex polygons only.

import type { Builder } from '../world/builder';

export type P = [number, number];
export type Poly = P[];

/** The part of `poly` where a·x + b·z + c ≥ 0. */
export function clipHalf(poly: Poly, a: number, b: number, c: number): Poly {
  const out: Poly = [];
  const f = (p: P) => a * p[0] + b * p[1] + c;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
/** The part of `poly` inside x0 … x1, z0 … z1. */
export const clipRect = (poly: Poly, x0: number, z0: number, x1: number, z1: number): Poly =>
  clipHalf(clipHalf(clipHalf(clipHalf(poly, 1, 0, -x0), -1, 0, x1), 0, 1, -z0), 0, -1, z1);

/**
 * A rectangle along a direction: from point (ox, oz) with unit heading (ux, uz), `s0` … `s1` along it
 * and `t0` … `t1` across it (positive across = to the heading's right: (−uz, ux)).
 */
export function band(ox: number, oz: number, ux: number, uz: number, s0: number, s1: number, t0: number, t1: number): Poly {
  const px = -uz, pz = ux;
  const at = (s: number, t: number): P => [ox + ux * s + px * t, oz + uz * s + pz * t];
  return [at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)];
}
/** A regular polygon round (cx, cz): a circle of `n` sides. */
export const disc = (cx: number, cz: number, r: number, n = 48): Poly =>
  Array.from({ length: n }, (_, i): P => [cx + r * Math.cos((2 * Math.PI * i) / n), cz + r * Math.sin((2 * Math.PI * i) / n)]);
/** A ring between radii r0 and r1, as `n` convex pieces (quads). */
export function ring(cx: number, cz: number, r0: number, r1: number, n = 48): Poly[] {
  const out: Poly[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n, e = (2 * Math.PI * (i + 1)) / n;
    out.push([[cx + r0 * Math.cos(a), cz + r0 * Math.sin(a)], [cx + r1 * Math.cos(a), cz + r1 * Math.sin(a)], [cx + r1 * Math.cos(e), cz + r1 * Math.sin(e)], [cx + r0 * Math.cos(e), cz + r0 * Math.sin(e)]]);
  }
  return out;
}

/** The polygon cut into strips `step` wide along x, each as the z range it covers there: [x0, x1, z0, z1], runs that match merged. */
export function strips(poly: Poly, step: number, inner = false): [number, number, number, number][] {
  if (poly.length < 3) return [];
  const xs = poly.map((p) => p[0]);
  const lo = Math.min(...xs), hi = Math.max(...xs);
  const out: [number, number, number, number][] = [];
  for (let x = lo; x < hi - 1e-6; x += step) {
    const xe = Math.min(hi, x + step);
    const cut = clipHalf(clipHalf(poly, 1, 0, -x), -1, 0, xe);
    if (cut.length < 3) continue;
    let zs = cut.map((p) => p[1]), z0 = Math.min(...zs), z1 = Math.max(...zs);
    if (inner) {
      // Only what the polygon covers across the whole strip: the z range at both its edges, overlapped.
      const at = (xx: number) => { const c = clipHalf(clipHalf(poly, 1, 0, -(xx - 1e-3)), -1, 0, xx + 1e-3).map((p) => p[1]); return c.length ? [Math.min(...c), Math.max(...c)] : [Infinity, -Infinity]; };
      const [a0, a1] = at(x), [b0, b1] = at(xe);
      z0 = Math.max(a0, b0); z1 = Math.min(a1, b1);
      if (z1 - z0 < 0.05) continue;
    }
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - x) < 1e-6 && Math.abs(last[2] - z0) < 1e-3 && Math.abs(last[3] - z1) < 1e-3) last[1] = xe;
    else out.push([x, xe, z0, z1]);
  }
  return out;
}

/** A floor to walk on, its top at y, over the polygon (invisible: the polygon is drawn by Builder.poly). */
export function floorPoly(b: Builder, poly: Poly, y: number, step = 0.5, inner = true) {
  // (The inner range: a raised floor never reaches out over the lower ground beside it.)
  for (const [x0, x1, z0, z1] of strips(poly, step, inner)) b.box('none', x0, y - 0.3, z0, x1, y, z1);
}
/** Something solid over the polygon, y0 … y1 (a building's footprint: invisible). */
export function solidPoly(b: Builder, poly: Poly, y0: number, y1: number, step = 1) {
  for (const [x0, x1, z0, z1] of strips(poly, step, true)) b.block(x0, y0, z0, x1, y1, z1);
}
/** Draw it and walk on it: a slab from y0 to y1 (paving, a kerbed pavement). */
/** `inner` false where its slanted edges only meet paving at the same level (no kerb to overhang): no grooves between pieces. */
export function paveSlab(b: Builder, mat: string, poly: Poly, y0: number, y1: number, uvYaw?: number, inner = true) {
  if (poly.length < 3) return;
  b.poly(mat, poly, y0, y1, uvYaw);
  floorPoly(b, poly, y1, 0.5, inner);
}
