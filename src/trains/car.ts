// Rolling stock: one car as a part list (same Builder as stations). These boxes are the
// collision, the doors and the live signs. What you see is the Blender model loaded by
// render/car-model.ts, which is built to these dimensions; the boxes are only drawn if
// that model fails to load. Car-local coords: +x towards increasing chainage,
// y = 0 at rail level, +z to the right of +x.

import type { CarSpec, LineDef } from '../data/types';
import { METRO_CAR, carOf } from '../sim/geometry';
import { PF_H } from '../stations/kit';
import { Builder, type Build } from '../world/builder';

export type CarKind = 'mid' | 'cabLow' | 'cabHigh';

/** The metro car's half length; a line's own is carOf(line).half. */
export const CAR_HALF = METRO_CAR.half;
export const CAR_HALF_W = 1.4;
export const DOOR_W = 1.3;
export const DOOR_H = 1.85;
/** The space inside a car, for the player's "aboard" test. */
export const carInside = (spec: CarSpec) => ({ min: [-spec.half - 0.3, PF_H - 0.3, -1.42] as [number, number, number], max: [spec.half + 0.3, 3.45, 1.42] as [number, number, number] });

// Where the live destination displays sit on the model (render/car-model.ts): the side one half
// way between the last two doors, the front one on the cab's bulge. The cab car model is one mesh
// turned round for the low end, so the side display swaps ends with it.
export const sideSignX = (spec: CarSpec) => (spec.doors[spec.doors.length - 2] + spec.doors[spec.doors.length - 1]) / 2;
const FRONT_SIGN_OUT = 0.232;

const BODY = 'flat:#d4d8db';
const INNER = 'flat:#ece9e0';

export function buildCar(line: LineDef, kind: CarKind): Build {
  const b = new Builder();
  const spec = carOf(line), CAR_HALF = spec.half, DOOR_OFFSETS = spec.doors;
  const SIDE_SIGN_X = sideSignX(spec), FRONT_SIGN_X = CAR_HALF + FRONT_SIGN_OUT;
  const F = PF_H, W = CAR_HALF_W, IN = CAR_HALF - 0.4;
  const cabLow = kind === 'cabLow', cabHigh = kind === 'cabHigh';
  const xLo = cabLow ? -CAR_HALF : -CAR_HALF - 0.25, xHi = cabHigh ? CAR_HALF : CAR_HALF + 0.25;

  // Underframe + floor.
  b.box('flat:#7f8a93', xLo, 0.55, -W, xHi, F, W);
  b.deco('flat:#2a2d31', -IN, 0.12, -1.25, IN, 0.55, 1.25);
  for (const bx of [-spec.bogie, spec.bogie]) {
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
    // Between each pair of doors, and from the end doors to the car's ends (or the cab partition).
    const seats: [number, number][] = [];
    const D = DOOR_OFFSETS, last = D.length - 1;
    for (let i = 0; i < last; i++) seats.push([D[i] + 0.8, D[i + 1] - 0.8]);
    seats.push([-(CAR_HALF - (cabLow ? 1.9 : 0.2)), D[0] - 0.8], [D[last] + 0.8, CAR_HALF - (cabHigh ? 1.9 : 0.2)]);
    for (const [xa, xb] of seats) {
      if (xb - xa < 0.4) continue;
      b.box(`flat:${line.color}`, xa, F, Math.min(s * 0.86, s * (W - 0.1)), xb, F + 0.43, Math.max(s * 0.86, s * (W - 0.1)));
      b.deco(`flat:${line.color}`, xa, F + 0.43, Math.min(s * 1.18, s * (W - 0.1)), xb, F + 0.92, Math.max(s * 1.18, s * (W - 0.1)));
      b.deco('flat:#c9ccd0', xa - 0.04, F, Math.min(s * 0.86, s * 1.3), xa, F + 1.1, Math.max(s * 0.86, s * 1.3));
      b.deco('flat:#c9ccd0', xb, F, Math.min(s * 0.86, s * 1.3), xb + 0.04, F + 1.1, Math.max(s * 0.86, s * 1.3));
    }
    // Grab rail with straps.
    b.deco('flat:#c9ccd0', -IN, 3.0, s * 0.74 - 0.015, IN, 3.03, s * 0.74 + 0.015);
    for (let x = -IN + 0.4; x < IN - 0.3; x += 0.55) {
      if (DOOR_OFFSETS.some((d) => Math.abs(x - d) < 0.7)) continue;
      b.deco('flat:#f4f4f0', x - 0.012, 2.78, s * 0.74 - 0.012, x + 0.012, 3.0, s * 0.74 + 0.012);
      b.deco('flat:#f4f4f0', x - 0.06, 2.7, s * 0.74 - 0.015, x + 0.06, 2.78, s * 0.74 + 0.015);
    }
    // Side destination display.
    // Side destination display, in the surround modelled over the window bay.
    b.sign({ k: 'dest', line: line.id, dir: 'none' }, SIDE_SIGN_X * (cabLow ? -1 : 1), 3.075, s * (W + 0.012), [0, s], 1.5, 0.24, { dynamic: true });
    b.deco('flat:#101010', SIDE_SIGN_X * (cabLow ? -1 : 1) - 0.8, 2.95, Math.min(s * W, s * (W + 0.008)), SIDE_SIGN_X * (cabLow ? -1 : 1) + 0.8, 3.2, Math.max(s * W, s * (W + 0.008)));
  }

  // Roof, ceiling lights, air-con pods.
  b.box(BODY, -CAR_HALF, 3.35, -W, CAR_HALF, 3.55, W);
  b.deco(INNER, -CAR_HALF + 0.1, 3.32, -W + 0.1, CAR_HALF - 0.1, 3.35, W - 0.1);
  for (const z of [-0.45, 0.45]) b.deco('light', -IN + 0.2, 3.3, z - 0.07, IN - 0.2, 3.32, z + 0.07);
  for (const x of [-CAR_HALF / 2, CAR_HALF / 2]) b.deco('flat:#b7bcc0', x - 1.8, 3.55, -0.9, x + 1.8, 3.82, 0.9);

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
    // Front destination display, on the housing modelled on the (bulged) cab front.
    b.sign({ k: 'dest', line: line.id, dir: 'none' }, s * FRONT_SIGN_X, 3.08, 0, [s, 0], 1.5, 0.24, { dynamic: true });
    b.deco('flat:#16181b', Math.min(x1, s * (FRONT_SIGN_X - 0.007)), 2.955, -0.8, Math.max(x1, s * (FRONT_SIGN_X - 0.007)), 3.205, 0.8);
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
