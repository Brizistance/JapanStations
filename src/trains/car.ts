// Rolling stock: one car as a part list (same Builder as stations), so the body you see
// is the body you collide with. Car-local coords: +x towards increasing chainage,
// y = 0 at rail level, +z to the right of +x.

import type { LineDef } from '../data/types';
import { DOOR_OFFSETS, PF_H } from '../stations/kit';
import { Builder, type Build } from '../world/builder';

export type CarKind = 'mid' | 'cabLow' | 'cabHigh';

export const CAR_HALF = 9;
export const CAR_HALF_W = 1.4;
export const DOOR_W = 1.3;
export const DOOR_H = 1.85;
export const CAR_INSIDE = { min: [-9.3, PF_H - 0.3, -1.42] as [number, number, number], max: [9.3, 3.45, 1.42] as [number, number, number] };

const BODY = 'flat:#d4d8db';
const INNER = 'flat:#ece9e0';

export function buildCar(line: LineDef, kind: CarKind): Build {
  const b = new Builder();
  const F = PF_H, W = CAR_HALF_W;
  const cabLow = kind === 'cabLow', cabHigh = kind === 'cabHigh';
  const xLo = cabLow ? -CAR_HALF : -CAR_HALF - 0.25, xHi = cabHigh ? CAR_HALF : CAR_HALF + 0.25;

  // Underframe + floor.
  b.box('flat:#7f8a93', xLo, 0.55, -W, xHi, F, W);
  b.deco('flat:#2a2d31', -8.6, 0.12, -1.25, 8.6, 0.55, 1.25);
  for (const bx of [-6, 6]) {
    b.deco('flat:#1c1e21', bx - 1.5, 0.02, -1.3, bx + 1.5, 0.6, 1.3);
    for (const wx of [-0.95, 0.95]) for (const s of [-1, 1]) b.mesh('flat:#111', 'cyl', bx + wx, 0.43, s * 0.72, 0.86, 0.12, 0.86);
  }

  const door = DOOR_W / 2;
  const segs: [number, number][] = [];
  let from = -CAR_HALF;
  for (const d of DOOR_OFFSETS) {
    segs.push([from, d - door]);
    from = d + door;
  }
  segs.push([from, CAR_HALF]);

  for (const s of [-1, 1] as const) {
    const z0 = s * (W - 0.1), z1 = s * W;
    const lo = Math.min(z0, z1), hi = Math.max(z0, z1);
    for (const [xa, xb] of segs) {
      b.box(BODY, xa, F, lo, xb, F + 0.85, hi);
      b.block(xa, F + 0.85, lo, xb, 3.35, hi);
      b.deco('glassTint', xa + 0.25, F + 0.85, lo + 0.03, xb - 0.25, F + 1.85, hi - 0.03);
      b.deco(BODY, xa, F + 0.85, lo, xa + 0.25, F + 1.85, hi);
      b.deco(BODY, xb - 0.25, F + 0.85, lo, xb, F + 1.85, hi);
      b.deco(BODY, xa, F + 1.85, lo, xb, 3.35, hi);
      // Line colour band outside.
      const oz = s * (W + 0.006);
      b.deco(`flat:${line.color}`, xa, F + 0.62, Math.min(z1, oz), xb, F + 0.84, Math.max(z1, oz));
      b.deco(`flat:${line.color}`, xa, 3.2, Math.min(z1, oz), xb, 3.3, Math.max(z1, oz));
    }
    // Door headers, doors and the in-car display over each door.
    for (const d of DOOR_OFFSETS) {
      b.box(BODY, d - door, F + DOOR_H, lo, d + door, 3.35, hi);
      b.gate({ x: d, y: F, z: s * (W - 0.05), along: [1, 0], width: DOOR_W, height: DOOR_H, thick: 0.05, mat: BODY, side: s });
      b.sign({ k: 'lcd', line: line.id, train: 0 }, d, F + DOOR_H + 0.2, s * (W - 0.11), [0, -s], 1.25, 0.36, { dynamic: true });
    }
    // Longitudinal bench seats.
    const seats: [number, number][] = [[-5.0, -0.8], [0.8, 5.0]];
    if (!cabLow) seats.push([-8.8, -6.6]);
    else seats.push([-7.1, -6.6]);
    if (!cabHigh) seats.push([6.6, 8.8]);
    else seats.push([6.6, 7.1]);
    for (const [xa, xb] of seats) {
      b.box(`flat:${line.color}`, xa, F, Math.min(s * 0.86, s * (W - 0.1)), xb, F + 0.43, Math.max(s * 0.86, s * (W - 0.1)));
      b.deco(`flat:${line.color}`, xa, F + 0.43, Math.min(s * 1.18, s * (W - 0.1)), xb, F + 0.92, Math.max(s * 1.18, s * (W - 0.1)));
      b.deco('flat:#c9ccd0', xa - 0.04, F, Math.min(s * 0.86, s * 1.3), xa, F + 1.1, Math.max(s * 0.86, s * 1.3));
      b.deco('flat:#c9ccd0', xb, F, Math.min(s * 0.86, s * 1.3), xb + 0.04, F + 1.1, Math.max(s * 0.86, s * 1.3));
    }
    // Grab rail with straps.
    b.deco('flat:#c9ccd0', -8.6, 3.0, s * 0.74 - 0.015, 8.6, 3.03, s * 0.74 + 0.015);
    for (let x = -8.2; x < 8.3; x += 0.55) {
      if (DOOR_OFFSETS.some((d) => Math.abs(x - d) < 0.7)) continue;
      b.deco('flat:#f4f4f0', x - 0.012, 2.78, s * 0.74 - 0.012, x + 0.012, 3.0, s * 0.74 + 0.012);
      b.deco('flat:#f4f4f0', x - 0.06, 2.7, s * 0.74 - 0.015, x + 0.06, 2.78, s * 0.74 + 0.015);
    }
    // Side destination display.
    b.sign({ k: 'dest', line: line.id, dir: 'none' }, 2.9, F + 2.03, s * (W + 0.012), [0, s], 1.5, 0.3, { dynamic: true });
    b.deco('flat:#101010', 2.1, F + 1.86, Math.min(s * W, s * (W + 0.008)), 3.7, F + 2.2, Math.max(s * W, s * (W + 0.008)));
  }

  // Roof, ceiling lights, air-con pods.
  b.box(BODY, -CAR_HALF, 3.35, -W, CAR_HALF, 3.55, W);
  b.deco(INNER, -CAR_HALF + 0.1, 3.32, -W + 0.1, CAR_HALF - 0.1, 3.35, W - 0.1);
  for (const z of [-0.45, 0.45]) b.deco('light', -8.4, 3.3, z - 0.07, 8.4, 3.32, z + 0.07);
  for (const x of [-4.5, 4.5]) b.deco('flat:#b7bcc0', x - 1.8, 3.55, -0.9, x + 1.8, 3.82, 0.9);

  // Ends.
  const end = (s: 1 | -1, cab: boolean) => {
    const x0 = s * (CAR_HALF - 0.1), x1 = s * CAR_HALF;
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    if (!cab) {
      b.box(BODY, lo, F, -W, hi, 3.35, -0.5);
      b.box(BODY, lo, F, 0.5, hi, 3.35, W);
      b.box(BODY, lo, 3.05, -0.5, hi, 3.35, 0.5);
      // Gangway bellows.
      const g0 = s * CAR_HALF, g1 = s * (CAR_HALF + 0.25);
      for (const z of [-0.6, 0.5]) b.box('flat:#2a2d31', Math.min(g0, g1), F, z, Math.max(g0, g1), 3.05, z + 0.1);
      b.deco('flat:#2a2d31', Math.min(g0, g1), 3.05, -0.6, Math.max(g0, g1), 3.15, 0.6);
      return;
    }
    // Cab front: mask, windscreen, lights, destination display.
    b.box('flat:#16181b', lo, F - 0.4, -W, hi, F + 0.95, W);
    b.block(lo, F + 0.95, -W, hi, 3.35, W);
    b.deco('glassTint', lo + 0.03, F + 0.95, -W + 0.12, hi - 0.03, F + 1.95, W - 0.12);
    b.deco('flat:#16181b', lo, F + 1.95, -W, hi, 3.35, W);
    b.deco(`flat:${line.color}`, Math.min(x1, x1 + s * 0.01), F + 0.2, -W, Math.max(x1, x1 + s * 0.01), F + 0.5, W);
    b.sign({ k: 'dest', line: line.id, dir: 'none' }, x1 + s * 0.012, F + 2.12, 0, [s, 0], 1.7, 0.3, { dynamic: true });
    // Cab partition with a window you can look through.
    const p0 = s * (CAR_HALF - 1.75), p1 = s * (CAR_HALF - 1.67);
    const pl = Math.min(p0, p1), ph = Math.max(p0, p1);
    b.box(INNER, pl, F, -W + 0.1, ph, F + 0.95, W - 0.1);
    b.block(pl, F + 0.95, -W + 0.1, ph, 3.35, W - 0.1);
    b.deco('glass', pl + 0.02, F + 0.95, -W + 0.3, ph - 0.02, F + 1.9, W - 0.3);
    b.deco(INNER, pl, F + 1.9, -W + 0.1, ph, 3.35, W - 0.1);
    b.deco(INNER, pl, F + 0.95, -W + 0.1, ph, F + 1.9, -W + 0.3);
    b.deco(INNER, pl, F + 0.95, W - 0.3, ph, F + 1.9, W - 0.1);
    // Driver's desk.
    b.deco('flat:#30343a', Math.min(s * (CAR_HALF - 0.9), s * (CAR_HALF - 0.15)), F, -W + 0.15, Math.max(s * (CAR_HALF - 0.9), s * (CAR_HALF - 0.15)), F + 0.9, W - 0.15);
  };
  end(-1, cabLow);
  end(1, cabHigh);
  return b.out;
}
