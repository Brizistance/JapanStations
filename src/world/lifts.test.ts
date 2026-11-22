import { describe, expect, it } from 'vitest';
import type { Body } from './collision';
import { LIFT_DWELL, rideLifts, type LiftHost } from './lifts';

const host = (): LiftHost => ({
  frame: { x: 100, y: 0, z: 50, yaw: 0, pitch: 0, radius: 200 },
  build: { lifts: [{ min: [-1, -1], max: [1, 1], levels: [-7, 0.15, 6] }] },
});
const body = (y: number, x = 100): Body => ({ pos: [x, y, 50], vy: 0, grounded: true, ride: null });
const run = (b: Body, h: LiftHost[], seconds: number) => {
  let carried = 0;
  for (let t = 0; t < seconds; t += 0.05) if (rideLifts(b, 0.05, h)) carried++;
  return carried;
};

describe('lifts', () => {
  it('carry someone standing in the shaft up one level, then on to the next', () => {
    const h = [host()], b = body(-7);
    expect(run(b, h, LIFT_DWELL - 0.2)).toBe(0);
    expect(b.pos[1]).toBe(-7);
    run(b, h, 5.5);
    expect(b.pos[1]).toBeCloseTo(0.15);
    run(b, h, 8);
    expect(b.pos[1]).toBeCloseTo(6);
  });

  it('turn round at the top', () => {
    const h = [host()], b = body(6);
    run(b, h, 6);
    expect(b.pos[1]).toBeCloseTo(0.15);
  });

  it('leave alone whoever is outside the shaft or between its floors', () => {
    const h = [host()];
    const out = body(-7, 103), mid = body(3);
    expect(run(out, h, 10)).toBe(0);
    expect(run(mid, h, 10)).toBe(0);
    expect(out.pos[1]).toBe(-7);
  });
});
