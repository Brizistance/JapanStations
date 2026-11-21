// The road vehicles (models in tools/blender/build_road.py, road_<id>): their sizes, where their
// wheels and lamps are, and which of them drive where.

/** Length, width and height by model family (the part of a model's id before '_'). */
export const VEH: Record<string, [number, number, number]> = {
  sedan: [4.5, 1.72, 1.45], taxi: [4.5, 1.72, 1.6], kei: [3.4, 1.48, 1.72], van: [4.7, 1.72, 1.95], bus: [10.5, 2.5, 3.2],
  truck: [6.2, 2.1, 2.9], keitruck: [3.4, 1.48, 1.8], scooter: [1.8, 0.7, 1.55],
  compact: [3.9, 1.69, 1.5], minivan: [4.7, 1.72, 1.9], gomi: [5.6, 2.0, 2.6], cycle: [1.75, 0.6, 1.8],
};
export const family = (id: string) => id.split('_')[0];

/**
 * Where a family's wheels and lamps are, as build_road.py places them (model frame: nose to −z,
 * origin on the road under its middle). Wheels: half the track (0 for a single-track vehicle),
 * the axles' z, radius and width. Lamps: how far out from the centre line, the nose and tail z,
 * the headlamps' height and the lamps' width.
 */
export interface Rig {
  wheels: { half: number; zs: number[]; r: number; w: number };
  lamps: { x: number; zf: number; zr: number; y: number; wide: number };
}
const rig = (halfW: number, zs: number[], r: number, w: number, len: number, y: number, wide: number): Rig =>
  ({ wheels: { half: halfW - w / 2 + 0.01, zs, r, w }, lamps: { x: halfW - 0.3, zf: -len / 2, zr: len / 2, y, wide } });
export const RIG: Record<string, Rig> = {
  sedan: rig(0.86, [-1.45, 1.4], 0.31, 0.2, 4.5, 0.68, 0.34),
  taxi: rig(0.86, [-1.45, 1.4], 0.31, 0.2, 4.5, 0.68, 0.34),
  kei: rig(0.74, [-1.1, 1.1], 0.27, 0.16, 3.4, 0.72, 0.28),
  van: rig(0.86, [-1.5, 1.35], 0.31, 0.2, 4.7, 0.72, 0.34),
  bus: rig(1.25, [-3.05, 2.65], 0.48, 0.3, 10.5, 0.72, 0.4),
  truck: rig(1.05, [-2.1, 1.6], 0.4, 0.26, 6.2, 0.82, 0.3),
  keitruck: rig(0.74, [-1.15, 1.1], 0.27, 0.16, 3.4, 0.6, 0.24),
  compact: rig(0.845, [-1.25, 1.2], 0.29, 0.18, 3.9, 0.7, 0.3),
  minivan: rig(0.86, [-1.5, 1.35], 0.31, 0.2, 4.7, 0.74, 0.34),
  gomi: rig(1.0, [-1.85, 1.3], 0.38, 0.25, 5.6, 0.8, 0.3),
  scooter: { wheels: { half: 0, zs: [-0.62, 0.58], r: 0.22, w: 0.11 }, lamps: { x: 0, zf: -0.49, zr: 0.9, y: 0.95, wide: 0.14 } },
  cycle: { wheels: { half: 0, zs: [-0.52, 0.5], r: 0.33, w: 0.045 }, lamps: { x: 0, zf: -0.55, zr: 0.82, y: 0.69, wide: 0.06 } },
};

/** Private cars as parked along the streets (the road kit draws from this list: its length is part of every street's look). */
export const CARS = ['sedan_w', 'sedan_k', 'sedan_r', 'sedan_b', 'sedan_s', 'kei_y', 'kei_w', 'kei_p', 'kei_g', 'van'];
/** Private cars as driven. */
export const DRIVEN = [...CARS, 'sedan_g', 'sedan_n', 'compact_w', 'compact_r', 'compact_t', 'minivan_k', 'minivan_w', 'kei_w', 'sedan_w', 'sedan_s', 'van_b', 'van_s', 'minivan_s', 'minivan_b', 'kei_v'];
/** Every model that drives. */
export const MOVING = [...new Set([...DRIVEN, 'taxi', 'bus', 'bus_c', 'truck', 'gomi', 'keitruck', 'scooter', 'scooter_b', 'scooter_k', 'scooter_w', 'kei_vb', 'cycle', 'cycle_b'])];

/** Heavy vehicles pull away slowly and keep under the limit. */
export const HEAVY = new Set(['bus', 'truck', 'gomi']);
/** Vehicles nobody hears coming. */
export const QUIET = new Set(['cycle']);

/**
 * How much of the busiest hour's traffic is on the road at sim time `t` (seconds, any day): peaks
 * at 08:00 and 18:00, a little over half of that through the day, a quarter in the late evening,
 * nearly empty from 01:00 to 05:00.
 */
const CURVE: [number, number][] = [[0, 0.14], [1, 0.06], [5, 0.06], [6, 0.25], [7.25, 0.8], [8, 1], [9, 0.85], [10.5, 0.55], [12, 0.62], [13.5, 0.55], [16, 0.62], [17.25, 0.85], [18, 1], [19, 0.8], [20.5, 0.45], [21.5, 0.26], [23, 0.2], [24, 0.14]];
export function timeFactor(t: number): number {
  const h = ((((t / 3600) % 24) + 24) % 24);
  for (let i = 1; i < CURVE.length; i++) {
    const [h1, v1] = CURVE[i];
    if (h <= h1) {
      const [h0, v0] = CURVE[i - 1];
      return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0);
    }
  }
  return CURVE[0][1];
}
